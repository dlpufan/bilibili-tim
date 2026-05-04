const IMAGES_PATH = "images/";
const EXTENSION_NAME = chrome.runtime.getManifest().name;

// ─── CSS ::after overlay stylesheet ─────────────────────────────────────────
// 用 CSS ::after 伪元素注入 overlay，而非 appendChild img，
// 避免向 Vue 管理的 DOM 添加子节点导致 Vue 虚拟 DOM 补丁崩溃
const _bboStyleEl = document.createElement('style');
_bboStyleEl.id = 'bilibeastify-styles';
_bboStyleEl.textContent = '.bbo-rel{position:relative!important}.bbo-iblk{display:inline-block!important}';
(document.head || document.documentElement).appendChild(_bboStyleEl);
let _bboIdCounter = 0;

// Config (defaults)
let extensionIsDisabled = false;
let appearChance = 1.00;
let flipChance = 0.25;
let customImageURL = "";
let useCustomImage = false;

// ─── Overlay ────────────────────────────────────────────────────────────────

function applyOverlay(wrapElement, overlayImageURL, flip = false) {
    if (!overlayImageURL) return;

    // 用 CSS class 代替 inline style 修改定位，减少对 Vue 响应式属性的干扰
    const cs = window.getComputedStyle(wrapElement);
    if (cs.position === "static") {
        wrapElement.classList.add('bbo-rel');
    }
    if (cs.display === "inline") {
        wrapElement.classList.add('bbo-iblk');
    }

    // 为该容器分配唯一 ID，通过 CSS ::after 伪元素渲染 overlay
    // 不向元素添加任何子节点，避免破坏 Vue 虚拟 DOM 对子节点的追踪
    const id = `bbo${++_bboIdCounter}`;
    wrapElement.setAttribute('data-bbo-id', id);

    const transform = flip ? 'scaleX(-1)' : 'none';
    // background-size:contain + background-position:bottom left 等价于原 object-fit/object-position
    const rule = `[data-bbo-id="${id}"]::after{content:"";position:absolute;bottom:0;left:0;width:100%;height:100%;background-image:url("${overlayImageURL}");background-size:contain;background-position:bottom left;background-repeat:no-repeat;z-index:1;pointer-events:none;transform:${transform};}`;
    const sheet = _bboStyleEl.sheet;
    if (sheet) {
        sheet.insertRule(rule, sheet.cssRules.length);
    }
}

// ─── Thumbnail discovery ─────────────────────────────────────────────────────

/**
 * B站各页面封面容器选择器（实测 DOM 结构）：
 *
 * 首页 / 搜索 / 热门 / 排行等通用卡片：
 *   IMG.b-img__inner → DIV.bili-video-card__image--wrap → ...
 *
 * 用户空间页（space.bilibili.com）视频列表：
 *   IMG.b-img__inner → DIV.bili-cover-card__thumbnail → A.bili-cover-card
 *                    → DIV.bili-video-card__cover → DIV.bili-video-card__wrap
 *   目标：.bili-cover-card__thumbnail
 *
 * 视频播放页右侧推荐、番剧、排行榜等：
 *   各有独立容器，一并覆盖
 */
const THUMBNAIL_SELECTORS = [
    // 首页 / 搜索 / 热门等通用卡片（内含 picture > img）
    ".bili-video-card__image--wrap",
    // 用户空间页视频卡（实测：直接包裹 img.b-img__inner 的容器）
    ".bili-cover-card__thumbnail",
    // 视频播放页右侧推荐
    ".video-page-card-small .pic-box",
    ".rec-list .cover-box",
    // 番剧 / 电影 / 国创
    ".pgc-item__cover-wrp",
    ".bangumi-card .cover",
    // 排行榜
    ".rank-list-item__cover",
    // 动态页内嵌视频卡
    ".bili-dyn-card-video__cover",
];

// 已处理标记的 data 属性名，避免重复处理
const PROCESSED_ATTR = "data-bilibeastify";

function findUnprocessedThumbnails() {
    const seen = new Set();
    const found = [];
    for (const selector of THUMBNAIL_SELECTORS) {
        document.querySelectorAll(selector).forEach(el => {
            // 用 data 属性标记已处理（无论是否实际显示了 overlay），避免重复
            if (!el.hasAttribute(PROCESSED_ATTR) && !seen.has(el)) {
                seen.add(el);
                found.push(el);
            }
        });
    }
    return found;
}

// ─── Image selection ─────────────────────────────────────────────────────────

function getOverlayImageURL() {
    // If user has set a custom image AND chose to use only it
    if (useCustomImage && customImageURL) {
        return customImageURL;
    }
    // Otherwise try built-in numbered images
    if (highestImageIndex > 0) {
        return chrome.runtime.getURL(`${IMAGES_PATH}${getRandomImageFromDirectory()}.webp`);
    }
    // Fallback to custom URL even when "useCustomImage" is false
    return customImageURL || "";
}

// ─── Main apply loop ─────────────────────────────────────────────────────────

function applyOverlayToThumbnails() {
    findUnprocessedThumbnails().forEach(wrap => {
        // 无论是否最终显示 overlay，立即标记为"已处理"，避免重复轮询
        wrap.setAttribute(PROCESSED_ATTR, "1");

        if (Math.random() >= appearChance) return; // 本次不显示
        const url = getOverlayImageURL();
        if (!url) return;
        applyOverlay(wrap, url, Math.random() < flipChance);
    });
}

// ─── BrandonXLF non-repeat random image logic ────────────────────────────────

const SIZE_OF_NON_REPEAT = 8;
const lastIndexes = Array(SIZE_OF_NON_REPEAT).fill(-1);
let highestImageIndex = 0;

function getRandomImageFromDirectory() {
    if (highestImageIndex <= SIZE_OF_NON_REPEAT) {
        lastIndexes.fill(-1);
    }
    let randomIndex = -1;
    while (lastIndexes.includes(randomIndex) || randomIndex < 0) {
        randomIndex = Math.floor(Math.random() * highestImageIndex) + 1;
    }
    lastIndexes.shift();
    lastIndexes.push(randomIndex);
    return randomIndex;
}

async function checkImageExistence(index) {
    try {
        const r = await fetch(chrome.runtime.getURL(`${IMAGES_PATH}${index}.webp`));
        return r.ok;
    } catch {
        return false;
    }
}

async function getHighestImageIndex() {
    const INITIAL = 4;
    let i = INITIAL;
    while (await checkImageExistence(i)) i *= 2;
    let min = i <= INITIAL ? 1 : i / 2;
    let max = i;
    while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        if (await checkImageExistence(mid)) {
            min = mid + 1;
        } else {
            max = mid - 1;
        }
    }
    highestImageIndex = max;
}

// ─── Config loader ───────────────────────────────────────────────────────────

async function loadConfig() {
    const defaults = { extensionIsDisabled, appearChance, flipChance, customImageURL, useCustomImage };
    return new Promise((resolve) => {
        chrome.storage.local.get(defaults, (result) => {
            extensionIsDisabled = result.extensionIsDisabled;
            appearChance       = result.appearChance;
            flipChance         = result.flipChance;
            customImageURL     = result.customImageURL;
            useCustomImage     = result.useCustomImage;
            resolve();
        });
    });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
    await loadConfig();

    if (extensionIsDisabled) {
        console.info(`[${EXTENSION_NAME}] 插件已禁用`);
        return;
    }

    // Try to load built-in images (errors are expected if none exist)
    console.info(`[${EXTENSION_NAME}] 正在检测内置图片数量，以下报错可忽略…`);
    await getHighestImageIndex();

    if (highestImageIndex === 0 && !customImageURL) {
        console.warn(`[${EXTENSION_NAME}] 未找到内置图片且未设置自定义图片URL，插件无法工作。请在设置中添加图片URL。`);
        return;
    }

    console.info(`[${EXTENSION_NAME}] 加载完成，内置图片: ${highestImageIndex} 张，自定义图片: ${customImageURL ? "已设置" : "未设置"}`);

    // 立即处理一次已有封面
    applyOverlayToThumbnails();

    // MutationObserver：DOM 新增节点时立即触发（防抖 50ms），覆盖滚动加载的新卡片
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyOverlayToThumbnails, 50);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // setInterval 兜底：每 2 秒扫一次，防止 MutationObserver 遗漏
    setInterval(applyOverlayToThumbnails, 2000);
}

main();

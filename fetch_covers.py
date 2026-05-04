import sys
import time
import io
from hashlib import md5
from pathlib import Path
from urllib.parse import urlencode

import requests
from tqdm import tqdm
from PIL import Image

# ── 核心配置 ──────────────────────────────────────────────────────────────────

# 你可以根据需要修改这个默认值,爬取多少张图
DEFAULT_MAX_VIDEOS = 100

PAGE_SIZE = 30
OUTPUT_DIR = Path("covers")
REMBG_DIR = Path("covers_nobg")

DELAY_BETWEEN_PAGES = 1.0
DELAY_BETWEEN_DOWNLOADS = 0.1  # 稍微加快了一点下载速度

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.bilibili.com/",
}

COOKIES = {}


# ── 功能函数（保持 WBI 签名和解析逻辑） ────────────────────────────────────────

def parse_cookie(s: str) -> dict:
    return {k.strip(): v.strip() for part in s.split(";") if "=" in part for k, v in [part.split("=", 1)]}


MIXIN_KEY_ENC_TAB = [46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28,
                     14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21,
                     56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52]


def _get_wbi_keys():
    r = requests.get("https://api.bilibili.com/x/web-interface/nav", headers=HEADERS, cookies=COOKIES, timeout=15)
    r.raise_for_status()
    data = r.json()["data"]["wbi_img"]
    return data["img_url"].rsplit("/", 1)[1].split(".")[0], data["sub_url"].rsplit("/", 1)[1].split(".")[0]


_wbi_cache = {}


def _sign_wbi(params: dict) -> dict:
    if "keys" not in _wbi_cache:
        img_key, sub_key = _get_wbi_keys()
        _wbi_cache["keys"] = "".join((img_key + sub_key)[i] for i in MIXIN_KEY_ENC_TAB)[:32]
    signed = {**params, "wts": int(time.time())}
    signed = dict(sorted(signed.items()))
    query = urlencode({k: "".join(c for c in str(v) if c not in "!'()*") for k, v in signed.items()})
    signed["w_rid"] = md5((query + _wbi_cache["keys"]).encode()).hexdigest()
    return signed


# ── 业务流程 ──────────────────────────────────────────────────────────────────

def get_covers(uid, max_count):
    covers = []
    page = 1
    pbar = tqdm(total=max_count, desc="获取封面列表")
    while len(covers) < max_count:
        params = _sign_wbi({"mid": uid, "pn": page, "ps": PAGE_SIZE, "order": "pubdate", "tid": 0})
        data = requests.get("https://api.bilibili.com/x/space/wbi/arc/search", params=params, headers=HEADERS,
                            cookies=COOKIES).json()["data"]
        vlist = data.get("list", {}).get("vlist", [])
        if not vlist: break
        for v in vlist:
            covers.append((v["bvid"], v["pic"].split("@")[0]))
            pbar.update(1)
            if len(covers) >= max_count: break
        page += 1
        time.sleep(DELAY_BETWEEN_PAGES)
    pbar.close()
    return covers


def process_and_cut(covers):
    from rembg import remove, new_session
    OUTPUT_DIR.mkdir(exist_ok=True)
    REMBG_DIR.mkdir(exist_ok=True)
    session = new_session("u2net_human_seg")

    for bvid, url in tqdm(covers, desc="处理中"):
        # 下载
        raw_path = OUTPUT_DIR / f"{bvid}.jpg"
        if not raw_path.exists():
            res = requests.get(url, headers=HEADERS)
            raw_path.write_bytes(res.content)

        # 抠图 + WebP 压缩
        out_path = REMBG_DIR / f"{bvid}.webp"
        if not out_path.exists():
            result = remove(raw_path.read_bytes(), session=session)
            with Image.open(io.BytesIO(result)) as img:
                img.save(out_path, "WEBP", quality=80, method=6)


def rename_sequential(covers):
    """将 covers_nobg 中的 {bvid}.webp 按封面列表顺序重命名为 1.webp、2.webp……"""
    counter = 1
    for bvid, _ in covers:
        src = REMBG_DIR / f"{bvid}.webp"
        if src.exists():
            dst = REMBG_DIR / f"{counter}.webp"
            src.rename(dst)
            counter += 1
    print(f"已重命名为 1.webp … {counter - 1}.webp")


# ── 主程序 ────────────────────────────────────────────────────────────────────

def main():
    global COOKIES
    print("=== Bilibili Timify 素材抓取工具 ===")

    uid = input("1. 输入 UP 主 UID: ").strip()
    cookie_str = input("2. 粘贴 Cookie: ").strip()
    # 💡 唯一控制数量的变量
    count_input = input(f"3. 想要爬取多少张图片? (默认 {DEFAULT_MAX_VIDEOS}): ").strip()

    MAX_VIDEOS = int(count_input) if count_input.isdigit() else DEFAULT_MAX_VIDEOS
    COOKIES = parse_cookie(cookie_str)

    # 执行
    covers = get_covers(uid, MAX_VIDEOS)
    if covers:
        process_and_cut(covers)
        rename_sequential(covers)
        print(f"\n🎉 完成！处理后的 WebP 抠图保存在: {REMBG_DIR.resolve()}")
        print(f"请将 {REMBG_DIR}/ 中的文件复制到扩展的 images/ 目录以替换现有素材。")


if __name__ == "__main__":
    main()
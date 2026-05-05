<div align="center">

# Bilibili Tim

**为 B 站视频封面添加自定义人物贴图（如影视飓风 Tim）的 Chrome 趣味扩展。**

> 🚀 **一键安装**：[前往 Chrome 应用商店安装](https://chromewebstore.google.com/detail/bilibili-tim/acnbealmdpajnkibcabmmnbabnhhlhii)

**基于 [MrBeastify-Youtube](https://github.com/MagicJinn/MrBeastify-Youtube) 修改，遵循 [MIT 协议](https://github.com/MagicJinn/MrBeastify-Youtube?tab=MIT-1-ov-file)。**

</div>
## 在 Chrome 中加载（开发者模式）

无需打包，直接加载源代码即可使用：

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**/加载未打包的扩展程序
4. 选择本项目的根目录（包含 `manifest.json` 的文件夹）
5. 扩展加载成功后，访问 [bilibili.com](https://www.bilibili.com) 即可看到效果

> 修改代码后，在 `chrome://extensions/` 页面点击扩展卡片上的刷新按钮（↺）使改动生效。

## 打包为 .crx / .zip

### 方法一：Chrome 打包（.crx）

1. 打开 `chrome://extensions/`，开启开发者模式
2. 点击 **打包扩展程序**
3. 选择本项目根目录，点击打包
4. Chrome 会生成 `.crx` 和 `.pem` 文件

### 方法二：手动打包 .zip（用于上传 Chrome Web Store）

只需打包以下文件（或者运行build.bat）：

```
images/
icon.png
manifest.json
bilibeastify.js
settings.html
settings.js
```

用任意压缩工具打成 `.zip` 即可上传至 Chrome 开发者后台。

## 使用 fetch_covers.py 批量抓取封面并抠图

`fetch_covers.py` 可以批量下载指定 UP 主的视频封面，并自动用 AI 模型（rembg）去除背景，生成可直接用于扩展的 `.webp` 素材。

### 环境准备

```bash
pip install requests tqdm pillow rembg
```

> 首次运行 rembg 会自动下载 `u2net_human_seg` 模型（约 176 MB），请保持网络畅通。

### 运行

```bash
python fetch_covers.py
```

程序会依次提示输入三项信息：

```
1. 输入 UP 主 UID:        # B 站用户主页 URL 末尾的数字，如 946974
2. 粘贴 Cookie:           # 登录后从浏览器复制（见下方说明）
3. 想要爬取多少张图片?     # 回车留空则使用默认值（100）
```

抓取完成后：
- 原始封面 `.jpg` 保存在 `covers/`
- 去背景并**自动重命名**为 `1.webp`、`2.webp`…… 的文件保存在 `covers_nobg/`

将 `covers_nobg/` 中的所有文件复制到扩展的 `images/` 目录（替换原有文件）即可使用。

### 如何获取 Cookie

B 站 API 需要登录态，必须提供 Cookie。

1. 在 Chrome/Edge 中打开 [bilibili.com](https://www.bilibili.com) 并**确保已登录**
2. 按 `F12` 打开开发者工具，切换到 **Network（网络）** 面板
3. 刷新页面，在请求列表中点击任意一条发往 `bilibili.com` 的请求
4. 在右侧 **Headers（标头）** → **Request Headers** 中找到 `Cookie` 字段
5. 复制 `Cookie:` 后面的**完整字符串**（很长，包含多个 `key=value; ...`）
6. 粘贴到脚本提示的 `粘贴 Cookie:` 输入框中

> Cookie 包含你的登录凭证，请勿分享给他人。Cookie 有效期通常为数月，失效后重新获取即可。

---

## 自定义图片

1. 将背景已去除的图片（支持 `.webp` / `.png` / `.jpg`）按顺序命名为 `1.webp`、`2.webp`…… 放入 `images/` 目录，编号不能有空缺
2. 同步在 `manifest.json` 的 `web_accessible_resources` 中声明对应扩展名
3. 在扩展设置页面，也可以直接上传本地图片或填写图片 URL 作为自定义贴图

## 说明

- 仅支持 Chromium 系浏览器（Chrome / Edge / Brave 等）
- 扩展与 B 站官方无任何关联

---

原项目：[MagicJinn/MrBeastify-Youtube](https://github.com/MagicJinn/MrBeastify-Youtube) · MIT License

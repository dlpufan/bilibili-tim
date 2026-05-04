<div align="center">

# Bilibili Tim

为 B 站视频封面添加自定义人物贴图的 Chrome 扩展。

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

## 自定义图片

1. 将背景已去除的图片（支持 `.webp` / `.png` / `.jpg`）按顺序命名为 `1.webp`、`2.webp`…… 放入 `images/` 目录，编号不能有空缺
2. 同步在 `manifest.json` 的 `web_accessible_resources` 中声明对应扩展名
3. 在扩展设置页面，也可以直接上传本地图片或填写图片 URL 作为自定义贴图

## 说明

- 仅支持 Chromium 系浏览器（Chrome / Edge / Brave 等）
- 扩展与 B 站官方无任何关联

---

原项目：[MagicJinn/MrBeastify-Youtube](https://github.com/MagicJinn/MrBeastify-Youtube) · MIT License

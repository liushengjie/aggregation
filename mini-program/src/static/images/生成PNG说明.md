# Logo PNG 生成说明

## 已创建的 SVG Logo 文件

1. **logo.svg** - 完整版 Logo（200x200，包含文字）
2. **logo-simple.svg** - 简化版 Logo（120x120，无文字）
3. **logo-icon.svg** - 图标版 Logo（64x64，适合作为图标）

## 转换为 PNG 的方法

### 方法1：使用在线工具（推荐）

1. 访问以下任一在线转换工具：
   - https://convertio.co/zh/svg-png/
   - https://cloudconvert.com/svg-to-png
   - https://www.freeconvert.com/svg-to-png

2. 上传 SVG 文件
3. 选择输出尺寸（建议）：
   - logo.png: 400x400 或 800x800
   - logo-simple.png: 240x240 或 480x480
   - logo-icon.png: 128x128 或 256x256

4. 下载 PNG 文件

### 方法2：使用浏览器

1. 在浏览器中打开 SVG 文件
2. 右键点击图片
3. 选择"另存为"或"复制图片"
4. 使用图片编辑软件（如 Photoshop、GIMP）导出为 PNG

### 方法3：使用命令行工具（需要安装 ImageMagick）

```bash
# 安装 ImageMagick (Windows)
# 下载: https://imagemagick.org/script/download.php

# 转换命令
magick convert logo.svg -resize 400x400 logo.png
magick convert logo-simple.svg -resize 240x240 logo-simple.png
magick convert logo-icon.svg -resize 128x128 logo-icon.png
```

### 方法4：使用 Node.js 脚本

```bash
# 安装依赖
npm install --save-dev sharp

# 创建转换脚本 convert-logo.js
```

```javascript
const sharp = require('sharp');
const fs = require('fs');

async function convertSvgToPng() {
  // 转换完整版
  await sharp('logo.svg')
    .resize(400, 400)
    .png()
    .toFile('logo.png');
  
  // 转换简化版
  await sharp('logo-simple.svg')
    .resize(240, 240)
    .png()
    .toFile('logo-simple.png');
  
  // 转换图标版
  await sharp('logo-icon.svg')
    .resize(128, 128)
    .png()
    .toFile('logo-icon.png');
  
  console.log('转换完成！');
}

convertSvgToPng();
```

## 推荐尺寸

- **网站 Logo**: 400x400 或 800x800
- **小程序 Logo**: 200x200 或 400x400
- **Favicon**: 32x32 或 64x64
- **App Icon**: 512x512 或 1024x1024

## Logo 设计说明

### 设计理念
- **棱镜形状**：六边形代表棱镜，象征聚合和折射
- **渐变色彩**：紫色到粉色的渐变，现代感强
- **光线效果**：内部光线线条，体现"聚合"和"聚焦"的概念
- **简洁风格**：适合现代互联网产品

### 颜色方案
- 主色：`#667eea` (靛蓝色)
- 中间色：`#764ba2` (紫色)
- 辅助色：`#f093fb` (粉紫色)

### 使用场景
- 网站头部 Logo
- 小程序图标
- 社交媒体头像
- 应用图标
- 名片和宣传材料


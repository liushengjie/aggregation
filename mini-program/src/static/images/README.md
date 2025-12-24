# Logo 文件说明

## SVG Logo 文件

本目录包含三个 SVG 格式的 Logo 设计：

1. **logo.svg** - 完整版 Logo
   - 尺寸：200x200
   - 包含"棱镜"文字
   - 适合网站头部使用

2. **logo-simple.svg** - 简化版 Logo
   - 尺寸：120x120
   - 无文字，纯图标
   - 适合小程序图标

3. **logo-icon.svg** - 图标版 Logo
   - 尺寸：64x64
   - 圆形背景
   - 适合 Favicon 和 App Icon

## 转换为 PNG

### 快速方法（推荐）

使用在线工具转换：
1. 访问 https://convertio.co/zh/svg-png/
2. 上传 SVG 文件
3. 选择输出尺寸
4. 下载 PNG 文件

### 使用脚本转换

```bash
# 安装依赖
npm install --save-dev sharp

# 运行转换脚本
npm run convert-logo
```

脚本会自动生成多个尺寸的 PNG 文件。

## 设计说明

### 设计理念
- **棱镜形状**：六边形代表棱镜，象征聚合和折射
- **渐变色彩**：紫色到粉色的渐变，现代感强
- **光线效果**：内部光线线条，体现"聚合"和"聚焦"的概念

### 颜色方案
- 主色：`#667eea` (靛蓝色)
- 中间色：`#764ba2` (紫色)
- 辅助色：`#f093fb` (粉紫色)

### 使用建议

- **网站 Logo**: 使用 logo-400.png 或 logo-800.png
- **小程序图标**: 使用 logo-simple-240.png
- **Favicon**: 使用 logo-icon-64.png
- **App Icon**: 使用 logo-icon-256.png

## 文件清单

```
images/
├── logo.svg              # 完整版 SVG
├── logo-simple.svg       # 简化版 SVG
├── logo-icon.svg         # 图标版 SVG
├── convert-logo.js       # 转换脚本
├── 生成PNG说明.md        # 详细说明
└── README.md             # 本文件
```


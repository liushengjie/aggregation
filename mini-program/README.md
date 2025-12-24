# 棱镜聚合 - 微信小程序版

这是棱镜聚合平台的微信小程序版本，通过 Webview 方式嵌入 Web 应用，实现双端共存。

## 项目结构

```
mini-program/
├── src/
│   ├── pages/          # 页面
│   ├── components/     # 组件
│   ├── utils/          # 工具函数
│   ├── stores/         # 状态管理
│   └── static/         # 静态资源
├── pages.json          # 页面配置
├── manifest.json       # 小程序配置
└── package.json        # 依赖配置
```

## 开发

### 安装依赖

```bash
cd mini-program
npm install
```

### 开发模式

```bash
# 微信小程序开发
npm run dev:mp-weixin

# H5开发（用于调试）
npm run dev:h5
```

### 构建

```bash
# 构建微信小程序
npm run build:mp-weixin

# 构建H5
npm run build:h5
```

## 配置说明

### 1. 小程序 AppID

在 `manifest.json` 中配置你的小程序 AppID：

```json
{
  "mp-weixin": {
    "appid": "你的小程序AppID"
  }
}
```

### 2. Webview URL

在 `src/utils/config.js` 中配置 Web 应用的地址：

```javascript
export const CONFIG = {
  webview: {
    production: 'https://prism.xin',      // 生产环境
    development: 'http://localhost:3350'  // 开发环境
  }
}
```

### 3. 业务域名配置

在微信公众平台配置 Webview 业务域名：
- 登录微信公众平台
- 进入"开发" -> "开发管理" -> "开发设置"
- 在"业务域名"中添加你的域名（必须是 HTTPS）

## 功能特性

- ✅ Webview 容器嵌入 Web 应用
- ✅ 小程序原生导航栏
- ✅ 底部操作栏（首页、后退、分享）
- ✅ Webview 通信桥接
- ✅ 本地存储管理
- ✅ 状态管理（Pinia）
- ✅ 分享功能

## 注意事项

1. **HTTPS 要求**：生产环境必须使用 HTTPS
2. **域名白名单**：需要在微信公众平台配置业务域名
3. **Webview 限制**：某些 Web API 在小程序 Webview 中可能不可用
4. **性能优化**：合理使用缓存，避免频繁刷新

## 开发流程

1. 在微信开发者工具中打开项目
2. 配置小程序 AppID
3. 配置业务域名
4. 运行开发命令
5. 在开发者工具中预览和调试

## 发布流程

1. 构建生产版本：`npm run build:mp-weixin`
2. 在微信开发者工具中上传代码
3. 在微信公众平台提交审核
4. 审核通过后发布


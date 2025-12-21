<div align="center">

# 棱镜聚合 (Prism Hub)

**一个现代化的多平台社交内容聚合系统**

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.0-003B57?logo=sqlite)](https://www.sqlite.org/)

实时汇总来自微博、小红书、哔哩哔哩的优质内容，通过智能算法为您提供一站式内容浏览体验。

</div>

---

## 📸 系统预览

### 主界面 - 聚合面板

<!-- 请在此处添加主界面截图 -->
<!-- 截图路径: docs/screenshots/dashboard-main.png -->
<!-- 建议尺寸: 1920x1080 -->

**功能特点：**
- 🎨 精美的毛玻璃（Glass Morphism）设计风格
- 📱 响应式布局，完美适配各种屏幕尺寸
- 🔍 实时搜索和平台筛选功能
- ⚡ 流畅的交互动画效果

### 趋势洞察视图

<!-- 请在此处添加趋势洞察页面截图 -->
<!-- 截图路径: docs/screenshots/insights-view.png -->

**核心功能：**
- 📊 AI 驱动的趋势分析
- 🎯 热点话题提取
- 📈 平台数据对比
- 💡 智能内容推荐策略

### 系统设置界面

<!-- 请在此处添加设置页面截图 -->
<!-- 截图路径: docs/screenshots/settings-view.png -->

**设置项包括：**
- 🔗 平台账号连接管理
- 👤 个人资料编辑
- 🔐 安全设置
- 🔔 通知偏好配置

### 平台账号管理

<!-- 请在此处添加账号管理截图 -->
<!-- 截图路径: docs/screenshots/account-management.png -->

支持连接和管理以下平台的账号：
- 🔴 **微博** (Weibo)
- 🌸 **小红书** (Xiaohongshu)
- 🔵 **哔哩哔哩** (Bilibili)

---

## ✨ 核心功能

### 1. 多平台内容聚合
- 自动抓取微博、小红书、B站的热门内容
- 统一的内容展示格式
- 实时同步更新

### 2. 智能内容筛选
- 按平台筛选（全部/微博/小红书/B站）
- 关键词搜索
- 内容分类标签

### 3. 数据可视化
- 趋势洞察分析
- 平台数据对比
- 用户行为统计

### 4. 账号管理系统
- 多平台账号绑定
- 安全认证机制
- 同步状态监控

### 5. 定时同步服务
- 后台自动抓取内容
- 可配置同步频率
- 增量更新机制

---

## 🛠️ 技术栈

### 前端
- **React 19.2** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具
- **Lucide React** - 图标库
- **Tailwind CSS** - 样式框架（推断）

### 后端
- **Express 5.2** - Web 框架
- **TypeScript** - 类型安全
- **SQLite** - 轻量级数据库
- **Playwright** - 网页自动化（用于内容抓取）
- **bcryptjs** - 密码加密

### 架构特点
- 前后端分离
- RESTful API 设计
- Session 认证机制
- 模块化代码结构

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 安装步骤

1. **克隆仓库**
```bash
git clone <repository-url>
cd aggregation
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

创建 `.env.local` 文件（如果需要）：
```env
# 服务器端口（可选，默认 3001）
PORT=3001

# Session 密钥（生产环境请务必修改）
SESSION_SECRET=your-secret-key-here
```

4. **初始化数据库**

数据库会在首次运行时自动创建。

5. **启动开发服务器**
```bash
npm run dev
```

此命令会同时启动：
- 前端开发服务器（默认：http://localhost:3000）
- 后端 API 服务器（默认：http://localhost:3001）

6. **访问应用**

打开浏览器访问：http://localhost:3000

---

## 📁 项目结构

```
aggregation/
├── components/          # React 组件
│   ├── ContentCard.tsx      # 内容卡片组件
│   ├── InsightsView.tsx     # 趋势洞察视图
│   ├── LoginForm.tsx        # 登录表单
│   ├── PlatformLoginModal.tsx # 平台登录模态框
│   ├── SettingsView.tsx     # 设置视图
│   └── Sidebar.tsx          # 侧边栏组件
├── contexts/           # React Context
│   └── AuthContext.tsx      # 认证上下文
├── services/           # 前端服务
│   └── api.ts              # API 调用封装
├── server/             # 后端服务
│   ├── index.ts            # 服务器入口
│   ├── middleware/         # 中间件
│   │   └── auth.ts            # 认证中间件
│   ├── routes/             # 路由定义
│   │   ├── accounts.ts         # 账号管理路由
│   │   ├── auth.ts             # 认证路由
│   │   └── items.ts            # 内容路由
│   └── services/            # 业务逻辑
│       ├── database.ts         # 数据库服务
│       ├── loginService.ts     # 登录服务
│       ├── schedulerService.ts # 定时任务服务
│       ├── syncService.ts      # 同步服务
│       └── scrapers/           # 内容抓取器
│           ├── base.ts            # 基础抓取器
│           ├── weibo.ts           # 微博抓取器
│           ├── bilibili.ts        # B站抓取器
│           ├── xiaohongshu.ts     # 小红书抓取器
│           └── index.ts           # 抓取器入口
├── data/               # 数据文件
│   └── aggregation.db      # SQLite 数据库
├── types.ts            # TypeScript 类型定义
├── constants.tsx       # 常量定义
├── App.tsx             # 主应用组件
├── index.tsx           # 入口文件
└── vite.config.ts      # Vite 配置
```

---

## 📝 API 文档

### 认证相关

#### 注册用户
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### 用户登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

#### 用户登出
```http
POST /api/auth/logout
```

### 内容相关

#### 获取内容列表
```http
GET /api/items?page=1&limit=100
```

#### 获取单条内容
```http
GET /api/items/:id
```

### 账号管理

#### 获取账号列表
```http
GET /api/accounts
```

#### 连接平台账号
```http
POST /api/accounts
Content-Type: application/json

{
  "platform": "Weibo",
  "username": "account_username",
  "credentials": {}
}
```

---

## 🔧 开发指南

### 运行前端开发服务器
```bash
npm run dev:frontend
```

### 运行后端开发服务器
```bash
npm run dev:server
```

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

---

## 🎨 UI 设计特色

### 毛玻璃效果（Glass Morphism）
整个应用采用现代化的毛玻璃设计风格，提供优雅的视觉体验。

### 响应式设计
- 移动端优化
- 平板适配
- 桌面端完整功能

### 动画效果
- 页面过渡动画
- 悬停交互效果
- 加载状态指示

---

## 🔒 安全特性

- 密码加密存储（bcrypt）
- Session 认证机制
- CORS 配置
- 输入验证

---

## 📊 数据库结构

主要数据表：
- **users** - 用户表
- **accounts** - 平台账号表
- **items** - 内容项表
- **sync_logs** - 同步日志表

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证。

---

## 👥 作者

**智汇聚合团队**

---

## 🔮 未来计划

- [ ] 支持更多社交平台
- [ ] 移动端 App 开发
- [ ] 更强大的 AI 分析功能
- [ ] 内容收藏和分享功能
- [ ] 推送通知系统
- [ ] 多语言支持

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至：[your-email@example.com]

---

<div align="center">

**⭐ 如果这个项目对你有帮助，欢迎 Star！**

Made with ❤️ by SocialStream Hub Team

</div>

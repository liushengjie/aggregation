# 微博搜索爬虫设计方案

## 一、功能需求

### 1.1 输入
- 搜索关键词（如："人之初"）
- 可选参数：页码、每页数量

### 1.2 输出
返回搜索结果列表，每条结果包含：
- **基本信息**
  - 微博ID（用于唯一标识）
  - 微博文本内容
  - 发布者昵称
  - 发布者头像
  - 发布时间
  - 微博链接URL
  
- **媒体内容**
  - 图片列表（多张图片的URL数组）
  - 视频信息（视频封面、视频URL）
  
- **互动数据**
  - 转发数
  - 评论数
  - 点赞数
  - 阅读数（如有）

- **其他信息**
  - 话题标签（#xxx#）
  - @提及用户
  - 转发来源（如果是转发微博）

## 二、技术实现方案

### 2.1 技术栈
- **Playwright**：用于模拟浏览器，处理动态加载内容
- **TypeScript**：类型安全
- **与现有项目保持一致**：参考 `doubanScraper.ts` 的实现方式

### 2.2 页面结构分析

#### 搜索页面 URL 格式
```
https://s.weibo.com/weibo?q={关键词}&page={页码}
```

#### 预期页面元素选择器（需要实际验证）

**搜索结果容器**：
- `.card-wrap` 或 `.m-wrap` - 单条微博容器
- `.card` - 微博卡片

**文本内容**：
- `.txt` 或 `.weibo-text` - 微博正文
- `.from` - 发布时间和来源

**用户信息**：
- `.name` 或 `.username` - 用户名
- `.avatar` 或 `img[alt*="头像"]` - 用户头像

**图片**：
- `.media-pic img` 或 `.pic img` - 图片元素
- 需要提取 `src` 或 `data-src` 属性
- 可能需要处理懒加载（`data-lazy`）

**视频**：
- `.media-video` 或 `video` - 视频元素
- `.video-poster` - 视频封面
- 视频URL可能在 `data-url` 或通过API获取

**互动数据**：
- `.card-act li` - 转发/评论/点赞按钮
- 或 `.toolbar span` - 数据展示区域

### 2.3 实现流程

```
1. 构建搜索URL
   ↓
2. 使用 Playwright 打开页面
   ↓
3. 等待页面加载完成（处理动态内容）
   ↓
4. 滚动页面加载更多内容（如需要）
   ↓
5. 提取搜索结果列表
   ↓
6. 对每条结果提取：
   - 文本内容
   - 用户信息
   - 图片URLs
   - 视频信息
   - 互动数据
   ↓
7. 数据清洗和格式化
   ↓
8. 返回结构化数据
```

### 2.4 数据模型设计

```typescript
interface WeiboSearchResult {
  // 基本信息
  id: string;                    // 微博ID
  text: string;                  // 微博文本内容
  author: {
    name: string;                // 用户名
    avatar?: string;              // 头像URL
    profileUrl?: string;          // 个人主页URL
  };
  publishTime?: string;          // 发布时间
  publishFrom?: string;          // 发布来源（如：iPhone客户端）
  url: string;                   // 微博链接
  
  // 媒体内容
  images?: string[];             // 图片URL数组
  video?: {
    cover?: string;               // 视频封面
    url?: string;                 // 视频URL
    duration?: string;            // 视频时长
  };
  
  // 互动数据
  stats: {
    reposts: number;             // 转发数
    comments: number;             // 评论数
    likes: number;                // 点赞数
    views?: number;               // 阅读数
  };
  
  // 其他
  topics?: string[];             // 话题标签（#xxx#）
  mentions?: string[];           // @提及的用户
  isRepost?: boolean;            // 是否为转发
  originalWeibo?: {              // 原微博信息（如果是转发）
    id?: string;
    text?: string;
    author?: string;
  };
}

interface WeiboSearchResponse {
  keyword: string;                // 搜索关键词
  total?: number;                 // 总结果数（如可获取）
  page: number;                   // 当前页码
  results: WeiboSearchResult[];   // 搜索结果列表
  hasMore: boolean;               // 是否还有更多结果
}
```

## 三、实现细节

### 3.1 反爬虫处理

1. **User-Agent**：设置真实的浏览器 User-Agent
2. **请求间隔**：在请求之间添加延迟
3. **Cookie处理**：可能需要登录Cookie才能查看完整内容
4. **验证码检测**：检测是否出现验证码，记录日志

### 3.2 图片处理

1. **懒加载处理**：微博图片可能使用懒加载，需要：
   - 检查 `data-src` 属性
   - 滚动到图片位置触发加载
   - 等待图片加载完成

2. **图片URL处理**：
   - 提取原始高清图片URL
   - 处理缩略图到原图的转换（如：`thumbnail` → `large`）
   - 使用项目现有的图片代理功能（`/api/image/proxy`）

### 3.3 视频处理

1. **视频URL提取**：
   - 微博视频通常需要特殊处理
   - 可能需要点击播放按钮触发视频加载
   - 提取 `video` 标签的 `src` 或通过API获取

2. **视频封面**：
   - 提取 `poster` 属性或封面图片

### 3.4 错误处理

1. **网络错误**：重试机制
2. **页面结构变化**：多个选择器备选方案
3. **登录要求**：检测是否需要登录，记录日志
4. **验证码**：检测并记录，不自动处理

## 四、文件结构

```
server/services/scrapers/search/
├── weiboSearchScraper.ts    # 主爬虫文件
└── types.ts                  # 类型定义（可选）
```

## 五、使用示例

```typescript
import { scrapeWeiboSearch } from './scrapers/search/weiboSearchScraper';

// 搜索关键词
const results = await scrapeWeiboSearch('人之初', {
  page: 1,
  limit: 20
});

console.log(`找到 ${results.results.length} 条结果`);
results.results.forEach(item => {
  console.log(`用户: ${item.author.name}`);
  console.log(`内容: ${item.text}`);
  console.log(`图片: ${item.images?.length || 0} 张`);
  if (item.video) {
    console.log(`视频: ${item.video.url}`);
  }
});
```

## 六、注意事项

1. **法律合规**：确保爬虫使用符合相关法律法规
2. **频率控制**：避免过于频繁的请求
3. **数据使用**：尊重用户隐私，合理使用数据
4. **代码维护**：微博页面结构可能变化，需要定期更新选择器

## 七、Cookie配置

### 7.1 环境变量设置

在项目根目录的 `.env` 文件中添加微博cookie：

```env
# 微博搜索Cookie（从浏览器开发者工具中复制）
WEIBO_COOKIE=SUB=_2AkMT...; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9W...; _s_tentry=...; UOR=...
```

### 7.2 如何获取Cookie

1. 打开浏览器，访问 `https://s.weibo.com`
2. 登录微博账号
3. 打开开发者工具（F12）
4. 切换到 `Application` 或 `存储` 标签
5. 找到 `Cookies` -> `https://s.weibo.com`
6. 复制所有cookie值，格式如：`name1=value1; name2=value2; ...`
7. 将复制的cookie字符串粘贴到 `.env` 文件的 `WEIBO_COOKIE` 中

### 7.3 Cookie格式说明

- Cookie字符串格式：`name1=value1; name2=value2; name3=value3`
- 每个cookie用分号和空格分隔
- 支持的环境变量名称：
  - `WEIBO_COOKIE`（优先）
  - `WEIBO_SEARCH_COOKIE`（备选）

### 7.4 注意事项

- Cookie可能会过期，需要定期更新
- 不要将包含cookie的 `.env` 文件提交到版本控制系统
- 建议使用 `.env.local` 或 `.gitignore` 排除 `.env` 文件

## 八、后续优化

1. **分页支持**：支持获取多页结果
2. **排序选项**：支持按时间、热度等排序
3. **过滤选项**：支持按类型过滤（全部/原创/图片/视频）
4. **缓存机制**：对搜索结果进行缓存，减少重复请求
5. **Cookie自动刷新**：检测cookie过期并提示更新


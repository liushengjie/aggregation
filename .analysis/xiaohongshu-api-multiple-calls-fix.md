# 小红书搜索多次API响应问题分析与修复

## 问题现象

从日志中发现,搜索"情圣3"时,小红书API `/api/sns/web/v1/search/notes` 被触发了**5次**:

```
21:57:44 - API响应 (第1次) - 返回22条,解析20条
21:57:45 - API响应 (第2次) - 返回22条,解析20条  
21:57:51 - API响应 (第3次) - 返回22条,解析20条
21:57:52 - API响应 (第4次) - 返回22条,解析20条
21:57:54 - API响应 (第5次) - 返回22条,解析20条
最终找到 20 条结果
```

## 根本原因分析

### 1. 滚动逻辑问题

**原代码 (第236-244行):**
```typescript
// 滚动触发加载
if (results.length === 0) {
    for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(3000);
}
```

**问题:**
- 条件 `results.length === 0` 只在初始时检查一次
- 一旦开始滚动,会执行完整的3次滚动循环
- 每次滚动都触发小红书的懒加载机制,导致新的API请求
- 即使第一次滚动后已经收集到20条数据,仍会继续滚动

### 2. API响应监听器缺少限制

**原代码 (第195-221行):**
```typescript
page.on('response', async (response) => {
    // ...
    if (json.success && json.data?.items) {
        for (const item of json.data.items) {
            if (results.length >= limit) break;
            const parsed = parseNoteItem(item);
            if (parsed) results.push(parsed);
        }
    }
});
```

**问题:**
- 虽然在添加时检查了 `results.length >= limit`
- 但每次API响应都会尝试解析JSON,消耗资源
- 没有在达到限制后提前返回

### 3. 执行流程

1. **页面加载** → 自动触发第1次API请求
2. **等待3秒** → 第1次API响应返回,results.length = 20
3. **检查滚动条件** → `results.length === 0` 为false,但此时已经在等待中
4. **实际情况** → 由于异步执行,滚动逻辑可能在第一次API响应前就开始了
5. **3次滚动** → 每次滚动触发新的API请求(第2-4次)
6. **额外请求** → 最后的等待期间可能又触发了第5次

## 修复方案

### 修改1: API响应监听器添加提前返回

```typescript
page.on('response', async (response) => {
    // ...
    try {
        // 如果已经收集到足够的结果,跳过处理
        if (results.length >= limit) {
            console.log(`[XiaohongshuSearch] 已达到限制 ${limit} 条,跳过API响应处理`);
            return;
        }
        
        const json = await response.json();
        // ...
        if (json.success && json.data?.items) {
            const beforeCount = results.length;
            for (const item of json.data.items) {
                if (results.length >= limit) break;
                const parsed = parseNoteItem(item);
                if (parsed) results.push(parsed);
            }
            const addedCount = results.length - beforeCount;
            console.log(`[XiaohongshuSearch] API返回 ${json.data.items.length} 条，新增 ${addedCount} 条，总计 ${results.length} 条`);
        }
    }
});
```

**改进点:**
- ✅ 在解析JSON前检查是否已达到限制
- ✅ 提前返回,避免不必要的JSON解析
- ✅ 更详细的日志,显示"新增"和"总计"

### 修改2: 优化滚动逻辑

```typescript
// 滚动触发加载（只在结果不足时滚动，并实时检查）
if (results.length < limit) {
    console.log(`[XiaohongshuSearch] 当前结果 ${results.length} 条，开始滚动加载...`);
    for (let i = 0; i < 3; i++) {
        // 检查是否已经收集到足够的数据
        if (results.length >= limit) {
            console.log(`[XiaohongshuSearch] 已收集到 ${results.length} 条，停止滚动`);
            break;
        }
        
        await page.evaluate(() => window.scrollBy(0, 500));
        console.log(`[XiaohongshuSearch] 第 ${i + 1} 次滚动，当前结果: ${results.length} 条`);
        await page.waitForTimeout(2000);
    }
    await page.waitForTimeout(2000);
}
```

**改进点:**
- ✅ 改为 `results.length < limit` 条件,更合理
- ✅ 每次滚动前检查数据量,达到限制立即停止
- ✅ 减少最后的等待时间(3秒→2秒)
- ✅ 添加详细的滚动日志

## 预期效果

修复后的执行流程:

1. **页面加载** → 等待3秒
2. **第1次API响应** → 收集到20条数据
3. **检查滚动条件** → `results.length < limit` 为false (20 >= 20)
4. **跳过滚动** → 不再触发额外的API请求
5. **直接返回** → 只有1次有效的API请求

或者,如果第一次API响应不足20条:

1. **页面加载** → 等待3秒
2. **第1次API响应** → 收集到10条数据
3. **开始滚动** → `results.length < limit` 为true (10 < 20)
4. **第1次滚动** → 触发第2次API,收集到20条
5. **检查数据量** → `results.length >= limit` 为true,停止滚动
6. **返回结果** → 只有2次API请求,而非5次

## 总结

- **问题根源**: 滚动逻辑没有实时检查数据量,导致过度滚动
- **修复核心**: 在滚动循环中实时检查,达到限制立即停止
- **性能提升**: 减少不必要的API请求和JSON解析
- **日志优化**: 更清晰的日志输出,便于调试

---

**修改文件**: `server/services/scrapers/search/xiaohongshuSearchScraper.ts`
**修改时间**: 2025-12-29 22:06

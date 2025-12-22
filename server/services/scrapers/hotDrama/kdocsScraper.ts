import { chromium } from 'playwright';

interface ScrapedDrama {
    title: string;
    download_link: string;
    baiduUrl?: string;
    quarkUrl?: string;
}

/**
 * Parse content from KDocs page
 * 完全按照 kdocs_video.ts 的逻辑：用百度链接作为资源的分割点，往前找完整标题行
 * 标题保留原文，不做任何截取
 */
function parseContent(content: string): Array<{ title: string; baiduUrl: string | null; quarkUrl: string | null }> {
    const resources: Array<{ title: string; baiduUrl: string | null; quarkUrl: string | null }> = [];
    
    // 用百度链接作为资源的标识
    const baiduPattern = /https?:\/\/pan\.baidu\.com\/s\/[A-Za-z0-9_-]+(?:\?pwd=[A-Za-z0-9]+)?/g;
    const baiduMatches = [...content.matchAll(baiduPattern)];
    
    for (let i = 0; i < baiduMatches.length; i++) {
        const baiduMatch = baiduMatches[i];
        const baiduIndex = baiduMatch.index!;
        const baiduUrl = baiduMatch[0];
        
        // 往前找标题（到上一个百度链接之后，或内容开头）
        let searchStart = 0;
        if (i > 0) {
            // 从上一个百度链接结束位置开始
            searchStart = baiduMatches[i - 1].index! + baiduMatches[i - 1][0].length;
        }
        
        // 提取百度链接之前的内容
        const beforeBaidu = content.slice(searchStart, baiduIndex);
        
        // 找到标题的开始位置（以中文或图标开头，跳过链接残留和分割线）
        // 从最后一个"夸克链接"或"提取码"之后开始
        let titleStart = 0;
        const lastQuark = beforeBaidu.lastIndexOf("pan.quark.cn");
        const lastExtract = beforeBaidu.lastIndexOf("提取码");
        const skipAfter = Math.max(lastQuark > 0 ? lastQuark + 20 : 0, lastExtract > 0 ? lastExtract + 10 : 0);
        
        if (skipAfter > 0 && skipAfter < beforeBaidu.length) {
            titleStart = skipAfter;
        }
        
        // 从 titleStart 开始找第一个中文字符或图标，但要跳过分割线
        // 按行查找，跳过分割线行
        const lines = beforeBaidu.slice(titleStart).split('\n');
        let foundTitleStart = false;
        let lineOffset = 0;
        
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx].trim();
            // 跳过空行和分割线
            if (!line || line.length === 0) continue;
            if (/-+日期分割线-+/.test(line)) continue;
            if (/^-{10,}$/.test(line)) continue;
            if (/^={10,}$/.test(line)) continue;
            
            // 找到包含中文或图标的行
            const titleMatch = line.match(/[🔝🔥⭐️✨💎🎬📺\u4e00-\u9fa5]/);
            if (titleMatch && titleMatch.index !== undefined) {
                // 计算在原始文本中的位置
                for (let i = 0; i < lineIdx; i++) {
                    lineOffset += lines[i].length + 1; // +1 for newline
                }
                titleStart += lineOffset + titleMatch.index;
                foundTitleStart = true;
                break;
            }
        }
        
        // 如果没找到，使用原始方法
        if (!foundTitleStart) {
            const titleSearchText = beforeBaidu.slice(titleStart);
            const fallbackMatch = titleSearchText.match(/[🔝🔥⭐️✨💎🎬📺\u4e00-\u9fa5]/);
            if (fallbackMatch && fallbackMatch.index !== undefined) {
                titleStart += fallbackMatch.index;
            }
        }
        
        // 提取完整标题（从标题开始到"百度链接"之前）
        let titlePart = beforeBaidu.slice(titleStart);
        // 移除末尾的"百度链接"文字和多余内容
        titlePart = titlePart
            .replace(/百?度链接\s*[：:]\s*[\s\S]*$/, "") // 移除"百度链接"或"度链接"及之后的所有内容
            .replace(/\n[\s\S]*$/, "") // 只保留第一行
            .trim();
        
        // 只移除开头图标，保留其他所有内容
        titlePart = titlePart.replace(/^[🔝🔥⭐️✨💎🎬📺]+\s*/, "").trim();
        // 移除末尾可能残留的"度链接"等
        titlePart = titlePart.replace(/百?度链接\s*[：:]?\s*$/, "").trim();
        
        // 移除分割线
        titlePart = titlePart.replace(/-+日期分割线-+/g, "").trim();
        titlePart = titlePart.replace(/^-{10,}$/gm, "").trim();
        titlePart = titlePart.replace(/^={10,}$/gm, "").trim();
        
        // 跳过无效标题（包括分割线）
        if (!titlePart || titlePart.length < 2) continue;
        if (titlePart.includes("小丸子")) continue;
        
        // 处理 "链接：xxx" 格式，提取实际标题
        if (titlePart.match(/^链接[：:]/) || titlePart.includes("清晰度专用文档")) {
            // 1. 先尝试提取最后一个分割线后面的内容
            const afterSeparator = titlePart.match(/-{3,}\s*([^-]+)$/);
            if (afterSeparator && afterSeparator[1] && afterSeparator[1].trim().length > 1) {
                titlePart = afterSeparator[1].trim();
            } else {
                // 2. 尝试提取🔝后面的内容
                const afterIcon = titlePart.match(/🔝(.+)$/);
                if (afterIcon && afterIcon[1]) {
                    titlePart = afterIcon[1].trim();
                } else {
                    // 3. 尝试提取 (NEW) 后面的内容
                    const afterNew = titlePart.match(/\(NEW\)\s*(.+)$/i);
                    if (afterNew && afterNew[1]) {
                        titlePart = afterNew[1].trim();
                    } else if (titlePart.match(/^链接[：:]/) || titlePart.includes("清晰度专用文档")) {
                        continue; // 跳过无法解析的链接格式
                    }
                }
            }
        }
        
        // 再次检查是否包含无效内容
        if (titlePart.includes("热剧清晰度专用文档") || titlePart.includes("搜索方法")) continue;
        if (titlePart.includes("清晰度专用文档")) continue;
        
        // 跳过分割线
        if (/^-{10,}$/.test(titlePart) || /^=+$/.test(titlePart)) continue;
        if (titlePart.includes("日期分割线") || (titlePart.includes("分割线") && !/[\u4e00-\u9fa5]/.test(titlePart.replace(/分割线/g, "")))) continue;
        
        // 标题处理：如果包含.则取.前面的部分，如果没有.则取括号前面的部分
        let name = titlePart;
        if (name.includes('.')) {
            // 取第一个.之前的部分
            name = name.split('.')[0].trim();
        } else if (name.includes('（') || name.includes('(')) {
            // 取第一个括号之前的部分（中文或英文括号）
            const chineseIndex = name.indexOf('（');
            const englishIndex = name.indexOf('(');
            let splitIndex = -1;
            
            if (chineseIndex !== -1 && englishIndex !== -1) {
                splitIndex = Math.min(chineseIndex, englishIndex);
            } else if (chineseIndex !== -1) {
                splitIndex = chineseIndex;
            } else if (englishIndex !== -1) {
                splitIndex = englishIndex;
            }
            
            if (splitIndex !== -1) {
                name = name.substring(0, splitIndex).trim();
            }
        }
        
        // 往后找夸克链接（到下一个资源或500字符内）
        let blockEnd = content.length;
        if (i < baiduMatches.length - 1) {
            blockEnd = baiduMatches[i + 1].index!;
        }
        const afterBaidu = content.slice(baiduIndex, Math.min(blockEnd, baiduIndex + 500));
        
        // 提取夸克链接 - 先在百度链接之后找
        let quarkMatch = afterBaidu.match(/https?:\/\/pan\.quark\.cn\/s\/[A-Za-z0-9]+/);
        let quarkUrl = quarkMatch ? quarkMatch[0] : null;
        
        // 如果后面没找到，在百度链接之前找（夸克链接可能在百度链接前面）
        if (!quarkUrl) {
            const quarkMatchBefore = beforeBaidu.match(/https?:\/\/pan\.quark\.cn\/s\/[A-Za-z0-9]+/);
            quarkUrl = quarkMatchBefore ? quarkMatchBefore[0] : null;
        }
        
        resources.push({
            title: name,
            baiduUrl,
            quarkUrl
        });
    }
    
    // 去重（基于标题）
    const uniqueResources = new Map<string, { title: string; baiduUrl: string | null; quarkUrl: string | null }>();
    for (const res of resources) {
        const key = res.title.replace(/\s+/g, "");
        if (!uniqueResources.has(key)) {
            uniqueResources.set(key, res);
        }
    }
    
    return Array.from(uniqueResources.values());
}

export const scrapeKDocs = async (url: string): Promise<ScrapedDrama[]> => {
    console.log(`[KDocs] Scraping URL: ${url}`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // 访问页面，等待网络空闲（Playwright会自动设置User-Agent）
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(url, { 
            waitUntil: "networkidle",
            timeout: 60000 
        });
        
        // 等待页面内容加载
        await page.waitForSelector("body", { timeout: 10000 }).catch(() => {});
        
        // 初始等待确保页面开始加载
        await page.waitForTimeout(5000);
        
        console.log("[KDocs] 查找滚动容器并加载所有内容...");
        
        // 查找实际的内容容器并直接获取其内容高度（完全按照 kdocs_video.ts）
        const containerInfo = await page.evaluate(() => {
            // 尝试找到可能的滚动容器
            const selectors = [
                '[class*="editor-container"]',
                '[class*="view-container"]',
                '[class*="document-container"]',
                '[class*="content-container"]',
                '[class*="scroll"]',
                'main',
                'article',
                '.kdocs-view-container',
                '.kdocs-editor-container',
                '[id*="editor"]',
                '[id*="content"]'
            ];
            
            for (const sel of selectors) {
                const elements = document.querySelectorAll(sel);
                for (const el of elements) {
                    if (el.scrollHeight > el.clientHeight && el.scrollHeight > 1000) {
                        return {
                            selector: sel,
                            scrollHeight: el.scrollHeight,
                            clientHeight: el.clientHeight,
                            tagName: el.tagName,
                            className: el.className
                        };
                    }
                }
            }
            return null;
        }) as { selector: string; scrollHeight: number; clientHeight: number; tagName: string; className: string } | null;
        
        let content: string;
        
        if (containerInfo) {
            console.log(`[KDocs] 找到滚动容器: ${containerInfo.tagName}.${containerInfo.className}, 总高度: ${containerInfo.scrollHeight}px`);
            
            // 虚拟滚动策略：逐步滚动并在浏览器端直接提取资源块
            // 使用 Map 在浏览器端去重，key 为标题
            const viewportHeight = containerInfo.clientHeight;
            const totalHeight = containerInfo.scrollHeight;
            const scrollStep = Math.floor(viewportHeight * 1.5); // 每次滚动1.5倍视口高度（虚拟列表通常预渲染更多）
            
            console.log(`[KDocs] 开始逐步滚动收集资源，视口高度: ${viewportHeight}px, 步长: ${scrollStep}px`);
            
            // 在 Node.js 端收集所有文本片段（完全按照 kdocs_video.ts）
            const collectedTexts: string[] = [];
            
            // 先滚动到顶部
            await page.evaluate((selector: string) => {
                const containers = document.querySelectorAll(selector);
                for (const el of containers) {
                    if (el.scrollHeight > el.clientHeight) {
                        el.scrollTop = 0;
                    }
                }
            }, containerInfo.selector);
            await page.waitForTimeout(1000);
            
            let currentScrollTop = 0;
            let scrollCount = 0;
            const maxScrolls = Math.ceil(totalHeight / scrollStep) + 10;
            
            while (scrollCount < maxScrolls) {
                // 获取当前视口的文本
                const currentText = await page.evaluate((selector: string) => {
                    const containers = document.querySelectorAll(selector);
                    for (const el of containers) {
                        if (el.scrollHeight > el.clientHeight) {
                            return (el as HTMLElement).innerText || el.textContent || "";
                        }
                    }
                    return "";
                }, containerInfo.selector);
                
                if (currentText && currentText.length > 100) {
                    collectedTexts.push(currentText);
                }
                
                // 滚动到下一个位置
                currentScrollTop += scrollStep;
                await page.evaluate(({ selector, scrollTop }: { selector: string; scrollTop: number }) => {
                    const containers = document.querySelectorAll(selector);
                    for (const el of containers) {
                        if (el.scrollHeight > el.clientHeight) {
                            el.scrollTop = scrollTop;
                        }
                    }
                }, { selector: containerInfo.selector, scrollTop: currentScrollTop });
                
                await page.waitForTimeout(200);
                
                // 检查是否到达底部
                const actualScrollTop = await page.evaluate((selector: string) => {
                    const containers = document.querySelectorAll(selector);
                    for (const el of containers) {
                        if (el.scrollHeight > el.clientHeight) {
                            return el.scrollTop;
                        }
                    }
                    return 0;
                }, containerInfo.selector) as number;
                
                scrollCount++;
                if (scrollCount % 50 === 0) {
                    console.log(`[KDocs] 滚动进度: ${scrollCount}次, 已滚动: ${actualScrollTop}px / ${totalHeight}px, 已收集: ${collectedTexts.length}段`);
                }
                
                // 如果实际滚动位置不再增加，说明到达底部
                if (actualScrollTop + viewportHeight >= totalHeight - 10) {
                    break;
                }
            }
            
            console.log(`[KDocs] 滚动完成 (${scrollCount}次), 共收集 ${collectedTexts.length} 段文本`);
            
            // 合并所有文本并在 Node.js 端去重（完全按照 kdocs_video.ts）
            const allText = collectedTexts.join("\n");
            
            // 使用百度链接作为资源的标识，进行去重（完全按照 kdocs_video.ts 的逻辑）
            const baiduPattern = /https?:\/\/pan\.baidu\.com\/s\/[A-Za-z0-9_-]+(?:\?pwd=[A-Za-z0-9]+)?/g;
            const baiduMatches = [...allText.matchAll(baiduPattern)];
            
            // 用百度链接去重
            const uniqueBaiduUrls = new Set<string>();
            const uniqueBlocks: string[] = [];
            
            for (let i = 0; i < baiduMatches.length; i++) {
                const baiduMatch = baiduMatches[i];
                const baiduUrl = baiduMatch[0];
                
                // 用百度链接去重
                if (uniqueBaiduUrls.has(baiduUrl)) continue;
                uniqueBaiduUrls.add(baiduUrl);
                
                const baiduIndex = baiduMatch.index!;
                
                // 往前找标题（到上一个百度链接之后，或最多300字符）
                let searchStart = Math.max(0, baiduIndex - 300);
                if (i > 0) {
                    const prevEnd = baiduMatches[i - 1].index! + baiduMatches[i - 1][0].length;
                    searchStart = Math.max(searchStart, prevEnd);
                }
                
                const beforeBaidu = allText.slice(searchStart, baiduIndex);
                
                // 找标题开始（从最后一个夸克链接或提取码之后的中文字符开始，跳过分割线）
                let titleStart = 0;
                const lastQuark = beforeBaidu.lastIndexOf("pan.quark.cn");
                const lastExtract = beforeBaidu.lastIndexOf("提取码");
                const skipAfter = Math.max(lastQuark > 0 ? lastQuark + 20 : 0, lastExtract > 0 ? lastExtract + 10 : 0);
                if (skipAfter > 0) titleStart = skipAfter;
                
                // 按行查找，跳过分割线行（与 parseContent 函数保持一致）
                const lines = beforeBaidu.slice(titleStart).split('\n');
                let foundTitleStart = false;
                let lineOffset = 0;
                
                for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
                    const line = lines[lineIdx].trim();
                    // 跳过空行和分割线
                    if (!line || line.length === 0) continue;
                    if (/-+日期分割线-+/.test(line)) continue;
                    if (/^-{10,}$/.test(line)) continue;
                    if (/^={10,}$/.test(line)) continue;
                    
                    // 找到包含中文或图标的行
                    const titleMatch = line.match(/[🔝🔥⭐️✨💎🎬📺\u4e00-\u9fa5]/);
                    if (titleMatch && titleMatch.index !== undefined) {
                        // 计算在原始文本中的位置
                        for (let i = 0; i < lineIdx; i++) {
                            lineOffset += lines[i].length + 1; // +1 for newline
                        }
                        titleStart += lineOffset + titleMatch.index;
                        foundTitleStart = true;
                        break;
                    }
                }
                
                // 如果没找到，使用原始方法
                if (!foundTitleStart) {
                    const titleSearchText = beforeBaidu.slice(titleStart);
                    const fallbackMatch = titleSearchText.match(/[🔝🔥⭐️✨💎🎬📺\u4e00-\u9fa5]/);
                    if (fallbackMatch && fallbackMatch.index !== undefined) {
                        titleStart += fallbackMatch.index;
                    }
                }
                
                // 提取标题
                let title = beforeBaidu.slice(titleStart).replace(/百度链接\s*[：:]\s*$/, "").trim();
                title = title.replace(/^[🔝🔥⭐️✨💎🎬📺]+\s*/, "").trim();
                
                // 移除分割线
                title = title.replace(/-+日期分割线-+/g, "").trim();
                title = title.replace(/^-{10,}$/gm, "").trim();
                title = title.replace(/^={10,}$/gm, "").trim();
                
                // 跳过无效标题（包括分割线）
                if (!title || title.length < 2) continue;
                if (!/[\u4e00-\u9fa5]/.test(title)) continue;
                // 跳过分割线
                if (/^-{10,}$/.test(title) || /^=+$/.test(title)) continue;
                if (title.includes("日期分割线") || (title.includes("分割线") && !/[\u4e00-\u9fa5]/.test(title.replace(/分割线/g, "")))) continue;
                
                // 处理 "链接：xxx" 格式，提取实际标题
                if (title.match(/^链接[：:]/) || title.includes("清晰度专用文档")) {
                    // 1. 先尝试提取最后一个分割线后面的内容
                    const afterSeparator = title.match(/-{3,}\s*([^-]+)$/);
                    if (afterSeparator && afterSeparator[1] && afterSeparator[1].trim().length > 1) {
                        title = afterSeparator[1].trim();
                    } else {
                        // 2. 尝试提取🔝后面的内容
                        const afterIcon = title.match(/🔝(.+)$/);
                        if (afterIcon && afterIcon[1]) {
                            title = afterIcon[1].trim();
                        } else {
                            // 3. 尝试提取 (NEW) 后面的内容
                            const afterNew = title.match(/\(NEW\)\s*(.+)$/i);
                            if (afterNew && afterNew[1]) {
                                title = afterNew[1].trim();
                            } else if (title.match(/^链接[：:]/) || title.includes("清晰度专用文档")) {
                                continue; // 跳过无法解析的链接格式
                            }
                        }
                    }
                }
                
                // 再次检查是否包含无效内容
                if (title.includes("热剧清晰度") || title.includes("搜索方法")) continue;
                if (title.includes("清晰度专用文档")) continue;
                
                // 标题处理：如果包含.则取.前面的部分，如果没有.则取括号前面的部分
                if (title.includes('.')) {
                    // 取第一个.之前的部分
                    title = title.split('.')[0].trim();
                } else if (title.includes('（') || title.includes('(')) {
                    // 取第一个括号之前的部分（中文或英文括号）
                    const chineseIndex = title.indexOf('（');
                    const englishIndex = title.indexOf('(');
                    let splitIndex = -1;
                    
                    if (chineseIndex !== -1 && englishIndex !== -1) {
                        splitIndex = Math.min(chineseIndex, englishIndex);
                    } else if (chineseIndex !== -1) {
                        splitIndex = chineseIndex;
                    } else if (englishIndex !== -1) {
                        splitIndex = englishIndex;
                    }
                    
                    if (splitIndex !== -1) {
                        title = title.substring(0, splitIndex).trim();
                    }
                }
                
                // 往后找夸克链接（到下一个资源或500字符内）
                let blockEnd = allText.length;
                if (i < baiduMatches.length - 1) {
                    blockEnd = baiduMatches[i + 1].index!;
                }
                const afterBaidu = allText.slice(baiduIndex, Math.min(blockEnd, baiduIndex + 500));
                
                // 提取夸克链接 - 先在百度链接之后找
                let quarkMatch = afterBaidu.match(/https?:\/\/pan\.quark\.cn\/s\/[A-Za-z0-9]+/);
                let quarkUrl = quarkMatch ? quarkMatch[0] : null;
                
                // 如果后面没找到，在百度链接之前找（夸克链接可能在百度链接前面）
                if (!quarkUrl) {
                    const quarkMatchBefore = beforeBaidu.match(/https?:\/\/pan\.quark\.cn\/s\/[A-Za-z0-9]+/);
                    quarkUrl = quarkMatchBefore ? quarkMatchBefore[0] : null;
                }
                
                // 组合完整资源块
                uniqueBlocks.push(JSON.stringify({ title, baiduUrl, quarkUrl }));
            }
            
            console.log(`[KDocs] 去重后共 ${uniqueBlocks.length} 个唯一资源`);
            
            // 解析 JSON 格式的资源块
            const parsedResources: Array<{ title: string; baiduUrl: string | null; quarkUrl: string | null }> = [];
            for (const block of uniqueBlocks) {
                try {
                    const parsed = JSON.parse(block);
                    parsedResources.push(parsed);
                } catch {
                    // 忽略解析失败的块
                }
            }
            
            // 直接返回解析后的结果
            const results: ScrapedDrama[] = parsedResources
                .filter(res => res.baiduUrl || res.quarkUrl)
                .map(res => ({
                    title: res.title,
                    download_link: res.baiduUrl || res.quarkUrl || "",
                    baiduUrl: res.baiduUrl || undefined,
                    quarkUrl: res.quarkUrl || undefined
                }));
            
            console.log(`[KDocs] Found ${results.length} items`);
            await browser.close();
            return results;
        } else {
            console.log("[KDocs] 未找到滚动容器，使用默认方式");
            // 额外等待确保所有内容都已渲染
            await page.waitForTimeout(3000);
            
            // 获取页面文本内容，使用更全面的策略（完全按照 kdocs_video.ts）
            content = await page.evaluate(() => {
                // 移除script和style标签
                const scripts = document.querySelectorAll('script, style, noscript');
                scripts.forEach(el => el.remove());
                
                // 尝试多个可能的内容容器
                const selectors = [
                    ".kdocs-document",
                    ".kdocs-view-container",
                    ".kdocs-editor-container",
                    ".kdocs-content",
                    "[class*='document']",
                    "[class*='content']",
                    "[class*='editor']",
                    "main",
                    "article",
                    "#app",
                    ".app",
                ];
                
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) {
                        const text = el.textContent || (el as HTMLElement).innerText || "";
                        // 如果文本内容足够长（>500字符），且有中文内容，认为找到了主要内容
                        if (text.length > 500 && /[\u4e00-\u9fa5]/.test(text)) {
                            return text;
                        }
                    }
                }
                
                // 如果都找不到，尝试从body获取，但过滤掉明显的CSS和JS
                const bodyText = document.body.innerText || document.body.textContent || "";
                if (bodyText.length > 500 && /[\u4e00-\u9fa5]/.test(bodyText)) {
                    return bodyText;
                }
                
                return "";
            }) as string;
        }

        if (!content || content.length < 100) {
            console.log(`[KDocs] 无法获取内容，内容长度: ${content?.length || 0}`);
            return [];
        }

        console.log(`[KDocs] 获取到内容长度 ${content.length}，开始解析...`);
        const resources = parseContent(content);
        
        if (resources.length === 0) {
            console.log(`[KDocs] 解析后未找到资源，内容前500字符: ${content.substring(0, 500)}`);
        }

        // Convert to ScrapedDrama format
        const results: ScrapedDrama[] = resources
            .filter(res => res.baiduUrl || res.quarkUrl) // Only include items with at least one link
            .map(res => ({
                title: res.title,
                download_link: res.baiduUrl || res.quarkUrl || "", // Prefer Baidu, fallback to Quark
                baiduUrl: res.baiduUrl || undefined,
                quarkUrl: res.quarkUrl || undefined
            }));

        console.log(`[KDocs] Found ${results.length} items`);
        return results;

    } catch (error) {
        console.error('[KDocs] Error scraping:', error);
        return [];
    } finally {
        await browser.close();
    }
};

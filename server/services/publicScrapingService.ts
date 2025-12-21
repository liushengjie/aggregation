import { chromium } from 'playwright';
import { publicItemOps } from './database';
import { WEIBO_SCRIPT, BILIBILI_SCRIPT, XIAOHONGSHU_SCRIPT } from './globalFocusService';

type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu' | 'Douyin';

interface ScrapedItem {
  externalId: string;
  title: string;
  author: string;
  thumbnail: string;
  url: string;
  content?: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  tags: string[];
}

// Platform configuration for public scraping
const PUBLIC_SCRAPING_CONFIG: Record<Platform, {
  urls: Array<{ url: string; label: string }>;
  script: string;
}> = {
  Weibo: {
    urls: [
      { url: 'https://weibo.com/', label: '热门推荐' },
    ],
    script: WEIBO_SCRIPT,
  },
  Bilibili: {
    urls: [
      { url: 'https://www.bilibili.com/v/popular/all?spm_id_from=333.1007.0.0', label: '综合热门' },
      { url: 'https://www.bilibili.com/v/popular/weekly?num=352', label: '每周必看' },
      { url: 'https://www.bilibili.com/v/popular/rank/all', label: '排行榜' },
    ],
    script: BILIBILI_SCRIPT,
  },
  Xiaohongshu: {
    urls: [
      { url: 'https://www.xiaohongshu.com/explore', label: '推荐页' },
    ],
    script: XIAOHONGSHU_SCRIPT,
  },
  Douyin: {
    urls: [
      { url: 'https://www.douyin.com/jingxuan', label: '精选' },
    ],
    script: `(function() {
  var results = [];
  var elements = document.querySelectorAll('[class*="video-card"], [class*="feed-item"], .feed-video-item, [data-e2e*="video"]');
  if (elements.length === 0) {
    elements = document.querySelectorAll('div[class*="VideoItem"], section[class*="video"]');
  }
  for (var i = 0; i < elements.length && i < 30; i++) {
    var el = elements[i];
    var titleEl = el.querySelector('[class*="title"], [class*="desc"], [data-e2e*="title"], [data-e2e*="desc"], p, span[class*="text"]');
    if (!titleEl) {
      var textElements = el.querySelectorAll('p, span, div[class*="text"], div[class*="desc"]');
      for (var j = 0; j < textElements.length; j++) {
        var text = textElements[j].textContent.trim();
        if (text.length > 10 && text.length < 200) {
          titleEl = textElements[j];
          break;
        }
      }
    }
    var authorEl = el.querySelector('[class*="author"], [class*="username"], [data-e2e*="author"], [data-e2e*="username"], a[href*="/user/"]');
    if (!authorEl) {
      var allSpans = el.querySelectorAll('span, a');
      for (var k = 0; k < allSpans.length; k++) {
        var text = allSpans[k].textContent || '';
        if (text.includes('@') && text.length > 2 && text.length < 50) {
          authorEl = allSpans[k];
          break;
        }
      }
      if (!authorEl) {
        authorEl = el.querySelector('.author-name, .user-name, .nickname, span[class*="name"]');
      }
    }
    var thumbnail = '';
    var coverEl = el.querySelector('img:not([class*="avatar"]), [class*="cover"] img, [class*="poster"] img, [class*="picture"] img');
    if (coverEl) {
      thumbnail = coverEl.getAttribute('src') || coverEl.getAttribute('data-src') || coverEl.getAttribute('data-lazy-src') || coverEl.getAttribute('data-original') || coverEl.getAttribute('data-src-webp') || '';
    }
    var linkEl = el.querySelector('a[href*="/video/"], a[href*="/user/"]');
    if (!linkEl) {
      var parentLink = el.closest('a[href*="/video/"]');
      if (parentLink) linkEl = parentLink;
    }
    var likeEl = el.querySelector('[class*="like"], [data-e2e*="like"], .digg-count, .like-count');
    if (!likeEl) {
      var numElements = el.querySelectorAll('span, div');
      for (var k = 0; k < numElements.length; k++) {
        var text = numElements[k].textContent || '';
        if ((text.includes('万') || /^[\\d.]+[万wkK]?$/.test(text.trim())) && text.length < 20) {
          likeEl = numElements[k];
          break;
        }
      }
    }
    var commentEl = el.querySelector('[class*="comment"], [data-e2e*="comment"], .comment-count');
    var shareEl = el.querySelector('[class*="share"], [data-e2e*="share"], .share-count');
    var title = titleEl ? titleEl.textContent.trim().slice(0, 200) : '';
    if (title.length === 0) continue;
    var extractNum = function(text) {
      if (!text) return 0;
      var textStr = text.toString().trim();
      var match = textStr.match(/([\\d.]+)/);
      if (!match) return 0;
      var num = parseFloat(match[1]);
      if (textStr.indexOf('万') !== -1 || textStr.indexOf('w') !== -1) num *= 10000;
      if (textStr.indexOf('k') !== -1 || textStr.indexOf('K') !== -1) num *= 1000;
      return Math.floor(num);
    };
    var externalId = 'douyin-' + Date.now() + '-' + i;
    if (linkEl) {
      var href = linkEl.href || linkEl.getAttribute('href') || '';
      var videoMatch = href.match(/\\/video\\/(\\d+)/) || href.match(/video_id=([\\d]+)/);
      if (videoMatch && videoMatch[1]) {
        externalId = videoMatch[1];
      }
    }
    if (thumbnail) {
      if (thumbnail.startsWith('//')) {
        thumbnail = 'https:' + thumbnail;
      } else if (thumbnail.startsWith('/')) {
        thumbnail = 'https://www.douyin.com' + thumbnail;
      }
    }
    results.push({
      externalId: externalId,
      title: title,
      author: authorEl ? authorEl.textContent.trim() : '抖音用户',
      thumbnail: thumbnail,
      url: linkEl && (linkEl.href || linkEl.getAttribute('href')) ? (linkEl.href || linkEl.getAttribute('href')) : 'https://www.douyin.com/video/' + externalId,
      likes: extractNum(likeEl ? likeEl.textContent : ''),
      comments: extractNum(commentEl ? commentEl.textContent : ''),
      shares: extractNum(shareEl ? shareEl.textContent : ''),
      views: 0,
      tags: ['抖音']
    });
  }
  return results;
})()`,
  },
};

/**
 * Scrape public content from a platform (no login required)
 */
export async function scrapePublicContent(
  platform: Platform,
  sourceUrl: string,
  sourceLabel: string,
  script: string
): Promise<{ success: boolean; itemCount: number; error?: string }> {
  let browser = null;

  try {
    console.log(`[Public Scraping] Starting ${platform} - ${sourceLabel} from ${sourceUrl}`);

    // Launch browser with additional args to avoid detection and errors
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--allow-running-insecure-content',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true,
      // Allow third-party cookies for visitor verification
      acceptDownloads: false,
    });
    
    // Block resources that might cause issues (like ads, trackers)
    await context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}', (route) => {
      // Allow images and fonts
      route.continue();
    });

    const page = await context.newPage();

    // Set headers to avoid blocking
    await page.setExtraHTTPHeaders({
      'Referer': sourceUrl,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    
    let navigationSuccess = false;
    try {
      const response = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      if (response) {
        navigationSuccess = response.ok();
      }
    } catch (err: any) {
      console.error(`[Public Scraping] ${platform} navigation error:`, err.message);
      const currentUrl = page.url();
      if (currentUrl.startsWith('chrome-error://') || currentUrl.startsWith('about:')) {
        return { success: false, itemCount: 0, error: `Navigation failed: ${err.message}` };
      }
    }
    
    // Verify we're on the correct page
    let finalUrl = page.url();
    
    // Handle Weibo visitor verification redirect
    if (finalUrl.includes('passport.weibo.com/visitor/visitor')) {
      try {
        // Wait for redirect with shorter timeout and fallback
        const redirectPromise = page.waitForURL(/weibo\.com/, { timeout: 15000, waitUntil: 'domcontentloaded' });
        const timeoutPromise = page.waitForTimeout(10000); // Max wait 10 seconds
        
        await Promise.race([redirectPromise, timeoutPromise]).catch(() => {
          // If both fail, check current URL anyway
        });
        
        finalUrl = page.url();
        
        // Check if we got a chrome-error page (navigation failed)
        if (finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:')) {
          console.warn(`[Public Scraping] Weibo: Navigation failed after visitor verification, retrying direct navigation...`);
          // Try to navigate directly to the target URL
          try {
            const targetUrl = 'https://weibo.com/hot/search';
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            finalUrl = page.url();
          } catch (retryErr: any) {
            console.error(`[Public Scraping] Weibo: Retry navigation failed: ${retryErr.message}`);
            return { success: false, itemCount: 0, error: `Navigation failed after visitor verification: ${finalUrl}` };
          }
        }
      } catch (waitErr: any) {
        console.warn(`[Public Scraping] Visitor verification wait error: ${waitErr.message}, proceeding...`);
        finalUrl = page.url();
        
        // If we got an error page, try retry
        if (finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:')) {
          console.warn(`[Public Scraping] Weibo: Got error page, skipping this URL`);
          return { success: false, itemCount: 0, error: `Navigation failed: ${waitErr.message}` };
        }
      }
    }
    
    // Check for error pages - if Weibo hot list fails, try alternative URL
    if ((finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:'))) {
      if (platform === 'Weibo' && sourceLabel === '热门榜单') {
        console.warn(`[Public Scraping] Weibo hot list navigation failed, trying alternative URL...`);
        try {
          // Try alternative URL: hot search page
          const altUrl = 'https://s.weibo.com/top/summary';
          await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          finalUrl = page.url();
          console.log(`[Public Scraping] Weibo: Alternative navigation to ${altUrl}, got: ${finalUrl.substring(0, 100)}`);
          
          // Wait a bit for content
          await page.waitForTimeout(3000);
          
          // If still error, fail
          if (finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:')) {
            return { success: false, itemCount: 0, error: `Both navigation attempts failed` };
          }
        } catch (altErr: any) {
          return { success: false, itemCount: 0, error: `Navigation failed: ${altErr.message}` };
        }
      } else {
        return { success: false, itemCount: 0, error: `Page navigation failed: ${finalUrl}` };
      }
    }
    
    // Wait for content to load
    try {
      // Wait for body to be ready
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      // Silent fail
    }
    
    // Wait a bit for initial content to render
    await page.waitForTimeout(5000);
    
    // For Weibo, scroll to load more content
    if (platform === 'Weibo') {
      try {
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Scrolling to load more content...`);
        // Scroll multiple times to trigger lazy loading
        for (let scrollIdx = 0; scrollIdx < 10; scrollIdx++) {
          await page.evaluate((idx) => {
            window.scrollTo(0, window.innerHeight * (idx + 1));
          }, scrollIdx);
          await page.waitForTimeout(600); // Wait 600ms between scrolls
        }
        // Scroll back to top
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(2000);
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Finished scrolling`);
      } catch (e: any) {
        console.warn(`[Public Scraping] ${platform} - ${sourceLabel}: Error during scrolling (${e.message}), continuing...`);
      }
    }
    
    // For Weibo, add extra wait if on visitor page
    if (platform === 'Weibo' && finalUrl.includes('passport.weibo.com/visitor')) {
      await page.waitForTimeout(3000);
      // Try to click through or wait for content
      try {
        // Check if there's a continue button or similar
        const continueBtn = await page.$('button, a[class*="btn"], a[class*="button"]');
        if (continueBtn) {
          await continueBtn.click().catch(() => {});
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // Ignore errors
      }
    }

    // For Bilibili, wait for video cards to load and images to appear
    if (platform === 'Bilibili') {
      try {
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Waiting for video cards...`);
        try {
          await page.waitForSelector('.bili-video-card, .video-card, .feed-card', { timeout: 15000 });
          console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Video cards found`);
        } catch (e: any) {
          console.warn(`[Public Scraping] ${platform} - ${sourceLabel}: Video cards not found (${e.message}), continuing anyway...`);
          // Continue anyway
        }
        
        // For weekly page, need more time and scrolling to load images
        const isWeeklyPage = sourceLabel.includes('每周必看');
        const scrollCount = isWeeklyPage ? 5 : 3;
        const waitTime = isWeeklyPage ? 3000 : 2000;
        
        // Wait initial time for lazy-loaded images
        await page.waitForTimeout(3000);
        
        // Scroll multiple times to trigger lazy loading (especially for weekly page)
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Scrolling ${scrollCount} times to load images...`);
        for (let scrollIdx = 0; scrollIdx < scrollCount; scrollIdx++) {
          await page.evaluate((idx) => {
            window.scrollTo(0, window.innerHeight * (idx + 1));
          }, scrollIdx);
          await page.waitForTimeout(waitTime);
        }
        
        // Scroll back to top
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(2000);
        
        // Wait for at least some images with Bilibili domain to be present (in data attributes or src)
        try {
          await page.waitForFunction(
            () => {
              // Check for images with Bilibili domains in data-src, data-lazy-src, or src attributes
              const imgs = document.querySelectorAll(
                'img[data-src*="hdslb.com"], ' +
                'img[data-src*="biliimg.com"], ' +
                'img[data-src*="bilicdn.com"], ' +
                'img[data-lazy-src*="hdslb.com"], ' +
                'img[data-lazy-src*="biliimg.com"], ' +
                'img[src*="hdslb.com"], ' +
                'img[src*="biliimg.com"], ' +
                'img[src*="bilicdn.com"]'
              );
              return imgs.length > 0;
            },
            { timeout: isWeeklyPage ? 10000 : 7000 }
          ).catch(() => {
            console.log(`[Public Scraping] ${platform} - ${sourceLabel}: No Bilibili images found within timeout, continuing anyway`);
          });
        } catch (e: any) {
          console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Error waiting for images: ${e.message}, continuing...`);
        }
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Finished waiting for images`);
      } catch (e: any) {
        console.warn(`[Public Scraping] ${platform} - ${sourceLabel}: Error during image loading (${e.message}), continuing...`);
        // Continue even if video cards not found
      }
    }

    // Check if script is defined
    if (!script || script.trim() === '') {
      console.error(`[Public Scraping] No script provided for ${platform}`);
      return { success: false, itemCount: 0, error: 'No scraping script provided' };
    }

    // Scrape content using platform-specific script
    console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Starting script execution...`);
    let items: ScrapedItem[] = [];
    try {
      // Add timeout wrapper for script execution (2 minutes max)
      const scriptPromise = page.evaluate(script);
      const scriptTimeoutPromise = new Promise<ScrapedItem[]>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Script execution timeout (2 minutes)'));
        }, 2 * 60 * 1000); // 2 minutes timeout for script execution
      });

      items = await Promise.race([scriptPromise, scriptTimeoutPromise]) as ScrapedItem[];
      console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Script executed, found ${items?.length || 0} items`);
    } catch (err: any) {
      console.error(`[Public Scraping] Error executing script for ${platform} - ${sourceLabel}:`, err.message);
      console.error(`[Public Scraping] Script error stack:`, err.stack);
      return { success: false, itemCount: 0, error: `Script execution error: ${err.message}` };
    }

    // Filter and validate items
    const validItems = items?.filter(item => item && item.title && item.externalId) || [];

    // Save items to public_social_items table
    let savedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const item of validItems) {
      try {
        // Filter out data URI placeholders from thumbnail
        let thumbnail = item.thumbnail || '';
        if (thumbnail && (thumbnail.startsWith('data:') || thumbnail.trim().length === 0)) {
          thumbnail = '';
        }
        
        const tagsJson = JSON.stringify(item.tags || []);
        publicItemOps.upsert.run(
          platform,
          sourceUrl,
          sourceLabel,
          item.externalId,
          item.title,
          item.author || '',
          thumbnail,
          item.url || '',
          item.content || '',
          item.likes || 0,
          item.comments || 0,
          item.shares || 0,
          item.views || 0,
          tagsJson
        );
        savedCount++;
      } catch (err: any) {
        // Skip duplicates (UNIQUE constraint violation)
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`[Public Scraping] Error saving item (${item.externalId}):`, err.message);
        }
      }
    }

    if (savedCount > 0) {
      console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Saved ${savedCount} items${duplicateCount > 0 ? `, ${duplicateCount} duplicates` : ''}${errorCount > 0 ? `, ${errorCount} errors` : ''}`);
    }

    return { success: true, itemCount: savedCount };
  } catch (error: any) {
    console.error(`[Public Scraping] Error scraping ${platform} - ${sourceLabel}:`, error);
    return { success: false, itemCount: 0, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Scrape all public content for a platform
 */
export async function scrapePlatformPublicContent(platform: Platform): Promise<{ success: boolean; totalItems: number; error?: string }> {
  const config = PUBLIC_SCRAPING_CONFIG[platform];
  if (!config) {
    return { success: false, totalItems: 0, error: 'Unknown platform' };
  }

  let totalItems = 0;
  const errors: string[] = [];

  try {
    for (const { url, label } of config.urls) {
      try {
        // Add timeout wrapper for each source scraping (5 minutes max per source)
        const scrapingPromise = scrapePublicContent(platform, url, label, config.script);
        const timeoutPromise = new Promise<{ success: boolean; itemCount: number; error?: string }>((resolve) => {
          setTimeout(() => {
            resolve({ success: false, itemCount: 0, error: 'Scraping timeout (5 minutes)' });
          }, 5 * 60 * 1000); // 5 minutes timeout
        });

        const result = await Promise.race([scrapingPromise, timeoutPromise]);

        if (result.success) {
          totalItems += result.itemCount;
          console.log(`[Public Scraping] ${platform} - ${label}: Successfully scraped ${result.itemCount} items`);
        } else {
          errors.push(`${label}: ${result.error}`);
          console.error(`[Public Scraping] ${platform} - ${label}: Failed - ${result.error}`);
        }
      } catch (err: any) {
        const errorMsg = err.message || 'Unknown error';
        errors.push(`${label}: ${errorMsg}`);
        console.error(`[Public Scraping] ${platform} - ${label}: Exception - ${errorMsg}`);
      }

      // Add delay between different sources
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err: any) {
    console.error(`[Public Scraping] ${platform}: Fatal error - ${err.message}`);
    return {
      success: false,
      totalItems,
      error: `Fatal error: ${err.message}`,
    };
  }

  return {
    success: errors.length === 0,
    totalItems,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Scrape all platforms' public content
 */
export async function scrapeAllPlatformsPublicContent(): Promise<{ success: boolean; results: Record<Platform, { totalItems: number; error?: string }> }> {
  const platforms: Platform[] = ['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'];
  const results: Record<Platform, { totalItems: number; error?: string }> = {} as any;

  for (const platform of platforms) {
    console.log(`[Public Scraping] Starting ${platform}...`);
    try {
      // Add timeout wrapper for each platform (10 minutes max per platform)
      const platformPromise = scrapePlatformPublicContent(platform);
      const timeoutPromise = new Promise<{ success: boolean; totalItems: number; error?: string }>((resolve) => {
        setTimeout(() => {
          resolve({ success: false, totalItems: 0, error: 'Platform scraping timeout (10 minutes)' });
        }, 10 * 60 * 1000); // 10 minutes timeout
      });

      const result = await Promise.race([platformPromise, timeoutPromise]);
      
      results[platform] = {
        totalItems: result.totalItems,
        error: result.error,
      };
      
      if (result.error) {
        console.error(`[Public Scraping] ${platform} completed with errors: ${result.error}`);
      } else {
        console.log(`[Public Scraping] ${platform} completed: ${result.totalItems} items`);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown error';
      console.error(`[Public Scraping] ${platform} fatal error: ${errorMsg}`);
      results[platform] = {
        totalItems: 0,
        error: `Fatal error: ${errorMsg}`,
      };
    }
    
    // Add delay between platforms
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const allSuccess = Object.values(results).every(r => !r.error);
  console.log(`[Public Scraping] All platforms completed. Success: ${allSuccess}`);
  return {
    success: allSuccess,
    results,
  };
}


import { chromium, Cookie, Page } from 'playwright';
import { itemOps, accountOps } from './database';

type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu';

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

// Platform configuration
const PLATFORM_CONFIG: Record<Platform, {
  homeUrl: string;
}> = {
  Weibo: {
    homeUrl: 'https://weibo.com',
  },
  Bilibili: {
    homeUrl: 'https://www.bilibili.com',
  },
  Xiaohongshu: {
    homeUrl: 'https://www.xiaohongshu.com/explore',
  },
};

// Scraping scripts as plain strings to avoid esbuild __name injection
const BILIBILI_SCRIPT = `
(function() {
  var results = [];
  var elements = document.querySelectorAll('.bili-video-card, .video-card, .feed-card, .recommended-card');
  
  for (var i = 0; i < elements.length && i < 100; i++) {
    var el = elements[i];
    var titleEl = el.querySelector('.bili-video-card__info--tit, .title, a[title], [class*="title"]');
    var authorEl = el.querySelector('.bili-video-card__info--author, .up-name, .name, [class*="author"]');
    var linkEl = el.querySelector('a[href*="/video/"]');
    var viewEl = el.querySelector('.bili-video-card__stats--item, .play-text, [class*="view"], [class*="play"]');
    
    // Better image extraction - check multiple sources
    var thumbnail = '';
    var coverEl = el.querySelector('.bili-video-card__cover img, .v-img img, .cover img, picture img, img');
    if (coverEl) {
      thumbnail = coverEl.getAttribute('src') || 
                  coverEl.getAttribute('data-src') || 
                  coverEl.getAttribute('data-lazy') ||
                  '';
      // Handle //xxx format URLs
      if (thumbnail && thumbnail.startsWith('//')) {
        thumbnail = 'https:' + thumbnail;
      }
    }
    // Also try to get from picture source
    if (!thumbnail) {
      var sourceEl = el.querySelector('picture source');
      if (sourceEl) {
        thumbnail = sourceEl.getAttribute('srcset') || '';
        if (thumbnail && thumbnail.startsWith('//')) {
          thumbnail = 'https:' + thumbnail;
        }
      }
    }
    
    // Get title - prioritize the link's title attribute which is more reliable
    var title = '';
    // First try the link with title attribute
    var titleLink = el.querySelector('a[title]');
    if (titleLink && titleLink.getAttribute('title')) {
      title = titleLink.getAttribute('title').trim();
    }
    // Then try specific title class
    if (!title) {
      var specificTitle = el.querySelector('.bili-video-card__info--tit a, .bili-video-card__info--tit span');
      if (specificTitle && specificTitle.textContent) {
        title = specificTitle.textContent.trim();
      }
    }
    // Skip if title is empty or is a button text
    title = title.slice(0, 200);
    if (title.length === 0 || title === '不感兴趣' || title.length < 3) continue;
    
    var viewText = viewEl ? viewEl.textContent : '';
    var views = 0;
    if (viewText) {
      var match = viewText.match(/([\\d.]+)/);
      if (match) {
        views = parseFloat(match[1]);
        if (viewText.indexOf('万') !== -1) views *= 10000;
        views = Math.floor(views);
      }
    }
    
    var externalId = 'bilibili-' + Date.now() + '-' + i;
    if (linkEl && linkEl.href) {
      var videoMatch = linkEl.href.match(/\\/video\\/(BV\\w+)/);
      if (videoMatch) externalId = videoMatch[1];
    }
    
    results.push({
      externalId: externalId,
      title: title,
      author: authorEl ? authorEl.textContent.trim() : '未知UP主',
      thumbnail: thumbnail,
      url: linkEl ? linkEl.href : 'https://www.bilibili.com',
      likes: 0,
      comments: 0,
      shares: 0,
      views: views,
      tags: ['B站']
    });
  }
  
  return results;
})()
`;

const WEIBO_SCRIPT = `
(function() {
  var results = [];
  var elements = document.querySelectorAll('.Feed_wrap_3NP5t, .WB_card, .woo-panel-main');
  
  for (var i = 0; i < elements.length && i < 100; i++) {
    var el = elements[i];
    var titleEl = el.querySelector('.woo-lg-cut-2, .WB_text, .detail_wbtext_4CRf9, [class*="text"]');
    var authorEl = el.querySelector('.head_name_24eEB, .WB_info a, [class*="head_name"]');
    var avatarEl = el.querySelector('.woo-avatar-img, .WB_face img, [class*="avatar"] img');
    var linkEl = el.querySelector('a[href*="/status/"], a[href*="weibo.com"]');
    
    var likeEl = el.querySelector('[title*="赞"], .WB_like, [class*="like"]');
    var commentEl = el.querySelector('[title*="评论"], .WB_comment, [class*="comment"]');
    var shareEl = el.querySelector('[title*="转发"], .WB_forward, [class*="repost"]');
    
    var title = titleEl ? titleEl.textContent.trim().slice(0, 200) : '';
    if (title.length === 0) continue;
    
    var extractNum = function(text) {
      if (!text) return 0;
      var match = text.match(/\\d+/);
      return match ? parseInt(match[0]) : 0;
    };
    
    var externalId = 'weibo-' + Date.now() + '-' + i;
    if (linkEl && linkEl.href) {
      var statusMatch = linkEl.href.match(/\\/status\\/(\\d+)/);
      if (statusMatch) externalId = statusMatch[1];
    }
    
    results.push({
      externalId: externalId,
      title: title,
      author: authorEl ? authorEl.textContent.trim() : '未知用户',
      thumbnail: avatarEl ? avatarEl.src : '',
      url: linkEl ? linkEl.href : 'https://weibo.com',
      likes: extractNum(likeEl ? likeEl.textContent : ''),
      comments: extractNum(commentEl ? commentEl.textContent : ''),
      shares: extractNum(shareEl ? shareEl.textContent : ''),
      views: 0,
      tags: ['微博']
    });
  }
  
  return results;
})()
`;

const XIAOHONGSHU_SCRIPT = `
(function() {
  var results = [];
  var elements = document.querySelectorAll('section[class*="note"], .note-item, [class*="feed"] section');
  
  for (var i = 0; i < elements.length && i < 100; i++) {
    var el = elements[i];
    var titleEl = el.querySelector('.title, .note-title, [class*="title"], .desc');
    var authorEl = el.querySelector('.name, .author-name, [class*="name"], .nickname');
    var coverEl = el.querySelector('img');
    var linkEl = el.querySelector('a[href*="/explore/"], a[href*="/discovery/"]');
    var likeEl = el.querySelector('.like-count, .like-wrapper span, [class*="like"] span, .count');
    
    var title = titleEl ? titleEl.textContent.trim().slice(0, 200) : '';
    if (title.length === 0) continue;
    
    var likes = 0;
    if (likeEl && likeEl.textContent) {
      var match = likeEl.textContent.match(/([\\d.]+)/);
      if (match) {
        likes = parseFloat(match[1]);
        if (likeEl.textContent.indexOf('万') !== -1) likes *= 10000;
        likes = Math.floor(likes);
      }
    }
    
    var externalId = 'xhs-' + Date.now() + '-' + i;
    if (linkEl && linkEl.href) {
      var exploreMatch = linkEl.href.match(/\\/explore\\/(\\w+)/);
      if (exploreMatch) externalId = exploreMatch[1];
    }
    
    results.push({
      externalId: externalId,
      title: title,
      author: authorEl ? authorEl.textContent.trim() : '小红书用户',
      thumbnail: coverEl ? coverEl.src : '',
      url: externalId.startsWith('xhs-') ? (linkEl ? linkEl.href : 'https://www.xiaohongshu.com') : 'https://www.xiaohongshu.com/explore/' + externalId,
      likes: likes,
      comments: 0,
      shares: 0,
      views: 0,
      tags: ['小红书']
    });
  }
  
  return results;
})()
`;

/**
 * Sync content from a platform account
 */
export async function syncPlatformContent(
  accountId: number,
  platform: Platform,
  cookiesJson: string
): Promise<{ success: boolean; itemCount: number; error?: string }> {
  let browser = null;

  try {
    console.log(`Starting sync for ${platform}...`);

    // Parse cookies
    let cookies: Cookie[];
    try {
      cookies = JSON.parse(cookiesJson);
    } catch {
      return { success: false, itemCount: 0, error: 'Invalid cookie format' };
    }

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    // Set cookies
    await context.addCookies(cookies);

    const page = await context.newPage();
    const config = PLATFORM_CONFIG[platform];

    // Navigate to home page (30 minute timeout)
    await page.goto(config.homeUrl, { waitUntil: 'domcontentloaded', timeout: 1800000 });
    await page.waitForTimeout(5000);

    // Scroll to load more content (30 times for ~100 items)
    console.log(`[${platform}] Starting to scroll and load content...`);
    for (let i = 0; i < 30; i++) {
      await page.evaluate('window.scrollBy(0, window.innerHeight * 2)');
      await page.waitForTimeout(2000); // Wait longer for content to load
      if (i % 10 === 9) {
        console.log(`[${platform}] Scrolled ${i + 1} times...`);
      }
    }
    // Extra wait for final content to render
    await page.waitForTimeout(3000);

    // Scrape content based on platform using string scripts
    let items: ScrapedItem[] = [];

    if (platform === 'Weibo') {
      items = await page.evaluate(WEIBO_SCRIPT) as ScrapedItem[];
    } else if (platform === 'Bilibili') {
      items = await page.evaluate(BILIBILI_SCRIPT) as ScrapedItem[];
    } else if (platform === 'Xiaohongshu') {
      items = await page.evaluate(XIAOHONGSHU_SCRIPT) as ScrapedItem[];
    }

    console.log(`Scraped ${items.length} items from ${platform}`);

    // Save items to database
    let savedCount = 0;
    for (const item of items) {
      if (!item.title || !item.externalId) continue;

      try {
        itemOps.upsert.run(
          accountId,
          platform,
          item.externalId,
          item.title,
          item.author,
          item.thumbnail,
          item.url,
          item.content || null,
          item.likes,
          item.comments,
          item.shares,
          item.views,
          JSON.stringify(item.tags)
        );
        savedCount++;
      } catch (err) {
        console.error('Error saving item:', err);
      }
    }

    // Update last sync time
    accountOps.updateStatus.run('connected', accountId);

    console.log(`Saved ${savedCount} items to database`);

    return { success: true, itemCount: savedCount };
  } catch (error: any) {
    console.error(`Sync error for ${platform}:`, error);
    return { success: false, itemCount: 0, error: error.message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

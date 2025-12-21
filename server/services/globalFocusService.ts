import { chromium, Cookie, Page } from 'playwright';
import { itemOps, accountOps } from './database';
import db from './database';

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

// Platform configuration for user-specific scraping with cookies
// This file only handles authenticated scraping using cookies
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
// These scripts are exported for use in both authenticated (this file) and public scraping services
export const BILIBILI_SCRIPT = `
(function() {
  try {
    console.log('[Bilibili Script] Starting execution...');
    var results = [];
    // Try multiple selectors for different page layouts
    var selectors = [
      // Weekly popular page selectors (priority for weekly page)
      '.weekly-list .rank-item',
      '.rank-list .rank-item',
      '.rank-item',
      '.weekly-item',
      '.video-item',
      // Common Bilibili selectors
      '.bili-video-card',
      '.video-card',
      '.feed-card',
      '.recommended-card',
      '.popular-list .video-item',
      '.rank-list .video-item',
      '.video-list .video-item',
      'article[class*="video"]',
      '[class*="video-card"]',
      '[class*="VideoCard"]',
    ];
  
  var elements = [];
  for (var selIdx = 0; selIdx < selectors.length; selIdx++) {
    var found = document.querySelectorAll(selectors[selIdx]);
    if (found.length > 0) {
      elements = Array.from(found);
      break;
    }
  }
  
  // If no specific cards found, try to find any video links
  if (elements.length === 0) {
    var videoLinks = document.querySelectorAll('a[href*="/video/"]');
    var parentElements = new Set();
    for (var linkIdx = 0; linkIdx < videoLinks.length; linkIdx++) {
      var link = videoLinks[linkIdx];
      var parent = link.closest('article, .card, [class*="item"], [class*="card"]');
      if (parent) parentElements.add(parent);
    }
    elements = Array.from(parentElements);
  }
  
  console.log('[Bilibili Script] Found ' + elements.length + ' elements to process');

  for (var i = 0; i < elements.length && i < 50; i++) {
    try {
      if (i % 10 === 0) {
        console.log('[Bilibili Script] Processing element ' + i + '/' + Math.min(elements.length, 50));
      }

      var el = elements[i];

      // Find video link - try multiple ways
    var linkEl = el.querySelector('a[href*="/video/"]') || 
                 (el.tagName === 'A' && el.href && el.href.includes('/video/') ? el : null);
    
    // If no link found in element, try to find parent link
    if (!linkEl) {
      var parentLink = el.closest('a[href*="/video/"]');
      if (parentLink) linkEl = parentLink;
    }
    
    // Skip if no link found
    if (!linkEl) continue;
    
    // Get link href and normalize it
    var linkHref = linkEl.getAttribute('href') || linkEl.href || '';
    if (!linkHref) continue;
    
    // Handle protocol-relative URLs (//www.bilibili.com/...)
    if (linkHref.startsWith('//')) {
      linkHref = 'https:' + linkHref;
    }
    // Handle relative URLs
    if (linkHref.startsWith('/')) {
      linkHref = 'https://www.bilibili.com' + linkHref;
    }
    
    // Extract video ID from URL - try multiple patterns
    var videoMatch = linkHref.match(/\\/video\\/(BV[\\w]+)/);
    // Also try to match without leading slash
    if (!videoMatch) {
      videoMatch = linkHref.match(/video\\/(BV[\\w]+)/);
    }
    // If still no match, try from href attribute directly
    if (!videoMatch && linkEl) {
      var originalHref = linkEl.getAttribute('href') || '';
      videoMatch = originalHref.match(/(BV[\\w]+)/);
    }
    
    if (!videoMatch) continue;
    var externalId = videoMatch[1] || ('bilibili-' + Date.now() + '-' + i);
    
    // Get title - try multiple selectors and methods (prioritize reliable sources)
    var title = '';
    
    // Detect if this is a weekly popular page element
    var isWeeklyPageElement = el.closest('.weekly-list, [class*="weekly"], .rank-list, [class*="rank"]') !== null;
    
    // Method 1: Try specific title selectors first (most reliable for structured pages)
    if (!title) {
      var titleSelectors = [];
      
      // For weekly page, use more specific selectors
      if (isWeeklyPageElement) {
        titleSelectors = [
          '.info-title a',
          '.info-title',
          '.rank-item .title a',
          '.rank-item .title',
          '.weekly-item .title a',
          '.weekly-item .title',
          '.video-item .title a',
          '.video-item .title',
          '.title a[href*="/video/"]',
          '[class*="title"] a[href*="/video/"]',
        ];
      }
      
      // Common Bilibili selectors (most reliable)
      titleSelectors = titleSelectors.concat([
        '.bili-video-card__info--tit',
        '.bili-video-card__info--tit a',
        '.bili-video-card__info--tit span',
        '.video-card__info .title',
        '.video-card .title',
        '.video-title',
        '[class*="VideoCard__title"]',
        '[class*="video-card__info"] [class*="title"]',
        '[class*="info-wrap"] [class*="title"]',
      ]);
      
      // Generic selectors (less reliable, use last)
      if (!isWeeklyPageElement) {
        titleSelectors = titleSelectors.concat([
          'h3.title',
          'h2.title',
          '.title',
        ]);
      }
      for (var ts = 0; ts < titleSelectors.length; ts++) {
        var titleEl = el.querySelector(titleSelectors[ts]);
        if (titleEl) {
          // Try title attribute first, then textContent
          var titleText = titleEl.getAttribute('title') || '';
          if (!titleText && titleEl.textContent) {
            // Get text content, but exclude child elements that might have unwanted text
            titleText = titleEl.textContent || '';
            // Clean up - remove extra whitespace and newlines
            titleText = titleText.replace(/\\s+/g, ' ').trim();
            
            // For weekly page, prefer direct child text content to avoid nested elements
            if (isWeeklyPageElement && titleEl.children.length > 0) {
              var directText = '';
              for (var childIdx = 0; childIdx < titleEl.children.length; childIdx++) {
                var childText = titleEl.children[childIdx].textContent || '';
                if (childText.trim().length > directText.length) {
                  directText = childText.trim();
                }
              }
              if (directText.length > 3) {
                titleText = directText;
              }
            }
          }
          
          // Validate title text - exclude common unwanted texts
          if (titleText && titleText.length > 3 && 
              !titleText.includes('不感兴趣') && 
              !titleText.includes('立即登录') &&
              !titleText.includes('登录') &&
              !titleText.includes('高级弹幕') &&
              !titleText.includes('弹幕') &&
              !titleText.match(/^\\d+$/) && // Don't use pure numbers as titles
              !titleText.match(/^[\\s\\n]*$/)) { // Don't use whitespace-only
            title = titleText;
            break;
          }
        }
      }
    }
    
    // Method 2: Try title attribute on link (also reliable)
    if (!title && linkEl) {
      var linkTitle = linkEl.getAttribute('title');
      if (linkTitle && linkTitle.trim().length > 3 && !linkTitle.includes('不感兴趣')) {
        title = linkTitle.trim();
      }
    }
    
    // Method 3: Try title attribute on any link in the card
    if (!title) {
      var titleLinks = el.querySelectorAll('a[title]');
      for (var tlIdx = 0; tlIdx < titleLinks.length; tlIdx++) {
        var titleAttr = titleLinks[tlIdx].getAttribute('title');
        if (titleAttr && titleAttr.trim().length > 3 && !titleAttr.includes('不感兴趣')) {
          title = titleAttr.trim();
          break;
        }
      }
    }
    
    // Method 4: Try to get from data attributes or aria-label
    if (!title) {
      var dataTitle = el.querySelector('[data-title]');
      if (dataTitle) {
        var dt = dataTitle.getAttribute('data-title') || '';
        if (dt.trim().length > 3) title = dt.trim();
      }
      if (!title) {
        var ariaLabel = el.querySelector('[aria-label]');
        if (ariaLabel) {
          var al = ariaLabel.getAttribute('aria-label') || '';
          if (al.trim().length > 3 && !al.includes('不感兴趣')) {
            title = al.trim();
          }
        }
      }
    }
    
    // Method 5: Try to find text node directly in the card (but exclude buttons, links, etc.)
    if (!title) {
      // Look for the largest text block that's not a button or link
      var textNodes = [];
      var walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            var parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            // Skip text in buttons, links, icons, etc.
            if (parent.tagName === 'BUTTON' || 
                parent.tagName === 'A' || 
                parent.closest('button') || 
                parent.closest('a[href]')) {
              return NodeFilter.FILTER_REJECT;
            }
            var text = node.textContent.trim();
            if (text.length > 10 && text.length < 200) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
          }
        }
      );
      var node;
      while (node = walker.nextNode()) {
        var text = node.textContent.trim();
        if (text.length > 10 && !text.match(/^\\d+$/)) {
          textNodes.push(text);
        }
      }
      // Use the first valid text node as title
      if (textNodes.length > 0) {
        title = textNodes[0];
      }
    }
    
    // Method 6: Try link text as last resort (but might be empty or button text)
    if (!title && linkEl && linkEl.textContent) {
      var linkText = linkEl.textContent.trim();
      if (linkText.length > 3 && 
          !linkText.includes('不感兴趣') && 
          !linkText.includes('立即登录') &&
          !linkText.match(/^\\d+$/)) {
        title = linkText;
      }
    }
    
    // Method 7: Use BV ID as fallback title if nothing else works
    if (!title || title.length < 2) {
      title = 'B站视频 ' + externalId;
    }
    
    // Clean up title - remove extra whitespace, limit length
    title = title.replace(/\\s+/g, ' ').trim().slice(0, 200);
    
    // Final validation - skip clearly invalid titles
    if (title === '不感兴趣' || title === '立即登录' || title === '登录' || title === '' || title.match(/^\\d+$/)) {
      title = 'B站视频 ' + externalId;
    }
    
    // Get author
    var author = '未知UP主';
    var authorSelectors = [];
    
    // For weekly page, use more specific selectors
    if (isWeeklyPageElement) {
      authorSelectors = [
        '.info-author',
        '.info-up',
        '.up-name',
        '.rank-item .up-name',
        '.weekly-item .up-name',
        'a[href*="/space/"]',
      ];
    }
    
    // Common Bilibili selectors
    authorSelectors = authorSelectors.concat([
      '.bili-video-card__info--author',
      '.up-name',
      '.name',
      '[class*="author"]',
      '[class*="up"]',
      '.user-name',
      'a[href*="space"]',
    ]);
    
    for (var as = 0; as < authorSelectors.length; as++) {
      var authorEl = el.querySelector(authorSelectors[as]);
      if (authorEl && authorEl.textContent) {
        var authorText = authorEl.textContent.trim();
        // Skip if it's a number or URL-like text
        if (authorText && authorText.length > 0 && !authorText.match(/^\\d+$/) && !authorText.startsWith('http')) {
          author = authorText;
          break;
        }
      }
    }
    
    // Get thumbnail - enhanced for weekly page and lazy loading
    var thumbnail = '';
    
    // Helper function to get image URL with priority for data attributes (lazy loading)
    var getImageUrl = function(img) {
      if (!img) return '';
      // Try data attributes first (lazy loaded images)
      var dataSrc = img.getAttribute('data-src') || '';
      if (dataSrc && !dataSrc.startsWith('data:')) return dataSrc;
      
      var dataLazySrc = img.getAttribute('data-lazy-src') || '';
      if (dataLazySrc && !dataLazySrc.startsWith('data:')) return dataLazySrc;
      
      var dataLazy = img.getAttribute('data-lazy') || '';
      if (dataLazy && !dataLazy.startsWith('data:')) return dataLazy;
      
      var dataUrl = img.getAttribute('data-url') || '';
      if (dataUrl && !dataUrl.startsWith('data:')) return dataUrl;
      
      // Fallback to src, but filter out data URIs
      var src = img.getAttribute('src') || img.src || '';
      if (src && !src.startsWith('data:')) return src;
      
      return '';
    };
    
    var imgSelectors = [];
    
    // For weekly page, use more specific selectors
    if (isWeeklyPageElement) {
      imgSelectors = [
        '.rank-item .pic img',
        '.rank-item img',
        '.weekly-item .pic img',
        '.weekly-item img',
        '.video-item .pic img',
        '.video-item img',
        '.cover img',
        '.pic img',
      ];
    }
    
    // Common Bilibili selectors
    imgSelectors = imgSelectors.concat([
      '.bili-video-card__cover img',
      '.bili-video-card__pic img',
      '.video-card__pic img',
      '.v-img img',
      '.cover img',
      '.pic img',
      '[class*="cover"] img',
      '[class*="pic"] img',
      'picture img',
      'img',
    ]);
    
    // Try each selector, prioritizing those with data-src (lazy loaded images)
    for (var is = 0; is < imgSelectors.length; is++) {
      var imgEls = el.querySelectorAll(imgSelectors[is]);
      if (imgEls.length > 0) {
        // First pass: look for images with data-src (lazy loaded)
        for (var imgIdx = 0; imgIdx < imgEls.length; imgIdx++) {
          var url = getImageUrl(imgEls[imgIdx]);
          if (url && url.includes('hdslb.com')) {
            thumbnail = url;
            break;
          }
        }
        // Second pass: if no hdslb.com URL found, accept any valid URL
        if (!thumbnail) {
          for (var imgIdx2 = 0; imgIdx2 < imgEls.length; imgIdx2++) {
            var url2 = getImageUrl(imgEls[imgIdx2]);
            if (url2 && !url2.startsWith('data:')) {
              thumbnail = url2;
              break;
            }
          }
        }
        if (thumbnail) break;
      }
    }
    
    // Try picture source (for responsive images)
    if (!thumbnail) {
      var pictureEl = el.querySelector('picture');
      if (pictureEl) {
        var sources = pictureEl.querySelectorAll('source');
        for (var sIdx = 0; sIdx < sources.length; sIdx++) {
          var srcset = sources[sIdx].getAttribute('srcset');
          if (srcset) {
            // Extract first URL from srcset (format: "url1 1x, url2 2x")
            var urlMatch = srcset.match(/^([^\\s,]+)/);
            if (urlMatch && urlMatch[1]) {
              thumbnail = urlMatch[1];
              break;
            }
          }
          if (!thumbnail) {
            thumbnail = sources[sIdx].getAttribute('src') || '';
            if (thumbnail) break;
          }
        }
        // If no source found, try img in picture
        if (!thumbnail) {
          var picImg = pictureEl.querySelector('img');
          if (picImg) {
            thumbnail = getImageUrl(picImg);
          }
        }
      }
    }
    // Handle //xxx format URLs (protocol-relative)
    if (thumbnail && thumbnail.startsWith('//')) {
      thumbnail = 'https:' + thumbnail;
    }
    // Handle relative URLs
    if (thumbnail && thumbnail.startsWith('/')) {
      thumbnail = 'https://www.bilibili.com' + thumbnail;
    }
    // Remove query params that might cause issues (like @width, @height)
    if (thumbnail && thumbnail.includes('@')) {
      thumbnail = thumbnail.split('@')[0];
    }
    // Filter out data URIs and invalid URLs
    if (thumbnail && (thumbnail.startsWith('data:') || thumbnail.trim().length === 0)) {
      thumbnail = '';
    }
    
    // Get views
    var views = 0;
    var viewSelectors = [
      '.bili-video-card__stats--item',
      '.play-text',
      '[class*="view"]',
      '[class*="play"]',
      '[class*="stat"]',
    ];
    for (var vs = 0; vs < viewSelectors.length; vs++) {
      var viewEl = el.querySelector(viewSelectors[vs]);
      if (viewEl && viewEl.textContent) {
        var viewText = viewEl.textContent;
      var match = viewText.match(/([\\d.]+)/);
      if (match) {
        views = parseFloat(match[1]);
        if (viewText.indexOf('万') !== -1) views *= 10000;
          if (viewText.indexOf('亿') !== -1) views *= 100000000;
        views = Math.floor(views);
          break;
        }
      }
    }

      results.push({
        externalId: externalId,
        title: title,
        author: author,
        thumbnail: thumbnail,
        url: linkHref, // Use normalized href
        likes: 0,
        comments: 0,
        shares: 0,
        views: views,
        tags: ['B站']
      });
    } catch (elementError) {
      console.error('[Bilibili Script] Error processing element ' + i + ':', elementError.message);
      continue;
    }
  }

  console.log('[Bilibili Script] Completed processing ' + results.length + ' items');
  return results;
  } catch (scriptError) {
    console.error('[Bilibili Script] Fatal error:', scriptError.message);
    return [];
  }
})()
`;

export const WEIBO_SCRIPT = `
(function() {
  var results = [];
  
  // 首先找到所有以 Feed_body 开头的元素
  var allElements = Array.from(document.querySelectorAll('[class^="Feed_body"]'));
  
  // 如果没有找到 Feed_body 开头的元素，使用备用选择器
  if (allElements.length === 0) {
    allElements = Array.from(document.querySelectorAll('.Feed_wrap_3NP5t, .WB_card, .woo-panel-main'));
  }
  
  // 遍历每个元素，最多采集30条
  for (var i = 0; i < allElements.length && i < 30; i++) {
    var el = allElements[i];
    
    // 微博正文 - 优先使用 detail_wbtext 开头的元素
    var titleEl = el.querySelector('[class^="detail_wbtext"]');
    if (!titleEl) {
      titleEl = el.querySelector('.woo-lg-cut-2, .WB_text, [class*="text"]');
    }
    
    // 作者名 - 优先使用 head_name_24eEB，从 span 中获取
    var authorEl = el.querySelector('.head_name_24eEB span, .head_name_24eEB');
    if (!authorEl) {
      authorEl = el.querySelector('.WB_info a, [class*="head_name"]');
    }
    
    // 头像图片
    var avatarEl = el.querySelector('.woo-avatar-img');
    if (!avatarEl) {
      avatarEl = el.querySelector('.WB_face img, [class*="avatar"] img');
    }
    
    // 微博链接 - 优先从时间链接中提取（包含微博ID）
    var linkEl = el.querySelector('.head-info_time_6sFQg[href*="/"], a[href*="/status/"]');
    if (!linkEl) {
      linkEl = el.querySelector('a[href*="weibo.com"]');
    }
    
    // 互动数据 - 使用更精确的选择器
    var likeEl = el.querySelector('[title*="赞"], [aria-label*="赞"], .WB_like, [class*="like"]');
    var commentEl = el.querySelector('[title*="评论"], [aria-label*="评论"], .WB_comment, [class*="comment"]');
    var shareEl = el.querySelector('[title*="转发"], [aria-label*="转发"], .WB_forward, [class*="repost"]');
    
    var title = titleEl ? titleEl.textContent.trim().slice(0, 200) : '';
    if (title.length === 0) continue;
    
    var extractNum = function(text) {
      if (!text) return 0;
      var match = text.match(/\\d+/);
      return match ? parseInt(match[0]) : 0;
    };
    
    // 提取微博ID - 优先从链接URL中提取（格式：/u/1687426162/Qj7sZDb3o 或 /status/xxxxx）
    var externalId = 'weibo-' + Date.now() + '-' + i;
    if (linkEl && linkEl.href) {
      // 匹配格式：/u/xxx/xxxxx 或 /status/xxxxx
      var statusMatch = linkEl.href.match(/\\/(?:u\\/\\d+\\/)?([A-Za-z0-9]+)$/) || 
                        linkEl.href.match(/\\/status\\/(\\d+)/);
      if (statusMatch && statusMatch[1]) {
        externalId = statusMatch[1];
      }
    }
    
    // 提取作者名 - 优先从span的title或textContent获取
    var author = '未知用户';
    if (authorEl) {
      author = authorEl.getAttribute('title') || authorEl.textContent.trim();
    }
    
    // 提取缩略图 - 多种方式尝试
    var thumbnail = '';
    
    // 辅助函数：获取图片URL（支持懒加载）
    var getImageUrl = function(img) {
      if (!img) return '';
      return img.src || 
             img.getAttribute('data-src') || 
             img.getAttribute('data-lazy-src') ||
             img.getAttribute('data-original') ||
             '';
    };
    
    // 方式1: 查找 .woo-picture-slot 中的 img（最优先）
    var slotImg = el.querySelector('.woo-picture-slot img');
    if (slotImg) {
      thumbnail = getImageUrl(slotImg);
    }
    
    // 方式2: 查找所有 picture_focusImg 开头的图片
    if (!thumbnail) {
      var focusImgs = el.querySelectorAll('[class^="picture_focusImg"]');
      if (focusImgs.length > 0) {
        thumbnail = getImageUrl(focusImgs[0]);
      }
    }
    
    // 方式3: 查找 .picture_item_3zpCn 中的图片
    if (!thumbnail) {
      var pictureItem = el.querySelector('.picture_item_3zpCn img, .picture_pic_eLDxR img');
      if (pictureItem) {
        thumbnail = getImageUrl(pictureItem);
      }
    }
    
    // 方式4: 查找任何在 picture 容器中的图片（排除头像）
    if (!thumbnail) {
      var pictureContainer = el.querySelector('.picture, [class*="picture-box"]');
      if (pictureContainer) {
        var picImgs = pictureContainer.querySelectorAll('img:not(.woo-avatar-img)');
        for (var j = 0; j < picImgs.length; j++) {
          var url = getImageUrl(picImgs[j]);
          if (url && !url.includes('avatar') && !url.includes('head_avatar')) {
            thumbnail = url;
            break;
          }
        }
      }
    }
    
    // 清理URL（处理可能的相对路径或协议相对路径）
    // 注意：保留 URL 参数，因为微博图片可能需要这些参数才能正常访问
    if (thumbnail) {
      if (thumbnail.startsWith('//')) {
        thumbnail = 'https:' + thumbnail;
      } else if (thumbnail.startsWith('/')) {
        thumbnail = 'https://weibo.com' + thumbnail;
      }
      // 不删除 URL 参数，因为微博图片可能需要这些参数（如 ?KID=...）
    }
    
    results.push({
      externalId: externalId,
      title: title,
      author: author,
      thumbnail: thumbnail,
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

export const XIAOHONGSHU_SCRIPT = `
(function() {
  var results = [];
  var elements = document.querySelectorAll('section[class*="note"], .note-item, [class*="feed"] section');
  
  for (var i = 0; i < elements.length && i < 30; i++) {
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
 * Sync content from a platform account using cookies for authentication
 * This function only uses URLs from PLATFORM_CONFIG and requires cookies for all platforms
 * @param accountId - The account ID in the database
 * @param platform - The platform to sync (must be in PLATFORM_CONFIG)
 * @param cookiesJson - JSON string containing cookies array (required for all platforms)
 */
export async function syncPlatformContent(
  accountId: number,
  platform: Platform,
  cookiesJson: string
): Promise<{ success: boolean; itemCount: number; error?: string }> {
  let browser = null;

  try {
    console.log(`Starting sync for ${platform}...`);

    // Parse cookies - all platforms require cookies for authenticated scraping
    let cookies: Cookie[] = [];
    if (!cookiesJson || !cookiesJson.trim()) {
      return { success: false, itemCount: 0, error: 'Cookies are required for authenticated scraping' };
    }
    
    try {
      cookies = JSON.parse(cookiesJson);
      if (!cookies || cookies.length === 0) {
        return { success: false, itemCount: 0, error: 'Cookies cannot be empty' };
      }
    } catch (err) {
      return { success: false, itemCount: 0, error: 'Invalid cookie format: ' + (err as Error).message };
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

    // Set cookies - required for all platforms
    await context.addCookies(cookies);

    const page = await context.newPage();
    const config = PLATFORM_CONFIG[platform];
    
    if (!config) {
      return { success: false, itemCount: 0, error: `Platform ${platform} is not configured in PLATFORM_CONFIG` };
    }

    // Navigate to home page (30 minute timeout)
    await page.goto(config.homeUrl, { waitUntil: 'domcontentloaded', timeout: 1800000 });
    await page.waitForTimeout(5000);

    // Scroll to load more content (10 times for ~30 items)
    console.log(`[${platform}] Starting to scroll and load content...`);
    for (let i = 0; i < 10; i++) {
      await page.evaluate('window.scrollBy(0, window.innerHeight * 2)');
      await page.waitForTimeout(1500); // Wait for content to load
      if (i % 5 === 4) {
        console.log(`[${platform}] Scrolled ${i + 1} times...`);
      }
    }
    // Extra wait for final content to render
    await page.waitForTimeout(2000);

    // Scrape content based on platform using string scripts
    let items: ScrapedItem[] = [];

    if (platform === 'Weibo') {
      items = await page.evaluate(WEIBO_SCRIPT) as ScrapedItem[];
    } else if (platform === 'Bilibili') {
      items = await page.evaluate(BILIBILI_SCRIPT) as ScrapedItem[];
    } else if (platform === 'Xiaohongshu') {
      items = await page.evaluate(XIAOHONGSHU_SCRIPT) as ScrapedItem[];
    } else {
      return { success: false, itemCount: 0, error: `Unsupported platform: ${platform}` };
    }

    console.log(`Scraped ${items.length} items from ${platform}`);

    // Get user_id from account_id for deduplication
    const userIdResult = itemOps.getUserIdByAccountId.get(accountId) as { user_id: number } | undefined;
    const userId = userIdResult?.user_id;

    if (!userId) {
      throw new Error('Cannot find user_id for account_id');
    }

    // Generate batch timestamp for this sync (use current time, rounded to minute for batch grouping)
    // Format: YYYY-MM-DD HH:MM (SQLite datetime format, minutes precision)
    const now = new Date();
    now.setSeconds(0, 0); // Round to minute for batch grouping
    const batchTimeStr = now.toISOString().slice(0, 16).replace('T', ' ') + ':00'; // Format: YYYY-MM-DD HH:MM:00

    // Save items to database with deduplication by user_id, title, and platform
    // Use transaction to ensure all items in this batch have the same fetched_at
    const insertWithBatchTime = db.prepare(`
      INSERT INTO social_items (account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(account_id, external_id) DO UPDATE SET
        title = excluded.title,
        author = excluded.author,
        thumbnail = excluded.thumbnail,
        url = excluded.url,
        content = excluded.content,
        likes = excluded.likes,
        comments = excluded.comments,
        shares = excluded.shares,
        views = excluded.views,
        tags = excluded.tags,
        fetched_at = excluded.fetched_at
    `);

    let savedCount = 0;
    for (const item of items) {
      if (!item.title || !item.externalId) continue;

      try {
        // Check if item already exists by user_id, title, and platform
        const existing = itemOps.existsByUserTitlePlatform.get(userId, item.title, platform);
        if (existing) {
          // Skip if duplicate exists
          continue;
        }

        // Insert new item with batch timestamp
        insertWithBatchTime.run(
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
          JSON.stringify(item.tags),
          batchTimeStr
        );
        savedCount++;
      } catch (err) {
        console.error('Error saving item:', err);
      }
    }

    // Clean up old batches - keep only the latest 20 batches for this user and platform
    try {
      // Get batch timestamps to keep (latest 20)
      const batchTimestampsToKeep = itemOps.getBatchTimestampsToKeep.all(userId, platform, 20) as Array<{ batch_time: string }>;
      const keepBatchTimes = new Set(batchTimestampsToKeep.map(b => b.batch_time));

      // Get all batch timestamps for this user and platform
      const getAllBatches = db.prepare(`
        SELECT DISTINCT strftime('%Y-%m-%d %H:%M', si.fetched_at) as batch_time
        FROM social_items si
        JOIN platform_accounts pa ON si.account_id = pa.id
        WHERE pa.user_id = ? AND si.platform = ?
      `);
      const allBatches = getAllBatches.all(userId, platform) as Array<{ batch_time: string }>;

      // Delete batches that are not in the keep list
      let deletedBatches = 0;
      for (const batch of allBatches) {
        if (!keepBatchTimes.has(batch.batch_time)) {
          itemOps.deleteBatchByUserPlatformTimestamp.run(
            userId,
            platform,
            platform,
            batch.batch_time
          );
          deletedBatches++;
          console.log(`Deleted old batch ${batch.batch_time} for user ${userId}, platform ${platform}`);
        }
      }

      if (deletedBatches > 0) {
        console.log(`Cleaned up ${deletedBatches} old batches for user ${userId}, platform ${platform}`);
      }
    } catch (err) {
      console.error('Error cleaning up old batches:', err);
      // Don't fail the sync if cleanup fails
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

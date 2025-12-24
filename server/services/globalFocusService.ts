import { chromium, Cookie, Page } from 'playwright';
import { itemOps, accountOps, publicItemOps } from './database';
import db from './database';

/**
 * 内容分类服务 - 基于规则的分类器
 * 在采集过程中实时分类，找不到类别的归为"other"
 */

export type ContentCategory = 
  | 'entertainment'  // 影视娱乐
  | 'gaming'         // 游戏电竞
  | 'tech'           // 科技数码
  | 'food'           // 美食生活
  | 'travel'         // 旅游出行
  | 'fashion'        // 时尚美妆
  | 'sports'         // 体育健身
  | 'finance'        // 财经商业
  | 'society'        // 社会热点
  | 'other';         // 其他

interface ClassificationRule {
  category: ContentCategory;
  keywords: string[];
  weight: number; // 权重
  excludeKeywords?: string[]; // 排除关键词
}

// 分类规则配置
const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    category: 'entertainment',
    keywords: [
      '电影', '电视剧', '剧集', '综艺', '明星', '演员', '导演', '票房', '上映', 
      '娱乐', '娱乐圈', '影视', '影片', '电影票', '观影', '追剧', '剧评', 
      '影评', '电影节', '金像奖', '奥斯卡', '戛纳', '威尼斯', '柏林',
      '爱豆', '偶像', '粉丝', '应援', '打榜', '追星', '饭圈'
    ],
    weight: 1.0,
    excludeKeywords: ['游戏电影', '科技电影', '电影游戏']
  },
  {
    category: 'gaming',
    keywords: [
      '游戏', '电竞', '攻略', 'steam', 'switch', 'ps5', 'xbox', '手游', '端游', 
      '游戏评测', '游戏推荐', '游戏攻略', '游戏直播', '游戏解说', '游戏视频',
      '王者荣耀', '和平精英', '原神', '崩坏', '明日方舟', '阴阳师',
      'LOL', '英雄联盟', 'DOTA', 'CS', '绝地求生', '吃鸡',
      '游戏机', '掌机', '主机', 'PC游戏', '单机游戏', '网络游戏',
      '游戏主播', '游戏UP主', '游戏区', '游戏频道'
    ],
    weight: 1.0
  },
  {
    category: 'tech',
    keywords: [
      '科技', '数码', '手机', '电脑', 'AI', '人工智能', '编程', '代码', '互联网', 
      '芯片', '5G', '6G', '处理器', 'CPU', 'GPU', '内存', '硬盘', 'SSD',
      'iPhone', 'iPad', 'Mac', 'Android', 'iOS', 'Windows', 'Linux',
      '华为', '小米', 'OPPO', 'vivo', '三星', '苹果',
      '程序员', '开发', '前端', '后端', '算法', '数据结构',
      '区块链', '加密货币', '比特币', '以太坊', 'NFT',
      '智能家居', '物联网', 'IoT', '自动驾驶', '新能源车', '电动车',
      '软件', 'APP', '应用', '小程序', '网站', '服务器'
    ],
    weight: 1.0
  },
  {
    category: 'food',
    keywords: [
      '美食', '探店', '餐厅', '料理', '烹饪', '食谱', '菜谱', '做菜', '下厨',
      '火锅', '烧烤', '日料', '韩料', '西餐', '中餐', '川菜', '粤菜', '湘菜',
      '小吃', '甜品', '奶茶', '咖啡', '茶', '酒', '啤酒', '红酒', '白酒',
      '早餐', '午餐', '晚餐', '夜宵', '零食', '零食推荐',
      '生活', '家居', '收纳', '整理', '清洁', '装修', '家具', '家电'
    ],
    weight: 1.0
  },
  {
    category: 'travel',
    keywords: [
      '旅游', '旅行', '攻略', '景点', '景区', '酒店', '民宿', '机票', '火车票',
      '自由行', '跟团', '自驾', '背包客', '穷游', '度假', '度假村',
      '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '西安', '南京',
      '日本', '韩国', '泰国', '新加坡', '马来西亚', '越南', '菲律宾',
      '欧洲', '美国', '澳洲', '新西兰', '马尔代夫', '巴厘岛',
      '拍照', '打卡', '网红', '必去', '推荐', '攻略'
    ],
    weight: 1.0
  },
  {
    category: 'fashion',
    keywords: [
      '时尚', '穿搭', '搭配', '服装', '衣服', '裙子', '裤子', '鞋子', '包包',
      '美妆', '化妆', '护肤', '面膜', '口红', '粉底', '眼影', '腮红',
      '品牌', '奢侈品', 'Gucci', 'LV', 'Chanel', 'Dior', 'Prada',
      '潮流', '流行', '趋势', '风格', '韩风', '日系', '欧美',
      '发型', '染发', '烫发', '美甲', '纹身', '配饰', '首饰'
    ],
    weight: 1.0
  },
  {
    category: 'sports',
    keywords: [
      '体育', '运动', '健身', '跑步', '瑜伽', '健身', '减肥', '减脂', '增肌',
      '篮球', '足球', '乒乓球', '羽毛球', '网球', '游泳', '骑行', '马拉松',
      'NBA', 'CBA', '中超', '英超', '西甲', '意甲', '德甲', '法甲',
      '奥运会', '世界杯', '欧洲杯', '亚洲杯', '全运会',
      '健身房', '私教', '训练', '器械', '哑铃', '杠铃'
    ],
    weight: 1.0
  },
  {
    category: 'finance',
    keywords: [
      '财经', '经济', '股市', '股票', '基金', '投资', '理财', '银行', '保险',
      'A股', '港股', '美股', '创业板', '科创板', '上证', '深证',
      '房价', '楼市', '房地产', '买房', '卖房', '租房',
      '消费', '消费升级', '消费降级', '物价', '通胀', '通缩',
      '创业', '融资', 'IPO', '上市', '市值', '估值'
    ],
    weight: 1.0
  },
  {
    category: 'society',
    keywords: [
      '社会', '新闻', '时事', '热点', '事件', '事故', '案件', '法律', '法规',
      '政策', '政府', '国家', '国际', '外交', '军事',
      '教育', '学校', '学生', '老师', '考试', '高考', '考研',
      '医疗', '医院', '医生', '健康', '疾病', '疫情',
      '环保', '环境', '污染', '气候', '能源', '可持续发展'
    ],
    weight: 1.0
  }
];

/**
 * 对内容进行分类
 * @param title 标题
 * @param content 内容
 * @param tags 标签数组
 * @returns 分类结果
 */
function classifyContent(
  title: string = '',
  content: string = '',
  tags: string[] = []
): ContentCategory {
  // 合并所有文本内容
  const text = `${title} ${content} ${tags.join(' ')}`.toLowerCase();
  
  // 如果文本为空，返回other
  if (!text.trim()) {
    return 'other';
  }
  
  // 计算每个分类的得分
  const scores: Record<ContentCategory, number> = {
    entertainment: 0,
    gaming: 0,
    tech: 0,
    food: 0,
    travel: 0,
    fashion: 0,
    sports: 0,
    finance: 0,
    society: 0,
    other: 0
  };
  
  // 遍历所有规则
  for (const rule of CLASSIFICATION_RULES) {
    let score = 0;
    let matchCount = 0;
    
    // 检查关键词匹配
    for (const keyword of rule.keywords) {
      const keywordLower = keyword.toLowerCase();
      if (text.includes(keywordLower)) {
        matchCount++;
        score += rule.weight;
        
        // 标题中的关键词权重更高
        if (title.toLowerCase().includes(keywordLower)) {
          score += rule.weight * 0.5;
        }
      }
    }
    
    // 检查排除关键词
    if (rule.excludeKeywords && matchCount > 0) {
      for (const exclude of rule.excludeKeywords) {
        if (text.includes(exclude.toLowerCase())) {
          // 如果匹配排除关键词，降低该分类的得分
          score = score * 0.3;
          break;
        }
      }
    }
    
    // 累计得分
    if (score > 0) {
      scores[rule.category] += score;
    }
  }
  
  // 找到得分最高的分类
  let maxScore = 0;
  let maxCategory: ContentCategory = 'other';
  
  for (const [category, score] of Object.entries(scores) as [ContentCategory, number][]) {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category;
    }
  }
  
  // 如果最高得分太低（小于0.5），归为other
  if (maxScore < 0.5) {
    return 'other';
  }
  
  return maxCategory;
}

type Platform = 'Weibo' | 'Bilibili' | 'Xiaohongshu';
type PublicPlatform = 'Weibo' | 'Bilibili' | 'Xiaohongshu' | 'Douyin';

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
  
  // 遍历每个元素，最多采集100条
  for (var i = 0; i < allElements.length && i < 100; i++) {
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
    
    // 对于视频类微博，如果没有文本标题，尝试从视频元素或描述中获取
    if (title.length === 0) {
      // 尝试查找视频相关的标题或描述
      var videoTitleEl = el.querySelector('[class*="video"] [class*="title"], [class*="video"] [class*="desc"], [class*="media"] [class*="title"]');
      if (videoTitleEl) {
        title = videoTitleEl.textContent.trim().slice(0, 200);
      }
      
      // 如果还是没有标题，检查是否有视频元素
      if (title.length === 0) {
        var videoEl = el.querySelector('video, [class*="video"], [class*="media-video"]');
        if (videoEl) {
          // 尝试从视频的 title 或 alt 属性获取
          var videoTitle = videoEl.getAttribute('title') || videoEl.getAttribute('alt') || '';
          if (videoTitle && videoTitle.length > 0) {
            title = videoTitle.trim().slice(0, 200);
          }
        }
      }
      
      // 如果仍然没有标题，使用默认标题（至少保证视频微博能被采集）
      if (title.length === 0) {
        title = '视频微博 ' + externalId;
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
    
    // 方式5: 对于视频类微博，尝试获取视频封面图
    if (!thumbnail) {
      var videoEl = el.querySelector('video, [class*="video"], [class*="media-video"]');
      if (videoEl) {
        // 尝试从 video 元素的 poster 属性获取封面
        var videoPoster = videoEl.getAttribute('poster') || videoEl.getAttribute('data-poster');
        if (videoPoster) {
          thumbnail = videoPoster;
        } else {
          // 尝试查找视频封面图片
          var videoCover = el.querySelector('[class*="video"] img, [class*="media-video"] img, .video-cover img, .media-cover img');
          if (videoCover) {
            thumbnail = getImageUrl(videoCover);
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
      INSERT INTO social_items (account_id, platform, external_id, title, author, thumbnail, url, content, likes, comments, shares, views, tags, category, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        category = excluded.category,
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

        // 分类内容
        const category = classifyContent(item.title, item.content || '', item.tags || []);
        
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
          category,
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

// Platform configuration for public scraping (no login required)
const PUBLIC_SCRAPING_CONFIG: Record<PublicPlatform, {
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
  platform: PublicPlatform,
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
      acceptDownloads: false,
    });
    
    await context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot}', (route) => {
      route.continue();
    });

    const page = await context.newPage();

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
    
    let finalUrl = page.url();
    
    if (finalUrl.includes('passport.weibo.com/visitor/visitor')) {
      try {
        const redirectPromise = page.waitForURL(/weibo\.com/, { timeout: 15000, waitUntil: 'domcontentloaded' });
        const timeoutPromise = page.waitForTimeout(10000);
        
        await Promise.race([redirectPromise, timeoutPromise]).catch(() => {});
        
        finalUrl = page.url();
        
        if (finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:')) {
          console.warn(`[Public Scraping] Weibo: Navigation failed after visitor verification, retrying direct navigation...`);
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
        
        if (finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:')) {
          console.warn(`[Public Scraping] Weibo: Got error page, skipping this URL`);
          return { success: false, itemCount: 0, error: `Navigation failed: ${waitErr.message}` };
        }
      }
    }
    
    if ((finalUrl.startsWith('chrome-error://') || finalUrl.startsWith('about:'))) {
      if (platform === 'Weibo' && sourceLabel === '热门榜单') {
        console.warn(`[Public Scraping] Weibo hot list navigation failed, trying alternative URL...`);
        try {
          const altUrl = 'https://s.weibo.com/top/summary';
          await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          finalUrl = page.url();
          console.log(`[Public Scraping] Weibo: Alternative navigation to ${altUrl}, got: ${finalUrl.substring(0, 100)}`);
          await page.waitForTimeout(3000);
          
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
    
    try {
      await page.waitForSelector('body', { timeout: 10000 });
    } catch (e) {
      // Silent fail
    }
    
    await page.waitForTimeout(5000);
    
    if (platform === 'Weibo') {
      try {
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Scrolling to load more content...`);
        for (let scrollIdx = 0; scrollIdx < 20; scrollIdx++) {
          await page.evaluate((idx) => {
            window.scrollTo(0, window.innerHeight * (idx + 1));
          }, scrollIdx);
          await page.waitForTimeout(600);
        }
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(2000);
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Finished scrolling`);
      } catch (e: any) {
        console.warn(`[Public Scraping] ${platform} - ${sourceLabel}: Error during scrolling (${e.message}), continuing...`);
      }
    }
    
    if (platform === 'Weibo' && finalUrl.includes('passport.weibo.com/visitor')) {
      await page.waitForTimeout(3000);
      try {
        const continueBtn = await page.$('button, a[class*="btn"], a[class*="button"]');
        if (continueBtn) {
          await continueBtn.click().catch(() => {});
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        // Ignore errors
      }
    }

    if (platform === 'Bilibili') {
      try {
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Waiting for video cards...`);
        try {
          await page.waitForSelector('.bili-video-card, .video-card, .feed-card, .rank-item, .weekly-item, .popular-list .video-item', { timeout: 20000 });
          console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Video cards found`);
        } catch (e: any) {
          console.warn(`[Public Scraping] ${platform} - ${sourceLabel}: Video cards not found (${e.message}), continuing anyway...`);
        }
        
        const isWeeklyPage = sourceLabel.includes('每周必看');
        const scrollCount = isWeeklyPage ? 5 : 3;
        const waitTime = isWeeklyPage ? 3000 : 2000;
        
        await page.waitForTimeout(3000);
        
        console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Scrolling ${scrollCount} times to load images...`);
        for (let scrollIdx = 0; scrollIdx < scrollCount; scrollIdx++) {
          await page.evaluate((idx) => {
            window.scrollTo(0, window.innerHeight * (idx + 1));
          }, scrollIdx);
          await page.waitForTimeout(waitTime);
        }
        
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(2000);
        
        try {
          await page.waitForFunction(
            () => {
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
      }
    }

    if (!script || script.trim() === '') {
      console.error(`[Public Scraping] No script provided for ${platform}`);
      return { success: false, itemCount: 0, error: 'No scraping script provided' };
    }

    console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Starting script execution...`);
    let items: ScrapedItem[] = [];
    try {
      const scriptPromise = page.evaluate(script);
      const scriptTimeoutPromise = new Promise<ScrapedItem[]>((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Script execution timeout (2 minutes)'));
        }, 2 * 60 * 1000);
      });

      items = await Promise.race([scriptPromise, scriptTimeoutPromise]) as ScrapedItem[];
      console.log(`[Public Scraping] ${platform} - ${sourceLabel}: Script executed, found ${items?.length || 0} items`);
    } catch (err: any) {
      console.error(`[Public Scraping] Error executing script for ${platform} - ${sourceLabel}:`, err.message);
      console.error(`[Public Scraping] Script error stack:`, err.stack);
      return { success: false, itemCount: 0, error: `Script execution error: ${err.message}` };
    }

    const validItems = items?.filter(item => item && item.title && item.externalId) || [];

    let savedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const item of validItems) {
      try {
        let thumbnail = item.thumbnail || '';
        if (thumbnail && (thumbnail.startsWith('data:') || thumbnail.trim().length === 0)) {
          thumbnail = '';
        }
        
        const tagsJson = JSON.stringify(item.tags || []);
        // 分类内容
        const category = classifyContent(item.title, item.content || '', item.tags || []);
        
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
          tagsJson,
          category
        );
        savedCount++;
      } catch (err: any) {
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
export async function scrapePlatformPublicContent(platform: PublicPlatform): Promise<{ success: boolean; totalItems: number; error?: string }> {
  const config = PUBLIC_SCRAPING_CONFIG[platform];
  if (!config) {
    return { success: false, totalItems: 0, error: 'Unknown platform' };
  }

  let totalItems = 0;
  const errors: string[] = [];

  try {
    for (const { url, label } of config.urls) {
      try {
        const scrapingPromise = scrapePublicContent(platform, url, label, config.script);
        const timeoutPromise = new Promise<{ success: boolean; itemCount: number; error?: string }>((resolve) => {
          setTimeout(() => {
            resolve({ success: false, itemCount: 0, error: 'Scraping timeout (5 minutes)' });
          }, 5 * 60 * 1000);
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
export async function scrapeAllPlatformsPublicContent(): Promise<{ success: boolean; results: Record<PublicPlatform, { totalItems: number; error?: string }> }> {
  const platforms: PublicPlatform[] = ['Weibo', 'Bilibili', 'Xiaohongshu', 'Douyin'];
  const results: Record<PublicPlatform, { totalItems: number; error?: string }> = {} as any;

  for (const platform of platforms) {
    console.log(`[Public Scraping] Starting ${platform}...`);
    try {
      const platformPromise = scrapePlatformPublicContent(platform);
      const timeoutPromise = new Promise<{ success: boolean; totalItems: number; error?: string }>((resolve) => {
        setTimeout(() => {
          resolve({ success: false, totalItems: 0, error: 'Platform scraping timeout (10 minutes)' });
        }, 10 * 60 * 1000);
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
    
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const allSuccess = Object.values(results).every(r => !r.error);
  console.log(`[Public Scraping] All platforms completed. Success: ${allSuccess}`);
  return {
    success: allSuccess,
    results,
  };
}

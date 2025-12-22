import { chromium, Browser, Page } from 'playwright';

// 猫眼数据类型定义
export interface MaoyanBoxOffice {
  rank: number;
  movieId: string;
  title: string;
  boxOffice: number;
  boxOfficeUnit: string;
  releaseDate: string;
  poster?: string;
  trend?: 'up' | 'down' | 'same';
}

export interface MaoyanCalendarMovie {
  movieId: string;
  title: string;
  releaseDate: string;
  poster?: string;
  wantCount?: number;
}

export interface MaoyanRankingItem {
  rank: number;
  itemId: string;
  title: string;
  score: number;
  poster?: string;
  info?: string;
  category: 'tv' | 'webSeries' | 'variety';
}

export interface MaoyanData {
  boxOffice: MaoyanBoxOffice[];
  calendar: MaoyanCalendarMovie[];
  tvRanking: MaoyanRankingItem[];
  webSeriesRanking: MaoyanRankingItem[];
  varietyRanking: MaoyanRankingItem[];
  fetchedAt: string;
}

/**
 * 从猫眼专业版抓取网播热度数据
 */
async function scrapeWebHeat(page: Page, type: 'tv' | 'webSeries' | 'variety'): Promise<MaoyanRankingItem[]> {
  const typeIndex = { tv: 1, webSeries: 2, variety: 3 };
  
  try {
    // 点击对应的 tab
    const tabSelector = `.webheat-nav span:nth-child(${typeIndex[type]})`;
    await page.click(tabSelector).catch(() => {});
    await page.waitForTimeout(1500);
    
    const items = await page.evaluate((category) => {
      const result: any[] = [];
      
      // 从表格行提取数据
      document.querySelectorAll('.dashboard-table tbody tr, table tbody tr').forEach((row, i) => {
        if (i >= 10 || result.length >= 10) return;
        
        const cells = row.querySelectorAll('td');
        if (cells.length < 2) return;
        
        // 第一列是排名，第二列是剧名
        const rankText = cells[0]?.textContent?.trim() || '';
        const rank = parseInt(rankText.replace(/\D/g, '')) || (i + 1);
        
        // 剧名可能在第二列
        let title = '';
        let heat = '';
        
        // 尝试从不同位置获取标题
        const titleCell = cells[1] || cells[0];
        const titleEl = titleCell?.querySelector('.movie-name, .name, a, span') || titleCell;
        title = titleEl?.textContent?.trim() || '';
        
        // 清理标题（移除多余信息）
        title = title.split(/多平台|上线|播放/)[0].trim();
        title = title.replace(/^\d+/, '').trim();
        
        // 热度值
        if (cells.length >= 3) {
          heat = cells[2]?.textContent?.trim() || '';
        }
        
        if (title && title.length > 1 && title.length < 50) {
          result.push({
            rank: result.length + 1,
            itemId: `${category}_${result.length}`,
            title,
            score: parseFloat(heat?.replace(/[^\d.]/g, '') || '0') || 0,
            poster: '',
            info: heat,
            category,
          });
        }
      });
      
      return result;
    }, type);
    
    return items;
  } catch (e) {
    console.error(`[Maoyan] Web heat ${type} error:`, e);
    return [];
  }
}

/**
 * 主抓取函数
 */
export async function scrapeMaoyanData(): Promise<MaoyanData> {
  console.log('[Maoyan] Starting data scrape...');
  
  let browser: Browser | null = null;
  
  const result: MaoyanData = {
    boxOffice: [],
    calendar: [],
    tvRanking: [],
    webSeriesRanking: [],
    varietyRanking: [],
    fetchedAt: new Date().toISOString(),
  };
  
  try {
    browser = await chromium.launch({ headless: true });
    
    // 移动端 context 用于猫眼移动版
    const mobileContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      viewport: { width: 375, height: 812 },
      locale: 'zh-CN',
    });
    
    const mobilePage = await mobileContext.newPage();
    
    // 1. 先访问猫眼首页建立 session
    console.log('[Maoyan] Establishing session...');
    await mobilePage.goto('https://m.maoyan.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await mobilePage.waitForTimeout(1500);
    
    // 2. 抓取即将上映
    console.log('[Maoyan] Fetching coming movies...');
    try {
      const comingData = await mobilePage.evaluate(async () => {
        try {
          const res = await fetch('https://m.maoyan.com/ajax/comingList?ci=1&limit=10&token=', {
            headers: { 'Accept': 'application/json' }
          });
          return await res.json();
        } catch {
          return null;
        }
      });
      
      if (comingData?.coming) {
        result.calendar = comingData.coming.slice(0, 10).map((item: any) => ({
          movieId: item.id?.toString() || '',
          title: item.nm || '',
          releaseDate: item.comingTitle || item.rt || '',
          poster: item.img?.replace(/w\.h/, '128.180') || '',
          wantCount: item.wish || 0,
        }));
        console.log(`[Maoyan] Got ${result.calendar.length} coming movies`);
      }
    } catch (e) {
      console.error('[Maoyan] Coming movies error:', e);
    }
    
    // 3. 抓取正在热映电影 - 先尝试移动端API
    console.log('[Maoyan] Fetching hot movies...');
    try {
      const hotData = await mobilePage.evaluate(async () => {
        try {
          const res = await fetch('https://m.maoyan.com/ajax/movieOnInfoList?token=', {
            headers: { 'Accept': 'application/json' }
          });
          return await res.json();
        } catch {
          return null;
        }
      });
      
      if (hotData?.movieList) {
        result.boxOffice = hotData.movieList.slice(0, 10).map((item: any, index: number) => ({
          rank: index + 1,
          movieId: item.id?.toString() || `hot_${index}`,
          title: item.nm || '',
          boxOffice: parseFloat(item.boxInfo?.replace(/[^\d.]/g, '') || '0') || 0,
          boxOfficeUnit: item.boxInfo?.includes('亿') ? '亿' : '万',
          releaseDate: item.rt || '',
          poster: item.img?.replace(/w\.h/, '128.180') || '',
          trend: 'same' as const,
        }));
        console.log(`[Maoyan] Got ${result.boxOffice.length} hot movies from mobile API`);
      }
    } catch (e) {
      console.error('[Maoyan] Hot movies error:', e);
    }
    
    await mobileContext.close();
    
    // 4. 使用桌面端抓取猫眼专业版
    console.log('[Maoyan] Fetching from piaofang...');
    
    const desktopContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'zh-CN',
    });
    
    const desktopPage = await desktopContext.newPage();
    
    // 4.1 先抓取票房数据
    console.log('[Maoyan] Fetching box office from piaofang...');
    try {
      await desktopPage.goto('https://piaofang.maoyan.com/dashboard', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      await desktopPage.waitForTimeout(2000);
      
      const boxOfficeItems = await desktopPage.evaluate(() => {
        const items: any[] = [];
        document.querySelectorAll('.dashboard-table tbody tr, table tbody tr').forEach((row, i) => {
          if (i >= 10 || items.length >= 10) return;
          
          const cells = row.querySelectorAll('td');
          if (cells.length < 3) return;
          
          // 第一列格式: "01阿凡达3上映4天  4.30亿"
          const firstCell = cells[0]?.textContent?.trim() || '';
          const match = firstCell.match(/^(\d+)([^\d上映]+)(?:上映(\d+)天)?\s*([\d.]+)(亿|万)?/);
          
          if (match) {
            const title = match[2].trim();
            const days = match[3] ? parseInt(match[3]) : 0;
            const boxOffice = parseFloat(match[4]) || 0;
            const unit = match[5] || '万';
            
            // 第二列是票房占比
            const shareText = cells[2]?.textContent?.trim() || '';
            const share = parseFloat(shareText.replace('%', '')) || 0;
            
            if (title && title.length > 1) {
              items.push({
                rank: items.length + 1,
                movieId: `box_${items.length}`,
                title,
                boxOffice: unit === '亿' ? boxOffice * 10000 : boxOffice,
                boxOfficeUnit: unit,
                releaseDate: days > 0 ? `上映${days}天` : '',
                poster: '',
                trend: 'same',
                share, // 票房占比
              });
            }
          }
        });
        return items;
      });
      
      if (boxOfficeItems.length > 0) {
        // 合并专业版数据（保留海报信息）
        result.boxOffice = boxOfficeItems.map((item, i) => {
          const existing = result.boxOffice[i];
          return {
            ...item,
            poster: existing?.poster || '',
          };
        });
        console.log(`[Maoyan] Got ${result.boxOffice.length} box office items from piaofang`);
      }
    } catch (e) {
      console.error('[Maoyan] Box office from piaofang error:', e);
    }
    
    // 4.2 抓取网播热度
    try {
      await desktopPage.goto('https://piaofang.maoyan.com/dashboard/web-heat', { 
        waitUntil: 'networkidle', 
        timeout: 30000 
      });
      await desktopPage.waitForTimeout(2000);
      
      // 抓取电视剧（默认显示的是电视剧+网络剧，需要点击电视剧 tab）
      console.log('[Maoyan] Fetching TV ranking...');
      try {
        // 点击"电视剧" tab
        await desktopPage.click('.webheat-nav span:nth-child(2)').catch(() => {});
        await desktopPage.waitForTimeout(1500);
        
        const tvItems = await desktopPage.evaluate(() => {
          const items: any[] = [];
          // 平台名称列表
          const platforms = ['爱奇艺', '腾讯视频', '优酷', '芒果TV', '哔哩哔哩', 'B站', '搜狐视频', '乐视', 'Netflix', '多平台'];
          
          document.querySelectorAll('.dashboard-table tbody tr, table tbody tr').forEach((row, i) => {
            if (i >= 10 || items.length >= 10) return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            
            // 第一列格式: "01老舅多平台播放  上线8天" 或 "03时差一万公里芒果TV独播  上线22天"
            const firstCell = cells[0]?.textContent?.trim() || '';
            
            // 先去掉排名数字
            let text = firstCell.replace(/^\d+/, '').trim();
            
            // 去掉 "上线X天" 及之后的内容
            text = text.split(/\s+上线/)[0].trim();
            
            // 去掉 "独播" 或 "播放" 及之后的内容
            text = text.split(/独播|播放/)[0].trim();
            
            // 去掉平台名称
            let title = text;
            for (const platform of platforms) {
              title = title.replace(platform, '');
            }
            title = title.trim();
            
            // 第二列是热度
            const heat = cells[1]?.textContent?.trim() || '';
            
            // 第三列是播放量
            const playCount = cells[2]?.textContent?.trim() || '';
            
            if (title && title.length > 1 && title.length < 50) {
              items.push({
                rank: items.length + 1,
                itemId: `tv_${items.length}`,
                title,
                score: parseFloat(heat?.replace(/[^\d.]/g, '') || '0') || 0,
                info: playCount && playCount !== '--' && !playCount.includes('关闭') ? playCount : heat,
                category: 'tv',
              });
            }
          });
          return items;
        });
        
        if (tvItems.length > 0) {
          result.tvRanking = tvItems;
          console.log(`[Maoyan] Got ${result.tvRanking.length} TV items`);
        }
      } catch (e) {
        console.error('[Maoyan] TV ranking error:', e);
      }
      
      // 抓取网络剧
      console.log('[Maoyan] Fetching web series ranking...');
      try {
        await desktopPage.click('.webheat-nav span:nth-child(3)').catch(() => {});
        await desktopPage.waitForTimeout(1500);
        
        const webItems = await desktopPage.evaluate(() => {
          const items: any[] = [];
          const platforms = ['爱奇艺', '腾讯视频', '优酷', '芒果TV', '哔哩哔哩', 'B站', '搜狐视频', '乐视', 'Netflix', '多平台'];
          
          document.querySelectorAll('.dashboard-table tbody tr, table tbody tr').forEach((row, i) => {
            if (i >= 10 || items.length >= 10) return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            
            const firstCell = cells[0]?.textContent?.trim() || '';
            
            let text = firstCell.replace(/^\d+/, '').trim();
            text = text.split(/\s+上线/)[0].trim();
            text = text.split(/独播|播放/)[0].trim();
            
            let title = text;
            for (const platform of platforms) {
              title = title.replace(platform, '');
            }
            title = title.trim();
            
            const heat = cells[1]?.textContent?.trim() || '';
            const playCount = cells[2]?.textContent?.trim() || '';
            
            if (title && title.length > 1 && title.length < 50) {
              items.push({
                rank: items.length + 1,
                itemId: `web_${items.length}`,
                title,
                score: parseFloat(heat?.replace(/[^\d.]/g, '') || '0') || 0,
                info: playCount && playCount !== '--' && !playCount.includes('关闭') ? playCount : heat,
                category: 'webSeries',
              });
            }
          });
          return items;
        });
        
        if (webItems.length > 0) {
          result.webSeriesRanking = webItems;
          console.log(`[Maoyan] Got ${result.webSeriesRanking.length} web series items`);
        }
      } catch (e) {
        console.error('[Maoyan] Web series error:', e);
      }
      
      // 抓取综艺
      console.log('[Maoyan] Fetching variety ranking...');
      try {
        await desktopPage.click('.webheat-nav span:nth-child(4)').catch(() => {});
        await desktopPage.waitForTimeout(1500);
        
        const varietyItems = await desktopPage.evaluate(() => {
          const items: any[] = [];
          const platforms = ['爱奇艺', '腾讯视频', '优酷', '芒果TV', '哔哩哔哩', 'B站', '搜狐视频', '乐视', 'Netflix', '多平台'];
          
          document.querySelectorAll('.dashboard-table tbody tr, table tbody tr').forEach((row, i) => {
            if (i >= 10 || items.length >= 10) return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length < 2) return;
            
            const firstCell = cells[0]?.textContent?.trim() || '';
            
            // 先去掉排名数字
            let text = firstCell.replace(/^\d+/, '').trim();
            
            // 去掉 "上线X天" 及之后的内容
            text = text.split(/\s+上线/)[0].trim();
            
            // 去掉 "独播" 或 "播放" 及之后的内容
            text = text.split(/独播|播放/)[0].trim();
            
            // 去掉平台名称
            let title = text;
            for (const platform of platforms) {
              title = title.replace(platform, '');
            }
            title = title.trim();
            
            const heat = cells[1]?.textContent?.trim() || '';
            const playCount = cells[2]?.textContent?.trim() || '';
            
            if (title && title.length > 1 && title.length < 50) {
              items.push({
                rank: items.length + 1,
                itemId: `var_${items.length}`,
                title,
                score: parseFloat(heat?.replace(/[^\d.]/g, '') || '0') || 0,
                info: playCount && playCount !== '--' && !playCount.includes('关闭') ? playCount : heat,
                category: 'variety',
              });
            }
          });
          return items;
        });
        
        if (varietyItems.length > 0) {
          result.varietyRanking = varietyItems;
          console.log(`[Maoyan] Got ${result.varietyRanking.length} variety items`);
        }
      } catch (e) {
        console.error('[Maoyan] Variety error:', e);
      }
      
    } catch (e) {
      console.error('[Maoyan] Piaofang web-heat error:', e);
    }
    
    await desktopContext.close();
    
    const total = result.boxOffice.length + result.calendar.length + 
                  result.tvRanking.length + result.webSeriesRanking.length + result.varietyRanking.length;
    console.log(`[Maoyan] Scrape complete: box=${result.boxOffice.length}, calendar=${result.calendar.length}, tv=${result.tvRanking.length}, web=${result.webSeriesRanking.length}, variety=${result.varietyRanking.length}, total=${total}`);
    
  } catch (error) {
    console.error('[Maoyan] Scrape error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return result;
}

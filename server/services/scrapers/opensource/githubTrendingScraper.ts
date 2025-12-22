import { chromium, Browser, Page } from 'playwright';

export interface GitHubTrendingProject {
  repoFullName: string;
  repoName: string;
  description: string;
  language: string | null;
  stars: number;
  starsToday: number;
  forks: number;
  url: string;
  rank: number;
}

export interface ScrapeOptions {
  period?: 'today' | 'week' | 'month';
  language?: string; // 'all' or specific language like 'javascript', 'typescript', etc.
}

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  return browserInstance;
}

/**
 * Scrape GitHub Trending projects
 */
export async function scrapeGitHubTrending(options: ScrapeOptions = {}): Promise<GitHubTrendingProject[]> {
  const { period = 'today', language = 'all' } = options;
  
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    // Build URL
    let url = 'https://github.com/trending';
    if (language && language !== 'all') {
      url += `/${language}`;
    }
    
    // Add period query parameter
    const periodMap: Record<string, string> = {
      today: '',
      week: '?since=weekly',
      month: '?since=monthly',
    };
    if (periodMap[period]) {
      url += periodMap[period];
    }

    const startTime = Date.now();
    console.log(`[GitHubTrending] 开始采集: ${url}`);
    
    // Use domcontentloaded for faster and more reliable loading
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000  // Increased timeout to 60 seconds
    });
    
    // Wait for the trending list to load
    await page.waitForSelector('article.Box-row', { timeout: 15000 });
    
    // Extract projects
    const projects = await page.evaluate(() => {
      const items: any[] = [];
      const articles = document.querySelectorAll('article.Box-row');
      
      articles.forEach((article, index) => {
        try {
          // Get repo name and full name
          const repoLink = article.querySelector('h2.h3 a') as HTMLAnchorElement;
          if (!repoLink) return;
          
          const repoFullName = repoLink.getAttribute('href')?.replace(/^\//, '') || '';
          const repoName = repoFullName.split('/').pop() || repoFullName;
          
          // Get description
          const descEl = article.querySelector('p.col-9.color-fg-muted.my-1.pr-4');
          const description = descEl?.textContent?.trim() || '';
          
          // Get language
          const langEl = article.querySelector('span[itemprop="programmingLanguage"]');
          const language = langEl?.textContent?.trim() || null;
          
          // Get stars (total and today)
          let stars = 0;
          let starsToday = 0;
          let forks = 0;
          
          const links = article.querySelectorAll('a.Link--muted');
          links.forEach((link) => {
            const text = link.textContent?.trim() || '';
            const href = link.getAttribute('href') || '';
            
            // Parse stars
            if (href.includes('/stargazers')) {
              const starsText = link.textContent?.trim() || '';
              const starsMatch = starsText.match(/([\d.]+)([kKmM])?/);
              if (starsMatch) {
                let num = parseFloat(starsMatch[1]);
                if (starsMatch[2] === 'k' || starsMatch[2] === 'K') num *= 1000;
                if (starsMatch[2] === 'm' || starsMatch[2] === 'M') num *= 1000000;
                stars = Math.floor(num);
              }
            }
            
            // Parse forks
            if (href.includes('/network/members')) {
              const forksText = link.textContent?.trim() || '';
              const forksMatch = forksText.match(/([\d.]+)([kKmM])?/);
              if (forksMatch) {
                let num = parseFloat(forksMatch[1]);
                if (forksMatch[2] === 'k' || forksMatch[2] === 'K') num *= 1000;
                if (forksMatch[2] === 'm' || forksMatch[2] === 'M') num *= 1000000;
                forks = Math.floor(num);
              }
            }
          });
          
          // Get stars today (from the text like "123 stars today")
          const starsTodayEl = article.querySelector('.d-inline-block.float-sm-right');
          if (starsTodayEl) {
            const starsTodayText = starsTodayEl.textContent?.trim() || '';
            const starsTodayMatch = starsTodayText.match(/([\d.]+)([kKmM])?\s+stars?\s+today/i);
            if (starsTodayMatch) {
              let num = parseFloat(starsTodayMatch[1]);
              if (starsTodayMatch[2] === 'k' || starsTodayMatch[2] === 'K') num *= 1000;
              if (starsTodayMatch[2] === 'm' || starsTodayMatch[2] === 'M') num *= 1000000;
              starsToday = Math.floor(num);
            }
          }
          
          // Get URL
          const url = `https://github.com/${repoFullName}`;
          
          if (repoFullName) {
            items.push({
              repoFullName,
              repoName,
              description,
              language,
              stars,
              starsToday,
              forks,
              url,
              rank: index + 1,
            });
          }
        } catch (error) {
          console.error(`[GitHubTrendingScraper] Error parsing item ${index}:`, error);
        }
      });
      
      return items;
    });
    
    const duration = Date.now() - startTime;
    console.log(`[GitHubTrending] 采集完成: 共 ${projects.length} 个项目，耗时 ${duration}ms`);
    return projects;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[GitHubTrending] 采集失败 (${duration}ms):`, error.message);
    throw error;
  } finally {
    await page.close();
  }
}

/**
 * Cleanup browser instance
 */
export async function cleanup(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}


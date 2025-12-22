// OpenSource service (GitHub Trending)

import { opensourceTrendingOps } from './database.js';
import { scrapeGitHubTrending, GitHubTrendingProject } from './scrapers/opensource/githubTrendingScraper.js';
import { translateToChinese } from './translationService.js';

export interface TrendingProject extends GitHubTrendingProject {
  id?: number;
  period: 'today' | 'week' | 'month';
  languageFilter: string;
  fetchedAt?: string;
}

/**
 * Refresh GitHub Trending data and save to database
 */
export async function refreshGitHubTrending(
  period: 'today' | 'week' | 'month' = 'today',
  language: string = 'all'
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const periodLabel = period === 'today' ? '今日' : period === 'week' ? '本周' : '本月';
    const langLabel = language === 'all' ? '全部' : language;
    console.log(`[OpenSource] 刷新 GitHub Trending: ${periodLabel} / ${langLabel}`);
    
    // Scrape data
    const projects = await scrapeGitHubTrending({ period, language });
    
    if (projects.length === 0) {
      console.warn(`[OpenSource] 未采集到项目: ${periodLabel} / ${langLabel}`);
      return { success: false, count: 0, error: 'No projects scraped' };
    }
    
    // Delete old data for this period and language
    opensourceTrendingOps.deleteByPeriodAndLanguage.run(period, language);
    
    // Insert new data with translation
    let insertedCount = 0;
    let errorCount = 0;
    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      try {
        // Translate description to Chinese
        let translatedDescription = project.description;
        if (project.description && project.description.trim().length > 0) {
          try {
            translatedDescription = await translateToChinese(project.description);
            // Add delay to avoid rate limiting (Baidu free tier: 1 QPS)
            // Delay 1.2 seconds between requests to stay under limit
            if (i < projects.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 1200));
            }
          } catch (translationError: any) {
            console.warn(`[OpenSource] 翻译失败 [${project.repoFullName}]:`, translationError.message);
            // Continue with original description on translation failure
          }
        }
        
        opensourceTrendingOps.upsert.run(
          project.repoFullName,
          project.repoName,
          translatedDescription,
          project.language || null,
          project.stars,
          project.starsToday,
          project.forks,
          project.url,
          period,
          language,
          project.rank
        );
        insertedCount++;
      } catch (error: any) {
        errorCount++;
        console.error(`[OpenSource] 入库失败 [${project.repoFullName}]:`, error.message);
      }
    }
    
    if (errorCount > 0) {
      console.log(`[OpenSource] 入库完成: 成功 ${insertedCount} 个，失败 ${errorCount} 个`);
    } else {
      console.log(`[OpenSource] 入库完成: 共 ${insertedCount} 个项目`);
    }
    return { success: true, count: insertedCount };
    
  } catch (error: any) {
    console.error('[OpenSourceService] Error refreshing GitHub Trending:', error.message);
    return { success: false, count: 0, error: error.message };
  }
}

/**
 * Get GitHub Trending projects from database
 */
export function getGitHubTrending(
  period: 'today' | 'week' | 'month' = 'today',
  language: string = 'all'
): TrendingProject[] {
  try {
    const results = opensourceTrendingOps.findLatest.all(period, language, language) as any[];
    
    return results.map((row) => ({
      id: row.id,
      repoFullName: row.repo_full_name,
      repoName: row.repo_name,
      description: row.description,
      language: row.language,
      stars: row.stars,
      starsToday: row.stars_today,
      forks: row.forks,
      url: row.url,
      period: row.period,
      languageFilter: row.language_filter,
      rank: row.rank,
      fetchedAt: row.fetched_at,
    }));
  } catch (error: any) {
    console.error('[OpenSourceService] Error getting GitHub Trending:', error.message);
    return [];
  }
}

/**
 * Get available languages (from database)
 */
export function getAvailableLanguages(): string[] {
  try {
    // 返回6种常用语言
    return ['all', 'javascript', 'typescript', 'python', 'go', 'java'];
  } catch (error) {
    return ['all'];
  }
}


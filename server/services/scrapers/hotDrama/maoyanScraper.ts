/**
 * 猫眼电影列表爬虫
 * 从猫眼专业版API获取电影列表数据
 */

// 网播热剧列表项接口
export interface MaoyanWebSeriesItem {
  seriesId: string;
  title: string;
  currHeat: number;
  currHeatDesc: string;
  platformDesc: string;
  releaseInfo: string;
  category?: string;
  imgUrl?: string;
  fetchedAt: string;
}

// 网播热剧列表响应接口
export interface MaoyanWebSeriesListResponse {
  series: MaoyanWebSeriesItem[];
  total: number;
  fetchedAt: string;
}

// 网播热剧详情接口
export interface MaoyanWebSeriesDetail {
  seriesId: string;
  name: string;
  category?: string;
  imgUrl?: string;
  platformDesc?: string;
  releaseInfo?: string;
  heatTrends: Array<{
    date: number;
    heat: number;
  }>;
  historyMaxHeat?: number;
  historyMaxHeatDate?: string;
  commentCount?: string;
  sumCommentCount?: string;
  fetchedAt: string;
}

// 电影列表项接口
export interface MaoyanMovieItem {
  movieId: string;
  title: string;
  releaseInfo?: string;
  boxOffice?: number;
  boxOfficeUnit?: string;
  sumBoxDesc?: string;
  sumSplitBoxDesc?: string;
  boxRate?: string;
  boxSplitRate?: string;
  showCount?: number;
  showCountRate?: string;
  avgSeatView?: string;
  avgShowView?: string;
  fetchedAt: string;
}

// 电影列表响应接口
export interface MaoyanMovieListResponse {
  movies: MaoyanMovieItem[];
  total: number;
  fetchedAt: string;
}

// 电影详情接口
export interface MaoyanMovieDetail {
  movieId: string;
  name: string;
  category?: string;
  imgUrl?: string;
  releaseInfo?: string;
  boxTrends: Array<{
    box: number;
    boxDesc: string;
    date: number;
    releaseDay: boolean;
  }>;
  fetchedAt: string;
}

/**
 * 从API获取电影列表
 */
export async function scrapeMaoyanMovieList(): Promise<MaoyanMovieListResponse> {

  // 猫眼API地址
  const apiUrl = 'https://piaofang.maoyan.com/dashboard-ajax/movie?orderType=0&uuid=19b44ef545cc8-0ccff7381598eb8-26061a51-1fa400-19b44ef545cc8&timeStamp=1766929256758&User-Agent=TW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0My4wLjAuMCBTYWZhcmkvNTM3LjM2&index=522&channelId=40009&sVersion=2&signKey=39718a00c2508873a8b7ee438c6e213f&WuKongReady=h5';

  const result: MaoyanMovieListResponse = {
    movies: [],
    total: 0,
    fetchedAt: new Date().toISOString(),
  };

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://piaofang.maoyan.com/',
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[MaoyanMovieList] API请求失败: ${response.status} ${response.statusText}`);
      return result;
    }

    const json = await response.json();

    if (json.movieList && json.movieList.list && Array.isArray(json.movieList.list)) {
      result.movies = await parseMovieList(json.movieList.list);
      result.total = result.movies.length;
      console.log(`[MaoyanMovieList] 成功获取 ${result.total} 部电影`);
    } else {
      console.warn('[MaoyanMovieList] API返回格式不符合预期');
    }
  } catch (error: any) {
    console.error('[MaoyanMovieList] 获取电影列表失败:', error.message);
  }

  return result;
}

/**
 * 解析电影列表数据并获取详情
 */
async function parseMovieList(data: any[]): Promise<MaoyanMovieItem[]> {
  const movies: MaoyanMovieItem[] = [];
  const fetchedAt = new Date().toISOString();

  // 限制并发数量，避免请求过快
  const concurrency = 5;
  for (let i = 0; i < data.length; i += concurrency) {
    const batch = data.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(item => parseMovieItem(item, fetchedAt))
    );
    movies.push(...batchResults.filter(m => m !== null) as MaoyanMovieItem[]);

    // 每批次之间稍微延迟
    if (i + concurrency < data.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return movies;
}

/**
 * 解析单个电影项并获取详情
 */
async function parseMovieItem(item: any, fetchedAt: string): Promise<MaoyanMovieItem | null> {
  try {
    const movieInfo = item.movieInfo || {};
    const movieId = movieInfo.movieId?.toString();

    if (!movieId || !movieInfo.movieName) {
      return null;
    }

    // 获取电影详情以获取明文的今日票房
    let todayBoxOffice: number | undefined = undefined;
    try {
      const detail = await scrapeMaoyanMovieDetail(movieId);
      if (detail && detail.boxTrends && detail.boxTrends.length > 0) {
        // 获取最新一天的票房数据
        const latestTrend = detail.boxTrends[detail.boxTrends.length - 1];
        todayBoxOffice = latestTrend.box; // 单位：元，需要转换为万
        if (todayBoxOffice) {
          todayBoxOffice = todayBoxOffice / 10000; // 转换为万元
        }
      }
    } catch (error) {
      console.error(`[MaoyanMovieList] 获取电影详情失败 (${movieId}):`, error);
    }

    // 调试：打印原始数据
    if (movieId === '78463' || movieId === '1142033') {
      console.log(`[MaoyanMovieList] 原始数据 (${movieId}):`, JSON.stringify(item, null, 2));
    }

    // 提取所有字段，使用 null 代替 undefined，确保 JSON 序列化时包含所有字段
    const movie: any = {
      movieId,
      title: movieInfo.movieName || '',
      releaseInfo: movieInfo.releaseInfo || null,
      boxOffice: todayBoxOffice ?? null,
      boxOfficeUnit: '万',
      sumBoxDesc: item.sumBoxDesc || null,
      sumSplitBoxDesc: item.sumSplitBoxDesc || null,
      boxRate: item.boxRate || null,
      boxSplitRate: item.splitBoxRate || null,
      showCount: item.showCount !== undefined && item.showCount !== null ? Number(item.showCount) : null,
      showCountRate: item.showCountRate || null,
      avgSeatView: item.avgSeatView || null,
      avgShowView: item.avgShowView || null,
      fetchedAt,
    };

    // 调试：打印原始数据（仅前两部电影）
    if (movieId === '78463' || movieId === '1142033') {
      console.log(`[MaoyanMovieList] 原始item数据 (${movieId}):`, {
        sumBoxDesc: item.sumBoxDesc,
        sumSplitBoxDesc: item.sumSplitBoxDesc,
        boxRate: item.boxRate,
        splitBoxRate: item.splitBoxRate,
        showCount: item.showCount,
        showCountRate: item.showCountRate,
        avgSeatView: item.avgSeatView,
        avgShowView: item.avgShowView,
        movieInfo: item.movieInfo,
        fullItem: item,
      });
      console.log(`[MaoyanMovieList] 构建后的movie对象 (${movieId}):`, movie);
    }

    return movie as MaoyanMovieItem;

    // 调试：打印构建后的对象
    if (movieId === '78463' || movieId === '1142033') {
      console.log(`[MaoyanMovieList] 构建后的对象 (${movieId}):`, JSON.stringify(movie, null, 2));
    }

    return movie;
  } catch (error) {
    console.error('[MaoyanMovieList] 解析单条电影数据失败:', error);
    return null;
  }
}

/**
 * 获取电影详情
 */
export async function scrapeMaoyanMovieDetail(movieId: string, showDate?: string): Promise<MaoyanMovieDetail | null> {

  // 如果没有提供日期，使用今天的日期
  if (!showDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    showDate = `${year}${month}${day}`;
  }

  const apiUrl = `https://piaofang.maoyan.com/dashboard/ajax-moviedetail?showDate=${showDate}&movieId=${movieId}&WuKongReady=h5`;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://piaofang.maoyan.com/',
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[MaoyanMovieDetail] API请求失败: ${response.status} ${response.statusText}`);
      return null;
    }

    const json = await response.json();

    if (json.success && json.data) {
      const data = json.data;
      const movieInfo = data.movieInfo || {};

      const detail: MaoyanMovieDetail = {
        movieId: movieInfo.movieId?.toString() || movieId,
        name: movieInfo.name || '',
        category: movieInfo.category || undefined,
        imgUrl: movieInfo.imgUrl || undefined,
        releaseInfo: movieInfo.releaseInfo || undefined,
        boxTrends: (data.boxTrends || []).map((trend: any) => ({
          box: trend.box || 0,
          boxDesc: trend.boxDesc || '',
          date: trend.date || 0,
          releaseDay: trend.releaseDay || false,
        })),
        fetchedAt: new Date().toISOString(),
      };
      return detail;
    } else {
      console.warn('[MaoyanMovieDetail] API返回格式不符合预期');
      return null;
    }
  } catch (error: any) {
    console.error('[MaoyanMovieDetail] 获取电影明细失败:', error.message);
    return null;
  }
}

/**
 * 从API获取网播热剧列表
 */
export async function scrapeMaoyanWebSeriesList(): Promise<MaoyanWebSeriesListResponse> {
  // 获取今天的日期
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const showDate = `${year}${month}${day}`;

  // 构建API URL（简化版，去掉一些动态参数）
  const apiUrl = `https://piaofang.maoyan.com/dashboard/webHeatData?showDate=${showDate}&WuKongReady=h5`;

  const result: MaoyanWebSeriesListResponse = {
    series: [],
    total: 0,
    fetchedAt: new Date().toISOString(),
  };

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://piaofang.maoyan.com/',
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[MaoyanWebSeriesList] API请求失败: ${response.status} ${response.statusText}`);
      return result;
    }

    const json = await response.json();

    if (json.status && json.dataList && json.dataList.list && Array.isArray(json.dataList.list)) {
      result.series = parseWebSeriesList(json.dataList.list);
      result.total = result.series.length;
      console.log(`[MaoyanWebSeriesList] 成功获取 ${result.total} 部网播热剧`);
    } else {
      console.warn('[MaoyanWebSeriesList] API返回格式不符合预期');
    }
  } catch (error: any) {
    console.error('[MaoyanWebSeriesList] 获取网播热剧列表失败:', error.message);
  }

  return result;
}

/**
 * 解析网播热剧列表数据
 */
function parseWebSeriesList(data: any[]): MaoyanWebSeriesItem[] {
  const series: MaoyanWebSeriesItem[] = [];
  const fetchedAt = new Date().toISOString();

  for (const item of data) {
    try {
      const seriesInfo = item.seriesInfo || {};
      const seriesId = seriesInfo.seriesId?.toString();

      if (!seriesId || !seriesInfo.name) {
        continue;
      }

      series.push({
        seriesId,
        title: seriesInfo.name || '',
        currHeat: item.currHeat || 0,
        currHeatDesc: item.currHeatDesc || '',
        platformDesc: seriesInfo.platformDesc || '',
        releaseInfo: seriesInfo.releaseInfo || '',
        category: seriesInfo.category || undefined,
        imgUrl: seriesInfo.imgUrl || undefined,
        fetchedAt,
      });
    } catch (error) {
      console.error('[MaoyanWebSeriesList] 解析单条网播热剧数据失败:', error);
    }
  }

  return series;
}

/**
 * 获取网播热剧详情
 */
export async function scrapeMaoyanWebSeriesDetail(seriesId: string, showDate?: string): Promise<MaoyanWebSeriesDetail | null> {
  // 如果没有提供日期，使用今天的日期
  if (!showDate) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    showDate = `${year}${month}${day}`;
  }

  const apiUrl = `https://piaofang.maoyan.com/dashboard/getWebDetail?showDate=${showDate}&platformType=0&seriesId=${seriesId}&WuKongReady=h5`;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://piaofang.maoyan.com/',
    };

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`[MaoyanWebSeriesDetail] API请求失败: ${response.status} ${response.statusText}`);
      return null;
    }

    const json = await response.json();

    if (json.status && json.data) {
      const data = json.data;
      const seriesInfo = data.seriesInfo || {};

      const detail: MaoyanWebSeriesDetail = {
        seriesId: seriesInfo.seriesId?.toString() || seriesId,
        name: seriesInfo.name || '',
        category: seriesInfo.category || undefined,
        imgUrl: seriesInfo.imgUrl || undefined,
        platformDesc: seriesInfo.platformDesc || undefined,
        releaseInfo: seriesInfo.releaseInfo || undefined,
        heatTrends: (data.heatTrends || []).map((trend: any) => ({
          date: trend.date || 0,
          heat: trend.heat || 0,
        })),
        historyMaxHeat: data.historyMaxHeat,
        historyMaxHeatDate: data.historyMaxHeatDate,
        commentCount: data.commentCount,
        sumCommentCount: data.sumCommentCountSplitUnit ? `${data.sumCommentCountSplitUnit.num}${data.sumCommentCountSplitUnit.unit}` : undefined,
        fetchedAt: new Date().toISOString(),
      };
      return detail;
    } else {
      console.warn('[MaoyanWebSeriesDetail] API返回格式不符合预期');
      return null;
    }
  } catch (error: any) {
    console.error('[MaoyanWebSeriesDetail] 获取网播热剧明细失败:', error.message);
    return null;
  }
}

/**
 * 猫眼电影列表爬虫
 * 从猫眼专业版API获取电影列表数据
 */

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
 * 猫眼自定义字体字符映射表
 * 猫眼使用自定义字体来混淆数字，需要建立映射关系
 */
const MAOYAN_FONT_MAP: { [key: string]: string } = {
  '\ue3ec': '0',
  '\uedba': '1',
  '\ued30': '2',
  '\uef28': '3',
  '\uf11c': '4',
  '\ueb19': '5',
  '\uf3e8': '6',
  '\uf7d2': '7',
  '\uf70e': '8',
  '\uf7b3': '9',
};

/**
 * 解码猫眼自定义字体数字
 */
function decodeMaoyanFont(text: string): string {
  let result = text;
  for (const [customChar, digit] of Object.entries(MAOYAN_FONT_MAP)) {
    result = result.split(customChar).join(digit);
  }
  return result;
}

/**
 * 解码HTML实体编码的数字
 */
function decodeHtmlNumber(htmlNum: string): number | null {
  if (!htmlNum) return null;

  try {
    console.log('[decodeHtmlNumber] 原始HTML实体:', htmlNum);

    // HTML实体格式：&#xXXXX; (十六进制) 或 &#DDDD; (十进制)
    let decoded = htmlNum;

    // 解码十六进制实体 (&#xXXXX;)
    decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const charCode = parseInt(hex, 16);
      return String.fromCharCode(charCode);
    });

    // 解码十进制实体 (&#DDDD;)
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      const charCode = parseInt(dec, 10);
      return String.fromCharCode(charCode);
    });

    console.log('[decodeHtmlNumber] HTML解码后:', decoded, '字符码:', Array.from(decoded).map(c => c.charCodeAt(0).toString(16)));

    // 应用猫眼自定义字体映射
    const fontDecoded = decodeMaoyanFont(decoded);
    console.log('[decodeHtmlNumber] 字体映射后:', fontDecoded);

    // 提取数字（包括小数点）
    const match = fontDecoded.match(/[\d.]+/);
    if (match) {
      const result = parseFloat(match[0]);
      console.log('[decodeHtmlNumber] 提取的数字:', result);
      return result;
    }
    console.log('[decodeHtmlNumber] 未找到数字');
    return null;
  } catch (e) {
    console.error('[MaoyanMovieList] 解码HTML数字失败:', e);
    return null;
  }
}

/**
 * 从API获取电影列表
 */
export async function scrapeMaoyanMovieList(): Promise<MaoyanMovieListResponse> {
  console.log('[MaoyanMovieList] 开始获取电影列表...');

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

    const movie: MaoyanMovieItem = {
      movieId,
      title: movieInfo.movieName || '',
      releaseInfo: movieInfo.releaseInfo || undefined,
      boxOffice: todayBoxOffice,
      boxOfficeUnit: '万',
      sumBoxDesc: item.sumBoxDesc || undefined,
      sumSplitBoxDesc: item.sumSplitBoxDesc || undefined,
      boxRate: item.boxRate || undefined,
      boxSplitRate: item.splitBoxRate || undefined,
      showCount: item.showCount || undefined,
      showCountRate: item.showCountRate || undefined,
      avgSeatView: item.avgSeatView || undefined,
      avgShowView: item.avgShowView || undefined,
      fetchedAt,
    };

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
  console.log(`[MaoyanMovieDetail] 开始获取电影明细: movieId=${movieId}`);

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

      console.log(`[MaoyanMovieDetail] 成功获取电影明细: ${detail.name}`);
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

// 通用排行列表项接口
export interface BaseRankingItem {
  id: string; // movieId 或 seriesId
  title: string;
  releaseInfo?: string;
  platformDesc?: string;
  category?: string;
  imgUrl?: string;
  // 类型标识（用于区分电视剧和网络剧）
  type?: 'tv' | 'webSeries' | 'variety';
  // 电影特有
  boxOffice?: number;
  sumBoxDesc?: string;
  sumSplitBoxDesc?: string;
  boxRate?: string;
  showCountRate?: string;
  avgSeatView?: string;
  // 网剧/综艺特有
  currHeat?: number;
  currHeatDesc?: string;
}

// 电影列表项接口
export interface MaoyanMovieItem extends BaseRankingItem {
  movieId: string;
  boxOfficeUnit?: string;
  boxSplitRate?: string;
  showCount?: number;
  avgShowView?: string;
  fetchedAt: string;
}

// 网播热剧/综艺列表项接口
export interface MaoyanWebSeriesItem extends BaseRankingItem {
  seriesId: string;
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

// 网播热剧/综艺详情接口
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

// 趋势数据点
export interface TrendDataPoint {
  date: number;
  value: number; // box 或 heat
  label?: string; // boxDesc 或 heat 的格式化显示
}

// B站视频项
export interface BilibiliVideoItem {
  id?: string;
  bvid?: string;
  title: string;
  cover?: string;
  url?: string;
  duration?: string | number;
  author?: {
    name?: string;
  };
  stats?: {
    views?: number;
  };
}

// 微博评论项
export interface WeiboCommentItem {
  id?: string;
  text: string;
  url?: string;
  publishTime?: string;
  publishFrom?: string;
  author?: {
    name?: string;
    avatar?: string;
  };
  images?: string[];
  stats?: {
    reposts?: number;
    comments?: number;
    likes?: number;
  };
  isRepost?: boolean;
  originalWeibo?: {
    author?: string;
    text?: string;
  };
}

// 小红书评论项
export interface XiaohongshuCommentItem {
  id?: string;
  title: string;
  desc?: string;
  cover?: string;
  url?: string;
  type?: 'video' | 'image';
  author?: {
    name?: string;
    avatar?: string;
  };
  stats?: {
    likes?: number;
    comments?: number;
    collects?: number;
  };
}


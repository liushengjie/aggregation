/**
 * 常量定义
 */

// 平台名称
export const PLATFORM_NAMES = {
  Weibo: '微博',
  Xiaohongshu: '小红书',
  Bilibili: '哔哩哔哩',
  Douyin: '抖音'
}

// 平台颜色
export const PLATFORM_COLORS = {
  Weibo: '#E6162D',
  Xiaohongshu: '#FF2442',
  Bilibili: '#00A1D6',
  Douyin: '#000000'
}

// 内容分类
export const CATEGORIES = [
  { id: 'all', name: '全部', icon: 'grid' },
  { id: 'entertainment', name: '影视娱乐', icon: 'film' },
  { id: 'gaming', name: '游戏电竞', icon: 'gamepad' },
  { id: 'tech', name: '科技数码', icon: 'cpu' },
  { id: 'food', name: '美食生活', icon: 'utensils' },
  { id: 'travel', name: '旅游出行', icon: 'map' },
  { id: 'fashion', name: '时尚美妆', icon: 'sparkles' },
  { id: 'sports', name: '体育健身', icon: 'trophy' },
  { id: 'finance', name: '财经商业', icon: 'trending' },
  { id: 'society', name: '社会热点', icon: 'newspaper' },
  { id: 'other', name: '其他', icon: 'grid' }
]

// 格式化数字
export const formatNumber = (num) => {
  if (!num) return '0'
  if (num > 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num > 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

// 格式化时间
export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  
  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前'
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前'
  } else if (diff < 7 * day) {
    return Math.floor(diff / day) + '天前'
  } else {
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }
}


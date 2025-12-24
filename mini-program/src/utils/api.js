/**
 * 小程序 API 工具函数
 * 适配 uni-app 的请求方式
 */

// API 基础 URL
const getApiBase = () => {
  // 判断是否为开发环境
  // 可以通过环境变量或手动切换
  // 暂时强制使用本地，改为 false 切换回生产环境
  const isDev = process.env.NODE_ENV === 'development' || true
  
  // #ifdef MP-WEIXIN
  // 小程序环境，使用配置的 API 地址
  // 开发环境：使用本地接口（需要在微信开发者工具中设置"不校验合法域名"）
  // 生产环境：使用线上接口（需要在微信公众平台配置服务器域名）
  
  if (isDev) {
    // 开发环境：使用本地接口
    // 注意：需要在微信开发者工具中设置"不校验合法域名"
    return 'http://localhost:3351/api'
    // 如果 localhost 不行，可以尝试使用本机 IP 地址
    // return 'http://192.168.x.x:3351/api' // 替换为你的本机 IP
  } else {
    // 生产环境：使用线上接口
    return 'https://prism.xin/api'
  }
  // #endif
  
  // #ifndef MP-WEIXIN
  // 非小程序环境（H5等）
  return isDev ? 'http://localhost:3351/api' : 'https://prism.xin/api'
  // #endif
}

const API_BASE = getApiBase()

/**
 * 通用请求函数
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  console.log('发起请求:', url, options)
  
  try {
    const response = await uni.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      timeout: options.timeout || 15000,
      // 小程序特定配置
      // #ifdef MP-WEIXIN
      sslVerify: false, // 开发环境不验证SSL证书
      // #endif
    })
    
    console.log('请求响应:', response)
    
    // 检查响应状态
    if (response.statusCode !== 200) {
      const errorMsg = response.data?.error || `请求失败: ${response.statusCode}`
      console.error('API请求失败:', errorMsg, response)
      throw new Error(errorMsg)
    }
    
    return response.data
  } catch (error) {
    console.error('API请求失败:', error)
    console.error('请求URL:', url)
    console.error('错误详情:', JSON.stringify(error, null, 2))
    
    // 提供更友好的错误信息
    let errorMessage = '网络请求失败'
    if (error.errMsg) {
      if (error.errMsg.includes('timeout')) {
        errorMessage = '请求超时，请检查网络连接'
      } else if (error.errMsg.includes('fail')) {
        errorMessage = '网络连接失败'
      } else if (error.errMsg.includes('abort')) {
        errorMessage = '请求被中止'
      }
    }
    
    // 不显示弹窗，只在控制台输出，避免干扰用户体验
    console.warn('请求失败提示:', errorMessage)
    
    throw error
  }
}

// 构建查询参数字符串
const buildQueryString = (params) => {
  const parts = []
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    }
  }
  return parts.length > 0 ? '?' + parts.join('&') : ''
}

// 公开数据 API
export const publicItemsApi = {
  getAll: (page = 1, limit = 30, platform, category) => {
    const params = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    if (platform) params.platform = platform
    if (category) params.category = category
    
    return request(`/global-focus/public${buildQueryString(params)}`)
  },
  
  getByPlatform: (platform, page = 1, limit = 30, category) => {
    const params = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    if (category) params.category = category
    
    return request(`/global-focus/public/${platform}${buildQueryString(params)}`)
  },
  
  getCounts: () => {
    return request('/global-focus/public/counts')
  }
}

// 用户数据 API
export const globalFocusApi = {
  getAll: (page = 1, limit = 30, platform, category) => {
    const params = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    if (platform) params.platform = platform
    if (category) params.category = category
    
    return request(`/global-focus${buildQueryString(params)}`)
  },
  
  getByPlatform: (platform, page = 1, limit = 30, category) => {
    const params = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    if (category) params.category = category
    
    return request(`/global-focus/${platform}${buildQueryString(params)}`)
  }
}

// 热剧 API
export const hotDramaApi = {
  getAll: (page = 1, limit = 30, mediaType, search) => {
    const params = {}
    if (page) params.page = page
    if (limit) params.limit = limit
    if (mediaType) params.mediaType = mediaType
    if (search) params.search = search
    
    return request(`/hot-drama${buildQueryString(params)}`)
  },
  
  getBoxOffice: () => {
    return request('/hot-drama/box-office')
  }
}

// 热榜 API
export const hotTrendsApi = {
  getMeta: () => {
    return request('/hot-trends/meta')
  },
  
  getTrends: (platformId, categoryId) => {
    const params = {}
    if (categoryId) params.category = categoryId
    
    return request(`/hot-trends/${platformId}${buildQueryString(params)}`)
  }
}

// 图片代理
// 小程序环境下会自动使用本地接口（如果 isDev = true）
// 图片代理地址会根据 API_BASE 自动切换（本地或生产环境）
export const getImageProxyUrl = (imageUrl) => {
  if (!imageUrl) return ''
  
  // 使用当前配置的 API_BASE（已经根据环境自动切换）
  // 小程序开发环境：http://localhost:3351/api/image/proxy
  // 小程序生产环境：https://prism.xin/api/image/proxy
  const proxyUrl = `${API_BASE}/image/proxy?url=${encodeURIComponent(imageUrl)}`
  console.log('图片代理地址:', proxyUrl)
  return proxyUrl
}


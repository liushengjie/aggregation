/**
 * 小程序配置管理
 */

export const CONFIG = {
  // Webview URL配置
  webview: {
    production: 'https://prism.xin',
    development: 'http://localhost:3350'
  },
  
  // API配置
  api: {
    baseUrl: 'https://prism.xin/api',
    timeout: 10000
  },
  
  // 小程序配置
  miniProgram: {
    version: '1.0.0',
    enableUpdateCheck: true,
    enableAnalytics: true
  }
}

/**
 * 获取Webview URL
 */
export const getWebviewUrl = () => {
  // #ifdef MP-WEIXIN
  // 小程序环境
  // 开发环境可以使用本地地址，生产环境必须使用HTTPS
  const isDev = process.env.NODE_ENV === 'development'
  return isDev ? CONFIG.webview.development : CONFIG.webview.production
  // #endif
  
  // #ifndef MP-WEIXIN
  return CONFIG.webview.production
  // #endif
}

/**
 * 获取API基础URL
 */
export const getApiBaseUrl = () => {
  return CONFIG.api.baseUrl
}

/**
 * 检查是否为生产环境
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production'
}


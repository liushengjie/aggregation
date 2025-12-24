import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 应用状态
    isReady: false,
    loading: false,
    
    // 用户信息
    userInfo: null,
    isLoggedIn: false,
    
    // Webview状态
    webviewReady: false,
    webviewUrl: '',
    
    // 配置信息
    config: {
      version: '1.0.0',
      updateAvailable: false
    }
  }),
  
  getters: {
    // 是否已登录
    hasUser: (state) => !!state.userInfo,
    
    // 是否可以使用Webview
    canUseWebview: (state) => state.webviewReady && state.webviewUrl
  },
  
  actions: {
    // 设置应用就绪状态
    setReady(ready) {
      this.isReady = ready
    },
    
    // 设置加载状态
    setLoading(loading) {
      this.loading = loading
    },
    
    // 设置用户信息
    setUserInfo(userInfo) {
      this.userInfo = userInfo
      this.isLoggedIn = !!userInfo
    },
    
    // 清除用户信息
    clearUserInfo() {
      this.userInfo = null
      this.isLoggedIn = false
    },
    
    // 设置Webview状态
    setWebviewReady(ready) {
      this.webviewReady = ready
    },
    
    // 设置Webview URL
    setWebviewUrl(url) {
      this.webviewUrl = url
    },
    
    // 检查更新
    async checkUpdate() {
      // 小程序更新检查逻辑
      const updateManager = uni.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          this.config.updateAvailable = true
        }
      })
      
      updateManager.onUpdateReady(() => {
        uni.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
    }
  }
})


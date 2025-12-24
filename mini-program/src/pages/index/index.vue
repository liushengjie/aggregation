<template>
  <view class="container">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-left">
        <view class="logo">
          <text class="logo-text">棱镜</text>
        </view>
        <text class="title">棱镜聚合</text>
      </view>
      <view class="nav-right">
        <button class="nav-btn" @tap="handleRefresh" :disabled="refreshing">
          <text class="nav-btn-text">{{ refreshing ? '刷新中' : '刷新' }}</text>
        </button>
      </view>
    </view>
    
    <!-- Webview容器 -->
    <web-view 
      class="webview"
      :src="webviewUrl"
      :webview-styles="webviewStyles"
      @message="onWebviewMessage"
      @error="onWebviewError"
      @load="onWebviewLoad"
    />
    
    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <button class="bar-btn" @tap="handleGoHome">
        <text class="bar-btn-icon">🏠</text>
        <text class="bar-btn-text">首页</text>
      </button>
      <button class="bar-btn" @tap="handleGoBack">
        <text class="bar-btn-icon">◀</text>
        <text class="bar-btn-text">后退</text>
      </button>
      <button class="bar-btn" @tap="handleShare">
        <text class="bar-btn-icon">📤</text>
        <text class="bar-btn-text">分享</text>
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getWebviewUrl } from '@/utils/config.js'
import { webviewBridge } from '@/utils/webview.js'

// 响应式数据
const webviewUrl = ref('')
const loading = ref(true)
const refreshing = ref(false)
const webviewContext = ref(null)

// Webview配置
const webviewStyles = ref({
  progress: {
    color: '#667eea'
  },
  scroll: true,
  downRefresh: false,
  upRefresh: false
})

// 页面初始化
onMounted(() => {
  // 获取Webview URL
  webviewUrl.value = getWebviewUrl()
  console.log('Webview URL:', webviewUrl.value)
  
  // 注册消息处理器
  webviewBridge.onMessage('webview-ready', (data) => {
    console.log('Webview准备就绪:', data)
    loading.value = false
  })
})

onUnmounted(() => {
  // 清理
})

// Webview事件处理
const onWebviewLoad = (e) => {
  console.log('Webview加载完成', e)
  loading.value = false
  refreshing.value = false
}

const onWebviewError = (e) => {
  console.error('Webview加载失败', e)
  loading.value = false
  refreshing.value = false
  
  uni.showToast({
    title: '加载失败，请重试',
    icon: 'none',
    duration: 2000
  })
}

const onWebviewMessage = (e) => {
  console.log('收到Webview消息', e.detail)
  const data = e.detail.data || e.detail
  webviewBridge.handleMessage(data)
}

// 操作方法
const handleRefresh = () => {
  refreshing.value = true
  // 重新加载Webview
  webviewUrl.value = getWebviewUrl() + '?t=' + Date.now()
  
  // 或者通过消息通知Web应用刷新
  webviewBridge.refresh()
}

const handleGoHome = () => {
  // 通知Web应用返回首页
  webviewBridge.goHome()
  
  uni.showToast({
    title: '返回首页',
    icon: 'none',
    duration: 1000
  })
}

const handleGoBack = () => {
  // 通知Web应用后退
  webviewBridge.postMessage({
    type: 'goBack'
  })
}

const handleShare = () => {
  // 小程序分享功能
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  
  uni.showToast({
    title: '点击右上角分享',
    icon: 'none',
    duration: 2000
  })
}

// 分享给朋友
const onShareAppMessage = () => {
  return {
    title: '棱镜聚合 - 全网实时热点',
    path: '/pages/index/index',
    imageUrl: '/static/images/share.png'
  }
}

// 分享到朋友圈
const onShareTimeline = () => {
  return {
    title: '棱镜聚合 - 全网实时热点',
    imageUrl: '/static/images/share.png'
  }
}
</script>

<style scoped>
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.custom-nav {
  height: 44px;
  padding: 0 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: relative;
  z-index: 100;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-text {
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.title {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.nav-right {
  display: flex;
  align-items: center;
}

.nav-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-btn:disabled {
  opacity: 0.5;
}

.nav-btn-text {
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.webview {
  flex: 1;
  width: 100%;
}

.bottom-bar {
  height: 50px;
  background: white;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 10px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  position: relative;
  z-index: 100;
}

.bar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5px 15px;
  background: none;
  border: none;
  color: #666;
  font-size: 12px;
  min-width: 60px;
}

.bar-btn-icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.bar-btn-text {
  font-size: 10px;
  color: #666;
}
</style>


<template>
  <view class="app">
    <!-- 全局加载状态 -->
    <view v-if="globalLoading" class="loading-overlay">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

// 全局状态
const globalLoading = ref(false)

// 小程序启动
onLaunch(() => {
  console.log('小程序启动')
  globalLoading.value = true
  
  // 检查更新
  if (uni.canIUse('getUpdateManager')) {
    const updateManager = uni.getUpdateManager()
    updateManager.onCheckForUpdate((res) => {
      if (res.hasUpdate) {
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
    })
  }
  
  // 初始化完成后隐藏加载
  setTimeout(() => {
    globalLoading.value = false
  }, 1000)
})

// 小程序显示
onShow(() => {
  console.log('小程序显示')
})

// 小程序隐藏
onHide(() => {
  console.log('小程序隐藏')
})
</script>

<style>
.app {
  height: 100vh;
  overflow: hidden;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #667eea;
  font-size: 14px;
  font-weight: 500;
}
</style>


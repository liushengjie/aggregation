<template>
  <view class="tab-bar-placeholder"></view>
  <view class="tab-bar">
    <view 
      class="tab-item" 
      v-for="(item, index) in list" 
      :key="index"
      :class="{ active: current === index }"
      @tap="switchTab(item, index)"
    >
      <view class="icon-box">
        <!-- Focus Icon -->
        <svg v-if="item.type === 'focus'" class="tab-svg" viewBox="0 0 24 24" width="24" height="24" :fill="current === index ? '#6366f1' : '#94a3b8'">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
        
        <!-- Trends Icon -->
        <svg v-if="item.type === 'trends'" class="tab-svg" viewBox="0 0 24 24" width="24" height="24" :fill="current === index ? '#6366f1' : '#94a3b8'">
          <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
        </svg>
        
        <!-- Drama Icon -->
        <svg v-if="item.type === 'drama'" class="tab-svg" viewBox="0 0 24 24" width="24" height="24" :fill="current === index ? '#6366f1' : '#94a3b8'">
          <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
        </svg>
        
        <!-- Code Icon -->
        <svg v-if="item.type === 'code'" class="tab-svg" viewBox="0 0 24 24" width="24" height="24" :fill="current === index ? '#6366f1' : '#94a3b8'">
          <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
        </svg>
      </view>
      <text class="tab-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: {
    type: Number,
    default: 0
  }
})

const list = [
  {
    pagePath: "/pages/index/index",
    text: "聚焦",
    type: "focus"
  },
  {
    pagePath: "/pages/hot-trends/index",
    text: "热榜",
    type: "trends"
  },
  {
    pagePath: "/pages/hot-drama/index",
    text: "热剧",
    type: "drama"
  },
  {
    pagePath: "/pages/open-source/index",
    text: "开源",
    type: "code"
  }
]

const switchTab = (item, index) => {
  if (props.current === index) return
  uni.switchTab({
    url: item.pagePath
  })
}
</script>

<style scoped>
.tab-bar-placeholder {
  height: calc(100rpx + env(safe-area-inset-bottom));
}

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(100rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  z-index: 9999;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.02);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  position: relative;
}

.icon-box {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  transition: all 0.3s;
}

.tab-item.active .icon-box {
  background: rgba(99, 102, 241, 0.1);
}

.tab-svg {
  width: 48rpx;
  height: 48rpx;
  transition: all 0.3s;
}

.tab-text {
  font-size: 20rpx;
  color: #94a3b8;
  font-weight: 600;
  transition: all 0.3s;
}

.tab-item.active .tab-text {
  color: #6366f1;
  font-weight: 700;
}
</style>

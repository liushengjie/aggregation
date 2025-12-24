<template>
  <view class="error-container">
    <view class="error-icon">⚠️</view>
    <text class="error-title">{{ title }}</text>
    <text class="error-message">{{ message }}</text>
    <button class="error-button" @tap="handleRetry">重试</button>
  </view>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '加载失败'
  },
  message: {
    type: String,
    default: '网络连接异常，请检查网络后重试'
  }
})

const emit = defineEmits(['retry'])

const handleRetry = () => {
  emit('retry')
}
</script>

<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 400px;
  gap: 16px;
}

.error-icon {
  font-size: 64px;
  margin-bottom: 8px;
}

.error-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  color: #666;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 24px;
}

.error-button {
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
}
</style>


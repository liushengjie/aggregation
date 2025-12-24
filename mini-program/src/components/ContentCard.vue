<template>
  <view class="content-card" @tap="handleTap">
    <!-- 图片区域 -->
    <view class="card-image-wrapper" v-if="item.thumbnail && !imageError">
      <image
        class="card-image"
        :src="imageUrl"
        mode="aspectFill"
        :lazy-load="true"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <view class="card-image-placeholder" v-if="!imageLoaded">
        <text class="placeholder-text">加载中...</text>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <view class="card-content">
      <!-- 平台标签 -->
      <view class="platform-badge" :style="{ background: platformColor }">
        <text class="platform-name">{{ platformName }}</text>
      </view>
      
      <!-- 标题 -->
      <text class="card-title">{{ item.title }}</text>
      
      <!-- 作者和统计 -->
      <view class="card-meta">
        <text class="card-author">{{ item.author || '未知' }}</text>
        <view class="card-stats">
          <text class="stat-item" v-if="item.stats?.likes">
            ❤️ {{ formatNumber(item.stats.likes) }}
          </text>
          <text class="stat-item" v-if="item.stats?.comments">
            💬 {{ formatNumber(item.stats.comments) }}
          </text>
          <text class="stat-item" v-if="item.stats?.views">
            👁️ {{ formatNumber(item.stats.views) }}
          </text>
        </view>
      </view>
      
      <!-- 标签 -->
      <view class="card-tags" v-if="item.tags && item.tags.length > 0">
        <text
          class="tag-item"
          v-for="(tag, index) in item.tags.slice(0, 3)"
          :key="index"
        >
          #{{ tag }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PLATFORM_NAMES, PLATFORM_COLORS } from '@/utils/constants.js'
import { formatNumber } from '@/utils/constants.js'
import { getImageProxyUrl } from '@/utils/api.js'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['tap'])

const imageLoaded = ref(false)
const imageError = ref(false)

const platformName = computed(() => {
  return PLATFORM_NAMES[props.item.platform] || props.item.platform
})

const platformColor = computed(() => {
  return PLATFORM_COLORS[props.item.platform] || '#666'
})

const imageUrl = computed(() => {
  if (!props.item.thumbnail) return ''
  return getImageProxyUrl(props.item.thumbnail)
})

const handleImageLoad = () => {
  imageLoaded.value = true
}

const handleImageError = () => {
  imageError.value = true
  imageLoaded.value = false
}

const handleTap = () => {
  emit('tap', props.item)
}
</script>

<style scoped>
.content-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  height: 400rpx;
  overflow: hidden;
  background: #f0f0f0;
}

.card-image {
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.card-image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.placeholder-text {
  color: #999;
  font-size: 24rpx;
}

.card-content {
  padding: 24rpx;
}

.platform-badge {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  margin-bottom: 16rpx;
}

.platform-name {
  color: white;
  font-size: 22rpx;
  font-weight: bold;
}

.card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-author {
  font-size: 24rpx;
  color: #666;
}

.card-stats {
  display: flex;
  gap: 16rpx;
}

.stat-item {
  font-size: 22rpx;
  color: #999;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  font-size: 22rpx;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
</style>


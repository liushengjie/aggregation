<template>
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <text class="nav-title">全网热剧</text>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleRefresh" :class="{ refreshing: refreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- Tab切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'tv' }"
        @tap="handleTabChange('tv')"
      >
        <text class="tab-text">电视剧</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'movie' }"
        @tap="handleTabChange('movie')"
      >
        <text class="tab-text">电影</text>
      </view>
    </view>
    
    <!-- 内容列表 -->
    <scroll-view
      class="content-scroll"
      scroll-y="true"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="handlePullRefresh"
      @scrolltolower="handleLoadMore"
    >
      <view class="content-list">
        <view
          class="drama-card"
          v-for="(drama, index) in dramas"
          :key="drama.id"
          @tap="handleDramaTap(drama)"
        >
          <image
            class="drama-poster"
            :src="getPosterUrl(drama.poster_path)"
            mode="aspectFill"
            :lazy-load="true"
          />
          <view class="drama-info">
            <text class="drama-title">{{ drama.title }}</text>
            <text class="drama-original" v-if="drama.original_title && drama.original_title !== drama.title">
              {{ drama.original_title }}
            </text>
            <view class="drama-meta">
              <text class="meta-item" v-if="drama.release_date">
                📅 {{ formatDate(drama.release_date) }}
              </text>
              <text class="meta-item" v-if="drama.vote_average">
                ⭐ {{ drama.vote_average.toFixed(1) }}
              </text>
              <text class="meta-item" v-if="drama.current_episode">
                第{{ drama.current_episode }}集
              </text>
            </view>
            <text class="drama-overview" v-if="drama.overview">
              {{ drama.overview }}
            </text>
          </view>
        </view>
        
        <!-- 加载更多 -->
        <view class="loading-more" v-if="loadingMore">
          <text class="loading-text">加载中...</text>
        </view>
        
        <!-- 没有更多 -->
        <view class="no-more" v-if="!hasMore && dramas.length > 0">
          <text class="no-more-text">没有更多了</text>
        </view>
        
        <!-- 空状态 -->
        <view class="empty-state" v-if="!loading && dramas.length === 0">
          <text class="empty-text">暂无内容</text>
        </view>
      </view>
    </scroll-view>
    
    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="loading && dramas.length === 0">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { hotDramaApi } from '@/utils/api.js'

const dramas = ref([])
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const activeTab = ref('tv')
const itemsPerPage = 30

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}年${month}月${day}日`
  } catch (e) {
    return dateString
  }
}

// 获取海报URL
const getPosterUrl = (posterPath) => {
  if (!posterPath) return '/static/images/logo-icon-64.png'
  if (posterPath.startsWith('http')) return posterPath
  return `https://image.tmdb.org/t/p/w500${posterPath}`
}

// 加载数据
const loadDramas = async (page = 1, append = false) => {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  
  try {
    const data = await hotDramaApi.getAll(page, itemsPerPage, activeTab.value)
    
    if (data.items && data.items.length > 0) {
      if (append) {
        dramas.value = [...dramas.value, ...data.items]
      } else {
        dramas.value = data.items
      }
      
      hasMore.value = data.items.length >= itemsPerPage
      currentPage.value = page
    } else {
      hasMore.value = false
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMore.value = false
  }
}

// Tab切换
const handleTabChange = (tab) => {
  activeTab.value = tab
  currentPage.value = 1
  hasMore.value = true
  loadDramas(1, false)
}

// 刷新
const handleRefresh = () => {
  refreshing.value = true
  currentPage.value = 1
  hasMore.value = true
  loadDramas(1, false)
}

// 下拉刷新
const handlePullRefresh = () => {
  handleRefresh()
}

// 加载更多
const handleLoadMore = () => {
  if (!loadingMore.value && hasMore.value && !loading.value) {
    loadDramas(currentPage.value + 1, true)
  }
}

// 点击剧集
const handleDramaTap = (drama) => {
  // 复制下载链接
  if (drama.download_link) {
    uni.setClipboardData({
      data: drama.download_link,
      success: () => {
        uni.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  }
}

// 监听Tab变化
watch(activeTab, () => {
  currentPage.value = 1
  hasMore.value = true
  loadDramas(1, false)
})

// 页面加载
onMounted(() => {
  loadDramas(1, false)
})

// 下拉刷新
onPullDownRefresh(() => {
  handleRefresh()
  setTimeout(() => {
    uni.stopPullDownRefresh()
  }, 1000)
})

// 触底加载
onReachBottom(() => {
  handleLoadMore()
})
</script>

<style scoped>
.page-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.custom-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.nav-content {
  height: 88rpx;
  padding: 0 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: env(safe-area-inset-top);
}

.nav-title {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12rpx;
  transition: transform 0.3s;
}

.nav-btn.refreshing {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.nav-btn-icon {
  font-size: 32rpx;
}

.tab-bar {
  margin-top: 88rpx;
  padding-top: env(safe-area-inset-top);
  background: white;
  display: flex;
  border-bottom: 1rpx solid #eee;
}

.tab-item {
  flex: 1;
  padding: 24rpx 0;
  text-align: center;
  position: relative;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background: #667eea;
  border-radius: 2rpx;
}

.tab-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #667eea;
  font-weight: bold;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-list {
  padding: 24rpx;
}

.drama-card {
  background: white;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}

.drama-poster {
  width: 200rpx;
  height: 280rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background: #f0f0f0;
}

.drama-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.drama-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  line-height: 1.4;
}

.drama-original {
  font-size: 24rpx;
  color: #999;
}

.drama-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #666;
}

.drama-overview {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.loading-more,
.no-more,
.empty-state {
  padding: 40rpx;
  text-align: center;
}

.loading-text,
.no-more-text,
.empty-text {
  font-size: 26rpx;
  color: #999;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
</style>


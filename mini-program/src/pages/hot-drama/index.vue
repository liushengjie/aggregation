<template>
  <view class="page-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration-top"></view>
    
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <view class="nav-left">
          <view class="logo-box">
            <text class="logo-icon">🎬</text>
          </view>
          <view class="nav-texts">
            <text class="nav-title">全网热剧</text>
            <text class="nav-subtitle">HOT DRAMAS</text>
          </view>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleRefresh" :class="{ refreshing: refreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- Tab切换 -->
    <view class="tab-section">
      <view class="tab-wrapper">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'tv' }"
          @tap="handleTabChange('tv')"
        >
          <text class="tab-icon">📺</text>
          <text class="tab-text">电视剧</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'movie' }"
          @tap="handleTabChange('movie')"
        >
          <text class="tab-icon">🎥</text>
          <text class="tab-text">电影</text>
        </view>
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
      <view class="content-grid">
        <view
          class="drama-card-grid"
          v-for="(drama, index) in dramas"
          :key="drama.id"
          @tap="handleDramaTap(drama)"
        >
          <view class="poster-wrapper-grid">
            <image
              class="drama-poster-grid"
              :src="getPosterUrl(drama.poster_path)"
              mode="aspectFill"
              :lazy-load="true"
            />
            <view class="rating-badge-grid" v-if="drama.vote_average">
              <text class="rating-score">{{ drama.vote_average.toFixed(1) }}</text>
            </view>
            <view class="episode-badge" v-if="drama.current_episode">
              <text class="episode-text">更新至{{ drama.current_episode }}集</text>
            </view>
          </view>
          
          <view class="drama-info-grid">
            <text class="drama-title-grid">{{ drama.title }}</text>
            <text class="drama-date-grid" v-if="drama.release_date">{{ formatDate(drama.release_date) }}</text>
          </view>
        </view>
      </view>
      
      <!-- 加载更多 -->
      <view class="loading-more" v-if="loadingMore">
        <view class="loading-spinner small"></view>
        <text class="loading-text">加载更多...</text>
      </view>
      
      <!-- 没有更多 -->
      <view class="no-more" v-if="!hasMore && dramas.length > 0">
        <text class="no-more-text">已经到底啦</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="!loading && dramas.length === 0">
        <text class="empty-icon">🎬</text>
        <text class="empty-text">暂无影视内容</text>
      </view>
    </scroll-view>
    
    <!-- 自定义 TabBar -->
    <TabBar :current="2" />
    
    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="loading && dramas.length === 0">
      <view class="loading-box">
        <view class="loading-spinner"></view>
        <text class="loading-text">正在加载...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { hotDramaApi } from '@/utils/api.js'
import TabBar from '@/components/TabBar.vue'

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
    return `${year}年`
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
  setTimeout(() => {
    refreshing.value = false
  }, 1000)
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
  background-color: #f8fafc;
  position: relative;
  overflow: hidden;
}

.bg-decoration-top {
  position: absolute;
  top: -100rpx;
  left: -100rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(236, 72, 153, 0.05) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

/* 导航栏 */
.custom-nav {
  padding-top: env(safe-area-inset-top);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  z-index: 100;
  position: relative;
  border-bottom: 1rpx solid rgba(0,0,0,0.03);
}

.nav-content {
  height: 100rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.logo-box {
  width: 64rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #ec4899 0%, #d946ef 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(236, 72, 153, 0.2);
}

.logo-icon {
  font-size: 32rpx;
}

.nav-texts {
  display: flex;
  flex-direction: column;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.5rpx;
}

.nav-subtitle {
  font-size: 18rpx;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 2rpx;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e2e8f0;
}

.nav-btn.refreshing {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Tab切换 */
.tab-section {
  background: white;
  padding: 20rpx 32rpx;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(148, 163, 184, 0.03);
  z-index: 10;
  border-bottom: 1rpx solid rgba(0,0,0,0.03);
}

.tab-wrapper {
  display: flex;
  background: #f1f5f9;
  padding: 6rpx;
  border-radius: 12rpx;
}

.tab-item {
  flex: 1;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 8rpx;
  transition: all 0.3s;
}

.tab-item.active {
  background: white;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.tab-icon {
  font-size: 32rpx;
}

.tab-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #64748b;
}

.tab-item.active .tab-text {
  color: #ec4899;
  font-weight: 700;
}

/* 内容列表 */
.content-scroll {
  flex: 1;
  height: 0;
}

.content-grid {
  padding: 24rpx 32rpx;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.drama-card-grid {
  background: white;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(148, 163, 184, 0.05);
  display: flex;
  flex-direction: column;
  border: 1rpx solid #f1f5f9;
}

.poster-wrapper-grid {
  position: relative;
  width: 100%;
  padding-top: 140%; /* 5:7 aspect ratio */
}

.drama-poster-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #f1f5f9;
}

.rating-badge-grid {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.rating-score {
  color: #fbbf24;
  font-size: 22rpx;
  font-weight: 800;
}

.episode-badge {
  position: absolute;
  bottom: 12rpx;
  right: 12rpx;
  background: rgba(236, 72, 153, 0.9);
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
}

.episode-text {
  color: white;
  font-size: 20rpx;
  font-weight: 600;
}

.drama-info-grid {
  padding: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.drama-title-grid {
  font-size: 28rpx;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.drama-date-grid {
  font-size: 22rpx;
  color: #94a3b8;
}

/* 状态展示 */
.loading-more {
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #e2e8f0;
  border-top-color: #ec4899;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-spinner.small {
  width: 32rpx;
  height: 32rpx;
  border-width: 3rpx;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-more, .empty-state {
  padding: 60rpx;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.5;
}

.no-more-text, .empty-text {
  font-size: 26rpx;
  color: #94a3b8;
}

.loading-overlay {
  position: absolute;
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

.loading-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
</style>

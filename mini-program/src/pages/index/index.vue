<template>
  <view class="page-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration-top"></view>
    
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <view class="nav-left">
          <view class="logo-box">
            <text class="logo-icon">⚡</text>
          </view>
          <view class="nav-texts">
            <text class="nav-title">全网聚焦</text>
            <text class="nav-subtitle">GLOBAL FOCUS</text>
          </view>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleRefresh" :class="{ refreshing: refreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <view class="main-content">
      <!-- 顶部筛选区 -->
      <view class="filter-section">
        <!-- 分类标签 -->
        <scroll-view class="tabs-scroll" scroll-x="true" :show-scrollbar="false">
          <view class="tabs-container">
            <view
              class="tab-item"
              v-for="category in categories"
              :key="category.id"
              :class="{ active: activeCategory === category.id }"
              @tap="handleCategoryChange(category.id)"
            >
              <text class="tab-text">{{ category.name }}</text>
            </view>
          </view>
        </scroll-view>
        
        <!-- 平台筛选 -->
        <scroll-view class="filter-scroll" scroll-x="true" :show-scrollbar="false">
          <view class="filter-container">
            <view
              class="filter-item"
              v-for="platform in platforms"
              :key="platform.id"
              :class="{ active: activePlatform === platform.id, [platform.id.toLowerCase()]: true }"
              @tap="handlePlatformChange(platform.id)"
            >
              <text class="filter-icon">{{ getPlatformIcon(platform.id) }}</text>
              <text class="filter-text">{{ platform.name }}</text>
              <view class="filter-badge" v-if="itemCounts[platform.id] > 0">
                <text class="badge-text">{{ formatCount(itemCounts[platform.id]) }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
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
            v-for="(item, index) in items" 
            :key="item.id"
            class="content-card"
            :class="{ 'has-image': !!item.thumbnail }"
            @tap="handleItemTap(item)"
          >
            <!-- 图片区域 (Image Focused) -->
            <view class="card-image-box" v-if="item.thumbnail">
              <image 
                class="card-image" 
                :src="item.thumbnail" 
                mode="aspectFill"
                lazy-load
              />
              <view class="platform-badge" :class="item.platform.toLowerCase()">
                <text class="platform-icon">{{ getPlatformIcon(item.platform) }}</text>
                <text class="platform-name">{{ getPlatformName(item.platform) }}</text>
              </view>
            </view>

            <!-- 内容区域 -->
            <view class="card-body">
              <view class="card-header" v-if="!item.thumbnail">
                 <view class="platform-tag" :class="item.platform.toLowerCase()">
                    <text class="platform-icon">{{ getPlatformIcon(item.platform) }}</text>
                    <text class="platform-name">{{ getPlatformName(item.platform) }}</text>
                  </view>
                  <text class="time-text">{{ formatTime(item.timestamp) }}</text>
              </view>

              <text class="card-title">{{ item.title }}</text>
              
              <view class="card-meta-row">
                <text class="author-name">@{{ item.author }}</text>
                <text class="time-text" v-if="item.thumbnail">{{ formatTime(item.timestamp) }}</text>
              </view>
            </view>
            
            <view class="card-footer">
              <view class="stat-item">
                <text class="stat-icon">🔥</text>
                <text class="stat-num">{{ formatNumber(item.stats.likes) }}</text>
              </view>
              <view class="stat-item">
                <text class="stat-icon">💬</text>
                <text class="stat-num">{{ formatNumber(item.stats.comments) }}</text>
              </view>
              <view class="stat-item">
                <text class="stat-icon">↗️</text>
                <text class="stat-num">{{ formatNumber(item.stats.shares) }}</text>
              </view>
            </view>
          </view>
          
          <!-- 加载更多指示器 -->
          <view class="loading-more" v-if="loadingMore">
            <view class="loading-spinner small"></view>
            <text class="loading-text">加载更多...</text>
          </view>
          
          <!-- 没有更多数据 -->
          <view class="no-more" v-if="!hasMore && items.length > 0">
            <text class="no-more-text">已经到底啦</text>
          </view>
          
          <!-- 空状态 -->
          <view class="empty-state" v-if="!loading && items.length === 0">
            <text class="empty-icon">📭</text>
            <text class="empty-text">暂无内容</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 自定义 TabBar -->
    <TabBar :current="0" />
    
    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="loading && items.length === 0">
      <view class="loading-box">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { publicItemsApi } from '@/utils/api.js'
import { CATEGORIES, PLATFORM_NAMES } from '@/utils/constants.js'
import TabBar from '@/components/TabBar.vue'

// 响应式数据
const items = ref([])
const loading = ref(false)
const refreshing = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const currentPage = ref(1)
const activeCategory = ref('all')
const activePlatform = ref('All')
const itemCounts = ref({
  All: 0,
  Weibo: 0,
  Xiaohongshu: 0,
  Bilibili: 0,
  Douyin: 0
})

const categories = CATEGORIES
const platforms = [
  { id: 'All', name: '全部' },
  { id: 'Weibo', name: PLATFORM_NAMES.Weibo },
  { id: 'Xiaohongshu', name: PLATFORM_NAMES.Xiaohongshu },
  { id: 'Bilibili', name: PLATFORM_NAMES.Bilibili },
  { id: 'Douyin', name: PLATFORM_NAMES.Douyin }
]

const itemsPerPage = 30

// 辅助函数
const getPlatformIcon = (platform) => {
  const icons = {
    'All': '🌐',
    'Weibo': '🔴',
    'Xiaohongshu': '📕',
    'Bilibili': '📺',
    'Douyin': '🎵'
  }
  return icons[platform] || '📄'
}

const getPlatformName = (platform) => {
  return PLATFORM_NAMES[platform] || platform
}

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const formatCount = (num) => {
  if (num > 99) return '99+'
  return num.toString()
}

const formatTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }
  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  // Format date
  return `${date.getMonth() + 1}-${date.getDate()}`
}

// 加载数据
const loadItems = async (page = 1, append = false) => {
  if (append) {
    loadingMore.value = true
  } else {
    loading.value = true
  }
  
  try {
    const categoryParam = activeCategory.value === 'all' ? undefined : activeCategory.value
    const platformParam = activePlatform.value === 'All' ? undefined : activePlatform.value
    
    const data = platformParam
      ? await publicItemsApi.getByPlatform(platformParam, page, itemsPerPage, categoryParam)
      : await publicItemsApi.getAll(page, itemsPerPage, undefined, categoryParam)
    
    if (data.items && data.items.length > 0) {
      const transformedItems = data.items.map(item => ({
        id: `api-${item.id}`,
        platform: item.platform,
        title: item.title || '',
        author: item.author || '',
        thumbnail: item.thumbnail || '',
        url: item.url || '#',
        timestamp: item.fetched_at || new Date().toISOString(),
        stats: {
          likes: item.likes || 0,
          comments: item.comments || 0,
          shares: item.shares || 0,
          views: item.views || 0
        },
        tags: item.tags || []
      }))
      
      if (append) {
        items.value = [...items.value, ...transformedItems]
      } else {
        items.value = transformedItems
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

// 加载统计
const loadCounts = async () => {
  try {
    const data = await publicItemsApi.getCounts()
    if (data.counts) {
      itemCounts.value = {
        All: data.counts.All || 0,
        Weibo: data.counts.Weibo || 0,
        Xiaohongshu: data.counts.Xiaohongshu || 0,
        Bilibili: data.counts.Bilibili || 0,
        Douyin: data.counts.Douyin || 0
      }
    }
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}

// 分类切换
const handleCategoryChange = (categoryId) => {
  activeCategory.value = categoryId
  currentPage.value = 1
  hasMore.value = true
  loadItems(1, false)
}

// 平台切换
const handlePlatformChange = (platformId) => {
  activePlatform.value = platformId
  currentPage.value = 1
  hasMore.value = true
  loadItems(1, false)
}

// 刷新
const handleRefresh = () => {
  refreshing.value = true
  currentPage.value = 1
  hasMore.value = true
  loadItems(1, false)
  loadCounts()
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
    loadItems(currentPage.value + 1, true)
  }
}

// 点击内容卡片
const handleItemTap = (item) => {
  uni.setClipboardData({
    data: item.url,
    success: () => {
      uni.showToast({
        title: '链接已复制',
        icon: 'success'
      })
    }
  })
}

// 监听分类和平台变化
watch([activeCategory, activePlatform], () => {
  currentPage.value = 1
  hasMore.value = true
  loadItems(1, false)
})

// 页面加载
onMounted(() => {
  loadItems(1, false)
  loadCounts()
})

// 下拉刷新
onPullDownRefresh(() => {
  handlePullRefresh()
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
  background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%);
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(99, 102, 241, 0.2);
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

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 0;
  position: relative;
  z-index: 1;
}

/* 筛选区 */
.filter-section {
  background: white;
  padding-bottom: 20rpx;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(148, 163, 184, 0.03);
  z-index: 10;
  border-bottom: 1rpx solid rgba(0,0,0,0.03);
}

.tabs-scroll {
  white-space: nowrap;
  padding: 20rpx 0;
}

.tabs-container {
  display: inline-flex;
  padding: 0 32rpx;
  gap: 16rpx;
}

.tab-item {
  padding: 10rpx 28rpx;
  border-radius: 8rpx;
  background: #f1f5f9;
  transition: all 0.3s;
  border: 1rpx solid transparent;
}

.tab-item.active {
  background: #1e293b;
  box-shadow: 0 2rpx 8rpx rgba(30, 41, 59, 0.15);
}

.tab-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #64748b;
}

.tab-item.active .tab-text {
  color: white;
}

.filter-scroll {
  white-space: nowrap;
  padding-bottom: 10rpx;
}

.filter-container {
  display: inline-flex;
  padding: 0 32rpx;
  gap: 16rpx;
}

.filter-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  background: #f8fafc;
  min-width: 110rpx;
  position: relative;
  border: 1rpx solid #f1f5f9;
  transition: all 0.3s;
}

.filter-item.active {
  background: white;
  border-color: #e2e8f0;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.filter-item.weibo.active { border-color: #fee2e2; background: #fff1f2; }
.filter-item.xiaohongshu.active { border-color: #fee2e2; background: #fff1f2; }
.filter-item.bilibili.active { border-color: #dbeafe; background: #eff6ff; }
.filter-item.douyin.active { border-color: #f3e8ff; background: #faf5ff; }

.filter-icon {
  font-size: 32rpx;
}

.filter-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #64748b;
}

.filter-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  background: #ef4444;
  padding: 2rpx 8rpx;
  border-radius: 8rpx;
  border: 2rpx solid white;
}

.badge-text {
  font-size: 18rpx;
  color: white;
  font-weight: bold;
}

/* 内容列表 */
.content-scroll {
  flex: 1;
  height: 0;
}

.content-list {
  padding: 24rpx 32rpx;
}

.content-card {
  background: white;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(148, 163, 184, 0.05);
  border: 1rpx solid #f1f5f9;
  overflow: hidden;
  transition: transform 0.2s;
}

.content-card:active {
  transform: scale(0.99);
}

/* 图片优先布局 */
.card-image-box {
  position: relative;
  width: 100%;
  height: 360rpx;
}

.card-image {
  width: 100%;
  height: 100%;
  background: #f1f5f9;
}

.platform-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.1);
}

.platform-badge.weibo .platform-name { color: #ef4444; }
.platform-badge.xiaohongshu .platform-name { color: #ef4444; }
.platform-badge.bilibili .platform-name { color: #3b82f6; }
.platform-badge.douyin .platform-name { color: #a855f7; }

.card-body {
  padding: 24rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.platform-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #f1f5f9;
  border: 1rpx solid rgba(0,0,0,0.05);
}

.platform-tag.weibo { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
.platform-tag.xiaohongshu { background: #fee2e2; color: #ef4444; border-color: #fecaca; }
.platform-tag.bilibili { background: #dbeafe; color: #3b82f6; border-color: #bfdbfe; }
.platform-tag.douyin { background: #f3e8ff; color: #a855f7; border-color: #e9d5ff; }

.platform-icon {
  font-size: 24rpx;
}

.platform-name {
  font-size: 22rpx;
  font-weight: 700;
}

.time-text {
  font-size: 22rpx;
  color: #94a3b8;
  font-weight: 500;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.card-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-name {
  font-size: 24rpx;
  color: #64748b;
  font-weight: 500;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 20rpx 24rpx;
  border-top: 1rpx solid #f8fafc;
  background: #fcfcfc;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.stat-icon {
  font-size: 24rpx;
}

.stat-num {
  font-size: 24rpx;
  color: #64748b;
  font-weight: 600;
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
  border-top-color: #6366f1;
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

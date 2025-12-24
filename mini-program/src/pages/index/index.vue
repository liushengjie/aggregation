<template>
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <view class="nav-brand">
          <image class="logo-img" src="/static/images/logo-icon-64.png" mode="aspectFit" />
          <text class="nav-title">棱镜聚合</text>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleRefresh" :class="{ refreshing: refreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 分类标签栏 -->
    <view class="category-tabs">
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
    </view>
    
    <!-- 平台筛选 -->
    <view class="platform-filter">
      <scroll-view class="filter-scroll" scroll-x="true" :show-scrollbar="false">
        <view class="filter-container">
          <view
            class="filter-item"
            v-for="platform in platforms"
            :key="platform.id"
            :class="{ active: activePlatform === platform.id }"
            @tap="handlePlatformChange(platform.id)"
          >
            <text class="filter-text">{{ platform.name }}</text>
            <text class="filter-count" v-if="itemCounts[platform.id] > 0">
              {{ itemCounts[platform.id] }}
            </text>
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
        <ContentCard
          v-for="(item, index) in items"
          :key="item.id"
          :item="item"
          :index="index"
          @tap="handleItemTap"
        />
        
        <!-- 加载更多指示器 -->
        <view class="loading-more" v-if="loadingMore">
          <text class="loading-text">加载中...</text>
        </view>
        
        <!-- 没有更多数据 -->
        <view class="no-more" v-if="!hasMore && items.length > 0">
          <text class="no-more-text">没有更多了</text>
        </view>
        
        <!-- 空状态 -->
        <view class="empty-state" v-if="!loading && items.length === 0">
          <text class="empty-text">暂无内容</text>
        </view>
      </view>
    </scroll-view>
    
    <!-- 加载遮罩 -->
    <view class="loading-overlay" v-if="loading && items.length === 0">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import ContentCard from '@/components/ContentCard.vue'
import { publicItemsApi } from '@/utils/api.js'
import { CATEGORIES, PLATFORM_NAMES } from '@/utils/constants.js'

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
}

// 加载更多
const handleLoadMore = () => {
  if (!loadingMore.value && hasMore.value && !loading.value) {
    loadItems(currentPage.value + 1, true)
  }
}

// 点击内容卡片
const handleItemTap = (item) => {
  // 在小程序中打开链接需要使用 web-view 或复制链接
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

.nav-brand {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.logo-img {
  width: 48rpx;
  height: 48rpx;
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

.category-tabs {
  margin-top: 88rpx;
  padding-top: env(safe-area-inset-top);
  background: white;
  border-bottom: 1rpx solid #eee;
}

.tabs-scroll {
  white-space: nowrap;
}

.tabs-container {
  display: inline-flex;
  padding: 20rpx 0;
}

.tab-item {
  padding: 12rpx 24rpx;
  margin: 0 8rpx;
  border-radius: 40rpx;
  background: #f5f5f5;
  transition: all 0.3s;
}

.tab-item.active {
  background: #667eea;
}

.tab-text {
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
}

.tab-item.active .tab-text {
  color: white;
  font-weight: bold;
}

.platform-filter {
  background: white;
  border-bottom: 1rpx solid #eee;
}

.filter-scroll {
  white-space: nowrap;
}

.filter-container {
  display: inline-flex;
  padding: 16rpx 0;
}

.filter-item {
  padding: 12rpx 24rpx;
  margin: 0 8rpx;
  border-radius: 40rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  gap: 8rpx;
  transition: all 0.3s;
}

.filter-item.active {
  background: #667eea;
}

.filter-text {
  font-size: 26rpx;
  color: #666;
  white-space: nowrap;
}

.filter-item.active .filter-text {
  color: white;
  font-weight: bold;
}

.filter-count {
  font-size: 22rpx;
  color: #999;
  background: rgba(0, 0, 0, 0.1);
  padding: 2rpx 8rpx;
  border-radius: 20rpx;
}

.filter-item.active .filter-count {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-list {
  padding: 24rpx;
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

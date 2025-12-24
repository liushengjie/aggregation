<template>
  <view class="page-container">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <text class="nav-title">全网热榜</text>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleGlobalRefresh" :class="{ refreshing: globalRefreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 平台切换 -->
    <view class="platform-tabs">
      <scroll-view class="tabs-scroll" scroll-x="true" :show-scrollbar="false">
        <view class="tabs-container">
          <view
            class="tab-item"
            v-for="platform in platformsMeta"
            :key="platform.id"
            :class="{ active: activePlatform === platform.id }"
            @tap="handlePlatformChange(platform.id)"
          >
            <text class="tab-text">{{ platform.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>
    
    <!-- 分类切换（如果有） -->
    <view class="category-tabs" v-if="currentCategories.length > 0">
      <scroll-view class="tabs-scroll" scroll-x="true" :show-scrollbar="false">
        <view class="tabs-container">
          <view
            class="tab-item"
            v-for="category in currentCategories"
            :key="category.id"
            :class="{ active: activeCategory === category.id }"
            @tap="handleCategoryChange(category.id)"
          >
            <text class="tab-text">{{ category.name }}</text>
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
    >
      <view class="content-list" v-if="currentItems.length > 0">
        <view
          class="trend-item"
          v-for="(item, index) in currentItems"
          :key="index"
          @tap="handleItemTap(item)"
        >
          <view class="trend-rank" :class="getRankClass(index + 1)">
            <text class="rank-text">{{ index + 1 }}</text>
          </view>
          <view class="trend-content">
            <text class="trend-title">{{ item.title }}</text>
            <text class="trend-hotness" v-if="item.hotness">
              {{ item.hotness }}
            </text>
          </view>
          <view class="trend-arrow">
            <text class="arrow-icon">›</text>
          </view>
        </view>
      </view>
      
      <!-- 加载中 -->
      <view class="loading-state" v-if="currentLoading">
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 空状态 -->
      <view class="empty-state" v-if="!currentLoading && currentItems.length === 0">
        <text class="empty-text">暂无数据</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { hotTrendsApi } from '@/utils/api.js'

const platformsMeta = ref([])
const platformsData = ref({})
const activePlatform = ref('')
const activeCategory = ref('')
const globalRefreshing = ref(false)
const refreshing = ref(false)

const PLATFORM_MAP = {
  'Weibo': '微博',
  'Douyin': '抖音',
  'Baidu': '百度',
  'Bilibili': '哔哩哔哩'
}

// 当前分类列表
const currentCategories = computed(() => {
  if (!activePlatform.value || !platformsData.value[activePlatform.value]) {
    return []
  }
  return platformsData.value[activePlatform.value].categories || []
})

// 当前数据
const currentItems = computed(() => {
  if (!activePlatform.value || !platformsData.value[activePlatform.value]) {
    return []
  }
  return platformsData.value[activePlatform.value].items || []
})

// 当前加载状态
const currentLoading = computed(() => {
  if (!activePlatform.value || !platformsData.value[activePlatform.value]) {
    return false
  }
  return platformsData.value[activePlatform.value].loading || false
})

// 获取排名样式
const getRankClass = (rank) => {
  if (rank <= 3) {
    return `rank-top-${rank}`
  }
  return 'rank-normal'
}

// 加载平台数据
const loadPlatformTrends = async (platformId, categoryId) => {
  if (!platformsData.value[platformId]) {
    platformsData.value[platformId] = {
      platformId,
      platformName: '',
      items: [],
      categories: [],
      activeCategory: '',
      loading: true
    }
  }
  
  platformsData.value[platformId].loading = true
  
  try {
    const data = await hotTrendsApi.getTrends(platformId, categoryId)
    
    platformsData.value[platformId] = {
      ...platformsData.value[platformId],
      items: data.items || [],
      activeCategory: categoryId || (platformsData.value[platformId].categories[0]?.id || ''),
      loading: false
    }
  } catch (error) {
    console.error(`加载${platformId}数据失败:`, error)
    platformsData.value[platformId].loading = false
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 加载所有平台元数据
const loadPlatformsMeta = async () => {
  try {
    const data = await hotTrendsApi.getMeta()
    
    if (data.platforms && data.platforms.length > 0) {
      platformsMeta.value = data.platforms.map(p => ({
        id: p.id,
        name: PLATFORM_MAP[p.id] || p.name || p.id,
        categories: p.categories || [],
        hasData: p.hasData
      }))
      
      // 初始化第一个平台
      if (platformsMeta.value.length > 0 && !activePlatform.value) {
        activePlatform.value = platformsMeta.value[0].id
        const firstCategory = platformsMeta.value[0].categories[0]?.id
        await loadPlatformTrends(activePlatform.value, firstCategory)
      }
    }
  } catch (error) {
    console.error('加载平台元数据失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  }
}

// 平台切换
const handlePlatformChange = async (platformId) => {
  activePlatform.value = platformId
  activeCategory.value = ''
  
  const platform = platformsMeta.value.find(p => p.id === platformId)
  if (platform && platform.categories.length > 0) {
    activeCategory.value = platform.categories[0].id
    await loadPlatformTrends(platformId, activeCategory.value)
  } else {
    await loadPlatformTrends(platformId)
  }
}

// 分类切换
const handleCategoryChange = async (categoryId) => {
  activeCategory.value = categoryId
  if (activePlatform.value) {
    await loadPlatformTrends(activePlatform.value, categoryId)
  }
}

// 全局刷新
const handleGlobalRefresh = async () => {
  globalRefreshing.value = true
  await loadPlatformsMeta()
  
  // 刷新当前平台
  if (activePlatform.value) {
    await loadPlatformTrends(activePlatform.value, activeCategory.value)
  }
  
  globalRefreshing.value = false
}

// 下拉刷新
const handlePullRefresh = async () => {
  refreshing.value = true
  if (activePlatform.value) {
    await loadPlatformTrends(activePlatform.value, activeCategory.value)
  }
  refreshing.value = false
  setTimeout(() => {
    uni.stopPullDownRefresh()
  }, 500)
}

// 点击项目
const handleItemTap = (item) => {
  if (item.url) {
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
}

// 页面加载
onMounted(() => {
  loadPlatformsMeta()
})

// 下拉刷新
onPullDownRefresh(() => {
  handlePullRefresh()
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

.platform-tabs,
.category-tabs {
  margin-top: 88rpx;
  padding-top: env(safe-area-inset-top);
  background: white;
  border-bottom: 1rpx solid #eee;
}

.category-tabs {
  margin-top: 0;
  padding-top: 0;
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

.content-scroll {
  flex: 1;
  height: 0;
}

.content-list {
  padding: 24rpx;
}

.trend-item {
  background: white;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.trend-rank {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.rank-top-1 {
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
}

.rank-top-2 {
  background: linear-gradient(135deg, #ffa94d, #ff8c42);
}

.rank-top-3 {
  background: linear-gradient(135deg, #ffd93d, #f6c23e);
}

.rank-normal {
  background: #f5f5f5;
}

.rank-text {
  font-size: 28rpx;
  font-weight: bold;
  color: white;
}

.rank-normal .rank-text {
  color: #666;
}

.trend-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.trend-title {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.trend-hotness {
  font-size: 24rpx;
  color: #ff6b6b;
  font-weight: bold;
}

.trend-arrow {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.arrow-icon {
  font-size: 40rpx;
  color: #999;
}

.loading-state,
.empty-state {
  padding: 80rpx 40rpx;
  text-align: center;
}

.loading-text,
.empty-text {
  font-size: 26rpx;
  color: #999;
}
</style>


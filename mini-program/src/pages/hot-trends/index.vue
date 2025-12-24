<template>
  <view class="page-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration-top"></view>
    
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <view class="nav-left">
          <view class="logo-box">
            <text class="logo-icon">🔥</text>
          </view>
          <view class="nav-texts">
            <text class="nav-title">全网热榜</text>
            <text class="nav-subtitle">HOT TRENDS</text>
          </view>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleGlobalRefresh" :class="{ refreshing: globalRefreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 内容区域 -->
    <view class="main-content">
      <!-- 平台切换 -->
      <view class="filter-section">
        <scroll-view class="tabs-scroll" scroll-x="true" :show-scrollbar="false">
          <view class="tabs-container">
            <view
              class="tab-item"
              v-for="platform in platformsMeta"
              :key="platform.id"
              :class="{ active: activePlatform === platform.id }"
              @tap="handlePlatformChange(platform.id)"
            >
              <text class="tab-icon">{{ getPlatformIcon(platform.id) }}</text>
              <text class="tab-text">{{ platform.name }}</text>
            </view>
          </view>
        </scroll-view>
        
        <!-- 分类切换（如果有） -->
        <view class="sub-tabs-wrapper" v-if="currentCategories.length > 0">
          <scroll-view class="sub-tabs-scroll" scroll-x="true" :show-scrollbar="false">
            <view class="sub-tabs-container">
              <view
                class="sub-tab-item"
                v-for="category in currentCategories"
                :key="category.id"
                :class="{ active: activeCategory === category.id }"
                @tap="handleCategoryChange(category.id)"
              >
                <text class="sub-tab-text">{{ category.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
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
            class="trend-card"
            v-for="(item, index) in currentItems"
            :key="index"
            @tap="handleItemTap(item)"
          >
            <view class="trend-rank" :class="getRankClass(index + 1)">
              <text class="rank-num">{{ index + 1 }}</text>
            </view>
            
            <view class="trend-main">
              <view class="trend-info">
                <text class="trend-title">{{ item.title }}</text>
                <view class="trend-meta" v-if="item.hotness">
                  <text class="meta-icon">🔥</text>
                  <text class="meta-text">{{ item.hotness }}</text>
                </view>
              </view>
              
              <view class="trend-action">
                <text class="action-icon">›</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 加载中 -->
        <view class="loading-state" v-if="currentLoading">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在获取热点...</text>
        </view>
        
        <!-- 空状态 -->
        <view class="empty-state" v-if="!currentLoading && currentItems.length === 0">
          <text class="empty-icon">📉</text>
          <text class="empty-text">暂无热榜数据</text>
        </view>
      </scroll-view>
    </view>
    <!-- 自定义 TabBar -->
    <TabBar :current="1" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { hotTrendsApi } from '@/utils/api.js'
import TabBar from '@/components/TabBar.vue'

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
  'Bilibili': '哔哩哔哩',
  'Zhihu': '知乎',
  'Toutiao': '头条',
  '36kr': '36氪',
  'Sspai': '少数派',
  'ItHome': 'IT之家'
}

const getPlatformIcon = (id) => {
  const icons = {
    'Weibo': '🔴',
    'Douyin': '🎵',
    'Baidu': '🔍',
    'Bilibili': '📺',
    'Zhihu': '📘',
    'Toutiao': '📰',
    '36kr': '💼',
    'Sspai': '🥧',
    'ItHome': '💻'
  }
  return icons[id] || '🔥'
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
    return `rank-${rank}`
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
  background-color: #f8fafc;
  position: relative;
  overflow: hidden;
}

.bg-decoration-top {
  position: absolute;
  top: -100rpx;
  right: -100rpx;
  width: 400rpx;
  height: 400rpx;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, transparent 70%);
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
  background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(249, 115, 22, 0.2);
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
  display: flex;
  align-items: center;
  gap: 8rpx;
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

.tab-icon {
  font-size: 24rpx;
}

.tab-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #64748b;
}

.tab-item.active .tab-text {
  color: white;
}

.sub-tabs-wrapper {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #f1f5f9;
}

.sub-tabs-scroll {
  white-space: nowrap;
}

.sub-tabs-container {
  display: inline-flex;
  padding: 0 32rpx;
  gap: 16rpx;
}

.sub-tab-item {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  background: transparent;
  border: 1rpx solid transparent;
}

.sub-tab-item.active {
  background: #fff7ed;
  border-color: #ffedd5;
}

.sub-tab-text {
  font-size: 24rpx;
  color: #64748b;
  font-weight: 500;
}

.sub-tab-item.active .sub-tab-text {
  color: #f97316;
  font-weight: 600;
}

/* 内容列表 */
.content-scroll {
  flex: 1;
  height: 0;
}

.content-list {
  padding: 24rpx 32rpx;
}

.trend-card {
  background: white;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(148, 163, 184, 0.05);
  border: 1rpx solid #f1f5f9;
  transition: transform 0.2s;
}

.trend-card:active {
  transform: scale(0.99);
}

.trend-rank {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  flex-shrink: 0;
  margin-top: 4rpx;
  background: #f8fafc;
  border: 1rpx solid #f1f5f9;
}

.rank-1 { background: #fee2e2; border-color: #fecaca; }
.rank-2 { background: #ffedd5; border-color: #fed7aa; }
.rank-3 { background: #fef9c3; border-color: #fde047; }

.rank-num {
  font-size: 24rpx;
  font-weight: 800;
  color: #94a3b8;
}

.rank-1 .rank-num { color: #ef4444; }
.rank-2 .rank-num { color: #f97316; }
.rank-3 .rank-num { color: #ca8a04; }

.trend-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.trend-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.trend-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.trend-meta {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.meta-icon {
  font-size: 20rpx;
}

.meta-text {
  font-size: 22rpx;
  color: #ef4444;
  font-weight: 600;
}

.trend-action {
  width: 40rpx;
  display: flex;
  justify-content: flex-end;
}

.action-icon {
  font-size: 32rpx;
  color: #cbd5e1;
}

/* 状态展示 */
.loading-state, .empty-state {
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

.loading-text, .empty-text {
  font-size: 26rpx;
  color: #94a3b8;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #e2e8f0;
  border-top-color: #f97316;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

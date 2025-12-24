<template>
  <view class="page-container">
    <!-- 背景装饰 -->
    <view class="bg-decoration-top"></view>
    <view class="bg-decoration-bottom"></view>
    
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <view class="nav-left">
          <view class="logo-box">
            <text class="logo-icon">⚡</text>
          </view>
          <view class="nav-texts">
            <text class="nav-title">全网开源</text>
            <text class="nav-subtitle">OPEN SOURCE</text>
          </view>
        </view>
        <view class="nav-actions">
          <view class="nav-btn" @tap="handleRefresh" :class="{ refreshing: refreshing }">
            <text class="nav-btn-icon">🔄</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 主要内容区 -->
    <scroll-view
      class="content-scroll"
      scroll-y="true"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="handlePullRefresh"
    >
      <view class="scroll-content">
        <!-- 顶部筛选卡片 -->
        <view class="filter-card">
          <!-- 周期切换 -->
          <view class="period-tabs">
            <view 
              v-for="period in periods" 
              :key="period.value"
              class="period-tab"
              :class="{ active: currentPeriod === period.value }"
              @tap="handlePeriodChange(period.value)"
            >
              <text class="period-text">{{ period.label }}</text>
              <view class="active-indicator" v-if="currentPeriod === period.value"></view>
            </view>
          </view>
          
          <!-- 语言选择 -->
          <picker 
            mode="selector" 
            :range="languages" 
            range-key="label" 
            :value="languageIndex" 
            @change="handleLanguageChange"
          >
            <view class="lang-selector">
              <view class="lang-left">
                <view class="icon-box">
                  <text class="lang-icon">🌐</text>
                </view>
                <text class="lang-label">编程语言</text>
              </view>
              <view class="lang-right">
                <text class="lang-value">{{ currentLanguageLabel }}</text>
                <text class="lang-arrow">▼</text>
              </view>
            </view>
          </picker>
        </view>

        <!-- 项目列表 -->
        <view class="projects-list">
          <view class="list-header">
            <view class="header-line"></view>
            <text class="list-title">Trending Repositories</text>
          </view>

          <view 
            v-for="(item, index) in items" 
            :key="item.repoFullName"
            class="project-card"
            @tap="handleItemTap(item)"
          >
            <!-- 排名标记 -->
            <view class="rank-badge" :class="'rank-' + (index + 1)" v-if="index < 3">
              <text class="rank-num">TOP {{ index + 1 }}</text>
            </view>

            <view class="card-main">
              <view class="card-top">
                <view class="repo-icon-box">
                  <text class="repo-icon">📦</text>
                </view>
                <view class="repo-header">
                  <text class="repo-name">{{ item.repoFullName }}</text>
                  <view class="repo-stats-row">
                    <view class="stat-tag star">
                      <text class="stat-icon">⭐</text>
                      <text class="stat-num">{{ formatNumber(item.stars) }}</text>
                    </view>
                    <view class="stat-tag fork">
                      <text class="stat-icon">🔱</text>
                      <text class="stat-num">{{ formatNumber(item.forks) }}</text>
                    </view>
                  </view>
                </view>
              </view>

              <view class="card-desc">
                <text class="desc-text">{{ item.description }}</text>
              </view>

              <view class="card-footer">
                <view class="footer-left">
                  <view class="lang-tag" v-if="item.language">
                    <view class="lang-dot" :style="{ backgroundColor: getLanguageColor(item.language) }"></view>
                    <text class="lang-name">{{ item.language }}</text>
                  </view>
                </view>
                <view class="footer-right">
                  <view class="trend-badge">
                    <text class="trend-icon">🔥</text>
                    <text class="trend-text">+{{ item.starsToday }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>

          <!-- 状态展示 -->
          <view class="status-container">
            <view class="empty-state" v-if="!loading && items.length === 0">
              <text class="empty-icon">📂</text>
              <text class="empty-text">暂无热门项目</text>
            </view>
            
            <view class="loading-state" v-if="loading && items.length === 0">
              <view class="loading-spinner"></view>
              <text class="loading-text">正在探索开源世界...</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
    <!-- 自定义 TabBar -->
    <TabBar :current="3" />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { opensourceApi } from '@/utils/api.js'
import TabBar from '@/components/TabBar.vue'

// 状态
const items = ref([])
const loading = ref(false)
const refreshing = ref(false)
const currentPeriod = ref('today')
const currentLanguage = ref('all')
const languageIndex = ref(0)

// 常量
const periods = [
  { label: '今日热门', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' }
]

const languages = [
  { label: '全部语言', value: 'all' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Go', value: 'go' },
  { label: 'Java', value: 'java' },
  { label: 'Rust', value: 'rust' },
  { label: 'C++', value: 'c++' },
  { label: 'Vue', value: 'vue' },
  { label: 'React', value: 'react' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' }
]

// 计算属性
const currentLanguageLabel = computed(() => {
  return languages[languageIndex.value].label
})

// 方法
const getLanguageColor = (lang) => {
  const colors = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Go': '#00ADD8',
    'Java': '#b07219',
    'Rust': '#dea584',
    'C++': '#f34b7d',
    'Vue': '#41b883',
    'React': '#61dafb',
    'Swift': '#ffac45',
    'Kotlin': '#A97BFF'
  }
  return colors[lang] || '#8b949e'
}

const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const loadData = async () => {
  if (items.value.length === 0) {
    loading.value = true
  }
  
  try {
    const data = await opensourceApi.getTrending(currentPeriod.value, currentLanguage.value)
    if (data && data.items) {
      items.value = data.items
    }
  } catch (error) {
    console.error('加载失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const handleRefresh = () => {
  refreshing.value = true
  loadData()
}

const handlePullRefresh = () => {
  handleRefresh()
  setTimeout(() => {
    refreshing.value = false
  }, 1000)
}

const handlePeriodChange = (period) => {
  if (currentPeriod.value === period) return
  currentPeriod.value = period
  loadData()
}

const handleLanguageChange = (e) => {
  const index = e.detail.value
  languageIndex.value = index
  currentLanguage.value = languages[index].value
  loadData()
}

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

onMounted(() => {
  loadData()
})

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
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}

.bg-decoration-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200rpx;
  background: linear-gradient(to top, rgba(241, 245, 249, 0.8), transparent);
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
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(79, 70, 229, 0.2);
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
  color: #0f172a;
  letter-spacing: -0.5rpx;
}

.nav-subtitle {
  font-size: 18rpx;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 2rpx;
}

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  background: #f1f5f9;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #e2e8f0;
}

.nav-btn-icon {
  font-size: 28rpx;
  color: #64748b;
}

/* 内容区域 */
.content-scroll {
  flex: 1;
  height: 0;
  position: relative;
  z-index: 1;
}

.scroll-content {
  padding: 24rpx 32rpx 60rpx;
}

/* 筛选卡片 */
.filter-card {
  background: white;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  border: 1rpx solid rgba(0,0,0,0.03);
}

.period-tabs {
  display: flex;
  background: #f8fafc;
  padding: 6rpx;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #f1f5f9;
}

.period-tab {
  flex: 1;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  position: relative;
  transition: all 0.3s ease;
}

.period-tab.active {
  background: white;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.period-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #64748b;
  z-index: 1;
}

.period-tab.active .period-text {
  color: #4f46e5;
  font-weight: 700;
}

.active-indicator {
  position: absolute;
  bottom: 6rpx;
  width: 8rpx;
  height: 8rpx;
  background: #4f46e5;
  border-radius: 50%;
  opacity: 0;
}

.lang-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 12rpx;
  border: 2rpx solid #f1f5f9;
}

.lang-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.icon-box {
  width: 48rpx;
  height: 48rpx;
  background: #f1f5f9;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lang-icon {
  font-size: 24rpx;
}

.lang-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
}

.lang-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.lang-value {
  font-size: 26rpx;
  color: #4f46e5;
  font-weight: 600;
}

.lang-arrow {
  font-size: 20rpx;
  color: #94a3b8;
}

/* 列表标题 */
.list-header {
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.header-line {
  width: 6rpx;
  height: 28rpx;
  background: #4f46e5;
  border-radius: 4rpx;
}

.list-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.5rpx;
}

/* 项目卡片 */
.project-card {
  background: white;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(148, 163, 184, 0.05);
  border: 1rpx solid #f1f5f9;
  position: relative;
  overflow: hidden;
}

.rank-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 6rpx 16rpx;
  border-bottom-left-radius: 12rpx;
  background: #f1f5f9;
}

.rank-1 { background: #fee2e2; }
.rank-2 { background: #ffedd5; }
.rank-3 { background: #fef9c3; }

.rank-num {
  font-size: 20rpx;
  font-weight: 800;
  color: #64748b;
}

.rank-1 .rank-num { color: #ef4444; }
.rank-2 .rank-num { color: #f97316; }
.rank-3 .rank-num { color: #ca8a04; }

.card-top {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.repo-icon-box {
  width: 80rpx;
  height: 80rpx;
  background: #f8fafc;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid #f1f5f9;
}

.repo-icon {
  font-size: 36rpx;
}

.repo-header {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10rpx;
  padding-right: 80rpx;
}

.repo-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  word-break: break-all;
}

.repo-stats-row {
  display: flex;
  gap: 12rpx;
}

.stat-tag {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 2rpx 10rpx;
  border-radius: 6rpx;
  background: #f8fafc;
  border: 1rpx solid #f1f5f9;
}

.stat-icon {
  font-size: 20rpx;
}

.stat-num {
  font-size: 20rpx;
  font-weight: 600;
  color: #64748b;
}

.card-desc {
  margin-bottom: 24rpx;
  padding: 16rpx;
  background: #f8fafc;
  border-radius: 8rpx;
}

.desc-text {
  font-size: 26rpx;
  color: #475569;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f1f5f9;
}

.lang-tag {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.lang-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 4rpx;
}

.lang-name {
  font-size: 24rpx;
  font-weight: 600;
  color: #475569;
}

.trend-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  background: #ecfdf5;
  border-radius: 8rpx;
  border: 1rpx solid #d1fae5;
}

.trend-icon {
  font-size: 20rpx;
}

.trend-text {
  font-size: 22rpx;
  font-weight: 700;
  color: #059669;
}

/* 状态展示 */
.status-container {
  padding: 60rpx 0;
  display: flex;
  justify-content: center;
}

.empty-state, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}

.empty-icon {
  font-size: 80rpx;
  opacity: 0.5;
}

.empty-text, .loading-text {
  font-size: 26rpx;
  color: #94a3b8;
  font-weight: 500;
}

.loading-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid #e2e8f0;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

/**
 * 本地存储工具
 */

/**
 * 设置存储
 * @param {String} key - 键名
 * @param {Any} value - 值
 * @param {Number} expire - 过期时间（毫秒）
 */
export const setStorage = (key, value, expire = null) => {
  try {
    const data = {
      value,
      timestamp: Date.now(),
      expire: expire ? Date.now() + expire : null
    }
    uni.setStorageSync(key, data)
    return true
  } catch (e) {
    console.error('设置存储失败:', e)
    return false
  }
}

/**
 * 获取存储
 * @param {String} key - 键名
 * @param {Any} defaultValue - 默认值
 */
export const getStorage = (key, defaultValue = null) => {
  try {
    const data = uni.getStorageSync(key)
    if (!data) return defaultValue
    
    // 检查是否过期
    if (data.expire && Date.now() > data.expire) {
      uni.removeStorageSync(key)
      return defaultValue
    }
    
    return data.value
  } catch (e) {
    console.error('获取存储失败:', e)
    return defaultValue
  }
}

/**
 * 删除存储
 * @param {String} key - 键名
 */
export const removeStorage = (key) => {
  try {
    uni.removeStorageSync(key)
    return true
  } catch (e) {
    console.error('删除存储失败:', e)
    return false
  }
}

/**
 * 清空所有存储
 */
export const clearStorage = () => {
  try {
    uni.clearStorageSync()
    return true
  } catch (e) {
    console.error('清空存储失败:', e)
    return false
  }
}


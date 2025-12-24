/**
 * Webview通信桥接工具
 */

class WebviewBridge {
  constructor() {
    this.messageHandlers = new Map()
    this.init()
  }
  
  /**
   * 初始化通信
   */
  init() {
    // 小程序中通过 web-view 组件的 @message 事件接收消息
    // 这里主要是定义发送消息的方法
  }
  
  /**
   * 发送消息到Webview
   * @param {Object} data - 要发送的数据
   */
  postMessage(data) {
    // 注意：小程序向webview发送消息需要通过webview组件的实例
    // 这个方法需要在页面组件中调用webview实例的方法
    console.log('发送消息到Webview:', data)
  }
  
  /**
   * 注册消息处理器
   * @param {String} type - 消息类型
   * @param {Function} handler - 处理函数
   */
  onMessage(type, handler) {
    this.messageHandlers.set(type, handler)
  }
  
  /**
   * 处理来自Webview的消息
   * @param {Object} data - 消息数据
   */
  handleMessage(data) {
    const { type, payload } = data || {}
    if (!type) return
    
    const handler = this.messageHandlers.get(type)
    if (handler && typeof handler === 'function') {
      handler(payload)
    }
  }
  
  /**
   * 导航控制 - 跳转到指定路径
   * @param {String} path - 路径
   */
  navigateTo(path) {
    this.postMessage({
      type: 'navigate',
      payload: { path }
    })
  }
  
  /**
   * 刷新页面
   */
  refresh() {
    this.postMessage({
      type: 'refresh'
    })
  }
  
  /**
   * 滚动到顶部
   */
  scrollToTop() {
    this.postMessage({
      type: 'scrollToTop'
    })
  }
  
  /**
   * 返回首页
   */
  goHome() {
    this.postMessage({
      type: 'goHome'
    })
  }
}

// 导出单例
export const webviewBridge = new WebviewBridge()


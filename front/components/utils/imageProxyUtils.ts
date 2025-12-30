import { getApiBase } from '../../api/api';

/**
 * 获取图片代理URL
 * 对微博、小红书和B站的图片使用代理，其他直接返回原URL
 */
export const getImageProxyUrl = (url: string): string => {
  if (!url) return '';
  
  let fullUrl = url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    fullUrl = 'https://' + url;
  }
  
  // 微博图片代理
  if (
    fullUrl.includes('sinaimg.cn') ||
    fullUrl.includes('sina.cn')
  ) {
    const proxyUrl = `${getApiBase()}/image/proxy?url=${encodeURIComponent(fullUrl)}`;
    console.log('[ImageProxy] 微博图片代理:', fullUrl, '->', proxyUrl);
    return proxyUrl;
  }
  
  // 小红书图片代理
  if (
    fullUrl.includes('xhscdn.com') ||
    fullUrl.includes('xhslink.com') ||
    fullUrl.includes('sns-webpic-qc.xhscdn.com')
  ) {
    return `${getApiBase()}/image/proxy?url=${encodeURIComponent(fullUrl)}`;
  }
  
  // B站图片代理
  if (
    fullUrl.includes('hdslb.com') ||
    fullUrl.includes('biliimg.com') ||
    fullUrl.includes('bilicdn.com') ||
    fullUrl.includes('b23.tv')
  ) {
    return `${getApiBase()}/image/proxy?url=${encodeURIComponent(fullUrl)}`;
  }
  
  return fullUrl;
};


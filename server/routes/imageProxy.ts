import express from 'express';

const router = express.Router();

/**
 * 图片代理接口
 * 用于绕过微博等平台的防盗链限制
 */
router.get('/proxy', async (req, res) => {
  try {
    let imageUrl = req.query.url as string;
    
    if (!imageUrl) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    // 如果URL没有协议，添加https://
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      imageUrl = 'https://' + imageUrl;
    }

    // 验证 URL 是否为允许的域名（安全措施）
    const allowedDomains = [
      // 微博图片域名
      'sinaimg.cn',
      'wx1.sinaimg.cn',
      'wx2.sinaimg.cn',
      'wx3.sinaimg.cn',
      'wx4.sinaimg.cn',
      'tvax1.sinaimg.cn',
      'tvax2.sinaimg.cn',
      'tvax3.sinaimg.cn',
      'tvax4.sinaimg.cn',
      // B站图片域名
      'hdslb.com',
      'i0.hdslb.com',
      'i1.hdslb.com',
      'i2.hdslb.com',
      'i3.hdslb.com',
      's1.hdslb.com',
      's2.hdslb.com',
      'biliimg.com',
      'bilicdn.com',
      'b23.tv',
      // 小红书图片域名
      'xhscdn.com',
      'xhslink.com',
      'sns-webpic-qc.xhscdn.com',
      'ci.xiaohongshu.com',
      // 抖音图片域名
      'p3-sign.douyinpic.com',
      'p6-sign.douyinpic.com',
      'p9-sign.douyinpic.com',
      'p26-sign.douyinpic.com',
      'p29-sign.douyinpic.com',
      'p3.douyinpic.com',
      'p6.douyinpic.com',
      'p9.douyinpic.com',
      'p26.douyinpic.com',
      'p29.douyinpic.com',
      'douyinpic.com',
    ];
    
    let urlObj: URL;
    try {
      urlObj = new URL(imageUrl);
    } catch (error) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));
    
    if (!isAllowed) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({ error: 'Domain not allowed' });
    }

    // 获取图片，设置正确的 Referer 头
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    try {
      // 根据图片域名设置不同的 Referer
      let referer = 'https://www.bilibili.com/';
      if (imageUrl.includes('sinaimg.cn')) {
        referer = 'https://weibo.com/';
      } else if (imageUrl.includes('xhscdn.com') || imageUrl.includes('xhslink.com')) {
        referer = 'https://www.xiaohongshu.com/';
      } else if (imageUrl.includes('douyinpic.com')) {
        referer = 'https://www.douyin.com/';
      } else if (imageUrl.includes('hdslb.com') || imageUrl.includes('biliimg.com') || imageUrl.includes('bilicdn.com')) {
        referer = 'https://www.bilibili.com/';
      }

      const response = await fetch(imageUrl, {
        headers: {
          'Referer': referer,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}` });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 设置响应头（必须在发送数据之前设置）
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 缓存1天
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Content-Length', buffer.length.toString());

      // 返回图片数据
      res.send(buffer);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        res.setHeader('Content-Type', 'application/json');
        return res.status(504).json({ error: 'Request timeout' });
      }
      throw fetchError;
    }
  } catch (error: any) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;


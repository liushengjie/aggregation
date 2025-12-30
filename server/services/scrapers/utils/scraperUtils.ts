/**
 * 爬虫通用工具类
 * 提供频率控制、User-Agent轮换、重试机制等功能
 */

/**
 * User-Agent 池
 */
const USER_AGENTS = [
    // Chrome on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    
    // Chrome on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    
    // Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    
    // Safari on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    
    // Edge on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
];

/**
 * 获取随机 User-Agent
 */
export function getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * 获取真实的浏览器请求头
 */
export function getRealisticHeaders(platform: 'weibo' | 'xiaohongshu' | 'bilibili' = 'weibo'): Record<string, string> {
    const baseHeaders = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'User-Agent': getRandomUserAgent(),
    };

    // 根据平台添加特定请求头
    switch (platform) {
        case 'weibo':
            return {
                ...baseHeaders,
                'Referer': 'https://weibo.com/',
            };
        case 'xiaohongshu':
            return {
                ...baseHeaders,
                'Referer': 'https://www.xiaohongshu.com/',
            };
        case 'bilibili':
            return {
                ...baseHeaders,
                'Referer': 'https://www.bilibili.com/',
            };
        default:
            return baseHeaders;
    }
}

/**
 * 自适应频率控制器
 */
export class AdaptiveRateLimiter {
    private baseInterval: number;
    private currentInterval: number;
    private maxInterval: number;
    private minInterval: number;
    private lastRequestTime: number = 0;
    private successCount: number = 0;
    private failureCount: number = 0;

    constructor(baseInterval: number, maxInterval?: number, minInterval?: number) {
        this.baseInterval = baseInterval;
        this.currentInterval = baseInterval;
        this.maxInterval = maxInterval || baseInterval * 10;
        this.minInterval = minInterval || baseInterval * 0.5;
    }

    /**
     * 等待到下次可以请求的时间
     */
    async wait(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        const delay = this.getDelay();

        if (elapsed < delay) {
            const waitTime = delay - elapsed;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    /**
     * 记录成功请求
     */
    onSuccess(): void {
        this.successCount++;
        this.failureCount = 0;

        // 连续成功3次，逐步减少延迟
        if (this.successCount >= 3) {
            this.currentInterval = Math.max(
                this.minInterval,
                this.currentInterval * 0.9
            );
            this.successCount = 0;
        }
    }

    /**
     * 记录失败请求
     */
    onFailure(statusCode?: number): void {
        this.failureCount++;
        this.successCount = 0;

        // 根据状态码调整延迟
        if (statusCode === 429 || statusCode === 403) {
            // 被限流或禁止，大幅增加延迟
            this.currentInterval = Math.min(
                this.maxInterval,
                this.currentInterval * 2
            );
        } else {
            // 其他错误，小幅增加延迟
            this.currentInterval = Math.min(
                this.maxInterval,
                this.currentInterval * 1.2
            );
        }
    }

    /**
     * 获取当前延迟（带随机抖动）
     */
    private getDelay(): number {
        // 添加 ±20% 的随机抖动
        const jitter = this.currentInterval * 0.2 * (Math.random() * 2 - 1);
        return Math.max(0, this.currentInterval + jitter);
    }

    /**
     * 获取当前状态
     */
    getStats() {
        return {
            currentInterval: this.currentInterval,
            successCount: this.successCount,
            failureCount: this.failureCount,
        };
    }

    /**
     * 重置为初始状态
     */
    reset(): void {
        this.currentInterval = this.baseInterval;
        this.successCount = 0;
        this.failureCount = 0;
    }
}

/**
 * 重试配置
 */
export interface RetryConfig {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryableStatusCodes?: number[];
}

/**
 * 带指数退避的重试函数
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {}
): Promise<T> {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        retryableStatusCodes = [408, 429, 500, 502, 503, 504],
    } = config;

    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // 最后一次尝试，直接抛出错误
            if (attempt === maxRetries - 1) {
                break;
            }

            // 检查是否应该重试
            const statusCode = error.statusCode || error.status || error.response?.status;
            
            // 权限问题不重试
            if (statusCode === 401 || statusCode === 403) {
                console.warn(`[Retry] Auth error (${statusCode}), not retrying`);
                throw error;
            }

            // 检查是否是可重试的状态码
            if (statusCode && !retryableStatusCodes.includes(statusCode)) {
                console.warn(`[Retry] Non-retryable status code: ${statusCode}`);
                throw error;
            }

            // 计算延迟（指数退避）
            const delay = Math.min(
                maxDelay,
                baseDelay * Math.pow(2, attempt)
            );

            // 添加随机抖动
            const jitter = delay * 0.2 * (Math.random() * 2 - 1);
            const finalDelay = Math.max(0, delay + jitter);

            console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${Math.round(finalDelay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
    }

    throw lastError;
}

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机延迟
 */
export async function randomDelay(min: number, max: number): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await sleep(delay);
}

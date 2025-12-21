import React, { useState, useRef, useEffect } from 'react';
import { accountsApi } from '../api/api';
import { PLATFORMS_CONFIG, PLATFORM_NAMES } from '../constants';
import { Platform } from '../types';
import { X, ExternalLink, Check, AlertCircle, Loader2, Copy, Info } from 'lucide-react';

interface PlatformAccount {
    id: number;
    platform: Platform;
    platform_username: string | null;
    status: 'connected' | 'disconnected' | 'pending' | 'error';
    last_sync: string | null;
}

interface PopupLoginModalProps {
    platform: Platform;
    onClose: () => void;
    onSuccess: () => void;
}

const PLATFORM_LOGIN_URLS: Record<Platform, string> = {
    Weibo: 'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog&disp=popup',
    Bilibili: 'https://passport.bilibili.com/login',
    Xiaohongshu: 'https://www.xiaohongshu.com/',
    Douyin: 'https://www.douyin.com/',
};

const PopupLoginModal: React.FC<PopupLoginModalProps> = ({ platform, onClose, onSuccess }) => {
    const [cookieInput, setCookieInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [validating, setValidating] = useState(false);
    const [cookiePreview, setCookiePreview] = useState<Record<string, string>>({});
    const popupRef = useRef<Window | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            // Cleanup: close popup and clear interval
            if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
            }
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
        };
    }, []);

    // Cookie 提取脚本（用户可以复制到控制台运行）
    const getCookieExtractionScript = () => {
        return `
// ============================================
// Cookie 提取脚本 - ${PLATFORM_NAMES[platform]}
// ============================================
// 在登录页面的控制台（F12 -> Console）运行此脚本

(function() {
    try {
        // 提取所有 Cookie
        const cookies = document.cookie.split(';').map(c => c.trim()).filter(c => c);
        const cookieString = cookies.join('; ');
        
        if (!cookieString) {
            alert('❌ 未找到 Cookie，请确保已登录成功！');
            return;
        }
        
        // 解析 Cookie 对象（用于显示）
        const cookieObj = {};
        cookies.forEach(cookie => {
            const [name, ...valueParts] = cookie.split('=');
            cookieObj[name] = valueParts.join('=');
        });
        
        console.log('\\n✅ 提取的 Cookie:');
        console.log(cookieString);
        console.log('\\n📋 Cookie 详情:');
        console.table(cookieObj);
        
        // 复制到剪贴板
        navigator.clipboard.writeText(cookieString).then(() => {
            console.log('\\n✅ Cookie 已复制到剪贴板！');
            alert('✅ Cookie 已复制到剪贴板！\\n\\n请返回登录窗口，将 Cookie 粘贴到表单中。\\n\\nCookie 数量: ' + cookies.length + ' 个');
        }).catch(err => {
            console.error('复制失败:', err);
            console.log('\\n请手动复制上面的 Cookie 字符串');
            alert('请手动复制控制台中显示的 Cookie 字符串');
        });
    } catch (error) {
        console.error('提取 Cookie 时出错:', error);
        alert('提取 Cookie 失败: ' + error.message);
    }
})();
        `.trim();
    };

    // 解析 Cookie 字符串
    const parseCookies = (cookieString: string): Record<string, string> => {
        const cookies: Record<string, string> = {};
        if (!cookieString.trim()) return cookies;
        
        cookieString.split(';').forEach(cookie => {
            const trimmed = cookie.trim();
            if (trimmed) {
                const [name, ...valueParts] = trimmed.split('=');
                if (name) {
                    cookies[name.trim()] = valueParts.join('=').trim();
                }
            }
        });
        return cookies;
    };

    // 验证 Cookie 格式
    const validateCookie = (cookieString: string): { valid: boolean; message: string } => {
        if (!cookieString.trim()) {
            return { valid: false, message: 'Cookie 不能为空' };
        }

        const cookies = parseCookies(cookieString);
        const cookieCount = Object.keys(cookies).length;

        if (cookieCount === 0) {
            return { valid: false, message: 'Cookie 格式错误，未找到有效的 Cookie 项' };
        }

        // 平台特定的 Cookie 检查
        const platformChecks: Record<Platform, string[]> = {
            Weibo: ['SUB', 'SUBP', 'SSOLoginState'],
            Bilibili: ['SESSDATA', 'bili_jct', 'DedeUserID'],
            Xiaohongshu: ['id_token', 'customer'],
            Douyin: ['sessionid', 'sid_guard', 'uid_tt'],
        };

        const requiredCookies = platformChecks[platform] || [];
        const foundRequired = requiredCookies.filter(name => 
            Object.keys(cookies).some(key => key.toLowerCase().includes(name.toLowerCase()))
        );

        if (foundRequired.length === 0 && requiredCookies.length > 0) {
            return { 
                valid: true, 
                message: `警告：未找到平台关键 Cookie（${requiredCookies.join(', ')}），可能登录失败` 
            };
        }

        return { valid: true, message: `✅ 找到 ${cookieCount} 个 Cookie，包含 ${foundRequired.length} 个关键 Cookie` };
    };

    const openLoginPopup = () => {
        setError('');
        setStatus('正在打开登录窗口...');

        const loginUrl = PLATFORM_LOGIN_URLS[platform];
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
            loginUrl,
            `${platform}登录`,
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
            setError('无法打开弹出窗口。请检查浏览器弹窗拦截设置。');
            return;
        }

        popupRef.current = popup;

        // 监听 popup 关闭
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                if (checkIntervalRef.current) {
                    clearInterval(checkIntervalRef.current);
                }
                if (!cookieInput) {
                    setStatus('登录窗口已关闭');
                }
            }
        }, 500);

        setStatus('请在弹出窗口中完成登录，然后：\n1. 登录成功后，在弹出窗口按 F12 打开开发者工具\n2. 在控制台运行提取脚本\n3. 将 Cookie 粘贴到下方表单');
    };

    const handleSubmitCookie = async () => {
        if (!cookieInput.trim()) {
            setError('请输入 Cookie');
            return;
        }

        // 先验证 Cookie 格式
        const validation = validateCookie(cookieInput);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        // 如果只是警告，询问用户是否继续
        if (validation.message.includes('警告')) {
            const confirmed = window.confirm(
                validation.message + '\n\n是否继续提交？'
            );
            if (!confirmed) {
                return;
            }
        }

        setLoading(true);
        setError('');
        setStatus('正在验证并保存 Cookie...');

        try {
            // 先验证 Cookie 是否有效（可选，如果后端支持）
            setValidating(true);
            
            const result = await accountsApi.saveCookie(platform, cookieInput.trim());
            setStatus('✅ Cookie 保存成功！');
            
            // 关闭 popup
            if (popupRef.current && !popupRef.current.closed) {
                popupRef.current.close();
            }

            // 调用成功回调
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err.message || '保存 Cookie 失败');
            setStatus('');
        } finally {
            setLoading(false);
            setValidating(false);
        }
    };

    const copyScript = () => {
        const script = getCookieExtractionScript();
        navigator.clipboard.writeText(script).then(() => {
            setStatus('✅ 提取脚本已复制到剪贴板！请在登录窗口的控制台运行。');
        }).catch(() => {
            setError('复制失败，请手动复制脚本');
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">
                            {PLATFORM_NAMES[platform]} 登录
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-2">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-2 text-sm text-blue-900">
                                <p className="font-semibold">使用说明：</p>
                                <ol className="list-decimal list-inside space-y-1 ml-2">
                                    <li>点击下方"打开登录窗口"按钮</li>
                                    <li>在弹出窗口中完成登录（扫码/密码/验证码等）</li>
                                    <li>登录成功后，在弹出窗口按 <kbd className="px-2 py-1 bg-blue-100 rounded text-xs">F12</kbd> 打开开发者工具</li>
                                    <li>点击下方"复制提取脚本"按钮</li>
                                    <li>在控制台（Console）中粘贴并运行脚本</li>
                                    <li>Cookie 会自动复制，粘贴到下方表单并提交</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                        <button
                            onClick={openLoginPopup}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center space-x-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>打开登录窗口</span>
                        </button>
                        <button
                            onClick={copyScript}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2"
                        >
                            <Copy className="w-4 h-4" />
                            <span>复制提取脚本</span>
                        </button>
                    </div>

                    {/* Status */}
                    {status && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-sm text-gray-700 whitespace-pre-line">{status}</p>
                        </div>
                    )}

                    {/* Cookie Input */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Cookie（从控制台提取后粘贴到这里）
                        </label>
                        <textarea
                            value={cookieInput}
                            onChange={(e) => {
                                const value = e.target.value;
                                setCookieInput(value);
                                const parsed = parseCookies(value);
                                setCookiePreview(parsed);
                            }}
                            placeholder="粘贴 Cookie 字符串（格式：name1=value1; name2=value2; ...）"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                            rows={4}
                        />
                        
                        {/* Cookie 预览和验证 */}
                        {cookieInput.trim() && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                {(() => {
                                    const validation = validateCookie(cookieInput);
                                    return (
                                        <div className={`text-sm ${validation.valid ? 'text-green-700' : 'text-amber-700'}`}>
                                            {validation.message}
                                        </div>
                                    );
                                })()}
                                
                                {Object.keys(cookiePreview).length > 0 && (
                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                            查看 Cookie 详情 ({Object.keys(cookiePreview).length} 个)
                                        </summary>
                                        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                                            {Object.entries(cookiePreview).slice(0, 10).map(([name, value]) => (
                                                <div key={name} className="font-mono">
                                                    <span className="text-blue-600">{name}</span>
                                                    <span className="text-gray-500"> = </span>
                                                    <span className="text-gray-700">
                                                        {value.length > 50 ? value.substring(0, 50) + '...' : value}
                                                    </span>
                                                </div>
                                            ))}
                                            {Object.keys(cookiePreview).length > 10 && (
                                                <div className="text-gray-500">
                                                    ... 还有 {Object.keys(cookiePreview).length - 10} 个 Cookie
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3 pt-2">
                        <button
                            onClick={handleSubmitCookie}
                            disabled={loading || validating || !cookieInput.trim()}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {loading || validating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{validating ? '验证中...' : '保存中...'}</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>提交 Cookie</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PopupLoginModal;


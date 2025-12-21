import React, { useState, useEffect, useRef } from 'react';
import { accountsApi } from '../api/api';
import { PLATFORMS_CONFIG, PLATFORM_NAMES } from '../constants';
import { Platform } from '../types';
import { X, ExternalLink, Check, AlertCircle, Loader2, RefreshCw, Unplug, ShieldCheck, Info, QrCode, Lock } from 'lucide-react';
import PopupLoginModal from './PopupLoginModal';

interface PlatformAccount {
    id: number;
    platform: Platform;
    platform_username: string | null;
    status: 'connected' | 'disconnected' | 'pending' | 'error';
    last_sync: string | null;
}

interface LoginDialogState {
    platform: Platform;
    sessionId: string;
    screenshot: string | null;
    screenshotVersion: number;
    supportsPassword: boolean;
    needsCaptcha?: boolean;
}

const PlatformLoginModal: React.FC = () => {
    const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loginStatus, setLoginStatus] = useState<string>('');
    
    // Login dialog state
    const [loginDialog, setLoginDialog] = useState<LoginDialogState | null>(null);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [submittingCredentials, setSubmittingCredentials] = useState(false);
    const [captchaCode, setCaptchaCode] = useState('');
    const [submittingCaptcha, setSubmittingCaptcha] = useState(false);
    
    // Popup login state
    const [showPopupLogin, setShowPopupLogin] = useState(false);
    const [popupLoginPlatform, setPopupLoginPlatform] = useState<Platform | null>(null);

    // Polling ref to keep track of active polls
    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const screenshotPollRef = useRef<NodeJS.Timeout | null>(null);
    const loginDialogRef = useRef<LoginDialogState | null>(null);
    const syncTriggeredRef = useRef<Set<string>>(new Set()); // Track which platforms have already triggered sync

    const platforms: Platform[] = ['Weibo', 'Bilibili', 'Xiaohongshu'];

    const loadAccounts = async () => {
        try {
            const data = await accountsApi.getAll();
            setAccounts(data.accounts || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            if (screenshotPollRef.current) clearInterval(screenshotPollRef.current);
        };
    }, []);

    const getAccountStatus = (platform: Platform) => {
        const account = accounts.find(a => a.platform === platform);
        return account?.status || 'disconnected';
    };

    const pollLoginStatus = async (platform: Platform, sessionId: string) => {
        const check = async () => {
            try {
                const statusData = await accountsApi.checkLoginStatus(platform, sessionId);

                // Update screenshot if version changed
                const currentDialog = loginDialogRef.current;
                if (currentDialog && statusData.screenshotVersion !== undefined) {
                    if (statusData.screenshotVersion !== currentDialog.screenshotVersion) {
                        // Screenshot changed, update it
                        try {
                            const screenshotData = await accountsApi.getLoginScreenshot(platform, sessionId);
                            setLoginDialog(prev => {
                                const updated = prev ? {
                                    ...prev,
                                    screenshot: screenshotData.screenshot,
                                    screenshotVersion: statusData.screenshotVersion || 0,
                                    supportsPassword: statusData.supportsPassword ?? prev.supportsPassword,
                                } : null;
                                loginDialogRef.current = updated;
                                return updated;
                            });
                        } catch (err) {
                            console.error('Failed to fetch screenshot:', err);
                        }
                    }
                }
                
                // Update supportsPassword and needsCaptcha if available
                if (currentDialog) {
                    const needsUpdate = 
                        (statusData.supportsPassword !== undefined && statusData.supportsPassword !== currentDialog.supportsPassword) ||
                        (statusData.needsCaptcha !== undefined && statusData.needsCaptcha !== currentDialog.needsCaptcha);
                    
                    if (needsUpdate) {
                        setLoginDialog(prev => {
                            const updated = prev ? {
                                ...prev,
                                supportsPassword: statusData.supportsPassword ?? prev.supportsPassword,
                                needsCaptcha: statusData.needsCaptcha ?? prev.needsCaptcha,
                            } : null;
                            loginDialogRef.current = updated;
                            return updated;
                        });
                    }
                }

                if (statusData.status === 'success') {
                    // 防止重复触发同步
                    const syncKey = `${platform}-${sessionId}`;
                    if (syncTriggeredRef.current.has(syncKey)) {
                        // 已经处理过这个登录成功事件，跳过
                        return;
                    }
                    
                    // 标记已处理
                    syncTriggeredRef.current.add(syncKey);
                    
                    if (pollRef.current) clearInterval(pollRef.current);
                    if (screenshotPollRef.current) clearInterval(screenshotPollRef.current);
                    setLoginStatus('登录成功！正在同步...');
                    setActionLoading(null);
                    setLoginDialog(null);
                    loginDialogRef.current = null;
                    setShowPasswordForm(false);
                    setCredentials({ username: '', password: '' });
                    
                    // 重新加载账号列表以获取最新状态
                    await loadAccounts();
                    
                    // 自动触发一次同步（只执行一次）
                    try {
                        await accountsApi.sync(platform);
                        console.log(`自动同步已启动: ${platform}`);
                    } catch (syncErr: any) {
                        console.error(`自动同步启动失败:`, syncErr);
                        // 同步失败不影响登录成功的提示
                    }
                    
                    setTimeout(() => setLoginStatus(''), 3000);
                } else if (statusData.status === 'failed' || statusData.status === 'timeout') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    if (screenshotPollRef.current) clearInterval(screenshotPollRef.current);
                    setError(statusData.error || '登录失败');
                    setActionLoading(null);
                    setLoginStatus('');
                    setLoginDialog(null);
                    loginDialogRef.current = null;
                    setShowPasswordForm(false);
                    setCredentials({ username: '', password: '' });
                } else {
                    setLoginStatus('等待登录完成...');
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        };

        // Poll every 2 seconds
        pollRef.current = setInterval(check, 2000);
        check(); // Initial check
    };

    // Poll screenshot separately for more frequent updates
    const pollScreenshot = (platform: Platform, sessionId: string) => {
        const checkScreenshot = async () => {
            if (!loginDialogRef.current) {
                if (screenshotPollRef.current) {
                    clearInterval(screenshotPollRef.current);
                    screenshotPollRef.current = null;
                }
                return;
            }
            
            try {
                const screenshotData = await accountsApi.getLoginScreenshot(platform, sessionId);
                if (screenshotData.screenshot) {
                    setLoginDialog(prev => {
                        const updated = prev ? {
                            ...prev,
                            screenshot: screenshotData.screenshot,
                        } : null;
                        loginDialogRef.current = updated;
                        return updated;
                    });
                } else {
                    // If screenshot is null and we had one before, browser might be closed
                    // Continue polling in case it's just temporarily unavailable
                }
            } catch (err: any) {
                // If error indicates browser closed, stop polling
                if (err.message?.includes('not found') || err.message?.includes('expired')) {
                    if (screenshotPollRef.current) {
                        clearInterval(screenshotPollRef.current);
                        screenshotPollRef.current = null;
                    }
                }
                // Otherwise ignore screenshot fetch errors (might be temporary)
            }
        };

        // Poll screenshot every 2 seconds
        screenshotPollRef.current = setInterval(checkScreenshot, 2000);
    };

    const handleConnect = async (platform: Platform) => {
        if (actionLoading) return;

        // 对于抖音，使用 Popup 登录方式（更简单可靠，避免验证码检测问题）
        if (platform === 'Douyin') {
            setPopupLoginPlatform(platform);
            setShowPopupLogin(true);
            setActionLoading(null);
            return;
        }

        // 原有的 Playwright 登录方式（保留作为备选）
        setActionLoading(platform);
        setError('');
        setLoginStatus('正在启动登录窗口...');
        setShowPasswordForm(false);
        setCredentials({ username: '', password: '' });

        try {
            const data = await accountsApi.initiateLogin(platform);

            if (data.sessionId) {
                setLoginStatus('请扫码或输入密码登录...');
                
                // 清理之前的同步触发记录
                syncTriggeredRef.current.delete(`${platform}-${data.sessionId}`);
                
                // Wait a bit for initial screenshot to be ready
                setTimeout(async () => {
                    try {
                        const screenshotData = await accountsApi.getLoginScreenshot(platform, data.sessionId);
                        const statusData = await accountsApi.checkLoginStatus(platform, data.sessionId);
                        
                        const dialogState = {
                            platform,
                            sessionId: data.sessionId,
                            screenshot: screenshotData.screenshot || null,
                            screenshotVersion: statusData.screenshotVersion || 0,
                            supportsPassword: statusData.supportsPassword ?? true,
                            needsCaptcha: statusData.needsCaptcha ?? false,
                        };
                        setLoginDialog(dialogState);
                        loginDialogRef.current = dialogState;
                        
                        // Start polling
                        pollLoginStatus(platform, data.sessionId);
                        pollScreenshot(platform, data.sessionId);
                    } catch (err) {
                        console.error('Failed to load initial screenshot:', err);
                        // Still start polling even if screenshot fails
                        pollLoginStatus(platform, data.sessionId);
                    }
                }, 3000);
            } else {
                throw new Error('Failed to start login session');
            }
        } catch (err: any) {
            setError(err.message);
            setActionLoading(null);
            setLoginStatus('');
        }
    };

    const handleCloseLoginDialog = async () => {
        // 停止轮询
        if (pollRef.current) clearInterval(pollRef.current);
        if (screenshotPollRef.current) clearInterval(screenshotPollRef.current);
        
        // 如果有活动的登录会话，取消它并关闭后端浏览器
        if (loginDialog?.platform && loginDialog?.sessionId) {
            const syncKey = `${loginDialog.platform}-${loginDialog.sessionId}`;
            syncTriggeredRef.current.delete(syncKey);
            
            try {
                await accountsApi.cancelLogin(loginDialog.platform, loginDialog.sessionId);
                console.log(`已取消登录会话: ${loginDialog.platform}`);
            } catch (err) {
                console.error('取消登录会话失败:', err);
                // 即使取消失败，也继续关闭对话框
            }
        }
        
        setLoginDialog(null);
        loginDialogRef.current = null;
        setShowPasswordForm(false);
        setCredentials({ username: '', password: '' });
        setCaptchaCode('');
        setSubmittingCaptcha(false);
        setActionLoading(null);
        setLoginStatus('');
    };

    const handleSubmitCredentials = async () => {
        if (!loginDialog || !credentials.username || !credentials.password) {
            setError('请输入用户名和密码');
            return;
        }

        setSubmittingCredentials(true);
        setError('');

        try {
            await accountsApi.submitCredentials(
                loginDialog.platform,
                loginDialog.sessionId,
                credentials.username,
                credentials.password
            );
            setLoginStatus('正在验证登录信息...');
            // Wait a bit and check if captcha is needed
            setTimeout(async () => {
                try {
                    const statusData = await accountsApi.checkLoginStatus(loginDialog!.platform, loginDialog!.sessionId);
                    if (statusData.needsCaptcha) {
                        setLoginDialog(prev => prev ? { ...prev, needsCaptcha: true } : null);
                        loginDialogRef.current = loginDialogRef.current ? { ...loginDialogRef.current, needsCaptcha: true } : null;
                    }
                } catch {
                    // Ignore errors
                }
            }, 2000);
        } catch (err: any) {
            setError(err.message || '登录失败，请重试');
            setSubmittingCredentials(false);
        }
    };

    const handleSubmitCaptcha = async () => {
        if (!loginDialog || !captchaCode) {
            setError('请输入验证码');
            return;
        }

        setSubmittingCaptcha(true);
        setError('');

        try {
            await accountsApi.submitCaptcha(loginDialog.platform, loginDialog.sessionId, captchaCode);
            setLoginStatus('正在验证验证码...');
            setCaptchaCode('');
        } catch (err: any) {
            setError(err.message || '验证码提交失败，请重试');
            setSubmittingCaptcha(false);
        }
    };

    const handleDisconnect = async (platform: Platform) => {
        if (!confirm(`确定要断开 ${PLATFORM_NAMES[platform]} 账号吗？`)) return;

        setActionLoading(platform);
        try {
            await accountsApi.disconnect(platform);
            await loadAccounts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSync = async (platform: Platform) => {
        setActionLoading(platform);
        try {
            await accountsApi.sync(platform);
            alert(`${PLATFORM_NAMES[platform]} 同步已启动！`);
            await loadAccounts();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-50/50 rounded-md border border-slate-200/50 border-dashed backdrop-blur-sm">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Loading Accounts...</p>
            </div>
        );
    }

    return (
        <>
            {/* Popup Login Modal */}
            {showPopupLogin && popupLoginPlatform && (
                <PopupLoginModal
                    platform={popupLoginPlatform}
                    onClose={() => {
                        setShowPopupLogin(false);
                        setPopupLoginPlatform(null);
                        setActionLoading(null);
                    }}
                    onSuccess={async () => {
                        await loadAccounts();
                        setShowPopupLogin(false);
                        setPopupLoginPlatform(null);
                        setActionLoading(null);
                        setLoginStatus('登录成功！');
                        setTimeout(() => setLoginStatus(''), 3000);
                    }}
                />
            )}
            
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            {error && (
                <div className="bg-rose-50/80 backdrop-blur-sm border border-rose-200 text-rose-600 px-4 py-3 rounded-md flex items-center gap-2 text-xs font-bold shadow-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {loginStatus && (
                <div className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 text-indigo-600 px-4 py-3 rounded-md flex items-center gap-2 text-xs font-bold shadow-sm animate-pulse">
                    <Loader2 size={16} className="animate-spin" />
                    {loginStatus}
                </div>
            )}

            <div className="grid grid-cols-1 gap-3">
                {platforms.map((platform) => {
                    const config = PLATFORMS_CONFIG[platform];
                    const status = getAccountStatus(platform);
                    const isLoading = actionLoading === platform;
                    const account = accounts.find(a => a.platform === platform);

                    return (
                        <div
                            key={platform}
                            className={`group relative bg-white/60 border border-slate-200/60 rounded-md p-4 flex items-center justify-between transition-all duration-300 hover:border-indigo-300 hover:shadow-md hover:bg-white/80 backdrop-blur-sm ${status === 'connected' ? 'bg-slate-50/40' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${config.color} rounded-md flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform duration-300`}>
                                    {config.icon('w-7 h-7 text-white')}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-slate-800">{PLATFORM_NAMES[platform]}</h4>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        {status === 'connected' ? (
                                            <>
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                                                <p className="text-xs font-bold text-slate-500">
                                                    {account?.platform_username || '已连接'}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                                                <p className="text-xs font-bold text-slate-400">未连接</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {status === 'connected' ? (
                                    <>
                                        <button
                                            onClick={() => handleSync(platform)}
                                            disabled={isLoading}
                                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-all disabled:opacity-50 border border-transparent hover:border-indigo-100"
                                            title="同步内容"
                                        >
                                            {isLoading ? (
                                                <Loader2 className="animate-spin" size={16} />
                                            ) : (
                                                <RefreshCw size={16} />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDisconnect(platform)}
                                            disabled={isLoading}
                                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-md transition-all disabled:opacity-50 border border-transparent hover:border-rose-100"
                                            title="断开连接"
                                        >
                                            <Unplug size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(platform)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-300/50 active:translate-y-0.5 hover:shadow-xl"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="animate-spin" size={14} />
                                        ) : (
                                            <ExternalLink size={14} />
                                        )}
                                        连接账号
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Login Dialog */}
            {loginDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-md shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${PLATFORMS_CONFIG[loginDialog.platform].color} rounded-md flex items-center justify-center`}>
                                    {PLATFORMS_CONFIG[loginDialog.platform].icon('w-6 h-6 text-white')}
                                </div>
                                <div>
                                    <h3 className="font-black text-sm text-slate-800">
                                        {PLATFORM_NAMES[loginDialog.platform]} 登录
                                    </h3>
                                    <p className="text-xs text-slate-500">请扫码或输入密码完成登录</p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseLoginDialog}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Screenshot */}
                            {loginDialog.screenshot && (
                                <div className="relative">
                                    <div className="bg-slate-50 rounded-md p-8 border-2 border-slate-200 flex items-center justify-center">
                                        <img
                                            src={loginDialog.screenshot}
                                            alt="登录页面"
                                            className="max-w-full h-auto rounded shadow-sm w-full"
                                        />
                                    </div>
                                    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500">
                                        <QrCode size={16} />
                                        <span>使用手机扫描二维码登录</span>
                                    </div>
                                </div>
                            )}

                            {!loginDialog.screenshot && (
                                <div className="bg-slate-50 rounded-md p-12 border-2 border-slate-200 flex flex-col items-center justify-center space-y-3 min-h-[400px]">
                                    <Loader2 className="animate-spin text-indigo-600" size={40} />
                                    <p className="text-base text-slate-500">正在加载登录页面...</p>
                                </div>
                            )}

                            {/* Password Login Option */}
                            {loginDialog.supportsPassword && (
                                <div className="border-t border-slate-200 pt-4">
                                    {!showPasswordForm ? (
                                        <button
                                            onClick={() => setShowPasswordForm(true)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition-all"
                                        >
                                            <Lock size={16} />
                                            使用密码登录
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    用户名/手机号
                                                </label>
                                                <input
                                                    type="text"
                                                    value={credentials.username}
                                                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                                                    placeholder="请输入用户名或手机号"
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                    密码
                                                </label>
                                                <input
                                                    type="password"
                                                    value={credentials.password}
                                                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                                                    placeholder="请输入密码"
                                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                />
                                            </div>
                                            {/* SMS Verification Code input (only for Xiaohongshu when needed) */}
                                            {loginDialog.platform === 'Xiaohongshu' && loginDialog.needsCaptcha && (
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                                        短信验证码
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={captchaCode}
                                                            onChange={(e) => setCaptchaCode(e.target.value)}
                                                            placeholder="请输入收到的短信验证码"
                                                            maxLength={6}
                                                            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                        />
                                                        <button
                                                            onClick={handleSubmitCaptcha}
                                                            disabled={submittingCaptcha || !captchaCode}
                                                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                        >
                                                            {submittingCaptcha ? (
                                                                <Loader2 className="animate-spin" size={16} />
                                                            ) : (
                                                                '提交'
                                                            )}
                                                        </button>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        验证码已发送到您的手机，请查收短信
                                                    </p>
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleSubmitCredentials}
                                                    disabled={submittingCredentials || !credentials.username || !credentials.password}
                                                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {submittingCredentials ? (
                                                        <>
                                                            <Loader2 className="animate-spin" size={16} />
                                                            登录中...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Lock size={16} />
                                                            登录
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowPasswordForm(false);
                                                        setCredentials({ username: '', password: '' });
                                                        setCaptchaCode('');
                                                    }}
                                                    className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-md border border-slate-300 transition-all"
                                                >
                                                    取消
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status Message */}
                            {loginStatus && (
                                <div className="bg-indigo-50 border border-indigo-200 text-indigo-600 px-4 py-2.5 rounded-md flex items-center gap-2 text-xs font-bold">
                                    <Loader2 size={14} className="animate-spin" />
                                    {loginStatus}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-md p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-8 -mt-8 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-white/20 p-1.5 rounded-md backdrop-blur-md border border-white/10">
                            <ShieldCheck size={16} className="text-white" />
                        </div>
                        <h4 className="font-black text-sm tracking-tight">远程登录说明</h4>
                    </div>
                    <ul className="space-y-2">
                        {[
                            '点击"连接"按钮，系统将在服务器端打开登录页面',
                            '在弹窗中查看二维码或使用密码登录',
                            '系统会自动检测登录状态并完成连接',
                            '二维码过期会自动刷新，无需手动操作'
                        ].map((text, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-medium text-indigo-100">
                                <div className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center text-[9px] shrink-0 mt-0.5 font-mono border border-white/10">{i + 1}</div>
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
        </>
    );
};

export default PlatformLoginModal;

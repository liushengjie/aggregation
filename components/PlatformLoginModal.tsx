import React, { useState, useEffect, useRef } from 'react';
import { accountsApi } from '../services/api';
import { PLATFORMS_CONFIG, PLATFORM_NAMES } from '../constants';
import { Platform } from '../types';
import { X, ExternalLink, Check, AlertCircle, Loader2, RefreshCw, Unplug, ShieldCheck, Info } from 'lucide-react';

interface PlatformAccount {
    id: number;
    platform: Platform;
    platform_username: string | null;
    status: 'connected' | 'disconnected' | 'pending' | 'error';
    last_sync: string | null;
}

const PlatformLoginModal: React.FC = () => {
    const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loginStatus, setLoginStatus] = useState<string>('');

    // Polling ref to keep track of active polls
    const pollRef = useRef<NodeJS.Timeout | null>(null);

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

                if (statusData.status === 'success') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setLoginStatus('登录成功！正在同步...');
                    setActionLoading(null);
                    await loadAccounts();
                    setTimeout(() => setLoginStatus(''), 3000);
                } else if (statusData.status === 'failed' || statusData.status === 'timeout') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setError(statusData.error || '登录失败');
                    setActionLoading(null);
                    setLoginStatus('');
                } else {
                    setLoginStatus('等待登录完成...');
                }
            } catch (err) {
                console.error('Poll error:', err);
            }
        };

        // Poll every 2 seconds
        pollRef.current = setInterval(check, 2000);
    };

    const handleConnect = async (platform: Platform) => {
        if (actionLoading) return;

        setActionLoading(platform);
        setError('');
        setLoginStatus('正在启动登录窗口...');

        try {
            const data = await accountsApi.initiateLogin(platform);

            if (data.sessionId) {
                setLoginStatus('请在新打开的浏览器窗口中登录...');
                // Start polling
                pollLoginStatus(platform, data.sessionId);
            } else {
                throw new Error('Failed to start login session');
            }
        } catch (err: any) {
            setError(err.message);
            setActionLoading(null);
            setLoginStatus('');
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
            <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-slate-50/50 rounded-lg border border-slate-200/50 border-dashed backdrop-blur-sm">
                <Loader2 className="animate-spin text-indigo-600" size={24} />
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Loading Accounts...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            {error && (
                <div className="bg-rose-50/80 backdrop-blur-sm border border-rose-200 text-rose-600 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {loginStatus && (
                <div className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-200 text-indigo-600 px-4 py-3 rounded-lg flex items-center gap-2 text-xs font-bold shadow-sm animate-pulse">
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
                            className={`group relative bg-white/60 border border-slate-200/60 rounded-lg p-4 flex items-center justify-between transition-all duration-300 hover:border-indigo-300 hover:shadow-md hover:bg-white/80 backdrop-blur-sm ${status === 'connected' ? 'bg-slate-50/40' : ''}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 ${config.color} rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform duration-300`}>
                                    {config.icon('w-6 h-6 text-white')}
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
                                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-all disabled:opacity-50 border border-transparent hover:border-indigo-100"
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
                                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-all disabled:opacity-50 border border-transparent hover:border-rose-100"
                                            title="断开连接"
                                        >
                                            <Unplug size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(platform)}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-300/50 active:translate-y-0.5 hover:shadow-xl"
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

            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-8 -mt-8 animate-pulse"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-white/20 p-1.5 rounded-md backdrop-blur-md border border-white/10">
                            <ShieldCheck size={16} className="text-white" />
                        </div>
                        <h4 className="font-black text-sm tracking-tight">自动连接说明</h4>
                    </div>
                    <ul className="space-y-2">
                        {[
                            '点击"连接"按钮，系统将自动打开浏览器窗口',
                            '在弹出的窗口中完成登录，无需手动复制 Cookie',
                            '系统会自动检测登录状态并完成连接',
                            '登录成功后窗口将自动关闭'
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
    );
};

export default PlatformLoginModal;

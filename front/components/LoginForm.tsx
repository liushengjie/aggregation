import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Loader2, ShieldCheck, Sparkles, Zap, ArrowRight } from 'lucide-react';
import PrismLogo from './PrismLogo';

interface LoginFormProps {
    onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('请填写用户名和密码');
            return;
        }

        if (!isLogin && password !== confirmPassword) {
            setError('两次密码输入不一致');
            return;
        }

        if (!isLogin && password.length < 6) {
            setError('密码至少需要6个字符');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await login(username, password);
            } else {
                await register(username, password);
            }
            onSuccess?.();
        } catch (err: any) {
            setError(err.message || '操作失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#eef2f6] relative overflow-hidden font-['Plus_Jakarta_Sans']">
            {/* Abstract Mesh Background */}
            <div className="absolute inset-0 opacity-60">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-400/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-rose-400/30 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[30%] right-[20%] w-[600px] h-[600px] bg-purple-400/30 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            <div className="relative z-10 w-full max-w-[400px] px-6 animate-in fade-in zoom-in-95 duration-700">
                <div className="ipad-glass rounded-md p-8 shadow-2xl shadow-indigo-500/10 border border-white/60 relative overflow-hidden">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-md flex items-center justify-center mx-auto mb-4">
                            <PrismLogo size={32} />
                        </div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight mb-1">棱镜聚合</h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {isLogin ? '欢迎回来' : '加入平台'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                用户名
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-white/50 border border-white/60 rounded-md px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none backdrop-blur-sm"
                                placeholder="输入用户名"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/50 border border-white/60 rounded-md px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none backdrop-blur-sm"
                                placeholder="输入密码"
                                disabled={loading}
                            />
                        </div>

                        {!isLogin && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    确认密码
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-white/50 border border-white/60 rounded-md px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none backdrop-blur-sm"
                                    placeholder="再次输入密码"
                                    disabled={loading}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="bg-rose-50/80 backdrop-blur-sm border border-rose-100 text-rose-600 px-4 py-3 rounded-md text-xs font-bold flex items-center gap-2 animate-shake">
                                <ShieldCheck size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-3.5 rounded-md font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group shadow-xl shadow-slate-300/50 hover:shadow-indigo-500/30 active:scale-95"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <>
                                    {isLogin ? '登录' : '创建账户'}
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-slate-200/50 text-center">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }}
                            className="text-slate-500 hover:text-indigo-600 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto group"
                        >
                            <Sparkles size={12} className="text-indigo-400 group-hover:rotate-12 transition-transform" />
                            {isLogin ? '创建新账户' : '返回登录'}
                        </button>
                    </div>
                </div>

                <p className="text-center mt-6 text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em]">
                    安全加密平台
                </p>
            </div>
        </div>
    );
};

export default LoginForm;

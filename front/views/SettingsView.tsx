import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PlatformLoginModal from '../components/PlatformLoginModal';
import {
  User,
  Shield,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Key,
  Smartphone,
  HelpCircle,
  AlertCircle,
  Menu,
  Settings
} from 'lucide-react';

const SettingsView: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('accounts');

  const tabs = [
    { id: 'accounts', name: '平台账号', icon: <Globe size={16} /> },
    { id: 'profile', name: '个人资料', icon: <User size={16} /> },
    { id: 'security', name: '安全设置', icon: <Shield size={16} /> },
    { id: 'notifications', name: '通知提醒', icon: <Bell size={16} /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <PlatformLoginModal />;
      case 'profile':
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-md border border-slate-200/50 backdrop-blur-sm">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-md flex items-center justify-center text-white text-xl font-black shadow-lg shadow-slate-300/50">
                {user?.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">{user?.username}</h3>
                <p className="text-[10px] text-indigo-500 font-bold mt-1 bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block border border-indigo-100">Premium Member</p>
                <div className="mt-2.5">
                  <button className="px-3 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    更换头像
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                <input type="text" defaultValue={user?.username} className="w-full bg-white/50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none backdrop-blur-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input type="email" defaultValue="user@example.com" className="w-full bg-white/50 border border-slate-200 rounded-md px-3 py-2.5 text-sm font-bold focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none backdrop-blur-sm" />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 animate-in fade-in duration-300 border border-dashed border-slate-300/50 rounded-md bg-slate-50/30">
            <div className="w-12 h-12 bg-white rounded-md border border-slate-200 flex items-center justify-center shadow-sm">
              <AlertCircle size={20} className="text-slate-300" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">功能开发中</h3>
              <p className="text-xs text-slate-400 font-medium max-w-xs mt-1">该设置选项正在全力开发中。</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 pb-4">
      <header className="ipad-glass rounded-none lg:rounded-md mb-0 lg:mb-4 px-3 lg:px-4 py-2 lg:py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4 shrink-0 z-40 border-b lg:border border-white/60 glass-shimmer">
        {/* Mobile: Top row */}
        <div className="flex items-center justify-between w-full lg:hidden">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => (window as any).toggleSidebar?.()}
              className="p-2 -ml-2 text-slate-600 hover:bg-white/50 rounded-md transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-md shadow-slate-200/50">
                <Settings size={16} strokeWidth={2.5} />
              </div>
              <div className="flex-shrink-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                  系统配置
                </h2>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                  Preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Left */}
        <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-md shadow-slate-200/50">
              <Settings size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-shrink-0">
              <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                系统配置
              </h2>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                Manage your account preferences and platform connections
              </p>
            </div>
          </div>
        </div>

        {/* Desktop: Right */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white/50 rounded-full border border-white/60 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm pulse-glow">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
            System Secure
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 lg:px-0 lg:pr-1 pt-3 lg:pt-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-60 space-y-1.5 stagger-item">
              <div className="hidden md:block mb-4 px-2">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">配置选项</h2>
              </div>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md transition-all duration-200 group ${activeTab === tab.id
                    ? 'bg-white text-indigo-600 font-bold shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:bg-white/60 hover:text-slate-800 font-medium'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {tab.icon}
                    </div>
                    <span className="text-sm">{tab.name}</span>
                  </div>
                  <ChevronRight size={14} className={`${activeTab === tab.id ? 'opacity-100 text-indigo-400' : 'opacity-0 group-hover:opacity-100'} transition-all`} />
                </button>
              ))}

              <div className="pt-4 mt-4 border-t border-slate-200/50">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-rose-500 hover:bg-rose-50/50 transition-all font-bold text-sm"
                >
                  <LogOut size={16} />
                  退出登录
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 ipad-glass rounded-md p-6 min-h-[500px] shadow-xl shadow-slate-200/50 border border-white/60 stagger-item" style={{ animationDelay: '100ms' }}>
              <div className="mb-6 pb-4 border-b border-slate-200/50">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  {tabs.find(t => t.id === activeTab)?.name}
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1.5">管理您的个人偏好与平台连接设置。</p>
              </div>

              {renderTabContent()}
            </div>
          </div>

          {/* Footer Support - Glass Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 stagger-item" style={{ animationDelay: '200ms' }}>
            {[
              { icon: <Key />, title: '隐私安全', desc: '端到端加密保护所有信息。' },
              { icon: <Smartphone />, title: '多端同步', desc: '随时随地同步平台配置。' },
              { icon: <HelpCircle />, title: '获取帮助', desc: '查看文档或联系支持。' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 ipad-glass rounded-md shadow-sm hover:shadow-md transition-all cursor-default border border-white/60">
                <div className="w-8 h-8 bg-white/60 rounded-md flex items-center justify-center text-slate-400 shrink-0 border border-white/50 shadow-sm">
                  {React.cloneElement(item.icon as React.ReactElement, { size: 16 })}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-xs mb-0.5">{item.title}</h4>
                  <p className="text-slate-400 text-[10px] font-medium leading-none">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
import React from 'react';
import { Gamepad2, Trophy, Users, TrendingUp, BarChart3, Globe, PlayCircle, ArrowUpRight, Menu } from 'lucide-react';

const GameView: React.FC = () => {
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
                <Gamepad2 size={16} strokeWidth={2.5} />
              </div>
              <div className="flex-shrink-0">
                <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                  全网游戏
                </h2>
                <p className="text-[9px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                  Game Hub
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Left */}
        <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-md shadow-slate-200/50">
              <Gamepad2 size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-shrink-0">
              <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
                全网游戏
              </h2>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
                Global Gaming Trends & Insights
              </p>
            </div>
          </div>
        </div>

        {/* Desktop: Right */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white/50 rounded-full border border-white/60 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm pulse-glow">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
            Live Updates
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 lg:px-0 lg:pr-1 pt-3 lg:pt-0">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Hero Section - Micro-Glass */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-slate-900 rounded-md p-6 text-white relative overflow-hidden shadow-xl shadow-purple-900/20 group stagger-item">
              <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/30 rounded-full blur-[100px] -mr-20 -mt-20 animate-pulse"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="bg-white/10 p-1.5 rounded-md backdrop-blur-md border border-white/10">
                    <Gamepad2 size={16} className="text-purple-300" />
                  </div>
                  <span className="text-purple-200 text-[10px] font-black uppercase tracking-widest">Gaming Daily Report</span>
                </div>

                <h3 className="text-3xl font-black mb-4 leading-tight tracking-tight">
                  今日全网 <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">热门游戏</span> 动态
                </h3>

                <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-xl mb-6">
                  实时汇总来自各平台的游戏内容、热门游戏话题和玩家动态，为您提供最新的游戏趋势与社区热点。
                </p>

                <div className="flex items-center gap-4">
                  <button className="px-4 py-2 bg-white text-slate-900 text-[10px] font-black uppercase tracking-wider rounded-md hover:bg-purple-50 transition-colors flex items-center gap-2 shadow-lg shadow-white/10">
                    View Full Report <ArrowUpRight size={14} />
                  </button>
                  <div className="h-4 w-px bg-white/20"></div>
                  <p className="text-slate-400 text-[10px] font-bold">Updated 2m ago</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 stagger-item" style={{ animationDelay: '100ms' }}>
              <div className="ipad-glass p-5 rounded-md h-[calc(50%-8px)] flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow border border-white/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Game Sources</span>
                  <Globe size={18} className="text-slate-300" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['Weibo', 'Bilibili', 'Douyin'].map(p => (
                    <span key={p} className="px-2.5 py-1 bg-white/60 text-slate-600 text-[10px] font-bold rounded-md border border-white/50 backdrop-blur-sm">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-5 rounded-md h-[calc(50%-8px)] flex flex-col justify-center text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500">
                  <PlayCircle size={70} />
                </div>
                <div className="relative z-10">
                  <p className="text-3xl font-black mb-1 tracking-tight">1.2M+</p>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Active Players</p>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid - Glass Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-item" style={{ animationDelay: '200ms' }}>
            {[
              { title: '热门游戏', icon: <Trophy />, color: 'amber', desc: '今日讨论度最高的游戏是《原神》和《王者荣耀》。' },
              { title: '游戏话题', icon: <TrendingUp />, color: 'blue', desc: '#新版本更新# 和 #游戏攻略# 话题热度持续上升。' },
              { title: '社区活跃', icon: <Users />, color: 'emerald', desc: '玩家社区互动率较昨日提升 18%，视频内容增长显著。' }
            ].map((item, i) => (
              <div key={i} className="ipad-glass p-5 rounded-md shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group border border-white/60">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 bg-${item.color}-50 text-${item.color}-600 rounded-md flex items-center justify-center border border-${item.color}-100 shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                    {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 mb-1.5">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Core Summary - Glass Panel */}
          <div className="ipad-glass rounded-md p-6 shadow-sm relative overflow-hidden border border-white/60 stagger-item" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-200/50">
              <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center text-white shadow-lg shadow-slate-300/50">
                <BarChart3 size={16} />
              </div>
              <h3 className="text-lg font-black text-slate-800">核心摘要</h3>
            </div>

            <div className="prose prose-slate max-w-none mb-4">
              <p className="text-sm text-slate-700 leading-loose font-medium">
                根据今日全网游戏数据分析，移动游戏和PC游戏内容呈现均衡发展态势。热门游戏相关话题在各大社交平台持续发酵，<span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-md font-bold mx-1 border border-purple-100">“游戏攻略”</span>和<span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-md font-bold mx-1 border border-purple-100">“新版本讨论”</span>成为主要增长点。B站游戏区视频播放量显著提升，游戏直播内容也受到广泛关注。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['#原神', '#王者荣耀', '#游戏攻略', '#新版本'].map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-white/50 text-slate-600 text-[10px] font-bold rounded-md border border-white/60 hover:bg-white hover:shadow-sm cursor-pointer transition-all">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameView;


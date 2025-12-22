
import React, { useState, useEffect } from 'react';
import { 
  Code, GitBranch, TrendingUp, Users, Star, Globe, Github, ArrowUpRight, Menu,
  Clock, Languages, Award, Sparkles, Zap, Eye, GitFork, Calendar, ExternalLink,
  Filter, Search, Grid3x3, ChevronDown
} from 'lucide-react';
import Masonry from 'react-masonry-css';
import { opensourceApi } from '../api/api';


interface TrendingProject {
  id?: number;
  repoFullName: string;
  repoName: string;
  description: string;
  language: string | null;
  stars: number;
  starsToday: number;
  forks: number;
  url: string;
  rank: number;
  period: 'today' | 'week' | 'month';
  languageFilter: string;
  fetchedAt?: string;
}

const OpenSourceView: React.FC = () => {
  const [trendingPeriod, setTrendingPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [trendingProjects, setTrendingProjects] = useState<TrendingProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Load trending projects
  useEffect(() => {
    const loadTrending = async () => {
      setLoading(true);
      try {
        const data = await opensourceApi.getTrending(trendingPeriod, selectedLanguage);
        if (data && data.items) {
          setTrendingProjects(data.items);
        }
      } catch (error) {
        console.error('Failed to load GitHub Trending:', error);
        setTrendingProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadTrending();
  }, [trendingPeriod, selectedLanguage]);

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 pb-4">
      {/* Header - 参考全网热剧样式 */}
      <header className="hidden lg:flex items-center gap-3 px-4 py-3 bg-white/40 backdrop-blur-md rounded-md mb-4 shrink-0 border border-white/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-lg shadow-slate-300/50">
            <Code size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-shrink-0">
            <h2 className="text-base font-black text-slate-800 tracking-tight leading-none whitespace-nowrap">
              全网开源
            </h2>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5 whitespace-nowrap uppercase tracking-widest">
              Open Source Projects & Trends
            </p>
          </div>
        </div>
      </header>

      {/* 移动端顶部标题 */}
      <div className="lg:hidden flex flex-col gap-2 px-3 py-3 border-b border-white/40 bg-white/30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (window as any).toggleSidebar?.()}
            className="p-2 -ml-2 text-slate-600 hover:bg-white/50 rounded-md transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-md shadow-slate-200/50">
              <Code size={16} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">
                全网开源
              </h2>
              <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">
                Open Source
              </p>
            </div>
          </div>
        </div>
        
        {/* 移动端周期和语言选择 */}
        <div className="flex items-center gap-2">
          {/* Period Toggle */}
          <div className="flex items-center gap-1 bg-white/50 rounded-md p-0.5 border border-white/60 flex-1">
            {(['today', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTrendingPeriod(period)}
                className={`flex-1 px-2 py-1 text-[10px] font-black rounded transition-all ${
                  trendingPeriod === period
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
              >
                {period === 'today' ? '今日' : period === 'week' ? '本周' : '本月'}
              </button>
            ))}
          </div>

          {/* Language Filter */}
          <div className="relative flex items-center gap-1 bg-white/50 rounded-md px-1.5 py-1 border border-white/60 hover:border-slate-300 transition-colors group">
            <Languages size={10} className="text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-[10px] font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-4 appearance-none focus:text-slate-900 min-w-[60px]"
            >
              <option value="all">全部</option>
              <option value="javascript">JS</option>
              <option value="typescript">TS</option>
              <option value="python">Py</option>
              <option value="go">Go</option>
              <option value="java">Java</option>
            </select>
            <ChevronDown size={9} className="absolute right-1.5 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden px-3 lg:px-0 pt-3 lg:pt-0">
        {/* 左侧 GitHub Trending - 桌面端占据三分之一 */}
        <div className="hidden lg:flex lg:flex-col lg:w-1/3 shrink-0 h-full">
          <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md rounded-lg border border-white/60 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {/* Header with Period and Language Selection */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-900 rounded-md flex items-center justify-center text-white shadow-lg">
                    <Github size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">GitHub Trending</h3>
                    <p className="text-xs text-slate-500 font-medium">热门开源项目</p>
                  </div>
                </div>
                
                {/* Period and Language Selection */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Period Toggle */}
                  <div className="flex items-center gap-1 bg-white/50 rounded-lg p-0.5 border border-white/60">
                    {(['today', 'week', 'month'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setTrendingPeriod(period)}
                        className={`px-2 py-1 text-[10px] font-black rounded transition-all whitespace-nowrap ${
                          trendingPeriod === period
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-white/70'
                        }`}
                      >
                        {period === 'today' ? '今日' : period === 'week' ? '本周' : '本月'}
                      </button>
                    ))}
                  </div>

                  {/* Language Filter - Dropdown */}
                  <div className="relative flex items-center gap-1.5 bg-white/50 rounded-lg px-2 py-1 border border-white/60 hover:border-slate-300 transition-colors group">
                    <Languages size={10} className="text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="text-[10px] font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer pr-5 appearance-none focus:text-slate-900 min-w-[80px]"
                    >
                      <option value="all">全部</option>
                      <option value="javascript">JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="python">Python</option>
                      <option value="go">Go</option>
                      <option value="java">Java</option>
                    </select>
                    <ChevronDown size={10} className="absolute right-2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Trending Projects List */}
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-slate-500 text-sm">加载中...</div>
                ) : trendingProjects.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">暂无数据</div>
                ) : (
                  trendingProjects.map((project) => (
                    <a
                      key={project.id || project.repoFullName}
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-white/50 rounded-md border border-white/60 hover:border-slate-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                          <Github size={14} className="text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <h4 className="text-sm font-black text-slate-800 truncate">{project.repoFullName}</h4>
                            <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
                          </div>
                          <p className="text-xs text-slate-600 font-medium line-clamp-2 mb-2 leading-relaxed">{project.description}</p>
                          
                          <div className="flex items-center gap-3 text-xs">
                            {project.language && (
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                  project.language === 'TypeScript' ? 'bg-blue-500' :
                                  project.language === 'JavaScript' ? 'bg-yellow-500' :
                                  project.language === 'Python' ? 'bg-yellow-400' :
                                  project.language === 'Rust' ? 'bg-orange-500' :
                                  project.language === 'Go' ? 'bg-cyan-500' :
                                  project.language === 'C++' ? 'bg-blue-600' : 'bg-slate-400'
                                }`}></div>
                                <span className="text-slate-700 font-bold">{project.language}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              <span className="font-bold">{project.starsToday.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧精选推荐 - 占据剩余空间 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-md rounded-lg border border-white/60 overflow-hidden">
              {/* Header */}
              <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-white/60 bg-gradient-to-r from-amber-50/80 to-orange-50/80">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-500" />
                  <h2 className="text-sm font-black text-slate-800">精选推荐</h2>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {/* 精选推荐功能待实现 */}
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Award size={32} className="mx-auto mb-3 opacity-50" />
                  <p>精选推荐功能待实现</p>
                </div>
                {/* <Masonry
                  breakpointCols={{
                    default: 3,
                    1024: 3,
                    768: 2,
                    640: 1,
                  }}
                  className="masonry-grid"
                  columnClassName="masonry-grid_column"
                >
                  {[].map((project) => (
                    <div
                      key={project.id}
                      className="group relative bg-white/40 backdrop-blur-md rounded-lg border border-white/60 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 mb-4"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Sparkles size={12} className="text-amber-500" />
                              <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Featured</span>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 mb-1">{project.name}</h4>
                            <p className="text-xs text-slate-600 font-medium mb-2 line-clamp-2">{project.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3 text-xs flex-wrap">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-bold text-[10px]">{project.language}</span>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md font-bold text-[10px]">{project.category}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center">
                              <Users size={10} className="text-slate-600" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">{project.author}</p>
                              <p className="text-[10px] text-slate-500">{project.platform}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-600">
                            <Star size={10} className="text-amber-500 fill-amber-500" />
                            <span className="font-bold">{project.stars.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="mb-2 p-2 bg-amber-50/50 rounded-md border border-amber-100">
                          <p className="text-[10px] text-amber-700 font-medium">💡 {project.reason}</p>
                        </div>

                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-1.5 bg-slate-900 text-white text-xs font-black rounded-md hover:bg-slate-800 transition-colors"
                        >
                          查看项目 <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  ))}
                </Masonry> */}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default OpenSourceView;

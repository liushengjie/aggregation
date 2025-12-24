import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsApi } from '../api/api';
import {
  BarChart3,
  Users,
  Eye,
  TrendingUp,
  Monitor,
  Globe,
  Smartphone,
  Tablet,
  Activity,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Statistics {
  totalPageViews: number;
  totalUniqueVisitors: number;
  pageViewsToday: number;
  uniqueVisitorsToday: number;
  pageViewsByDate: Array<{ date: string; count: number }>;
  uniqueVisitorsByDate: Array<{ date: string; count: number }>;
  topPages: Array<{ page_path: string; count: number }>;
  deviceStats: Array<{ device_type: string; count: number }>;
  browserStats: Array<{ browser: string; count: number }>;
  osStats: Array<{ os: string; count: number }>;
  referrerStats: Array<{ referrer_type: string; count: number }>;
}

const AdminDashboardView: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadStats();
  }, [days]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getStats(days);
      setStats(data);
    } catch (err: any) {
      setError(err.message || '加载统计数据失败');
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getBrowserIcon = (browser: string) => {
    const b = browser.toLowerCase();
    // Use Globe icon for all browsers since lucide-react doesn't have browser-specific icons
    // Different colors help distinguish browsers
    if (b.includes('chrome')) return <Globe size={16} className="text-blue-500" />;
    if (b.includes('firefox')) return <Globe size={16} className="text-orange-500" />;
    if (b.includes('safari')) return <Globe size={16} className="text-blue-400" />;
    return <Globe size={16} className="text-slate-400" />;
  };

  const getDeviceIcon = (device: string) => {
    const d = device.toLowerCase();
    if (d === 'mobile') return <Smartphone size={16} className="text-indigo-500" />;
    if (d === 'tablet') return <Tablet size={16} className="text-purple-500" />;
    return <Monitor size={16} className="text-slate-500" />;
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-800 mb-2">加载失败</h3>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!stats && !loading) {
    // If stats is null and not loading, try to reload
    useEffect(() => {
      loadStats();
    }, []);
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col animate-in fade-in duration-500 pb-4">
      {/* Header */}
      <header className="bg-white/40 backdrop-blur-md rounded-md mb-4 px-4 py-3 flex items-center justify-between shrink-0 border border-white/60">
        <div>
          <h2 className="text-base font-black text-slate-800">数据统计</h2>
          <p className="text-[10px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest">
            Analytics Dashboard
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-white/50 border border-slate-200 rounded-md text-sm font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none"
          >
            <option value={7}>最近7天</option>
            <option value={30}>最近30天</option>
            <option value={90}>最近90天</option>
          </select>
          <button
            onClick={loadStats}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-md transition-colors flex items-center gap-2"
          >
            <Activity size={16} />
            刷新
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 lg:px-0">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-indigo-100 rounded-md">
                  <Eye className="text-indigo-600" size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatNumber(stats.totalPageViews)}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">总访问量 (PV)</p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-md">
                  <Users className="text-green-600" size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatNumber(stats.totalUniqueVisitors)}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">总访客数 (UV)</p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-md">
                  <TrendingUp className="text-blue-600" size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatNumber(stats.pageViewsToday)}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">今日访问量</p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 rounded-md">
                  <Calendar className="text-purple-600" size={20} />
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800">{formatNumber(stats.uniqueVisitorsToday)}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">今日访客数</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Page Views Chart */}
            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} />
                访问趋势
              </h3>
              <div className="space-y-3">
                {stats.pageViewsByDate.slice(-10).map((item, index) => {
                  const maxCount = Math.max(...stats.pageViewsByDate.map(d => d.count));
                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  const date = new Date(item.date);
                  const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600">{dateStr}</span>
                        <span className="font-black text-slate-800">{item.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Pages */}
            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} />
                热门页面
              </h3>
              <div className="space-y-2">
                {stats.topPages.slice(0, 8).map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-md">
                    <span className="text-xs font-medium text-slate-700 truncate flex-1">
                      {page.page_path || '/'}
                    </span>
                    <span className="text-xs font-black text-indigo-600 ml-2">{page.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Device & Browser Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Device Stats */}
            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Monitor size={18} />
                设备类型
              </h3>
              <div className="space-y-3">
                {stats.deviceStats.map((device, index) => {
                  const total = stats.deviceStats.reduce((sum, d) => sum + d.count, 0);
                  const percentage = total > 0 ? ((device.count / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device_type)}
                        <span className="text-xs font-bold text-slate-700 capitalize">{device.device_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">{percentage}%</span>
                        <span className="text-xs font-black text-slate-800">{device.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Browser Stats */}
            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Globe size={18} />
                浏览器
              </h3>
              <div className="space-y-3">
                {stats.browserStats.map((browser, index) => {
                  const total = stats.browserStats.reduce((sum, b) => sum + b.count, 0);
                  const percentage = total > 0 ? ((browser.count / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getBrowserIcon(browser.browser)}
                        <span className="text-xs font-bold text-slate-700">{browser.browser}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">{percentage}%</span>
                        <span className="text-xs font-black text-slate-800">{browser.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OS Stats */}
            <div className="bg-white/50 backdrop-blur-sm rounded-md p-4 border border-slate-200/50">
              <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                <Activity size={18} />
                操作系统
              </h3>
              <div className="space-y-3">
                {stats.osStats.map((os, index) => {
                  const total = stats.osStats.reduce((sum, o) => sum + o.count, 0);
                  const percentage = total > 0 ? ((os.count / total) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{os.os}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">{percentage}%</span>
                        <span className="text-xs font-black text-slate-800">{os.count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardView;


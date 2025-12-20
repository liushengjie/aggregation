import React, { useState } from 'react';
import { MOCK_ACCOUNTS, PLATFORMS_CONFIG } from '../constants';
import { CheckCircle, XCircle, RefreshCw, Plus, Trash2, Key } from 'lucide-react';

const SettingsView: React.FC = () => {
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">账号配置</h2>
          <p className="text-gray-500 mt-2">管理您的社交平台授权，以便后台爬虫获取个性化推荐。</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
          <Plus size={20} />
          绑定新账号
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {accounts.map((acc) => {
          const config = PLATFORMS_CONFIG[acc.platform];
          return (
            <div key={acc.id} className="bg-white rounded-md p-6 border border-gray-100 flex items-center justify-between shadow-sm hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`${config.color} p-3 rounded text-white`}>
                  {config.icon("w-6 h-6")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-800">{acc.platform}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                      acc.status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {acc.status === 'connected' ? '连接中' : '连接错误'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">用户名: <span className="font-medium">{acc.username}</span></p>
                  <p className="text-gray-400 text-xs mt-1">最近同步: {acc.lastSync}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="p-2.5 rounded-sm border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-all">
                  <RefreshCw size={18} />
                </button>
                <button className="p-2.5 rounded-sm border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-indigo-600 transition-all">
                  <Key size={18} />
                </button>
                <button className="p-2.5 rounded-sm border border-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-md p-6 flex gap-4">
        <div className="text-amber-500 mt-1">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="font-bold text-amber-900">爬虫同步说明</h4>
          <p className="text-amber-800 text-sm mt-1 leading-relaxed">
            为了确保获取最精准的首页推荐，系统每小时会自动进行一次增量同步。如果您的账号状态变为“连接错误”，可能是因为 Token 过期，请点击重新绑定或刷新。
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
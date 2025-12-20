import React, { useState, useEffect } from 'react';
import { MOCK_ITEMS } from '../constants';
import { generateDailyInsight } from '../services/geminiService';
import { Sparkles, BrainCircuit, Zap, Loader2 } from 'lucide-react';

const InsightsView: React.FC = () => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsight = async () => {
    setLoading(true);
    const result = await generateDailyInsight(MOCK_ITEMS.slice(0, 15));
    setInsight(result || "暂无分析数据");
    setLoading(false);
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/20 p-2 rounded backdrop-blur-md">
              <Sparkles size={24} className="text-amber-300" />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight">AI 智能日报</h2>
          </div>
          
          <h3 className="text-4xl font-extrabold mb-4 leading-tight">
            今日全网 <span className="text-amber-300 italic">核心趋势</span> 洞察
          </h3>
          
          <p className="text-indigo-100 max-w-2xl text-lg leading-relaxed">
            我们利用 Gemini AI 分析了来自微博、小红书和 Bilibili 的 300+ 条实时推荐信息，为您提取出最具价值的信息增量。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded flex items-center justify-center mb-4">
            <BrainCircuit size={20} />
          </div>
          <h4 className="font-bold text-gray-900 mb-2">主流情绪</h4>
          <p className="text-sm text-gray-500 leading-relaxed">
            今日全网内容偏向“积极生活”与“效率提升”，科技数码产品发布带来的热度持续走高。
          </p>
        </div>
        <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded flex items-center justify-center mb-4">
            <Zap size={20} />
          </div>
          <h4 className="font-bold text-gray-900 mb-2">爆红话题</h4>
          <p className="text-sm text-gray-500 leading-relaxed">
            #2024AI应用元年# 以及 #春季数码好物清单# 在各平台均有极高的流量权重。
          </p>
        </div>
        <div className="bg-white p-6 rounded-md border border-gray-100 shadow-sm">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded flex items-center justify-center mb-4">
            <Sparkles size={20} />
          </div>
          <h4 className="font-bold text-gray-900 mb-2">推荐策略</h4>
          <p className="text-sm text-gray-500 leading-relaxed">
            算法今日倾向于向您推荐长视频（B站）及生活图文（小红书），微博侧重时事。
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-8 border border-gray-100 shadow-lg min-h-[300px] flex flex-col items-center justify-center text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4 text-indigo-600">
            <Loader2 size={40} className="animate-spin" />
            <p className="font-medium animate-pulse">Gemini 正在深度阅读全网热门内容...</p>
          </div>
        ) : (
          <div className="w-full text-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BrainCircuit className="text-indigo-600" /> AI 详细摘要
              </h3>
              <button onClick={fetchInsight} className="text-sm text-indigo-600 hover:underline font-medium">
                重新生成
              </button>
            </div>
            <div className="prose prose-indigo max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-loose text-lg font-light">
                {insight}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsView;
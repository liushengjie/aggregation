import React from 'react';
import { TrendingUp } from 'lucide-react';
import { TrendDataPoint } from './types';

interface TrendChartProps {
  trends: TrendDataPoint[];
  gradientId?: string;
  color?: string;
  label?: string;
  formatValue?: (value: number) => string;
  formatDate?: (date: number, isToday: boolean) => string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  trends,
  gradientId = 'trendGradient',
  color = '#e11d48',
  label = '近日趋势',
  formatValue = (val) => val.toFixed(0),
  formatDate = (date, isToday) => {
    if (isToday) return 'Today';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  },
}) => {
  if (!trends || trends.length < 2) return null;

  const displayTrends = trends.slice(-7);
  const maxValue = Math.max(...displayTrends.map(t => t.value)) || 100;
  const getX = (i: number) => (i / (displayTrends.length - 1)) * 100;
  const getY = (val: number) => 100 - ((val / maxValue) * 70 + 15);

  const points = displayTrends.map((t, i) => `${getX(i)},${getY(t.value)}`);
  const areaPath = `M${points[0]} L${points.join(' L')} L100,120 L0,120 Z`;
  const linePath = `M${points[0]} L${points.join(' L')}`;

  return (
    <div className="flex-1 h-24 bg-white/40 rounded-lg border border-white/60 px-2 py-1.5 flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-1 relative z-10">
        <h3 className="text-[9px] font-black text-slate-700 flex items-center gap-1">
          <TrendingUp size={10} className="text-rose-600" />
          <span>{label}</span>
        </h3>
        <span className="text-[8px] text-slate-400 font-bold uppercase">7 Days</span>
      </div>

      <div className="flex-1 w-full min-h-0 relative">
        <div className="w-full h-full relative">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {displayTrends.map((t, i) => {
            const isLast = i === displayTrends.length - 1;
            const displayValue = t.label || formatValue(t.value);
            const displayDate = formatDate(t.date, isLast);

            return (
              <div
                key={i}
                className="absolute group/point flex items-center justify-center w-4 h-4 -ml-2 -mt-2 cursor-pointer z-10"
                style={{
                  left: `${getX(i)}%`,
                  top: `${getY(t.value)}%`,
                }}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full border-[1.5px] transition-all duration-300 group-hover/point:scale-150 group-hover/point:bg-rose-600 group-hover/point:border-white ${
                    isLast ? 'bg-rose-600 border-white shadow-sm scale-125' : 'bg-white border-rose-600'
                  }`}
                />

                <div className="absolute bottom-full mb-2 opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                  <div className="bg-slate-800 text-white text-[9px] px-2 py-1 rounded shadow-lg font-bold flex flex-col items-center">
                    <span>{displayValue}</span>
                    <span className="text-[8px] text-slate-400 font-normal">{displayDate}</span>
                  </div>
                  <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TrendChart;


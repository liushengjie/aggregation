import React from 'react';
import { TrendingUp, Award, MessageSquare, Users, Ticket, PieChart, Monitor } from 'lucide-react';

export interface Metric {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

export type { Metric };

interface MetricCardProps {
  metrics: Metric[];
  columns?: 2 | 4;
}

const MetricCard: React.FC<MetricCardProps> = ({ metrics, columns = 2 }) => {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="flex-1 bg-white/50 rounded-lg p-2 border border-white/60 shadow-sm">
      <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {metrics.map((metric, index) => (
          <div key={index} className="flex flex-col">
            <div className="flex items-center gap-0.5 mb-0.5">
              {metric.icon}
              <div className="text-[8px] text-slate-400 font-bold uppercase">{metric.label}</div>
            </div>
            <div className={`text-xs font-black ${metric.color}`}>
              {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricCard;


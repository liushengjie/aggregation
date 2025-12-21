import React from 'react';

interface PrismLogoProps {
  size?: number;
  className?: string;
}

/**
 * 棱镜聚合 Logo 组件
 * 设计理念：三角形棱镜 + 光谱折射效果
 */
const PrismLogo: React.FC<PrismLogoProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 背景圆形渐变 */}
      <defs>
        <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="33%" stopColor="#8b5cf6" />
          <stop offset="66%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="spectrumGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="spectrumGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#ec4899" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* 主棱镜三角形 */}
      <path
        d="M60 20 L95 95 L25 95 Z"
        fill="url(#prismGradient)"
        stroke="white"
        strokeWidth="2"
        filter="url(#glow)"
      />
      
      {/* 内部高光 */}
      <path
        d="M60 35 L80 85 L40 85 Z"
        fill="white"
        fillOpacity="0.3"
      />

      {/* 折射光谱线条 1 */}
      <line
        x1="95"
        y1="95"
        x2="110"
        y2="80"
        stroke="url(#spectrumGradient1)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
      />
      
      {/* 折射光谱线条 2 */}
      <line
        x1="95"
        y1="95"
        x2="110"
        y2="90"
        stroke="url(#spectrumGradient2)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
      />

      {/* 折射光谱线条 3 */}
      <line
        x1="95"
        y1="95"
        x2="110"
        y2="100"
        stroke="url(#spectrumGradient1)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  );
};

export default PrismLogo;


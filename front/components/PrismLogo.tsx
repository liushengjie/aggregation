import React from 'react';

interface PrismLogoProps {
  size?: number;
  className?: string;
}

/**
 * 棱镜聚合 Logo 组件
 * 使用新的六边形棱镜设计
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
      <defs>
        <linearGradient id="prismGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" stopOpacity={1} />
          <stop offset="50%" stopColor="#764ba2" stopOpacity={1} />
          <stop offset="100%" stopColor="#f093fb" stopOpacity={1} />
        </linearGradient>
        <linearGradient id="lightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0.2} />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* 背景圆形 */}
      <circle cx="60" cy="60" r="54" fill="url(#prismGradient)" opacity="0.1"/>
      
      {/* 六边形棱镜主体 */}
      <g transform="translate(60, 60)">
        {/* 六边形外框 */}
        <polygon 
          points="-30,-18 30,-18 36,0 30,18 -30,18 -36,0" 
          fill="url(#prismGradient)" 
          stroke="url(#prismGradient)" 
          strokeWidth="1.5"
          filter="url(#glow)"
        />
        
        {/* 内部光线折射效果 */}
        <polygon 
          points="-24,-12 24,-12 28,0 24,12 -24,12 -28,0" 
          fill="url(#lightGradient)" 
          opacity="0.6"
        />
        
        {/* 光线线条 */}
        <line x1="-36" y1="-12" x2="36" y2="12" stroke="white" strokeWidth="1.5" opacity="0.4"/>
        <line x1="-36" y1="0" x2="36" y2="0" stroke="white" strokeWidth="1.5" opacity="0.4"/>
        <line x1="-36" y1="12" x2="36" y2="-12" stroke="white" strokeWidth="1.5" opacity="0.4"/>
        
        {/* 中心亮点 */}
        <circle cx="0" cy="0" r="4.8" fill="white" opacity="0.8" filter="url(#glow)"/>
      </g>
    </svg>
  );
};

export default PrismLogo;


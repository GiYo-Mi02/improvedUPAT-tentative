import React from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({ values, width = 120, height = 36, stroke = '#E6C46E', fill = 'rgba(230,196,110,0.15)' }) => {
  if (!values || values.length === 0) return <svg width={width} height={height} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const step = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  // Build path for fill area
  const pathD = `M 0 ${height} L ${points.replace(/ /g, ' L ')} L ${width} ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={pathD} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
};

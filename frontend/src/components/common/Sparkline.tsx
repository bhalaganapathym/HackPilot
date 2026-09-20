"use client";

import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 160,
  height = 40,
  color = "var(--accent-green)",
  className = "",
}) => {
  if (!data || data.length < 2) {
    return (
      <div className={`text-xs text-text-muted italic flex items-center justify-center ${className}`} style={{ width, height }}>
        Single attempt
      </div>
    );
  }

  const padding = 4;
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className={`overflow-visible ${className}`}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.map((val, idx) => {
        const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r="3"
            fill="var(--surface)"
            stroke={color}
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
};

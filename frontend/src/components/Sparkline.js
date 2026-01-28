import React from 'react';

const Sparkline = ({ data, width = 120, height = 40, color = '#a855f7' }) => {
  if (!data || data.length < 2) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center">
        <span className="text-xs text-muted-foreground">N/A</span>
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Create SVG path
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  // Determine if trend is up or down
  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = isPositive ? '#22c55e' : '#ef4444'; // success or destructive

  return (
    <svg width={width} height={height} className="sparkline">
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
    </svg>
  );
};

export default Sparkline;

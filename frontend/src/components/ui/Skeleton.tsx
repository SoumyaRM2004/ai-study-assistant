import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circle' | 'rect';
  height?: string | number;
  width?: string | number;
}

export function Skeleton({ className = '', variant = 'rect', height, width }: SkeletonProps) {
  const styles: React.CSSProperties = {
    height,
    width,
  };

  const getVariantClass = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'rounded h-4 my-1.5';
      case 'rect':
      default:
        return 'rounded-xl';
    }
  };

  return (
    <div
      className={`skeleton animate-shimmer ${getVariantClass()} ${className}`}
      style={styles}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card flex flex-col gap-4 w-full">
      <Skeleton variant="rect" className="w-1/3 h-6" />
      <Skeleton variant="text" className="w-full" />
      <Skeleton variant="text" className="w-5/6" />
      <div className="flex gap-2 mt-2">
        <Skeleton variant="rect" className="w-20 h-8" />
        <Skeleton variant="rect" className="w-20 h-8" />
      </div>
    </div>
  );
}

export function SkeletonStatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card flex items-center justify-between p-6">
          <div className="flex flex-col gap-2 w-2/3">
            <Skeleton variant="rect" className="w-1/2 h-4" />
            <Skeleton variant="rect" className="w-full h-8" />
          </div>
          <Skeleton variant="circle" className="w-12 h-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center p-3 rounded-lg border border-slate-800/40 bg-slate-900/20">
          <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
          <div className="flex flex-col gap-2 w-full">
            <Skeleton variant="rect" className="w-1/4 h-4" />
            <Skeleton variant="rect" className="w-3/4 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

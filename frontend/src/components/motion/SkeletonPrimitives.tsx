import React from 'react';

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/80 ${className}`} />
);

export const SkeletonCard: React.FC<{ className?: string; height?: string; lines?: number }> = ({
  className = '',
  height,
  lines = 2,
}) => (
  <div className={`card-base p-5 sm:p-6 flex flex-col justify-between ${height || ''} ${className}`}>
    <div className="flex items-center justify-between">
      <SkeletonBox className="h-4 w-28" />
      <SkeletonBox className="h-7 w-7 rounded-lg" />
    </div>
    <div className="space-y-2.5 mt-4">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox 
          key={i} 
          className={`h-4 ${i === 0 ? 'w-full' : i === lines - 1 ? 'w-2/3' : 'w-5/6'}`} 
        />
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({
  rows = 5,
  cols = 4,
  className = '',
}) => (
  <div className={`border border-[#E2E8F0] dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#111827] ${className}`}>
    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 border-b border-[#E2E8F0] dark:border-white/10 flex justify-between gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonBox key={i} className="h-4 flex-1 max-w-[140px]" />
      ))}
    </div>
    <div className="divide-y divide-slate-100 dark:divide-white/5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 flex items-center justify-between gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBox key={c} className={`h-3.5 flex-1 ${c === 0 ? 'max-w-[180px]' : 'max-w-[100px]'}`} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonChart: React.FC<{ height?: string; className?: string }> = ({
  height = 'h-80',
  className = '',
}) => (
  <div className={`card-base p-5 sm:p-6 flex flex-col justify-between ${height} ${className}`}>
    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-white/10">
      <SkeletonBox className="h-5 w-44" />
      <SkeletonBox className="h-7 w-24 rounded-lg" />
    </div>
    <div className="flex-1 flex items-end justify-between gap-3.5 pt-6 px-4 pb-2">
      <SkeletonBox className="h-2/5 flex-1 rounded-t" />
      <SkeletonBox className="h-4/5 flex-1 rounded-t" />
      <SkeletonBox className="h-3/5 flex-1 rounded-t" />
      <SkeletonBox className="h-5/6 flex-1 rounded-t" />
      <SkeletonBox className="h-1/2 flex-1 rounded-t" />
      <SkeletonBox className="h-3/4 flex-1 rounded-t" />
    </div>
    <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-white/10">
      <SkeletonBox className="h-3.5 w-16" />
      <SkeletonBox className="h-3.5 w-16" />
      <SkeletonBox className="h-3.5 w-16" />
    </div>
  </div>
);

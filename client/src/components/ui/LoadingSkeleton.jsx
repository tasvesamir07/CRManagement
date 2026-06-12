import React from 'react';

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4 animate-pulse">
      <div className="h-4 bg-hairline rounded w-3/4 mb-3" />
      <div className="h-3 bg-hairline rounded w-1/2 mb-2" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-hairline rounded w-full mb-1.5" style={{ width: `${80 - i * 15}%` }} />
      ))}
      <div className="flex gap-2 mt-3">
        <div className="h-6 bg-hairline rounded-full w-16" />
        <div className="h-6 bg-hairline rounded-full w-20" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse">
      <div className="flex gap-4 mb-3 pb-2 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-hairline rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 py-3 border-b border-border/50">
          {Array.from({ length: cols }).map((_, col) => (
            <div key={col} className="h-3 bg-hairline rounded flex-1" style={{ width: `${60 + col * 10}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-hairline rounded w-1/3" />
      <div className="h-4 bg-hairline rounded w-1/2" />
      <div className="h-24 bg-hairline rounded" />
      <div className="h-10 bg-hairline rounded w-1/4" />
    </div>
  );
}

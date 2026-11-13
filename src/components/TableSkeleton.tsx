/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export default function TableSkeleton({ columns, rows = 5 }: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4 py-2" aria-busy="true" aria-label="Memuat data">
      {/* Table Header Placeholder */}
      <div className="flex gap-3 border-b border-border-neon pb-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-cell-${i}`}
            className="h-5 skeleton flex-1"
          />
        ))}
      </div>

      {/* Table Rows Placeholders */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={`row-${r}`}
            className="flex gap-3 py-1.5 border-b border-border-subtle last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={`cell-${r}-${c}`}
                className="h-4 skeleton flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

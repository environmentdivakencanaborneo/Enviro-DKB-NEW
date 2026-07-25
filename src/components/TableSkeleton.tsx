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
    <div className="w-full space-y-4 animate-pulse py-2">
      {/* Table Header Placeholder */}
      <div className="flex space-x-4 border-b border-gray-200 pb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`header-cell-${i}`}
            className="h-5 bg-gray-200 rounded-md flex-1"
          />
        ))}
      </div>
      
      {/* Table Rows Placeholders */}
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-${r}`} className="flex space-x-4 py-2 border-b border-gray-100 last:border-b-0">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={`cell-${r}-${c}`}
                className="h-4 bg-gray-100 rounded flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

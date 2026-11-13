/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4 space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-bg-0 border border-border-neon flex items-center justify-center text-neon-cyan shadow-glow-cyan">
        <Icon className="w-7 h-7 stroke-[1.6]" />
      </div>
      <div className="space-y-1 max-w-md">
        <p className="text-sm font-semibold text-text-hi font-heading">{title}</p>
        {description && (
          <p className="text-xs text-text-mid leading-relaxed">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl neon-btn-primary text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

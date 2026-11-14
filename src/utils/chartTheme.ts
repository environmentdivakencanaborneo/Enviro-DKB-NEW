/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';

export const NEON_CHART = {
  gridStroke: 'rgba(148, 163, 184, 0.12)',
  axisStroke: 'var(--theme-text-low)',
  tickFill: 'var(--theme-text-mid)',
  cyan: 'var(--theme-neon-cyan)',
  green: 'var(--theme-neon-green)',
  violet: 'var(--theme-neon-violet)',
  amber: 'var(--theme-neon-amber)',
  red: 'var(--theme-neon-red)',
};

export const NEON_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  backgroundColor: 'var(--theme-tooltip-bg)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid var(--theme-border-neon)',
  borderRadius: '12px',
  color: 'var(--theme-text-hi)',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  boxShadow: 'var(--theme-glow-cyan)',
};

export const NEON_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: 'var(--theme-neon-cyan)',
  fontWeight: 700,
  marginBottom: '4px',
};

export const NEON_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: 'var(--theme-text-hi)',
};

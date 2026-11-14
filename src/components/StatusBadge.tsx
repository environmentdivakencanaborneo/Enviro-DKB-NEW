/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XOctagon,
  Activity,
  HelpCircle,
} from 'lucide-react';

export type CanonicalStatusTone =
  | 'memenuhi'
  | 'mendekati'
  | 'tidak_memenuhi'
  | 'dipantau'
  | 'verifikasi';

export function resolveStatusTone(rawStatus?: string | null): CanonicalStatusTone {
  const s = (rawStatus || '').trim().toLowerCase();

  if (
    [
      'safe',
      'memenuhi',
      'normal',
      'compliant',
      'active',
      'aktif',
      'selesai',
      'closed',
      'terkirim',
      'approved',
      'terpenuhi',
      'hijau',
      'emas',
      'selesai diverifikasi',
    ].includes(s)
  ) {
    return 'memenuhi';
  }

  if (
    [
      'warning',
      'mendekati',
      'proses',
      'pending',
      'terjadwal',
      'perlu kajian',
      'perlu tindak lanjut',
      'dalam tindak lanjut',
      'segera habis',
      'biru',
    ].includes(s)
  ) {
    return 'mendekati';
  }

  if (
    [
      'exceeded',
      'tidak memenuhi',
      'kritis',
      'critical',
      'terlambat',
      'expired',
      'overdue',
      'hitam',
      'merah',
      'open',
      'terbuka',
      'nc mayor',
      'dicabut',
      'pencabutan izin',
      'pembekuan izin',
      'paksaan pemerintah',
      'non-compliant',
    ].includes(s)
  ) {
    return 'tidak_memenuhi';
  }

  if (
    [
      'dipantau',
      'monitoring',
      'sedang dipantau',
      'observasi',
      'dalam pelaksanaan',
      'in progress',
      'info',
    ].includes(s)
  ) {
    return 'dipantau';
  }

  return 'verifikasi';
}

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  size?: 'xs' | 'sm';
}

const TONE_CONFIG: Record<
  CanonicalStatusTone,
  {
    badgeClass: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
    defaultLabel: string;
  }
> = {
  memenuhi: {
    badgeClass: 'badge-safe',
    Icon: CheckCircle2,
    defaultLabel: 'Memenuhi',
  },
  mendekati: {
    badgeClass: 'badge-warning',
    Icon: AlertTriangle,
    defaultLabel: 'Mendekati',
  },
  tidak_memenuhi: {
    badgeClass: 'badge-exceeded',
    Icon: XOctagon,
    defaultLabel: 'Tidak Memenuhi',
  },
  dipantau: {
    badgeClass: 'badge-monitored',
    Icon: Activity,
    defaultLabel: 'Dipantau',
  },
  verifikasi: {
    badgeClass: 'badge-verify',
    Icon: HelpCircle,
    defaultLabel: 'Perlu Verifikasi',
  },
};

export default function StatusBadge({
  status,
  label,
  className = '',
  size = 'xs',
}: StatusBadgeProps) {
  const tone = resolveStatusTone(status);
  const cfg = TONE_CONFIG[tone];
  const Icon = cfg.Icon;

  const displayLabel =
    label ||
    (status === 'Safe'
      ? 'Memenuhi'
      : status === 'Warning'
      ? 'Mendekati'
      : status === 'Exceeded'
      ? 'Tidak Memenuhi'
      : status || cfg.defaultLabel);

  const sizing =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] gap-1.5'
      : 'px-2 py-0.5 text-[10px] gap-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap shrink-0 tabular-nums ${sizing} ${cfg.badgeClass} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden={true} />
      <span>{displayLabel}</span>
    </span>
  );
}

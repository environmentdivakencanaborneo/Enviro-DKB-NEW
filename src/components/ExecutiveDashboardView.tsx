import React, { useMemo } from 'react';
import {
  CapaData,
  ComplianceMatrixData,
  EnvironmentalDocument,
  ReclamationGuarantee,
  IncidentData,
} from '../types';
import { calculateGuaranteeMetrics } from '../utils/guaranteeMetrics';
import {
  CheckSquare,
  FileLock,
  ShieldAlert,
  DollarSign,
  AlertOctagon,
  Flame,
  Award,
  CalendarDays,
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';
import StatusBadge from './StatusBadge';
import TableSkeleton from './TableSkeleton';
import EmptyState from './EmptyState';

interface ExecutiveDashboardProps {
  capa: CapaData[];
  compliance: ComplianceMatrixData[];
  documents: EnvironmentalDocument[];
  guarantees: ReclamationGuarantee[];
  incidents: IncidentData[];
  isLoading: boolean;
}

export default function ExecutiveDashboardView({
  capa,
  compliance,
  documents,
  guarantees,
  incidents,
  isLoading,
}: ExecutiveDashboardProps) {
  const metrics = useMemo(() => {
    const totalMatrix = compliance.length;
    const taatMatrix = compliance.filter(c => c.status === 'Taat').length;
    const tidakRelevanMatrix = compliance.filter(c => c.status === 'Tidak Relevan').length;
    const score =
      totalMatrix > 0 ? Math.round((taatMatrix / (totalMatrix - tidakRelevanMatrix)) * 100) || 0 : 0;

    const now = new Date().getTime();
    const urgentDocs = documents.filter(d => {
      if (d.expiryDate === 'N/A' || !d.expiryDate) return false;
      const diff = Math.ceil((new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return diff <= 90;
    });

    const openCapa = capa.filter(c => c.status !== 'Selesai');
    const overdueCapa = openCapa.filter(c => new Date(c.targetDate) < new Date());
    const openIncidents = incidents.filter(i => i.status !== 'Ditutup');
    const gMetrics = calculateGuaranteeMetrics(guarantees);

    return {
      score,
      urgentDocs: urgentDocs.length,
      openCapa: openCapa.length,
      overdueCapa: overdueCapa.length,
      openIncidents: openIncidents.length,
      totalGuaranteeValue: gMetrics.totalActiveValue,
      expiringGuarantees: gMetrics.expiringCount,
    };
  }, [capa, compliance, documents, guarantees, incidents]);

  if (isLoading) {
    return (
      <div className="glass-panel p-6 rounded-[20px]">
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <ModuleErrorBoundary moduleName="Dashboard Eksekutif">
      <div className="space-y-8 animate-fade-in text-text-hi text-left">
        {/* Banner Header */}
        <div className="neon-card p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 relative z-10">
            <div className="p-4 bg-neon-cyan/10 text-neon-cyan rounded-2xl border border-neon-cyan/30 shadow-glow-cyan">
              <Award className="h-9 w-9 stroke-[1.5]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-heading text-text-hi tracking-tight">
                Dashboard Eksekutif Kepatuhan
              </h2>
              <p className="text-sm text-text-mid mt-0.5">
                Ringkasan komprehensif status kepatuhan lingkungan hidup, perizinan AMDAL, dan mitigasi risiko ESG.
              </p>
            </div>
          </div>
          <div className="bg-bg-2/80 border border-border-neon px-5 py-3 rounded-xl text-right relative z-10">
            <p className="text-[10px] font-bold text-text-low font-mono uppercase tracking-widest">
              Update Terakhir
            </p>
            <p className="text-sm font-semibold text-text-hi mt-0.5 flex items-center gap-2 font-mono">
              <CalendarDays className="h-4 w-4 text-neon-cyan" />
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* KPI 1: Skor Kepatuhan */}
          <div className="neon-card p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-neon-green/10 text-neon-green rounded-2xl border border-neon-green/30">
                <CheckSquare className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-text-mid uppercase tracking-wider">
                  Skor Kepatuhan RKL-RPL
                </p>
                <div className="flex items-baseline mt-1.5">
                  <span className="text-4xl font-bold font-mono tabular-nums text-text-hi tracking-tight leading-none">
                    {metrics.score}
                  </span>
                  <span className="text-lg font-bold text-neon-green ml-1 font-mono">%</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-subtle flex justify-between items-center text-[12px]">
              <span className="text-text-mid font-medium font-mono">Target: 100%</span>
              <StatusBadge status={metrics.score >= 85 ? 'Memenuhi' : 'Mendekati'} label={metrics.score >= 85 ? 'OPTIMAL' : 'PANTAU'} />
            </div>
          </div>

          {/* KPI 2: Risiko Kritis */}
          <div className="neon-card p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-neon-red/10 text-neon-red rounded-2xl border border-neon-red/30">
                <ShieldAlert className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-text-mid uppercase tracking-wider">
                  Risiko Kritis Terbuka
                </p>
                <div className="flex items-baseline mt-1.5">
                  <span className="text-4xl font-bold font-mono tabular-nums text-neon-red tracking-tight leading-none">
                    {metrics.overdueCapa + metrics.openIncidents}
                  </span>
                  <span className="text-xs font-bold text-text-mid ml-1.5 uppercase font-mono">Items</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-subtle flex justify-between items-center text-[11px] font-mono tabular-nums font-semibold">
              <span className="text-neon-red">{metrics.overdueCapa} CAPA Overdue</span>
              <span className="text-neon-amber">{metrics.openIncidents} Insiden Aktif</span>
            </div>
          </div>

          {/* KPI 3: Izin Kedaluwarsa */}
          <div className="neon-card p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-neon-amber/10 text-neon-amber rounded-2xl border border-neon-amber/30">
                <FileLock className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-text-mid uppercase tracking-wider">
                  Izin Kedaluwarsa (H-90)
                </p>
                <div className="flex items-baseline mt-1.5">
                  <span className="text-4xl font-bold font-mono tabular-nums text-neon-amber tracking-tight leading-none">
                    {metrics.urgentDocs}
                  </span>
                  <span className="text-xs font-bold text-text-mid ml-1.5 uppercase font-mono">Berkas</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-subtle flex justify-between items-center text-[12px]">
              <StatusBadge
                status={metrics.urgentDocs > 0 ? 'Mendekati' : 'Memenuhi'}
                label={metrics.urgentDocs > 0 ? 'Perpanjangan Segera' : 'Semua Izin Aman'}
              />
            </div>
          </div>

          {/* KPI 4: Jaminan Reklamasi */}
          <div className="neon-card p-6 flex flex-col justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-neon-violet/10 text-neon-violet rounded-2xl border border-neon-violet/30">
                <DollarSign className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-text-mid uppercase tracking-wider">
                  Jaminan Reklamasi
                </p>
                <div className="flex items-baseline mt-1.5">
                  <span className="text-3xl font-bold font-mono tabular-nums text-text-hi tracking-tight leading-none">
                    Rp {(metrics.totalGuaranteeValue / 1000000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-subtle flex justify-between items-center text-[12px]">
              <StatusBadge
                status={metrics.expiringGuarantees > 0 ? 'Mendekati' : 'Memenuhi'}
                label={`${metrics.expiringGuarantees} Jatuh Tempo (H-90)`}
              />
            </div>
          </div>
        </div>

        {/* Detailed Insights panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Urgent Documents */}
          <div className="glass-panel p-6 sm:p-8 rounded-[20px] text-left">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-border-subtle">
              <h3 className="text-[16px] font-bold font-heading text-text-hi flex items-center gap-2.5">
                <FileLock className="text-neon-amber h-5 w-5 stroke-[1.75]" />
                Peringatan Dini Perizinan (H-90)
              </h3>
              <StatusBadge
                status={metrics.urgentDocs > 0 ? 'Mendekati' : 'Memenuhi'}
                label={`${metrics.urgentDocs} Urgent`}
              />
            </div>

            <div className="space-y-1">
              {documents
                .filter(d => {
                  if (d.expiryDate === 'N/A' || !d.expiryDate) return false;
                  const diff = Math.ceil(
                    (new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return diff <= 90;
                })
                .slice(0, 5)
                .map(doc => {
                  const diff = Math.ceil(
                    (new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={doc.id}
                      className="flex justify-between items-center py-3.5 border-b border-border-subtle last:border-0 hover:bg-bg-2/50 px-2.5 rounded-xl transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-hi leading-snug">{doc.name}</p>
                        <p className="text-xs text-text-mid font-mono mt-0.5">{doc.docNo}</p>
                      </div>
                      <StatusBadge
                        status={diff < 0 ? 'Tidak Memenuhi' : 'Mendekati'}
                        label={diff < 0 ? 'KEDALUWARSA' : `H-${diff}`}
                      />
                    </div>
                  );
                })}
              {metrics.urgentDocs === 0 && (
                <EmptyState
                  icon={CheckSquare}
                  title="Perizinan Aman"
                  description="Semua perizinan dan dokumen lingkungan terpantau aman dan berlaku."
                />
              )}
            </div>
          </div>

          {/* Top CAPA Issues */}
          <div className="glass-panel p-6 sm:p-8 rounded-[20px] text-left">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-border-subtle">
              <h3 className="text-[16px] font-bold font-heading text-text-hi flex items-center gap-2.5">
                <AlertOctagon className="text-neon-red h-5 w-5 stroke-[1.75]" />
                Temuan CAPA Kritis &amp; Overdue
              </h3>
              <StatusBadge
                status={metrics.overdueCapa > 0 ? 'Tidak Memenuhi' : 'Memenuhi'}
                label={`${metrics.overdueCapa} Overdue`}
              />
            </div>

            <div className="space-y-1">
              {capa
                .filter(c => c.status !== 'Selesai' && new Date(c.targetDate) < new Date())
                .slice(0, 5)
                .map(c => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center py-3.5 border-b border-border-subtle last:border-0 hover:bg-bg-2/50 px-2.5 rounded-xl transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex gap-2 items-center mb-1">
                        <StatusBadge status="Tidak Memenuhi" label="OVERDUE" />
                        <span className="text-[10px] font-bold text-text-mid border border-border-subtle px-2 py-0.5 rounded-full font-mono">
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-text-hi line-clamp-1 leading-normal">{c.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-text-low font-mono font-bold uppercase tracking-wider">PIC</p>
                      <p className="text-xs font-semibold text-text-hi mt-0.5">{c.pic}</p>
                    </div>
                  </div>
                ))}
              {metrics.overdueCapa === 0 && (
                <EmptyState
                  icon={CheckSquare}
                  title="CAPA Sesuai Jadwal"
                  description="Seluruh temuan Corrective & Preventive Action (CAPA) berjalan sesuai target waktu."
                />
              )}
            </div>
          </div>

          {/* Incident Reports */}
          <div className="glass-panel p-6 sm:p-8 rounded-[20px] lg:col-span-2 text-left">
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-border-subtle">
              <h3 className="text-[16px] font-bold font-heading text-text-hi flex items-center gap-2.5">
                <Flame className="text-neon-red h-5 w-5 stroke-[1.75]" />
                Status Laporan Insiden Aktif
              </h3>
              <StatusBadge
                status={metrics.openIncidents > 0 ? 'Tidak Memenuhi' : 'Memenuhi'}
                label={`${metrics.openIncidents} Insiden Terbuka`}
              />
            </div>

            {incidents.filter(i => i.status !== 'Ditutup').length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Zero Active Environmental Incidents"
                description="Tidak ada laporan insiden lingkungan aktif di area tambang PT Diva Kencana Borneo."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incidents
                  .filter(i => i.status !== 'Ditutup')
                  .slice(0, 6)
                  .map(inc => (
                    <div
                      key={inc.id}
                      className="bg-bg-2/70 p-5 rounded-2xl border border-border-neon hover:border-neon-red/50 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-3">
                          <StatusBadge status={inc.status} />
                          <span className="text-[10px] text-text-mid font-mono tabular-nums">{inc.date}</span>
                        </div>
                        <h4 className="text-sm font-bold text-text-hi">{inc.location}</h4>
                        <p className="text-xs text-text-mid mt-1.5 line-clamp-3 leading-relaxed">
                          {inc.chronology}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleErrorBoundary>
  );
}

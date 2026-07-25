import React, { useMemo } from 'react';
import { 
  CapaData, 
  ComplianceMatrixData, 
  EnvironmentalDocument, 
  ReclamationGuarantee,
  IncidentData
} from '../types';
import { 
  CheckSquare, FileLock, ShieldAlert, DollarSign, 
  AlertOctagon, Flame, ArrowUpRight, Award, CalendarDays
} from 'lucide-react';
import ModuleErrorBoundary from './ModuleErrorBoundary';

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
  isLoading 
}: ExecutiveDashboardProps) {

  const metrics = useMemo(() => {
    // 1. Skor Kepatuhan (Compliance Matrix)
    const totalMatrix = compliance.length;
    const taatMatrix = compliance.filter(c => c.status === 'Taat').length;
    const tidakRelevanMatrix = compliance.filter(c => c.status === 'Tidak Relevan').length;
    const score = totalMatrix > 0 
      ? Math.round((taatMatrix / (totalMatrix - tidakRelevanMatrix)) * 100) || 0
      : 0;

    // 2. Izin Kedaluwarsa/Kritis (H-90)
    const now = new Date().getTime();
    const urgentDocs = documents.filter(d => {
      if (d.expiryDate === 'N/A' || !d.expiryDate) return false;
      const diff = Math.ceil((new Date(d.expiryDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return diff <= 90; // Expired or expiring within 90 days
    });

    // 3. CAPA Terbuka & Overdue
    const openCapa = capa.filter(c => c.status !== 'Selesai');
    const overdueCapa = openCapa.filter(c => new Date(c.targetDate) < new Date());

    // 4. Insiden Aktif
    const openIncidents = incidents.filter(i => i.status !== 'Ditutup');

    // 5. Jaminan Reklamasi (Kewajiban Finansial Aktif vs Total)
    const activeGuarantees = guarantees.filter(g => g.status === 'Active' || g.status === 'Renewal Needed');
    const totalGuaranteeValue = activeGuarantees.reduce((acc, curr) => acc + curr.value, 0);
    const expiringGuarantees = activeGuarantees.filter(g => {
      const diff = Math.ceil((new Date(g.dueDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return diff <= 90;
    });

    return {
      score,
      urgentDocs: urgentDocs.length,
      openCapa: openCapa.length,
      overdueCapa: overdueCapa.length,
      openIncidents: openIncidents.length,
      totalGuaranteeValue,
      expiringGuarantees: expiringGuarantees.length
    };
  }, [capa, compliance, documents, guarantees, incidents]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-forest-300 animate-pulse bg-white rounded-[20px] border border-forest-100 shadow-custom font-sans">
        Memuat data dashboard eksekutif...
      </div>
    );
  }

  return (
    <ModuleErrorBoundary moduleName="Dashboard Eksekutif">
      <div className="space-y-8 animate-fade-in text-text-primary text-left font-sans">
        
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[20px] border border-border-custom shadow-custom relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#DCE5DA]/15 rounded-full blur-3xl -z-10"></div>
          <div className="flex items-center gap-5">
            <div className="p-4 bg-forest-50 text-[#4D7C5A] rounded-2xl border border-border-custom">
              <Award className="h-9 w-9 stroke-[1.25]" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold font-heading text-text-primary tracking-tight">
                Dashboard Eksekutif Kepatuhan
              </h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Ringkasan komprehensif status kepatuhan lingkungan hidup, perizinan AMDAL, dan mitigasi risiko ESG.
              </p>
            </div>
          </div>
          <div className="bg-forest-50 border border-border-custom px-5 py-3 rounded-xl text-right">
            <p className="text-[10px] font-bold text-forest-300 uppercase tracking-widest">Update Terakhir</p>
            <p className="text-sm font-semibold text-text-primary mt-0.5 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#4D7C5A]" />
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Top KPIs Redesigned to strict specifications */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* KPI 1: Skor Kepatuhan */}
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-[#3FA66B]/8 text-[#2E5A46] rounded-2xl border border-[#3FA66B]/15">
                <CheckSquare className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Skor Kepatuhan RKL-RPL</p>
                <div className="flex items-baseline mt-1">
                  <span className="text-[48px] font-bold font-manrope text-text-primary tracking-tight leading-none">
                    {metrics.score}
                  </span>
                  <span className="text-lg font-bold text-forest-300 ml-1">%</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-custom flex justify-between items-center text-[12px]">
              <span className="text-text-secondary font-medium">Target Kinerja: 100%</span>
              <span className="text-[#3FA66B] font-bold bg-[#3FA66B]/8 px-2 py-0.5 rounded">OPTIMAL</span>
            </div>
          </div>

          {/* KPI 2: Risiko Kritis */}
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-[#D95C5C]/8 text-[#9C3333] rounded-2xl border border-[#D95C5C]/15">
                <ShieldAlert className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Risiko Kritis Terbuka</p>
                <div className="flex items-baseline mt-1">
                  <span className="text-[48px] font-bold font-manrope text-[#D95C5C] tracking-tight leading-none">
                    {metrics.overdueCapa + metrics.openIncidents}
                  </span>
                  <span className="text-xs font-bold text-text-secondary ml-1.5 uppercase">Items</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-custom flex justify-between items-center text-[11.5px] font-semibold">
              <span className="text-[#9C3333]">{metrics.overdueCapa} CAPA Overdue</span>
              <span className="text-[#D95C5C]">{metrics.openIncidents} Insiden Aktif</span>
            </div>
          </div>

          {/* KPI 3: Izin Kedaluwarsa */}
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-[#E2A43B]/8 text-[#8F5E13] rounded-2xl border border-[#E2A43B]/15">
                <FileLock className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Izin Kedaluwarsa (H-90)</p>
                <div className="flex items-baseline mt-1">
                  <span className="text-[48px] font-bold font-manrope text-[#E2A43B] tracking-tight leading-none">
                    {metrics.urgentDocs}
                  </span>
                  <span className="text-xs font-bold text-text-secondary ml-1.5 uppercase">Berkas</span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-custom flex justify-between items-center text-[12px]">
              <span className="text-[#8F5E13] font-semibold bg-[#E2A43B]/8 px-2 py-0.5 rounded">Perpanjangan Segera</span>
            </div>
          </div>

          {/* KPI 4: Jaminan Reklamasi */}
          <div className="bg-white p-6 rounded-[20px] border border-border-custom shadow-custom flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-[#4D7C5A]/8 text-[#2F5A46] rounded-2xl border border-[#4D7C5A]/15">
                <DollarSign className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Jaminan Reklamasi</p>
                <div className="flex items-baseline mt-1">
                  <span className="text-[32px] font-bold font-manrope text-text-primary tracking-tight leading-none">
                    Rp {(metrics.totalGuaranteeValue / 1000000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border-custom flex justify-between items-center text-[12px] text-text-secondary">
              <span className="font-semibold text-[#2F5A46] bg-[#4D7C5A]/8 px-2 py-0.5 rounded">
                {metrics.expiringGuarantees} Jatuh Tempo (H-90)
              </span>
            </div>
          </div>

        </div>

        {/* Detailed Insights panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Urgent Documents */}
          <div className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#E6ECE6]">
              <h3 className="text-[16px] font-bold font-heading text-text-primary flex items-center gap-2.5">
                <FileLock className="text-[#E2A43B] h-5 w-5 stroke-[1.75]"/> 
                Peringatan Dini Perizinan (H-90)
              </h3>
              <span className="text-xs text-text-secondary font-semibold bg-forest-50 px-2.5 py-1 rounded-lg">
                {metrics.urgentDocs} Urgent
              </span>
            </div>
            
            <div className="space-y-1">
              {documents.filter(d => {
                if (d.expiryDate === 'N/A' || !d.expiryDate) return false;
                const diff = Math.ceil((new Date(d.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return diff <= 90;
              }).slice(0, 5).map(doc => {
                const diff = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={doc.id} className="flex justify-between items-center py-3.5 border-b border-[#F5F6F2] last:border-0 hover:bg-[#F5F6F2]/30 px-2 rounded-lg transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-text-primary leading-snug">{doc.name}</p>
                      <p className="text-xs text-text-secondary font-manrope mt-0.5">{doc.docNo}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      diff < 0 
                        ? 'bg-[#D95C5C]/10 text-[#9C3333]' 
                        : 'bg-[#E2A43B]/10 text-[#8F5E13]'
                    }`}>
                      {diff < 0 ? 'KEDALUWARSA' : `H-${diff}`}
                    </div>
                  </div>
                );
              })}
              {metrics.urgentDocs === 0 && (
                <div className="py-12 text-center text-text-secondary text-sm">
                  <CheckSquare className="h-10 w-10 text-[#3FA66B] mx-auto mb-3 stroke-[1.25] opacity-60" />
                  Semua perizinan dan dokumen lingkungan terpantau aman dan berlaku.
                </div>
              )}
            </div>
          </div>

          {/* Top CAPA Issues */}
          <div className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom text-left">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#E6ECE6]">
              <h3 className="text-[16px] font-bold font-heading text-text-primary flex items-center gap-2.5">
                <AlertOctagon className="text-[#D95C5C] h-5 w-5 stroke-[1.75]"/> 
                Temuan CAPA Kritis & Overdue
              </h3>
              <span className="text-xs text-text-secondary font-semibold bg-forest-50 px-2.5 py-1 rounded-lg">
                {metrics.overdueCapa} Overdue
              </span>
            </div>

            <div className="space-y-1">
              {capa.filter(c => c.status !== 'Selesai' && new Date(c.targetDate) < new Date()).slice(0, 5).map(c => (
                <div key={c.id} className="flex justify-between items-center py-3.5 border-b border-[#F5F6F2] last:border-0 hover:bg-[#F5F6F2]/30 px-2 rounded-lg transition-colors">
                  <div className="flex-1 pr-4">
                    <div className="flex gap-2 items-center mb-1">
                      <span className="px-2 py-0.5 bg-[#D95C5C]/10 text-[#9C3333] rounded text-[10px] font-bold uppercase tracking-wider">
                        OVERDUE
                      </span>
                      <span className="text-[10px] font-bold text-text-secondary border border-border-custom px-2 py-0.5 rounded-full">
                        {c.severity}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary line-clamp-1 leading-normal">{c.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-[#A8B9A5] font-bold uppercase tracking-wider">PIC</p>
                    <p className="text-xs font-semibold text-text-primary mt-0.5">{c.pic}</p>
                  </div>
                </div>
              ))}
              {metrics.overdueCapa === 0 && (
                <div className="py-12 text-center text-text-secondary text-sm">
                  <CheckSquare className="h-10 w-10 text-[#3FA66B] mx-auto mb-3 stroke-[1.25] opacity-60" />
                  Seluruh temuan Corrective & Preventive Action (CAPA) berjalan sesuai target waktu.
                </div>
              )}
            </div>
          </div>

          {/* Incident Reports */}
          <div className="bg-white p-8 rounded-[20px] border border-border-custom shadow-custom lg:col-span-2 text-left">
            <div className="flex justify-between items-center pb-4 mb-5 border-b border-[#E6ECE6]">
              <h3 className="text-[16px] font-bold font-heading text-text-primary flex items-center gap-2.5">
                <Flame className="text-[#D95C5C] h-5 w-5 stroke-[1.75]"/> 
                Status Laporan Insiden Aktif
              </h3>
              <span className="text-xs font-semibold text-text-secondary bg-[#D95C5C]/5 text-[#9C3333] border border-[#D95C5C]/10 px-2.5 py-1 rounded-lg">
                {metrics.openIncidents} Insiden Terbuka
              </span>
            </div>

            {incidents.filter(i => i.status !== 'Ditutup').length === 0 ? (
              <div className="py-10 text-center text-text-secondary text-sm">
                <CheckSquare className="h-10 w-10 text-[#3FA66B] mx-auto mb-3 stroke-[1.25] opacity-60" />
                Tidak ada laporan insiden lingkungan aktif di area tambang PT Diva Kencana Borneo.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {incidents.filter(i => i.status !== 'Ditutup').slice(0, 6).map(inc => (
                  <div key={inc.id} className="bg-white p-5 rounded-[20px] border border-border-custom hover:border-[#4D7C5A]/30 transition-all duration-300 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#D95C5C]"></div>
                    <div className="pl-2">
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 bg-[#D95C5C]/10 text-[#9C3333] rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {inc.status}
                        </span>
                        <span className="text-[10px] text-text-secondary font-manrope">{inc.date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-text-primary">{inc.location}</h4>
                      <p className="text-xs text-text-secondary mt-1.5 line-clamp-3 leading-relaxed">
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

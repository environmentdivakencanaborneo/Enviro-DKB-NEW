/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import {
  WastewaterData,
  SurfaceWaterData,
  RainfallData,
  ReclamationPlan,
  WqLocation,
  WastewaterPhoto,
  EnvironmentalStandard,
  InternalThresholdsConfig,
} from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  CloudRain, 
  Droplet, 
  Filter,
  Eye,
  ArrowUpDown,
  Pencil,
  Calendar,
  Clock,
  Activity,
  Award,
  ShieldAlert,
  Check,
  Camera,
  MapPin,
  X,
  FileText,
  Loader2,
  Sliders
} from 'lucide-react';
import {
  resolveActiveStandards,
  evaluateSurfaceWaterParam,
  WASTEWATER_BASIS_LABEL,
  SURFACE_WATER_BASIS_LABEL,
  DEFAULT_INTERNAL_THRESHOLDS,
} from '../data/regulations';
import {
  evaluateSampleCompliance,
  formatLocaleNumberStrict,
  formatStandardLimitDisplay,
  getLiveEvaluation,
  parseStrictNumber,
} from '../utils/waterQualityEval';
import { todayLocalISO } from '../utils/dateUtils';
import { wqLocationService } from '../services/wqLocationService';
import { waterQualityService } from '../services/dbService';
import { isSuperintendent, isAdmin } from '../services/permissionService';
import { triggerToast } from '../utils/errorHandler';
import PhotoUploader, { CompressedPhotoData } from './PhotoUploader';
import WqLocationModal from './WqLocationModal';
import StandardsConfigModal from './StandardsConfigModal';
import StatusBadge from './StatusBadge';
import EmptyState from './EmptyState';
import { NEON_CHART, NEON_TOOLTIP_CONTENT_STYLE } from '../utils/chartTheme';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ReferenceLine
} from 'recharts';

interface MonitoringViewProps {
  wastewater: WastewaterData[];
  surfaceWater: SurfaceWaterData[];
  rainfall: RainfallData[];
  userProfile?: any;
  standards?: EnvironmentalStandard[];
  internalThresholds?: InternalThresholdsConfig;
  canManageStandards?: boolean;
  onAddWastewater: (item: any, photo?: any) => void;
  onUpdateWastewater?: (id: string, item: any, photo?: any) => void;
  onDeleteWastewater: (id: string) => void;
  onAddSurfaceWater: (item: any) => void;
  onUpdateSurfaceWater?: (id: string, item: any) => void;
  onDeleteSurfaceWater: (id: string) => void;
  onAddRainfall: (item: any) => void;
  onUpdateRainfall?: (id: string, item: any) => void;
  onDeleteRainfall: (id: string) => void;
  plans: ReclamationPlan[];
}

export default function MonitoringView({
  wastewater,
  surfaceWater,
  rainfall,
  userProfile,
  standards = [],
  internalThresholds = DEFAULT_INTERNAL_THRESHOLDS,
  canManageStandards,
  onAddWastewater,
  onUpdateWastewater,
  onDeleteWastewater,
  onAddSurfaceWater,
  onUpdateSurfaceWater,
  onDeleteSurfaceWater,
  onAddRainfall,
  onUpdateRainfall,
  onDeleteRainfall,
  plans
}: MonitoringViewProps) {
  const [activeTab, setActiveTab] = useState<'water' | 'surfacewater' | 'rainfall' | 'erosion'>('water');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'water' | 'surfacewater' | 'rain'; message: string } | null>(null);
  const canManageStd = canManageStandards ?? isSuperintendent(userProfile);

  // MASTER WQ LOCATIONS & STANDARDS
  const [locations, setLocations] = useState<WqLocation[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showStandardsModal, setShowStandardsModal] = useState(false);

  useEffect(() => {
    const unsub = wqLocationService.subscribe((data) => {
      setLocations(data);
    });
    return () => unsub();
  }, []);

  // EDIT STATE
  const [editingWaterId, setEditingWaterId] = useState<string | null>(null);
  const [editingRainId, setEditingRainId] = useState<string | null>(null);

  // WATER STATE
  const [showWaterForm, setShowWaterForm] = useState(false);
  const [waterFilterLoc, setWaterFilterLoc] = useState('');
  const [waterFilterStatus, setWaterFilterStatus] = useState('');
  const [selectedStatsMonth, setSelectedStatsMonth] = useState<string>('');

  const getCurrentHHmm = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const defaultOfficer = userProfile?.name || userProfile?.fullName || '';

  // Water Form Fields (All numbers start EMPTY as required)
  const [wDate, setWDate] = useState(todayLocalISO());
  const [wSampleTime, setWSampleTime] = useState(getCurrentHHmm());
  const [wWeather, setWWeather] = useState<'Cerah' | 'Berawan' | 'Hujan Ringan' | 'Hujan Lebat'>('Cerah');
  const [wLocationCode, setWLocationCode] = useState('KPL-01');
  const [wLoc, setWLoc] = useState('KPL Tambang Blok Utara (KPL-01)');
  const [wSource, setWSource] = useState('Settling Pond Outlet');
  const [wOfficer, setWOfficer] = useState(defaultOfficer);
  const [wPhStr, setWPhStr] = useState('');
  const [wTssStr, setWTssStr] = useState('');
  const [wDebitStr, setWDebitStr] = useState('');
  const [wFeStr, setWFeStr] = useState('');
  const [wMnStr, setWMnStr] = useState('');
  const [wUnitMap, setWUnitMap] = useState<Record<string, string>>({
    ph: '-',
    tss: 'mg/L',
    debit: 'm³/s',
    fe: 'mg/L',
    mn: 'mg/L',
  });
  const [wCorrectionReason, setWCorrectionReason] = useState('');
  const [wMonitoringType, setWMonitoringType] = useState<'Harian' | 'Bulanan'>('Harian');
  const [wPhoto, setWPhoto] = useState<CompressedPhotoData | null>(null);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);

  // Lazy Photo Preview Modal State
  const [photoPreviewItem, setPhotoPreviewItem] = useState<WastewaterData | null>(null);
  const [photoPreviewDoc, setPhotoPreviewDoc] = useState<WastewaterPhoto | null>(null);
  const [isLoadingLazyPhoto, setIsLoadingLazyPhoto] = useState(false);

  // SURFACE WATER STATE
  const [editingSurfaceWaterId, setEditingSurfaceWaterId] = useState<string | null>(null);
  const [showSurfaceForm, setShowSurfaceForm] = useState(false);
  const [surfaceFilterLoc, setSurfaceFilterLoc] = useState('');
  const [surfaceFilterStatus, setSurfaceFilterStatus] = useState('');
  
  // Surface Form Fields (All numeric fields start EMPTY, never fake defaults or 0-coerced)
  const [swDate, setSwDate] = useState(todayLocalISO());
  const [swLoc, setSwLoc] = useState('Air Sungai Sembakung (Hulu)');
  const [swOfficer, setSwOfficer] = useState(defaultOfficer);

  // Populate default officer when userProfile arrives
  useEffect(() => {
    if (!wOfficer && defaultOfficer) {
      setWOfficer(defaultOfficer);
    }
    if (!swOfficer && defaultOfficer) {
      setSwOfficer(defaultOfficer);
    }
  }, [defaultOfficer, wOfficer, swOfficer]);

  const [swPhStr, setSwPhStr] = useState('');
  const [swTssStr, setSwTssStr] = useState('');
  const [swDoStr, setSwDoStr] = useState('');
  const [swBodStr, setSwBodStr] = useState('');
  const [swCodStr, setSwCodStr] = useState('');
  const [swFeStr, setSwFeStr] = useState('');
  const [swMnStr, setSwMnStr] = useState('');
  const [swUnitMap, setSwUnitMap] = useState<Record<string, string>>({
    ph: '-',
    tss: 'mg/L',
    doVal: 'mg/L',
    bod: 'mg/L',
    cod: 'mg/L',
    fe: 'mg/L',
    mn: 'mg/L',
  });
  const [swCorrectionReason, setSwCorrectionReason] = useState('');
  const [swKelasAir, setSwKelasAir] = useState<'I' | 'II' | 'III' | 'IV'>('II');
  const [swMonitoringType, setSwMonitoringType] = useState<'Harian' | 'Bulanan'>('Harian');

  const swPhNum = parseStrictNumber(swPhStr);
  const swTssNum = parseStrictNumber(swTssStr);
  const swDoNum = parseStrictNumber(swDoStr);
  const swBodNum = parseStrictNumber(swBodStr);
  const swCodNum = parseStrictNumber(swCodStr);
  const swFeNum = parseStrictNumber(swFeStr);
  const swMnNum = parseStrictNumber(swMnStr);

  const surfaceEval = useMemo(
    () =>
      evaluateSampleCompliance(
        'air_permukaan',
        {
          date: swDate,
          location: swLoc,
          kelasAir: swKelasAir,
          ph: swPhNum,
          tss: swTssNum,
          doVal: swDoNum,
          bod: swBodNum,
          cod: swCodNum,
          fe: swFeNum,
          mn: swMnNum,
        },
        {
          standards,
          thresholds: internalThresholds,
          sampleDate: swDate,
          kelasAir: swKelasAir,
          unitMap: swUnitMap,
        }
      ),
    [standards, internalThresholds, swDate, swLoc, swKelasAir, swPhNum, swTssNum, swDoNum, swBodNum, swCodNum, swFeNum, swMnNum, swUnitMap]
  );

  // RAINFALL STATE
  const [showRainForm, setShowRainForm] = useState(false);
  const [rainFilterStation, setRainFilterStation] = useState('');
  
  // Rain Form Fields (starts empty, never coerced silently to 0)
  const [rDate, setRDate] = useState(todayLocalISO());
  const [rStart, setRStart] = useState('14:00');
  const [rEnd, setREnd] = useState('15:30');
  const [rStation, setRStation] = useState('Stasiun Pit West / WS-01');
  const [rType, setRType] = useState<'Manual' | 'Automatic'>('Automatic');
  const [rRainfallStr, setRRainfallStr] = useState('');
  const [rWeather, setRWeather] = useState<'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm'>('Clear');
  const [rNotes, setRNotes] = useState('');

  // BMKG Weather Classification Helper
  const getBMKGWeatherClass = (vol: number): 'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm' => {
    if (vol <= 0) return 'Clear';
    if (vol < 5) return 'Cloudy'; // Kurang dari 5 mm harian dianggap Berawan / Mendung (Sangat Ringan)
    if (vol <= 20) return 'Light Rain'; // 5 - 20 mm adalah Hujan Ringan (Light Rain)
    if (vol <= 50) return 'Heavy Rain'; // 20 - 50 mm adalah Hujan Sedang / Lebat (Heavy Rain)
    return 'Storm'; // > 50 mm dianggap Hujan Sangat Lebat / Badai (Storm)
  };

  // Dynamic standards resolution for banner & form display
  const activeWaterStds = useMemo(
    () =>
      resolveActiveStandards(standards, 'air_limbah', {
        locationCode: wLocationCode,
        sampleDate: wDate,
      }),
    [standards, wLocationCode, wDate]
  );

  const activeSurfaceStds = useMemo(
    () =>
      resolveActiveStandards(standards, 'air_permukaan', {
        sampleDate: swDate,
        kelasAir: swKelasAir,
      }),
    [standards, swDate, swKelasAir]
  );

  const isStdVerified = (std?: EnvironmentalStandard | null) =>
    Boolean(
      std &&
        std.applicable !== false &&
        std.verificationStatus === 'Terverifikasi' &&
        std.effectiveStatus !== 'MENUNGGU VERIFIKASI'
    );

  const phMinLimit = isStdVerified(activeWaterStds.ph) ? (activeWaterStds.ph?.minLimit ?? null) : null;
  const phMaxLimit = isStdVerified(activeWaterStds.ph) ? (activeWaterStds.ph?.maxLimit ?? null) : null;
  const tssMaxLimit = isStdVerified(activeWaterStds.tss) ? (activeWaterStds.tss?.maxLimit ?? null) : null;
  const feMaxLimit = isStdVerified(activeWaterStds.fe) ? (activeWaterStds.fe?.maxLimit ?? null) : null;
  const mnMaxLimit = isStdVerified(activeWaterStds.mn) ? (activeWaterStds.mn?.maxLimit ?? null) : null;

  const phLimitRange = formatStandardLimitDisplay(activeWaterStds.ph);
  const tssLimit = activeWaterStds.tss ? `${formatStandardLimitDisplay(activeWaterStds.tss)}${tssMaxLimit !== null ? ` ${activeWaterStds.tss.unit}` : ''}` : 'Belum Ditetapkan';
  const debitLimit = 'Bebas / Pantau';
  const feLimit = activeWaterStds.fe ? `${formatStandardLimitDisplay(activeWaterStds.fe)}${feMaxLimit !== null ? ` ${activeWaterStds.fe.unit}` : ''}` : 'Belum Ditetapkan';
  const mnLimit = activeWaterStds.mn ? `${formatStandardLimitDisplay(activeWaterStds.mn)}${mnMaxLimit !== null ? ` ${activeWaterStds.mn.unit}` : ''}` : 'Belum Ditetapkan';

  const wPhNum = parseStrictNumber(wPhStr);
  const wTssNum = parseStrictNumber(wTssStr);
  const wDebitNum = parseStrictNumber(wDebitStr);
  const wFeNum = parseStrictNumber(wFeStr);
  const wMnNum = parseStrictNumber(wMnStr);

  const areAllNumbersFilledAndFinite =
    wPhNum !== null && wPhNum >= 0 && wPhNum <= 14 &&
    wTssNum !== null && wTssNum >= 0 &&
    wDebitNum !== null && wDebitNum >= 0 &&
    wFeNum !== null && wFeNum >= 0 &&
    wMnNum !== null && wMnNum >= 0;

  const waterEval = useMemo(
    () =>
      evaluateSampleCompliance(
        'air_limbah',
        {
          date: wDate,
          location: wLoc,
          locationCode: wLocationCode,
          ph: wPhNum,
          tss: wTssNum,
          debit: wDebitNum,
          fe: wFeNum,
          mn: wMnNum,
        },
        {
          standards,
          thresholds: internalThresholds,
          locationCode: wLocationCode,
          sampleDate: wDate,
          unitMap: wUnitMap,
        }
      ),
    [standards, internalThresholds, wDate, wLoc, wLocationCode, wPhNum, wTssNum, wDebitNum, wFeNum, wMnNum, wUnitMap]
  );

  // Duplicate check for Daily ('Harian'): (date, locationCode) must be unique
  const isDuplicateDaily = useMemo(() => {
    if (wMonitoringType !== 'Harian' || !wDate || !wLocationCode) return false;
    return wastewater.some((w) => {
      if (editingWaterId && w.id === editingWaterId) return false;
      const type = w.monitoringType ?? 'Harian';
      if (type !== 'Harian') return false;
      const match = (w.locationCode && w.locationCode === wLocationCode) ||
                    (!w.locationCode && w.location.includes(wLocationCode));
      return w.date === wDate && match;
    });
  }, [wMonitoringType, wDate, wLocationCode, wastewater, editingWaterId]);

  // Set of duplicate Daily keys for legacy data badges in table
  const duplicateDailyKeys = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const w of wastewater) {
      if ((w.monitoringType ?? 'Harian') === 'Harian') {
        const code = w.locationCode || w.location;
        const key = `${w.date}_${code}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    const dups = new Set<string>();
    for (const [k, count] of Object.entries(counts)) {
      if (count > 1) dups.add(k);
    }
    return dups;
  }, [wastewater]);

  // Master location check helper
  const isMasteredLocation = (item: WastewaterData) => {
    if (locations.length === 0) return true;
    if (item.locationCode && locations.some((l) => l.code === item.locationCode)) {
      return true;
    }
    return locations.some((l) => item.location.includes(l.code) || item.location === l.name);
  };

  // Indonesian month formatting
  const formatIndoMonth = (yearMonthStr: string) => {
    if (!yearMonthStr) return '';
    const [year, month] = yearMonthStr.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] ?? ''} ${year}`;
  };

  // Indonesian date formatting
  const formatIndoDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${months[idx] ?? ''} ${year}`;
  };

  // Extract unique months
  const uniqueWaterMonths = Array.from(new Set(wastewater.map(w => {
    if (!w.date) return '';
    return w.date.substring(0, 7); // 'YYYY-MM'
  }))).filter(Boolean).sort().reverse();

  // Selected or latest active month
  const activeWaterMonth = selectedStatsMonth || (uniqueWaterMonths[0] || '');

  // 1. Daily Statistics (Latest available sampling date)
  const waterDates = wastewater.map(w => w.date).filter(Boolean);
  const latestWaterDate = waterDates.length > 0 ? [...waterDates].sort().reverse()[0] : null;

  const dailySamples = latestWaterDate ? wastewater.filter(w => w.date === latestWaterDate) : [];
  const dailySafeCount = dailySamples.filter(w => w.status === 'Safe').length;
  const dailyWarningCount = dailySamples.filter(w => w.status === 'Warning').length;
  const dailyExceededCount = dailySamples.filter(w => w.status === 'Exceeded').length;
  const dailyUnverifiedOrIncompleteCount = dailySamples.filter(
    w => w.status === 'Incomplete' || w.status === 'Unevaluated'
  ).length;
  const dailyEvaluatedTotal = dailySafeCount + dailyWarningCount + dailyExceededCount;
  const dailyTotal = dailySamples.length;
  const dailyComplianceRate = dailyEvaluatedTotal > 0 ? Math.round(((dailySafeCount + dailyWarningCount) / dailyEvaluatedTotal) * 100) : 0;

  // 2. Monthly Statistics (Selected active month)
  const monthlySamples = activeWaterMonth ? wastewater.filter(w => w.date && w.date.startsWith(activeWaterMonth)) : [];
  const monthlySafeCount = monthlySamples.filter(w => w.status === 'Safe').length;
  const monthlyWarningCount = monthlySamples.filter(w => w.status === 'Warning').length;
  const monthlyExceededCount = monthlySamples.filter(w => w.status === 'Exceeded').length;
  const monthlyUnverifiedOrIncompleteCount = monthlySamples.filter(
    w => w.status === 'Incomplete' || w.status === 'Unevaluated'
  ).length;
  const monthlyEvaluatedTotal = monthlySafeCount + monthlyWarningCount + monthlyExceededCount;
  const monthlyTotal = monthlySamples.length;
  const monthlyComplianceRate = monthlyEvaluatedTotal > 0 ? Math.round(((monthlySafeCount + monthlyWarningCount) / monthlyEvaluatedTotal) * 100) : 0;

  const avgStrict = (vals: unknown[], decimals: number): number | null => {
    const nums = vals.map(parseStrictNumber).filter((n): n is number => n !== null);
    if (nums.length === 0) return null;
    return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(decimals));
  };

  const monthlyAvgPh = avgStrict(monthlySamples.map(w => w.ph), 2);
  const monthlyAvgTss = avgStrict(monthlySamples.map(w => w.tss), 1);
  const monthlyAvgDebit = avgStrict(monthlySamples.map(w => w.debit), 3);
  const monthlyAvgFe = avgStrict(monthlySamples.map(w => w.fe), 2);
  const monthlyAvgMn = avgStrict(monthlySamples.map(w => w.mn), 2);

  const startEditWater = (item: WastewaterData) => {
    setEditingWaterId(item.id);
    setWDate(item.date);
    setWSampleTime(item.sampleTime || getCurrentHHmm());
    setWWeather(item.weather || 'Cerah');

    const matchedLoc = locations.find(
      (l) => l.code === item.locationCode || item.location.includes(l.code)
    );
    const locCode = item.locationCode || matchedLoc?.code || 'KPL-01';
    setWLocationCode(locCode);
    setWLoc(item.location);
    setWSource(item.wastewaterSource || matchedLoc?.defaultSource || 'Settling Pond Outlet');
    setWOfficer(item.officer);

    setWPhStr(item.ph !== null && item.ph !== undefined ? String(item.ph) : '');
    setWTssStr(item.tss !== null && item.tss !== undefined ? String(item.tss) : '');
    setWDebitStr(item.debit !== null && item.debit !== undefined ? String(item.debit) : '');
    setWFeStr(item.fe !== null && item.fe !== undefined ? String(item.fe) : '');
    setWMnStr(item.mn !== null && item.mn !== undefined ? String(item.mn) : '');
    setWUnitMap(item.unitMap || { ph: '-', tss: 'mg/L', debit: 'm³/s', fe: 'mg/L', mn: 'mg/L' });
    setWCorrectionReason(item.correctionReason || '');
    setWMonitoringType(item.monitoringType || 'Harian');

    setWPhoto(null);
    if (item.hasPhoto) {
      setIsPhotoLoading(true);
      waterQualityService
        .getPhoto(item.id)
        .then((photoDoc) => {
          if (photoDoc) {
            setWPhoto({
              dataUrl: photoDoc.dataUrl,
              mimeType: photoDoc.mimeType,
              width: photoDoc.width,
              height: photoDoc.height,
              sizeBytes: photoDoc.sizeBytes,
            });
          }
        })
        .finally(() => {
          setIsPhotoLoading(false);
        });
    }

    setShowWaterForm(true);
  };

  const resetWaterForm = () => {
    setWDate(todayLocalISO());
    setWSampleTime(getCurrentHHmm());
    setWWeather('Cerah');
    const firstLoc = locations.find((l) => l.isActive) || locations[0];
    if (firstLoc) {
      setWLocationCode(firstLoc.code);
      setWLoc(`${firstLoc.name} (${firstLoc.code})`);
      setWSource(firstLoc.defaultSource);
    } else {
      setWLocationCode('KPL-01');
      setWLoc('KPL Tambang Blok Utara (KPL-01)');
      setWSource('Settling Pond Outlet');
    }
    setWOfficer(defaultOfficer);
    setWPhStr('');
    setWTssStr('');
    setWDebitStr('');
    setWFeStr('');
    setWMnStr('');
    setWUnitMap({ ph: '-', tss: 'mg/L', debit: 'm³/s', fe: 'mg/L', mn: 'mg/L' });
    setWCorrectionReason('');
    setWMonitoringType('Harian');
    setWPhoto(null);
    setEditingWaterId(null);
  };

  const resetSurfaceWaterForm = () => {
    setSwDate(todayLocalISO());
    setSwLoc('Air Sungai Sembakung (Hulu)');
    setSwOfficer(defaultOfficer);
    setSwPhStr('');
    setSwTssStr('');
    setSwDoStr('');
    setSwBodStr('');
    setSwCodStr('');
    setSwFeStr('');
    setSwMnStr('');
    setSwUnitMap({ ph: '-', tss: 'mg/L', doVal: 'mg/L', bod: 'mg/L', cod: 'mg/L', fe: 'mg/L', mn: 'mg/L' });
    setSwCorrectionReason('');
    setSwKelasAir('II');
    setSwMonitoringType('Harian');
    setEditingSurfaceWaterId(null);
  };

  const startEditSurfaceWater = (item: SurfaceWaterData) => {
    setEditingSurfaceWaterId(item.id);
    setSwDate(item.date);
    setSwLoc(item.location);
    setSwOfficer(item.officer);
    setSwPhStr(item.ph !== null && item.ph !== undefined ? String(item.ph) : '');
    setSwTssStr(item.tss !== null && item.tss !== undefined ? String(item.tss) : '');
    setSwDoStr(item.doVal !== null && item.doVal !== undefined ? String(item.doVal) : '');
    setSwBodStr(item.bod !== null && item.bod !== undefined ? String(item.bod) : '');
    setSwCodStr(item.cod !== null && item.cod !== undefined ? String(item.cod) : '');
    setSwFeStr(item.fe !== null && item.fe !== undefined ? String(item.fe) : '');
    setSwMnStr(item.mn !== null && item.mn !== undefined ? String(item.mn) : '');
    setSwUnitMap(item.unitMap || { ph: '-', tss: 'mg/L', doVal: 'mg/L', bod: 'mg/L', cod: 'mg/L', fe: 'mg/L', mn: 'mg/L' });
    setSwCorrectionReason(item.correctionReason || '');
    setSwKelasAir(item.kelasAir || 'II');
    setSwMonitoringType(item.monitoringType || 'Harian');
    setShowSurfaceForm(true);
  };

  const areAllSurfaceNumbersValid =
    swPhNum !== null && swPhNum >= 0 && swPhNum <= 14 &&
    swTssNum !== null && swTssNum >= 0 &&
    swDoNum !== null && swDoNum >= 0 &&
    swBodNum !== null && swBodNum >= 0 &&
    swCodNum !== null && swCodNum >= 0 &&
    swFeNum !== null && swFeNum >= 0 &&
    swMnNum !== null && swMnNum >= 0;

  const handleSurfaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swOfficer.trim()) {
      triggerToast('Masukkan nama petugas sampling.', 'warning');
      return;
    }
    if (!areAllSurfaceNumbersValid) {
      triggerToast('Semua parameter angka air permukaan wajib diisi dengan nilai numerik valid (tidak kosong/NaN).', 'warning');
      return;
    }
    if (editingSurfaceWaterId && !swCorrectionReason.trim()) {
      triggerToast('Alasan koreksi wajib diisi saat mengubah catatan kualitas air permukaan.', 'warning');
      return;
    }

    const payload = {
      date: swDate,
      location: swLoc.trim(),
      officer: swOfficer.trim(),
      ph: swPhNum!,
      tss: swTssNum!,
      doVal: swDoNum!,
      bod: swBodNum!,
      cod: swCodNum!,
      fe: swFeNum!,
      mn: swMnNum!,
      unitMap: swUnitMap,
      kelasAir: swKelasAir,
      monitoringType: swMonitoringType,
      ...(editingSurfaceWaterId && swCorrectionReason.trim()
        ? { correctionReason: swCorrectionReason.trim() }
        : {}),
    };

    if (editingSurfaceWaterId) {
      if (onUpdateSurfaceWater) {
        onUpdateSurfaceWater(editingSurfaceWaterId, payload);
      }
      setEditingSurfaceWaterId(null);
    } else {
      onAddSurfaceWater(payload);
    }

    resetSurfaceWaterForm();
    setShowSurfaceForm(false);
  };

  const startEditRain = (item: RainfallData) => {
    setEditingRainId(item.id);
    setRDate(item.date);
    setRStart(item.startTime);
    setREnd(item.endTime);
    setRStation(item.station);
    setRType(item.gaugeType);
    setRRainfallStr(item.rainfall !== null && item.rainfall !== undefined ? String(item.rainfall) : '');
    setRWeather(item.weather);
    setRNotes(item.notes || '');
    setShowRainForm(true);
  };

  // Submit water
  const handleWaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wOfficer.trim()) {
      triggerToast('Masukkan nama petugas sampling.', 'warning');
      return;
    }

    if (!areAllNumbersFilledAndFinite) {
      triggerToast('Semua parameter angka (pH, TSS, Debit, Fe, Mn) wajib diisi dengan nilai numerik valid.', 'warning');
      return;
    }

    if (editingWaterId && !wCorrectionReason.trim()) {
      triggerToast('Alasan koreksi wajib diisi saat memperbarui data sampling air limbah.', 'warning');
      return;
    }

    if (isDuplicateDaily) {
      triggerToast(`Data harian titik ${wLocationCode} tanggal ${formatIndoDate(wDate)} sudah ada. Edit data yang ada.`, 'warning');
      return;
    }

    const payload = {
      date: wDate,
      location: wLoc,
      locationCode: wLocationCode,
      wastewaterSource: wSource.trim(),
      sampleTime: wSampleTime,
      weather: wWeather,
      officer: wOfficer.trim(),
      ph: wPhNum!,
      tss: wTssNum!,
      debit: wDebitNum!,
      fe: wFeNum!,
      mn: wMnNum!,
      unitMap: wUnitMap,
      monitoringType: wMonitoringType,
      ...(editingWaterId && wCorrectionReason.trim()
        ? { correctionReason: wCorrectionReason.trim() }
        : {}),
    };

    const photoPayload = wPhoto
      ? {
          ...wPhoto,
          takenAt: `${wDate} ${wSampleTime}`,
        }
      : null;

    try {
      if (editingWaterId) {
        if (onUpdateWastewater) {
          await onUpdateWastewater(editingWaterId, payload, photoPayload);
        }
      } else {
        await onAddWastewater(payload, photoPayload);
      }
      resetWaterForm();
      setShowWaterForm(false);
    } catch {
      // Handled by service
    }
  };

  // Submit rain
  const handleRainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rRainfallNum = parseStrictNumber(rRainfallStr);
    if (rRainfallNum === null || rRainfallNum < 0) {
      triggerToast('Volume curah hujan (mm) wajib diisi dengan angka valid (>= 0).', 'warning');
      return;
    }

    // Calculate duration in minutes
    const [sH, sM] = rStart.split(':').map(Number);
    const [eH, eM] = rEnd.split(':').map(Number);
    let duration = (eH * 60 + eM) - (sH * 60 + sM);
    if (duration <= 0) duration = 60; // fallback

    // Calculate intensity: rainfall (mm) / (duration in hours)
    const intensity = Number((rRainfallNum / (duration / 60)).toFixed(2));

    const payload = {
      date: rDate,
      startTime: rStart,
      endTime: rEnd,
      duration,
      station: rStation,
      gaugeType: rType,
      rainfall: rRainfallNum,
      intensity,
      weather: rWeather,
      notes: rNotes
    };

    if (editingRainId) {
      if (onUpdateRainfall) {
        onUpdateRainfall(editingRainId, payload);
      }
      setEditingRainId(null);
    } else {
      onAddRainfall(payload);
    }

    setRNotes('');
    setRRainfallStr('');
    setRWeather('Clear');
    setShowRainForm(false);
  };

  // Surface Water Months & Statistics
  const uniqueSurfaceMonths = Array.from(new Set(surfaceWater.map(s => {
    if (!s.date) return '';
    return s.date.substring(0, 7); // 'YYYY-MM'
  }))).filter(Boolean).sort().reverse();

  const activeSurfaceMonth = selectedStatsMonth || (uniqueSurfaceMonths[0] || '');

  // 1. Daily Statistics (Latest available sampling date)
  const surfaceDates = surfaceWater.map(s => s.date).filter(Boolean);
  const latestSurfaceDate = surfaceDates.length > 0 ? [...surfaceDates].sort().reverse()[0] : null;

  const dailySurfaceSamples = latestSurfaceDate ? surfaceWater.filter(s => s.date === latestSurfaceDate) : [];
  const dailySurfaceSafeCount = dailySurfaceSamples.filter(s => s.status === 'Safe').length;
  const dailySurfaceWarningCount = dailySurfaceSamples.filter(s => s.status === 'Warning').length;
  const dailySurfaceExceededCount = dailySurfaceSamples.filter(s => s.status === 'Exceeded').length;
  const dailySurfaceEvaluated = dailySurfaceSafeCount + dailySurfaceWarningCount + dailySurfaceExceededCount;
  const dailySurfaceTotal = dailySurfaceSamples.length;
  const dailySurfaceComplianceRate = dailySurfaceEvaluated > 0 ? Math.round(((dailySurfaceSafeCount + dailySurfaceWarningCount) / dailySurfaceEvaluated) * 100) : 0;

  // 2. Monthly Statistics (Selected active month)
  const monthlySurfaceSamples = activeSurfaceMonth ? surfaceWater.filter(s => s.date && s.date.startsWith(activeSurfaceMonth)) : [];
  const monthlySurfaceSafeCount = monthlySurfaceSamples.filter(s => s.status === 'Safe').length;
  const monthlySurfaceWarningCount = monthlySurfaceSamples.filter(s => s.status === 'Warning').length;
  const monthlySurfaceExceededCount = monthlySurfaceSamples.filter(s => s.status === 'Exceeded').length;
  const monthlySurfaceUnverifiedOrIncomplete = monthlySurfaceSamples.filter(
    s => s.status === 'Incomplete' || s.status === 'Unevaluated'
  ).length;
  const monthlySurfaceEvaluated = monthlySurfaceSafeCount + monthlySurfaceWarningCount + monthlySurfaceExceededCount;
  const monthlySurfaceTotal = monthlySurfaceSamples.length;
  const monthlySurfaceComplianceRate = monthlySurfaceEvaluated > 0 ? Math.round(((monthlySurfaceSafeCount + monthlySurfaceWarningCount) / monthlySurfaceEvaluated) * 100) : 0;

  const monthlySurfaceAvgPh = avgStrict(monthlySurfaceSamples.map(s => s.ph), 2);
  const monthlySurfaceAvgTss = avgStrict(monthlySurfaceSamples.map(s => s.tss), 1);
  const monthlySurfaceAvgDo = avgStrict(monthlySurfaceSamples.map(s => s.doVal), 2);
  const monthlySurfaceAvgBod = avgStrict(monthlySurfaceSamples.map(s => s.bod), 2);
  const monthlySurfaceAvgCod = avgStrict(monthlySurfaceSamples.map(s => s.cod), 2);
  const monthlySurfaceAvgFe = avgStrict(monthlySurfaceSamples.map(s => s.fe), 2);
  const monthlySurfaceAvgMn = avgStrict(monthlySurfaceSamples.map(s => s.mn), 2);

  // Filter lists
  const filteredWater = wastewater.filter(item => {
    const locMatch = waterFilterLoc ? item.location.includes(waterFilterLoc) : true;
    const statMatch = waterFilterStatus ? item.status === waterFilterStatus : true;
    return locMatch && statMatch;
  });

  const filteredSurfaceWater = surfaceWater.filter(item => {
    const locMatch = surfaceFilterLoc ? item.location.includes(surfaceFilterLoc) : true;
    const statMatch = surfaceFilterStatus ? item.status === surfaceFilterStatus : true;
    return locMatch && statMatch;
  });

  const filteredRain = rainfall.filter(item => {
    return rainFilterStation ? item.station.includes(rainFilterStation) : true;
  });

  return (
    <div id="monitoring-view-container" className="space-y-6 text-text-hi">
      {/* Upper sub navigation header tabs */}
      <div className="flex flex-wrap border-b border-border-subtle">
        <button
          id="monitoring-tab-water"
          type="button"
          onClick={() => setActiveTab('water')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'water'
              ? 'border-neon-cyan text-neon-cyan'
              : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          <Droplet className="h-4 w-4" />
          Pemantauan Air Limbah Tambang
        </button>

        <button
          id="monitoring-tab-surfacewater"
          type="button"
          onClick={() => setActiveTab('surfacewater')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'surfacewater'
              ? 'border-neon-cyan text-neon-cyan'
              : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          <Activity className="h-4 w-4" />
          Air Permukaan (Sungai / Badan Air)
        </button>

        <button
          id="monitoring-tab-rainfall"
          type="button"
          onClick={() => setActiveTab('rainfall')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rainfall'
              ? 'border-neon-cyan text-neon-cyan'
              : 'border-transparent text-text-mid hover:text-text-hi'
          }`}
        >
          <CloudRain className="h-4 w-4" />
          Pemantauan Curah Hujan (Rain Gauge)
        </button>
      </div>

      {activeTab === 'water' && (
        <div id="water-monitoring-panel" className="space-y-6">
          {/* Water parameters indicators banner */}
          <div className="glass-panel p-4 rounded-2xl space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="text-center md:border-r border-border-subtle py-1.5 last:border-0">
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Baku pH</span>
                <p className="text-sm font-bold font-mono text-neon-cyan mt-1 tabular-nums">{phLimitRange}</p>
              </div>
              <div className="text-center md:border-r border-border-subtle py-1.5 last:border-0">
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Baku TSS</span>
                <p
                  className={`text-sm font-bold font-mono mt-1 tabular-nums ${
                    tssMaxLimit === null ? 'text-neon-amber' : 'text-neon-cyan'
                  }`}
                >
                  {tssLimit}
                </p>
              </div>
              <div className="text-center md:border-r border-border-subtle py-1.5 last:border-0">
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Debit Air (m³/s)</span>
                <p className="text-sm font-bold font-mono text-text-hi mt-1">{debitLimit}</p>
              </div>
              <div className="text-center md:border-r border-border-subtle py-1.5 last:border-0">
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Baku Besi (Fe)</span>
                <p className="text-sm font-bold font-mono text-neon-cyan mt-1 tabular-nums">{feLimit}</p>
              </div>
              <div className="text-center py-1.5 last:border-0">
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Baku Mangan (Mn)</span>
                <p className="text-sm font-bold font-mono text-neon-cyan mt-1 tabular-nums">{mnLimit}</p>
              </div>
            </div>
            {(activeWaterStds.tss?.verificationStatus === 'Perlu verifikasi' ||
              activeWaterStds.tss?.effectiveStatus === 'MENUNGGU VERIFIKASI') && (
              <div className="px-3 py-2 rounded-xl bg-neon-amber/10 border border-neon-amber/30 text-[11px] text-neon-amber flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Perlu Verifikasi Manual (SK Pertek TSS):</strong> Standar TSS (
                  <span className="font-mono">{activeWaterStds.tss?.approvalDocNo || '600.4/865/B.III.2/DLH/2025'}</span>
                  ) masih menunggu verifikasi nilai ambang resmi. Sampel tidak dapat disimpulkan MEMENUHI sebelum nilai TSS terverifikasi.
                </span>
              </div>
            )}
          </div>

          {/* Status Pemantauan Harian & Bulanan Dashboard Panel */}
          <div id="water-status-dashboard" className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-left">
            {/* 1. Daily Status Card */}
            <div id="daily-water-status-card" className="neon-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid flex items-center gap-2 font-heading">
                    <Clock className="h-4 w-4 text-neon-cyan" />
                    Status Pemantauan Harian
                  </h4>
                  <span className="text-[10px] font-mono bg-neon-cyan/10 text-neon-cyan px-2.5 py-0.5 rounded-full border border-neon-cyan/30 tabular-nums">
                    {latestWaterDate ? formatIndoDate(latestWaterDate) : 'Tidak ada data'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div
                    className="relative flex items-center justify-center shrink-0 w-20 h-20 rounded-full border-4"
                    style={{
                      borderColor:
                        dailyEvaluatedTotal === 0
                          ? NEON_CHART.amber
                          : dailyComplianceRate >= 90
                          ? NEON_CHART.green
                          : dailyComplianceRate >= 70
                          ? NEON_CHART.amber
                          : NEON_CHART.red,
                    }}
                  >
                    <div className="text-center">
                      <span className="text-sm font-extrabold font-mono text-text-hi tabular-nums">
                        {dailyEvaluatedTotal > 0 ? `${dailyComplianceRate}%` : '—'}
                      </span>
                      <span className="block text-[8px] uppercase tracking-wider text-text-low font-mono mt-0.5">
                        Kepatuhan
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-mid">
                      <span>Total Titik Dipantau:</span>
                      <strong className="text-text-hi font-mono tabular-nums">
                        {dailyTotal} Lokasi
                        {dailyUnverifiedOrIncompleteCount > 0 && (
                          <span className="text-neon-amber ml-1">({dailyUnverifiedOrIncompleteCount} blm dievaluasi/lkp)</span>
                        )}
                      </strong>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                      <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl py-1.5">
                        <span className="text-neon-green block font-bold text-xs tabular-nums">{dailySafeCount}</span>
                        <span className="text-text-mid block text-[8px] uppercase tracking-wide">Memenuhi</span>
                      </div>
                      <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-xl py-1.5">
                        <span className="text-neon-amber block font-bold text-xs tabular-nums">{dailyWarningCount}</span>
                        <span className="text-text-mid block text-[8px] uppercase tracking-wide">Mendekati</span>
                      </div>
                      <div className="bg-neon-red/10 border border-neon-red/30 rounded-xl py-1.5">
                        <span className="text-neon-red block font-bold text-xs tabular-nums">{dailyExceededCount}</span>
                        <span className="text-text-mid block text-[8px] uppercase tracking-wide">Melebihi</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 px-3 py-2.5 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2.5 ${
                  dailyTotal === 0
                    ? 'bg-bg-2/60 border-border-subtle text-text-mid'
                    : dailyExceededCount > 0
                    ? 'bg-neon-red/10 border-neon-red/35 text-neon-red'
                    : dailyUnverifiedOrIncompleteCount > 0 || dailyWarningCount > 0
                    ? 'bg-neon-amber/10 border-neon-amber/35 text-neon-amber'
                    : 'bg-neon-green/10 border-neon-green/35 text-neon-green'
                }`}
              >
                {dailyTotal === 0 ? (
                  <>
                    <Activity className="h-4 w-4 text-text-low shrink-0" />
                    <span>Belum ada data pengamatan harian air limbah.</span>
                  </>
                ) : dailyExceededCount > 0 ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-neon-red shrink-0" />
                    <span>
                      <strong>Perhatian:</strong> Terdapat {dailyExceededCount} titik sampling yang melebihi standar mutu lingkungan tambang hari ini!
                    </span>
                  </>
                ) : dailyUnverifiedOrIncompleteCount > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-neon-amber shrink-0" />
                    <span>
                      <strong>Belum Dapat Disimpulkan Memenuhi:</strong> {dailyUnverifiedOrIncompleteCount} titik memiliki data tidak lengkap atau standar menunggu verifikasi.
                    </span>
                  </>
                ) : dailyWarningCount > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-neon-amber shrink-0" />
                    <span>
                      <strong>Peringatan:</strong> {dailyWarningCount} titik mendekati batas kritis baku mutu. Lakukan koordinasi tim pengolah settling pond.
                    </span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-neon-green shrink-0" />
                    <span>
                      <strong>Memenuhi:</strong> Seluruh outlet air limbah tambang teruji hari ini memenuhi baku mutu terverifikasi.
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Monthly Status Card */}
            <div id="monthly-water-status-card" className="neon-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4 gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid flex items-center gap-2 font-heading">
                    <Activity className="h-4 w-4 text-neon-cyan" />
                    Analisis Kepatuhan Bulanan
                  </h4>
                  <div className="flex items-center gap-1.5 bg-bg-0 px-2.5 py-1 rounded-lg border border-border-neon">
                    <Calendar className="h-3 w-3 text-neon-cyan" />
                    <select
                      id="stats-month-selector"
                      value={selectedStatsMonth}
                      onChange={(e) => setSelectedStatsMonth(e.target.value)}
                      className="bg-transparent border-0 text-[10px] font-mono text-text-hi focus:outline-none focus:shadow-none cursor-pointer p-0"
                    >
                      {uniqueWaterMonths.map((m) => (
                        <option key={m} value={m} className="bg-bg-1 text-text-hi">
                          {formatIndoMonth(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-4 flex flex-col items-center justify-center bg-bg-2/70 border border-border-neon rounded-2xl p-3 text-center">
                    <span className="text-2xl font-extrabold font-mono tabular-nums text-neon-cyan">
                      {monthlyEvaluatedTotal > 0 ? `${monthlyComplianceRate}%` : '—'}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-text-mid font-mono mt-0.5">Kepatuhan Terverifikasi</span>
                    <span className="text-[9px] text-text-low font-mono mt-1 tabular-nums">
                      {monthlyTotal} Uji{monthlyUnverifiedOrIncompleteCount > 0 ? ` (${monthlyUnverifiedOrIncompleteCount} blm ev.)` : ''}
                    </span>
                  </div>

                  <div className="sm:col-span-8 space-y-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-text-low font-mono block">
                      Rata-Rata Parameter Bulanan
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-center font-mono tabular-nums">
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata pH</span>
                        <strong
                          className={`text-xs mt-0.5 ${
                            monthlyAvgPh !== null && phMinLimit !== null && phMaxLimit !== null && (monthlyAvgPh < phMinLimit || monthlyAvgPh > phMaxLimit)
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(monthlyAvgPh, 1, 2)}
                        </strong>
                      </div>
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata TSS</span>
                        <strong
                          className={`text-xs mt-0.5 ${
                            monthlyAvgTss !== null && tssMaxLimit !== null && monthlyAvgTss > tssMaxLimit ? 'text-neon-red' : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(monthlyAvgTss, 0, 1)} <span className="text-[8px] font-normal text-text-low">mg/L</span>
                        </strong>
                      </div>
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata Fe</span>
                        <strong
                          className={`text-xs mt-0.5 ${
                            monthlyAvgFe !== null && feMaxLimit !== null && monthlyAvgFe > feMaxLimit ? 'text-neon-red' : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(monthlyAvgFe, 1, 2)} <span className="text-[8px] font-normal text-text-low">mg/L</span>
                        </strong>
                      </div>
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata Mn</span>
                        <strong
                          className={`text-xs mt-0.5 ${
                            monthlyAvgMn !== null && mnMaxLimit !== null && monthlyAvgMn > mnMaxLimit ? 'text-neon-red' : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(monthlyAvgMn, 1, 2)} <span className="text-[8px] font-normal text-text-low">mg/L</span>
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-text-mid border-t border-border-subtle pt-2.5 gap-2">
                <span>Periode Analisis: {formatIndoMonth(activeWaterMonth)}</span>
                <StatusBadge
                  status={
                    monthlyEvaluatedTotal === 0
                      ? 'Belum Dievaluasi'
                      : monthlyComplianceRate >= 95
                      ? 'Memenuhi'
                      : monthlyComplianceRate >= 80
                      ? 'Mendekati'
                      : 'Tidak Memenuhi'
                  }
                  label={
                    monthlyEvaluatedTotal === 0
                      ? 'Menunggu Verifikasi / Data'
                      : monthlyComplianceRate >= 95
                      ? 'Kinerja Sangat Baik'
                      : monthlyComplianceRate >= 80
                      ? 'Kinerja Butuh Perhatian'
                      : 'Kinerja Bahaya / Melanggar'
                  }
                />
              </div>
            </div>
          </div>

          {/* Action buttons + Filters row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-low" />
                <input
                  id="water-filter-loc"
                  type="text"
                  placeholder="Cari Lokasi Sampling..."
                  value={waterFilterLoc}
                  onChange={(e) => setWaterFilterLoc(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs w-full"
                />
              </div>

              <select
                id="water-filter-status"
                value={waterFilterStatus}
                onChange={(e) => setWaterFilterStatus(e.target.value)}
                className="px-4 py-2 text-xs"
              >
                <option value="">Semua Status Baku Mutu</option>
                <option value="Safe">Memenuhi Baku Mutu</option>
                <option value="Warning">Mendekati Batas</option>
                <option value="Exceeded">Melebihi Baku Mutu</option>
                <option value="Incomplete">Data Tidak Lengkap</option>
                <option value="Unevaluated">Belum Dievaluasi</option>
                <option value="NotApplicable">Tidak Berlaku</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-start flex-wrap">
              {canManageStd && (
                <>
                  <button
                    id="water-manage-standards-btn"
                    type="button"
                    onClick={() => setShowStandardsModal(true)}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-bg-2/80 border border-border-neon hover:border-neon-cyan/50 text-text-hi font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    <Sliders className="h-4 w-4 text-neon-cyan" />
                    Kelola Baku Mutu &amp; Ambang
                  </button>
                  <button
                    id="water-manage-locations-btn"
                    type="button"
                    onClick={() => setShowLocationModal(true)}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-bg-2/80 border border-border-neon hover:border-neon-cyan/50 text-text-hi font-bold rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-neon-cyan" />
                    Kelola Titik Sampling
                  </button>
                </>
              )}

              <button
                id="water-add-data-btn"
                type="button"
                onClick={() => {
                  if (!showWaterForm) {
                    resetWaterForm();
                    setShowWaterForm(true);
                  } else {
                    setShowWaterForm(false);
                  }
                }}
                className="neon-btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Input Hasil Sampling Air
              </button>
            </div>
          </div>

          {/* Collapsible water form */}
          {showWaterForm && (
            <form
              id="water-data-form"
              onSubmit={handleWaterSubmit}
              className="glass-panel p-5 rounded-2xl text-left animate-slide-up space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan flex items-center gap-2 font-heading">
                  <Droplet className="h-4 w-4" />
                  {editingWaterId
                    ? 'Formulir Edit Pengujian Air Limbah'
                    : 'Formulir Hasil Pengujian Titik KPL / Settling Pond'}
                </h3>
                <span className="text-[11px] text-text-mid font-mono">Standard: SK Pertek PT DKB</span>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Tanggal Sampling *
                  </label>
                  <input
                    id="water-field-date"
                    type="date"
                    required
                    max={todayLocalISO()}
                    value={wDate}
                    onChange={(e) => setWDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Jam Sampling (WITA) *
                  </label>
                  <input
                    id="water-field-sample-time"
                    type="text"
                    required
                    placeholder="HH:mm (cth: 08:30)"
                    pattern="^([01]\d|2[0-3]):[0-5]\d$"
                    title="Format jam harus HH:mm (24 jam, misal 08:30)"
                    value={wSampleTime}
                    onChange={(e) => setWSampleTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Kondisi Cuaca *
                  </label>
                  <select
                    id="water-field-weather"
                    value={wWeather}
                    onChange={(e) => setWWeather(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs cursor-pointer"
                  >
                    <option value="Cerah">Cerah</option>
                    <option value="Berawan">Berawan</option>
                    <option value="Hujan Ringan">Hujan Ringan</option>
                    <option value="Hujan Lebat">Hujan Lebat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Jenis Pemantauan *
                  </label>
                  <select
                    id="water-field-monitoring-type"
                    value={wMonitoringType}
                    onChange={(e) => setWMonitoringType(e.target.value as 'Harian' | 'Bulanan')}
                    className="w-full px-3 py-2 text-xs cursor-pointer"
                  >
                    <option value="Harian">Harian (Daily)</option>
                    <option value="Bulanan">Bulanan (Monthly)</option>
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Titik Sampling (Master) *
                  </label>
                  <select
                    id="water-field-location-select"
                    required
                    value={wLocationCode}
                    onChange={(e) => {
                      const selCode = e.target.value;
                      setWLocationCode(selCode);
                      const target = locations.find((l) => l.code === selCode);
                      if (target) {
                        setWLoc(`${target.name} (${target.code})`);
                        setWSource(target.defaultSource);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.code}>
                        {loc.name} ({loc.code}) {!loc.isActive ? '[Nonaktif]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Sumber Air Limbah *
                  </label>
                  <input
                    id="water-field-source"
                    type="text"
                    required
                    placeholder="Contoh: Settling Pond Outlet"
                    value={wSource}
                    onChange={(e) => setWSource(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Nama Petugas Sampling *
                  </label>
                  <input
                    id="water-field-officer"
                    type="text"
                    required
                    placeholder="Contoh: Aditya Perkasa"
                    value={wOfficer}
                    onChange={(e) => setWOfficer(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div>
                <label className="block text-[11px] text-text-mid font-bold mb-2 uppercase">
                  Hasil Parameter Uji Lapangan (Wajib Diisi Lengkap) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] text-text-mid font-bold mb-1 uppercase">
                      pH (0 - 14) *
                    </label>
                    <input
                      id="water-field-ph"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="cth: 7.25"
                      value={wPhStr}
                      onChange={(e) => setWPhStr(e.target.value)}
                      className={`w-full px-3 py-2 text-xs font-mono ${
                        wPhNum !== null && (wPhNum < 0 || wPhNum > 14) ? '!border-neon-red' : ''
                      }`}
                    />
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: {phLimitRange}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-mid font-bold mb-1 uppercase">
                      TSS (mg/L) *
                    </label>
                    <input
                      id="water-field-tss"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="cth: 45"
                      value={wTssStr}
                      onChange={(e) => setWTssStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono"
                    />
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: {tssLimit}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-mid font-bold mb-1 uppercase">
                      Debit (m³/s) *
                    </label>
                    <input
                      id="water-field-debit"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="cth: 0.125"
                      value={wDebitStr}
                      onChange={(e) => setWDebitStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono"
                    />
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Pantau debit outlet</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-mid font-bold mb-1 uppercase">
                      Besi / Fe (mg/L) *
                    </label>
                    <input
                      id="water-field-fe"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="cth: 0.50"
                      value={wFeStr}
                      onChange={(e) => setWFeStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono"
                    />
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: {feLimit}</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-mid font-bold mb-1 uppercase">
                      Mangan / Mn (mg/L) *
                    </label>
                    <input
                      id="water-field-mn"
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="cth: 0.30"
                      value={wMnStr}
                      onChange={(e) => setWMnStr(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono"
                    />
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: {mnLimit}</span>
                  </div>
                </div>

                {/* Unit verification row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                  {(['ph', 'tss', 'debit', 'fe', 'mn'] as const).map((pk) => {
                    const unitChoices =
                      pk === 'ph'
                        ? ['-']
                        : pk === 'debit'
                        ? ['m³/s', 'L/s']
                        : ['mg/L', 'g/L', 'µg/L', 'ppm'];
                    return (
                      <div key={pk} className="flex items-center gap-1.5">
                        <span className="text-[9px] text-text-low uppercase font-mono">Satuan:</span>
                        <select
                          aria-label={`Satuan ${pk}`}
                          value={wUnitMap[pk] || '-'}
                          onChange={(e) => setWUnitMap((prev) => ({ ...prev, [pk]: e.target.value }))}
                          className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-bg-0 border border-border-subtle"
                        >
                          {unitChoices.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editingWaterId && (
                <div>
                  <label className="block text-[11px] text-neon-amber font-bold mb-1.5 uppercase">
                    Alasan Koreksi Data *
                  </label>
                  <input
                    id="water-field-correction-reason"
                    type="text"
                    required
                    placeholder="Jelaskan alasan perubahan nilai/data untuk jejak audit..."
                    value={wCorrectionReason}
                    onChange={(e) => setWCorrectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              )}

              {/* Row 4 */}
              <div>
                <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                  Foto Evidence Pengambilan Sampel (Opsional)
                </label>
                {isPhotoLoading ? (
                  <div className="p-4 rounded-xl border border-border-subtle bg-bg-2/60 flex items-center justify-center gap-2 text-xs text-text-mid">
                    <Loader2 className="w-4 h-4 animate-spin text-neon-cyan" />
                    <span>Memuat foto evidence...</span>
                  </div>
                ) : (
                  <PhotoUploader currentPhoto={wPhoto} onPhotoSelected={setWPhoto} />
                )}
              </div>

              {/* Duplicate Warning Alert */}
              {isDuplicateDaily && (
                <div className="p-3.5 rounded-xl bg-neon-amber/10 border border-neon-amber/35 text-neon-amber text-xs flex items-center gap-2.5 font-medium">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-neon-amber" />
                  <div>
                    <span className="font-bold block">Peringatan Duplikasi Data Harian:</span>
                    <span>
                      Data harian titik <strong className="font-mono">{wLocationCode}</strong> tanggal{' '}
                      <strong className="font-mono">{formatIndoDate(wDate)}</strong> sudah ada. Edit data yang ada.
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Validation Feedback badge */}
              <div className="p-3 rounded-xl border space-y-1.5 bg-bg-2/60 border-border-subtle">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-text-mid">Verifikasi baku mutu otomatis ({waterEval.standardsBasis}) :</p>
                  <StatusBadge
                    size="sm"
                    status={waterEval.overall}
                    label={
                      waterEval.overall === 'MEMENUHI' && waterEval.warningParams.length > 0
                        ? 'MEMENUHI (MENDEKATI BATAS INTERNAL)'
                        : waterEval.overall
                    }
                  />
                </div>
                <p className="text-[11px] text-text-mid">{waterEval.evaluationReason}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-border-subtle">
                <button
                  id="water-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowWaterForm(false);
                    resetWaterForm();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="water-form-submit"
                  type="submit"
                  disabled={!areAllNumbersFilledAndFinite || !wOfficer.trim() || isDuplicateDaily || !wDate || !wLocationCode}
                  className={`px-5 py-2.5 text-xs rounded-xl transition-all ${
                    !areAllNumbersFilledAndFinite || !wOfficer.trim() || isDuplicateDaily || !wDate || !wLocationCode
                      ? 'bg-bg-2 text-text-low border border-border-subtle cursor-not-allowed opacity-60 font-bold'
                      : 'neon-btn-primary cursor-pointer'
                  }`}
                  title={
                    !areAllNumbersFilledAndFinite
                      ? 'Lengkapi semua parameter angka sebelum menyimpan'
                      : isDuplicateDaily
                      ? 'Data harian untuk titik dan tanggal ini sudah ada'
                      : 'Simpan catatan pengujian'
                  }
                >
                  {editingWaterId ? 'Update Records' : 'Simpan Records'}
                </button>
              </div>
            </form>
          )}

          {/* Water log table */}
          <div className="glass-panel rounded-2xl overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-heading">
                Log Pengujian Air Limbah Tambang
              </h4>
            </div>
            <div className="overflow-x-auto max-h-[560px]">
              {filteredWater.length === 0 ? (
                <EmptyState
                  icon={Droplet}
                  title="Tidak ada data hasil sampling yang cocok"
                  description="Ubah filter pencarian atau tambahkan pencatatan sampling air limbah tambang baru."
                />
              ) : (
                <table className="neon-table text-left">
                  <thead>
                    <tr className="text-[10px] font-mono tracking-wider uppercase">
                      <th className="p-3.5 pl-5">No / Tgl</th>
                      <th className="p-3.5">Lokasi Sampling</th>
                      <th className="p-3.5 text-right">pH</th>
                      <th className="p-3.5 text-right">TSS</th>
                      <th className="p-3.5 text-right">Debit (m³/s)</th>
                      <th className="p-3.5 text-right">Besi / Fe</th>
                      <th className="p-3.5 text-right">Mangan / Mn</th>
                      <th className="p-3.5 text-center">Compliance</th>
                      <th className="p-3.5 text-center pr-5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredWater.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3.5 pl-5 font-mono tabular-nums">
                          <span className="text-text-low block text-[9px]">{item.id}</span>
                          <span className="font-semibold text-text-hi">{item.date}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-text-hi block">{item.location}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-text-mid">Petugas: {item.officer}</span>
                            {item.sampleTime && (
                              <span className="text-[10px] text-text-mid font-mono flex items-center gap-0.5">
                                • <Clock className="w-2.5 h-2.5" /> {item.sampleTime} WITA
                              </span>
                            )}
                            {item.weather && <span className="text-[10px] text-text-mid">• {item.weather}</span>}
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                                item.monitoringType === 'Bulanan'
                                  ? 'bg-neon-violet/15 text-neon-violet border-neon-violet/30'
                                  : 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30'
                              }`}
                            >
                              {item.monitoringType || 'Harian'}
                            </span>
                            {(item.monitoringType ?? 'Harian') === 'Harian' &&
                              duplicateDailyKeys.has(`${item.date}_${item.locationCode || item.location}`) && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-neon-amber/15 text-neon-amber border border-neon-amber/30">
                                  Ganda
                                </span>
                              )}
                            {!isMasteredLocation(item) && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-neon-red/15 text-neon-red border border-neon-red/30">
                                lokasi belum terdaftar
                              </span>
                            )}
                            {item.hasPhoto && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoPreviewItem(item);
                                  setPhotoPreviewDoc(null);
                                  setIsLoadingLazyPhoto(true);
                                  waterQualityService
                                    .getPhoto(item.id)
                                    .then((docSnap) => {
                                      setPhotoPreviewDoc(docSnap);
                                    })
                                    .finally(() => {
                                      setIsLoadingLazyPhoto(false);
                                    });
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 bg-neon-green/15 hover:bg-neon-green/25 text-neon-green border border-neon-green/30 cursor-pointer transition-colors"
                                title="Lihat Foto Evidence Sampling"
                              >
                                <Camera className="w-2.5 h-2.5" />
                                Foto
                              </button>
                            )}
                          </div>
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            typeof item.ph === 'number' &&
                            (item.standardSnapshot?.ph?.min ?? phMinLimit) !== null &&
                            (item.standardSnapshot?.ph?.max ?? phMaxLimit) !== null &&
                            (item.ph < (item.standardSnapshot?.ph?.min ?? phMinLimit)! ||
                              item.ph > (item.standardSnapshot?.ph?.max ?? phMaxLimit)!)
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(item.ph, 1, 2)}
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            typeof item.tss === 'number' &&
                            (item.standardSnapshot?.tss?.max ?? tssMaxLimit) !== null &&
                            item.tss > (item.standardSnapshot?.tss?.max ?? tssMaxLimit)!
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(item.tss, 0, 1)}
                        </td>
                        <td className="p-3.5 text-right font-bold font-mono tabular-nums text-neon-cyan">
                          {formatLocaleNumberStrict(item.debit, 3, 3)}
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            typeof item.fe === 'number' &&
                            (item.standardSnapshot?.fe?.max ?? feMaxLimit) !== null &&
                            item.fe > (item.standardSnapshot?.fe?.max ?? feMaxLimit)!
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(item.fe, 1, 3)}
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            typeof item.mn === 'number' &&
                            (item.standardSnapshot?.mn?.max ?? mnMaxLimit) !== null &&
                            item.mn > (item.standardSnapshot?.mn?.max ?? mnMaxLimit)!
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {formatLocaleNumberStrict(item.mn, 1, 3)}
                        </td>
                        <td className="p-3.5 text-center" title={item.evaluationReason || undefined}>
                          <StatusBadge status={item.evaluationStatus || item.status || 'Menunggu evaluasi server'} />
                          {item.evaluationReason && (
                            <span className="block text-[9px] text-text-low mt-0.5 max-w-[180px] truncate mx-auto">
                              {item.evaluationReason}
                            </span>
                          )}
                          {standards.length > 0 && (() => {
                            const liveEval = getLiveEvaluation('air_limbah', item, standards, internalThresholds);
                            if (!liveEval.isStale) return null;
                            return (
                              <span
                                className="block text-[9px] text-neon-amber font-semibold mt-0.5 max-w-[190px] truncate mx-auto"
                                title={`Evaluasi tersimpan: ${liveEval.storedConclusion} → Evaluasi baku mutu saat ini: ${liveEval.live.overall}`}
                              >
                                Baku mutu diperbarui · Live: {liveEval.live.overall}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`water-edit-btn-${item.id}`}
                              type="button"
                              onClick={() => startEditWater(item)}
                              className="p-1.5 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg cursor-pointer transition-colors"
                              title="Edit record"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              id={`water-delete-btn-${item.id}`}
                              type="button"
                              onClick={() => {
                                setDeleteConfirm({
                                  id: item.id,
                                  type: 'water',
                                  message: `Hapus data pengamatan ${item.id}?`,
                                });
                              }}
                              className="p-1.5 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 border border-neon-red/30 rounded-lg cursor-pointer transition-colors"
                              title="Hapus record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'surfacewater' && (
        <div id="surfacewater-monitoring-panel" className="space-y-6">
          {/* PP No. 22 Tahun 2021 Lampiran VI Parameter Banner */}
          <div className="glass-panel p-4 rounded-2xl space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-subtle">
              <span className="text-xs font-bold text-neon-cyan uppercase tracking-wider font-heading">
                Baku Mutu Air Permukaan ({SURFACE_WATER_BASIS_LABEL})
              </span>
              <span className="text-[11px] font-mono text-text-mid">
                Periode Statistik: {activeSurfaceMonth ? formatIndoMonth(activeSurfaceMonth) : 'Bulan Ini'} ({monthlySurfaceTotal} Sampel)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">pH</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.ph)}
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgPh, 1, 2)}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">TSS</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.tss)}
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgTss, 0, 1)}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">DO</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.doVal)}
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgDo, 1, 2)}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">BOD</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.bod)}
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgBod, 1, 2)}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">COD</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.cod)}
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgCod, 1, 2)}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">Fe</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.fe)}
                </p>
                {activeSurfaceStds.fe?.verificationStatus !== 'Terverifikasi' ? (
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-neon-amber/15 text-neon-amber border border-neon-amber/30 font-semibold mt-0.5">
                    Perlu verifikasi manual
                  </span>
                ) : (
                  <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgFe, 1, 2)}</p>
                )}
              </div>
              <div className="text-center py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">Mn</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {formatStandardLimitDisplay(activeSurfaceStds.mn)}
                </p>
                {activeSurfaceStds.mn?.verificationStatus !== 'Terverifikasi' ? (
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-neon-amber/15 text-neon-amber border border-neon-amber/30 font-semibold mt-0.5">
                    Perlu verifikasi manual
                  </span>
                ) : (
                  <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {formatLocaleNumberStrict(monthlySurfaceAvgMn, 1, 2)}</p>
                )}
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="neon-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-mid uppercase font-mono font-bold">Kepatuhan Bulan Ini</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-neon-green mt-1">
                  {monthlySurfaceEvaluated > 0 ? `${monthlySurfaceComplianceRate}%` : '—'}
                </p>
                <p className="text-[11px] text-text-mid mt-0.5 font-mono">
                  {monthlySurfaceSafeCount} Memenuhi • {monthlySurfaceWarningCount} Mendekati • {monthlySurfaceExceededCount} Melebihi
                  {monthlySurfaceUnverifiedOrIncomplete > 0 ? ` • ${monthlySurfaceUnverifiedOrIncomplete} Blm Evaluasi/Lkp` : ''}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="neon-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-mid uppercase font-mono font-bold">Rata-rata DO / BOD</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-neon-cyan mt-1">
                  {formatLocaleNumberStrict(monthlySurfaceAvgDo, 1, 2)} / {formatLocaleNumberStrict(monthlySurfaceAvgBod, 1, 2)}
                </p>
                <p className="text-[11px] text-text-mid mt-0.5 font-mono">
                  DO: {formatStandardLimitDisplay(activeSurfaceStds.doVal)} • BOD: {formatStandardLimitDisplay(activeSurfaceStds.bod)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="neon-card p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-mid uppercase font-mono font-bold">Total Titik Sampel Sungai</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-text-hi mt-1">
                  {surfaceWater.length} Record
                </p>
                <p className="text-[11px] text-text-mid mt-0.5">Hulu, Tengah &amp; Hilir Sungai</p>
              </div>
              <div className="p-3 rounded-xl bg-neon-violet/10 border border-neon-violet/30 text-neon-violet">
                <Droplet className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Tren Parameter Air Permukaan */}
          {filteredSurfaceWater.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl text-left">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-hi font-heading">
                  Tren Kualitas Air Permukaan (pH, TSS, DO, COD)
                </h4>
                <span className="text-[10px] font-mono text-text-low">12 Sampel Terakhir</span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={[...filteredSurfaceWater]
                      .slice(0, 12)
                      .reverse()
                      .map((d) => ({ date: d.date, pH: d.ph, TSS: d.tss, DO: d.doVal, COD: d.cod }))}
                    margin={{ top: 10, right: 16, left: -16, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={NEON_CHART.gridStroke} />
                    <XAxis dataKey="date" stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                    <YAxis stroke={NEON_CHART.tickFill} fontSize={10} tickLine={false} />
                    <RechartsTooltip contentStyle={NEON_TOOLTIP_CONTENT_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: NEON_CHART.tickFill }} />
                    {isStdVerified(activeSurfaceStds.tss) && typeof activeSurfaceStds.tss?.maxLimit === 'number' && (
                      <ReferenceLine
                        y={activeSurfaceStds.tss.maxLimit}
                        stroke={NEON_CHART.red}
                        strokeDasharray="4 4"
                        label={{
                          value: `Max TSS ${activeSurfaceStds.tss.maxLimit}`,
                          position: 'insideTopRight',
                          fill: NEON_CHART.red,
                          fontSize: 9,
                        }}
                      />
                    )}
                    <Line type="monotone" dataKey="pH" stroke={NEON_CHART.green} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="DO" stroke={NEON_CHART.cyan} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="TSS" stroke={NEON_CHART.amber} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="COD" stroke={NEON_CHART.violet} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Toolbar Filter & Tombol Input */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-low" />
                <input
                  id="surfacewater-filter-loc"
                  type="text"
                  placeholder="Cari Lokasi Sungai..."
                  value={surfaceFilterLoc}
                  onChange={(e) => setSurfaceFilterLoc(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs w-full"
                />
              </div>
              <select
                id="surfacewater-filter-status"
                value={surfaceFilterStatus}
                onChange={(e) => setSurfaceFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs"
              >
                <option value="">Semua Status</option>
                <option value="Safe">Memenuhi Baku Mutu</option>
                <option value="Warning">Mendekati Batas</option>
                <option value="Exceeded">Melebihi Baku Mutu</option>
                <option value="Incomplete">Data Tidak Lengkap</option>
                <option value="Unevaluated">Belum Dievaluasi</option>
                <option value="NotApplicable">Tidak Berlaku</option>
              </select>
            </div>

            <div className="flex items-center gap-2 self-start flex-wrap">
              {canManageStd && (
                <button
                  type="button"
                  onClick={() => setShowStandardsModal(true)}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-bg-2/80 border border-border-neon hover:border-neon-cyan/50 text-text-hi font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  <Sliders className="h-4 w-4 text-neon-cyan" />
                  Kelola Baku Mutu &amp; Ambang
                </button>
              )}
              <button
                id="surfacewater-add-data-btn"
                type="button"
                onClick={() => {
                  if (showSurfaceForm) {
                    setShowSurfaceForm(false);
                    resetSurfaceWaterForm();
                  } else {
                    resetSurfaceWaterForm();
                    setShowSurfaceForm(true);
                  }
                }}
                className="neon-btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs cursor-pointer self-start"
              >
                <Plus className="h-4 w-4" />
                {showSurfaceForm ? 'Tutup Form Air Permukaan' : 'Input Sampel Air Permukaan'}
              </button>
            </div>
          </div>

          {/* Form Input / Edit Air Permukaan */}
          {showSurfaceForm && (
            <form
              id="surfacewater-data-form"
              onSubmit={handleSurfaceSubmit}
              className="glass-panel p-5 rounded-2xl text-left space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border-subtle">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan font-heading">
                  {editingSurfaceWaterId
                    ? 'Edit Data Uji Air Permukaan'
                    : 'Formulir Uji Kualitas Air Permukaan (Sungai)'}
                </h3>
                <StatusBadge
                  size="sm"
                  status={surfaceEval.overall}
                  label={surfaceEval.overall}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1 uppercase">Tanggal Sampling</label>
                  <input type="date" required value={swDate} onChange={(e) => setSwDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1 uppercase">Titik Lokasi Sungai</label>
                  <input type="text" required value={swLoc} onChange={(e) => setSwLoc(e.target.value)} placeholder="cth. Sungai Sembakung Hulu" className="w-full px-3 py-2 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1 uppercase">Kelas Air (PP 22/2021)</label>
                  <select value={swKelasAir} onChange={(e) => setSwKelasAir(e.target.value as any)} className="w-full px-3 py-2 text-xs">
                    <option value="I">Kelas I</option>
                    <option value="II">Kelas II (Default)</option>
                    <option value="III">Kelas III</option>
                    <option value="IV">Kelas IV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1 uppercase">Tipe Pemantauan</label>
                  <select value={swMonitoringType} onChange={(e) => setSwMonitoringType(e.target.value as 'Harian' | 'Bulanan')} className="w-full px-3 py-2 text-xs">
                    <option value="Harian">Harian</option>
                    <option value="Bulanan">Bulanan (Lab Terakreditasi)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1 uppercase">Petugas Pengambil Sampel</label>
                  <input type="text" required value={swOfficer} onChange={(e) => setSwOfficer(e.target.value)} placeholder="Nama Petugas" className="w-full px-3 py-2 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    pH ({formatStandardLimitDisplay(activeSurfaceStds.ph)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 7.1" value={swPhStr} onChange={(e) => setSwPhStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    TSS ({formatStandardLimitDisplay(activeSurfaceStds.tss)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 15" value={swTssStr} onChange={(e) => setSwTssStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    DO ({formatStandardLimitDisplay(activeSurfaceStds.doVal)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 6.2" value={swDoStr} onChange={(e) => setSwDoStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    BOD ({formatStandardLimitDisplay(activeSurfaceStds.bod)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 1.8" value={swBodStr} onChange={(e) => setSwBodStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    COD ({formatStandardLimitDisplay(activeSurfaceStds.cod)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 12.0" value={swCodStr} onChange={(e) => setSwCodStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    Fe ({formatStandardLimitDisplay(activeSurfaceStds.fe)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 0.15" value={swFeStr} onChange={(e) => setSwFeStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  {activeSurfaceStds.fe?.verificationStatus !== 'Terverifikasi' && (
                    <span className="text-[9px] text-neon-amber block mt-0.5">Perlu verifikasi manual</span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    Mn ({formatStandardLimitDisplay(activeSurfaceStds.mn)})
                  </label>
                  <input type="text" inputMode="decimal" required placeholder="cth: 0.04" value={swMnStr} onChange={(e) => setSwMnStr(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                  {activeSurfaceStds.mn?.verificationStatus !== 'Terverifikasi' && (
                    <span className="text-[9px] text-neon-amber block mt-0.5">Perlu verifikasi manual</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {(['ph', 'tss', 'doVal', 'bod', 'cod', 'fe', 'mn'] as const).map((pk) => {
                  const unitChoices = pk === 'ph' ? ['-'] : ['mg/L', 'g/L', 'µg/L', 'ppm'];
                  return (
                    <div key={pk} className="flex items-center gap-1.5">
                      <span className="text-[9px] text-text-low uppercase font-mono">{pk}:</span>
                      <select
                        aria-label={`Satuan ${pk} air permukaan`}
                        value={swUnitMap[pk] || '-'}
                        onChange={(e) => setSwUnitMap((prev) => ({ ...prev, [pk]: e.target.value }))}
                        className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-bg-0 border border-border-subtle"
                      >
                        {unitChoices.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {editingSurfaceWaterId && (
                <div>
                  <label className="block text-[11px] text-neon-amber font-bold mb-1 uppercase">Alasan Koreksi Data *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jelaskan alasan koreksi untuk audit trail..."
                    value={swCorrectionReason}
                    onChange={(e) => setSwCorrectionReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-bg-2/60 border border-border-subtle text-[11px] text-text-mid">
                {surfaceEval.evaluationReason}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSurfaceForm(false);
                    resetSurfaceWaterForm();
                  }}
                  className="px-4 py-2 border border-border-neon rounded-xl text-xs text-text-mid hover:text-text-hi font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!areAllSurfaceNumbersValid || !swOfficer.trim()}
                  className={`px-5 py-2 rounded-xl text-xs ${
                    !areAllSurfaceNumbersValid || !swOfficer.trim()
                      ? 'bg-bg-2 text-text-low border border-border-subtle cursor-not-allowed opacity-60 font-bold'
                      : 'neon-btn-primary cursor-pointer'
                  }`}
                >
                  {editingSurfaceWaterId ? 'Perbarui Data Air Permukaan' : 'Simpan Data Air Permukaan'}
                </button>
              </div>
            </form>
          )}

          {/* Tabel Data Air Permukaan */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-[560px]">
              {filteredSurfaceWater.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="Belum ada data pemantauan air permukaan"
                  description='Klik tombol "Input Sampel Air Permukaan" untuk mulai mencatat kualitas sungai.'
                />
              ) : (
                <table id="surfacewater-monitoring-table" className="neon-table text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider font-mono">
                      <th className="p-3.5 pl-5">Tanggal &amp; ID</th>
                      <th className="p-3.5">Lokasi Sungai &amp; Petugas</th>
                      <th className="p-3.5 text-right">pH</th>
                      <th className="p-3.5 text-right">TSS</th>
                      <th className="p-3.5 text-right">DO</th>
                      <th className="p-3.5 text-right">BOD</th>
                      <th className="p-3.5 text-right">COD</th>
                      <th className="p-3.5 text-right">Fe</th>
                      <th className="p-3.5 text-right">Mn</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center pr-5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSurfaceWater.map((item) => {
                      const feEval = evaluateSurfaceWaterParam('fe', item.fe, {
                        standards,
                        thresholds: internalThresholds,
                        sampleDate: item.date,
                        kelasAir: item.kelasAir || 'II',
                      });
                      const mnEval = evaluateSurfaceWaterParam('mn', item.mn, {
                        standards,
                        thresholds: internalThresholds,
                        sampleDate: item.date,
                        kelasAir: item.kelasAir || 'II',
                      });
                      return (
                        <tr key={item.id}>
                          <td className="p-3.5 pl-5 font-mono tabular-nums">
                            <span className="text-text-low block text-[9px]">{item.id}</span>
                            <span className="font-semibold text-text-hi">{item.date}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-semibold text-text-hi block">{item.location}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-text-mid">
                                {item.officer} • {item.monitoringType || 'Harian'}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 font-mono">
                                Kelas {item.kelasAir || 'II'}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              typeof item.ph === 'number' &&
                              (item.standardSnapshot?.ph?.min ?? activeSurfaceStds.ph?.minLimit) !== undefined &&
                              (item.standardSnapshot?.ph?.min ?? activeSurfaceStds.ph?.minLimit) !== null &&
                              (item.standardSnapshot?.ph?.max ?? activeSurfaceStds.ph?.maxLimit) !== undefined &&
                              (item.standardSnapshot?.ph?.max ?? activeSurfaceStds.ph?.maxLimit) !== null &&
                              (item.ph < (item.standardSnapshot?.ph?.min ?? activeSurfaceStds.ph?.minLimit)! ||
                                item.ph > (item.standardSnapshot?.ph?.max ?? activeSurfaceStds.ph?.maxLimit)!)
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            {formatLocaleNumberStrict(item.ph, 1, 2)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              typeof item.tss === 'number' &&
                              (item.standardSnapshot?.tss?.max ?? activeSurfaceStds.tss?.maxLimit) !== undefined &&
                              (item.standardSnapshot?.tss?.max ?? activeSurfaceStds.tss?.maxLimit) !== null &&
                              item.tss > (item.standardSnapshot?.tss?.max ?? activeSurfaceStds.tss?.maxLimit)!
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            {formatLocaleNumberStrict(item.tss, 0, 1)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              typeof item.doVal === 'number' &&
                              (item.standardSnapshot?.doVal?.min ?? activeSurfaceStds.doVal?.minLimit) !== undefined &&
                              (item.standardSnapshot?.doVal?.min ?? activeSurfaceStds.doVal?.minLimit) !== null &&
                              item.doVal < (item.standardSnapshot?.doVal?.min ?? activeSurfaceStds.doVal?.minLimit)!
                                ? 'text-neon-red'
                                : 'text-neon-cyan'
                            }`}
                          >
                            {formatLocaleNumberStrict(item.doVal, 1, 2)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              typeof item.bod === 'number' &&
                              (item.standardSnapshot?.bod?.max ?? activeSurfaceStds.bod?.maxLimit) !== undefined &&
                              (item.standardSnapshot?.bod?.max ?? activeSurfaceStds.bod?.maxLimit) !== null &&
                              item.bod > (item.standardSnapshot?.bod?.max ?? activeSurfaceStds.bod?.maxLimit)!
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            {formatLocaleNumberStrict(item.bod, 1, 2)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              typeof item.cod === 'number' &&
                              (item.standardSnapshot?.cod?.max ?? activeSurfaceStds.cod?.maxLimit) !== undefined &&
                              (item.standardSnapshot?.cod?.max ?? activeSurfaceStds.cod?.maxLimit) !== null &&
                              item.cod > (item.standardSnapshot?.cod?.max ?? activeSurfaceStds.cod?.maxLimit)!
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            {formatLocaleNumberStrict(item.cod, 1, 2)}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              feEval.verificationStatus === 'Terverifikasi' && feEval.result === 'tidak_memenuhi'
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            <span>{formatLocaleNumberStrict(item.fe, 1, 3)}</span>
                            {feEval.verificationStatus === 'Perlu verifikasi' && (
                              <span className="block text-[9px] font-sans font-semibold text-neon-amber">
                                Perlu verifikasi
                              </span>
                            )}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              mnEval.verificationStatus === 'Terverifikasi' && mnEval.result === 'tidak_memenuhi'
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            <span>{formatLocaleNumberStrict(item.mn, 1, 3)}</span>
                            {mnEval.verificationStatus === 'Perlu verifikasi' && (
                              <span className="block text-[9px] font-sans font-semibold text-neon-amber">
                                Perlu verifikasi
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center" title={item.evaluationReason || undefined}>
                            <StatusBadge status={item.evaluationStatus || item.status || 'Menunggu evaluasi server'} />
                            {standards.length > 0 && (() => {
                              const liveEval = getLiveEvaluation('air_permukaan', item, standards, internalThresholds);
                              if (!liveEval.isStale) return null;
                              return (
                                <span
                                  className="block text-[9px] text-neon-amber font-semibold mt-0.5 max-w-[190px] truncate mx-auto"
                                  title={`Evaluasi tersimpan: ${liveEval.storedConclusion} → Evaluasi baku mutu saat ini: ${liveEval.live.overall}`}
                                >
                                  Baku mutu diperbarui · Live: {liveEval.live.overall}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-3.5 text-center pr-5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditSurfaceWater(item)}
                                className="p-1.5 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg cursor-pointer transition-colors"
                                title="Edit record"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirm({
                                    id: item.id,
                                    type: 'surfacewater',
                                    message: `Hapus data pengamatan air permukaan ${item.id}?`,
                                  });
                                }}
                                className="p-1.5 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 border border-neon-red/30 rounded-lg cursor-pointer transition-colors"
                                title="Hapus record"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rainfall' && (
        <div id="rainfall-monitoring-panel" className="space-y-6">
          {/* Rainfall parameters summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="neon-card p-4 flex items-center gap-4 text-left">
              <div className="p-3 bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded-xl">
                <CloudRain className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Total Akumulasi</span>
                <p className="text-xl font-bold font-mono tabular-nums text-text-hi mt-1">
                  {rainfall.reduce((acc, x) => acc + x.rainfall, 0).toFixed(1)} mm
                </p>
              </div>
            </div>

            <div className="neon-card p-4 flex items-center gap-4 text-left">
              <div className="p-3 bg-neon-violet/10 border border-neon-violet/30 text-neon-violet rounded-xl">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">
                  Stasiun Pengamatan
                </span>
                <p className="text-xl font-bold font-mono tabular-nums text-text-hi mt-1">
                  {Array.from(new Set(rainfall.map((x) => x.station))).length} Pos Area
                </p>
              </div>
            </div>

            <div className="neon-card p-4 flex items-center gap-4 text-left">
              <div className="p-3 bg-neon-amber/10 border border-neon-amber/30 text-neon-amber rounded-xl">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">
                  Batas Badai Kritis
                </span>
                <p className="text-xl font-bold font-mono tabular-nums text-neon-amber mt-1">&gt; 50 mm / Hari</p>
              </div>
            </div>
          </div>

          {/* Action buttons + Filters rain */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-low" />
                <input
                  id="rain-filter-station"
                  type="text"
                  placeholder="Cari Pos Meter..."
                  value={rainFilterStation}
                  onChange={(e) => setRainFilterStation(e.target.value)}
                  className="pl-9 pr-4 py-2 text-xs w-full"
                />
              </div>
            </div>

            <button
              id="rain-add-data-btn"
              type="button"
              onClick={() => setShowRainForm(!showRainForm)}
              className="neon-btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs cursor-pointer self-start"
            >
              <Plus className="h-4 w-4" />
              Input Pengamatan Curah Hujan
            </button>
          </div>

          {/* Collapsible rain form */}
          {showRainForm && (
            <form
              id="rain-data-form"
              onSubmit={handleRainSubmit}
              className="glass-panel p-5 rounded-2xl text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-neon-cyan mb-4 pb-2 border-b border-border-subtle font-heading">
                {editingRainId
                  ? 'Formulir Edit Pencatatan Curah Hujan Harian'
                  : 'Formulir Pencatatan Curah Hujan Harian'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Tanggal Hujan</label>
                  <input id="rain-field-date" type="date" required value={rDate} onChange={(e) => setRDate(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Jam Mulai Hujan</label>
                  <input id="rain-field-start" type="time" required value={rStart} onChange={(e) => setRStart(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Jam Selesai Hujan</label>
                  <input id="rain-field-end" type="time" required value={rEnd} onChange={(e) => setREnd(e.target.value)} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Stasiun Pos Pengamatan
                  </label>
                  <input
                    id="rain-field-station"
                    type="text"
                    required
                    placeholder="Contoh: Stasiun Pit West (WS-01)"
                    value={rStation}
                    onChange={(e) => setRStation(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">Alat Pengukur</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      id="rain-type-manual"
                      type="button"
                      onClick={() => setRType('Manual')}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        rType === 'Manual'
                          ? 'bg-neon-cyan/15 border-neon-cyan text-neon-cyan'
                          : 'bg-bg-0 border-border-subtle text-text-mid'
                      }`}
                    >
                      Gauge Manual
                    </button>
                    <button
                      id="rain-type-auto"
                      type="button"
                      onClick={() => setRType('Automatic')}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        rType === 'Automatic'
                          ? 'bg-neon-cyan/15 border-neon-cyan text-neon-cyan'
                          : 'bg-bg-0 border-border-subtle text-text-mid'
                      }`}
                    >
                      Automatic
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Volume Curah Hujan (mm)
                  </label>
                  <input
                    id="rain-field-volume"
                    type="text"
                    inputMode="decimal"
                    placeholder="cth: 25.0"
                    required
                    value={rRainfallStr}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setRRainfallStr(raw);
                      const parsed = parseStrictNumber(raw);
                      if (parsed !== null && parsed >= 0) {
                        setRWeather(getBMKGWeatherClass(parsed));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Klasifikasi Cuaca (Otomatis BMKG)
                  </label>
                  <select id="rain-field-weather" value={rWeather} disabled className="w-full px-3 py-2 text-xs opacity-70 cursor-not-allowed font-semibold">
                    <option value="Clear">Clear (Cerah / 0 mm)</option>
                    <option value="Cloudy">Cloudy (Mendung / &lt; 5 mm)</option>
                    <option value="Light Rain">Light Rain (Hujan Ringan: 5 - 20 mm)</option>
                    <option value="Heavy Rain">Heavy Rain (Hujan Sedang/Lebat: 20 - 50 mm)</option>
                    <option value="Storm">Storm (Badai/Sangat Lebat: &gt; 50 mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1.5 uppercase">
                    Catatan Operasional Lapangan
                  </label>
                  <input
                    id="rain-field-notes"
                    type="text"
                    placeholder="Status pompa / limpahan drainase"
                    value={rNotes}
                    onChange={(e) => setRNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-border-subtle">
                <button
                  id="rain-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowRainForm(false);
                    setEditingRainId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi cursor-pointer"
                >
                  Batal
                </button>
                <button id="rain-form-submit" type="submit" className="neon-btn-primary px-5 py-2.5 text-xs rounded-xl cursor-pointer">
                  {editingRainId ? 'Update Records' : 'Simpan Records'}
                </button>
              </div>
            </form>
          )}

          {/* Rain logs table */}
          <div className="glass-panel rounded-2xl overflow-hidden text-left">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-mid font-heading">
                Log Pengukuran Curah Hujan (Rain Gauge Records)
              </h4>
            </div>
            <div className="overflow-x-auto max-h-[560px]">
              {filteredRain.length === 0 ? (
                <EmptyState
                  icon={CloudRain}
                  title="Tidak ada log pengamatan curah hujan"
                  description="Catat curah hujan harian dari pos hujan manual maupun automatic weather station."
                />
              ) : (
                <table className="neon-table text-left">
                  <thead>
                    <tr className="text-[10px] font-mono tracking-wider uppercase">
                      <th className="p-3.5 pl-5">No / Tgl</th>
                      <th className="p-3.5">Nama Stasiun</th>
                      <th className="p-3.5 pr-2.5">Durasi Hujan</th>
                      <th className="p-3.5 text-center">Instrumen</th>
                      <th className="p-3.5 text-right">Curah Hujan (mm)</th>
                      <th className="p-3.5 text-right">Intensitas (mm/jam)</th>
                      <th className="p-3.5 text-center">Cuaca</th>
                      <th className="p-3.5 text-left pl-5">Catatan / Hambatan Tambang</th>
                      <th className="p-3.5 text-center pr-5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredRain.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3.5 pl-5 font-mono tabular-nums">
                          <span className="text-text-low block text-[9px]">{item.id}</span>
                          <span className="font-semibold text-text-hi">{item.date}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-text-hi">{item.station}</span>
                        </td>
                        <td className="p-3.5 pr-2.5">
                          <span className="font-mono text-text-hi block tabular-nums">
                            {item.startTime} - {item.endTime}
                          </span>
                          <span className="text-[10px] text-text-mid font-mono">{item.duration} Menit</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-bg-0 text-text-mid border border-border-neon font-mono font-bold uppercase">
                            {item.gaugeType}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-bold text-text-hi font-mono tabular-nums">
                          {item.rainfall} mm
                        </td>
                        <td className="p-3.5 text-right font-bold font-mono tabular-nums text-neon-cyan">
                          {item.intensity}
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <StatusBadge
                            status={
                              item.weather === 'Storm'
                                ? 'Tidak Memenuhi'
                                : item.weather === 'Heavy Rain'
                                ? 'Mendekati'
                                : item.weather === 'Light Rain'
                                ? 'Dipantau'
                                : 'Memenuhi'
                            }
                            label={item.weather}
                          />
                        </td>
                        <td className="p-3.5 text-left pl-5 text-text-mid truncate max-w-[200px]" title={item.notes}>
                          {item.notes || '-'}
                        </td>
                        <td className="p-3.5 text-center pr-5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`rain-edit-btn-${item.id}`}
                              type="button"
                              onClick={() => startEditRain(item)}
                              className="p-1.5 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 border border-neon-cyan/30 rounded-lg cursor-pointer transition-colors"
                              title="Edit record"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              id={`rain-delete-btn-${item.id}`}
                              type="button"
                              onClick={() => {
                                setDeleteConfirm({
                                  id: item.id,
                                  type: 'rain',
                                  message: `Hapus data hujan ${item.id}?`,
                                });
                              }}
                              className="p-1.5 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 border border-neon-red/30 rounded-lg cursor-pointer transition-colors"
                              title="Hapus record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Master Titik Sampling Air Limbah */}
      <WqLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        locations={locations}
        canManage={isSuperintendent(userProfile)}
      />

      {/* Modal Kelola Baku Mutu Lingkungan & Ambang Internal */}
      <StandardsConfigModal
        isOpen={showStandardsModal}
        onClose={() => setShowStandardsModal(false)}
        standards={standards}
        internalThresholds={internalThresholds}
        canManage={canManageStd}
        canDelete={isAdmin(userProfile)}
      />

      {/* Modal Lazy Preview Foto Evidence Sampling */}
      {photoPreviewItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-panel rounded-2xl w-full max-w-lg overflow-hidden text-left animate-slide-up">
              <div className="px-5 py-3.5 border-b border-border-subtle flex items-center justify-between bg-bg-2/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-hi font-heading">
                      Evidence Foto Sampling: {photoPreviewItem.location}
                    </h3>
                    <p className="text-[10px] text-text-mid font-mono">
                      {photoPreviewItem.date}{' '}
                      {photoPreviewItem.sampleTime ? `• ${photoPreviewItem.sampleTime} WITA` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreviewItem(null);
                    setPhotoPreviewDoc(null);
                  }}
                  className="p-1 rounded-lg text-text-mid hover:text-text-hi cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {isLoadingLazyPhoto ? (
                  <div className="h-64 rounded-xl bg-bg-2 flex flex-col items-center justify-center gap-2 text-text-mid">
                    <Loader2 className="w-6 h-6 animate-spin text-neon-cyan" />
                    <span className="text-xs">Memuat foto resolusi penuh dari cloud...</span>
                  </div>
                ) : photoPreviewDoc?.dataUrl ? (
                  <div className="space-y-3">
                    <div className="w-full max-h-[380px] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-border-neon">
                      <img
                        src={photoPreviewDoc.dataUrl}
                        alt="Evidence Sampling"
                        className="max-h-[380px] w-auto object-contain"
                      />
                    </div>
                    <div className="bg-bg-2/70 p-3 rounded-xl border border-border-subtle grid grid-cols-2 gap-2 text-[11px] text-text-mid">
                      <div>
                        <span className="text-text-low block text-[9px] uppercase font-bold">Petugas</span>
                        <span className="font-semibold text-text-hi">{photoPreviewItem.officer}</span>
                      </div>
                      <div>
                        <span className="text-text-low block text-[9px] uppercase font-bold">Cuaca</span>
                        <span>{photoPreviewItem.weather || 'Tidak dicatat'}</span>
                      </div>
                      <div>
                        <span className="text-text-low block text-[9px] uppercase font-bold">Resolusi Asli</span>
                        <span className="font-mono">
                          {photoPreviewDoc.width} × {photoPreviewDoc.height} px
                        </span>
                      </div>
                      <div>
                        <span className="text-text-low block text-[9px] uppercase font-bold">Ukuran Data</span>
                        <span className="font-mono">{Math.round(photoPreviewDoc.dataUrl.length / 1024)} KB</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-text-low text-xs">
                    Foto evidence sampling tidak ditemukan atau telah dihapus.
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-border-subtle bg-bg-2/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreviewItem(null);
                    setPhotoPreviewDoc(null);
                  }}
                  className="px-4 py-1.5 bg-bg-0 border border-border-neon hover:border-neon-cyan text-text-hi font-medium text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {deleteConfirm && (
        <ModalPortal>
          <div
            id="delete-confirm-modal-mon"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          >
            <div className="glass-panel rounded-3xl p-6 max-w-sm w-full text-text-hi text-left">
              <h3 className="text-sm font-bold text-text-hi flex items-center gap-2 font-heading">
                <span className="p-1.5 rounded-lg bg-neon-red/10 text-neon-red border border-neon-red/30">
                  <Trash2 size={16} />
                </span>
                Konfirmasi Hapus
              </h3>
              <p className="text-xs text-text-mid mt-3 leading-relaxed">{deleteConfirm.message}</p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-bg-2 border border-border-neon text-text-mid hover:text-text-hi font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { id, type } = deleteConfirm;
                    setDeleteConfirm(null);
                    try {
                      if (type === 'water') {
                        await onDeleteWastewater(id);
                      } else if (type === 'surfacewater') {
                        await onDeleteSurfaceWater(id);
                      } else {
                        await onDeleteRainfall(id);
                      }
                    } catch (err: any) {
                      triggerToast('Gagal menghapus data: ' + err.message, 'error');
                    }
                  }}
                  className="neon-btn-danger px-3.5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

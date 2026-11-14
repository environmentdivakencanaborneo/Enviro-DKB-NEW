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
  evaluateWastewaterStatus,
  evaluateSurfaceWaterStatus,
  evaluateSurfaceWaterParam,
  resolveActiveStandards,
  WASTEWATER_BASIS_LABEL,
  SURFACE_WATER_BASIS_LABEL,
  DEFAULT_INTERNAL_THRESHOLDS,
} from '../data/regulations';
import { todayLocalISO } from '../utils/dateUtils';
import { wqLocationService } from '../services/wqLocationService';
import { waterQualityService } from '../services/dbService';
import { isSuperintendent, isAdmin } from '../services/permissionService';
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
  
  // Surface Form Fields
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
  const [swPh, setSwPh] = useState(7.0);
  const [swTss, setSwTss] = useState(15);
  const [swDoVal, setSwDoVal] = useState(6.2);
  const [swBod, setSwBod] = useState(1.8);
  const [swCod, setSwCod] = useState(12.0);
  const [swFe, setSwFe] = useState(0.15);
  const [swMn, setSwMn] = useState(0.04);
  const [swKelasAir, setSwKelasAir] = useState<'I' | 'II' | 'III' | 'IV'>('II');
  const [swMonitoringType, setSwMonitoringType] = useState<'Harian' | 'Bulanan'>('Harian');

  const dynamicSurfaceStatus = evaluateSurfaceWaterStatus(
    swPh,
    swTss,
    swDoVal,
    swBod,
    swCod,
    swFe,
    swMn,
    {
      standards,
      thresholds: internalThresholds,
      sampleDate: swDate,
      kelasAir: swKelasAir,
    }
  );

  // RAINFALL STATE
  const [showRainForm, setShowRainForm] = useState(false);
  const [rainFilterStation, setRainFilterStation] = useState('');
  
  // Rain Form Fields
  const [rDate, setRDate] = useState(todayLocalISO());
  const [rStart, setRStart] = useState('14:00');
  const [rEnd, setREnd] = useState('15:30');
  const [rStation, setRStation] = useState('Stasiun Pit West / WS-01');
  const [rType, setRType] = useState<'Manual' | 'Automatic'>('Automatic');
  const [rRainfall, setRRainfall] = useState(25.0);
  const [rWeather, setRWeather] = useState<'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm'>('Heavy Rain');
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

  const phMinLimit = activeWaterStds.ph?.minLimit ?? 6.0;
  const phMaxLimit = activeWaterStds.ph?.maxLimit ?? 9.0;
  const tssMaxLimit = activeWaterStds.tss?.maxLimit ?? 300;
  const feMaxLimit = activeWaterStds.fe?.maxLimit ?? 7.0;
  const mnMaxLimit = activeWaterStds.mn?.maxLimit ?? 4.0;

  const phLimitRange = `${phMinLimit.toFixed(1)} - ${phMaxLimit.toFixed(1)}`;
  const tssLimit = `${tssMaxLimit} mg/L`;
  const debitLimit = "Bebas / Pantau";
  const feLimit = `${feMaxLimit.toFixed(1)} mg/L`;
  const mnLimit = `${mnMaxLimit.toFixed(1)} mg/L`;

  // Decimal parsing helper: accepts comma and dot, verifies finite number
  const parseDecimal = (val: string): number | null => {
    if (!val || val.trim() === '') return null;
    const normalized = val.trim().replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  };

  const wPhNum = parseDecimal(wPhStr);
  const wTssNum = parseDecimal(wTssStr);
  const wDebitNum = parseDecimal(wDebitStr);
  const wFeNum = parseDecimal(wFeStr);
  const wMnNum = parseDecimal(wMnStr);

  const areAllNumbersFilledAndFinite =
    wPhNum !== null && wPhNum >= 0 && wPhNum <= 14 &&
    wTssNum !== null && wTssNum >= 0 &&
    wDebitNum !== null && wDebitNum >= 0 &&
    wFeNum !== null && wFeNum >= 0 &&
    wMnNum !== null && wMnNum >= 0;

  // Water dynamic rating calculator (uses parsed values + active standards + thresholds)
  const dynamicWaterStatus = evaluateWastewaterStatus(
    wPhNum ?? 7.0,
    wTssNum ?? 0,
    wDebitNum ?? 0,
    wFeNum ?? 0,
    wMnNum ?? 0,
    {
      standards,
      thresholds: internalThresholds,
      locationCode: wLocationCode,
      sampleDate: wDate,
    }
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
  const dailyTotal = dailySamples.length;
  const dailyComplianceRate = dailyTotal > 0 ? Math.round(((dailySafeCount + dailyWarningCount) / dailyTotal) * 100) : 0;

  // 2. Monthly Statistics (Selected active month)
  const monthlySamples = activeWaterMonth ? wastewater.filter(w => w.date && w.date.startsWith(activeWaterMonth)) : [];
  const monthlySafeCount = monthlySamples.filter(w => w.status === 'Safe').length;
  const monthlyWarningCount = monthlySamples.filter(w => w.status === 'Warning').length;
  const monthlyExceededCount = monthlySamples.filter(w => w.status === 'Exceeded').length;
  const monthlyTotal = monthlySamples.length;
  const monthlyComplianceRate = monthlyTotal > 0 ? Math.round(((monthlySafeCount + monthlyWarningCount) / monthlyTotal) * 100) : 0;

  const monthlyAvgPh = monthlyTotal > 0 ? Number((monthlySamples.reduce((acc, w) => acc + w.ph, 0) / monthlyTotal).toFixed(2)) : 0;
  const monthlyAvgTss = monthlyTotal > 0 ? Math.round(monthlySamples.reduce((acc, w) => acc + w.tss, 0) / monthlyTotal) : 0;
  const monthlyAvgDebit = monthlyTotal > 0 ? Number((monthlySamples.reduce((acc, w) => acc + (w.debit ?? 0), 0) / monthlyTotal).toFixed(3)) : 0;
  const monthlyAvgFe = monthlyTotal > 0 ? Number((monthlySamples.reduce((acc, w) => acc + w.fe, 0) / monthlyTotal).toFixed(2)) : 0;
  const monthlyAvgMn = monthlyTotal > 0 ? Number((monthlySamples.reduce((acc, w) => acc + w.mn, 0) / monthlyTotal).toFixed(2)) : 0;

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

    setWPhStr(String(item.ph));
    setWTssStr(String(item.tss));
    setWDebitStr(item.debit !== undefined ? String(item.debit) : '');
    setWFeStr(String(item.fe));
    setWMnStr(String(item.mn));
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
    setWMonitoringType('Harian');
    setWPhoto(null);
    setEditingWaterId(null);
  };

  const startEditSurfaceWater = (item: SurfaceWaterData) => {
    setEditingSurfaceWaterId(item.id);
    setSwDate(item.date);
    setSwLoc(item.location);
    setSwOfficer(item.officer);
    setSwPh(item.ph);
    setSwTss(item.tss);
    setSwDoVal(item.doVal);
    setSwBod(item.bod);
    setSwCod(item.cod);
    setSwFe(item.fe);
    setSwMn(item.mn);
    setSwKelasAir(item.kelasAir || 'II');
    setSwMonitoringType(item.monitoringType || 'Harian');
    setShowSurfaceForm(true);
  };

  const handleSurfaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swOfficer) {
      alert("Masukkan nama petugas sampling.");
      return;
    }
    
    const payload = {
      date: swDate,
      location: swLoc,
      officer: swOfficer,
      ph: Number(swPh),
      tss: Number(swTss),
      doVal: Number(swDoVal),
      bod: Number(swBod),
      cod: Number(swCod),
      fe: Number(swFe),
      mn: Number(swMn),
      kelasAir: swKelasAir,
      monitoringType: swMonitoringType
    };

    if (editingSurfaceWaterId) {
      if (onUpdateSurfaceWater) {
        onUpdateSurfaceWater(editingSurfaceWaterId, payload);
      }
      setEditingSurfaceWaterId(null);
    } else {
      onAddSurfaceWater(payload);
    }

    // Reset fields
    setSwPh(7.0);
    setSwTss(15);
    setSwDoVal(6.2);
    setSwBod(1.8);
    setSwCod(12.0);
    setSwFe(0.15);
    setSwMn(0.04);
    setSwKelasAir('II');
    setSwMonitoringType('Harian');
    setShowSurfaceForm(false);
  };

  const startEditRain = (item: RainfallData) => {
    setEditingRainId(item.id);
    setRDate(item.date);
    setRStart(item.startTime);
    setREnd(item.endTime);
    setRStation(item.station);
    setRType(item.gaugeType);
    setRRainfall(item.rainfall);
    setRWeather(item.weather);
    setRNotes(item.notes || '');
    setShowRainForm(true);
  };

  // Submit water
  const handleWaterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wOfficer.trim()) {
      alert("Masukkan nama petugas sampling.");
      return;
    }

    if (!areAllNumbersFilledAndFinite) {
      alert("Semua parameter angka (pH, TSS, Debit, Fe, Mn) wajib diisi dengan nilai numerik valid.");
      return;
    }

    if (isDuplicateDaily) {
      alert(`Data harian titik ${wLocationCode} tanggal ${formatIndoDate(wDate)} sudah ada. Edit data yang ada.`);
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
      monitoringType: wMonitoringType,
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

  // Submit water formula
  const handleRainSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate duration in minutes
    const [sH, sM] = rStart.split(':').map(Number);
    const [eH, eM] = rEnd.split(':').map(Number);
    let duration = (eH * 60 + eM) - (sH * 60 + sM);
    if (duration <= 0) duration = 60; // fallback

    // Calculate intensity: rainfall (mm) / (duration in hours)
    const intensity = Number((rRainfall / (duration / 60)).toFixed(2));

    const payload = {
      date: rDate,
      startTime: rStart,
      endTime: rEnd,
      duration,
      station: rStation,
      gaugeType: rType,
      rainfall: Number(rRainfall),
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
    setRRainfall(25.0);
    setRWeather('Heavy Rain');
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
  const dailySurfaceTotal = dailySurfaceSamples.length;
  const dailySurfaceComplianceRate = dailySurfaceTotal > 0 ? Math.round(((dailySurfaceSafeCount + dailySurfaceWarningCount) / dailySurfaceTotal) * 100) : 0;

  // 2. Monthly Statistics (Selected active month)
  const monthlySurfaceSamples = activeSurfaceMonth ? surfaceWater.filter(s => s.date && s.date.startsWith(activeSurfaceMonth)) : [];
  const monthlySurfaceSafeCount = monthlySurfaceSamples.filter(s => s.status === 'Safe').length;
  const monthlySurfaceWarningCount = monthlySurfaceSamples.filter(s => s.status === 'Warning').length;
  const monthlySurfaceExceededCount = monthlySurfaceSamples.filter(s => s.status === 'Exceeded').length;
  const monthlySurfaceTotal = monthlySurfaceSamples.length;
  const monthlySurfaceComplianceRate = monthlySurfaceTotal > 0 ? Math.round(((monthlySurfaceSafeCount + monthlySurfaceWarningCount) / monthlySurfaceTotal) * 100) : 0;

  const monthlySurfaceAvgPh = monthlySurfaceTotal > 0 ? Number((monthlySurfaceSamples.reduce((acc, s) => acc + s.ph, 0) / monthlySurfaceTotal).toFixed(2)) : 0;
  const monthlySurfaceAvgTss = monthlySurfaceTotal > 0 ? Math.round(monthlySurfaceSamples.reduce((acc, s) => acc + s.tss, 0) / monthlySurfaceTotal) : 0;
  const monthlySurfaceAvgDo = monthlySurfaceTotal > 0 ? Number((monthlySurfaceSamples.reduce((acc, s) => acc + s.doVal, 0) / monthlySurfaceTotal).toFixed(2)) : 0;
  const monthlySurfaceAvgBod = monthlySurfaceTotal > 0 ? Number((monthlySurfaceSamples.reduce((acc, s) => acc + s.bod, 0) / monthlySurfaceTotal).toFixed(2)) : 0;
  const monthlySurfaceAvgCod = monthlySurfaceTotal > 0 ? Number((monthlySurfaceSamples.reduce((acc, s) => acc + s.cod, 0) / monthlySurfaceTotal).toFixed(2)) : 0;
  const monthlySurfaceAvgFe = monthlySurfaceTotal > 0 ? Number((monthlySurfaceSamples.reduce((acc, s) => acc + s.fe, 0) / monthlySurfaceTotal).toFixed(2)) : 0;
  const monthlySurfaceAvgMn = monthlySurfaceTotal > 0 ? Number((monthlySurfaceSamples.reduce((acc, s) => acc + s.mn, 0) / monthlySurfaceTotal).toFixed(2)) : 0;

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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 glass-panel p-4 rounded-2xl">
            <div className="text-center md:border-r border-border-subtle py-1.5 last:border-0">
              <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Baku pH</span>
              <p className="text-sm font-bold font-mono text-neon-cyan mt-1 tabular-nums">{phLimitRange}</p>
            </div>
            <div className="text-center md:border-r border-border-subtle py-1.5 last:border-0">
              <span className="text-[10px] text-text-mid uppercase tracking-widest font-mono">Baku TSS</span>
              <p className="text-sm font-bold font-mono text-neon-cyan mt-1 tabular-nums">{tssLimit}</p>
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
                        dailyComplianceRate >= 90
                          ? NEON_CHART.green
                          : dailyComplianceRate >= 70
                          ? NEON_CHART.amber
                          : NEON_CHART.red,
                    }}
                  >
                    <div className="text-center">
                      <span className="text-sm font-extrabold font-mono text-text-hi tabular-nums">
                        {dailyComplianceRate}%
                      </span>
                      <span className="block text-[8px] uppercase tracking-wider text-text-low font-mono mt-0.5">
                        Kepatuhan
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs text-text-mid">
                      <span>Total Titik Dipantau:</span>
                      <strong className="text-text-hi font-mono tabular-nums">{dailyTotal} Lokasi</strong>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                      <div className="bg-neon-green/10 border border-neon-green/30 rounded-xl py-1.5">
                        <span className="text-neon-green block font-bold text-xs tabular-nums">{dailySafeCount}</span>
                        <span className="text-text-mid block text-[8px] uppercase tracking-wide">Lolos</span>
                      </div>
                      <div className="bg-neon-amber/10 border border-neon-amber/30 rounded-xl py-1.5">
                        <span className="text-neon-amber block font-bold text-xs tabular-nums">{dailyWarningCount}</span>
                        <span className="text-text-mid block text-[8px] uppercase tracking-wide">Warning</span>
                      </div>
                      <div className="bg-neon-red/10 border border-neon-red/30 rounded-xl py-1.5">
                        <span className="text-neon-red block font-bold text-xs tabular-nums">{dailyExceededCount}</span>
                        <span className="text-text-mid block text-[8px] uppercase tracking-wide">Exceeded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 px-3 py-2.5 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2.5 ${
                  dailyExceededCount > 0
                    ? 'bg-neon-red/10 border-neon-red/35 text-neon-red'
                    : dailyWarningCount > 0
                    ? 'bg-neon-amber/10 border-neon-amber/35 text-neon-amber'
                    : 'bg-neon-green/10 border-neon-green/35 text-neon-green'
                }`}
              >
                {dailyExceededCount > 0 ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-neon-red shrink-0" />
                    <span>
                      <strong>Perhatian:</strong> Terdapat {dailyExceededCount} titik sampling yang melebihi standar mutu lingkungan tambang hari ini!
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
                      <strong>Aman:</strong> Seluruh outlet air limbah tambang teruji hari ini berada dalam rentang baku aman sesuai peraturan pemerintah.
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
                      {monthlyComplianceRate}%
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-text-mid font-mono mt-0.5">Kepatuhan</span>
                    <span className="text-[9px] text-text-low font-mono mt-1 tabular-nums">{monthlyTotal} Pengujian</span>
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
                            monthlyAvgPh < phMinLimit || monthlyAvgPh > phMaxLimit ? 'text-neon-red' : 'text-text-hi'
                          }`}
                        >
                          {monthlyAvgPh}
                        </strong>
                      </div>
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata TSS</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgTss > tssMaxLimit ? 'text-neon-red' : 'text-text-hi'}`}>
                          {monthlyAvgTss} <span className="text-[8px] font-normal text-text-low">mg/L</span>
                        </strong>
                      </div>
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata Fe</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgFe > feMaxLimit ? 'text-neon-red' : 'text-text-hi'}`}>
                          {monthlyAvgFe} <span className="text-[8px] font-normal text-text-low">mg/L</span>
                        </strong>
                      </div>
                      <div className="bg-bg-2/60 border border-border-subtle rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-text-mid text-[8px] uppercase">Rerata Mn</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgMn > mnMaxLimit ? 'text-neon-red' : 'text-text-hi'}`}>
                          {monthlyAvgMn} <span className="text-[8px] font-normal text-text-low">mg/L</span>
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-text-mid border-t border-border-subtle pt-2.5 gap-2">
                <span>Periode Analisis: {formatIndoMonth(activeWaterMonth)}</span>
                <StatusBadge
                  status={monthlyComplianceRate >= 95 ? 'Memenuhi' : monthlyComplianceRate >= 80 ? 'Mendekati' : 'Tidak Memenuhi'}
                  label={
                    monthlyComplianceRate >= 95
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
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: &le; {tssLimit}</span>
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
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: &le; {feLimit}</span>
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
                    <span className="text-[9px] text-text-low mt-0.5 block font-mono">Baku: &le; {mnLimit}</span>
                  </div>
                </div>
              </div>

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
              <div className="p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 bg-bg-2/60 border-border-subtle">
                <p className="text-xs text-text-mid">Verifikasi baku mutu otomatis ({WASTEWATER_BASIS_LABEL}) :</p>
                <StatusBadge
                  size="sm"
                  status={!areAllNumbersFilledAndFinite ? 'Perlu Verifikasi' : dynamicWaterStatus}
                  label={
                    !areAllNumbersFilledAndFinite
                      ? 'Menunggu Input Lengkap'
                      : dynamicWaterStatus === 'Safe'
                      ? 'Memenuhi Baku Mutu'
                      : dynamicWaterStatus === 'Warning'
                      ? 'Mendekati Batas Parameter'
                      : 'Melebihi Baku Mutu'
                  }
                />
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
                            item.ph < (item.standardSnapshot?.ph?.min ?? phMinLimit) ||
                            item.ph > (item.standardSnapshot?.ph?.max ?? phMaxLimit)
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {item.ph}
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            item.tss > (item.standardSnapshot?.tss?.max ?? tssMaxLimit)
                              ? 'text-neon-red'
                              : 'text-text-hi'
                          }`}
                        >
                          {item.tss}
                        </td>
                        <td className="p-3.5 text-right font-bold font-mono tabular-nums text-neon-cyan">
                          {(item.debit ?? 0).toFixed(3)}
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            item.fe > (item.standardSnapshot?.fe?.max ?? feMaxLimit) ? 'text-neon-red' : 'text-text-hi'
                          }`}
                        >
                          {item.fe}
                        </td>
                        <td
                          className={`p-3.5 text-right font-bold font-mono tabular-nums ${
                            item.mn > (item.standardSnapshot?.mn?.max ?? mnMaxLimit) ? 'text-neon-red' : 'text-text-hi'
                          }`}
                        >
                          {item.mn}
                        </td>
                        <td className="p-3.5 text-center">
                          <StatusBadge status={item.status} />
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
                  {(activeSurfaceStds.ph?.minLimit ?? 6.0).toFixed(1)} – {(activeSurfaceStds.ph?.maxLimit ?? 9.0).toFixed(1)}
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgPh}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">TSS Max</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {activeSurfaceStds.tss?.maxLimit ?? 50} mg/L
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgTss}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">DO Min</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  ≥ {(activeSurfaceStds.doVal?.minLimit ?? 4.0).toFixed(1)} mg/L
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgDo}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">BOD Max</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {(activeSurfaceStds.bod?.maxLimit ?? 3.0).toFixed(1)} mg/L
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgBod}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">COD Max</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {activeSurfaceStds.cod?.maxLimit ?? 25} mg/L
                </p>
                <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgCod}</p>
              </div>
              <div className="text-center border-r border-border-subtle last:border-0 py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">Fe Max</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {activeSurfaceStds.fe?.maxLimit ?? 0.3} mg/L
                </p>
                {activeSurfaceStds.fe?.verificationStatus !== 'Terverifikasi' ? (
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-neon-amber/15 text-neon-amber border border-neon-amber/30 font-semibold mt-0.5">
                    Informatif (Perlu verifikasi)
                  </span>
                ) : (
                  <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgFe}</p>
                )}
              </div>
              <div className="text-center py-1">
                <span className="text-[10px] text-text-mid uppercase font-mono">Mn Max</span>
                <p className="text-xs font-bold font-mono text-text-hi mt-0.5 tabular-nums">
                  {activeSurfaceStds.mn?.maxLimit ?? 0.1} mg/L
                </p>
                {activeSurfaceStds.mn?.verificationStatus !== 'Terverifikasi' ? (
                  <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-neon-amber/15 text-neon-amber border border-neon-amber/30 font-semibold mt-0.5">
                    Informatif (Perlu verifikasi)
                  </span>
                ) : (
                  <p className="text-[10px] text-neon-cyan font-mono tabular-nums">Avg: {monthlySurfaceAvgMn}</p>
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
                  {monthlySurfaceComplianceRate}%
                </p>
                <p className="text-[11px] text-text-mid mt-0.5 font-mono">
                  {monthlySurfaceSafeCount} Aman • {monthlySurfaceWarningCount} Warning • {monthlySurfaceExceededCount} Exceeded
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
                  {monthlySurfaceAvgDo} / {monthlySurfaceAvgBod}
                </p>
                <p className="text-[11px] text-text-mid mt-0.5 font-mono">mg/L (Target DO ≥ 4, BOD ≤ 3)</p>
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
                    <ReferenceLine
                      y={50}
                      stroke={NEON_CHART.red}
                      strokeDasharray="4 4"
                      label={{ value: 'Max TSS 50', position: 'insideTopRight', fill: NEON_CHART.red, fontSize: 9 }}
                    />
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
                <option value="Safe">Lolos / Safe</option>
                <option value="Warning">Warning</option>
                <option value="Exceeded">Melampaui Baku Mutu</option>
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
                    setEditingSurfaceWaterId(null);
                  } else {
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
                  status={dynamicSurfaceStatus}
                  label={
                    dynamicSurfaceStatus === 'Safe'
                      ? 'MEMENUHI BAKU MUTU'
                      : dynamicSurfaceStatus === 'Warning'
                      ? 'MENDEKATI BATAS'
                      : 'MELAMPAUI BAKU MUTU'
                  }
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
                  <label className="block text-[11px] text-text-mid font-bold mb-1">pH (6-9)</label>
                  <input type="number" step="0.01" required value={swPh} onChange={(e) => setSwPh(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    TSS (≤{activeSurfaceStds.tss?.maxLimit ?? 50})
                  </label>
                  <input type="number" step="0.1" required value={swTss} onChange={(e) => setSwTss(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    DO (≥{activeSurfaceStds.doVal?.minLimit ?? 4})
                  </label>
                  <input type="number" step="0.01" required value={swDoVal} onChange={(e) => setSwDoVal(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    BOD (≤{activeSurfaceStds.bod?.maxLimit ?? 3})
                  </label>
                  <input type="number" step="0.01" required value={swBod} onChange={(e) => setSwBod(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    COD (≤{activeSurfaceStds.cod?.maxLimit ?? 25})
                  </label>
                  <input type="number" step="0.1" required value={swCod} onChange={(e) => setSwCod(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    Fe (≤{activeSurfaceStds.fe?.maxLimit ?? 0.3})
                  </label>
                  <input type="number" step="0.001" required value={swFe} onChange={(e) => setSwFe(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  {activeSurfaceStds.fe?.verificationStatus !== 'Terverifikasi' && (
                    <span className="text-[9px] text-neon-amber block mt-0.5">Informatif (Perlu verifikasi)</span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] text-text-mid font-bold mb-1">
                    Mn (≤{activeSurfaceStds.mn?.maxLimit ?? 0.1})
                  </label>
                  <input type="number" step="0.001" required value={swMn} onChange={(e) => setSwMn(Number(e.target.value))} className="w-full px-3 py-2 text-xs font-mono" />
                  {activeSurfaceStds.mn?.verificationStatus !== 'Terverifikasi' && (
                    <span className="text-[9px] text-neon-amber block mt-0.5">Informatif (Perlu verifikasi)</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSurfaceForm(false);
                    setEditingSurfaceWaterId(null);
                  }}
                  className="px-4 py-2 border border-border-neon rounded-xl text-xs text-text-mid hover:text-text-hi font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button type="submit" className="neon-btn-primary px-5 py-2 rounded-xl text-xs cursor-pointer">
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
                              item.ph < (item.standardSnapshot?.ph?.min ?? 6) ||
                              item.ph > (item.standardSnapshot?.ph?.max ?? 9)
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            {item.ph}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              item.tss > (item.standardSnapshot?.tss?.max ?? 50) ? 'text-neon-red' : 'text-text-hi'
                            }`}
                          >
                            {item.tss}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              item.doVal < (item.standardSnapshot?.doVal?.min ?? 4) ? 'text-neon-red' : 'text-neon-cyan'
                            }`}
                          >
                            {item.doVal}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              item.bod > (item.standardSnapshot?.bod?.max ?? 3) ? 'text-neon-red' : 'text-text-hi'
                            }`}
                          >
                            {item.bod}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              item.cod > (item.standardSnapshot?.cod?.max ?? 25) ? 'text-neon-red' : 'text-text-hi'
                            }`}
                          >
                            {item.cod}
                          </td>
                          <td
                            className={`p-3.5 text-right font-mono font-bold tabular-nums ${
                              feEval.verificationStatus === 'Terverifikasi' && feEval.result === 'tidak_memenuhi'
                                ? 'text-neon-red'
                                : 'text-text-hi'
                            }`}
                          >
                            <span>{item.fe}</span>
                            {feEval.verificationStatus === 'Perlu verifikasi' && (
                              <span className="block text-[9px] font-sans font-semibold text-neon-amber">
                                Informatif (Perlu verifikasi)
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
                            <span>{item.mn}</span>
                            {mnEval.verificationStatus === 'Perlu verifikasi' && (
                              <span className="block text-[9px] font-sans font-semibold text-neon-amber">
                                Informatif (Perlu verifikasi)
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <StatusBadge status={item.status} />
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
                    type="number"
                    step="0.1"
                    required
                    value={rRainfall}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRRainfall(val);
                      setRWeather(getBMKGWeatherClass(val));
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
                      alert('Gagal menghapus data: ' + err.message);
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

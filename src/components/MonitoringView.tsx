/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import ModalPortal from './ModalPortal';
import { WastewaterData, SurfaceWaterData, RainfallData, ReclamationPlan, WqLocation, WastewaterPhoto } from '../types';
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
  Loader2
} from 'lucide-react';
import { evaluateWastewaterStatus, evaluateSurfaceWaterStatus, WASTEWATER_BASIS_LABEL } from '../data/regulations';
import { todayLocalISO } from '../utils/dateUtils';
import { wqLocationService } from '../services/wqLocationService';
import { waterQualityService } from '../services/dbService';
import { isSuperintendent } from '../services/permissionService';
import PhotoUploader, { CompressedPhotoData } from './PhotoUploader';
import WqLocationModal from './WqLocationModal';

interface MonitoringViewProps {
  wastewater: WastewaterData[];
  surfaceWater: SurfaceWaterData[];
  rainfall: RainfallData[];
  userProfile?: any;
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

  // MASTER WQ LOCATIONS
  const [locations, setLocations] = useState<WqLocation[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);

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

  // Populate default officer when userProfile arrives
  useEffect(() => {
    if (!wOfficer && defaultOfficer) {
      setWOfficer(defaultOfficer);
    }
  }, [defaultOfficer, wOfficer]);

  // SURFACE WATER STATE
  const [editingSurfaceWaterId, setEditingSurfaceWaterId] = useState<string | null>(null);
  const [showSurfaceForm, setShowSurfaceForm] = useState(false);
  const [surfaceFilterLoc, setSurfaceFilterLoc] = useState('');
  const [surfaceFilterStatus, setSurfaceFilterStatus] = useState('');
  
  // Surface Form Fields
  const [swDate, setSwDate] = useState(todayLocalISO());
  const [swLoc, setSwLoc] = useState('Air Sungai Sembakung (Hulu)');
  const [swOfficer, setSwOfficer] = useState('');
  const [swPh, setSwPh] = useState(7.0);
  const [swTss, setSwTss] = useState(15);
  const [swDoVal, setSwDoVal] = useState(6.2);
  const [swBod, setSwBod] = useState(1.8);
  const [swCod, setSwCod] = useState(12.0);
  const [swFe, setSwFe] = useState(0.15);
  const [swMn, setSwMn] = useState(0.04);
  const [swMonitoringType, setSwMonitoringType] = useState<'Harian' | 'Bulanan'>('Harian');

  const dynamicSurfaceStatus = evaluateSurfaceWaterStatus(swPh, swTss, swDoVal, swBod, swCod, swFe, swMn);

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

  // Calculations for Water compliance rate in view
  const phLimitRange = "6.0 - 9.0";
  const tssLimit = "300 mg/L";
  const debitLimit = "Bebas / Pantau";
  const feLimit = "7.0 mg/L";
  const mnLimit = "4.0 mg/L";

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

  // Water dynamic rating calculator (uses parsed values or default for feedback)
  const dynamicWaterStatus = evaluateWastewaterStatus(
    wPhNum ?? 7.0,
    wTssNum ?? 0,
    wDebitNum ?? 0,
    wFeNum ?? 0,
    wMnNum ?? 0
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
    <div id="monitoring-view-container" className="space-y-6 text-slate-700">
      {/* Upper sub navigation header tabs */}
      <div className="flex border-b border-slate-200">
        <button
          id="monitoring-tab-water"
          onClick={() => setActiveTab('water')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'water' 
              ? 'border-teal-500 text-teal-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Droplet className="h-4 w-4" />
          Pemantauan Air Limbah Tambang
        </button>
        
        <button
          id="monitoring-tab-rainfall"
          onClick={() => setActiveTab('rainfall')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rainfall' 
              ? 'border-teal-500 text-teal-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CloudRain className="h-4 w-4" />
          Pemantauan Curah Hujan (Rain Gauge)
        </button>
        
      </div>

      {activeTab === 'water' && (
        <div id="water-monitoring-panel" className="space-y-6">
          {/* Water parameters indicators banner */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 bg-white/60 p-4 border border-slate-200 rounded-2xl">
            <div className="text-center md:border-r border-slate-200/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Baku pH</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{phLimitRange}</p>
            </div>
            <div className="text-center md:border-r border-slate-200/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Baku TSS</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{tssLimit}</p>
            </div>
            <div className="text-center md:border-r border-slate-200/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Debit Air (m³/s)</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{debitLimit}</p>
            </div>
            <div className="text-center md:border-r border-slate-200/80 py-1.5 last:border-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Baku Besi (Fe)</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{feLimit}</p>
            </div>
            <div className="text-center py-1.5 last:border-0">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Baku Mangan (Mn)</span>
              <p className="text-sm font-bold text-slate-800 mt-1">{mnLimit}</p>
            </div>
          </div>

          {/* Status Pemantauan Harian & Bulanan Dashboard Panel */}
          <div id="water-status-dashboard" className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-left">
            {/* 1. Daily Status Card */}
            <div id="daily-water-status-card" className="bg-white/40 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    Status Pemantauan Harian
                  </h4>
                  <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20">
                    {latestWaterDate ? formatIndoDate(latestWaterDate) : 'Tidak ada data'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <div className="relative flex items-center justify-center shrink-0 w-20 h-20 rounded-full border-4" style={{ borderColor: dailyComplianceRate >= 90 ? '#10b981' : dailyComplianceRate >= 70 ? '#f59e0b' : '#ef4444' }}>
                    <div className="text-center">
                      <span className="text-sm font-extrabold font-mono text-slate-800">{dailyComplianceRate}%</span>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">Kepatuhan</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Total Titik Dipantau:</span>
                      <strong className="text-slate-800 font-mono">{dailyTotal} Lokasi</strong>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl py-1.5">
                        <span className="text-emerald-600 block font-bold text-xs">{dailySafeCount}</span>
                        <span className="text-slate-500 block text-[8px] uppercase tracking-wide">Lolos</span>
                      </div>
                      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl py-1.5">
                        <span className="text-amber-500 block font-bold text-xs">{dailyWarningCount}</span>
                        <span className="text-slate-500 block text-[8px] uppercase tracking-wide">Warning</span>
                      </div>
                      <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl py-1.5">
                        <span className="text-rose-600 block font-bold text-xs">{dailyExceededCount}</span>
                        <span className="text-slate-500 block text-[8px] uppercase tracking-wide">Exceeded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-4 px-3 py-2.5 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2.5 ${
                dailyExceededCount > 0 
                  ? 'bg-rose-500/5 border-rose-500/10 text-rose-300' 
                  : dailyWarningCount > 0 
                  ? 'bg-amber-500/5 border-amber-500/10 text-amber-600' 
                  : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600'
              }`}>
                {dailyExceededCount > 0 ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                    <span><strong>Perhatian:</strong> Terdapat {dailyExceededCount} titik sampling yang melebihi standar mutu lingkungan tambang hari ini!</span>
                  </>
                ) : dailyWarningCount > 0 ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span><strong>Peringatan:</strong> {dailyWarningCount} titik mendekati batas kritis baku mutu. Lakukan koordinasi tim pengolah settling pond.</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span><strong>Aman:</strong> Seluruh outlet air limbah tambang teruji hari ini berada dalam rentang baku aman sesuai peraturan pemerintah.</span>
                  </>
                )}
              </div>
            </div>

            {/* 2. Monthly Status Card */}
            <div id="monthly-water-status-card" className="bg-white/40 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-teal-600" />
                    Analisis Kepatuhan Bulanan
                  </h4>
                  <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    <Calendar className="h-3 w-3 text-slate-500" />
                    <select
                      id="stats-month-selector"
                      value={selectedStatsMonth}
                      onChange={(e) => setSelectedStatsMonth(e.target.value)}
                      className="bg-transparent text-[10px] font-mono text-slate-600 focus:outline-none cursor-pointer"
                    >
                      {uniqueWaterMonths.map(m => (
                        <option key={m} value={m} className="bg-white">{formatIndoMonth(m)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-4 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl p-3 text-center">
                    <span className="text-2xl font-extrabold font-mono text-teal-600">{monthlyComplianceRate}%</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">Kepatuhan</span>
                    <span className="text-[8px] text-slate-500 font-mono mt-1">{monthlyTotal} Pengujian</span>
                  </div>
                  
                  <div className="sm:col-span-8 space-y-1.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-widest text-slate-500 font-mono block">Rata-Rata Parameter Bulanan</span>
                    <div className="grid grid-cols-2 gap-2 text-center font-mono">
                      <div className="bg-white border border-slate-200/60 rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-slate-500 text-[8px] uppercase">Rerata pH</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgPh < 6 || monthlyAvgPh > 9 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {monthlyAvgPh}
                        </strong>
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-slate-500 text-[8px] uppercase">Rerata TSS</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgTss > 300 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {monthlyAvgTss} <span className="text-[8px] font-normal text-slate-500">mg/L</span>
                        </strong>
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-slate-500 text-[8px] uppercase">Rerata Fe</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgFe > 7 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {monthlyAvgFe} <span className="text-[8px] font-normal text-slate-500">mg/L</span>
                        </strong>
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-xl p-1.5 flex flex-col justify-center">
                        <span className="text-slate-500 text-[8px] uppercase">Rerata Mn</span>
                        <strong className={`text-xs mt-0.5 ${monthlyAvgMn > 4 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {monthlyAvgMn} <span className="text-[8px] font-normal text-slate-500">mg/L</span>
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 font-sans border-t border-slate-200 pt-2">
                <span>Periode Analisis: {formatIndoMonth(activeWaterMonth)}</span>
                <span className={`font-bold uppercase tracking-wider flex items-center gap-1 ${
                  monthlyComplianceRate >= 95 ? 'text-emerald-600' : monthlyComplianceRate >= 80 ? 'text-amber-500' : 'text-rose-600'
                }`}>
                  <Award className="h-3.5 w-3.5" />
                  {monthlyComplianceRate >= 95 ? 'Kinerja Sangat Baik' : monthlyComplianceRate >= 80 ? 'Kinerja Butuh Perhatian' : 'Kinerja Bahaya / Melanggar'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons + Filters row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search/Filter elements */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="water-filter-loc"
                  type="text"
                  placeholder="Cari Lokasi Sampling..."
                  value={waterFilterLoc}
                  onChange={(e) => setWaterFilterLoc(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-teal-500 outline-none w-full"
                />
              </div>

              <select
                id="water-filter-status"
                value={waterFilterStatus}
                onChange={(e) => setWaterFilterStatus(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-teal-500 outline-none"
              >
                <option value="">Semua Status Baku Mutu</option>
                <option value="Safe">✅ Memenuhi Baku Mutu</option>
                <option value="Warning">⚠️ Mendekati Batas</option>
                <option value="Exceeded">❌ Melebihi Baku Mutu</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-start flex-wrap">
              {isSuperintendent(userProfile) && (
                <button
                  id="water-manage-locations-btn"
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                >
                  <MapPin className="h-4 w-4 text-teal-600" />
                  Kelola Titik Sampling
                </button>
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
                className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 cursor-pointer transition-colors"
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
              className="bg-white/90 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 flex items-center gap-2">
                  <Droplet className="h-4 w-4" />
                  {editingWaterId ? 'Formulir Edit Pengujian Air Limbah' : 'Formulir Hasil Pengujian Titik KPL / Settling Pond'}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Standard: SK Pertek PT DKB
                </span>
              </div>
              
              {/* Row 1: Date, Sample Time, Weather, Monitoring Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                    Tanggal Sampling *
                  </label>
                  <input
                    id="water-field-date"
                    type="date"
                    required
                    max={todayLocalISO()}
                    value={wDate}
                    onChange={(e) => setWDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                    Kondisi Cuaca *
                  </label>
                  <select
                    id="water-field-weather"
                    value={wWeather}
                    onChange={(e) => setWWeather(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 cursor-pointer"
                  >
                    <option value="Cerah">Cerah</option>
                    <option value="Berawan">Berawan</option>
                    <option value="Hujan Ringan">Hujan Ringan</option>
                    <option value="Hujan Lebat">Hujan Lebat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                    Jenis Pemantauan *
                  </label>
                  <select
                    id="water-field-monitoring-type"
                    value={wMonitoringType}
                    onChange={(e) => setWMonitoringType(e.target.value as 'Harian' | 'Bulanan')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 cursor-pointer"
                  >
                    <option value="Harian">Harian (Daily)</option>
                    <option value="Bulanan">Bulanan (Monthly)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Master Location, Wastewater Source, Officer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 font-semibold cursor-pointer"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.code}>
                        {loc.name} ({loc.code}) {!loc.isActive ? '[Nonaktif]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                    Sumber Air Limbah *
                  </label>
                  <input
                    id="water-field-source"
                    type="text"
                    required
                    placeholder="Contoh: Settling Pond Outlet"
                    value={wSource}
                    onChange={(e) => setWSource(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                    Nama Petugas Sampling *
                  </label>
                  <input
                    id="water-field-officer"
                    type="text"
                    required
                    placeholder="Contoh: Aditya Perkasa"
                    value={wOfficer}
                    onChange={(e) => setWOfficer(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Row 3: Parameter Numbers (Start EMPTY, accepts comma & dot, step="any", inputMode="decimal") */}
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-2 uppercase">
                  Hasil Parameter Uji Lapangan (Wajib Diisi Lengkap) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
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
                      className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none text-slate-800 ${
                        wPhNum !== null && (wPhNum < 0 || wPhNum > 14) ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200'
                      }`}
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Baku: 6.0 – 9.0</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Baku: &le; 300 mg/L</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Pantau debit outlet</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Baku: &le; 7.0 mg/L</span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1 uppercase">
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                    />
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Baku: &le; 4.0 mg/L</span>
                  </div>
                </div>
              </div>

              {/* Row 4: Photo Sampling Uploader (Separated collection, canvas compressed <= 350k chars) */}
              <div>
                <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">
                  Foto Evidence Pengambilan Sampel (Opsional)
                </label>
                {isPhotoLoading ? (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Memuat foto evidence...</span>
                  </div>
                ) : (
                  <PhotoUploader currentPhoto={wPhoto} onPhotoSelected={setWPhoto} />
                )}
              </div>

              {/* Duplicate Warning Alert */}
              {isDuplicateDaily && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2.5 font-medium animate-shake">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <span className="font-bold block">Peringatan Duplikasi Data Harian:</span>
                    <span>
                      Data harian titik <strong className="font-mono">{wLocationCode}</strong> tanggal <strong className="font-mono">{formatIndoDate(wDate)}</strong> sudah ada. Edit data yang ada.
                    </span>
                  </div>
                </div>
              )}

              {/* Real-time Validation Feedback badge */}
              <div className="p-3 rounded-xl border flex items-center justify-between bg-white/60 border-slate-200">
                <p className="text-xs text-slate-500">Verifikasi baku mutu otomatis ({WASTEWATER_BASIS_LABEL}) :</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-bold px-3 py-1 rounded-lg border uppercase tracking-wider ${
                    !areAllNumbersFilledAndFinite
                      ? 'bg-slate-100 border-slate-300 text-slate-500'
                      : dynamicWaterStatus === 'Safe' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' 
                      : dynamicWaterStatus === 'Warning'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-red-500/10 border-red-500/30 text-red-600'
                  }`}>
                    {!areAllNumbersFilledAndFinite
                      ? '⏳ Menunggu Input Parameter Lengkap'
                      : dynamicWaterStatus === 'Safe'
                      ? '✅ Memenuhi Baku Mutu'
                      : dynamicWaterStatus === 'Warning'
                      ? '⚠️ Mendekati Batas Parameter'
                      : '❌ Melebihi Baku Mutu (Melanggar)'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-200">
                <button
                  id="water-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowWaterForm(false);
                    resetWaterForm();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="water-form-submit"
                  type="submit"
                  disabled={!areAllNumbersFilledAndFinite || !wOfficer.trim() || isDuplicateDaily || !wDate || !wLocationCode}
                  className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all ${
                    !areAllNumbersFilledAndFinite || !wOfficer.trim() || isDuplicateDaily || !wDate || !wLocationCode
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                      : 'bg-teal-500 hover:bg-teal-600 text-slate-950 cursor-pointer'
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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Log Pengujian Air Limbah Tambang</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No / Tgl</th>
                    <th className="p-3.5">Lokasi Sampling</th>
                    <th className="p-3.5 text-center">pH</th>
                    <th className="p-3.5 text-center">TSS</th>
                    <th className="p-3.5 text-center">Debit (m³/s)</th>
                    <th className="p-3.5 text-center">Besi / Fe</th>
                    <th className="p-3.5 text-center">Mangan / Mn</th>
                    <th className="p-3.5 text-center">Compliance</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredWater.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada data hasil sampling yang cocok.</td>
                    </tr>
                  ) : (
                    filteredWater.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                        <td className="p-3.5 pl-5 font-mono">
                          <span className="text-slate-500 block text-[9px]">{item.id}</span>
                          <span className="font-semibold text-slate-600">{item.date}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700 block">{item.location}</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-500">Petugas: {item.officer}</span>
                            {item.sampleTime && (
                              <>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" />
                                  {item.sampleTime} WITA
                                </span>
                              </>
                            )}
                            {item.weather && (
                              <>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span className="text-[10px] text-slate-500">{item.weather}</span>
                              </>
                            )}
                            <span className="text-[10px] text-slate-400">•</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              item.monitoringType === 'Bulanan'
                                ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/20'
                                : 'bg-blue-500/15 text-blue-600 border border-blue-500/20'
                            }`}>
                              {item.monitoringType || 'Harian'}
                            </span>
                            {/* Duplicate badge for legacy / duplicate records */}
                            {(item.monitoringType ?? 'Harian') === 'Harian' && duplicateDailyKeys.has(`${item.date}_${item.locationCode || item.location}`) && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30">
                                Ganda
                              </span>
                            )}
                            {/* Unregistered location badge */}
                            {!isMasteredLocation(item) && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-rose-50 text-rose-600 border border-rose-200">
                                lokasi belum terdaftar
                              </span>
                            )}
                            {/* Photo button with lazy modal */}
                            {item.hasPhoto && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoPreviewItem(item);
                                  setPhotoPreviewDoc(null);
                                  setIsLoadingLazyPhoto(true);
                                  waterQualityService.getPhoto(item.id).then(docSnap => {
                                    setPhotoPreviewDoc(docSnap);
                                  }).finally(() => {
                                    setIsLoadingLazyPhoto(false);
                                  });
                                }}
                                className="text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 cursor-pointer transition-colors"
                                title="Lihat Foto Evidence Sampling"
                              >
                                <Camera className="w-2.5 h-2.5" />
                                Foto
                              </button>
                            )}
                          </div>
                        </td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.ph < 6 || item.ph > 9 ? 'text-red-600' : 'text-slate-500'}`}>{item.ph}</td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.tss > 300 ? 'text-red-600' : 'text-slate-500'}`}>{item.tss}</td>
                        <td className="p-3.5 text-center font-bold font-mono text-teal-600">{(item.debit ?? 0).toFixed(3)}</td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.fe > 7 ? 'text-red-600' : 'text-slate-500'}`}>{item.fe}</td>
                        <td className={`p-3.5 text-center font-bold font-mono ${item.mn > 4 ? 'text-red-600' : 'text-slate-500'}`}>{item.mn}</td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                            item.status === 'Safe' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            item.status === 'Warning' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                            'bg-rose-50 border-rose-200 text-rose-600'
                          }`}>
                            {item.status === 'Safe' ? 'Lolos' : item.status === 'Warning' ? 'Warning' : 'Over Limit'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                          <button
                            id={`water-edit-btn-${item.id}`}
                            onClick={() => startEditWater(item)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit record"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            id={`water-delete-btn-${item.id}`}
                            onClick={() => {
                              setDeleteConfirm({
                                id: item.id,
                                type: 'water',
                                message: `Hapus data pengamatan ${item.id}?`
                              });
                            }}
                            className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus record"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rainfall' && (
        <div id="rainfall-monitoring-panel" className="space-y-6">
          {/* Rainfall parameters summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/60 p-4 border border-slate-200 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-teal-500/10 text-teal-600 rounded-xl">
                <CloudRain className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Total Akumulasi</span>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {rainfall.reduce((acc, x) => acc + x.rainfall, 0).toFixed(1)} mm
                </p>
              </div>
            </div>

            <div className="bg-white/60 p-4 border border-slate-200 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Filter className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Stasiun Pengamatan</span>
                <p className="text-xl font-bold text-slate-800 mt-1">
                  {Array.from(new Set(rainfall.map(x => x.station))).length} Pos Area
                </p>
              </div>
            </div>

            <div className="bg-white/60 p-4 border border-slate-200 rounded-2xl flex items-center gap-4 text-left shadow">
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Batas Badai Kritis</span>
                <p className="text-xl font-bold text-slate-800 mt-1">&gt; 50 mm / Hari</p>
              </div>
            </div>
          </div>

          {/* Action buttons + Filters rain */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="rain-filter-station"
                  type="text"
                  placeholder="Cari Pos Meter..."
                  value={rainFilterStation}
                  onChange={(e) => setRainFilterStation(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 focus:border-teal-500 outline-none w-full"
                />
              </div>
            </div>

            <button
              id="rain-add-data-btn"
              onClick={() => setShowRainForm(!showRainForm)}
              className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-teal-500/10 cursor-pointer self-start"
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
              className="bg-white/80 p-5 rounded-2xl border border-slate-200 text-left animate-slide-up"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider text-teal-600 mb-4 pb-2 border-b border-slate-200">
                {editingRainId ? 'Formulir Edit Pencatatan Curah Hujan Harian' : 'Formulir Pencatatan Curah Hujan Harian'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Tanggal Hujan</label>
                  <input
                    id="rain-field-date"
                    type="date"
                    required
                    value={rDate}
                    onChange={(e) => setRDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Jam Mulai Hujan</label>
                  <input
                    id="rain-field-start"
                    type="time"
                    required
                    value={rStart}
                    onChange={(e) => setRStart(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Jam Selesai Hujan</label>
                  <input
                    id="rain-field-end"
                    type="time"
                    required
                    value={rEnd}
                    onChange={(e) => setREnd(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Stasiun Pos Pengamatan</label>
                  <input
                    id="rain-field-station"
                    type="text"
                    required
                    placeholder="Contoh: Stasiun Pit West (WS-01)"
                    value={rStation}
                    onChange={(e) => setRStation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Alat Pengukur</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      id="rain-type-manual"
                      type="button"
                      onClick={() => setRType('Manual')}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        rType === 'Manual' ? 'bg-teal-500/10 border-teal-500 text-teal-600' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Gauge Manual
                    </button>
                    <button
                      id="rain-type-auto"
                      type="button"
                      onClick={() => setRType('Automatic')}
                      className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer transition-all ${
                        rType === 'Automatic' ? 'bg-teal-500/10 border-teal-500 text-teal-600' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Automatic
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Volume Curah Hujan (mm)</label>
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Klasifikasi Cuaca (Otomatis BMKG)</label>
                  <select
                    id="rain-field-weather"
                    value={rWeather}
                    disabled
                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-500 cursor-not-allowed font-semibold"
                  >
                    <option value="Clear">Clear (Cerah / 0 mm)</option>
                    <option value="Cloudy">Cloudy (Mendung / &lt; 5 mm)</option>
                    <option value="Light Rain">Light Rain (Hujan Ringan: 5 - 20 mm)</option>
                    <option value="Heavy Rain">Heavy Rain (Hujan Sedang/Lebat: 20 - 50 mm)</option>
                    <option value="Storm">Storm (Badai/Sangat Lebat: &gt; 50 mm)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 font-bold mb-1.5 uppercase">Catatan Operasional Lapangan</label>
                  <input
                    id="rain-field-notes"
                    type="text"
                    placeholder="Status pompa / limpahan drainase"
                    value={rNotes}
                    onChange={(e) => setRNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-teal-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-slate-200">
                <button
                  id="rain-form-cancel"
                  type="button"
                  onClick={() => {
                    setShowRainForm(false);
                    setEditingRainId(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="rain-form-submit"
                  type="submit"
                  className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {editingRainId ? 'Update Records' : 'Simpan Records'}
                </button>
              </div>
            </form>
          )}

          {/* Rain logs table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left shadow">
            <div className="px-5 py-4 border-b border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Log Pengkuran Curah Hujan (Rain Gauge Records)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-[10px] text-slate-600 font-mono tracking-wider uppercase">
                    <th className="p-3.5 pl-5">No / Tgl</th>
                    <th className="p-3.5">Nama Stasiun</th>
                    <th className="p-3.5 pr-2.5">Durasi Hujan</th>
                    <th className="p-3.5 text-center">Instrumen</th>
                    <th className="p-3.5 text-center">Curah Hujan (mm)</th>
                    <th className="p-3.5 text-center">Intensitas (mm/jam)</th>
                    <th className="p-3.5 text-center">Cuaca</th>
                    <th className="p-3.5 text-left pl-5">Catatan / Hambatan Tambang</th>
                    <th className="p-3.5 text-center pr-5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRain.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-slate-500">Tidak ada log pengamatan curah hujan.</td>
                    </tr>
                  ) : (
                    filteredRain.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-100 even:bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                        <td className="p-3.5 pl-5 font-mono">
                          <span className="text-slate-500 block text-[9px]">{item.id}</span>
                          <span className="font-semibold text-slate-600">{item.date}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700">{item.station}</span>
                        </td>
                        <td className="p-3.5 pr-2.5">
                          <span className="font-mono text-slate-600 block">{item.startTime} - {item.endTime}</span>
                          <span className="text-[10px] text-slate-500">{item.duration} Menit</span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-300 font-mono font-bold uppercase">
                            {item.gaugeType}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800 font-mono">
                          {item.rainfall} mm
                        </td>
                        <td className="p-3.5 text-center font-bold font-mono text-teal-600">
                          {item.intensity}
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            item.weather === 'Storm' ? 'bg-red-500/20 text-red-600' :
                            item.weather === 'Heavy Rain' ? 'bg-blue-500/20 text-blue-600' :
                            item.weather === 'Light Rain' ? 'bg-teal-500/10 text-teal-600' : 'bg-white text-slate-500'
                          }`}>
                            {item.weather}
                          </span>
                        </td>
                        <td className="p-3.5 text-left pl-5 text-slate-500 truncate max-w-[200px]" title={item.notes}>
                          {item.notes || '-'}
                        </td>
                        <td className="p-3.5 text-center pr-5 flex items-center justify-center gap-1.5">
                          <button
                            id={`rain-edit-btn-${item.id}`}
                            onClick={() => startEditRain(item)}
                            className="p-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Edit record"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            id={`rain-delete-btn-${item.id}`}
                            onClick={() => {
                              setDeleteConfirm({
                                id: item.id,
                                type: 'rain',
                                message: `Hapus data hujan ${item.id}?`
                              });
                            }}
                            className="p-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                            title="Hapus record"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

      {/* Modal Lazy Preview Foto Evidence Sampling */}
      {photoPreviewItem && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-left animate-slide-up">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      Evidence Foto Sampling: {photoPreviewItem.location}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {photoPreviewItem.date} {photoPreviewItem.sampleTime ? `• ${photoPreviewItem.sampleTime} WITA` : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreviewItem(null);
                    setPhotoPreviewDoc(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-3">
                {isLoadingLazyPhoto ? (
                  <div className="h-64 rounded-xl bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                    <span className="text-xs">Memuat foto resolusi penuh dari cloud...</span>
                  </div>
                ) : photoPreviewDoc?.dataUrl ? (
                  <div className="space-y-3">
                    <div className="w-full max-h-[380px] rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-200">
                      <img
                        src={photoPreviewDoc.dataUrl}
                        alt="Evidence Sampling"
                        className="max-h-[380px] w-auto object-contain"
                      />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Petugas</span>
                        <span className="font-semibold text-slate-800">{photoPreviewItem.officer}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Cuaca</span>
                        <span>{photoPreviewItem.weather || 'Tidak dicatat'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Resolusi Asli</span>
                        <span className="font-mono">{photoPreviewDoc.width} × {photoPreviewDoc.height} px</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Ukuran Data</span>
                        <span className="font-mono">{Math.round(photoPreviewDoc.dataUrl.length / 1024)} KB</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Foto evidence sampling tidak ditemukan atau telah dihapus.
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreviewItem(null);
                    setPhotoPreviewDoc(null);
                  }}
                  className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl transition-colors cursor-pointer"
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
          <div id="delete-confirm-modal-mon" className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-700 text-left">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="p-1 rounded-lg bg-red-500/10 text-red-500">
                  <Trash2 size={16} />
                </span>
                Konfirmasi Hapus
              </h3>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                {deleteConfirm.message}
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-3.5 py-2 rounded-xl text-xs bg-white hover:bg-slate-100 text-slate-600 font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
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
                  className="px-3.5 py-2 rounded-xl text-xs bg-red-600 hover:bg-red-500 text-slate-900 font-bold transition-colors cursor-pointer"
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

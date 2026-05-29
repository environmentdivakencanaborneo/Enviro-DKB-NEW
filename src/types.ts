/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WastewaterData {
  id: string;
  date: string;
  location: string;
  officer: string;
  ph: number;       // standard: 6.0 - 9.0 (PP 22/2021)
  tss: number;      // standard: max 200 mg/L (or based on regional)
  debit: number;    // discharge flow rate, allow 3 decimal places
  fe: number;       // Iron - standard: max 7 mg/L
  mn: number;       // Mangan - standard: max 4 mg/L
  status: 'Safe' | 'Warning' | 'Exceeded'; 
}

export interface RainfallData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  station: string;
  gaugeType: 'Manual' | 'Automatic';
  rainfall: number; // in mm
  intensity: number; // in mm/hour
  weather: 'Clear' | 'Cloudy' | 'Light Rain' | 'Heavy Rain' | 'Storm';
  notes?: string;
}

export interface NurseryData {
  id: string;
  plantType: string;
  quantity: number;
  source: string;
  ageWeeks: number;
  heightCm: number;
  status: 'Healthy' | 'Need Care' | 'Critical';
  location: string;
  dateIn: string;
}

export interface ReclamationPlan {
  id: string;
  areaName: string;
  sizeHa: number;
  targetYear: number;
  plantType: string;
  method: string;
  estimatedCost: number;
  status: 'Draft' | 'Approved' | 'In Progress' | 'Completed';
  pic: string;
}

export interface ReclamationGuarantee {
  id: string;
  guaranteeNo: string;
  guaranteeType: 'Bank Guarantee' | 'Time Deposit' | 'Environmental Bond';
  value: number;
  issuingInstitution: string;
  issuedDate: string;
  dueDate: string;
  status: 'Active' | 'Renewal Needed' | 'Claimed' | 'Released';
  docUrl?: string;
}

export interface WasteIn {
  id: string;
  dateIn: string;
  wasteType: string;
  source: string;
  weightKg: number;
  characteristic: 'Flammable' | 'Toxic' | 'Corrosive' | 'Reactive' | 'Infectious';
  code: string; // Permen LHK No. 6 Tahun 2021
  tpsLocation: string;
  officer: string;
  documentationUrl?: string;
}

export interface WasteOut {
  id: string;
  dateOut: string;
  wasteType: string;
  weightKg: number;
  destination: string;
  transporter: string;
  manifestNo: string;
  vehicleNo: string;
  driverName: string;
  recipient: string;
  documentationUrl?: string;
}

export interface WasteStock {
  wasteType: string;
  code: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  earliestDateIn: string | null;
  daysInTps: number; // warning if near 90 days from earliest check
}

export interface EnvironmentalDocument {
  id: string;
  name: string;
  type: 'AMDAL' | 'UKL-UPL' | 'Izin Lingkungan' | 'Izin TPS B3' | 'Izin Pembuangan Air Limbah';
  docNo: string;
  issuedDate: string;
  expiryDate: string | 'N/A';
  status: 'Active' | 'Expired' | 'Renewal Needed';
  pic: string;
  fileSize?: string;
}

export interface ComplianceCalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'Reporting' | 'Inspection' | 'Exceedance' | 'Permit Expiry';
  description: string;
  status: 'Pending' | 'Completed' | 'Overdue';
}

export interface AlertNotification {
  id: string;
  timestamp: string;
  type: 'Critical' | 'Warning' | 'Info';
  category: 'Wastewater' | 'B3 Waste' | 'Permit' | 'Guarantee';
  title: string;
  message: string;
  read: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  company: string;
  role: string;
}

export interface GoogleSyncConfig {
  clientId: string;
  spreadsheetId: string;
  folderId: string;
  isAuthenticated: boolean;
  syncStatus: 'synced' | 'syncing' | 'offline';
  lastSynced: string | null;
}

export interface SyncQueueItem {
  id: string;
  timestamp: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
}

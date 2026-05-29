/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  WastewaterData, 
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  AlertNotification 
} from '../types';

export const INITIAL_WASTEWATER: WastewaterData[] = [
  {
    id: "WW-001",
    date: "2026-05-24",
    location: "KPL Tambang Blok Utara (KPL-01)",
    officer: "Dwi Kuncoro",
    ph: 7.2,
    tss: 45,
    debit: 0.125,
    fe: 1.2,
    mn: 0.8,
    status: 'Safe'
  },
  {
    id: "WW-002",
    date: "2026-05-25",
    location: "Sump Barat Area Disposal (KPL-02)",
    officer: "Siti Rahma",
    ph: 5.8, // PP 22/2021 limit is 6.0, so this is out of limits !
    tss: 112, // PermenLHK limit is 100, so out of limits !
    debit: 1.450,
    fe: 5.6,
    mn: 3.2,
    status: 'Exceeded'
  },
  {
    id: "WW-003",
    date: "2026-05-26",
    location: "Inlet Water Treatment Blok Timur (KPL-03)",
    officer: "Dwi Kuncoro",
    ph: 6.4,
    tss: 88, // near 100 threshold (Warning)
    debit: 0.850,
    fe: 2.1,
    mn: 1.5,
    status: 'Warning'
  },
  {
    id: "WW-004",
    date: "2026-05-27",
    location: "Outfall Settling Pond Blok Tengah (KPL-04)",
    officer: "Arya Saputra",
    ph: 7.5,
    tss: 25,
    debit: 2.105,
    fe: 0.4,
    mn: 0.2,
    status: 'Safe'
  },
  {
    id: "WW-005",
    date: "2026-05-28",
    location: "KPL Tambang Blok Utara (KPL-01)",
    officer: "Arya Saputra",
    ph: 7.4,
    tss: 31,
    debit: 0.340,
    fe: 0.5,
    mn: 0.3,
    status: 'Safe'
  }
];

export const INITIAL_RAINFALL: RainfallData[] = [
  {
    id: "RF-001",
    date: "2026-05-22",
    startTime: "14:10",
    endTime: "16:15",
    duration: 125,
    station: "Stasiun Pit West / WS-01",
    gaugeType: "Automatic",
    rainfall: 45.5,
    intensity: 21.84,
    weather: "Heavy Rain",
    notes: "Larian air ke sump utama tinggi, pompa diaktifkan 3 unit."
  },
  {
    id: "RF-002",
    date: "2026-05-23",
    startTime: "09:30",
    endTime: "10:15",
    duration: 45,
    station: "Stasiun Mess Karyawan / WS-02",
    gaugeType: "Manual",
    rainfall: 12.0,
    intensity: 16.0,
    weather: "Light Rain",
    notes: "Hujan merata dengan intensitas sedang."
  },
  {
    id: "RF-003",
    date: "2026-05-25",
    startTime: "18:00",
    endTime: "21:30",
    duration: 210,
    station: "Stasiun Port stockpile / WS-03",
    gaugeType: "Automatic",
    rainfall: 85.0,
    intensity: 24.28,
    weather: "Storm",
    notes: "Badai petir disertai angin kencang. Loading batubara di Port sempat dihentikan."
  },
  {
    id: "RF-004",
    date: "2026-05-26",
    startTime: "11:20",
    endTime: "12:00",
    duration: 40,
    station: "Stasiun Pit West / WS-01",
    gaugeType: "Automatic",
    rainfall: 8.5,
    intensity: 12.75,
    weather: "Light Rain",
    notes: "Slight runoff."
  },
  {
    id: "RF-005",
    date: "2026-05-28",
    startTime: "15:00",
    endTime: "16:45",
    duration: 105,
    station: "Stasiun Mess Karyawan / WS-02",
    gaugeType: "Manual",
    rainfall: 32.4,
    intensity: 18.51,
    weather: "Heavy Rain",
    notes: "Normal drainage run-off."
  }
];

export const INITIAL_NURSERY: NurseryData[] = [
  {
    id: "NS-001",
    plantType: "Sengon Laut (Falcataria moluccana)",
    quantity: 12500,
    source: "Pembibitan Lokal Mandiri",
    ageWeeks: 12,
    heightCm: 45,
    status: "Healthy",
    location: "Nursery Blok A Barat",
    dateIn: "2026-03-01"
  },
  {
    id: "NS-002",
    plantType: "Acacia mangium",
    quantity: 8000,
    source: "PT Bibit Unggul Lestari",
    ageWeeks: 16,
    heightCm: 60,
    status: "Healthy",
    location: "Nursery Blok A Barat",
    dateIn: "2026-02-15"
  },
  {
    id: "NS-003",
    plantType: "Trembesi (Samanea saman)",
    quantity: 3500,
    source: "Cabut Darat Lokal",
    ageWeeks: 8,
    heightCm: 30,
    status: "Need Care",
    location: "Nursery Blok B Timur",
    dateIn: "2026-04-10"
  },
  {
    id: "NS-004",
    plantType: "Mahoni (Swietenia mahagoni)",
    quantity: 5000,
    source: "Dinas Kehutanan Prov",
    ageWeeks: 24,
    heightCm: 85,
    status: "Healthy",
    location: "Nursery Blok B Timur",
    dateIn: "2025-12-10"
  },
  {
    id: "NS-005",
    plantType: "Johar (Senna siamea)",
    quantity: 1200,
    source: "Pembibitan Mandiri",
    ageWeeks: 10,
    heightCm: 25,
    status: "Critical",
    location: "Karantina Seedling Blok C",
    dateIn: "2026-04-20"
  }
];

export const INITIAL_RECLAMATION: ReclamationPlan[] = [
  {
    id: "RP-001",
    areaName: "Disposal Area Utara Luar (IPD-01)",
    sizeHa: 12.5,
    targetYear: 2026,
    plantType: "Sengon Laut & Trembesi",
    method: "Hydroseeding & Pot Tanam Campuran",
    estimatedCost: 375000000, // Rp 375.000.000
    status: "In Progress",
    pic: "Bambang Trimurti"
  },
  {
    id: "RP-002",
    areaName: "Highwall Selatan Pit 3 (HWS-03)",
    sizeHa: 5.8,
    targetYear: 2026,
    plantType: "Acacia mangium & Legume Cover Crops (LCC)",
    method: "Terasering Rekayasa Sipil & Tanam Langsung",
    estimatedCost: 195000000,
    status: "Approved",
    pic: "Bambang Trimurti"
  },
  {
    id: "RP-003",
    areaName: "Pit Barat Bekas Sump (PWB-02)",
    sizeHa: 24.2,
    targetYear: 2027,
    plantType: "Trembesi, Sengon & Mahoni",
    method: "Penimbunan Backfilling & Remidiasi TopSoil",
    estimatedCost: 850000000,
    status: "Draft",
    pic: "Indra Lesmana"
  },
  {
    id: "RP-004",
    areaName: "Lowwall Blok Utara Sektor G (LWG-01)",
    sizeHa: 8.4,
    targetYear: 2025,
    plantType: "Johar & Cover Crops",
    method: "Pot Tanam Langsung",
    estimatedCost: 220000000,
    status: "Completed",
    pic: "Bambang Trimurti"
  }
];

export const INITIAL_GUARANTEE: ReclamationGuarantee[] = [
  {
    id: "RG-001",
    guaranteeNo: "JAMREK-2026-PTKBB-01",
    guaranteeType: "Bank Guarantee",
    value: 1250000000, // Rp 1.250.000.000
    issuingInstitution: "PT Bank Mandiri (Persero) Tbk",
    issuedDate: "2025-06-15",
    dueDate: "2026-06-15", // Expiring soon in ~2-3 weeks!
    status: "Renewal Needed"
  },
  {
    id: "RG-002",
    guaranteeNo: "DEP-JAMREK-ESDM-04",
    guaranteeType: "Time Deposit",
    value: 3500000000, // Rp 3.500.000.000
    issuingInstitution: "PT Bank Rakyat Indonesia (Persero)",
    issuedDate: "2023-11-20",
    dueDate: "2028-11-20",
    status: "Active"
  },
  {
    id: "RG-003",
    guaranteeNo: "JAMREK-2026-BPD-BPT",
    guaranteeType: "Environmental Bond",
    value: 850000000,
    issuingInstitution: "Asuransi Jasa Indonesia (Jasindo)",
    issuedDate: "2026-02-10",
    dueDate: "2027-02-10",
    status: "Active"
  }
];

export const INITIAL_WASTE_IN: WasteIn[] = [
  {
    id: "WI-001",
    dateIn: "2026-05-15",
    wasteType: "Oli Bekas (Used Lubricant)",
    source: "Workshop Alat Berat (Pit West Area)",
    weightKg: 2400,
    characteristic: "Flammable",
    code: "B105d",
    tpsLocation: "TPS B3 Area Workshop Utama",
    officer: "Maman Suherman"
  },
  {
    id: "WI-002",
    dateIn: "2026-03-05", // Over 80 days ago (near 90 days limit!)
    wasteType: "Aki Bekas (Used Lead Acid Batteries)",
    source: "Line Hauler Maintenance Pit Timur",
    weightKg: 450,
    characteristic: "Corrosive",
    code: "B102d",
    tpsLocation: "TPS B3 Area Workshop Utama",
    officer: "Maman Suherman"
  },
  {
    id: "WI-003",
    dateIn: "2026-05-24",
    wasteType: "Filter Oli & Solar Bekas (Used Filters)",
    source: "Service Unit Tyre Crane",
    weightKg: 320,
    characteristic: "Toxic",
    code: "B108d",
    tpsLocation: "TPS B3 Area Port Stockpile",
    officer: "Imron Rosyadi"
  },
  {
    id: "WI-004",
    dateIn: "2026-05-26",
    wasteType: "Kemasan Bekas Bahan B3 (Contaminated Containers)",
    source: "Warehouse Bahan Kimia Lab",
    weightKg: 180,
    characteristic: "Flammable",
    code: "B104d",
    tpsLocation: "TPS B3 Area Workshop Utama",
    officer: "Maman Suherman"
  }
];

export const INITIAL_WASTE_OUT: WasteOut[] = [
  {
    id: "WO-001",
    dateOut: "2026-04-10",
    wasteType: "Oli Bekas (Used Lubricant)",
    weightKg: 4000,
    destination: "PT Pengolah Limbah Nusantara, Karawang",
    transporter: "PT Trans Cita B3 Mandiri",
    manifestNo: "MAN-B3-2026-00412",
    vehicleNo: "B 9042 UIT",
    driverName: "Karyo Subagio",
    recipient: "PT PL Nusantara (Surya Saputra)"
  },
  {
    id: "WO-002",
    dateOut: "2026-05-20",
    wasteType: "Filter Oli & Solar Bekas (Used Filters)",
    weightKg: 650,
    destination: "PT Eco Lestari Indonesia, Mojokerto",
    transporter: "PT Trans Cita B3 Mandiri",
    manifestNo: "MAN-B3-2026-00499",
    vehicleNo: "KT 8821 AD",
    driverName: "Sutrisno",
    recipient: "PT Eco Lestari (Pranoto)"
  }
];

export const INITIAL_DOCUMENTS: EnvironmentalDocument[] = [
  {
    id: "DOC-001",
    name: "AMDAL Pembukaan Pit West & Pit Timur Sektor Utara",
    type: "AMDAL",
    docNo: "SK-AMDAL/LH-2018/0024A-PROV",
    issuedDate: "2018-04-12",
    expiryDate: "N/A",
    status: "Active",
    pic: "Indra Sukma",
    fileSize: "45.2 MB"
  },
  {
    id: "DOC-002",
    name: "Izin Pembuangan Air Limbah Settling Pond SP-02 & SP-04",
    type: "Izin Pembuangan Air Limbah",
    docNo: "503/IPAL-LH/DPM-PTSP/2021",
    issuedDate: "2021-08-15",
    expiryDate: "2026-08-15", // Expiring in less than 3 months!
    status: "Renewal Needed",
    pic: "Hani Puspita",
    fileSize: "8.4 MB"
  },
  {
    id: "DOC-003",
    name: "Izin Kelayakan Lingkungan Kegiatan Penambangan Batubara Utama",
    type: "Izin Lingkungan",
    docNo: "SK-KL/MENLHK/PLB3-2020",
    issuedDate: "2020-02-10",
    expiryDate: "N/A",
    status: "Active",
    pic: "Indra Sukma",
    fileSize: "12.8 MB"
  },
  {
    id: "DOC-004",
    name: "Izin TPS LB3 Area Workshop & Port Stockpile",
    type: "Izin TPS B3",
    docNo: "SK-TPS-LB3/LH/KAB-MTR/2023",
    issuedDate: "2023-01-18",
    expiryDate: "2028-01-18",
    status: "Active",
    pic: "Hani Puspita",
    fileSize: "6.1 MB"
  }
];

export const INITIAL_CALENDAR: ComplianceCalendarEvent[] = [
  {
    id: "EV-001",
    date: "2026-06-10",
    title: "Pelaporan RKL-RPL Semester I - 2026",
    type: "Reporting",
    description: "Penyusunan dan pengiriman Laporan Implementasi RKL-RPL Semester I tahun berjalan ke DLH Provinsi dan Kementerian LHK.",
    status: "Pending"
  },
  {
    id: "EV-002",
    date: "2026-06-15",
    title: "Review Jaminan Reklamasi Bank Mandiri",
    type: "Inspection",
    description: "Batas akhir penyerahan berkas renewal Jaminan Reklamasi PT Bank Mandiri ke Kementerian ESDM.",
    status: "Pending"
  },
  {
    id: "EV-003",
    date: "2026-05-25",
    title: "Audit Kepatuhan Limpasan Air Asam Tambang (AAT)",
    type: "Inspection",
    description: "Kunjungan lapangan DLH Kabupaten untuk pengecekan berkala inlet/outlet Sump Sedimentation Blok Barat.",
    status: "Completed"
  },
  {
    id: "EV-004",
    date: "2026-06-05",
    title: "Pengangkutan Limbah B3 Cair Oli Bekas",
    type: "Reporting",
    description: "Pengangkutan terjadwal oli bekas oleh PT Trans Cita B3 Mandiri untuk disalurkan ke penyuling resmi.",
    status: "Pending"
  }
];

export const INITIAL_ALERTS: AlertNotification[] = [
  {
    id: "AL-001",
    timestamp: "2026-05-25T11:45:00Z",
    type: "Critical",
    category: "Wastewater",
    title: "Parameter pH & TSS Melebihi Baku Mutu!",
    message: "Dari pengujian sampling air limbah di Sump Barat Area Disposal (KPL-02), didapatkan nilai pH 5.8 (Baku Mutu: 6-9) dan TSS 112 mg/L (Baku Mutu: 100 mg/L). Lakukan treatment kapur segera.",
    read: false
  },
  {
    id: "AL-002",
    timestamp: "2026-05-27T08:00:00Z",
    type: "Warning",
    category: "Permit",
    title: "Masa Berlaku Izin IPAL SP-04 Segera Berakhir",
    message: "Masa berlaku SK No 503/IPAL-LH/DPM-PTSP/2021 akan berakhir pada 2026-08-15 (~78 hari lagi). Berkas perpanjangan harus diajukan minimal 60 hari sebelum tanggal kadaluarsa.",
    read: false
  },
  {
    id: "AL-003",
    timestamp: "2026-05-28T16:50:00Z",
    type: "Warning",
    category: "B3 Waste",
    title: "Limbah Aki Bekas Mendekati Batas Penyimpanan 90 Hari",
    message: "Limbah Aki Bekas (WI-002, 450 Kg) telah tersimpan di TPS selama 85 hari sejak masuk tanggal 2026-03-05. Jadwalkan transporter pembuangan sebelum tanggal 2026-06-03.",
    read: false
  },
  {
    id: "AL-004",
    timestamp: "2026-05-29T00:00:00Z",
    type: "Info",
    category: "Guarantee",
    title: "Reminder Submit Pelaporan Reklamasi",
    message: "Reminder mingguan: Hubungi bambang Trimurti untuk melengkapi data foto drone areal reklamasi Disposal IPD-01.",
    read: true
  }
];

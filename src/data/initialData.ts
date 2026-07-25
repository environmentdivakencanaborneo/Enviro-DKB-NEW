/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  WastewaterData, 
  SurfaceWaterData,
  RainfallData, 
  NurseryData, 
  ReclamationPlan, 
  ReclamationGuarantee, 
  WasteIn, 
  WasteOut, 
  EnvironmentalDocument, 
  ComplianceCalendarEvent, 
  AlertNotification,
  EnvironmentalCost,
  SolidWasteData,
  ComplianceMatrixData,
  IncidentData,
  RegulatoryWatchData
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
    status: 'Safe',
    monitoringType: 'Harian'
  },
  {
    id: "WW-002",
    date: "2026-05-25",
    location: "Sump Barat Area Disposal (KPL-02)",
    officer: "Siti Rahma",
    ph: 5.8, // PP No. 22 Tahun 2021 limit is 6.0, so this is out of limits !
    tss: 224, // TSS 224 kini di bawah ambang SK Pertek DKB (300 mg/L), status "Exceeded" tetap berlaku HANYA karena pH 5.8 melanggar batas 6.0-9.0. JANGAN ubah field status.
    debit: 1.450,
    fe: 5.6,
    mn: 3.2,
    status: 'Exceeded',
    monitoringType: 'Bulanan'
  },
  {
    id: "WW-003",
    date: "2026-05-26",
    location: "Inlet Water Treatment Blok Timur (KPL-03)",
    officer: "Dwi Kuncoro",
    ph: 6.4,
    tss: 175, // TSS 175 jauh di bawah ambang baru 300 mg/L (85% dari 300 = 255)
    debit: 0.850,
    fe: 2.1,
    mn: 1.5,
    status: 'Safe',
    monitoringType: 'Harian'
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
    status: 'Safe',
    monitoringType: 'Bulanan'
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
    status: 'Safe',
    monitoringType: 'Harian'
  }
];

export const INITIAL_SURFACE_WATER: SurfaceWaterData[] = [
  {
    id: "SF-001",
    date: "2026-05-24",
    location: "Sungai Diva Hulu (Upstream KPL-01)",
    officer: "Siti Rahma",
    ph: 7.1,
    tss: 22,
    doVal: 6.2,
    bod: 1.8,
    cod: 14,
    fe: 0.18,
    mn: 0.06,
    status: "Safe",
    monitoringType: "Harian"
  },
  {
    id: "SF-002",
    date: "2026-05-25",
    location: "Sungai Diva Hilir (Downstream Outfall KPL-02)",
    officer: "Dwi Kuncoro",
    ph: 6.6,
    tss: 48,
    doVal: 4.3,
    bod: 2.6,
    cod: 22,
    fe: 0.27,
    mn: 0.09,
    status: "Warning",
    monitoringType: "Harian"
  },
  {
    id: "SF-003",
    date: "2026-05-27",
    location: "Sungai Diva Hilir (Downstream Outfall KPL-02)",
    officer: "Dwi Kuncoro",
    ph: 7.0,
    tss: 30,
    doVal: 5.5,
    bod: 2.0,
    cod: 16,
    fe: 0.2,
    mn: 0.07,
    status: "Safe",
    monitoringType: "Harian"
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
    realizedSizeHa: 8.2,
    targetYear: 2026,
    realizedYear: 2026,
    plantType: "Sengon Laut & Trembesi",
    realizedPlantType: "Sengon Laut & Trembesi",
    method: "Hydroseeding & Pot Tanam Campuran",
    realizedMethod: "Hydroseeding & Pot Campuran",
    estimatedCost: 375000000, // Rp 375.000.000
    realizedCost: 250000000,
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
    realizedSizeHa: 8.4,
    targetYear: 2025,
    realizedYear: 2025,
    plantType: "Johar & Cover Crops",
    realizedPlantType: "Johar, Trembesi & Cover Crops",
    method: "Pot Tanam Langsung",
    realizedMethod: "Pot Tanam Langsung & Seeding",
    estimatedCost: 220000000,
    realizedCost: 225000000,
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
    wasteType: "Minyak Pelumas Bekas",
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
    wasteType: "Aki / Baterai Bekas",
    source: "Line Hauler Maintenance Pit Timur",
    weightKg: 450,
    characteristic: "Corrosive",
    code: "A102d",
    tpsLocation: "TPS B3 Area Workshop Utama",
    officer: "Maman Suherman"
  },
  {
    id: "WI-003",
    dateIn: "2026-05-24",
    wasteType: "Filter Oli Bekas",
    source: "Service Unit Tyre Crane",
    weightKg: 320,
    characteristic: "Flammable",
    code: "B109d",
    tpsLocation: "TPS B3 Area Port Stockpile",
    officer: "Imron Rosyadi"
  },
  {
    id: "WI-004",
    dateIn: "2026-05-26",
    wasteType: "Kemasan Bekas B3",
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
    dateOut: "2026-05-20",
    wasteType: "Minyak Pelumas Bekas",
    weightKg: 2000,
    destination: "PT Pengolah Limbah Nusantara, Karawang",
    transporter: "PT Trans Cita B3 Mandiri",
    manifestNo: "MAN-B3-2026-00412",
    vehicleNo: "B 9042 UIT",
    driverName: "Karyo Subagio",
    recipient: "PT PL Nusantara (Surya Saputra)"
  },
  {
    id: "WO-002",
    dateOut: "2026-05-26",
    wasteType: "Filter Oli Bekas",
    weightKg: 300,
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
    type: "Pertek Air Limbah",
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
    type: "Persetujuan Lingkungan",
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
  },
  {
    id: "DOC-005",
    name: "Persetujuan Rencana Reklamasi Periode 2026-2030 Sektor Barat & Timur",
    type: "Persetujuan Rencana Reklamasi",
    docNo: "344.K/MB.07/DJB/2025",
    issuedDate: "2025-08-12",
    expiryDate: "2030-08-12",
    status: "Active",
    pic: "Indra Sukma",
    fileSize: "18.4 MB"
  },
  {
    id: "DOC-006",
    name: "Persetujuan Dokumen Rencana Pasca Tambang KPL Utama",
    type: "Lainnya",
    docNo: "344.K/PascaTambang-ESDM/2025",
    issuedDate: "2025-10-05",
    expiryDate: "N/A",
    status: "Active",
    pic: "Hani Puspita",
    fileSize: "22.5 MB"
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
    message: "Dari pengujian sampling air limbah di Sump Barat Area Disposal (KPL-02), didapatkan nilai pH 5.8 (Baku Mutu: 6-9) dan TSS 224 mg/L (Baku Mutu: 200 mg/L). Lakukan treatment kapur segera.",
    read: false,
    createdBy: 'system'
  },
  {
    id: "AL-002",
    timestamp: "2026-05-27T08:00:00Z",
    type: "Warning",
    category: "Permit",
    title: "Masa Berlaku Izin IPAL SP-04 Segera Berakhir",
    message: "Masa berlaku SK No 503/IPAL-LH/DPM-PTSP/2021 akan berakhir pada 2026-08-15 (~78 hari lagi). Berkas perpanjangan harus diajukan minimal 60 hari sebelum tanggal kadaluarsa.",
    read: false,
    createdBy: 'system'
  },
  {
    id: "AL-003",
    timestamp: "2026-05-28T16:50:00Z",
    type: "Warning",
    category: "B3 Waste",
    title: "Limbah Aki / Baterai Bekas Mendekati Batas Penyimpanan 90 Hari",
    message: "Limbah Aki / Baterai Bekas (WI-002, 450 Kg) telah tersimpan di TPS selama 85 hari sejak masuk tanggal 2026-03-05. Jadwalkan transporter pembuangan sebelum tanggal 2026-06-03.",
    read: false,
    createdBy: 'system'
  },
  {
    id: "AL-004",
    timestamp: "2026-05-29T00:00:00Z",
    type: "Info",
    category: "Guarantee",
    title: "Reminder Submit Pelaporan Reklamasi",
    message: "Reminder mingguan: Hubungi bambang Trimurti untuk melengkapi data foto drone areal reklamasi Disposal IPD-01.",
    read: true,
    createdBy: 'system'
  }
];

export const INITIAL_ENVIRONMENTAL_COSTS: EnvironmentalCost[] = [
  {
    id: "EC-001",
    year: 2026,
    period: "Januari",
    category: "Pemantauan Kualitas Lingkungan",
    plannedOpex: 120000000,
    plannedCapex: 45000000,
    realizedOpex: 115000000,
    realizedCapex: 48000000,
    notes: "Pengujian sampling air & udara kuartal pertama. Overlap biaya pembelian probe pH baru.",
    officer: "Aditya Perkasa"
  },
  {
    id: "EC-002",
    year: 2026,
    period: "Februari",
    category: "Reklamasi & Revegetasi",
    plannedOpex: 280000000,
    plannedCapex: 150000000,
    realizedOpex: 275000000,
    realizedCapex: 142000000,
    notes: "Persiapan lahan disposal blok barat & pemeliharaan nursery bibit Sengon dan Trembesi.",
    officer: "Aditya Perkasa"
  },
  {
    id: "EC-003",
    year: 2026,
    period: "Maret",
    category: "Pengelolaan Limbah Terpadu",
    plannedOpex: 85000000,
    plannedCapex: 40000000,
    realizedOpex: 89000000,
    realizedCapex: 35000000,
    notes: "Biaya transporter limbah B3 oli bekas & perbaikan pintu TPS B3.",
    officer: "Dwi Kuncoro"
  },
  {
    id: "EC-004",
    year: 2026,
    period: "April",
    category: "Water Treatment (KPL)",
    plannedOpex: 190000000,
    plannedCapex: 75000000,
    realizedOpex: 194500000,
    realizedCapex: 72000000,
    notes: "Pembelian kapur tohor dan tawas pengolahan air limpasan KPL-01 & KPL-02.",
    officer: "Aditya Perkasa"
  },
  {
    id: "EC-005",
    year: 2026,
    period: "Mei",
    category: "Izin LH & Administrasi",
    plannedOpex: 50000000,
    plannedCapex: 0,
    realizedOpex: 45000000,
    realizedCapex: 0,
    notes: "Penyusunan laporan RKL-RPL Semester I & konsultasi AMDAL adendum.",
    officer: "Siti Rahma"
  },
  {
    id: "EC-006",
    year: 2026,
    period: "Juni",
    category: "Pemantauan Kualitas Lingkungan",
    plannedOpex: 130000000,
    plannedCapex: 20000000,
    realizedOpex: 125000000,
    realizedCapex: 18000000,
    notes: "Rencana pengujian emisi cerobong genset dan debu jalan angkut batubara.",
    officer: "Aditya Perkasa"
  },
  {
    id: "EC-007",
    year: 2026,
    period: "Juli",
    category: "Reklamasi & Revegetasi",
    plannedOpex: 310000000,
    plannedCapex: 120000000,
    realizedOpex: 298000000,
    realizedCapex: 110000000,
    notes: "Pekerjaan penanaman 2.000 bibit pohon perintis di bekas area reklamasi Disposal IPD-01.",
    officer: "Aditya Perkasa"
  }
];

export const INITIAL_SOLID_WASTE: SolidWasteData[] = [
  {
    id: "SW-001",
    date: "2026-05-24",
    source: "Kantor Utama",
    organicKg: 8.5,
    inorganicKg: 4.2,
    residueKg: 1.3,
    compostedKg: 7.0,
    recycledKg: 3.5,
    officer: "Budi Santoso",
    transporterVehicle: "BK-1234-AB",
    finalDestination: "TPA Kota",
    notes: "Pemilahan berjalan baik"
  },
  {
    id: "SW-002",
    date: "2026-05-25",
    source: "Mess Karyawan (Khatulistiwa)",
    organicKg: 15.2,
    inorganicKg: 9.8,
    residueKg: 2.1,
    compostedKg: 12.0,
    recycledKg: 7.5,
    officer: "Budi Santoso",
    transporterVehicle: "BK-5678-CD",
    finalDestination: "TPA Kota",
    notes: "Pengomposan limbah dapur selesai"
  }
];

export const INITIAL_COMPLIANCE_MATRIX: ComplianceMatrixData[] = [
  {
    id: "MX-001",
    period: "H1-2026",
    aspect: "Kualitas Air",
    impactDetails: "Dampak air larian tambang dari Pit Utara dan Disposal terhadap kualitas air sungai penerima (Sungai Diva).",
    target: "Parameter pH (6.0 - 9.0) dan TSS (< 200 mg/L) di Outfall KPL-01 selalu memenuhi baku mutu.",
    status: "Taat",
    evidenceUrl: "https://example.com/evidence/water-h1-2026.pdf",
    notes: "Semua parameter harian dan bulanan terpantau di bawah ambang batas baku mutu.",
    createdAt: "2026-06-01T00:00:00Z",
    createdBy: "Siti Rahma"
  },
  {
    id: "MX-002",
    period: "H1-2026",
    aspect: "Pengelolaan Limbah B3",
    impactDetails: "Penyimpanan limbah B3 (Oli bekas, filter bekas, baterai bekas) di TPS Berizin.",
    target: "Penyimpanan tidak melebihi batas waktu 90 hari dan manifest terkirim 100% via SIRAJA.",
    status: "Taat",
    evidenceUrl: "https://example.com/evidence/b3-h1-2026.pdf",
    notes: "Seluruh limbah B3 terangkut tepat waktu oleh transporter berizin resmi.",
    createdAt: "2026-06-02T00:00:00Z",
    createdBy: "Dwi Kuncoro"
  },
  {
    id: "MX-003",
    period: "H1-2026",
    aspect: "Kualitas Udara/Emisi",
    impactDetails: "Paparan debu jalan angkut batubara dan emisi gas buang dari Genset Powerhouse.",
    target: "Pengujian emisi genset semesteran di bawah baku mutu PermenLHK 11/2021 dan penyiraman jalan aktif.",
    status: "Belum Taat",
    notes: "Penyiraman jalan angkut kurang optimal saat siang hari yang berangin kencang. Sedang dievaluasi penambahan unit water truck.",
    createdAt: "2026-06-03T00:00:00Z",
    createdBy: "Aditya Perkasa"
  }
];

export const INITIAL_INCIDENTS: IncidentData[] = [
  {
    id: "INC-001",
    date: "2026-05-24",
    time: "08:30",
    category: "Tumpahan Hidrokarbon",
    location: "Workshop Utama KM 4",
    chronology: "Pecahnya selang hidrolik pada unit excavator EX-201 saat melakukan service rutin di bay 2, menyebabkan oli hidrolik tumpah ke lantai workshop.",
    firstAction: "Petugas mekanik segera menyebarkan serbuk gergaji dan oil absorbent pad untuk melokalisir tumpahan, lalu membersihkan sisa ceceran dengan pasir.",
    status: "Ditutup",
    environmentalLoss: "Tumpahan oli hidrolik sekitar 15 liter, terlokalisir seluruhnya di dalam area oil trap workshop, tidak mengalir ke lingkungan luar.",
    documentationUrl: "https://example.com/incidents/inc-001.pdf",
    reporter: "Andi Wijaya (Mekanik)",
    createdAt: "2026-05-24T09:00:00Z",
    createdBy: "Andi Wijaya"
  },
  {
    id: "INC-002",
    date: "2026-05-28",
    time: "14:15",
    category: "Air Asam Tambang",
    location: "Sektor Barat Settling Pond 3",
    chronology: "Terjadinya rembesan air asam tambang melalui dinding tanggul pembatas yang mengalami keretakan mikro pasca hujan lebat berdurasi panjang.",
    firstAction: "Tim HSE memasang barikade darurat dan menaburkan kapur tohor (neutralizer) langsung di area rembesan untuk menaikkan pH air larian.",
    status: "Investigasi",
    environmentalLoss: "Limpasan air asam dengan pH 4.5 merembes ke drainase perimeter sepanjang +/- 10 meter.",
    documentationUrl: "https://example.com/incidents/inc-002.pdf",
    reporter: "Siti Rahma (HSE Officer)",
    createdAt: "2026-05-28T15:00:00Z",
    createdBy: "Siti Rahma"
  }
];

export const INITIAL_REGULATORY_WATCH: RegulatoryWatchData[] = [
  {
    id: "REG-001",
    source: "KLHK",
    regulationNo: "Permen LHK No. 6 Tahun 2021",
    about: "Tata Cara dan Persyaratan Pengelolaan Limbah Bahan Berbahaya dan Beracun.",
    issueDate: "2021-04-01",
    implication: "Mewajibkan integrasi pelaporan manifes elektronik (SIRAJA) dengan sistem internal perusahaan serta pembatasan penyimpanan maksimal sesuai kategori limbah.",
    status: "Berlaku",
    link: "https://jdih.menlhk.go.id/new/index.php/search/details?id=5810",
    createdAt: "2026-05-01T00:00:00Z",
    createdBy: "Siti Rahma"
  },
  {
    id: "REG-002",
    source: "ESDM",
    regulationNo: "Kepmen ESDM No. 1827 K/30/MEM/2018",
    about: "Pedoman Pelaksanaan Kaidah Teknik Pertambangan yang Baik.",
    issueDate: "2018-05-07",
    implication: "Mengatur kewajiban penyusunan rencana reklamasi 5 tahunan, jaminan reklamasi, serta jaminan pascatambang secara detail dan berkala.",
    status: "Berlaku",
    link: "https://jdih.esdm.go.id/index.php/search/details?id=2551",
    createdAt: "2026-05-02T00:00:00Z",
    createdBy: "Bambang Trimurti"
  },
  {
    id: "REG-003",
    source: "KLHK",
    regulationNo: "Rancangan Permen LHK Standar Baku Mutu Emisi Cerobong 2026",
    about: "Standar Baku Mutu Emisi Sumber Tidak Bergerak bagi Usaha dan/atau Kegiatan Pertambangan.",
    issueDate: "2026-03-15",
    implication: "Kemungkinan pengetatan ambang batas emisi particulate dan NOx untuk genset berkapasitas besar (>500 KW). Perusahaan perlu mempersiapkan audit emisi genset berkala.",
    status: "Draft",
    createdAt: "2026-05-03T00:00:00Z",
    createdBy: "Aditya Perkasa"
  }
];


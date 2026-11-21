import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWasteLedger,
  getAvailableStockAtDate,
  simulateOutflowValidation,
} from '../src/utils/wasteLedger';
import { getMaxStorageDaysForWaste, WasteCatalogItem } from '../src/constants/wasteCatalog';
import type { WasteIn, WasteOut } from '../src/types';

const TEST_CATALOG: WasteCatalogItem[] = [
  {
    code: 'B105d',
    name: 'Oli Bekas / Pelumas Bekas',
    subCategory: 'Kategori 2',
    maxStorageDays: 90,
    storageBasis: 'PP 22/2021 Lamp. IX (Kategori 2 >50 kg/hari — 90 hari)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'Terverifikasi',
  },
  {
    code: 'A102d',
    name: 'Aki / Baterai Bekas',
    subCategory: 'Kategori 1',
    maxStorageDays: 180,
    storageBasis: 'PP 22/2021 (Kategori 1 <50 kg/hari — 180 hari, perlu cek Rintek)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'PERLU VERIFIKASI',
  },
  {
    code: 'B107d',
    name: 'Kemasan Terkontaminasi B3',
    subCategory: 'Kategori 2',
    maxStorageDays: 365,
    storageBasis: 'PP 22/2021 (Kategori 2 <50 kg/hari — 365 hari)',
    effectiveDate: '2021-02-02',
    verificationStatus: 'Terverifikasi',
  },
];

describe('Limbah B3 — FIFO Ledger, Masa Simpan & Koreksi Stok (Section 7.C)', () => {
  it('1. Jenis limbah dengan masa simpan berbeda (90 / 180 / 365 hari)', () => {
    const r90 = getMaxStorageDaysForWaste('Oli Bekas / Pelumas Bekas', 'B105d', TEST_CATALOG);
    const r180 = getMaxStorageDaysForWaste('Aki / Baterai Bekas', 'A102d', TEST_CATALOG);
    const r365 = getMaxStorageDaysForWaste('Kemasan Terkontaminasi B3', 'B107d', TEST_CATALOG);

    assert.equal(r90.maxStorageDays, 90);
    assert.equal(r180.maxStorageDays, 180);
    assert.equal(r365.maxStorageDays, 365);

    const wasteIn: WasteIn[] = [
      {
        id: 'WI-1',
        dateIn: '2026-01-01',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        source: 'WS',
        weightKg: 100,
        characteristic: 'Flammable',
        code: 'B105d',
        tpsLocation: 'TPS A',
        officer: 'Budi',
      },
      {
        id: 'WI-2',
        dateIn: '2026-01-01',
        wasteType: 'Kemasan Terkontaminasi B3',
        source: 'WS',
        weightKg: 50,
        characteristic: 'Toxic',
        code: 'B107d',
        tpsLocation: 'TPS B',
        officer: 'Budi',
      },
    ];

    const ledger = buildWasteLedger(wasteIn, [], { asOfDate: '2026-04-11', catalog: TEST_CATALOG });
    assert.equal(ledger.inById['WI-1'].maxStorageDays, 90);
    assert.equal(ledger.inById['WI-1'].daysInTps, 100);
    assert.equal(ledger.inById['WI-1'].daysRemaining, -10);

    assert.equal(ledger.inById['WI-2'].maxStorageDays, 365);
    assert.equal(ledger.inById['WI-2'].daysInTps, 100);
    assert.equal(ledger.inById['WI-2'].daysRemaining, 265);
  });

  it('2. Tanggal penyimpanan berbeda dialokasikan FIFO dari batch terlama ke terbaru', () => {
    const wasteIn: WasteIn[] = [
      {
        id: 'WI-NEWER',
        dateIn: '2026-02-15',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        source: 'WS',
        weightKg: 80,
        characteristic: 'Flammable',
        code: 'B105d',
        tpsLocation: 'TPS A',
        officer: 'Budi',
      },
      {
        id: 'WI-OLDER',
        dateIn: '2026-02-01',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        source: 'WS',
        weightKg: 100,
        characteristic: 'Flammable',
        code: 'B105d',
        tpsLocation: 'TPS A',
        officer: 'Budi',
      },
    ];
    const wasteOut: WasteOut[] = [
      {
        id: 'WO-1',
        dateOut: '2026-02-20',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        weightKg: 120,
        destination: 'Pengolah Resmi',
        manifestNo: 'MAN-01',
        transporter: 'PT Transport',
        vehicleNo: 'KT 1234 AB',
        driverName: 'Slamet',
        recipient: 'PT Pengolah',
      },
    ];

    const ledger = buildWasteLedger(wasteIn, wasteOut, { asOfDate: '2026-03-01', catalog: TEST_CATALOG });
    assert.equal(ledger.inById['WI-OLDER'].weightRemaining, 0);
    assert.equal(ledger.inById['WI-OLDER'].status, 'Habis');
    assert.equal(ledger.inById['WI-NEWER'].weightRemaining, 60);
    assert.equal(ledger.inById['WI-NEWER'].status, 'Sebagian Keluar');
    assert.deepEqual(ledger.outById['WO-1'].allocations, [
      { inId: 'WI-OLDER', dateIn: '2026-02-01', kg: 100 },
      { inId: 'WI-NEWER', dateIn: '2026-02-15', kg: 20 },
    ]);
  });

  it('3 & 4. Transaksi keluar sebelum dan setelah tanggal pemeriksaan (asOfDate cutoff)', () => {
    const wasteIn: WasteIn[] = [
      {
        id: 'WI-1',
        dateIn: '2026-03-01',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        source: 'WS',
        weightKg: 200,
        characteristic: 'Flammable',
        code: 'B105d',
        tpsLocation: 'TPS A',
        officer: 'Budi',
      },
    ];
    const wasteOut: WasteOut[] = [
      {
        id: 'WO-BEFORE',
        dateOut: '2026-03-05',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        weightKg: 50,
        destination: 'Pengolah',
        manifestNo: 'M-1',
        transporter: 'PT A',
        vehicleNo: 'KT 1111 XX',
        driverName: 'Dono',
        recipient: 'PT Pengolah',
      },
      {
        id: 'WO-AFTER',
        dateOut: '2026-03-20',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        weightKg: 150,
        destination: 'Pengolah',
        manifestNo: 'M-2',
        transporter: 'PT A',
        vehicleNo: 'KT 1111 XX',
        driverName: 'Dono',
        recipient: 'PT Pengolah',
      },
    ];

    const stockAtMar10 = getAvailableStockAtDate(
      wasteIn,
      wasteOut,
      'Oli Bekas / Pelumas Bekas',
      '2026-03-10'
    );
    assert.equal(stockAtMar10, 150);

    const ledgerMar10 = buildWasteLedger(wasteIn, wasteOut, {
      asOfDate: '2026-03-10',
      catalog: TEST_CATALOG,
    });
    assert.equal(ledgerMar10.stocks[0].currentStock, 150);
    assert.equal(ledgerMar10.outById['WO-AFTER'], undefined);
  });

  it('5 & 6. Stok negatif ditolak tanpa otorisasi, dan koreksi transaksi diizinkan hanya dengan otorisasi + alasan >= 5 karakter', () => {
    const wasteIn: WasteIn[] = [
      {
        id: 'WI-1',
        dateIn: '2026-03-01',
        wasteType: 'Oli Bekas / Pelumas Bekas',
        source: 'WS',
        weightKg: 100,
        characteristic: 'Flammable',
        code: 'B105d',
        tpsLocation: 'TPS A',
        officer: 'Budi',
      },
    ];
    const candidateOverOut: WasteOut = {
      id: 'WO-OVER',
      dateOut: '2026-03-05',
      wasteType: 'Oli Bekas / Pelumas Bekas',
      weightKg: 120,
      destination: 'Pengolah',
      manifestNo: 'M-OVER',
      transporter: 'PT A',
      vehicleNo: 'KT 2222 YY',
      driverName: 'Kasino',
      recipient: 'PT Pengolah',
    };

    const rejected = simulateOutflowValidation(wasteIn, [], candidateOverOut, false);
    assert.equal(rejected.isValid, false);
    assert.equal(rejected.shortfallKg, 20);
    assert.equal(rejected.availableKg, 100);

    const rejectedShortReason = simulateOutflowValidation(wasteIn, [], candidateOverOut, false, {
      authorized: true,
      reason: 'ok',
    });
    assert.equal(rejectedShortReason.isValid, false);

    const allowedWithAuth = simulateOutflowValidation(wasteIn, [], candidateOverOut, false, {
      authorized: true,
      reason: 'Koreksi selisih penimbangan jembatan timbang pengolah',
    });
    assert.equal(allowedWithAuth.isValid, true);
    assert.equal(allowedWithAuth.shortfallKg, 20);
  });

  it('7. Jenis limbah belum diverifikasi terhadap Rintek ditandai PERLU VERIFIKASI', () => {
    const wasteIn: WasteIn[] = [
      {
        id: 'WI-AKI',
        dateIn: '2026-03-01',
        wasteType: 'Aki / Baterai Bekas',
        source: 'WS',
        weightKg: 40,
        characteristic: 'Corrosive',
        code: 'A102d',
        tpsLocation: 'TPS A',
        officer: 'Budi',
      },
    ];
    const ledger = buildWasteLedger(wasteIn, [], { asOfDate: '2026-03-10', catalog: TEST_CATALOG });
    assert.equal(ledger.stocks[0].verificationStatus, 'PERLU VERIFIKASI');
    assert.equal(ledger.inById['WI-AKI'].verificationStatus, 'PERLU VERIFIKASI');

    const unknown = getMaxStorageDaysForWaste('Limbah Laboratorium Khusus', 'A106d', TEST_CATALOG);
    assert.equal(unknown.verificationStatus, 'PERLU VERIFIKASI');
  });
});

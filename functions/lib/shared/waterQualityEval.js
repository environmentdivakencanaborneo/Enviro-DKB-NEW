"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_INTERNAL_THRESHOLDS_VALUE = exports.MEDIA_PARAMETER_META = void 0;
exports.parseStrictNumber = parseStrictNumber;
exports.normalizeUnit = normalizeUnit;
exports.formatLocaleNumberStrict = formatLocaleNumberStrict;
exports.formatStandardLimitDisplay = formatStandardLimitDisplay;
exports.resolveEffectiveStandardsMap = resolveEffectiveStandardsMap;
exports.buildStandardSnapshotAndIds = buildStandardSnapshotAndIds;
exports.conclusionToLegacyStatus = conclusionToLegacyStatus;
exports.conclusionToDomesticStatus = conclusionToDomesticStatus;
exports.evaluateSampleCompliance = evaluateSampleCompliance;
exports.normalizeStoredConclusion = normalizeStoredConclusion;
exports.getLiveEvaluation = getLiveEvaluation;
exports.buildReEvaluationPreview = buildReEvaluationPreview;
exports.MEDIA_PARAMETER_META = {
    air_limbah: [
        { key: 'ph', label: 'pH', defaultUnit: '-', decimals: { min: 1, max: 2 } },
        { key: 'tss', label: 'TSS', defaultUnit: 'mg/L', decimals: { min: 0, max: 1 } },
        { key: 'debit', label: 'Debit', defaultUnit: 'm³/s', decimals: { min: 1, max: 3 }, isMonitoredOnlyByDefault: true },
        { key: 'fe', label: 'Besi (Fe)', defaultUnit: 'mg/L', decimals: { min: 1, max: 3 } },
        { key: 'mn', label: 'Mangan (Mn)', defaultUnit: 'mg/L', decimals: { min: 1, max: 3 } },
    ],
    air_permukaan: [
        { key: 'ph', label: 'pH', defaultUnit: '-', decimals: { min: 1, max: 2 } },
        { key: 'tss', label: 'TSS', defaultUnit: 'mg/L', decimals: { min: 0, max: 1 } },
        { key: 'doVal', label: 'DO', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'bod', label: 'BOD', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'cod', label: 'COD', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'fe', label: 'Besi Terlarut (Fe)', defaultUnit: 'mg/L', decimals: { min: 1, max: 3 } },
        { key: 'mn', label: 'Mangan Terlarut (Mn)', defaultUnit: 'mg/L', decimals: { min: 1, max: 3 } },
    ],
    air_limbah_domestik: [
        { key: 'ph', label: 'pH', defaultUnit: '-', decimals: { min: 1, max: 2 } },
        { key: 'bod', label: 'BOD', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'cod', label: 'COD', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'tss', label: 'TSS', defaultUnit: 'mg/L', decimals: { min: 0, max: 1 } },
        { key: 'oilGrease', label: 'Minyak & Lemak', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'ammonia', label: 'Amonia (NH3-N)', defaultUnit: 'mg/L', decimals: { min: 1, max: 2 } },
        { key: 'totalColiform', label: 'Total Coliform', defaultUnit: 'MPN/100mL', decimals: { min: 0, max: 0 } },
        { key: 'debitM3Day', label: 'Debit Harian', defaultUnit: 'm³/hari', decimals: { min: 1, max: 2 }, isMonitoredOnlyByDefault: true },
    ],
};
exports.DEFAULT_INTERNAL_THRESHOLDS_VALUE = {
    id: 'env_thresholds',
    warningRatio: 0.85,
    phMargin: 0.3,
    solidWasteTargetPct: 30,
};
/**
 * Mengurai angka secara ketat tanpa pernah mengubah null, undefined, string kosong,
 * NaN, atau Infinity menjadi 0.
 */
function parseStrictNumber(val) {
    if (val === null || val === undefined || val === '')
        return null;
    if (typeof val === 'number') {
        return Number.isFinite(val) ? val : null;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed)
            return null;
        const normalized = trimmed.replace(',', '.');
        const num = Number(normalized);
        return Number.isFinite(num) ? num : null;
    }
    return null;
}
/**
 * Normalisasi penulisan satuan agar perbandingan huruf/pangkat tidak gagal semu,
 * sambil tetap membedakan satuan yang memang berbeda (mis. mg/L vs g/L vs ppm).
 */
function normalizeUnit(unit) {
    if (!unit)
        return '-';
    const raw = unit.trim();
    if (!raw || raw === '-' || raw.toLowerCase() === 'unitless')
        return '-';
    const lower = raw.toLowerCase().replace(/\s+/g, '');
    if (lower === 'mg/l')
        return 'mg/L';
    if (lower === 'g/l')
        return 'g/L';
    if (lower === 'ug/l' || lower === 'µg/l')
        return 'µg/L';
    if (lower === 'm3/s' || lower === 'm³/s' || lower === 'm3/detik')
        return 'm³/s';
    if (lower === 'm3/hari' || lower === 'm³/hari' || lower === 'm3/day' || lower === 'm³/day')
        return 'm³/hari';
    if (lower === 'mpn/100ml' || lower === 'jumlah/100ml')
        return 'MPN/100mL';
    if (lower === 'ppm')
        return 'ppm';
    return raw;
}
function formatLocaleNumberStrict(num, minDec = 1, maxDec = 3) {
    if (typeof num !== 'number' || !Number.isFinite(num))
        return '-';
    const str = String(num);
    const rawDecimals = str.includes('.') ? str.split('.')[1].length : 0;
    const targetDec = Math.max(minDec, Math.min(maxDec, rawDecimals));
    return num.toLocaleString('id-ID', {
        minimumFractionDigits: minDec,
        maximumFractionDigits: targetDec,
    });
}
function formatStandardLimitDisplay(std) {
    if (!std)
        return 'Belum Ditetapkan';
    if (std.applicable === false)
        return 'Tidak Berlaku';
    if (std.verificationStatus === 'Perlu verifikasi' || std.effectiveStatus === 'MENUNGGU VERIFIKASI') {
        const hasMin = typeof std.minLimit === 'number' && Number.isFinite(std.minLimit);
        const hasMax = typeof std.maxLimit === 'number' && Number.isFinite(std.maxLimit);
        if (hasMin && hasMax)
            return `${std.minLimit} – ${std.maxLimit} (Perlu Verifikasi)`;
        if (hasMax)
            return `Maks ${std.maxLimit} (Perlu Verifikasi)`;
        if (hasMin)
            return `Min ${std.minLimit} (Perlu Verifikasi)`;
        return 'Perlu Verifikasi';
    }
    const hasMin = typeof std.minLimit === 'number' && Number.isFinite(std.minLimit);
    const hasMax = typeof std.maxLimit === 'number' && Number.isFinite(std.maxLimit);
    if (hasMin && hasMax) {
        return `${formatLocaleNumberStrict(std.minLimit, 1, 2)} – ${formatLocaleNumberStrict(std.maxLimit, 1, 2)}`;
    }
    if (hasMax)
        return `Maks ${formatLocaleNumberStrict(std.maxLimit, 0, 3)}`;
    if (hasMin)
        return `Min ${formatLocaleNumberStrict(std.minLimit, 0, 3)}`;
    return 'Bebas / Pantau';
}
function getEffectiveDateRank(std) {
    return std.effectiveFrom || std.decreeDate || '0000-00-00';
}
/**
 * Memilih baku mutu aktif paling spesifik untuk media, titik penaatan, dan tanggal sampling.
 */
function resolveEffectiveStandardsMap(standards, media, opts) {
    const result = {};
    if (!standards || standards.length === 0)
        return result;
    const targetLoc = opts?.locationCode?.trim().toUpperCase();
    const sampleDate = opts?.sampleDate?.trim();
    const targetClass = opts?.kelasAir;
    const eligible = standards.filter((s) => {
        if (s.media !== media)
            return false;
        if (!s.isActive)
            return false;
        if (s.effectiveStatus === 'DRAFT' || s.effectiveStatus === 'DIUBAH' || s.effectiveStatus === 'DICABUT') {
            return false;
        }
        if (opts?.standardId && s.id === opts.standardId) {
            return true;
        }
        if (s.effectiveFrom && sampleDate && s.effectiveFrom > sampleDate) {
            return false;
        }
        if (s.effectiveTo && sampleDate && sampleDate > s.effectiveTo) {
            return false;
        }
        if (s.locationCode) {
            if (!targetLoc || s.locationCode.trim().toUpperCase() !== targetLoc) {
                return false;
            }
        }
        if (media === 'air_permukaan' && s.kelasAir && targetClass && s.kelasAir !== targetClass) {
            return false;
        }
        return true;
    });
    for (const candidate of eligible) {
        const existing = result[candidate.parameterKey];
        if (!existing) {
            result[candidate.parameterKey] = candidate;
            continue;
        }
        const existingLocScore = existing.locationCode ? 10 : 0;
        const candidateLocScore = candidate.locationCode ? 10 : 0;
        const existingClassScore = existing.kelasAir && targetClass && existing.kelasAir === targetClass ? 5 : 0;
        const candidateClassScore = candidate.kelasAir && targetClass && candidate.kelasAir === targetClass ? 5 : 0;
        const existingIdBoost = opts?.standardId && existing.id === opts.standardId ? 20 : 0;
        const candidateIdBoost = opts?.standardId && candidate.id === opts.standardId ? 20 : 0;
        const existingTotal = existingLocScore + existingClassScore + existingIdBoost;
        const candidateTotal = candidateLocScore + candidateClassScore + candidateIdBoost;
        if (candidateTotal > existingTotal) {
            result[candidate.parameterKey] = candidate;
        }
        else if (candidateTotal === existingTotal) {
            if (getEffectiveDateRank(candidate) >= getEffectiveDateRank(existing)) {
                result[candidate.parameterKey] = candidate;
            }
        }
    }
    return result;
}
function buildStandardSnapshotAndIds(standards, media, opts) {
    const activeMap = resolveEffectiveStandardsMap(standards, media, opts);
    const snapshot = {};
    const idList = [];
    for (const [k, std] of Object.entries(activeMap).sort(([a], [b]) => a.localeCompare(b))) {
        if (std.id)
            idList.push(std.id);
        snapshot[k] = {
            id: std.id,
            minLimit: std.minLimit ?? null,
            maxLimit: std.maxLimit ?? null,
            unit: std.unit,
            basisRegulasi: std.basisRegulasi,
            approvalDocNo: std.approvalDocNo ?? null,
            verificationStatus: std.verificationStatus,
            effectiveStatus: std.effectiveStatus ?? null,
            applicable: std.applicable ?? true,
        };
    }
    return {
        standardId: idList.length > 0 ? idList.join(',').slice(0, 120) : undefined,
        standardSnapshot: Object.keys(snapshot).length > 0 ? snapshot : undefined,
    };
}
function evaluateVerifiedNumericAgainstLimit(value, minLimit, maxLimit, thresholds) {
    const hasMin = typeof minLimit === 'number' && Number.isFinite(minLimit);
    const hasMax = typeof maxLimit === 'number' && Number.isFinite(maxLimit);
    if (!hasMin && !hasMax)
        return 'dipantau';
    const warningRatio = thresholds.warningRatio ?? 0.85;
    const phMargin = thresholds.phMargin ?? 0.3;
    if (hasMin && hasMax) {
        if (value < minLimit || value > maxLimit)
            return 'tidak_memenuhi';
        if (value < minLimit + phMargin || value > maxLimit - phMargin)
            return 'mendekati';
        return 'memenuhi';
    }
    if (hasMax) {
        if (value > maxLimit)
            return 'tidak_memenuhi';
        if (value > maxLimit * warningRatio)
            return 'mendekati';
        return 'memenuhi';
    }
    if (hasMin) {
        if (value < minLimit)
            return 'tidak_memenuhi';
        if (value < minLimit + (minLimit * (1 - warningRatio)))
            return 'mendekati';
        return 'memenuhi';
    }
    return 'dipantau';
}
function conclusionToLegacyStatus(overall, hasWarning) {
    if (overall === 'TIDAK MEMENUHI')
        return 'Exceeded';
    if (overall === 'DATA TIDAK LENGKAP')
        return 'Incomplete';
    if (overall === 'BELUM DIEVALUASI')
        return 'Unevaluated';
    if (overall === 'TIDAK BERLAKU')
        return 'NotApplicable';
    return hasWarning ? 'Warning' : 'Safe';
}
function conclusionToDomesticStatus(overall, hasWarning) {
    if (overall === 'TIDAK MEMENUHI')
        return 'Tidak Memenuhi';
    if (overall === 'DATA TIDAK LENGKAP')
        return 'Data Tidak Lengkap';
    if (overall === 'BELUM DIEVALUASI')
        return 'Belum Dievaluasi';
    if (overall === 'TIDAK BERLAKU')
        return 'Tidak Berlaku';
    return hasWarning ? 'Warning' : 'Memenuhi';
}
/**
 * Evaluasi kepatuhan menyeluruh berbasis Master Baku Mutu dinamis.
 */
function evaluateSampleCompliance(media, record, options) {
    const thresholds = options.thresholds ?? exports.DEFAULT_INTERNAL_THRESHOLDS_VALUE;
    const sampleDate = options.sampleDate ||
        (typeof record.date === 'string' ? record.date : undefined);
    const locationCode = options.locationCode ||
        (typeof record.locationCode === 'string' && record.locationCode.trim()
            ? record.locationCode
            : typeof record.facilityName === 'string' && record.facilityName.trim()
                ? record.facilityName
                : typeof record.location === 'string' && record.location.trim()
                    ? record.location
                    : undefined);
    const kelasAir = options.kelasAir ||
        (typeof record.kelasAir === 'string'
            ? record.kelasAir
            : undefined);
    const activeMap = resolveEffectiveStandardsMap(options.standards, media, {
        locationCode,
        sampleDate,
        kelasAir,
        standardId: options.standardId,
    });
    const metas = exports.MEDIA_PARAMETER_META[media];
    const params = {};
    const paramList = [];
    const failedParams = [];
    const warningParams = [];
    const incompleteParams = [];
    const unverifiedParams = [];
    const notApplicableParams = [];
    const basisSet = new Set();
    let applicableCount = 0;
    let verifiedPassedCount = 0;
    let notApplicableStdCount = 0;
    for (const meta of metas) {
        const std = activeMap[meta.key];
        const parsedVal = parseStrictNumber(record[meta.key]);
        const display = formatLocaleNumberStrict(parsedVal, meta.decimals.min, meta.decimals.max);
        const sampleUnitRaw = options.unitMap?.[meta.key];
        if (!std) {
            const detail = {
                key: meta.key,
                label: meta.label,
                unit: sampleUnitRaw || meta.defaultUnit,
                value: parsedVal,
                display,
                limitDisplay: 'Belum Ditetapkan',
                status: 'belum_dievaluasi',
                note: 'Standar baku mutu aktif tidak ditemukan untuk periode/titik ini',
            };
            params[meta.key] = detail;
            paramList.push(detail);
            unverifiedParams.push(meta.label);
            continue;
        }
        if (std.basisRegulasi) {
            const docPart = std.approvalDocNo ? ` (${std.approvalDocNo})` : '';
            basisSet.add(`${std.basisRegulasi}${docPart}`);
        }
        if (std.applicable === false) {
            notApplicableStdCount++;
            notApplicableParams.push(std.parameterLabel || meta.label);
            const detail = {
                key: meta.key,
                label: std.parameterLabel || meta.label,
                unit: std.unit || meta.defaultUnit,
                expectedUnit: std.unit,
                value: parsedVal,
                display,
                limitDisplay: 'Tidak Berlaku',
                status: 'tidak_berlaku',
                note: 'Parameter tidak diwajibkan pada titik/izin ini',
                standard: std,
            };
            params[meta.key] = detail;
            paramList.push(detail);
            continue;
        }
        applicableCount++;
        const label = std.parameterLabel || meta.label;
        const expectedUnit = std.unit || meta.defaultUnit;
        const limitDisplay = formatStandardLimitDisplay(std);
        if (parsedVal === null) {
            const missingReasons = record.missingReasons && typeof record.missingReasons === 'object'
                ? record.missingReasons
                : {};
            const mr = missingReasons[meta.key];
            const reasonSuffix = mr?.reason
                ? `Alasan: ${mr.reason}${mr.note ? ` (${mr.note})` : ''}`
                : 'Nilai pengukuran kosong atau tidak valid';
            incompleteParams.push(mr?.reason ? `${label} (${mr.reason})` : label);
            const detail = {
                key: meta.key,
                label,
                unit: expectedUnit,
                expectedUnit,
                value: null,
                display: '-',
                limitDisplay,
                status: 'data_tidak_lengkap',
                note: reasonSuffix,
                standard: std,
            };
            params[meta.key] = detail;
            paramList.push(detail);
            continue;
        }
        if (sampleUnitRaw !== undefined && normalizeUnit(sampleUnitRaw) !== normalizeUnit(expectedUnit)) {
            incompleteParams.push(`${label} (satuan ${sampleUnitRaw} ≠ ${expectedUnit})`);
            const detail = {
                key: meta.key,
                label,
                unit: sampleUnitRaw,
                expectedUnit,
                value: parsedVal,
                display,
                limitDisplay,
                status: 'data_tidak_lengkap',
                note: `Satuan tidak sesuai (${sampleUnitRaw} vs ${expectedUnit})`,
                standard: std,
            };
            params[meta.key] = detail;
            paramList.push(detail);
            continue;
        }
        const isUnverified = std.verificationStatus === 'Perlu verifikasi' ||
            std.effectiveStatus === 'MENUNGGU VERIFIKASI';
        const hasMin = typeof std.minLimit === 'number' && Number.isFinite(std.minLimit);
        const hasMax = typeof std.maxLimit === 'number' && Number.isFinite(std.maxLimit);
        const isVerifiedMonitoredOnly = !isUnverified &&
            !hasMin &&
            !hasMax &&
            Boolean(meta.isMonitoredOnlyByDefault);
        if (isUnverified || (!hasMin && !hasMax && !isVerifiedMonitoredOnly)) {
            unverifiedParams.push(label);
            const detail = {
                key: meta.key,
                label,
                unit: expectedUnit,
                expectedUnit,
                value: parsedVal,
                display,
                limitDisplay,
                status: 'belum_dievaluasi',
                note: isUnverified
                    ? 'Baku mutu berstatus Perlu Verifikasi (dokumen izin resmi belum diverifikasi)'
                    : 'Ambang batas numerik belum ditetapkan pada master baku mutu',
                standard: std,
            };
            params[meta.key] = detail;
            paramList.push(detail);
            continue;
        }
        if (isVerifiedMonitoredOnly) {
            const detail = {
                key: meta.key,
                label,
                unit: expectedUnit,
                expectedUnit,
                value: parsedVal,
                display,
                limitDisplay,
                status: 'dipantau',
                standard: std,
            };
            params[meta.key] = detail;
            paramList.push(detail);
            continue;
        }
        const numResult = evaluateVerifiedNumericAgainstLimit(parsedVal, std.minLimit, std.maxLimit, thresholds);
        if (numResult === 'tidak_memenuhi') {
            failedParams.push(label);
        }
        else if (numResult === 'mendekati') {
            warningParams.push(label);
            verifiedPassedCount++;
        }
        else if (numResult === 'memenuhi') {
            verifiedPassedCount++;
        }
        const detail = {
            key: meta.key,
            label,
            unit: expectedUnit,
            expectedUnit,
            value: parsedVal,
            display,
            limitDisplay,
            status: numResult,
            note: numResult === 'mendekati' ? 'mendekati batas internal' : undefined,
            standard: std,
        };
        params[meta.key] = detail;
        paramList.push(detail);
    }
    const matchedAnyStandard = Object.keys(activeMap).length > 0;
    let overall;
    let evaluationReason;
    if (!matchedAnyStandard) {
        overall = 'BELUM DIEVALUASI';
        evaluationReason = 'Tidak terdapat standar baku mutu aktif yang berlaku pada tanggal dan titik pemantauan ini.';
    }
    else if (applicableCount === 0 && notApplicableStdCount > 0) {
        overall = 'TIDAK BERLAKU';
        evaluationReason = 'Seluruh parameter pada titik pemantauan ini ditandai Tidak Berlaku sesuai konfigurasi izin.';
    }
    else if (failedParams.length > 0) {
        overall = 'TIDAK MEMENUHI';
        const extras = [];
        if (incompleteParams.length > 0)
            extras.push(`data tidak lengkap: ${incompleteParams.join(', ')}`);
        if (unverifiedParams.length > 0)
            extras.push(`standar perlu verifikasi: ${unverifiedParams.join(', ')}`);
        evaluationReason = `Melampaui baku mutu pada parameter: ${failedParams.join(', ')}.${extras.length ? ` Catatan tambahan (${extras.join('; ')}).` : ''}`;
    }
    else if (incompleteParams.length > 0) {
        overall = 'DATA TIDAK LENGKAP';
        evaluationReason = `Data pengukuran tidak lengkap atau satuan tidak sesuai pada parameter: ${incompleteParams.join(', ')}.`;
    }
    else if (unverifiedParams.length > 0) {
        overall = 'BELUM DIEVALUASI';
        evaluationReason = `Belum dapat diterbitkan kesimpulan MEMENUHI karena standar parameter berikut masih Perlu Verifikasi / belum ditetapkan: ${unverifiedParams.join(', ')}.`;
    }
    else if (verifiedPassedCount > 0) {
        overall = 'MEMENUHI';
        evaluationReason = warningParams.length > 0
            ? `Memenuhi seluruh baku mutu terverifikasi (peringatan ambang internal pada: ${warningParams.join(', ')}).`
            : 'Seluruh parameter wajib tersedia dan memenuhi baku mutu terverifikasi.';
    }
    else {
        overall = 'BELUM DIEVALUASI';
        evaluationReason = 'Belum ada parameter dengan baku mutu terverifikasi untuk menyimpulkan kepatuhan.';
    }
    const standardsBasis = basisSet.size > 0
        ? Array.from(basisSet).join('; ')
        : 'Belum ada standar baku mutu terverifikasi yang berlaku';
    const hasWarning = warningParams.length > 0;
    return {
        overall,
        legacyStatus: conclusionToLegacyStatus(overall, hasWarning),
        domesticStatus: conclusionToDomesticStatus(overall, hasWarning),
        params,
        paramList,
        failedParams,
        warningParams,
        incompleteParams,
        unverifiedParams,
        notApplicableParams,
        standardsBasis,
        evaluationReason,
    };
}
function normalizeStoredConclusion(record) {
    const ev = record?.evaluationStatus;
    if (ev === 'MEMENUHI' ||
        ev === 'TIDAK MEMENUHI' ||
        ev === 'DATA TIDAK LENGKAP' ||
        ev === 'BELUM DIEVALUASI' ||
        ev === 'TIDAK BERLAKU') {
        return ev;
    }
    const st = record?.status;
    if (st === 'Safe' || st === 'Warning')
        return 'MEMENUHI';
    if (st === 'Exceeded')
        return 'TIDAK MEMENUHI';
    if (st === 'Incomplete')
        return 'DATA TIDAK LENGKAP';
    if (st === 'Unevaluated')
        return 'BELUM DIEVALUASI';
    if (st === 'NotApplicable')
        return 'TIDAK BERLAKU';
    const cs = record?.complianceStatus;
    if (cs === 'Memenuhi' || cs === 'Warning')
        return 'MEMENUHI';
    if (cs === 'Tidak Memenuhi')
        return 'TIDAK MEMENUHI';
    if (cs === 'Data Tidak Lengkap')
        return 'DATA TIDAK LENGKAP';
    if (cs === 'Belum Dievaluasi' || cs === 'Belum Ada Baku Mutu')
        return 'BELUM DIEVALUASI';
    if (cs === 'Tidak Berlaku')
        return 'TIDAK BERLAKU';
    return null;
}
function getLiveEvaluation(media, record, standards, thresholds) {
    const live = evaluateSampleCompliance(media, record, {
        standards,
        thresholds,
        locationCode: typeof record.locationCode === 'string' && record.locationCode.trim()
            ? record.locationCode
            : typeof record.facilityName === 'string' && record.facilityName.trim()
                ? record.facilityName
                : undefined,
        sampleDate: typeof record.date === 'string' ? record.date : undefined,
        kelasAir: typeof record.kelasAir === 'string'
            ? record.kelasAir
            : undefined,
        unitMap: record.unitMap,
    });
    const storedConclusion = normalizeStoredConclusion(record);
    const isStale = storedConclusion !== null && storedConclusion !== live.overall;
    return { live, storedConclusion, isStale };
}
function buildReEvaluationPreview(media, records, standards, thresholds, filter) {
    const fromDate = filter?.fromDate?.trim() || '';
    const toDate = filter?.toDate?.trim() || '';
    const locFilter = filter?.locationFilter?.trim().toLowerCase() || '';
    return records
        .filter((rec) => {
        const d = String(rec.date || '');
        if (fromDate && d < fromDate)
            return false;
        if (toDate && d > toDate)
            return false;
        if (locFilter) {
            const hay = `${rec.locationCode || ''} ${rec.location || ''} ${rec.facilityName || ''}`.toLowerCase();
            if (!hay.includes(locFilter))
                return false;
        }
        return true;
    })
        .map((rec) => {
        const locationCode = typeof rec.locationCode === 'string' && rec.locationCode.trim()
            ? rec.locationCode
            : typeof rec.facilityName === 'string' && rec.facilityName.trim()
                ? rec.facilityName
                : undefined;
        const sampleDate = typeof rec.date === 'string' ? rec.date : undefined;
        const kelasAir = typeof rec.kelasAir === 'string'
            ? rec.kelasAir
            : undefined;
        const { standardId, standardSnapshot } = buildStandardSnapshotAndIds(standards, media, {
            locationCode,
            sampleDate,
            kelasAir,
        });
        const { live, storedConclusion } = getLiveEvaluation(media, rec, standards, thresholds);
        const oldStatus = storedConclusion || String(rec.status || rec.complianceStatus || 'BELUM DIEVALUASI');
        const changed = oldStatus !== live.overall ||
            (media === 'air_limbah_domestik'
                ? rec.complianceStatus !== live.domesticStatus
                : rec.status !== live.legacyStatus);
        const causeParams = live.failedParams.length > 0
            ? live.failedParams
            : live.incompleteParams.length > 0
                ? live.incompleteParams
                : live.unverifiedParams.length > 0
                    ? live.unverifiedParams
                    : live.warningParams;
        return {
            id: String(rec.id),
            date: String(rec.date || '-'),
            locationLabel: String(rec.facilityName || rec.location || rec.locationCode || '-'),
            oldStatus,
            newStatus: live.overall,
            newLegacyStatus: live.legacyStatus,
            newDomesticStatus: live.domesticStatus,
            causeParams,
            changed,
            evaluationReason: live.evaluationReason,
            standardsBasis: live.standardsBasis,
            standardId,
            standardSnapshot,
        };
    })
        .sort((a, b) => b.date.localeCompare(a.date));
}
//# sourceMappingURL=waterQualityEval.js.map
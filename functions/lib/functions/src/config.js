"use strict";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfiguredFunctionsRegion = getConfiguredFunctionsRegion;
exports.buildDocumentTriggerOptions = buildDocumentTriggerOptions;
exports.buildCallableOptions = buildCallableOptions;
/**
 * Region Cloud Functions harus disamakan dengan region database Cloud Firestore proyek.
 * Jangan menebak region: isi env `DEM_FUNCTIONS_REGION` atau `FUNCTION_REGION` saat deploy
 * setelah memverifikasi lokasi database Firestore di Firebase Console / GCP CLI.
 */
function getConfiguredFunctionsRegion() {
    const raw = process.env.DEM_FUNCTIONS_REGION || process.env.FUNCTION_REGION || '';
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function buildDocumentTriggerOptions(document) {
    const region = getConfiguredFunctionsRegion();
    return region
        ? { document, region, maxInstances: 10 }
        : { document, maxInstances: 10 };
}
function buildCallableOptions() {
    const region = getConfiguredFunctionsRegion();
    return region
        ? {
            region,
            enforceAppCheck: true,
            maxInstances: 10,
        }
        : {
            enforceAppCheck: true,
            maxInstances: 10,
        };
}
//# sourceMappingURL=config.js.map
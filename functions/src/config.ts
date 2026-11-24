/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Region Cloud Functions harus disamakan dengan region database Cloud Firestore proyek.
 * Jangan menebak region: isi env `DEM_FUNCTIONS_REGION` atau `FUNCTION_REGION` saat deploy
 * setelah memverifikasi lokasi database Firestore di Firebase Console / GCP CLI.
 */
export function getConfiguredFunctionsRegion(): string | undefined {
  const raw = process.env.DEM_FUNCTIONS_REGION || process.env.FUNCTION_REGION || '';
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildDocumentTriggerOptions<T extends string>(document: T) {
  const region = getConfiguredFunctionsRegion();
  return region
    ? ({ document, region, maxInstances: 10 } as const)
    : ({ document, maxInstances: 10 } as const);
}

export function buildCallableOptions() {
  const region = getConfiguredFunctionsRegion();
  return region
    ? ({
        region,
        enforceAppCheck: true,
        maxInstances: 10,
      } as const)
    : ({
        enforceAppCheck: true,
        maxInstances: 10,
      } as const);
}

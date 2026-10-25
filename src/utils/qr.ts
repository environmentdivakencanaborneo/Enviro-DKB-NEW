/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';

const qrCache = new Map<string, string>();

/**
 * Generates a base64 QR Code data URL with in-memory token caching.
 */
export async function generateQrDataUrl(textOrUrl: string): Promise<string> {
  if (!textOrUrl) return '';

  if (qrCache.has(textOrUrl)) {
    return qrCache.get(textOrUrl)!;
  }

  try {
    const dataUrl = await QRCode.toDataURL(textOrUrl, {
      margin: 0,
      width: 256,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
    });
    qrCache.set(textOrUrl, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

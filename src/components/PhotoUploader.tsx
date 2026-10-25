/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface CompressedPhotoData {
  dataUrl: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  sizeBytes: number;
}

interface PhotoUploaderProps {
  currentPhoto: CompressedPhotoData | null;
  onPhotoSelected: (photo: CompressedPhotoData | null) => void;
  disabled?: boolean;
}

const MAX_DIMENSION = 1280;
const MAX_DATA_URL_LENGTH = 350000; // <= 350.000 characters
const QUALITY_STEPS = [0.72, 0.65, 0.55, 0.45, 0.35, 0.25, 0.18];

export async function compressSamplingImage(file: File): Promise<CompressedPhotoData> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan merupakan berkas gambar valid (JPG, PNG, WebP).');
  }

  // 1. EXIF orientation correction using createImageBitmap with 'from-image'
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }

  // 2. Compute proportional bounding box (max 1280 px on longest side)
  let width = bitmap.width;
  let height = bitmap.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Tidak dapat membuat konteks grafis kanvas browser.');
  }

  ctx.drawImage(bitmap, 0, 0, width, height);

  // 3. Stepwise JPEG quality reduction
  let dataUrl = '';
  for (const q of QUALITY_STEPS) {
    dataUrl = canvas.toDataURL('image/jpeg', q);
    if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
      break;
    }
  }

  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    const approxKb = Math.round(dataUrl.length / 1024);
    throw new Error(
      `Ukuran foto setelah kompresi masih melebihi batas 350 KB (${approxKb} KB). Harap pilih foto lain atau gunakan resolusi kamera lebih rendah.`
    );
  }

  const approxBytes = Math.round((dataUrl.length * 3) / 4);

  return {
    dataUrl,
    mimeType: 'image/jpeg',
    width,
    height,
    sizeBytes: approxBytes,
  };
}

export default function PhotoUploader({
  currentPhoto,
  onPhotoSelected,
  disabled = false,
}: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const compressed = await compressSamplingImage(file);
      onPhotoSelected(compressed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memproses foto sampling.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setErrorMessage(null);
    onPhotoSelected(null);
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || isProcessing}
        onChange={handleFileChange}
        className="hidden"
        id="sampling-photo-input"
      />

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Gagal Mengunggah Foto</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {currentPhoto ? (
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-40 h-32 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
              <img
                src={currentPhoto.dataUrl}
                alt="Foto Sampling Air Limbah"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-[9px] font-mono text-white px-1.5 py-0.5 rounded">
                {currentPhoto.width}×{currentPhoto.height}
              </span>
            </div>

            <div className="flex-1 space-y-1.5 text-left w-full">
              <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Foto Sampling Siap Disimpan</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Format: <strong className="font-mono text-slate-700">JPEG (EXIF Corrected)</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Ukuran URL: <strong className="font-mono text-slate-700">{Math.round(currentPhoto.dataUrl.length / 1024)} KB</strong> (Batas maks 350 KB)
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Ganti Foto
                </button>
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={handleRemove}
                  className="px-3 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!disabled && !isProcessing) {
              fileInputRef.current?.click();
            }
          }}
          className={`border-2 border-dashed border-slate-300 hover:border-teal-500 bg-slate-50/60 hover:bg-teal-50/20 rounded-2xl p-5 text-center cursor-pointer transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-2 py-3">
              <RefreshCw className="w-7 h-7 text-teal-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-700">
                Mengompresi foto & koreksi orientasi EXIF...
              </span>
              <span className="text-[10px] text-slate-400">
                Maksimal resolusi 1280px, batas &le; 350.000 karakter
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-1">
              <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Ambil Foto dari Kamera atau Pilih Berkas Gambar
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Kompresi otomatis browser sisi terpanjang maks 1280 px (JPEG &le; 350 KB)
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 font-semibold mt-1">
                <ImageIcon className="w-3.5 h-3.5" />
                Evidence Visual Pengambilan Sampel
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

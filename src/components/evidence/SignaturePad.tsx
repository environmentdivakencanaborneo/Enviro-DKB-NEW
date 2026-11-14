/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  initialSignature?: string | null;
  title?: string;
}

export default function SignaturePad({
  onSave,
  onCancel,
  initialSignature = null,
  title = 'Tanda Tangan Digital',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getCoordinates = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasStroke(true);
      };
      img.src = initialSignature;
    } else {
      setHasStroke(false);
    }
  }, [initialSignature]);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e.nativeEvent, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasStroke(true);
    setErrorMsg(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e.nativeEvent, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStroke(false);
    setErrorMsg(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) {
      setErrorMsg('Harap goreskan tanda tangan terlebih dahulu');
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      // Verify size <= 60.000 characters
      if (dataUrl.length > 60000) {
        setErrorMsg('Ukuran tanda tangan melebihi batas 60.000 karakter. Coba goreskan lebih ringkas.');
        return;
      }
      onSave(dataUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menyimpan tanda tangan');
    }
  };

  return (
    <div className="bg-bg-1 rounded-2xl p-5 border border-border-neon shadow-2xl max-w-md w-full">
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan rounded-lg">
            <PenTool className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-text-hi font-heading">{title}</h4>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-text-mid hover:text-text-hi flex items-center gap-1 px-2.5 py-1 rounded-md border border-border-subtle hover:bg-bg-2 transition-colors cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          Bersihkan
        </button>
      </div>

      <p className="text-[11px] text-text-mid mb-2">
        Gunakan kursor mouse atau sentuhan jari pada layar untuk membubuhkan tanda tangan.
      </p>

      {/* Canvas wrapper MUST remain white so #0f172a dark ink contrasts clearly */}
      <div className="relative border-2 border-dashed border-border-neon rounded-xl overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-40 cursor-crosshair block"
        />
        {!hasStroke && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-400 text-xs font-mono">
            Tanda Tangan di Sini
          </div>
        )}
      </div>

      {errorMsg && (
        <p className="text-xs text-neon-red mt-2 font-medium">{errorMsg}</p>
      )}

      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border-subtle">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-text-mid hover:text-text-hi hover:bg-bg-2 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasStroke}
          className="neon-btn-primary px-5 py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          Gunakan Tanda Tangan
        </button>
      </div>
    </div>
  );
}

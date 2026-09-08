import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { BarcodeView } from './BarcodeView';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import {
  Printer,
  X,
  Download,
  Check,
  RefreshCw,
  ExternalLink,
  Copy,
  Layers,
  Sparkles,
  Boxes,
  MapPin,
} from 'lucide-react';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

// Canvas helper: rounded rectangle
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Canvas helper: wrapped text
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number = 2
) {
  const words = text.split(' ');
  let currentLine = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(currentLine.trim() + '...', x, y);
        return;
      }
      ctx.fillText(currentLine.trim(), x, y);
      currentLine = words[n] + ' ';
      y += lineHeight;
    } else {
      currentLine = testLine;
    }
  }
  ctx.fillText(currentLine.trim(), x, y);
}

// Canvas helper: 1D industrial barcode
function drawBarcodeOnCanvas(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  totalWidth: number,
  height: number,
  showLabel: boolean = true
) {
  const bars = value.split('').flatMap((char) => {
    const code = char.charCodeAt(0);
    return [
      { width: (code % 3) + 1, isSpace: false },
      { width: ((code >> 2) % 2) + 1, isSpace: true },
      { width: ((code >> 1) % 3) + 1, isSpace: false },
      { width: 1, isSpace: true },
    ];
  });

  const totalUnits = bars.reduce((acc, b) => acc + b.width, 0) + 10;
  const unitWidth = totalWidth / totalUnits;

  let curX = x;
  ctx.fillStyle = '#111827';
  // Start guard
  ctx.fillRect(curX, y, unitWidth * 2, height);
  curX += unitWidth * 3;

  bars.forEach((bar) => {
    if (!bar.isSpace) {
      ctx.fillRect(curX, y, bar.width * unitWidth, height);
    }
    curX += bar.width * unitWidth;
  });

  // Stop guard
  curX += unitWidth;
  ctx.fillRect(curX, y, unitWidth * 2, height);

  if (showLabel) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillStyle = '#111827';
    ctx.fillText(value, x + totalWidth / 2, y + height + 24);
    ctx.textAlign = 'left';
  }
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { getProductPositions } = useProducts();
  const [labelType, setLabelType] = useState<'qr' | 'barcode' | 'both'>('qr');
  const [selectedPositionId, setSelectedPositionId] = useState<string>('all');
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [generatedPngUrl, setGeneratedPngUrl] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const hiddenQrRef = useRef<HTMLCanvasElement | null>(null);

  // Compute positions from the "Raktári Pozíciók" card
  const stockPositions = useMemo(() => {
    if (!product) return [];
    return getProductPositions(product.id);
  }, [product?.id, getProductPositions]);

  // Reset selected position when product changes
  useEffect(() => {
    setSelectedPositionId('all');
    setGeneratedPngUrl(null);
  }, [product?.id]);

  // Primary warehouse location derived from Raktári Pozíciók (fallback to product.location only if no warehouse position recorded)
  const warehouseLocation = useMemo(() => {
    if (!product) return '-';

    if (stockPositions.length > 0) {
      if (selectedPositionId !== 'all') {
        const found = stockPositions.find((sp) => sp.positionId === selectedPositionId);
        if (found) {
          return (found.positionName || found.positionId).trim();
        }
      }
      // "all": Unique position names from the Raktári Pozíciók card
      const names = Array.from(
        new Set(
          stockPositions
            .map((sp) => (sp.positionName || sp.positionId).trim())
            .filter(Boolean)
        )
      );
      if (names.length > 0) {
        return names.join(', ');
      }
    }

    // Fallback if no records on Raktári Pozíciók card
    return product.location?.trim() || '-';
  }, [product, stockPositions, selectedPositionId]);

  if (!isOpen || !product) return null;

  // Compute current today's date formatted according to Hungarian standard: YYYY.MM.DD.
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayFormatted = `${currentYear}.${currentMonth}.${currentDay}.`;
  const safeDateStr = `${currentYear}${currentMonth}${currentDay}`;
  const pngFileName = `worldwires_cimke_${product.id}_70x40mm_${safeDateStr}.png`;

  const handlePrint = () => {
    window.print();
  };

  // Generate high-resolution 1050x600 px (exact 70mm x 40mm at 381 DPI) canvas natively
  const renderLabelToCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const W = 1050;
    const H = 600;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // 1. Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // 2. Outer industrial border
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, W - 24, H - 24);

    // 3. Header bar (y: 12 to 84)
    ctx.beginPath();
    ctx.moveTo(12, 84);
    ctx.lineTo(W - 12, 84);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#111827';
    ctx.stroke();

    // Company Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('WORLD WIRES KFT.', 32, 48);

    // Category
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    const categoryText = (product.category || 'ALKATRÉSZ').toUpperCase();
    ctx.fillText(categoryText, W - 32, 48);
    ctx.textAlign = 'left';

    // 4. Footer bar (y: 520 to 588)
    ctx.beginPath();
    ctx.moveTo(12, 520);
    ctx.lineTo(W - 12, 520);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111827';
    ctx.stroke();

    // Manufacturer
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Gyártó: ', 32, 558);
    const mfgLabelW = ctx.measureText('Gyártó: ').width;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(product.manufacturer || 'World Wires Kft.', 32 + mfgLabelW, 558);

    // Current Date
    ctx.textAlign = 'right';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(todayFormatted, W - 32, 558);
    const dateValW = ctx.measureText(todayFormatted).width;

    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Dátum: ', W - 32 - dateValW - 10, 558);
    ctx.textAlign = 'left';

    // 5. Middle Content based on labelType
    // Helper to draw location text with responsive font size
    const drawLocationText = (
      x: number,
      y: number,
      baseSize: number = 30,
      maxWidth: number = 360
    ) => {
      let size = baseSize;
      const text = warehouseLocation;
      if (text.length > 24) size = Math.max(16, baseSize - 12);
      else if (text.length > 16) size = Math.max(20, baseSize - 8);
      else if (text.length > 10) size = Math.max(24, baseSize - 4);

      ctx.font = `bold ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = '#006067';
      ctx.fillText(text, x, y, maxWidth);
    };

    if (labelType === 'qr') {
      // Divider
      ctx.beginPath();
      ctx.moveTo(740, 84);
      ctx.lineTo(740, 520);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Product Name section
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('TERMÉK MEGNEVEZÉS:', 32, 116);

      ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      drawWrappedText(ctx, product.name, 32, 158, 680, 46, 2);

      // Product ID badge
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('TERMÉK ID:', 32, 268);

      ctx.font = 'bold 33px "JetBrains Mono", monospace';
      const idW = ctx.measureText(product.id).width;
      ctx.fillStyle = '#f1f5f9';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      drawRoundRect(ctx, 32, 280, idW + 30, 52, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.fillText(product.id, 47, 317);

      // Spec attributes divider
      ctx.beginPath();
      ctx.moveTo(32, 355);
      ctx.lineTo(715, 355);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Factory Code
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('GYÁRI KÓD:', 32, 388);
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(product.factoryCode || '-', 32, 426);

      // Location
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('RAKTÁRI HELY:', 380, 388);
      drawLocationText(380, 426, 30, 360);

      // Right Column: QR Code
      const qrEl = document.getElementById('export-qr-canvas-source') as HTMLCanvasElement;
      if (qrEl) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, 770, 115, 240, 240, 10);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrEl, 782, 127, 216, 216);

        ctx.textAlign = 'center';
        ctx.font = 'bold 26px "JetBrains Mono", monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(product.id, 890, 395);

        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('AZONOSÍTÓ KÓD', 890, 425);
        ctx.textAlign = 'left';
      }
    } else if (labelType === 'barcode') {
      // Product Name & ID
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('TERMÉK MEGNEVEZÉS:', 32, 116);

      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(product.name, 32, 158);

      ctx.textAlign = 'right';
      ctx.font = 'bold 32px "JetBrains Mono", monospace';
      ctx.fillStyle = '#006067';
      ctx.fillText(product.id, W - 32, 158);
      ctx.textAlign = 'left';

      // 1D Barcode in center
      drawBarcodeOnCanvas(ctx, product.id, 80, 195, 890, 130, true);

      // Attributes divider
      ctx.beginPath();
      ctx.moveTo(32, 385);
      ctx.lineTo(W - 32, 385);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('GYÁRI KÓD:', 32, 420);
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(product.factoryCode || '-', 32, 458);

      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('RAKTÁRI HELY:', 420, 420);
      drawLocationText(420, 458, 30, 560);
    } else {
      // 'both' mode
      ctx.beginPath();
      ctx.moveTo(760, 84);
      ctx.lineTo(760, 520);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#cbd5e1';
      ctx.stroke();

      // Left: Name, ID, Barcode, Details
      ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(product.name, 32, 130);

      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.fillStyle = '#006067';
      ctx.fillText(product.id, 32, 170);

      drawBarcodeOnCanvas(ctx, product.id, 32, 190, 690, 75, false);

      ctx.beginPath();
      ctx.moveTo(32, 310);
      ctx.lineTo(725, 310);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('GYÁRI KÓD: ', 32, 360);
      ctx.font = 'bold 26px "JetBrains Mono", monospace';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(product.factoryCode || '-', 160, 360);

      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('RAKTÁRI HELY: ', 32, 420);
      drawLocationText(180, 420, 28, 540);

      // Right: QR Code
      const qrEl = document.getElementById('export-qr-canvas-source') as HTMLCanvasElement;
      if (qrEl) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        drawRoundRect(ctx, 790, 130, 220, 220, 8);
        ctx.fill();
        ctx.stroke();

        ctx.drawImage(qrEl, 800, 140, 200, 200);

        ctx.textAlign = 'center';
        ctx.font = 'bold 24px "JetBrains Mono", monospace';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(product.id, 900, 400);
        ctx.textAlign = 'left';
      }
    }

    return canvas;
  };

  const handleSavePng = () => {
    setIsExportingPng(true);
    try {
      const canvas = renderLabelToCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedPngUrl(dataUrl);

      // Trigger automatic browser download
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = pngFileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            }, 1500);
          } else {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = pngFileName;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 1500);
          }
        },
        'image/png',
        1.0
      );
    } catch (err) {
      console.error('PNG generálási hiba:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!generatedPngUrl) return;
    try {
      const res = await fetch(generatedPngUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Vágólap hiba:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Hidden offscreen QR Canvas source for high-res drawing */}
      <div className="hidden" aria-hidden="true">
        <QRCodeCanvas
          id="export-qr-canvas-source"
          value={product.id}
          size={320}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="M"
          marginSize={1}
          ref={hiddenQrRef}
        />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006067] text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">
                Ipari Termékcímke (70 mm × 40 mm)
              </h3>
              <p className="text-[11px] text-stone-500">
                World Wires Kft. • Szabványos címkenyomtatás & PNG képmentés
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-print-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 bg-stone-100/90 flex flex-col items-center justify-center overflow-y-auto space-y-4">
          {/* Format selector & dimension badge */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-stone-600 font-bold uppercase tracking-wider">
                Kódformátum:
              </span>
              <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5 text-xs font-bold shadow-3xs">
                <button
                  type="button"
                  onClick={() => {
                    setLabelType('qr');
                    setGeneratedPngUrl(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    labelType === 'qr'
                      ? 'bg-[#006067] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  QR Kód
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLabelType('barcode');
                    setGeneratedPngUrl(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    labelType === 'barcode'
                      ? 'bg-[#006067] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Vonalkód
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLabelType('both');
                    setGeneratedPngUrl(null);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    labelType === 'both'
                      ? 'bg-[#006067] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Mindkettő
                </button>
              </div>
            </div>

            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-200/80 text-stone-700 text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5 text-[#006067]" />
              <span>70 mm × 40 mm</span>
            </div>
          </div>

          {/* Warehouse Position from Raktári Pozíciók card */}
          <div className="w-full bg-white/95 border border-stone-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-3xs text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Boxes className="w-4 h-4 text-[#006067] flex-shrink-0" />
              <span className="text-stone-800 font-bold text-[11px]">
                Raktári Pozíció (Raktári Pozíciók kártyáról):
              </span>
              {stockPositions.length === 0 && (
                <span className="text-amber-700 text-[11px] font-medium italic">
                  (Nincs rögzített készlet ezen a kártyán, alkatrész hely használva)
                </span>
              )}
            </div>

            {stockPositions.length > 1 ? (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPositionId('all');
                    setGeneratedPngUrl(null);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    selectedPositionId === 'all'
                      ? 'bg-[#006067] text-white shadow-xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300'
                  }`}
                  title="Minden olyan raktári pozíció megjelenítése a címkén, ahol a termék megtalálható"
                >
                  Összes pozíció ({stockPositions.length})
                </button>
                {stockPositions.map((sp) => (
                  <button
                    key={sp.positionId}
                    type="button"
                    onClick={() => {
                      setSelectedPositionId(sp.positionId);
                      setGeneratedPngUrl(null);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      selectedPositionId === sp.positionId
                        ? 'bg-[#006067] text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300'
                    }`}
                    title={`${sp.positionName} (${sp.quantity} db készlet)`}
                  >
                    {sp.positionName} ({sp.quantity} db)
                  </button>
                ))}
              </div>
            ) : stockPositions.length === 1 ? (
              <span className="font-bold text-[#006067] bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded text-[11px]">
                {stockPositions[0].positionName} ({stockPositions[0].quantity} db)
              </span>
            ) : (
              <span className="text-stone-500 font-mono text-[11px]">
                {product.location || 'Nincs megadva'}
              </span>
            )}
          </div>

          {/* 70mm x 40mm Printable Label (Aspect Ratio 7:4 -> 350px x 200px) */}
          <div className="p-3 bg-stone-200/60 rounded-xl border border-stone-300 flex items-center justify-center shadow-inner w-full">
            <div
              id="printable-label"
              className="w-[350px] h-[200px] bg-white text-stone-900 border-2 border-stone-900 rounded p-2.5 flex flex-col justify-between font-sans select-none shadow-md box-border overflow-hidden"
              style={{
                width: '350px',
                height: '200px',
                boxSizing: 'border-box',
              }}
            >
              {/* Top Header: Company name & Category */}
              <div className="flex items-center justify-between border-b-2 border-stone-900 pb-1 text-[10px] font-black uppercase tracking-wider leading-none">
                <span className="text-stone-950 font-black">WORLD WIRES KFT.</span>
                <span className="truncate max-w-[150px] font-bold text-stone-700">
                  {product.category || 'Alkatrész'}
                </span>
              </div>

              {/* Middle Section */}
              {labelType === 'qr' && (
                <div className="flex items-stretch justify-between gap-2 py-1 my-auto h-[135px]">
                  {/* Left Column: Product Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between pr-1">
                    <div>
                      <span className="text-[8.5px] text-stone-500 uppercase font-bold tracking-wider block">
                        Termék Megnevezés:
                      </span>
                      <h4
                        className="font-black text-stone-950 text-[14px] leading-snug line-clamp-2 mt-0.5"
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                    </div>

                    <div className="my-0.5">
                      <span className="text-[8px] text-stone-500 uppercase font-bold block">
                        Termék ID:
                      </span>
                      <span className="font-mono font-black text-[13px] text-stone-950 bg-stone-100 px-2 py-0.5 rounded border border-stone-300 inline-block">
                        {product.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-stone-700 pt-1 border-t border-stone-200">
                      <div>
                        <span className="text-stone-400 block text-[8px] uppercase">Gyári Kód:</span>
                        <span className="font-mono font-black text-[11px] text-stone-950 truncate block">
                          {product.factoryCode || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[8px] uppercase">Raktári Hely:</span>
                        <span
                          className="font-black text-[11px] text-[#006067] truncate block"
                          title={warehouseLocation}
                        >
                          {warehouseLocation}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: QR Code */}
                  <div className="w-[88px] flex-shrink-0 flex flex-col items-center justify-center border-l border-stone-300 pl-2">
                    <div className="bg-white p-1 rounded border border-stone-300 inline-flex items-center justify-center shadow-3xs">
                      <QRCodeSVG
                        value={product.id}
                        size={68}
                        bgColor="#ffffff"
                        fgColor="#111827"
                        level="M"
                        marginSize={1}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-black text-stone-900 mt-1 tracking-tight truncate max-w-[80px]">
                      {product.id}
                    </span>
                  </div>
                </div>
              )}

              {labelType === 'barcode' && (
                <div className="flex flex-col justify-between py-1 my-auto h-[135px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[8px] text-stone-500 uppercase font-bold block">
                        Termék Megnevezés:
                      </span>
                      <h4 className="font-black text-stone-950 text-[13.5px] leading-tight truncate">
                        {product.name}
                      </h4>
                    </div>
                    <span className="font-mono font-black text-[13px] text-stone-950 bg-stone-100 px-2 py-0.5 rounded border border-stone-300 flex-shrink-0">
                      {product.id}
                    </span>
                  </div>

                  <div className="py-1 flex items-center justify-center">
                    <BarcodeView
                      value={product.id}
                      mode="barcode"
                      height={32}
                      showText={true}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-stone-700 pt-1 border-t border-stone-200">
                    <div>
                      <span className="text-stone-400 text-[8px] uppercase">Gyári Kód: </span>
                      <span className="font-mono font-black text-[11px] text-stone-950">
                        {product.factoryCode || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 text-[8px] uppercase">Raktári Hely: </span>
                      <span
                        className="font-black text-[11px] text-[#006067] truncate"
                        title={warehouseLocation}
                      >
                        {warehouseLocation}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {labelType === 'both' && (
                <div className="flex items-stretch justify-between gap-2 py-1 my-auto h-[135px]">
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-stone-950 text-[12px] leading-tight truncate">
                        {product.name}
                      </h4>
                      <span className="font-mono font-black text-[11px] text-[#006067]">
                        {product.id}
                      </span>
                    </div>
                    <div className="py-0.5">
                      <BarcodeView
                        value={product.id}
                        mode="barcode"
                        height={20}
                        showText={false}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-stone-700 pt-0.5 border-t border-stone-200">
                      <div>
                        <span className="text-stone-400 uppercase text-[8px]">Hely: </span>
                        <span
                          className="font-black text-[10px] text-[#006067] truncate"
                          title={warehouseLocation}
                        >
                          {warehouseLocation}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 uppercase text-[8px]">Gyári: </span>
                        <span className="font-mono font-black text-[10px] text-stone-950 truncate">
                          {product.factoryCode || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-[78px] flex-shrink-0 flex flex-col items-center justify-center border-l border-stone-300 pl-1.5">
                    <div className="bg-white p-1 rounded border border-stone-300 inline-flex items-center justify-center">
                      <QRCodeSVG
                        value={product.id}
                        size={56}
                        bgColor="#ffffff"
                        fgColor="#111827"
                        level="M"
                        marginSize={1}
                      />
                    </div>
                    <span className="font-mono text-[9px] font-black text-stone-900 mt-0.5">
                      {product.id}
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Footer: CURRENT DATE */}
              <div className="flex items-center justify-between border-t border-stone-900 pt-1 text-[9px] leading-none text-stone-700">
                <div className="flex items-center gap-1">
                  <span className="text-stone-500">Gyártó: </span>
                  <span className="font-black text-[10.5px] text-stone-950">
                    {product.manufacturer || 'World Wires'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-stone-500">Dátum: </span>
                  <span className="font-mono font-black text-[10.5px] text-stone-950 bg-stone-100 px-1 py-0.5 rounded border border-stone-200">
                    {todayFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Generated PNG Panel if active */}
          {generatedPngUrl && (
            <div className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>A nagy felbontású 70×40 mm PNG címke elkészült!</span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono">1050 × 600 px</span>
              </div>

              {/* Action Buttons for PNG */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-emerald-200">
                {/* Direct Download Link */}
                <a
                  href={generatedPngUrl}
                  download={pngFileName}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Fájl Letöltése ({pngFileName})</span>
                </a>

                {/* Open in new tab (fail-safe for mobile / iframe) */}
                <a
                  href={generatedPngUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Megnyitás külön lapon – hosszan nyomva közvetlenül elmenthető"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kép Megnyitása</span>
                </a>

                {/* Copy to clipboard */}
                {navigator.clipboard && (
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Másolva!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Vágólapra</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-emerald-700/80">
                💡 Tipp: A letöltés automatikusan elindult. Ha a böngésző blokkolta, kattintson a „Fájl Letöltése” vagy a „Kép Megnyitása” gombra.
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3.5 sm:p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Bezárás
          </button>

          <div className="flex items-center gap-2">
            {/* Generate & Save PNG Button */}
            <button
              type="button"
              id="save-label-png-btn"
              onClick={handleSavePng}
              disabled={isExportingPng}
              className="px-4 py-2 bg-white hover:bg-emerald-50 text-stone-800 hover:text-emerald-900 border border-stone-300 hover:border-emerald-300 font-semibold rounded-lg text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Címke mentése PNG képként (1050×600 px / 70×40 mm)"
            >
              {isExportingPng ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#006067]" />
              ) : (
                <Download className="w-4 h-4 text-[#006067]" />
              )}
              <span>{isExportingPng ? 'Kép készítése...' : 'PNG Kép Mentése'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              id="execute-print-btn"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#006067] hover:bg-[#00474c] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Címke Nyomtatása</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



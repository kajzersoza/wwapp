import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface BarcodeViewProps {
  value: string;
  className?: string;
  height?: number;
  showText?: boolean;
  mode?: 'qr' | 'barcode' | 'both';
  qrSize?: number;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  className = '',
  height = 36,
  showText = true,
  mode = 'barcode',
  qrSize = 100,
}) => {
  if (!value) return null;

  if (mode === 'qr') {
    return (
      <div className={`flex flex-col items-center select-none ${className}`}>
        <div className="bg-white p-2.5 rounded-lg border border-stone-200 shadow-3xs inline-flex items-center justify-center">
          <QRCodeSVG
            value={value}
            size={qrSize}
            bgColor="#ffffff"
            fgColor="#1c1917"
            level="M"
            marginSize={1}
          />
        </div>
        {showText && (
          <span className="font-mono text-xs tracking-wider text-stone-800 font-bold mt-1.5 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
            {value}
          </span>
        )}
      </div>
    );
  }

  // Generate deterministic bar widths based on value chars for clean visual barcode rendering
  const bars = value.split('').flatMap((char: string) => {
    const code = char.charCodeAt(0);
    return [
      { width: (code % 3) + 1, isSpace: false },
      { width: ((code >> 2) % 2) + 1, isSpace: true },
      { width: ((code >> 1) % 3) + 1, isSpace: false },
      { width: 1, isSpace: true },
    ];
  });

  if (mode === 'both') {
    return (
      <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 select-none ${className}`}>
        <div className="flex flex-col items-center">
          <div className="bg-white p-2 rounded-lg border border-stone-200 shadow-3xs inline-flex items-center justify-center">
            <QRCodeSVG
              value={value}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#1c1917"
              level="M"
              marginSize={1}
            />
          </div>
          <span className="text-[10px] uppercase font-bold text-stone-400 mt-1">QR Kód</span>
        </div>

        <div className="flex flex-col items-center">
          <div
            className="flex items-stretch bg-white px-2 py-1 border border-stone-200 rounded"
            style={{ height: `${height}px` }}
          >
            {/* Start sentinel */}
            <div className="w-[2px] bg-stone-900 mr-[2px]" />
            <div className="w-[1px] bg-white mr-[2px]" />
            <div className="w-[2px] bg-stone-900 mr-[4px]" />

            {bars.map((bar, idx) => (
              <div
                key={idx}
                style={{ width: `${bar.width * 1.5}px` }}
                className={`h-full ${bar.isSpace ? 'bg-transparent' : 'bg-stone-900'}`}
              />
            ))}

            {/* Stop sentinel */}
            <div className="w-[2px] bg-stone-900 ml-[4px] mr-[2px]" />
            <div className="w-[1px] bg-white mr-[2px]" />
            <div className="w-[2px] bg-stone-900" />
          </div>
          <span className="text-[10px] uppercase font-bold text-stone-400 mt-1">Vonalkód</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div
        className="flex items-stretch bg-white px-2 py-1 border border-stone-200 rounded"
        style={{ height: `${height}px` }}
      >
        {/* Start sentinel */}
        <div className="w-[2px] bg-stone-900 mr-[2px]" />
        <div className="w-[1px] bg-white mr-[2px]" />
        <div className="w-[2px] bg-stone-900 mr-[4px]" />

        {bars.map((bar, idx) => (
          <div
            key={idx}
            style={{ width: `${bar.width * 1.5}px` }}
            className={`h-full ${bar.isSpace ? 'bg-transparent' : 'bg-stone-900'}`}
          />
        ))}

        {/* Stop sentinel */}
        <div className="w-[2px] bg-stone-900 ml-[4px] mr-[2px]" />
        <div className="w-[1px] bg-white mr-[2px]" />
        <div className="w-[2px] bg-stone-900" />
      </div>

      {showText && (
        <span className="font-mono text-[11px] tracking-wider text-stone-600 font-medium mt-0.5">
          {value}
        </span>
      )}
    </div>
  );
};


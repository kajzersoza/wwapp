import React from 'react';

interface BarcodeViewProps {
  value: string;
  className?: string;
  height?: number;
  showText?: boolean;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  className = '',
  height = 36,
  showText = true,
}) => {
  if (!value) return null;

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

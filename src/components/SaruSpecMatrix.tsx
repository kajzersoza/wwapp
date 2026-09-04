import React from 'react';
import { SaruSpec, SARU_CROSS_SECTIONS } from '../types';
import { Table, SlidersHorizontal, Ruler, MessageSquare, Info, FileText } from 'lucide-react';

interface SaruSpecMatrixProps {
  spec: SaruSpec;
  showHeader?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  highlightCrossSection?: string;
  onSelectCrossSection?: (crossSection: string) => void;
  variationIndex?: number;
  totalVariations?: number;
}

export const SaruSpecMatrix: React.FC<SaruSpecMatrixProps> = ({
  spec,
  showHeader = true,
  showMetadata = true,
  highlightCrossSection,
  onSelectCrossSection,
  variationIndex,
  totalVariations = 1,
}) => {
  const crossSections = SARU_CROSS_SECTIONS;

  // Helper getters for rows ensuring compatibility
  const getBeallitas = (cs: string) => spec.row1Beallitas?.[cs] || '';
  const getMagassag = (cs: string) => spec.row2Magassag?.[cs] || spec.row3Magassag?.[cs] || '';
  const getKeresztmetszetMegjegyzes = (cs: string) =>
    spec.row3KeresztmetszetMegjegyzes?.[cs] || spec.row2Vezetek?.[cs] || '';

  // Check which cross sections have data
  const hasAnyData = (cs: string) => {
    return Boolean(getBeallitas(cs) || getMagassag(cs) || getKeresztmetszetMegjegyzes(cs));
  };

  const activeCrossSectionsCount = crossSections.filter(hasAnyData).length;

  return (
    <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 md:p-6 shadow-2xs space-y-4">
      {/* 1. Header (SARUMAGASSÁG) */}
      {showHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e6f7f8] border border-[#a6e6ea] flex items-center justify-center text-[#006067] shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-stone-900 uppercase">
                  SARUMAGASSÁG
                </h2>
                {totalVariations > 1 && variationIndex && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    Variáció #{variationIndex} / {totalVariations}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <span className="border border-[#7be0e6] bg-[#e6f7f8]/70 text-[#006067] text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
              0.25 – 6.00 mm²
            </span>
          </div>
        </div>
      )}

      {/* 2. Top Info / Metadata Box */}
      {showMetadata && (
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3.5 space-y-3">
          {/* Row 1: CEL Kód, Gyári Kód, Saruzófej */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* CEL Kód */}
            <div className="bg-white px-4 py-2 rounded-lg border border-stone-300/80 shadow-2xs flex items-center justify-center text-center">
              <span className="font-mono font-bold text-sm sm:text-base text-stone-900 tracking-wide">
                {spec.productId || '-'}
              </span>
            </div>

            {/* Gyári Kód */}
            <div className="bg-white px-4 py-2 rounded-lg border border-stone-300/80 shadow-2xs flex items-center justify-center text-center">
              <span className="font-mono font-bold text-sm sm:text-base text-stone-900 tracking-wide">
                {spec.factoryCode || '-'}
              </span>
            </div>

            {/* Saruzófej */}
            <div className="bg-[#e6f7f8]/80 border border-[#7be0e6] px-4 py-2 rounded-lg flex items-center justify-center text-center">
              <span className="font-mono font-black text-sm sm:text-base text-[#006067] tracking-wide">
                {spec.feederTool || '-'}
              </span>
            </div>
          </div>

          {/* Row 2: FEJ HELY & SARU HELY Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* FEJ HELY */}
            <div className="inline-flex items-center gap-2 bg-amber-50/80 border border-amber-200 rounded-md px-2.5 py-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                FEJ HELY
              </span>
              <span className="font-bold text-amber-900 text-sm font-mono">
                {spec.feederLocation || '-'}
              </span>
            </div>

            {/* SARU HELY */}
            <div className="inline-flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 rounded-md px-2.5 py-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                SARU HELY
              </span>
              <span className="font-bold text-emerald-900 text-sm font-mono">
                {spec.saruLocation || '-'}
              </span>
            </div>
          </div>

          {/* Row 3: Count info */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600 pt-0.5">
            <Info className="w-3.5 h-3.5 text-[#006067] shrink-0" />
            <span>
              {activeCrossSectionsCount > 0
                ? `${activeCrossSectionsCount} / 12 keresztmetszet kitöltve`
                : 'Nincs rögzített keresztmetszeti adat'}
            </span>
          </div>
        </div>
      )}

      {/* 3. The Matrix Table - Compact first column, fitting without scrollbars on standard screens */}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-700">
              {/* Első név oszlop: Kisebb/kompakt méret a kérésnek megfelelően */}
              <th className="py-2.5 px-2.5 font-bold text-stone-800 w-[130px] min-w-[120px] max-w-[140px] border-r border-stone-200">
                <div className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5 text-[#006067] shrink-0" />
                  <span className="text-[11px] leading-tight font-bold">Keresztmetszet (mm²)</span>
                </div>
              </th>
              {crossSections.map((cs) => {
                const active = hasAnyData(cs);
                const isSelected = highlightCrossSection === cs;
                return (
                  <th
                    key={cs}
                    onClick={() => onSelectCrossSection && onSelectCrossSection(cs)}
                    className={`py-2 px-1 text-center font-mono transition-colors border-r border-stone-100 last:border-r-0 ${
                      onSelectCrossSection ? 'cursor-pointer hover:bg-teal-50' : ''
                    } ${
                      isSelected
                        ? 'bg-teal-100 text-[#006067]'
                        : active
                        ? 'text-stone-900 bg-stone-50/40'
                        : 'text-stone-400'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center min-h-[28px]">
                      <span className={`text-[11px] ${active ? 'font-black text-stone-900' : 'font-semibold text-stone-400'}`}>
                        {cs}
                      </span>
                      {active && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#006067] mt-0.5"></span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {/* Sor 1: Beállítás */}
            <tr className="hover:bg-stone-50/50 transition-colors">
              <td className="py-2 px-2.5 bg-white border-r border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-[#e6f7f8] text-[#006067] border border-[#a6e6ea] flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-stone-800 text-[11px]">Beállítás</span>
                </div>
              </td>
              {crossSections.map((cs) => {
                const val = getBeallitas(cs);
                const isSelected = highlightCrossSection === cs;
                return (
                  <td
                    key={`b-${cs}`}
                    className={`py-2 px-1 text-center font-mono text-xs border-r border-stone-100 last:border-r-0 ${
                      isSelected ? 'bg-teal-50' : ''
                    }`}
                  >
                    {val ? (
                      <span className="inline-block px-1.5 py-0.5 rounded border border-[#7be0e6] bg-[#e6f7f8] text-[#006067] font-bold text-[11px] shadow-2xs leading-tight">
                        {val}
                      </span>
                    ) : (
                      <span className="text-stone-300 font-normal">-</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Sor 2: Sarumagasság */}
            <tr className="hover:bg-stone-50/50 transition-colors">
              <td className="py-2 px-2.5 bg-white border-r border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                    <Ruler className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-stone-800 text-[11px]">Sarumagasság</span>
                </div>
              </td>
              {crossSections.map((cs) => {
                const val = getMagassag(cs);
                const isSelected = highlightCrossSection === cs;
                return (
                  <td
                    key={`m-${cs}`}
                    className={`py-2 px-1 text-center font-mono text-xs border-r border-stone-100 last:border-r-0 ${
                      isSelected ? 'bg-amber-50' : ''
                    }`}
                  >
                    {val ? (
                      <span className="inline-block px-1.5 py-0.5 rounded border border-[#ffb74d] bg-[#fff8e1] text-[#b78103] font-bold text-[11px] shadow-2xs leading-tight">
                        {val}
                      </span>
                    ) : (
                      <span className="text-stone-300 font-normal">-</span>
                    )}
                  </td>
                );
              })}
            </tr>

            {/* Sor 3: Keresztmetszet Megjegyzés */}
            <tr className="hover:bg-stone-50/50 transition-colors">
              <td className="py-2 px-2.5 bg-white border-r border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-stone-800 text-[10px] sm:text-[11px] leading-tight block">
                    Keresztmetszet Megjegyzés
                  </span>
                </div>
              </td>
              {crossSections.map((cs) => {
                const val = getKeresztmetszetMegjegyzes(cs);
                const isSelected = highlightCrossSection === cs;
                return (
                  <td
                    key={`km-${cs}`}
                    className={`py-2 px-1 text-center font-mono text-xs border-r border-stone-100 last:border-r-0 ${
                      isSelected ? 'bg-indigo-50' : ''
                    }`}
                  >
                    {val ? (
                      <span
                        className="inline-block px-1 py-0.5 rounded border border-indigo-200 bg-indigo-50/70 text-indigo-900 font-medium text-[10px] max-w-[80px] truncate leading-tight shadow-2xs"
                        title={val}
                      >
                        {val}
                      </span>
                    ) : (
                      <span className="text-stone-300 font-normal">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Megjegyzés Section (C oszlop) - Warm amber rounded card */}
      <div className="rounded-xl border border-amber-300/80 bg-amber-50/20 p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-amber-950 text-xs">Megjegyzés</span>
        </div>
        <div className="bg-white rounded-lg border border-stone-200/90 p-3 text-stone-900 text-xs font-medium min-h-[38px] flex items-center">
          {spec.note ? (
            <span>{spec.note}</span>
          ) : (
            <span className="text-stone-400 italic">Nincs rögzített megjegyzés ehhez a saruhoz.</span>
          )}
        </div>
      </div>
    </div>
  );
};

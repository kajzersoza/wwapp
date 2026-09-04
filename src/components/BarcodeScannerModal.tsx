import React, { useState, useEffect, useRef } from 'react';
import { useProducts } from '../context/ProductContext';
import {
  QrCode,
  Barcode,
  Search,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, selectProductById } = useProducts();
  const [scanInput, setScanInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLookup = (idToLook: string) => {
    const clean = idToLook.trim();
    if (!clean) return;

    // Search exact ID or factory code or name
    const found = products.find(
      (p) =>
        p.id.toLowerCase() === clean.toLowerCase() ||
        (p.factoryCode && p.factoryCode.toLowerCase() === clean.toLowerCase())
    );

    if (found) {
      selectProductById(found.id);
      onClose();
    } else {
      setErrorMsg(`Nem található termék a(z) "${clean}" azonosítóval.`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup(scanInput);
    }
  };

  const quickSamples = products.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#006067] text-white flex items-center justify-center">
              <Barcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Vonalkód & QR Szkenner</h3>
              <p className="text-[11px] text-stone-500">Termék ID vagy Gyári Kód beolvasása</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport with laser scan animation */}
        <div className="p-6 space-y-4">
          <div className="relative h-44 bg-stone-950 rounded-xl overflow-hidden flex items-center justify-center border-2 border-stone-800 shadow-inner">
            {/* Target reticle corners */}
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#006067]" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#006067]" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#006067]" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#006067]" />

            {/* Red laser scanning line */}
            <div className="absolute left-0 right-0 h-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] animate-scan-line" />

            <div className="text-center z-10 space-y-1">
              <Camera className="w-8 h-8 text-stone-500 mx-auto opacity-70" />
              <p className="text-xs font-medium text-stone-400 font-mono">
                Irányítsa a szkennert a vonalkódra
              </p>
              <p className="text-[10px] text-stone-600">vagy gépelje be alább</p>
            </div>
          </div>

          {/* Scanner Input field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              Beolvasott kód / Manuális Termék ID:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  id="scanner-manual-input"
                  type="text"
                  value={scanInput}
                  onChange={(e) => {
                    setScanInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="pl. 40107.00.33 vagy MLS0185-J"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>
              <button
                type="button"
                id="scanner-lookup-btn"
                onClick={() => handleLookup(scanInput)}
                className="px-4 py-2 bg-[#006067] hover:bg-[#00474c] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Keresés
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick sample chips */}
          {quickSamples.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <p className="text-[10px] font-bold uppercase text-stone-400 mb-1.5">
                Gyors tesztelés (minták a táblázatból):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickSamples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleLookup(s.id)}
                    className="font-mono text-xs px-2 py-1 rounded bg-stone-100 hover:bg-[#E0E9E8] text-stone-700 hover:text-[#006067] transition-colors cursor-pointer"
                  >
                    {s.id} ({s.name})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

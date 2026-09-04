import React from 'react';
import { Product } from '../types';
import { BarcodeView } from './BarcodeView';
import { Printer, X, Tag, MapPin, Factory } from 'lucide-react';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#006067]" />
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">Ipari Termékcímke Nyomtatás</h3>
              <p className="text-[11px] text-stone-500">Vonalkódos raktári azonosító</p>
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

        {/* Printable Label Preview Box */}
        <div className="p-6 bg-stone-100 flex flex-col items-center justify-center">
          <div
            id="printable-label"
            className="w-80 bg-white border-2 border-stone-900 p-4 rounded-lg shadow-sm space-y-3 font-sans"
          >
            {/* Top brand & Category */}
            <div className="flex items-center justify-between border-b-2 border-stone-900 pb-1.5 text-[10px] font-bold uppercase tracking-wider">
              <span>KINETIC LOGISTICS</span>
              <span className="truncate max-w-[140px]">{product.category || 'Alkatrész'}</span>
            </div>

            {/* Product Name & ID */}
            <div>
              <p className="text-[10px] text-stone-500 uppercase font-bold">Termék Megnevezés:</p>
              <h4 className="font-black text-stone-900 text-base leading-tight">
                {product.name}
              </h4>
            </div>

            {/* Barcode representation */}
            <div className="py-1">
              <BarcodeView value={product.id} height={44} showText={true} />
            </div>

            {/* Metadata Footer */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-300 text-[10px]">
              {product.factoryCode && (
                <div>
                  <span className="text-stone-500 block">Gyári Kód:</span>
                  <span className="font-mono font-bold text-stone-900">{product.factoryCode}</span>
                </div>
              )}
              {product.location && (
                <div>
                  <span className="text-stone-500 block">Raktári Hely:</span>
                  <span className="font-bold text-stone-900">{product.location}</span>
                </div>
              )}
              {product.manufacturer && (
                <div>
                  <span className="text-stone-500 block">Gyártó:</span>
                  <span className="font-bold text-stone-900">{product.manufacturer}</span>
                </div>
              )}
              {product.date && (
                <div>
                  <span className="text-stone-500 block">Dátum:</span>
                  <span className="font-mono text-stone-700">{product.date}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-medium rounded-lg text-xs transition-colors cursor-pointer"
          >
            Mégse
          </button>
          <button
            type="button"
            id="execute-print-btn"
            onClick={handlePrint}
            className="px-5 py-2 bg-[#006067] hover:bg-[#00474c] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Címke Nyomtatása</span>
          </button>
        </div>
      </div>
    </div>
  );
};

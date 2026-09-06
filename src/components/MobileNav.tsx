import React from 'react';
import { useProducts } from '../context/ProductContext';
import { ActiveTab } from '../types';
import {
  Boxes,
  LayoutDashboard,
  QrCode,
  FileSpreadsheet,
  MapPin,
  ClipboardList,
  Kanban,
  ShoppingCart,
} from 'lucide-react';

interface MobileNavProps {
  onOpenScanner: () => void;
  onOpenSyncModal: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  onOpenScanner,
  onOpenSyncModal,
}) => {
  const { activeTab, setActiveTab, clearSelectedPosition } = useProducts();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {/* Termékek */}
      <button
        type="button"
        id="mobile-nav-inventory"
        onClick={() => setActiveTab('inventory')}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] transition-all cursor-pointer min-h-[44px] min-w-[46px] ${
          activeTab === 'inventory' || activeTab === 'detail'
            ? 'text-[#006067] font-extrabold bg-[#E0E9E8]/60'
            : 'text-stone-500 hover:text-stone-900 font-medium'
        }`}
      >
        <Boxes className="w-4.5 h-4.5 mb-0.5" />
        <span>Termékek</span>
      </button>

      {/* Raktári Pozíciók */}
      <button
        type="button"
        id="mobile-nav-positions"
        onClick={() => {
          clearSelectedPosition();
          setActiveTab('positions');
        }}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] transition-all cursor-pointer min-h-[44px] min-w-[46px] ${
          activeTab === 'positions'
            ? 'text-[#006067] font-extrabold bg-[#E0E9E8]/60'
            : 'text-stone-500 hover:text-stone-900 font-medium'
        }`}
      >
        <MapPin className="w-4.5 h-4.5 mb-0.5" />
        <span>Pozíciók</span>
      </button>

      {/* Kanban Tábla */}
      <button
        type="button"
        id="mobile-nav-kanban"
        onClick={() => setActiveTab('kanban')}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] transition-all cursor-pointer min-h-[44px] min-w-[46px] ${
          activeTab === 'kanban'
            ? 'text-[#006067] font-extrabold bg-[#E0E9E8]/60'
            : 'text-stone-500 hover:text-stone-900 font-medium'
        }`}
      >
        <Kanban className="w-4.5 h-4.5 mb-0.5" />
        <span>Kanban</span>
      </button>

      {/* Rendelés */}
      <button
        type="button"
        id="mobile-nav-rendeles"
        onClick={() => setActiveTab('rendeles')}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] transition-all cursor-pointer min-h-[44px] min-w-[46px] ${
          activeTab === 'rendeles'
            ? 'text-[#006067] font-extrabold bg-[#E0E9E8]/60'
            : 'text-stone-500 hover:text-stone-900 font-medium'
        }`}
      >
        <ShoppingCart className="w-4.5 h-4.5 mb-0.5" />
        <span>Rendelés</span>
      </button>

      {/* Floating Action: Scanner */}
      <button
        type="button"
        id="mobile-nav-scanner"
        onClick={onOpenScanner}
        className="flex flex-col items-center justify-center -mt-4 rounded-full bg-[#006067] text-white p-2.5 shadow-lg active:scale-95 transition-transform cursor-pointer border-2 border-white ring-2 ring-[#006067]/20"
        title="Vonalkód és QR Szkenner"
      >
        <QrCode className="w-4.5 h-4.5" />
        <span className="sr-only">Szkenner</span>
      </button>

      {/* Áttekintés / Dashboard */}
      <button
        type="button"
        id="mobile-nav-dashboard"
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] transition-all cursor-pointer min-h-[44px] min-w-[46px] ${
          activeTab === 'dashboard'
            ? 'text-[#006067] font-extrabold bg-[#E0E9E8]/60'
            : 'text-stone-500 hover:text-stone-900 font-medium'
        }`}
      >
        <LayoutDashboard className="w-4.5 h-4.5 mb-0.5" />
        <span>Áttekintés</span>
      </button>
    </nav>
  );
};

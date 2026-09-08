import React, { useState, useEffect, useRef } from 'react';
import { useProducts } from '../context/ProductContext';
import { CategoryDropdown } from './CategoryDropdown';
import {
  Search,
  RefreshCw,
  Barcode,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Menu,
  SlidersHorizontal,
  Database,
} from 'lucide-react';

interface HeaderProps {
  onOpenScanner: () => void;
  onOpenNewProduct: () => void;
  onOpenSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenScanner,
  onOpenNewProduct,
  onOpenSyncModal,
}) => {
  const {
    filters,
    updateFilter,
    isSyncing,
    syncError,
    lastSyncedAt,
    syncWithGoogleSheet,
    totalCount,
    setActiveTab,
    isFirebaseConnected,
    firebaseSyncTime,
  } = useProducts();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setLocalSearch(filters.searchQuery);
  }, [filters.searchQuery]);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    updateFilter('searchQuery', val);
    if (val.trim()) {
      setActiveTab('inventory');
    }
  };

  const handleClearSearch = () => {
    setLocalSearch('');
    updateFilter('searchQuery', '');
    searchInputRef.current?.focus();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs transition-all">
      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand logo & title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            id="brand-logo-btn"
            onClick={() => setActiveTab('inventory')}
            className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#006067] flex items-center justify-center text-white font-black text-base sm:text-lg shadow-sm group-hover:bg-[#00474c] transition-colors flex-shrink-0">
              W
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-stone-900 tracking-tight text-sm sm:text-base group-hover:text-[#006067] transition-colors">
                  World Wires
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-widest px-1 sm:px-1.5 py-0.5 rounded bg-[#E0E9E8] text-[#006067] uppercase">
                  Kft.
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium truncate hidden xs:block sm:block max-w-[170px]">
                {totalCount.toLocaleString('hu-HU')} tétel
              </p>
            </div>
          </button>
        </div>

        {/* Global Search Bar (Desktop & Tablet) */}
        <div className="hidden sm:flex flex-1 max-w-md md:max-w-lg mx-2">
          <div className="relative flex items-center w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="global-search-input"
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              placeholder="Keresés: ID, Név, Gyári Kód, Hely..."
              className="w-full bg-[#F4F7F6] border border-stone-200 focus:border-[#006067] focus:bg-white rounded-lg pl-9 pr-16 py-2 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 outline-none transition-all focus:ring-2 focus:ring-[#006067]/15"
            />
            {localSearch ? (
              <button
                type="button"
                id="clear-search-btn"
                onClick={handleClearSearch}
                className="absolute right-8 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                title="Keresés törlése"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
            <div className="hidden lg:flex absolute right-2.5 pointer-events-none items-center gap-0.5 text-[10px] font-mono text-stone-400 border border-stone-200 rounded px-1.5 py-0.5 bg-white shadow-2xs">
              <span>⌘K</span>
            </div>
          </div>
        </div>

        {/* Category Dropdown (Header prominent menu) */}
        <div className="hidden md:block">
          <CategoryDropdown
            variant="header"
            onSelect={() => setActiveTab('inventory')}
          />
        </div>

        {/* Actions & Sync indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            type="button"
            id="mobile-search-toggle-btn"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="sm:hidden p-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-[#006067] transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Keresés megnyitása"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Sync Button & Status (Desktop) */}
          <button
            type="button"
            id="google-sync-header-btn"
            onClick={() => syncWithGoogleSheet()}
            disabled={isSyncing}
            className={`hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer min-h-[38px] ${
              syncError
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300'
            }`}
            title={lastSyncedAt ? `Utolsó szinkron: ${lastSyncedAt}` : 'Szinkronizálás Google Sheets-ből'}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isSyncing ? 'animate-spin text-[#006067]' : 'text-stone-500'
              }`}
            />
            <span>{isSyncing ? 'Szinkron...' : 'Google Sheets'}</span>
            {lastSyncedAt && !isSyncing && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Szinkronizálva" />
            )}
          </button>

          {/* Firebase Database Status & Quick Modal Trigger */}
          <button
            type="button"
            id="firebase-header-status-btn"
            onClick={onOpenSyncModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition-all cursor-pointer min-h-[38px]"
            title={firebaseSyncTime ? `Firebase Firestore aktív. Utolsó mentés: ${firebaseSyncTime}` : 'Firebase Firestore felhő adatbázis aktív és valós idejű'}
          >
            <Database className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden md:inline">Firebase</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Sheets modal trigger */}
          <button
            type="button"
            id="open-sheets-modal-btn"
            onClick={onOpenSyncModal}
            className="p-2 sm:px-2.5 sm:py-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-[#006067] transition-colors cursor-pointer min-h-[38px] flex items-center justify-center"
            title="Google Sheets import / export és beállítások"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden xl:inline text-xs ml-1.5 font-medium">Sheets</span>
          </button>

          {/* Barcode scanner */}
          <button
            type="button"
            id="open-scanner-btn"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg border border-[#006067]/20 bg-[#E0E9E8]/60 hover:bg-[#E0E9E8] text-[#006067] font-semibold text-xs transition-colors cursor-pointer min-h-[38px]"
            title="Vonalkód és QR kód beolvasó"
          >
            <Barcode className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">Szkenner</span>
          </button>

          {/* New product */}
          <button
            type="button"
            id="open-new-product-btn"
            onClick={onOpenNewProduct}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-medium text-xs shadow-xs transition-all cursor-pointer min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Új Termék</span>
          </button>
        </div>
      </div>

      {/* Mobile Expandable Search Bar */}
      {mobileSearchOpen && (
        <div className="sm:hidden px-3 pb-2.5 pt-0 border-t border-stone-100 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="relative flex items-center mt-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={handleSearchChange}
              placeholder="Keresés: Termék ID, Név, Gyári Kód..."
              className="w-full bg-[#F4F7F6] border border-stone-200 focus:border-[#006067] focus:bg-white rounded-lg pl-9 pr-8 py-2.5 text-xs text-stone-900 outline-none"
              autoFocus
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Category Dropdown Bar */}
      <div className="md:hidden px-3 py-1.5 bg-stone-50 border-t border-stone-200/80 flex items-center gap-2">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide flex-shrink-0">
          Kategória:
        </span>
        <div className="flex-1">
          <CategoryDropdown
            variant="compact"
            onSelect={() => setActiveTab('inventory')}
          />
        </div>
      </div>
    </header>
  );
};

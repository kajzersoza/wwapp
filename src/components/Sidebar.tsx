import React from 'react';
import { useProducts } from '../context/ProductContext';
import { ActiveTab } from '../types';
import { CategoryDropdown } from './CategoryDropdown';
import {
  Boxes,
  LayoutDashboard,
  FileSpreadsheet,
  QrCode,
  SlidersHorizontal,
  RefreshCw,
  FolderTree,
  MapPin,
  ClipboardList,
  Kanban,
} from 'lucide-react';

interface SidebarProps {
  onOpenSyncModal: () => void;
  onOpenScanner: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenSyncModal,
  onOpenScanner,
}) => {
  const {
    activeTab,
    setActiveTab,
    totalCount,
    positions,
    inspections,
    kanban,
    saruSpecs,
    clearSelectedPosition,
    lastSyncedAt,
    isSyncing,
    syncWithGoogleSheet,
    categories,
    filterByValue,
    filters,
  } = useProducts();

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'inventory',
      label: 'Terméklista',
      icon: <Boxes className="w-4 h-4" />,
      badge: totalCount.toLocaleString('hu-HU'),
    },
    {
      id: 'positions',
      label: 'Raktári Pozíciók',
      icon: <MapPin className="w-4 h-4" />,
      badge: positions.length.toString(),
    },
    {
      id: 'kanban',
      label: 'Kanban Tábla',
      icon: <Kanban className="w-4 h-4 text-amber-600" />,
      badge: kanban.length.toString(),
    },
    {
      id: 'inspections',
      label: 'Karbantartás',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: inspections.length.toString(),
    },
    {
      id: 'saruspecs',
      label: 'Saru Segédtáblázat',
      icon: <SlidersHorizontal className="w-4 h-4 text-cyan-600" />,
      badge: saruSpecs.length.toString(),
    },
    {
      id: 'dashboard',
      label: 'Áttekintés',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'scanner',
      label: 'Vonalkód Szkenner',
      icon: <QrCode className="w-4 h-4" />,
    },
    {
      id: 'sync',
      label: 'Google Sheets',
      icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600" />,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-61px)] flex-shrink-0">
      <div className="space-y-5">
        {/* Navigation list */}
        <div>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
            Navigáció
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`nav-tab-${item.id}`}
                  onClick={() => {
                    if (item.id === 'scanner') {
                      onOpenScanner();
                    } else if (item.id === 'sync') {
                      onOpenSyncModal();
                    } else {
                      if (item.id === 'positions') {
                        clearSelectedPosition();
                      }
                      setActiveTab(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#006067] text-white shadow-xs'
                      : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-white' : 'text-stone-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* All Categories Dropdown Menu */}
        <div>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Kategóriák Választása
            </p>
            <FolderTree className="w-3 h-3 text-stone-400" />
          </div>
          <CategoryDropdown
            variant="filter"
            onSelect={() => setActiveTab('inventory')}
          />
        </div>

        {/* Quick Category List */}
        {categories.length > 0 && (
          <div>
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Gyakori Kategóriák
            </p>
            <div className="space-y-1">
              {categories.slice(0, 5).map((cat) => {
                const isSelected = filters.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    id={`sidebar-cat-${cat.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    onClick={() => {
                      filterByValue('category', cat);
                      setActiveTab('inventory');
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#E0E9E8] text-[#006067] font-bold'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }`}
                  >
                    <span className="truncate text-xs">{cat}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006067] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Sync Status Box */}
      <div className="pt-4 border-t border-stone-200">
        <div className="bg-[#F4F7F6] rounded-lg p-3 border border-stone-200/80">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-stone-800">
                Google Sheets Élő
              </span>
            </div>
            <button
              type="button"
              id="sidebar-sync-refresh-btn"
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="text-stone-400 hover:text-[#006067] transition-colors p-0.5 cursor-pointer"
              title="Azonnali frissítés"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#006067]' : ''}`}
              />
            </button>
          </div>
          <p className="text-[10px] text-stone-500 truncate font-mono">
            {lastSyncedAt ? `Frissítve: ${lastSyncedAt}` : 'Nincs szinkronizálva'}
          </p>
          <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[11px]">
            <span className="text-stone-500">Munkalapok:</span>
            <span className="font-mono font-semibold text-stone-700">3 Tábla</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

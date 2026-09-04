import React from 'react';
import { useProducts } from '../context/ProductContext';
import { TermekIdLink } from './TermekIdLink';
import { FilterTag } from './FilterTag';
import { getCategoryColor } from '../utils/categoryColors';
import {
  Boxes,
  Layers,
  Factory,
  MapPin,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Shield,
  Kanban as KanbanIcon,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenSyncModal: () => void;
  onOpenScanner: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenSyncModal,
  onOpenScanner,
}) => {
  const {
    products,
    totalCount,
    categories,
    manufacturers,
    locations,
    kanban,
    lastSyncedAt,
    setActiveTab,
    filterByValue,
    selectProductById,
  } = useProducts();

  // Category counts
  const categoryCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category) {
        map[p.category] = (map[p.category] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [products]);

  // Kanban status counts
  const kanbanStats = React.useMemo(() => {
    const terv = kanban.filter((k) => k.status === 'Terv').length;
    const folyamatban = kanban.filter((k) => k.status === 'Folyamatban').length;
    const teszt = kanban.filter((k) => k.status === 'Teszt').length;
    const befejezve = kanban.filter((k) => k.status === 'Befejezve').length;
    return { terv, folyamatban, teszt, befejezve, total: kanban.length };
  }, [kanban]);

  // Manufacturer counts
  const manufacturerCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.manufacturer) {
        map[p.manufacturer] = (map[p.manufacturer] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [products]);

  // Insulation types
  const insulationCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.insulationType) {
        map[p.insulationType] = (map[p.insulationType] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [products]);

  const recentProducts = products.slice(0, 8);

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 sm:space-y-6">
      {/* Top Welcome & KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products KPI */}
        <div
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs hover:border-[#006067] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Összes Termék & Tétel
            </span>
            <div className="w-9 h-9 rounded-lg bg-[#E0E9E8] text-[#006067] flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 font-mono">
              {totalCount.toLocaleString('hu-HU')}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1 group-hover:text-[#006067]">
              <span>Raktárlista megnyitása</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </div>

        {/* Categories KPI */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Kategóriák Száma
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 font-mono">
              {categories.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              pl. {categories.slice(0, 2).join(', ')}...
            </p>
          </div>
        </div>

        {/* Manufacturers KPI */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Gyártók Száma
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 font-mono">
              {manufacturers.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              pl. {manufacturers.slice(0, 2).join(', ')}...
            </p>
          </div>
        </div>

        {/* Locations KPI */}
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Raktári Helyszínek
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900 font-mono">
              {locations.length}
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Nyilvántartott polc és rekesz
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#006067]" />
              <span>Kategóriák Megoszlása</span>
            </h3>
            <span className="text-[11px] text-stone-400 font-medium">Kattintson a szűréshez</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {categoryCounts.map(([cat, count]) => {
              const pct = Math.round((count / totalCount) * 100) || 1;
              const palette = getCategoryColor(cat);
              return (
                <div
                  key={cat}
                  onClick={() => filterByValue('category', cat)}
                  className="p-2.5 rounded-lg border border-stone-100 hover:border-[#006067] hover:bg-[#F4F7F6] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-stone-800 group-hover:text-[#006067] transition-colors flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
                      <span>{cat}</span>
                    </span>
                    <span className="font-mono font-bold text-stone-600">
                      {count.toLocaleString('hu-HU')} db ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${palette.activeBg.split(' ')[0] || 'bg-[#006067]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Manufacturer Breakdown Card */}
        <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-[#006067]" />
              <span>Gyártók Szerinti Megoszlás</span>
            </h3>
            <span className="text-[11px] text-stone-400 font-medium">Kattintson a szűréshez</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {manufacturerCounts.map(([mfg, count]) => {
              const pct = Math.round((count / totalCount) * 100) || 1;
              return (
                <div
                  key={mfg}
                  onClick={() => filterByValue('manufacturer', mfg)}
                  className="p-2.5 rounded-lg border border-stone-100 hover:border-[#006067] hover:bg-[#F4F7F6] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-stone-800 group-hover:text-[#006067] transition-colors">
                      {mfg}
                    </span>
                    <span className="font-mono font-bold text-stone-600">
                      {count.toLocaleString('hu-HU')} db ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#006067] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban Board Status Overview */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <KanbanIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                Kanban Folyamatok Állapota
              </h3>
              <p className="text-[11px] text-stone-500">
                Gyártási és szerviz feladatok státuszonként (Terv, Folyamatban, Teszt, Befejezve)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className="text-xs font-bold text-[#006067] hover:underline flex items-center gap-1 cursor-pointer bg-[#E0E9E8]/60 px-3 py-1.5 rounded-lg"
          >
            <span>Kanban Tábla Megnyitása</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setActiveTab('kanban')}
            className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 hover:border-blue-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-blue-900 mb-1">
              <span className="text-xs font-bold">Terv</span>
              <span className="text-xs font-mono font-black">{kanbanStats.terv}</span>
            </div>
            <p className="text-[10px] text-blue-700">Előkészítés alatt</p>
          </div>

          <div
            onClick={() => setActiveTab('kanban')}
            className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-900 mb-1">
              <span className="text-xs font-bold">Folyamatban</span>
              <span className="text-xs font-mono font-black">{kanbanStats.folyamatban}</span>
            </div>
            <p className="text-[10px] text-amber-700">Aktív megmunkálás</p>
          </div>

          <div
            onClick={() => setActiveTab('kanban')}
            className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 hover:border-purple-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-purple-900 mb-1">
              <span className="text-xs font-bold">Teszt</span>
              <span className="text-xs font-mono font-black">{kanbanStats.teszt}</span>
            </div>
            <p className="text-[10px] text-purple-700">Mérés és ellenőrzés</p>
          </div>

          <div
            onClick={() => setActiveTab('kanban')}
            className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-900 mb-1">
              <span className="text-xs font-bold">Befejezve</span>
              <span className="text-xs font-mono font-black">{kanbanStats.befejezve}</span>
            </div>
            <p className="text-[10px] text-emerald-700">Sikeresen lezárva</p>
          </div>
        </div>
      </div>

      {/* Recent / Featured Products list (with clickable Termék ID links) */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">
              Kiemelt Raktári Tételek
            </h3>
            <p className="text-[11px] text-stone-500">
              Minden Termék ID közvetlenül kattintható link
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className="text-xs font-semibold text-[#006067] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Összes megtekintése</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {recentProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => selectProductById(p.id)}
              className="p-3 rounded-lg border border-stone-200 hover:border-[#006067] hover:bg-[#F4F7F6] transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <TermekIdLink id={p.id} truncate={true} />
                  {p.location && (
                    <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-1 py-0.5 rounded">
                      {p.location}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-[#006067] transition-colors">
                  {p.name}
                </h4>
                {p.partType && (
                  <p className="text-[10px] text-stone-500 truncate mt-0.5">{p.partType}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-stone-100 text-[10px]">
                {p.category && (
                  <FilterTag type="category" value={p.category} variant="pill" />
                )}
                {p.manufacturer && (
                  <span className="px-1.5 py-0.5 rounded bg-[#E0E9E8] text-[#006067] font-semibold text-[10px]">
                    {p.manufacturer}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

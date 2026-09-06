import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { Order } from '../types';
import { TermekIdLink } from './TermekIdLink';
import { SafeImage } from './SafeImage';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  RefreshCw,
  Boxes,
  Link2,
  Tag,
  MapPin,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface RendelesViewProps {
  onOpenSyncModal?: () => void;
}

export const RendelesView: React.FC<RendelesViewProps> = ({ onOpenSyncModal }) => {
  const {
    orders,
    products,
    addOrder,
    updateOrder,
    deleteOrder,
    getNextOrderId,
    getAllRelatedProductIds,
    getProductOrders,
    selectProductById,
    getProductTotalStock,
    getProductStockBreakdown,
    exportOrdersCsv,
    importOrdersCsvText,
    isSyncing,
    syncWithGoogleSheet,
  } = useProducts();

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'all' | 'direct' | 'with_relations'>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState<Partial<Order>>({
    rendelesId: '',
    termekId: '',
    statusz: 'Megrendelve',
    datum: new Date().toISOString().split('T')[0],
    datumMegrendelve: new Date().toISOString().split('T')[0],
    datumRaktarban: '',
    mennyiseg: 1,
    megjegyzes: '',
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [csvNotice, setCsvNotice] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedOrderIds(new Set(orders.map((o) => o.id)));
  };

  const collapseAll = () => {
    setExpandedOrderIds(new Set());
  };

  // Map product lookups for fast access
  const productMap = useMemo(() => {
    const map = new Map<string, (typeof products)[0]>();
    products.forEach((p) => {
      map.set(p.id.toLowerCase(), p);
    });
    return map;
  }, [products]);

  const getProduct = (productId: string) => {
    if (!productId) return undefined;
    return productMap.get(productId.trim().toLowerCase());
  };

  // Compute status summary counts
  const stats = useMemo(() => {
    let megrendelniCount = 0;
    let megrendelveCount = 0;
    let megerkezettCount = 0;
    let egyébCount = 0;

    orders.forEach((o) => {
      const st = (o.statusz || '').toLowerCase();
      if (st.includes('megrendelni') || st.includes('tervezett')) {
        megrendelniCount++;
      } else if (st.includes('érkezett') || st.includes('raktár') || st.includes('átvéve')) {
        megerkezettCount++;
      } else if (st.includes('rendelve') || st.includes('folyamatban') || st.includes('leadva')) {
        megrendelveCount++;
      } else {
        egyébCount++;
      }
    });

    // Count unique products that have active orders
    const orderedProductIds = new Set(orders.map((o) => o.termekId.trim().toLowerCase()));

    // Count unique related products
    const relatedProductIds = new Set<string>();
    orders.forEach((o) => {
      const relations = getAllRelatedProductIds(o.termekId);
      relations.forEach((r) => {
        const idLower = r.id.trim().toLowerCase();
        if (!orderedProductIds.has(idLower)) {
          relatedProductIds.add(idLower);
        }
      });
    });

    return {
      total: orders.length,
      megrendelniCount,
      megrendelveCount,
      megerkezettCount,
      egyébCount,
      uniqueOrderedProducts: orderedProductIds.size,
      connectedProductsCount: relatedProductIds.size,
    };
  }, [orders, getAllRelatedProductIds]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== 'all') {
        const st = (o.statusz || '').toLowerCase();
        if (statusFilter === 'megrendelni') {
          if (!st.includes('megrendelni') && !st.includes('tervezett')) return false;
        } else if (statusFilter === 'megrendelve') {
          if ((!st.includes('rendelve') && !st.includes('leadva')) || st.includes('megrendelni')) return false;
        } else if (statusFilter === 'megerkezett' || statusFilter === 'raktarban') {
          if (!st.includes('érkezett') && !st.includes('raktár') && !st.includes('átvéve')) return false;
        } else if (statusFilter === 'folyamatban') {
          if (!st.includes('folyamatban')) return false;
        }
      }

      // Search query
      if (q) {
        const prod = getProduct(o.termekId);
        const matchId = (o.id || '').toLowerCase().includes(q);
        const matchRendelesId = (o.rendelesId || '').toLowerCase().includes(q);
        const matchTermekId = (o.termekId || '').toLowerCase().includes(q);
        const matchStatus = (o.statusz || '').toLowerCase().includes(q);
        const matchDatum = (o.datum || '').toLowerCase().includes(q);
        const matchMegrendelve = (o.datumMegrendelve || '').toLowerCase().includes(q);
        const matchRaktarban = (o.datumRaktarban || '').toLowerCase().includes(q);
        const matchProdName = prod?.name ? prod.name.toLowerCase().includes(q) : false;
        const matchCategory = prod?.category ? prod.category.toLowerCase().includes(q) : false;
        const matchFc = prod?.factoryCode ? prod.factoryCode.toLowerCase().includes(q) : false;

        // Also check if any connected product matches search
        const relations = getAllRelatedProductIds(o.termekId);
        const matchRelation = relations.some(
          (r) =>
            r.id.toLowerCase().includes(q) ||
            r.relationType.toLowerCase().includes(q) ||
            (r.product?.name && r.product.name.toLowerCase().includes(q))
        );

        if (
          !matchId &&
          !matchRendelesId &&
          !matchTermekId &&
          !matchStatus &&
          !matchDatum &&
          !matchMegrendelve &&
          !matchRaktarban &&
          !matchProdName &&
          !matchCategory &&
          !matchFc &&
          !matchRelation
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery, productMap, getAllRelatedProductIds]);

  // Modal open handlers
  const handleOpenAddModal = () => {
    setEditingOrder(null);
    setFormData({
      rendelesId: getNextOrderId(),
      termekId: '',
      statusz: 'Megrendelve',
      datum: new Date().toISOString().split('T')[0],
      datumMegrendelve: new Date().toISOString().split('T')[0],
      datumRaktarban: '',
      mennyiseg: 1,
      megjegyzes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      rendelesId: order.rendelesId || order.id,
      termekId: order.termekId,
      statusz: order.statusz || 'Megrendelve',
      datum: order.datum || '',
      datumMegrendelve: order.datumMegrendelve || '',
      datumRaktarban: order.datumRaktarban || '',
      mennyiseg: order.mennyiseg ?? 1,
      megjegyzes: order.megjegyzes || '',
    });
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termekId?.trim()) {
      alert('Kérjük, adja meg a Termék ID-t!');
      return;
    }

    const cleanRendelesId = (formData.rendelesId || '').trim() || getNextOrderId();
    const cleanTermekId = formData.termekId.trim();

    if (editingOrder) {
      await updateOrder(editingOrder.id, {
        rendelesId: cleanRendelesId,
        termekId: cleanTermekId,
        statusz: formData.statusz || 'Megrendelve',
        datum: formData.datum || '',
        datumMegrendelve: formData.datumMegrendelve || '',
        datumRaktarban: formData.datumRaktarban || '',
        mennyiseg: Number(formData.mennyiseg) || 1,
        megjegyzes: formData.megjegyzes || '',
      });
    } else {
      const newOrder: Order = {
        id: cleanRendelesId,
        rendelesId: cleanRendelesId,
        termekId: cleanTermekId,
        statusz: formData.statusz || 'Megrendelve',
        datum: formData.datum || '',
        datumMegrendelve: formData.datumMegrendelve || '',
        datumRaktarban: formData.datumRaktarban || '',
        mennyiseg: Number(formData.mennyiseg) || 1,
        megjegyzes: formData.megjegyzes || '',
      };
      await addOrder(newOrder);
    }

    setModalOpen(false);
  };

  // CSV export
  const handleExportCsv = () => {
    const csvContent = exportOrdersCsv();
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rendelesek_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV file import
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const count = importOrdersCsvText(text);
        setCsvNotice(`${count} rendelés sikeresen beimportálva.`);
        setTimeout(() => setCsvNotice(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Helper to style status badge
  const getStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('érkezett') || s.includes('raktár') || s.includes('átvéve')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <PackageCheck className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>{status || 'Megérkezett'}</span>
        </span>
      );
    }
    if (s.includes('megrendelni') || s.includes('tervezett')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <Clock className="w-3 h-3 text-rose-600 shrink-0" />
          <span>{status || 'Megrendelni'}</span>
        </span>
      );
    }
    if (s.includes('rendelve') || s.includes('leadva')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
          <ShoppingCart className="w-3 h-3 text-sky-600 shrink-0" />
          <span>{status || 'Megrendelve'}</span>
        </span>
      );
    }
    if (s.includes('folyamatban') || s.includes('gyártás')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
          <AlertCircle className="w-3 h-3 text-purple-600 shrink-0" />
          <span>{status || 'Folyamatban'}</span>
        </span>
      );
    }
    if (s.includes('töröl') || s.includes('visszavon')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
          <X className="w-3 h-3 text-red-600 shrink-0" />
          <span>{status || 'Törölve'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-300">
        <span>{status || 'Egyéb'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {csvNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{csvNotice}</span>
          </div>
          <button type="button" onClick={() => setCsvNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Stats Banner */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#006067] to-[#00474c] text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">Rendelés</h1>
                <span className="bg-[#006067] text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                  {stats.total} tétel
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Megrendelt termékek nyilvántartása és a hozzájuk kapcsolódó termékek áttekintése
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="rendeles-add-new-btn"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[38px]"
            >
              <Plus className="w-4 h-4" />
              <span>Új Rendelés Rögzítése</span>
            </button>

            <button
              type="button"
              id="rendeles-export-csv-btn"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer min-h-[38px]"
              title="Rendelések exportálása CSV fájlba"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>CSV Export</span>
            </button>

            <label
              htmlFor="rendeles-csv-input"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer min-h-[38px]"
              title="Rendelések importálása CSV fájlból"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>CSV Import</span>
              <input
                id="rendeles-csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCsvFileUpload}
              />
            </label>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition-colors cursor-pointer min-h-[38px]"
                title="Google Sheets szinkronizáció megnyitása"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="p-2 rounded-lg border border-stone-200 text-stone-500 hover:text-[#006067] hover:bg-stone-50 transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
              title="Azonnali frissítés"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#006067]' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200">
            <span className="text-[11px] font-semibold text-rose-800 block uppercase tracking-wider">
              Megrendelni
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold font-mono text-rose-900">{stats.megrendelniCount}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            </div>
          </div>

          <div className="p-3 bg-sky-50/70 rounded-lg border border-sky-200">
            <span className="text-[11px] font-semibold text-sky-800 block uppercase tracking-wider">
              Megrendelve
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold font-mono text-sky-900">{stats.megrendelveCount}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 block uppercase tracking-wider">
              Megérkezett / Raktárban
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold font-mono text-emerald-900">{stats.megerkezettCount}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-600 block uppercase tracking-wider">
              Összes Megrendelés
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xl font-bold font-mono text-stone-900">{stats.total}</span>
              <Boxes className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="rendeles-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés: Termék ID, Név, Dátum, Státusz..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick status filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              <span>Státusz:</span>
            </span>

            {[
              { id: 'all', label: `Mind (${stats.total})`, dot: 'bg-stone-400' },
              { id: 'megrendelni', label: `Megrendelni (${stats.megrendelniCount})`, dot: 'bg-rose-500' },
              { id: 'megrendelve', label: `Megrendelve (${stats.megrendelveCount})`, dot: 'bg-sky-500' },
              { id: 'megerkezett', label: `Megérkezett (${stats.megerkezettCount})`, dot: 'bg-emerald-500' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                id={`rendeles-filter-${st.id}`}
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 ${
                  statusFilter === st.id
                    ? 'bg-[#006067] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Visibility toggle & expand controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-stone-500 font-medium">Megjelenítés:</span>
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
              <button
                type="button"
                onClick={() => setDisplayMode('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  displayMode === 'all'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Minden tétel
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('with_relations')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  displayMode === 'with_relations'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Kapcsolódó tételek
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={expandAll}
              className="text-xs text-[#006067] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Összes nyitása</span>
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-xs text-stone-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Összes csukása</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Orders Table & Mobile Cards */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-3">
            <ShoppingCart className="w-12 h-12 mx-auto text-stone-300" />
            <p className="text-sm font-bold text-stone-700">Nem található rendelési tétel</p>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Próbálja meg módosítani a keresési feltételeket vagy szűrőket.'
                : 'Még nincsenek rögzített megrendelések. Kattintson a fenti "Új Rendelés Rögzítése" gombra!'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center gap-1 text-xs text-[#006067] font-bold hover:underline cursor-pointer"
              >
                <span>Szűrők törlése</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ============================================================ */}
            {/* 1. DEDICATED RESPONSIVE MOBILE VIEW (No horizontal slider)    */}
            {/* ============================================================ */}
            <div className="block md:hidden divide-y divide-stone-100">
              {filteredOrders.map((order, index) => {
                const prod = getProduct(order.termekId);
                const isExpanded = expandedOrderIds.has(order.id);
                const relatedProducts = getAllRelatedProductIds(order.termekId);

                if (displayMode === 'with_relations' && relatedProducts.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={order.id || `mobile-order-${index}`}
                    className="p-3.5 space-y-2.5 bg-white hover:bg-stone-50/60 transition-colors"
                  >
                    {/* Top row: Termék ID + Státusz + Műveletek */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => selectProductById(order.termekId)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-[#006067] hover:text-white font-mono font-bold text-stone-900 border border-stone-200 transition-all text-xs cursor-pointer group"
                        >
                          <span>{order.termekId}</span>
                          <ExternalLink className="w-3 h-3 text-stone-400 group-hover:text-white" />
                        </button>
                        {getStatusBadge(order.statusz)}
                      </div>

                      {/* Műveletek */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(order)}
                          className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-[#006067] hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Szerkesztés"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {deleteConfirmId === order.id ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 p-0.5 rounded">
                            <button
                              type="button"
                              onClick={() => {
                                deleteOrder(order.id);
                                setDeleteConfirmId(null);
                              }}
                              className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              Törlés
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded text-[10px] cursor-pointer"
                            >
                              Mégse
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(order.id)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Törlés"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Terméknév */}
                    <div>
                      <button
                        type="button"
                        onClick={() => selectProductById(order.termekId)}
                        className="text-left font-semibold text-stone-900 hover:text-[#006067] transition-colors text-xs leading-snug line-clamp-2 cursor-pointer"
                      >
                        {prod ? prod.name : <span className="text-stone-400 italic">Termékadat nem elérhető</span>}
                      </button>
                    </div>

                    {/* 3 egyforma dátum kártya vízszintesen elrendezve */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                      <div className="flex flex-col px-2 py-1 rounded bg-stone-50 border border-stone-200 text-stone-800">
                        <span className="text-stone-400 text-[9px] uppercase font-sans font-medium">Dátum</span>
                        <span className="font-semibold truncate">{order.datum || '—'}</span>
                      </div>
                      <div className="flex flex-col px-2 py-1 rounded bg-stone-50 border border-stone-200 text-stone-800">
                        <span className="text-stone-400 text-[9px] uppercase font-sans font-medium">Megrendelve</span>
                        <span className="font-semibold truncate">{order.datumMegrendelve || '—'}</span>
                      </div>
                      <div className="flex flex-col px-2 py-1 rounded bg-stone-50 border border-stone-200 text-stone-800">
                        <span className="text-stone-400 text-[9px] uppercase font-sans font-medium">Raktárban</span>
                        <span className="font-semibold truncate">{order.datumRaktarban || '—'}</span>
                      </div>
                    </div>

                    {/* Kapcsolódó termékek gomb és kibontott lista */}
                    {relatedProducts.length > 0 && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(order.id)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <Link2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>{relatedProducts.length} db kapcsolódó alkatrész</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-amber-700" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-amber-700" />
                          )}
                        </button>

                        {/* Kibontott kapcsolódó termékek mobil kártyái */}
                        {isExpanded && (
                          <div className="mt-2 space-y-2 pl-2 border-l-2 border-amber-300">
                            {relatedProducts.map((relItem) => {
                              const relProd = relItem.product || getProduct(relItem.id);
                              const relOrders = getProductOrders(relItem.id);
                              const relStock = getProductStockBreakdown(relItem.id);

                              return (
                                <div
                                  key={relItem.id}
                                  onClick={() => selectProductById(relItem.id)}
                                  className="p-2.5 bg-stone-50 hover:bg-white rounded-lg border border-stone-200 hover:border-[#006067] space-y-1.5 cursor-pointer transition-all shadow-3xs"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                      {relItem.relationType}
                                    </span>
                                    <span className="font-mono font-bold text-xs text-[#006067]">
                                      {relItem.id}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <SafeImage
                                      src={relProd?.image}
                                      alt={relProd?.name || relItem.id}
                                      className="w-10 h-10 object-cover rounded bg-white border border-stone-200 shrink-0"
                                      fallback={
                                        <div className="w-10 h-10 rounded bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                          <Link2 className="w-3.5 h-3.5" />
                                        </div>
                                      }
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-stone-900 truncate">
                                        {relProd?.name || relItem.id}
                                      </p>
                                      <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                                        <span>Készlet: <strong>{relStock.totalStock} db</strong></span>
                                        {relOrders.length > 0 ? (
                                          getStatusBadge(relOrders[0].statusz)
                                        ) : (
                                          <span className="text-stone-400">Nincs rendelés</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ============================================================ */}
            {/* 2. DESKTOP / TABLET TABLE VIEW                                */}
            {/* ============================================================ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50/90 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                    <th className="py-2.5 px-2.5 font-mono text-left whitespace-nowrap">Termék ID</th>
                    <th className="py-2.5 px-2.5 text-left">Terméknév</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Státusz</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Dátum</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Megrendelve</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Raktárban</th>
                    <th className="py-2.5 px-1.5 text-center whitespace-nowrap w-14">Kapcs.</th>
                    <th className="py-2.5 px-2 text-right whitespace-nowrap w-16">Műveletek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                  {filteredOrders.map((order, index) => {
                    const prod = getProduct(order.termekId);
                    const isExpanded = expandedOrderIds.has(order.id);
                    const relatedProducts = getAllRelatedProductIds(order.termekId);

                    if (displayMode === 'with_relations' && relatedProducts.length === 0) {
                      return null;
                    }

                    return (
                      <React.Fragment key={order.id || `order-${index}`}>
                        <tr
                          id={`rendeles-row-${order.id}`}
                          className={`hover:bg-[#F4F7F6]/80 transition-colors ${
                            isExpanded ? 'bg-[#F4F7F6]/50' : ''
                          }`}
                        >
                          {/* Termék ID */}
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => selectProductById(order.termekId)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 hover:bg-[#006067] hover:text-white font-mono font-bold text-stone-900 border border-stone-200 transition-all cursor-pointer group text-xs"
                              title={`Kattintson ide a(z) ${order.termekId} termék adatlapjának megnyitásához!`}
                            >
                              <span>{order.termekId}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-stone-400 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </td>

                          {/* Terméknév (csak a név) */}
                          <td className="py-2.5 px-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={() => selectProductById(order.termekId)}
                              className="text-left font-semibold text-stone-900 hover:text-[#006067] transition-colors truncate block max-w-xs xl:max-w-md cursor-pointer"
                              title={prod ? `${prod.name} - Kattintson a termék adatlapjához` : 'Termékadat nem elérhető'}
                            >
                              {prod ? prod.name : <span className="text-stone-400 italic">Termékadat nem elérhető</span>}
                            </button>
                          </td>

                          {/* Státusz */}
                          <td className="py-2.5 px-2 whitespace-nowrap text-center">
                            {getStatusBadge(order.statusz)}
                          </td>

                          {/* Dátum */}
                          <td className="py-2.5 px-2 font-mono text-[11px] text-stone-700 whitespace-nowrap text-center">
                            {order.datum || <span className="text-stone-300">—</span>}
                          </td>

                          {/* Megrendelve */}
                          <td className="py-2.5 px-2 font-mono text-[11px] text-stone-700 whitespace-nowrap text-center">
                            {order.datumMegrendelve || <span className="text-stone-300">—</span>}
                          </td>

                          {/* Raktárban */}
                          <td className="py-2.5 px-2 font-mono text-[11px] text-stone-700 whitespace-nowrap text-center">
                            {order.datumRaktarban || <span className="text-stone-300">—</span>}
                          </td>

                          {/* Kapcsolódó termékek */}
                          <td className="py-2.5 px-1.5 text-center whitespace-nowrap">
                            {relatedProducts.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(order.id)}
                                className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                                title={`${relatedProducts.length} db kapcsolódó termék - kattintson a kibontáshoz`}
                              >
                                <span>{relatedProducts.length}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3 text-amber-700" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-amber-700" />
                                )}
                              </button>
                            ) : (
                              <span className="text-stone-300 text-xs font-mono">0</span>
                            )}
                          </td>

                          {/* Műveletek */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(order)}
                                className="p-1 rounded-md border border-stone-200 text-stone-500 hover:text-[#006067] hover:border-[#006067]/40 hover:bg-stone-50 transition-colors cursor-pointer"
                                title="Rendelés adatainak szerkesztése"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {deleteConfirmId === order.id ? (
                                <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 p-0.5 rounded">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteOrder(order.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                                  >
                                    Törlés
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded text-[10px]"
                                  >
                                    Mégse
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmId(order.id)}
                                  className="p-1 rounded-md border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Rendelés törlése"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Section: Connected / Related Products */}
                        {isExpanded && relatedProducts.length > 0 && (
                          <tr className="bg-amber-50/30 border-b border-stone-200">
                            <td colSpan={8} className="p-4 pl-6">
                              <div className="bg-white rounded-xl border border-amber-200/80 p-4 space-y-3 shadow-2xs">
                                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-amber-600" />
                                    <h4 className="text-xs font-bold text-stone-900">
                                      Kapcsolódó termékek a(z) <span className="font-mono text-[#006067]">{order.termekId}</span> cikkhez ({relatedProducts.length} db):
                                    </h4>
                                  </div>
                                  <span className="text-[10px] text-stone-500 italic">
                                    KonSar, TermMerod, Beépülő és FejSaru kapcsolatok alapján
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {relatedProducts.map((relItem) => {
                                    const relProd = relItem.product || getProduct(relItem.id);
                                    const relOrders = getProductOrders(relItem.id);
                                    const relStock = getProductStockBreakdown(relItem.id);

                                    return (
                                      <div
                                        key={relItem.id}
                                        onClick={() => selectProductById(relItem.id)}
                                        className="p-3 bg-stone-50 hover:bg-white rounded-xl border border-stone-200 hover:border-[#006067] cursor-pointer transition-all hover:shadow-xs group flex flex-col justify-between"
                                      >
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between gap-1 flex-wrap">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                              {relItem.relationType}
                                            </span>

                                            <div className="inline-flex items-center px-2 py-0.5 rounded bg-[#006067]/10 text-[#006067] font-mono font-bold text-xs">
                                              <span>{relItem.id}</span>
                                            </div>
                                          </div>

                                          <div className="flex items-start gap-2.5">
                                            <SafeImage
                                              src={relProd?.image}
                                              alt={relProd?.name || relItem.id}
                                              className="w-10 h-10 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                                              fallback={
                                                <div className="w-10 h-10 rounded-lg bg-stone-200/70 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                                  <Link2 className="w-4 h-4" />
                                                </div>
                                              }
                                            />

                                            <div className="min-w-0 flex-1">
                                              <p className="text-xs font-bold text-stone-900 group-hover:text-[#006067] transition-colors truncate">
                                                {relProd?.name || relItem.id}
                                              </p>

                                              {relProd?.category && (
                                                <p className="text-[10px] text-stone-500 truncate">
                                                  {relProd.category}
                                                </p>
                                              )}

                                              <div className="text-[10px] text-stone-600 mt-1">
                                                <span>Készlet: </span>
                                                <span className="font-bold font-mono text-stone-800">
                                                  {relStock.totalStock} db
                                                </span>
                                                {relStock.newStock > 0 && (
                                                  <span className="text-emerald-700 ml-1">
                                                    ({relStock.newStock} új)
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Relationship order status if this partner also has order */}
                                        <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px]">
                                          {relOrders.length > 0 ? (
                                            getStatusBadge(relOrders[0].statusz)
                                          ) : (
                                            <span className="text-stone-400">Nincs közvetlen rendelés</span>
                                          )}

                                          <span className="text-[#006067] group-hover:underline font-semibold flex items-center gap-0.5">
                                            <span>Adatlap</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-xl overflow-hidden animate-scaleIn">
            <div className="p-4 bg-[#006067] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {editingOrder ? 'Rendelés Szerkesztése' : 'Új Rendelés Rögzítése'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/70 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              {/* Termék ID */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Termék ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.termekId}
                  onChange={(e) => setFormData({ ...formData, termekId: e.target.value })}
                  placeholder="pl. 10214-0414 vagy N-466"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067] font-mono"
                />
                {formData.termekId && (
                  <div className="mt-1 text-[11px] text-stone-500">
                    {(() => {
                      const p = getProduct(formData.termekId);
                      if (p) {
                        return (
                          <span className="text-emerald-700 font-semibold">
                            ✓ Megtalálva: {p.name} ({p.category || 'Termék'})
                          </span>
                        );
                      }
                      return <span className="text-amber-600">⚠️ Új cikk vagy nem szerepel a terméklistában</span>;
                    })()}
                  </div>
                )}
              </div>

              {/* Státusz */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Státusz <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.statusz}
                  onChange={(e) => setFormData({ ...formData, statusz: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067] bg-white"
                >
                  <option value="Megrendelni">Megrendelni</option>
                  <option value="Megrendelve">Megrendelve</option>
                  <option value="Megérkezett">Megérkezett</option>
                  <option value="Raktárban">Raktárban</option>
                  <option value="Folyamatban">Folyamatban</option>
                  <option value="Törölve">Törölve</option>
                </select>
              </div>

              {/* Dátumok grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Dátum */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Dátum</label>
                  <input
                    type="date"
                    value={formData.datum}
                    onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                  />
                </div>

                {/* Dátum Megrendelve */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Dátum Megrendelve
                  </label>
                  <input
                    type="date"
                    value={formData.datumMegrendelve}
                    onChange={(e) => setFormData({ ...formData, datumMegrendelve: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                  />
                </div>

                {/* Dátum Raktárban */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Dátum Raktárban
                  </label>
                  <input
                    type="date"
                    value={formData.datumRaktarban}
                    onChange={(e) => setFormData({ ...formData, datumRaktarban: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                  />
                </div>
              </div>

              {/* Mennyiség & Megjegyzés */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">
                    Mennyiség (db)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.mennyiseg}
                    onChange={(e) => setFormData({ ...formData, mennyiseg: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Megjegyzés</label>
                  <input
                    type="text"
                    value={formData.megjegyzes}
                    onChange={(e) => setFormData({ ...formData, megjegyzes: e.target.value })}
                    placeholder="Opcionális megjegyzés..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold shadow-xs"
                >
                  {editingOrder ? 'Mentés' : 'Hozzáadás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

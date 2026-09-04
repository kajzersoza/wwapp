import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { BeepuloRelation } from '../types';
import { getBaseProductId } from '../utils/productUtils';
import { TermekIdLink } from './TermekIdLink';
import { SafeImage } from './SafeImage';
import {
  Puzzle,
  Cpu,
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  ArrowRight,
  Filter,
  RefreshCw,
  Info,
  CheckCircle2,
  Layers,
  MapPin,
  Tag,
  Hash,
  Sparkles,
} from 'lucide-react';

export const BeepuloView: React.FC = () => {
  const {
    beepulo,
    products,
    rawProducts,
    selectProductById,
    addBeepuloRelation,
    deleteBeepuloRelation,
    getNextBeepuloId,
    exportBeepuloCsv,
    importBeepuloCsvText,
    isSyncing,
    syncWithGoogleSheet,
    getProductStockBreakdown,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'parent' | 'component'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newP1, setNewP1] = useState('');
  const [newP2, setNewP2] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newNote, setNewNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Deduplicated and cleaned relations list
  const deduplicatedRelations = useMemo(() => {
    const seen = new Set<string>();
    const unique: BeepuloRelation[] = [];

    for (const rel of beepulo) {
      const raw1 = (rel.productId1 || '').trim();
      const raw2 = (rel.productId2 || '').trim();
      const p1 = getBaseProductId(raw1);
      const p2 = getBaseProductId(raw2);
      const p1Lower = p1.toLowerCase();
      const p2Lower = p2.toLowerCase();

      if (!p1 || !p2 || p1Lower === p2Lower) continue;

      const key = `${p1Lower}--->${p2Lower}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push({
        ...rel,
        productId1: p1,
        productId2: p2,
      });
    }
    return unique;
  }, [beepulo]);

  // Stats calculation
  const stats = useMemo(() => {
    const uniqueParents = new Set<string>();
    const uniqueComponents = new Set<string>();
    const allInvolved = new Set<string>();

    deduplicatedRelations.forEach((r) => {
      if (r.productId1) {
        uniqueParents.add(r.productId1.toLowerCase());
        allInvolved.add(r.productId1.toLowerCase());
      }
      if (r.productId2) {
        uniqueComponents.add(r.productId2.toLowerCase());
        allInvolved.add(r.productId2.toLowerCase());
      }
    });

    return {
      totalRelations: deduplicatedRelations.length,
      rawTotal: beepulo.length,
      duplicatesCount: Math.max(0, beepulo.length - deduplicatedRelations.length),
      uniqueParentsCount: uniqueParents.size,
      uniqueComponentsCount: uniqueComponents.size,
      totalInvolved: allInvolved.size,
    };
  }, [deduplicatedRelations, beepulo]);

  // Filtered relations
  const filteredRelations = useMemo(() => {
    return deduplicatedRelations.filter((rel) => {
      const p1 = (rel.productId1 || '').trim();
      const p2 = (rel.productId2 || '').trim();

      const prod1 =
        products.find((p) => p.id.toLowerCase() === p1.toLowerCase()) ||
        rawProducts.find((p) => p.id.toLowerCase() === p1.toLowerCase());

      const prod2 =
        products.find((p) => p.id.toLowerCase() === p2.toLowerCase()) ||
        rawProducts.find((p) => p.id.toLowerCase() === p2.toLowerCase());

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const m1 =
          p1.toLowerCase().includes(q) ||
          (prod1?.name.toLowerCase().includes(q) ?? false) ||
          (prod1?.factoryCode?.toLowerCase().includes(q) ?? false) ||
          (prod1?.category?.toLowerCase().includes(q) ?? false) ||
          (prod1?.description?.toLowerCase().includes(q) ?? false);
        const m2 =
          p2.toLowerCase().includes(q) ||
          (prod2?.name.toLowerCase().includes(q) ?? false) ||
          (prod2?.factoryCode?.toLowerCase().includes(q) ?? false) ||
          (prod2?.partType?.toLowerCase().includes(q) ?? false) ||
          (prod2?.description?.toLowerCase().includes(q) ?? false);
        const mid = rel.id.toLowerCase().includes(q);
        const mNote = rel.note ? rel.note.toLowerCase().includes(q) : false;
        if (!m1 && !m2 && !mid && !mNote) return false;
      }

      if (filterRole === 'parent' && !prod1) return false;
      if (filterRole === 'component' && !prod2) return false;

      return true;
    });
  }, [deduplicatedRelations, products, rawProducts, searchQuery, filterRole]);

  const handleExport = () => {
    const csvContent = exportBeepuloCsv();
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `beepulo_alkatreszek_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const count = importBeepuloCsvText(text);
        setImportStatus(`Sikeresen importálva és feldolgozva ${count} beépülő alkatrész kapcsolat!`);
        setTimeout(() => setImportStatus(null), 5000);
      }
    };
    reader.readAsText(file);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanP1 = newP1.trim();
    const cleanP2 = newP2.trim();

    if (!cleanP1) {
      setFormError('A Főtermék ID megadása kötelező!');
      return;
    }
    if (!cleanP2) {
      setFormError('A Beépülő Alkatrész ID megadása kötelező!');
      return;
    }
    if (cleanP1.toLowerCase() === cleanP2.toLowerCase()) {
      setFormError('A főtermék és a beépülő alkatrész nem lehet ugyanaz a termék!');
      return;
    }

    const qty = parseFloat(newQty) || 1;

    addBeepuloRelation({
      id: getNextBeepuloId(),
      productId1: cleanP1,
      productId2: cleanP2,
      quantity: qty,
      note: newNote.trim() || undefined,
    });

    setNewP1('');
    setNewP2('');
    setNewQty('1');
    setNewNote('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-inner">
              <Puzzle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Beépülő Alkatrész Munkalap
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {stats.totalRelations} beépülő kapcsolat
                </span>
                {stats.duplicatesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Automatikusan szűrt duplikációk száma">
                    ✨ {stats.duplicatesCount} duplikáció kiszűrve
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Főtermékek (Saruzófejek / Gépek) és a beléjük épülő csere- és kopóalkatrészek kapcsolata
              </p>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Szinkronizálás a Google Táblázatból"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Frissítés...' : 'Szinkron'}</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              title="CSV export letöltése"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Új Beépülő Kapcsolat</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {importStatus && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-100">
          <div className="p-3 bg-[#F4F7F6] rounded-xl border border-stone-200/60">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Összes Kapcsolat
            </span>
            <span className="text-xl font-extrabold text-stone-900 mt-0.5 block">
              {stats.totalRelations}
            </span>
          </div>

          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
              Főtermékek Száma
            </span>
            <span className="text-xl font-extrabold text-indigo-900 mt-0.5 block">
              {stats.uniqueParentsCount}
            </span>
          </div>

          <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
            <span className="text-[11px] font-bold text-[#006067] uppercase tracking-wider block">
              Alkatrészek Száma
            </span>
            <span className="text-xl font-extrabold text-teal-950 mt-0.5 block">
              {stats.uniqueComponentsCount}
            </span>
          </div>

          <div className="p-3 bg-stone-100 rounded-xl border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider block">
              Érintett Termékek
            </span>
            <span className="text-xl font-extrabold text-stone-900 mt-0.5 block">
              {stats.totalInvolved}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés termékkód, név, alkatrész vagy pozíció szerint..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-semibold text-stone-600">
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterRole === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs font-bold'
                  : 'hover:text-stone-900'
              }`}
            >
              Összes ({stats.totalRelations})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('parent')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterRole === 'parent'
                  ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                  : 'hover:text-stone-900'
              }`}
            >
              Főtermékek
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('component')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterRole === 'component'
                  ? 'bg-white text-teal-900 shadow-2xs font-bold'
                  : 'hover:text-stone-900'
              }`}
            >
              Alkatrészek
            </button>
          </div>
        </div>
      </div>

      {/* Relations Cards Grid */}
      {filteredRelations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-2xs">
          <Info className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">
            Nincs találat a megadott szűrők alapján
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            Próbáljon meg más keresőszót használni, vagy ellenőrizze a Google Táblázat &quot;Beépülő alkatrész&quot; munkalapját.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRelations.map((rel) => {
            const prod1 =
              products.find((p) => p.id.toLowerCase() === rel.productId1.toLowerCase()) ||
              rawProducts.find((p) => p.id.toLowerCase() === rel.productId1.toLowerCase());

            const prod2 =
              products.find((p) => p.id.toLowerCase() === rel.productId2.toLowerCase()) ||
              rawProducts.find((p) => p.id.toLowerCase() === rel.productId2.toLowerCase());

            const stock1 = getProductStockBreakdown(rel.productId1);
            const stock2 = getProductStockBreakdown(rel.productId2);

            return (
              <div
                key={rel.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 hover:border-indigo-300 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between"
              >
                {/* Header bar of card */}
                <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-stone-400 font-medium">
                      ID: {rel.id}
                    </span>
                    {rel.note && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                        📌 {rel.note}
                      </span>
                    )}
                    {rel.quantity && rel.quantity > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                        {rel.quantity} db
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => deleteBeepuloRelation(rel.id)}
                    className="text-stone-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Kapcsolat törlése"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Body: Parent Product <---> Component Part */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {/* Left: Parent Product */}
                  <div
                    onClick={() => selectProductById(rel.productId1)}
                    className="p-3 bg-stone-50 hover:bg-indigo-50/50 rounded-xl border border-stone-200 hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                          <span>🏭</span>
                          <span>Főtermék</span>
                        </span>
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono text-[11px] font-bold">
                          {rel.productId1}
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <SafeImage
                          src={prod1?.image}
                          alt={prod1?.name || rel.productId1}
                          className="w-10 h-10 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                          fallback={
                            <div className="w-10 h-10 rounded-lg bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                              <Cpu className="w-4 h-4 text-indigo-600" />
                            </div>
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-900 group-hover:text-indigo-700 transition-colors truncate">
                            {prod1?.name || rel.productId1}
                          </p>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5">
                            {prod1?.category || 'Saruzófej / Gép'}
                          </p>
                          {prod1?.factoryCode && (
                            <p className="text-[10px] font-mono text-stone-400 truncate">
                              {prod1.factoryCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock breakdown */}
                    <div className="mt-2.5 pt-2 border-t border-stone-200/80 flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-stone-500 font-medium">Készlet:</span>
                      <div className="flex items-center gap-1 flex-wrap font-mono">
                        <span
                          className={`px-1 py-0.5 rounded font-bold border ${
                            stock1.newStock > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                          title={stock1.newStock > 0 ? 'Új raktárkészlet' : 'Nincs új raktárkészlet (0 db)'}
                        >
                          Ú:{stock1.newStock}
                        </span>
                        {stock1.usedStock > 0 && (
                          <span
                            className="px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300"
                            title="Használt raktárkészlet"
                          >
                            H:{stock1.usedStock}
                          </span>
                        )}
                        <span
                          className="px-1 py-0.5 rounded bg-stone-800 text-white font-bold"
                          title="Összesen"
                        >
                          {stock1.totalStock}db
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Component Part */}
                  <div
                    onClick={() => selectProductById(rel.productId2)}
                    className="p-3 bg-stone-50 hover:bg-teal-50/50 rounded-xl border border-stone-200 hover:border-teal-300 transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#006067] flex items-center gap-1">
                          <span>🧩</span>
                          <span>Beépülő alkatrész</span>
                        </span>
                        <div className="inline-flex items-center px-2 py-0.5 rounded bg-teal-50 text-[#006067] border border-teal-200 font-mono text-[11px] font-bold">
                          {rel.productId2}
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <SafeImage
                          src={prod2?.image}
                          alt={prod2?.name || rel.productId2}
                          className="w-10 h-10 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                          fallback={
                            <div className="w-10 h-10 rounded-lg bg-stone-200 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                              <Puzzle className="w-4 h-4 text-teal-700" />
                            </div>
                          }
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-stone-900 group-hover:text-[#006067] transition-colors truncate">
                            {prod2?.name || rel.productId2}
                          </p>
                          <p className="text-[10px] text-stone-500 truncate mt-0.5">
                            {prod2?.partType || prod2?.category || 'Alkatrész'}
                          </p>
                          {prod2?.factoryCode && (
                            <p className="text-[10px] font-mono text-stone-400 truncate">
                              {prod2.factoryCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock breakdown */}
                    <div className="mt-2.5 pt-2 border-t border-stone-200/80 flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-stone-500 font-medium">Készlet:</span>
                      <div className="flex items-center gap-1 flex-wrap font-mono">
                        <span
                          className={`px-1 py-0.5 rounded font-bold border ${
                            stock2.newStock > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                          title={stock2.newStock > 0 ? 'Új raktárkészlet' : 'Nincs új raktárkészlet (0 db)'}
                        >
                          Ú:{stock2.newStock}
                        </span>
                        {stock2.usedStock > 0 && (
                          <span
                            className="px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300"
                            title="Használt raktárkészlet"
                          >
                            H:{stock2.usedStock}
                          </span>
                        )}
                        <span
                          className="px-1 py-0.5 rounded bg-stone-800 text-white font-bold"
                          title="Összesen"
                        >
                          {stock2.totalStock}db
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Relation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Puzzle className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Új Beépülő Alkatrész Kapcsolat Rögzítése
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Főtermék ID (Pl. Saruzófej Termékkód) *
                </label>
                <input
                  type="text"
                  value={newP1}
                  onChange={(e) => setNewP1(e.target.value)}
                  placeholder="Pl. 40107.00.33"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Beépülő Alkatrész ID (Alkatrész Termékkód) *
                </label>
                <input
                  type="text"
                  value={newP2}
                  onChange={(e) => setNewP2(e.target.value)}
                  placeholder="Pl. ME.911330114 vagy MLS0185-J"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mennyiség (db)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Megjegyzés / Pozíció
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Pl. ELSŐ MOZGÓ ÜLLŐ"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#006067] text-white hover:bg-[#00474c] transition-colors cursor-pointer shadow-xs"
                >
                  Kapcsolat Mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

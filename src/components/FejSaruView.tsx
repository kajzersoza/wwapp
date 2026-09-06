import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { FejSaruRelation } from '../types';
import { TermekIdLink } from './TermekIdLink';
import { SafeImage } from './SafeImage';
import {
  Cpu,
  Zap,
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
  LayoutGrid,
  Table as TableIcon,
  Tag,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';

export const FejSaruView: React.FC = () => {
  const {
    fejSaru,
    products,
    rawProducts,
    selectProductById,
    addFejSaruRelation,
    deleteFejSaruRelation,
    getNextFejSaruId,
    exportFejSaruCsv,
    importFejSaruCsvText,
    getProductStockBreakdown,
    isSyncing,
    syncWithGoogleSheet,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'fej' | 'saru'>('all');
  const [viewLayout, setViewLayout] = useState<'table' | 'cards'>('table');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newP1, setNewP1] = useState('');
  const [newP2, setNewP2] = useState('');
  const [newNote, setNewNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const uniqueFejek = new Set<string>();
    const uniqueSaruk = new Set<string>();
    const allInvolved = new Set<string>();

    fejSaru.forEach((r) => {
      if (r.productId1) {
        uniqueFejek.add(r.productId1.toLowerCase());
        allInvolved.add(r.productId1.toLowerCase());
      }
      if (r.productId2) {
        uniqueSaruk.add(r.productId2.toLowerCase());
        allInvolved.add(r.productId2.toLowerCase());
      }
    });

    return {
      totalRelations: fejSaru.length,
      uniqueFejekCount: uniqueFejek.size,
      uniqueSarukCount: uniqueSaruk.size,
      totalInvolved: allInvolved.size,
    };
  }, [fejSaru]);

  // Enriched and Filtered FejSaru relations
  const filteredRelations = useMemo(() => {
    return fejSaru.filter((rel) => {
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
          (prod1?.description?.toLowerCase().includes(q) ?? false);
        const m2 =
          p2.toLowerCase().includes(q) ||
          (prod2?.name.toLowerCase().includes(q) ?? false) ||
          (prod2?.factoryCode?.toLowerCase().includes(q) ?? false) ||
          (prod2?.description?.toLowerCase().includes(q) ?? false);
        const mNote = (rel.note || '').toLowerCase().includes(q);
        const mid = rel.id.toLowerCase().includes(q);
        if (!m1 && !m2 && !mNote && !mid) return false;
      }

      if (filterRole === 'fej') {
        const isFej =
          (prod1?.category || '').toLowerCase().includes('fej') ||
          (prod1?.category || '').toLowerCase().includes('saruzó');
        if (!isFej && !p1.startsWith('40107.')) return false;
      } else if (filterRole === 'saru') {
        const isSaru =
          (prod2?.category || '').toLowerCase().includes('saru') ||
          (prod1?.category || '').toLowerCase().includes('saru');
        if (!isSaru) return false;
      }

      return true;
    });
  }, [fejSaru, products, rawProducts, searchQuery, filterRole]);

  const handleAddRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newP1.trim() || !newP2.trim()) {
      setFormError('Mindkét azonosító (Saruzófej ID és Saru ID) megadása kötelező!');
      return;
    }

    const cleanP1 = newP1.trim();
    const cleanP2 = newP2.trim();

    // Check if relation already exists
    const exists = fejSaru.some(
      (r) =>
        (r.productId1.toLowerCase() === cleanP1.toLowerCase() &&
          r.productId2.toLowerCase() === cleanP2.toLowerCase()) ||
        (r.productId1.toLowerCase() === cleanP2.toLowerCase() &&
          r.productId2.toLowerCase() === cleanP1.toLowerCase())
    );

    if (exists) {
      setFormError('Ez a Saruzófej – Saru kapcsolat már szerepel az adatbázisban!');
      return;
    }

    const newRelation: FejSaruRelation = {
      id: getNextFejSaruId(),
      productId1: cleanP1,
      productId2: cleanP2,
      note: newNote.trim() ? newNote.trim() : undefined,
    };

    addFejSaruRelation(newRelation);
    setNewP1('');
    setNewP2('');
    setNewNote('');
    setFormError(null);
    setIsAddModalOpen(false);
  };

  const handleExportCsv = () => {
    const csv = exportFejSaruCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FejSaru_Relations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const count = importFejSaruCsvText(text);
        setImportStatus(`Sikeresen importálva: ${count} db FejSaru kapcsolat!`);
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067] shadow-2xs">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Saruzófej – Saru Kapcsolat
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#006067] border border-teal-200">
                  {fejSaru.length} kapcsolat
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="sync-fejsaru-btn"
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Szinkronizálás a Google Táblázatból"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Szinkron...' : 'Szinkron'}</span>
            </button>

            <button
              type="button"
              id="export-fejsaru-csv-btn"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Export</span>
            </button>

            <label
              htmlFor="fejsaru-csv-upload"
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>CSV Import</span>
              <input
                id="fejsaru-csv-upload"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              id="add-fejsaru-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-[#006067] hover:bg-[#00474c] text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Új Kapcsolat</span>
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {importStatus && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* KPI Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-stone-100">
          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Összes Kapcsolat
            </span>
            <span className="text-lg font-black text-stone-900 mt-0.5 block font-mono">
              {stats.totalRelations} db
            </span>
          </div>

          <div className="bg-teal-50/70 rounded-xl p-3 border border-teal-200/70">
            <span className="text-[11px] font-bold text-[#006067] uppercase tracking-wider block">
              Egyedi Saruzófejek
            </span>
            <span className="text-lg font-black text-[#006067] mt-0.5 block font-mono">
              {stats.uniqueFejekCount} db
            </span>
          </div>

          <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/70">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
              Egyedi Saruk
            </span>
            <span className="text-lg font-black text-amber-900 mt-0.5 block font-mono">
              {stats.uniqueSarukCount} db
            </span>
          </div>

          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/70">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Érintett Cikkszámok
            </span>
            <span className="text-lg font-black text-stone-900 mt-0.5 block font-mono">
              {stats.totalInvolved} termék
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            id="fejsaru-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés Saruzófej vagy Saru ID, név, megjegyzés vagy gyári kód szerint..."
            className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:border-[#006067] focus:ring-2 focus:ring-[#006067]/10 outline-hidden transition-all"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterRole === 'all'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Összes ({fejSaru.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('fej')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterRole === 'fej'
                  ? 'bg-white text-[#006067] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Csak Fejek
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('saru')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                filterRole === 'saru'
                  ? 'bg-white text-amber-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Csak Saruk
            </button>
          </div>

          {/* Layout Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewLayout === 'table' ? 'bg-white text-[#006067] shadow-2xs' : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Táblázat nézet"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('cards')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewLayout === 'cards' ? 'bg-white text-[#006067] shadow-2xs' : 'text-stone-500 hover:text-stone-900'
              }`}
              title="Kártya nézet"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Relations Content: Table or Cards */}
      {viewLayout === 'table' ? (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/90 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[280px]">Saruzófej (Fej)</th>
                  <th className="py-3 px-2 text-center w-24">Kapcsolat</th>
                  <th className="py-3 px-4 min-w-[280px]">Saru</th>
                  <th className="py-3 px-4 min-w-[160px]">Megjegyzés / Norma</th>
                  <th className="py-3 px-4 text-right w-16">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRelations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-500">
                      <Zap className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                      <p className="font-semibold text-sm">Nem található FejSaru kapcsolat</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Próbáljon meg más keresési feltételt vagy vegyen fel egy új kapcsolatot!
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRelations.map((rel, index) => {
                    const p1 = (rel.productId1 || '').trim();
                    const p2 = (rel.productId2 || '').trim();

                    const prod1 =
                      products.find((p) => p.id.toLowerCase() === p1.toLowerCase()) ||
                      rawProducts.find((p) => p.id.toLowerCase() === p1.toLowerCase());
                    const prod2 =
                      products.find((p) => p.id.toLowerCase() === p2.toLowerCase()) ||
                      rawProducts.find((p) => p.id.toLowerCase() === p2.toLowerCase());

                    const stock1 = getProductStockBreakdown(p1);
                    const stock2 = getProductStockBreakdown(p2);

                    return (
                      <tr
                        key={rel.id}
                        className="hover:bg-stone-50/80 transition-colors group"
                      >
                        <td className="py-3 px-4 font-mono text-stone-400 text-[11px] text-center">
                          {index + 1}
                        </td>

                        {/* Product 1: Saruzófej */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={prod1?.image}
                              productId={prod1?.id || p1}
                              alt={prod1?.name || p1}
                              className="w-10 h-10 object-cover rounded-lg bg-white border border-stone-200 flex-shrink-0"
                              fallback={
                                <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067] flex-shrink-0">
                                  <Cpu className="w-4 h-4" />
                                </div>
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <TermekIdLink id={p1} showIcon={false} />
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-teal-50 text-[#006067] border-teal-200">
                                  {prod1?.category || 'Saruzófej'}
                                </span>
                              </div>
                              <p
                                onClick={() => selectProductById(p1)}
                                className="text-xs font-bold text-stone-900 hover:text-[#006067] cursor-pointer transition-colors break-words whitespace-normal leading-snug mt-0.5"
                              >
                                {prod1?.name || p1}
                              </p>
                              {prod1?.factoryCode && (
                                <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                                  Gyári kód: <span className="font-semibold text-stone-700">{prod1.factoryCode}</span>
                                </p>
                              )}
                              {prod1?.location && (
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                  <span>{prod1.location}</span>
                                </p>
                              )}

                              {/* Stock status badges: Új (always shown, red if 0), Használt, Össz */}
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    stock1.newStock > 0
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-red-100 text-red-700 border-red-200'
                                  }`}
                                  title={stock1.newStock > 0 ? 'Új készlet' : 'Nincs új készlet (0 db)'}
                                >
                                  Új: {stock1.newStock} db
                                </span>
                                {stock1.usedStock > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Használt: {stock1.usedStock} db
                                  </span>
                                )}
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold">
                                  Össz: {stock1.totalStock} db
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Connection Center */}
                        <td className="py-3 px-2 text-center">
                          <div className="inline-flex flex-col items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 group-hover:bg-teal-100 group-hover:text-[#006067] flex items-center justify-center transition-colors">
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </td>

                        {/* Product 2: Saru */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={prod2?.image}
                              productId={prod2?.id || p2}
                              alt={prod2?.name || p2}
                              className="w-10 h-10 object-cover rounded-lg bg-white border border-stone-200 flex-shrink-0"
                              fallback={
                                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
                                  <Zap className="w-4 h-4" />
                                </div>
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <TermekIdLink id={p2} showIcon={false} />
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-amber-50 text-amber-800 border-amber-200">
                                  {prod2?.category || 'Saru'}
                                </span>
                              </div>
                              <p
                                onClick={() => selectProductById(p2)}
                                className="text-xs font-bold text-stone-900 hover:text-amber-800 cursor-pointer transition-colors break-words whitespace-normal leading-snug mt-0.5"
                              >
                                {prod2?.name || p2}
                              </p>
                              {prod2?.factoryCode && (
                                <p className="text-[11px] font-mono text-stone-500 mt-0.5">
                                  Gyári kód: <span className="font-semibold text-stone-700">{prod2.factoryCode}</span>
                                </p>
                              )}
                              {prod2?.location && (
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                  <span>{prod2.location}</span>
                                </p>
                              )}

                              {/* Stock status badges: Új (always shown, red if 0), Használt, Össz */}
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    stock2.newStock > 0
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-red-100 text-red-700 border-red-200'
                                  }`}
                                  title={stock2.newStock > 0 ? 'Új készlet' : 'Nincs új készlet (0 db)'}
                                >
                                  Új: {stock2.newStock} db
                                </span>
                                {stock2.usedStock > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    Használt: {stock2.usedStock} db
                                  </span>
                                )}
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold">
                                  Össz: {stock2.totalStock} db
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Note / Spec */}
                        <td className="py-3 px-4 text-stone-600">
                          {rel.note ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-100 text-stone-800 text-[11px] font-medium">
                              {rel.note}
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px] italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Biztosan törölni szeretné ezt a FejSaru kapcsolatot (${p1} ↔ ${p2})?`)) {
                                deleteFejSaruRelation(rel.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Kapcsolat törlése"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRelations.map((rel) => {
            const p1 = (rel.productId1 || '').trim();
            const p2 = (rel.productId2 || '').trim();

            const prod1 =
              products.find((p) => p.id.toLowerCase() === p1.toLowerCase()) ||
              rawProducts.find((p) => p.id.toLowerCase() === p1.toLowerCase());
            const prod2 =
              products.find((p) => p.id.toLowerCase() === p2.toLowerCase()) ||
              rawProducts.find((p) => p.id.toLowerCase() === p2.toLowerCase());

            const stock1 = getProductStockBreakdown(p1);
            const stock2 = getProductStockBreakdown(p2);

            return (
              <div
                key={rel.id}
                className="bg-white rounded-2xl border-2 border-amber-300 hover:border-amber-400 p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top bar with Relation ID and Note */}
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="font-mono text-[10px] text-stone-400 font-bold uppercase">
                      ID: {rel.id}
                    </span>
                    {rel.note && (
                      <span className="px-2 py-0.5 rounded bg-teal-50 text-[#006067] border border-teal-200 text-[10px] font-bold">
                        {rel.note}
                      </span>
                    )}
                  </div>

                  {/* Fej Card Part */}
                  <div
                    onClick={() => selectProductById(p1)}
                    className="p-2.5 rounded-xl bg-stone-50 hover:bg-[#F4F7F6] border border-stone-200 cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <SafeImage
                      src={prod1?.image}
                      productId={prod1?.id || p1}
                      alt={prod1?.name || p1}
                      className="w-11 h-11 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                      fallback={
                        <div className="w-11 h-11 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067] shrink-0">
                          <Cpu className="w-5 h-5" />
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <TermekIdLink id={p1} showIcon={false} />
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#006067] border border-teal-200">
                          Saruzófej
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 break-words leading-tight mt-0.5">
                        {prod1?.name || p1}
                      </p>
                      {prod1?.factoryCode && (
                        <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                          {prod1.factoryCode}
                        </p>
                      )}

                      {/* Stock */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            stock1.newStock > 0
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          Új: {stock1.newStock} db
                        </span>
                        {stock1.usedStock > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            H: {stock1.usedStock} db
                          </span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold">
                          Össz: {stock1.totalStock} db
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Saru Card Part */}
                  <div
                    onClick={() => selectProductById(p2)}
                    className="p-2.5 rounded-xl bg-stone-50 hover:bg-[#F4F7F6] border border-stone-200 cursor-pointer transition-colors flex items-start gap-3"
                  >
                    <SafeImage
                      src={prod2?.image}
                      productId={prod2?.id || p2}
                      alt={prod2?.name || p2}
                      className="w-11 h-11 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                      fallback={
                        <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                          <Zap className="w-5 h-5" />
                        </div>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <TermekIdLink id={p2} showIcon={false} />
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Saru
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 break-words leading-tight mt-0.5">
                        {prod2?.name || p2}
                      </p>
                      {prod2?.factoryCode && (
                        <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                          {prod2.factoryCode}
                        </p>
                      )}

                      {/* Stock */}
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            stock2.newStock > 0
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          Új: {stock2.newStock} db
                        </span>
                        {stock2.usedStock > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            H: {stock2.usedStock} db
                          </span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold">
                          Össz: {stock2.totalStock} db
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom delete action */}
                <div className="pt-2 border-t border-stone-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Biztosan törölni szeretné ezt a FejSaru kapcsolatot (${p1} ↔ ${p2})?`)) {
                        deleteFejSaruRelation(rel.id);
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Kapcsolat törlése"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Relation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-50 text-[#006067]">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-stone-900">
                  Új FejSaru Kapcsolat Létrehozása
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRelation} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Saruzófej (Fej azonosító) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="fej-products-list"
                  value={newP1}
                  onChange={(e) => setNewP1(e.target.value)}
                  placeholder="pl. 40107.00.33 vagy N1"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067] font-mono"
                  required
                />
                <datalist id="fej-products-list">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.category || 'Termék'}
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-stone-400 mt-1">
                  Adja meg a Saruzófej ID-t vagy válasszon a listából.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Saru (Saru azonosító) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="saru-products-list"
                  value={newP2}
                  onChange={(e) => setNewP2(e.target.value)}
                  placeholder="pl. 4030610910 vagy 2122120061"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067] font-mono"
                  required
                />
                <datalist id="saru-products-list">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.category || 'Termék'}
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-stone-400 mt-1">
                  Adja meg a kompatibilis Saru ID-t.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Megjegyzés / Huzal keresztmetszet (opcionális)
                </label>
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="pl. F profil, 0.5-1.0 mm²"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#006067] hover:bg-[#00474c] rounded-lg shadow-xs cursor-pointer"
                >
                  Kapcsolat Hozzáadása
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

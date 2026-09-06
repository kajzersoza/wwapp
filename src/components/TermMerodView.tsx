import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { TermMerodRelation } from '../types';
import { TermekIdLink } from './TermekIdLink';
import { SafeImage } from './SafeImage';
import {
  Gauge,
  Box,
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
  Cpu,
} from 'lucide-react';

export const TermMerodView: React.FC = () => {
  const {
    termMerod,
    products,
    rawProducts,
    selectProductById,
    addTermMerodRelation,
    deleteTermMerodRelation,
    getNextTermMerodId,
    exportTermMerodCsv,
    importTermMerodCsvText,
    isSyncing,
    syncWithGoogleSheet,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'product' | 'box'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newP1, setNewP1] = useState('');
  const [newP2, setNewP2] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const uniqueProducts = new Set<string>();
    const uniqueBoxes = new Set<string>();
    const allInvolved = new Set<string>();

    termMerod.forEach((r) => {
      if (r.productId1) {
        uniqueProducts.add(r.productId1.toLowerCase());
        allInvolved.add(r.productId1.toLowerCase());
      }
      if (r.productId2) {
        uniqueBoxes.add(r.productId2.toLowerCase());
        allInvolved.add(r.productId2.toLowerCase());
      }
    });

    return {
      totalRelations: termMerod.length,
      uniqueProductsCount: uniqueProducts.size,
      uniqueBoxesCount: uniqueBoxes.size,
      totalInvolved: allInvolved.size,
    };
  }, [termMerod]);

  // Enriched and Filtered TermMerod relations
  const filteredRelations = useMemo(() => {
    return termMerod.filter((rel) => {
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
        const mid = rel.id.toLowerCase().includes(q);
        if (!m1 && !m2 && !mid) return false;
      }

      if (filterRole === 'product') {
        const isBoxP1 =
          p1.toUpperCase().startsWith('MD-') ||
          (prod1?.category || '').toLowerCase().includes('mérő') ||
          (prod1?.category || '').toLowerCase().includes('merodoboz');
        if (isBoxP1) return false;
      } else if (filterRole === 'box') {
        const isBoxP2 =
          p2.toUpperCase().startsWith('MD-') ||
          (prod2?.category || '').toLowerCase().includes('mérő') ||
          (prod2?.category || '').toLowerCase().includes('merodoboz');
        if (!isBoxP2) return false;
      }

      return true;
    });
  }, [termMerod, products, rawProducts, searchQuery, filterRole]);

  const handleAddRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newP1.trim() || !newP2.trim()) {
      setFormError('Mindkét azonosító (Termék ID és Mérődoboz ID) megadása kötelező!');
      return;
    }

    const cleanP1 = newP1.trim();
    const cleanP2 = newP2.trim();

    // Check if relation already exists
    const exists = termMerod.some(
      (r) =>
        (r.productId1.toLowerCase() === cleanP1.toLowerCase() &&
          r.productId2.toLowerCase() === cleanP2.toLowerCase()) ||
        (r.productId1.toLowerCase() === cleanP2.toLowerCase() &&
          r.productId2.toLowerCase() === cleanP1.toLowerCase())
    );

    if (exists) {
      setFormError('Ez a Termék – Mérődoboz kapcsolat már szerepel az adatbázisban!');
      return;
    }

    const newRel: TermMerodRelation = {
      id: getNextTermMerodId(),
      productId1: cleanP1,
      productId2: cleanP2,
    };

    addTermMerodRelation(newRel);
    setIsAddModalOpen(false);
    setNewP1('');
    setNewP2('');
    setFormError(null);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportTermMerodCsv();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `termmerod_kapcsolatok_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const count = importTermMerodCsvText(text);
        if (count > 0) {
          setImportStatus(`Sikeresen importálva: ${count} TermMerod kapcsolat!`);
        } else {
          setImportStatus('Nem sikerült érvényes TermMerod rekordokat beolvasni.');
        }
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Gauge className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                TermMerod Kapcsolatok
              </h1>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Termékek és hozzárendelt Mérődobozok (Mérőeszközök) közötti összerendelések kezelése
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              type="button"
              id="sync-termmerod-btn"
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Szinkronizálás a Google Táblázattal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Szinkronizálás...' : 'Frissítés'}</span>
            </button>

            <label className="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>CSV Import</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              id="export-termmerod-btn"
              onClick={handleDownloadCsv}
              className="px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Export</span>
            </button>

            <button
              type="button"
              id="add-termmerod-btn"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Új Kapcsolat</span>
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Összes TermMerod Kapcsolat</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.totalRelations.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Kapcsolt Termékek</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.uniqueProductsCount.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Mérődobozok</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.uniqueBoxesCount.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Érintett Elemek</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.totalInvolved.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="termmerod-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés Termék ID, Mérődoboz ID vagy megnevezés alapján..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Szűrés:
          </span>
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterRole === 'all'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Összes ({termMerod.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('product')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterRole === 'product'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Termékek
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('box')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterRole === 'box'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mérődobozok
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border-2 border-emerald-300 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-16">#</th>
                <th className="py-3 px-4">Termék</th>
                <th className="py-3 px-2 text-center w-12">Kapcsolat</th>
                <th className="py-3 px-4">Mérődoboz</th>
                <th className="py-3 px-4 text-right w-24">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRelations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-500">
                    <Info className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">Nem található TermMerod kapcsolat</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Próbálja meg módosítani a keresési vagy szűrési feltételeket.
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

                  return (
                    <tr
                      key={rel.id}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono text-stone-400 text-[11px]">
                        {index + 1}
                      </td>

                      {/* Product 1 (Termék) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={prod1?.image}
                            alt={prod1?.name || p1}
                            className="w-9 h-9 object-cover rounded bg-white border border-stone-200 flex-shrink-0"
                            fallback={
                              <div className="w-9 h-9 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                                <Cpu className="w-4 h-4" />
                              </div>
                            }
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <TermekIdLink id={p1} showIcon={false} />
                              {prod1?.category && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                                  {prod1.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-stone-900 break-words whitespace-normal leading-snug mt-0.5">
                              {prod1?.name || p1}
                            </p>
                            {prod1?.description && (
                              <p className="text-[11px] text-stone-600 break-words whitespace-normal leading-tight mt-0.5">
                                {prod1.description}
                              </p>
                            )}
                            {prod1?.location && (
                              <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                                Hely: {prod1.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Connection Icon */}
                      <td className="py-3.5 px-2 text-center">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 text-stone-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </td>

                      {/* Product 2 (Mérődoboz) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={prod2?.image}
                            alt={prod2?.name || p2}
                            className="w-9 h-9 object-cover rounded bg-white border border-stone-200 flex-shrink-0"
                            fallback={
                              <div className="w-9 h-9 rounded bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
                                <Box className="w-4 h-4" />
                              </div>
                            }
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <TermekIdLink id={p2} showIcon={false} />
                              {prod2?.category && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                                  {prod2.category}
                                </span>
                              )}
                              {!prod2?.category && p2.toUpperCase().startsWith('MD-') && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                                  Mérődoboz
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-stone-900 break-words whitespace-normal leading-snug mt-0.5">
                              {prod2?.name || p2}
                            </p>
                            {prod2?.description && (
                              <p className="text-[11px] text-stone-600 break-words whitespace-normal leading-tight mt-0.5">
                                {prod2.description}
                              </p>
                            )}
                            {prod2?.location && (
                              <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                                Hely: {prod2.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Biztosan törölni szeretné ezt a TermMerod kapcsolatot (${p1} ↔ ${p2})?`)) {
                              deleteTermMerodRelation(rel.id);
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

      {/* Add Relation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-stone-900">
                  Új TermMerod Kapcsolat
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
                  Termék (pl. Saruzófej azonosító) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="term-products-list"
                  value={newP1}
                  onChange={(e) => setNewP1(e.target.value)}
                  placeholder="pl. 40107.00.33 vagy N1"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-mono"
                  required
                />
                <datalist id="term-products-list">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.category || 'Termék'}
                    </option>
                  ))}
                </datalist>
                <p className="text-[10px] text-stone-400 mt-1">
                  Adja meg a termék ID-t vagy válasszon a listából.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mérődoboz (Mérődoboz azonosító) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list="merod-list"
                  value={newP2}
                  onChange={(e) => setNewP2(e.target.value)}
                  placeholder="pl. MD-001 vagy egyéb azonosító"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 font-mono"
                  required
                />
                <datalist id="merod-list">
                  <option value="MD-001">Mérődoboz MD-001</option>
                  <option value="MD-002">Mérődoboz MD-002</option>
                  <option value="MD-003">Mérődoboz MD-003</option>
                  <option value="MD-004">Mérődoboz MD-004</option>
                  <option value="MD-005">Mérődoboz MD-005</option>
                  <option value="MD-006">Mérődoboz MD-006</option>
                  <option value="MD-007">Mérődoboz MD-007</option>
                  <option value="MD-008">Mérődoboz MD-008</option>
                  <option value="MD-009">Mérődoboz MD-009</option>
                  <option value="MD-010">Mérődoboz MD-010</option>
                  {products.map((p) => (
                    <option key={`p2-${p.id}`} value={p.id}>
                      {p.id} - {p.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-2xs cursor-pointer transition-colors"
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

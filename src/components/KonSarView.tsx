import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { KonSarRelation } from '../types';
import { TermekIdLink } from './TermekIdLink';
import { SafeImage } from './SafeImage';
import {
  Link2,
  Search,
  Plus,
  Download,
  Upload,
  ExternalLink,
  Trash2,
  ArrowRight,
  Filter,
  RefreshCw,
  Info,
  CheckCircle2,
  Layers,
  Zap,
  Plug,
} from 'lucide-react';

export const KonSarView: React.FC = () => {
  const {
    konSar,
    products,
    rawProducts,
    selectProductById,
    addKonSarRelation,
    deleteKonSarRelation,
    getNextKonSarId,
    exportKonSarCsv,
    importKonSarCsvText,
    isSyncing,
    syncWithGoogleSheet,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'konnektor' | 'saru'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newP1, setNewP1] = useState('');
  const [newP2, setNewP2] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Stats calculation
  const stats = useMemo(() => {
    const uniqueProducts = new Set<string>();
    let konnektorCount = 0;
    let saruCount = 0;

    konSar.forEach((r) => {
      if (r.productId1) uniqueProducts.add(r.productId1.toLowerCase());
      if (r.productId2) uniqueProducts.add(r.productId2.toLowerCase());
    });

    products.forEach((p) => {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      if (cat.includes('konnektor') || name.includes('konnektor')) konnektorCount++;
      if (cat.includes('saru') || name.includes('saru')) saruCount++;
    });

    return {
      totalRelations: konSar.length,
      uniqueProductsInvolved: uniqueProducts.size,
      totalKonnektors: konnektorCount,
      totalSarus: saruCount,
    };
  }, [konSar, products]);

  // Enriched and Filtered KonSar relations
  const filteredRelations = useMemo(() => {
    return konSar.filter((rel) => {
      const p1 = (rel.productId1 || '').trim();
      const p2 = (rel.productId2 || '').trim();

      const prod1 = products.find(
        (p) => p.id.toLowerCase() === p1.toLowerCase()
      ) || rawProducts.find((p) => p.id.toLowerCase() === p1.toLowerCase());

      const prod2 = products.find(
        (p) => p.id.toLowerCase() === p2.toLowerCase()
      ) || rawProducts.find((p) => p.id.toLowerCase() === p2.toLowerCase());

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const m1 = p1.toLowerCase().includes(q) || (prod1?.name.toLowerCase().includes(q) ?? false) || (prod1?.factoryCode?.toLowerCase().includes(q) ?? false);
        const m2 = p2.toLowerCase().includes(q) || (prod2?.name.toLowerCase().includes(q) ?? false) || (prod2?.factoryCode?.toLowerCase().includes(q) ?? false);
        const mid = rel.id.toLowerCase().includes(q);
        if (!m1 && !m2 && !mid) return false;
      }

      if (filterType === 'konnektor') {
        const isP1Konn = prod1?.category?.toLowerCase().includes('konnektor') || prod1?.name.toLowerCase().includes('konnektor');
        const isP2Konn = prod2?.category?.toLowerCase().includes('konnektor') || prod2?.name.toLowerCase().includes('konnektor');
        if (!isP1Konn && !isP2Konn) return false;
      } else if (filterType === 'saru') {
        const isP1Saru = prod1?.category?.toLowerCase().includes('saru') || prod1?.name.toLowerCase().includes('saru');
        const isP2Saru = prod2?.category?.toLowerCase().includes('saru') || prod2?.name.toLowerCase().includes('saru');
        if (!isP1Saru && !isP2Saru) return false;
      }

      return true;
    });
  }, [konSar, products, rawProducts, searchQuery, filterType]);

  const handleAddRelation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newP1.trim() || !newP2.trim()) {
      setFormError('Mindkét Termék ID megadása kötelező!');
      return;
    }

    const cleanP1 = newP1.trim();
    const cleanP2 = newP2.trim();

    // Check if relation already exists
    const exists = konSar.some(
      (r) =>
        (r.productId1.toLowerCase() === cleanP1.toLowerCase() &&
          r.productId2.toLowerCase() === cleanP2.toLowerCase()) ||
        (r.productId1.toLowerCase() === cleanP2.toLowerCase() &&
          r.productId2.toLowerCase() === cleanP1.toLowerCase())
    );

    if (exists) {
      setFormError('Ez a Konnektor - Saru kapcsolat már szerepel az adatbázisban!');
      return;
    }

    const newRel: KonSarRelation = {
      id: getNextKonSarId(),
      productId1: cleanP1,
      productId2: cleanP2,
    };

    addKonSarRelation(newRel);
    setIsAddModalOpen(false);
    setNewP1('');
    setNewP2('');
    setFormError(null);
  };

  const handleDownloadCsv = () => {
    const csvContent = exportKonSarCsv();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `konsar_kapcsolatok_${new Date().toISOString().slice(0, 10)}.csv`);
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
        const count = importKonSarCsvText(text);
        setImportStatus(`Sikeresen importálva: ${count} KonSar rekord.`);
        setTimeout(() => setImportStatus(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067] flex-shrink-0">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900">
                  KonSar – Konnektor és Saru Kapcsolatok
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-[#006067] border border-teal-200">
                  Kategória: Konnektor ⇄ Saru
                </span>
              </div>
              <p className="text-sm text-stone-500 mt-1 max-w-2xl">
                A KonSar munkalapon definiált kapcsolatok megmutatják, hogy az egyes Konnektorokhoz melyik Saru csatlakozik, és fordítva. Bármelyik termékre kattintva azonnal megnyílik annak részletes adatlapja.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="konsar-refresh-btn"
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Szinkronizáció Google Sheets-ből"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#006067]' : ''}`} />
              <span>{isSyncing ? 'Frissítés...' : 'Szinkronizálás'}</span>
            </button>

            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>CSV Import</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              id="konsar-export-csv-btn"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Export</span>
            </button>

            <button
              type="button"
              id="konsar-add-btn"
              onClick={() => {
                setFormError(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Új Kapcsolat</span>
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{importStatus}</span>
          </div>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067]">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Összes KonSar Kapcsolat</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.totalRelations.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Konnektor Termékek</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.totalKonnektors.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Saru Termékek</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.totalSarus.toLocaleString('hu-HU')}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Érintett Termékek</p>
            <p className="text-xl font-bold text-stone-900 font-mono">
              {stats.uniqueProductsInvolved.toLocaleString('hu-HU')}
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
            id="konsar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Keresés Termék ID, megnevezés vagy kód alapján..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067] transition-all"
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
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white text-[#006067] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Összes ({konSar.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('konnektor')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterType === 'konnektor'
                  ? 'bg-white text-[#006067] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Konnektorok
            </button>
            <button
              type="button"
              onClick={() => setFilterType('saru')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                filterType === 'saru'
                  ? 'bg-white text-[#006067] shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Saruk
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border-2 border-sky-300 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-16">#</th>
                <th className="py-3 px-4">Termék 1 (Konnektor / Saru)</th>
                <th className="py-3 px-2 text-center w-12">Kapcsolat</th>
                <th className="py-3 px-4">Termék 2 (Csatlakozó Saru / Konnektor)</th>
                <th className="py-3 px-4 text-right w-24">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRelations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-stone-500">
                    <Info className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700">Nem található KonSar kapcsolat</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Próbálja meg módosítani a keresési vagy szűrési feltételeket.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRelations.map((rel, index) => {
                  const p1 = (rel.productId1 || '').trim();
                  const p2 = (rel.productId2 || '').trim();

                  const prod1 = products.find((p) => p.id.toLowerCase() === p1.toLowerCase()) ||
                    rawProducts.find((p) => p.id.toLowerCase() === p1.toLowerCase());
                  const prod2 = products.find((p) => p.id.toLowerCase() === p2.toLowerCase()) ||
                    rawProducts.find((p) => p.id.toLowerCase() === p2.toLowerCase());

                  const isP1Konn = prod1?.category?.toLowerCase().includes('konnektor') || prod1?.name.toLowerCase().includes('konnektor');
                  const isP2Konn = prod2?.category?.toLowerCase().includes('konnektor') || prod2?.name.toLowerCase().includes('konnektor');

                  return (
                    <tr
                      key={rel.id}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono text-stone-400 text-[11px]">
                        {index + 1}
                      </td>

                      {/* Product 1 */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={prod1?.image}
                            productId={prod1?.id || p1}
                            alt={prod1?.name || p1}
                            className="w-9 h-9 object-cover rounded bg-white border border-stone-200 flex-shrink-0"
                            fallback={
                              <div className="w-9 h-9 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0">
                                {isP1Konn ? <Plug className="w-4 h-4 text-blue-600" /> : <Zap className="w-4 h-4 text-amber-600" />}
                              </div>
                            }
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <TermekIdLink id={p1} showIcon={false} />
                              {prod1?.category && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                  isP1Konn
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {prod1.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-stone-900 break-words whitespace-normal leading-snug mt-0.5">
                              {prod1?.name || p1}
                            </p>
                            {prod1?.location && (
                              <p className="text-[11px] text-stone-500 font-mono">
                                Hely: {prod1.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Connection Icon */}
                      <td className="py-3.5 px-2 text-center">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-teal-50 text-[#006067] border border-teal-200 shadow-2xs">
                          <Link2 className="w-3.5 h-3.5" />
                        </div>
                      </td>

                      {/* Product 2 */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={prod2?.image}
                            productId={prod2?.id || p2}
                            alt={prod2?.name || p2}
                            className="w-9 h-9 object-cover rounded bg-white border border-stone-200 flex-shrink-0"
                            fallback={
                              <div className="w-9 h-9 rounded bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 flex-shrink-0">
                                {isP2Konn ? <Plug className="w-4 h-4 text-blue-600" /> : <Zap className="w-4 h-4 text-amber-600" />}
                              </div>
                            }
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <TermekIdLink id={p2} showIcon={false} />
                              {prod2?.category && (
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                  isP2Konn
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}>
                                  {prod2.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-stone-900 break-words whitespace-normal leading-snug mt-0.5">
                              {prod2?.name || p2}
                            </p>
                            {prod2?.location && (
                              <p className="text-[11px] text-stone-500 font-mono">
                                Hely: {prod2.location}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => selectProductById(p1)}
                            className="p-1.5 text-stone-500 hover:text-[#006067] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="Termék 1 adatlap"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteKonSarRelation(rel.id)}
                            className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Kapcsolat törlése"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Relation Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067]">
                  <Link2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-stone-900">Új KonSar Kapcsolat Rögzítése</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRelation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Termék 1 (pl. Konnektor ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="pl. 13836629"
                  value={newP1}
                  onChange={(e) => setNewP1(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Termék 2 (pl. Saru ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="pl. 13702161"
                  value={newP2}
                  onChange={(e) => setNewP2(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
                />
              </div>

              {formError && (
                <p className="text-red-600 text-xs font-semibold">{formError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-semibold cursor-pointer shadow-xs"
                >
                  Kapcsolat mentése
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

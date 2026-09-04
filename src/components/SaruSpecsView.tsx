import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { SaruSpecMatrix } from './SaruSpecMatrix';
import { SARU_CROSS_SECTIONS, SaruSpec } from '../types';
import {
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Table,
  Sliders,
  ExternalLink,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  Info,
} from 'lucide-react';

export const SaruSpecsView: React.FC = () => {
  const {
    saruSpecs,
    products,
    selectProductById,
    syncWithGoogleSheet,
    isSyncing,
    syncError,
    lastSyncedAt,
    importSaruSpecsCsvText,
    exportSaruSpecsCsv,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrossSection, setSelectedCrossSection] = useState<string>('all');
  const [selectedFeeder, setSelectedFeeder] = useState<string>('all');
  const [activeSpecId, setActiveSpecId] = useState<string | null>(null);
  const [viewStyle, setViewStyle] = useState<'cards' | 'dense-table'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Extract unique feeder tools for filtering
  const uniqueFeeders = useMemo(() => {
    const set = new Set<string>();
    saruSpecs.forEach((s) => {
      if (s.feederTool && s.feederTool.trim()) {
        set.add(s.feederTool.trim());
      }
    });
    return Array.from(set).sort();
  }, [saruSpecs]);

  // Filtered Saru Specs
  const filteredSpecs = useMemo(() => {
    return saruSpecs.filter((spec) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProduct = spec.productId?.toLowerCase().includes(q);
        const matchFactory = spec.factoryCode?.toLowerCase().includes(q);
        const matchFeeder = spec.feederTool?.toLowerCase().includes(q);
        const matchNote = spec.note?.toLowerCase().includes(q);
        const matchLocation = spec.saruLocation?.toLowerCase().includes(q) || spec.feederLocation?.toLowerCase().includes(q);
        
        // Also check if any setting / wire / height / note matches
        const matchValues =
          Object.values(spec.row1Beallitas || {}).some((v) => v.toLowerCase().includes(q)) ||
          Object.values(spec.row2Magassag || spec.row3Magassag || {}).some((v) =>
            v.toLowerCase().includes(q)
          ) ||
          Object.values(spec.row3KeresztmetszetMegjegyzes || spec.row2Vezetek || {}).some((v) =>
            v.toLowerCase().includes(q)
          );

        if (!matchProduct && !matchFactory && !matchFeeder && !matchNote && !matchLocation && !matchValues) {
          return false;
        }
      }

      // 2. Cross section filter
      if (selectedCrossSection !== 'all') {
        const hasB = Boolean(spec.row1Beallitas?.[selectedCrossSection]);
        const hasM = Boolean(
          spec.row2Magassag?.[selectedCrossSection] || spec.row3Magassag?.[selectedCrossSection]
        );
        const hasKm = Boolean(
          spec.row3KeresztmetszetMegjegyzes?.[selectedCrossSection] ||
            spec.row2Vezetek?.[selectedCrossSection]
        );
        if (!hasB && !hasM && !hasKm) {
          return false;
        }
      }

      // 3. Feeder filter
      if (selectedFeeder !== 'all') {
        if (spec.feederTool?.trim() !== selectedFeeder) {
          return false;
        }
      }

      return true;
    });
  }, [saruSpecs, searchQuery, selectedCrossSection, selectedFeeder]);

  // Pagination
  const totalPages = Math.ceil(filteredSpecs.length / pageSize) || 1;
  const paginatedSpecs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSpecs.slice(start, start + pageSize);
  }, [filteredSpecs, currentPage, pageSize]);

  // Handle Export
  const handleExportCsv = () => {
    const csvData = exportSaruSpecsCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Saru_Segedtablazat_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Import
  const handleImportCsv = () => {
    if (!importCsvText.trim()) {
      setImportFeedback({ success: false, message: 'Kérjük illesszen be érvényes CSV szöveget!' });
      return;
    }
    const count = importSaruSpecsCsvText(importCsvText);
    if (count > 0) {
      setImportFeedback({ success: true, message: `Sikeresen importálva: ${count} saru specifikáció!` });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportCsvText('');
        setImportFeedback(null);
      }, 1500);
    } else {
      setImportFeedback({ success: false, message: 'Nem sikerült érvényes saru specifikációkat beolvasni a CSV-ből.' });
    }
  };

  // Find linked product details
  const getProductForSpec = (productId?: string) => {
    if (!productId) return undefined;
    return products.find((p) => p.id === productId || p.id === productId.replace(/^U-/, ''));
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#006067] shadow-2xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-stone-900 tracking-tight flex items-center gap-2">
                  Segédtáblázat 1. Saruk másolata
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#006067] border border-teal-200">
                    {saruSpecs.length} Saru Mátrix
                  </span>
                </h1>
                <p className="text-xs text-stone-500">
                  3 soros keresztmetszeti mátrix (0.25 - 6.00 mm²): 1. Beállítás értéke (I-U), 2. Sarumagasság értéke (W-AI), 3. Keresztmetszet megjegyzések (AJ-AV) + Megjegyzés mező (C oszlop)
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => syncWithGoogleSheet()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors disabled:opacity-50"
              title="Szinkronizálás a Google Táblázattal"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#006067]' : ''}`} />
              <span>{isSyncing ? 'Frissítés...' : 'Google Sheet Sync'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
              title="CSV Exportálás"
            >
              <Download className="w-3.5 h-3.5 text-stone-600" />
              <span>CSV Export</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
              title="CSV Importálás"
            >
              <Upload className="w-3.5 h-3.5 text-stone-600" />
              <span>CSV Import</span>
            </button>
          </div>
        </div>

        {/* Sync status alert if applicable */}
        {syncError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Szinkronizációs figyelmeztetés: {syncError}</span>
          </div>
        )}

        {lastSyncedAt && !syncError && (
          <div className="mt-3 text-[11px] text-stone-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Utolsó sikeres szinkronizáció: {lastSyncedAt}</span>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="mt-5 pt-4 border-t border-stone-100 grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Keresés CEL Kód, Gyári kód, Saruzófej, Megjegyzés, Beállítás..."
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Feeder Tool select */}
          <div className="md:col-span-3">
            <select
              value={selectedFeeder}
              onChange={(e) => {
                setSelectedFeeder(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full py-2 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
            >
              <option value="all">Minden Saruzófej ({uniqueFeeders.length})</option>
              {uniqueFeeders.map((feeder) => (
                <option key={feeder} value={feeder}>
                  Saruzófej: {feeder}
                </option>
              ))}
            </select>
          </div>

          {/* View mode toggle and page size */}
          <div className="md:col-span-4 flex items-center justify-end gap-2">
            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                onClick={() => setViewStyle('cards')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewStyle === 'cards'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kártya Mátrix</span>
              </button>

              <button
                onClick={() => setViewStyle('dense-table')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewStyle === 'dense-table'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Összesítő Tábla</span>
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1.5 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 focus:bg-white"
            >
              <option value={10}>10 db / oldal</option>
              <option value={15}>15 db / oldal</option>
              <option value={25}>25 db / oldal</option>
              <option value={50}>50 db / oldal</option>
            </select>
          </div>
        </div>

        {/* Cross-section quick filters pills */}
        <div className="mt-3.5 pt-3 border-t border-stone-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mr-1">
            Keresztmetszet szűrő:
          </span>
          <button
            onClick={() => {
              setSelectedCrossSection('all');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              selectedCrossSection === 'all'
                ? 'bg-[#006067] text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Összes (0.25 - 6.00)
          </button>
          {SARU_CROSS_SECTIONS.map((cs) => {
            const isSelected = selectedCrossSection === cs;
            return (
              <button
                key={cs}
                onClick={() => {
                  setSelectedCrossSection(cs);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-full font-mono text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#006067] text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {cs} mm²
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <div>
          Találatok: <strong className="text-stone-900 font-bold">{filteredSpecs.length}</strong> saru mátrix
          {searchQuery && <span> erre a keresésre: &quot;{searchQuery}&quot;</span>}
          {selectedCrossSection !== 'all' && <span> • Keresztmetszet: <strong>{selectedCrossSection} mm²</strong></span>}
        </div>
        <div>
          Oldal: <strong className="text-stone-900">{currentPage}</strong> / {totalPages}
        </div>
      </div>

      {/* Main Content: Card Matrix View or Dense Table */}
      {filteredSpecs.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">Nincs találat</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            A megadott keresési és szűrési feltételeknek nem felelt meg egyetlen Saru specifikáció sem.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCrossSection('all');
              setSelectedFeeder('all');
            }}
            className="px-3 py-1.5 bg-[#006067] text-white text-xs font-bold rounded-lg hover:bg-[#004d53] transition-colors"
          >
            Szűrők visszaállítása
          </button>
        </div>
      ) : viewStyle === 'cards' ? (
        <div className="space-y-5">
          {paginatedSpecs.map((spec, index) => {
            const product = getProductForSpec(spec.productId);
            const isTargeted = activeSpecId === spec.id;

            return (
              <div
                key={spec.id || `spec-item-${index}`}
                id={`spec-${spec.id}`}
                className={`bg-white rounded-xl border transition-all p-5 shadow-2xs space-y-4 ${
                  isTargeted ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                {/* Card Top Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    {/* CEL Kód Badge */}
                    {spec.productId ? (
                      <button
                        onClick={() => selectProductById(spec.productId)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#006067] border border-teal-200 font-mono text-sm font-black transition-colors"
                        title="Ugrás a termék adatlapjára"
                      >
                        <span className="font-sans text-[10px] font-bold uppercase text-teal-800">CEL Kód:</span>
                        <span>{spec.productId}</span>
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-stone-100 text-stone-600 font-mono text-xs font-bold border border-stone-200">
                        Nincs CEL Kód
                      </span>
                    )}

                    {/* Product Name if available */}
                    {product && (
                      <div className="min-w-0">
                        <h3
                          onClick={() => selectProductById(product.id)}
                          className="text-xs font-bold text-stone-900 hover:text-[#006067] cursor-pointer truncate"
                        >
                          {product.name}
                        </h3>
                        <span className="text-[10px] text-stone-400 block">{product.category || 'Saru'}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & quick details */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {spec.productId && (
                      <button
                        onClick={() => selectProductById(spec.productId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-500" />
                        <span>Termék adatlap</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 4-Row Matrix rendering */}
                <SaruSpecMatrix
                  spec={spec}
                  showHeader={false}
                  showMetadata={true}
                  highlightCrossSection={selectedCrossSection !== 'all' ? selectedCrossSection : undefined}
                />
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-stone-100/90 border-b border-stone-200 text-stone-700 font-bold">
                <th className="py-2.5 px-3 w-32">CEL KÓD</th>
                <th className="py-2.5 px-3 w-28">Gyári Kód</th>
                <th className="py-2.5 px-3 w-24">Saruzófej</th>
                <th className="py-2.5 px-3 w-24">Fej Hely</th>
                <th className="py-2.5 px-3">Kitöltött keresztmetszetek</th>
                <th className="py-2.5 px-3 w-40">Megjegyzés</th>
                <th className="py-2.5 px-3 text-right w-20">Művelet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {paginatedSpecs.map((spec, idx) => {
                const filledCs = SARU_CROSS_SECTIONS.filter(
                  (cs) =>
                    spec.row1Beallitas?.[cs] ||
                    spec.row2Magassag?.[cs] ||
                    spec.row3Magassag?.[cs] ||
                    spec.row3KeresztmetszetMegjegyzes?.[cs] ||
                    spec.row2Vezetek?.[cs]
                );

                return (
                  <tr key={spec.id || `dense-row-${idx}`} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-stone-900">
                      {spec.productId ? (
                        <button
                          onClick={() => selectProductById(spec.productId)}
                          className="hover:text-[#006067] hover:underline inline-flex items-center gap-1 text-[#006067]"
                        >
                          {spec.productId}
                        </button>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-stone-700">{spec.factoryCode || '-'}</td>
                    <td className="py-2.5 px-3">
                      {spec.feederTool ? (
                        <span className="px-1.5 py-0.5 rounded bg-teal-50 text-[#006067] border border-teal-200 text-[11px] font-semibold">
                          {spec.feederTool}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">{spec.feederLocation || '-'}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {filledCs.length > 0 ? (
                          filledCs.map((cs) => (
                            <span
                              key={cs}
                              className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 text-[10px] font-mono font-semibold"
                            >
                              {cs}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 text-[11px]">Nincs adat</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600 truncate max-w-[200px]" title={spec.note}>
                      {spec.note || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {spec.productId && (
                        <button
                          onClick={() => selectProductById(spec.productId)}
                          className="p-1.5 rounded hover:bg-stone-100 text-[#006067]"
                          title="Megtekintés"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-4 py-3 shadow-2xs">
          <div className="text-xs text-stone-500">
            Megjelenítve: {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredSpecs.length)} / {filteredSpecs.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              Előző
            </button>
            <span className="px-3 py-1.5 text-xs font-mono font-bold text-stone-900">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-40 transition-colors"
            >
              Következő
            </button>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#006067]" />
                <h3 className="text-base font-bold text-stone-900">Saru Segédtáblázat CSV Importálása</h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Illessze be a &quot;Segédtáblázat 1. Saruk másolata&quot; munkalapból vagy a szabványos export CSV-ből kimásolt szöveget.
            </p>

            <textarea
              rows={8}
              value={importCsvText}
              onChange={(e) => setImportCsvText(e.target.value)}
              placeholder="Gyári Kód, CEL KÓD, Megjegyzés, Saru hely, Saruzó fej, ..."
              className="w-full p-3 font-mono text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]/20 focus:border-[#006067]"
            />

            {importFeedback && (
              <div
                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  importFeedback.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {importFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{importFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleImportCsv}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#006067] text-white hover:bg-[#004d53] transition-colors"
              >
                Importálás indítása
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { Inspection } from '../types';
import {
  ClipboardList,
  Search,
  Plus,
  ArrowUpDown,
  Filter,
  ExternalLink,
  Wrench,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Calendar,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const InspectionsView: React.FC = () => {
  const {
    inspections,
    products,
    selectProductById,
    addInspection,
    updateInspection,
    deleteInspection,
    getNextInspectionId,
    exportInspectionsCsv,
  } = useProducts();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hasChangeItemOnly, setHasChangeItemOnly] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'productId' | 'status' | 'changeItem'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states for New / Edit Inspection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    id: string;
    productId: string;
    status: string;
    description: string;
    changeItem: string;
    date: string;
  }>({
    id: '',
    productId: '',
    status: 'Befejezve',
    description: '',
    changeItem: '',
    date: new Date().toLocaleDateString('hu-HU'),
  });

  // Calculate quick stats
  const stats = useMemo(() => {
    const total = inspections.length;
    const withChangeItem = inspections.filter(
      (i) => i.changeItem && i.changeItem.trim() !== '' && i.changeItem.trim() !== '-'
    ).length;
    const completed = inspections.filter((i) =>
      (i.status || '').toLowerCase().includes('befejez')
    ).length;
    const pending = total - completed;
    return { total, withChangeItem, completed, pending };
  }, [inspections]);

  // Unique statuses for filter buttons
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    inspections.forEach((i) => {
      if (i.status && i.status.trim()) set.add(i.status.trim());
    });
    return Array.from(set);
  }, [inspections]);

  // Filtered and sorted inspections
  const filteredInspections = useMemo(() => {
    return inspections
      .filter((insp) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchProd = (insp.productId || '').toLowerCase().includes(q);
          const matchDesc = (insp.description || '').toLowerCase().includes(q);
          const matchStatus = (insp.status || '').toLowerCase().includes(q);
          const matchChange = (insp.changeItem || '').toLowerCase().includes(q);
          const matchDate = (insp.date || '').toLowerCase().includes(q);

          // Also match product names
          const prodObj = products.find((p) => p.id.toLowerCase() === (insp.productId || '').toLowerCase());
          const changeObj = insp.changeItem
            ? products.find((p) => p.id.toLowerCase() === (insp.changeItem || '').toLowerCase())
            : null;
          const matchProdName = prodObj?.name.toLowerCase().includes(q) ?? false;
          const matchChangeName = changeObj?.name.toLowerCase().includes(q) ?? false;

          if (
            !matchProd &&
            !matchDesc &&
            !matchStatus &&
            !matchChange &&
            !matchDate &&
            !matchProdName &&
            !matchChangeName
          ) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && insp.status !== statusFilter) {
          return false;
        }

        // Has Change Item filter
        if (hasChangeItemOnly) {
          if (!insp.changeItem || insp.changeItem.trim() === '' || insp.changeItem.trim() === '-') {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let valA = '';
        let valB = '';

        if (sortField === 'date') {
          valA = a.date || '';
          valB = b.date || '';
        } else if (sortField === 'productId') {
          valA = a.productId || '';
          valB = b.productId || '';
        } else if (sortField === 'status') {
          valA = a.status || '';
          valB = b.status || '';
        } else if (sortField === 'changeItem') {
          valA = a.changeItem || '';
          valB = b.changeItem || '';
        }

        const cmp = valA.localeCompare(valB, 'hu', { numeric: true });
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [inspections, searchQuery, statusFilter, hasChangeItemOnly, sortField, sortOrder, products]);

  const handleOpenAddModal = () => {
    setEditingInspection(null);
    setFormData({
      id: getNextInspectionId(),
      productId: products[0]?.id || '',
      status: 'Befejezve',
      description: '',
      changeItem: '',
      date: new Date().toLocaleDateString('hu-HU'),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (insp: Inspection) => {
    setEditingInspection(insp);
    setFormData({
      id: insp.id,
      productId: insp.productId,
      status: insp.status || 'Befejezve',
      description: insp.description || '',
      changeItem: insp.changeItem || '',
      date: insp.date || new Date().toLocaleDateString('hu-HU'),
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId.trim()) return;

    if (editingInspection) {
      updateInspection(editingInspection.id, {
        productId: formData.productId.trim(),
        status: formData.status.trim() || 'Befejezve',
        description: formData.description.trim() || undefined,
        changeItem: formData.changeItem.trim() || undefined,
        date: formData.date.trim() || undefined,
      });
    } else {
      addInspection({
        id: formData.id || getNextInspectionId(),
        productId: formData.productId.trim(),
        status: formData.status.trim() || 'Befejezve',
        description: formData.description.trim() || undefined,
        changeItem: formData.changeItem.trim() || undefined,
        date: formData.date.trim() || undefined,
      });
    }
    setIsModalOpen(false);
  };

  const handleDownloadCsv = () => {
    const csvData = exportInspectionsCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inspections_karbantartas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render Status badge (Pass = zöld, Repair = sárga, Fail = piros)
  const renderStatusBadge = (status: string) => {
    const raw = status || 'Pass';
    const s = raw.toLowerCase().trim();

    // Pass -> zöld
    if (s === 'pass' || s.includes('pass') || s.includes('befejez') || s.includes('kész') || s.includes('kesz') || s.includes('rendben')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          {raw}
        </span>
      );
    }

    // Repair -> sárga
    if (s === 'repair' || s.includes('repair') || s.includes('csere') || s.includes('alkatrész') || s.includes('alkatresz') || s.includes('javít') || s.includes('javit')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
          <Wrench className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          {raw}
        </span>
      );
    }

    // Fail -> piros
    if (s === 'fail' || s.includes('fail') || s.includes('hiba') || s.includes('hibás') || s.includes('nem felelt') || s.includes('elutasít') || s.includes('esedék')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
          {raw}
        </span>
      );
    }

    if (s.includes('folyamat') || s.includes('vizsgálat')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          {raw}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
        {raw}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#006067]/10 flex items-center justify-center text-[#006067]">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Karbantartási Napló
                <span className="text-xs font-semibold bg-[#006067]/10 text-[#006067] px-2.5 py-0.5 rounded-full">
                  {inspections.length} bejegyzés
                </span>
              </h1>
              <p className="text-xs text-stone-500">
                Szerszámok és gépek karbantartási naplója, cserélt alkatrészek és státuszok nyilvántartása
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            id="btn-export-inspections-csv"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer border border-stone-200"
          >
            <Download className="w-3.5 h-3.5" />
            CSV Export
          </button>
          <button
            type="button"
            id="btn-add-inspection"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#006067] hover:bg-[#004f55] text-white transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Új Karbantartás
          </button>
        </div>
      </div>

      {/* Metric summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 flex-shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Összes esemény</p>
            <p className="text-lg font-bold text-stone-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Alkatrész cserével</p>
            <p className="text-lg font-bold text-amber-700">{stats.withChangeItem}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Befejezett szerviz</p>
            <p className="text-lg font-bold text-emerald-700">{stats.completed}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-stone-500 font-medium">Folyamatban / Esedékes</p>
            <p className="text-lg font-bold text-blue-700">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              id="input-inspections-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés termék ID, csere alkatrész, leírás, dátum alapján..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white text-stone-800"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick toggle for Change Item filter */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <button
              type="button"
              id="filter-change-item-toggle"
              onClick={() => setHasChangeItemOnly(!hasChangeItemOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                hasChangeItemOnly
                  ? 'bg-amber-100/80 border-amber-300 text-amber-900'
                  : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              Csak alkatrészcserés bejegyzések
            </button>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-stone-100 text-xs">
          <span className="text-stone-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Státusz:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#006067] text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            Mind ({inspections.length})
          </button>
          {availableStatuses.map((status) => {
            const count = inspections.filter((i) => i.status === status).length;
            const isSelected = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(isSelected ? 'all' : status)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#006067] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-stone-50/80 text-stone-600 border-b border-stone-200 text-xs font-semibold uppercase tracking-wider">
                {/* Termék ID Column */}
                <th
                  scope="col"
                  className="py-3 px-4 cursor-pointer hover:bg-stone-100 transition-colors select-none"
                  onClick={() => {
                    if (sortField === 'productId') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('productId');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Termék ID</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                {/* Status Column */}
                <th
                  scope="col"
                  className="py-3 px-4 cursor-pointer hover:bg-stone-100 transition-colors select-none"
                  onClick={() => {
                    if (sortField === 'status') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('status');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Státusz</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                {/* Leírás Column */}
                <th scope="col" className="py-3 px-4 min-w-[280px]">
                  <span>Leírás</span>
                </th>

                {/* Change Item Column */}
                <th
                  scope="col"
                  className="py-3 px-4 cursor-pointer hover:bg-stone-100 transition-colors select-none"
                  onClick={() => {
                    if (sortField === 'changeItem') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('changeItem');
                      setSortOrder('asc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cserélt Alkatrész (Change Item)</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                {/* Date Column */}
                <th
                  scope="col"
                  className="py-3 px-4 cursor-pointer hover:bg-stone-100 transition-colors select-none"
                  onClick={() => {
                    if (sortField === 'date') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortField('date');
                      setSortOrder('desc');
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Dátum</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                {/* Actions */}
                <th scope="col" className="py-3 px-4 text-right">
                  <span>Műveletek</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500">
                    <ClipboardList className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="font-semibold text-stone-700 text-base">Nincs találat</p>
                    <p className="text-xs text-stone-400 mt-1">
                      A megadott keresési vagy szűrési feltételeknek nem felel meg egyetlen karbantartási bejegyzés sem.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInspections.map((insp) => {
                  const targetProduct = products.find(
                    (p) => p.id.toLowerCase() === (insp.productId || '').toLowerCase()
                  );
                  const changeProduct = insp.changeItem && insp.changeItem.trim() !== '-'
                    ? products.find(
                        (p) => p.id.toLowerCase() === (insp.changeItem || '').toLowerCase()
                      )
                    : null;

                  const hasChange =
                    Boolean(insp.changeItem) &&
                    insp.changeItem?.trim() !== '' &&
                    insp.changeItem?.trim() !== '-';

                  return (
                    <tr
                      key={insp.id}
                      id={`inspection-row-${insp.id}`}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      {/* Termék ID Cell (Clickable link to Product Detail) */}
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          id={`link-main-product-${insp.id}`}
                          onClick={() => selectProductById(insp.productId)}
                          className="text-left group/btn inline-flex flex-col cursor-pointer"
                        >
                          <span className="font-bold text-[#006067] group-hover/btn:underline flex items-center gap-1">
                            {insp.productId}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                          </span>
                          {targetProduct && (
                            <span className="text-xs text-stone-500 line-clamp-1 max-w-[200px]">
                              {targetProduct.name}
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Status Cell */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        {renderStatusBadge(insp.status)}
                      </td>

                      {/* Leírás Cell */}
                      <td className="py-3 px-4 align-top">
                        <p className="text-xs text-stone-700 leading-relaxed max-w-md">
                          {insp.description || <span className="text-stone-400 italic">Nincs leírás</span>}
                        </p>
                      </td>

                      {/* Change Item Cell (Clickable link to Product Detail if exists) */}
                      <td className="py-3 px-4 align-top">
                        {hasChange && insp.changeItem ? (
                          <button
                            type="button"
                            id={`link-change-item-${insp.id}`}
                            onClick={() => selectProductById(insp.changeItem!)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-900 transition-all cursor-pointer text-left group/change"
                          >
                            <Wrench className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                            <div>
                              <div className="font-semibold text-xs text-amber-950 flex items-center gap-1 group-hover/change:underline">
                                {insp.changeItem}
                                <ExternalLink className="w-3 h-3 text-amber-700 opacity-70 group-hover/change:opacity-100" />
                              </div>
                              {changeProduct && (
                                <div className="text-[11px] text-amber-800/80 line-clamp-1 max-w-[180px]">
                                  {changeProduct.name}
                                </div>
                              )}
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-stone-400 italic flex items-center gap-1">
                            <span>-</span>
                            <span className="text-[11px]">(Nincs csere)</span>
                          </span>
                        )}
                      </td>

                      {/* Date Cell */}
                      <td className="py-3 px-4 align-top whitespace-nowrap text-xs text-stone-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{insp.date || '-'}</span>
                        </div>
                      </td>

                      {/* Actions Cell */}
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            id={`btn-edit-insp-${insp.id}`}
                            onClick={() => handleOpenEditModal(insp)}
                            title="Módosítás"
                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            id={`btn-delete-insp-${insp.id}`}
                            onClick={() => {
                              if (confirm(`Biztosan törölni szeretné ezt a karbantartási bejegyzést? (${insp.id} - ${insp.productId})`)) {
                                deleteInspection(insp.id);
                              }
                            }}
                            title="Törlés"
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
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

        {/* Footer info */}
        <div className="p-3.5 bg-stone-50/60 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <span>
            Megjelenítve: <strong>{filteredInspections.length}</strong> / {inspections.length} bejegyzés
          </span>
          <span className="italic text-stone-400">
            Az "Inspection ID" egyedi kulcsként automatikusan kezelve van.
          </span>
        </div>
      </div>

      {/* Add / Edit Inspection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#006067]/10 flex items-center justify-center text-[#006067]">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-stone-900 text-base">
                  {editingInspection ? 'Karbantartás Módosítása' : 'Új Karbantartás Rögzítése'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 overflow-y-auto">
              {/* Termék ID Field */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Termék ID (Karbantartott eszköz) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  placeholder="pl. 40107.00.33"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white"
                  list="product-id-options"
                />
                <datalist id="product-id-options">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category || 'Termék'})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Status Field */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Státusz (Status) *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white"
                >
                  <option value="Pass">Pass (Megfelelt)</option>
                  <option value="Repair">Repair (Javítás / Csere)</option>
                  <option value="Fail">Fail (Hiba / Nem felelt meg)</option>
                  <option value="Befejezve">Befejezve</option>
                  <option value="Alkatrész cserélve">Alkatrész cserélve</option>
                  <option value="Folyamatban">Folyamatban</option>
                  <option value="Esedékes">Esedékes</option>
                  <option value="Hibás / Javításra vár">Hibás / Javításra vár</option>
                </select>
              </div>

              {/* Change Item (Cserélt alkatrész) Field */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cserélt Alkatrész (Change Item)
                </label>
                <input
                  type="text"
                  value={formData.changeItem}
                  onChange={(e) => setFormData({ ...formData, changeItem: e.target.value })}
                  placeholder="pl. ME.911330114 (ha nem történt csere, hagyja üresen)"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white"
                  list="change-item-options"
                />
                <datalist id="change-item-options">
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </datalist>
                <p className="text-[11px] text-stone-400 mt-1">
                  Ha kiválaszt egy terméket, a táblázatban kattintható közvetlen hivatkozásként jelenik meg.
                </p>
              </div>

              {/* Date Field */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Dátum (Date)
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="pl. 2024. 09. 15."
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white"
                />
              </div>

              {/* Description (Leírás) Field */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Leírás (Karbantartási részletek, elvégzett munka)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Részletezze az elvégzett vizsgálatot, cserét vagy beállítást..."
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006067] focus:bg-white resize-none"
                />
              </div>

              {/* Submit / Cancel buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#006067] hover:bg-[#004f55] text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  {editingInspection ? 'Módosítás mentése' : 'Karbantartás mentése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

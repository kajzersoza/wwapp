import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { KanbanItem, KanbanStatus, Product } from '../types';
import { SafeImage } from './SafeImage';
import {
  Kanban as KanbanIcon,
  Plus,
  Search,
  Filter,
  X,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  Package,
  Sparkles,
  Download,
  Flame,
  Table,
  LayoutGrid,
  Check,
  Layers,
  ChevronDown,
} from 'lucide-react';

const COLUMNS: {
  id: KanbanStatus;
  title: string;
  subtitle: string;
  color: string;
  bgHeader: string;
  borderCol: string;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    id: 'Terv',
    title: 'Terv',
    subtitle: 'Tervezett feladatok és előkészítés',
    color: '#3B82F6',
    bgHeader: 'bg-blue-50 border-blue-200 text-blue-900',
    borderCol: 'border-blue-300',
    badgeBg: 'bg-blue-100 text-blue-800',
    badgeText: 'text-blue-700',
  },
  {
    id: 'Folyamatban',
    title: 'Folyamatban',
    subtitle: 'Aktív gyártás és megmunkálás',
    color: '#F59E0B',
    bgHeader: 'bg-amber-50 border-amber-200 text-amber-900',
    borderCol: 'border-amber-300',
    badgeBg: 'bg-amber-100 text-amber-800',
    badgeText: 'text-amber-700',
  },
  {
    id: 'Teszt',
    title: 'Teszt',
    subtitle: 'Minőségellenőrzés és mérés',
    color: '#8B5CF6',
    bgHeader: 'bg-purple-50 border-purple-200 text-purple-900',
    borderCol: 'border-purple-300',
    badgeBg: 'bg-purple-100 text-purple-800',
    badgeText: 'text-purple-700',
  },
  {
    id: 'Befejezve',
    title: 'Befejezve',
    subtitle: 'Sikeresen lezárt és átadott tételek',
    color: '#10B981',
    bgHeader: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    borderCol: 'border-emerald-300',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    badgeText: 'text-emerald-700',
  },
];

const PRIORITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  low: { label: 'Alacsony', bg: 'bg-slate-100', text: 'text-slate-700', icon: <span className="text-xs">⚪</span> },
  alacsony: { label: 'Alacsony', bg: 'bg-slate-100', text: 'text-slate-700', icon: <span className="text-xs">⚪</span> },
  medium: { label: 'Normál', bg: 'bg-sky-100', text: 'text-sky-800', icon: <span className="text-xs">🔵</span> },
  normál: { label: 'Normál', bg: 'bg-sky-100', text: 'text-sky-800', icon: <span className="text-xs">🔵</span> },
  normal: { label: 'Normál', bg: 'bg-sky-100', text: 'text-sky-800', icon: <span className="text-xs">🔵</span> },
  high: { label: 'Magas', bg: 'bg-amber-100', text: 'text-amber-800', icon: <Flame className="w-3 h-3 text-amber-600" /> },
  magas: { label: 'Magas', bg: 'bg-amber-100', text: 'text-amber-800', icon: <Flame className="w-3 h-3 text-amber-600" /> },
  urgent: { label: 'Sürgős', bg: 'bg-rose-100', text: 'text-rose-800', icon: <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" /> },
  sürgős: { label: 'Sürgős', bg: 'bg-rose-100', text: 'text-rose-800', icon: <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" /> },
  surgos: { label: 'Sürgős', bg: 'bg-rose-100', text: 'text-rose-800', icon: <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" /> },
  kritikus: { label: 'Kritikus', bg: 'bg-rose-100', text: 'text-rose-800', icon: <AlertCircle className="w-3 h-3 text-rose-600 animate-pulse" /> },
};

export const KanbanView: React.FC = () => {
  const {
    kanban,
    addKanbanItem,
    updateKanbanItem,
    deleteKanbanItem,
    moveKanbanItem,
    clearKanban,
    getNextKanbanId,
    exportKanbanCsv,
    products,
    selectProductById,
    setActiveTab,
  } = useProducts();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // View layout toggle: Board (4 columns) vs Table (11-column data grid)
  const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Drag and Drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<KanbanStatus | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KanbanItem | null>(null);

  // Form fields matching the 11 columns:
  // ID, Title, Description, ProductId, Status, Priority, Assignee, DueDate, Quantity, CreatedAt, UpdatedAt
  const [formId, setFormId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formStatus, setFormStatus] = useState<KanbanStatus>('Terv');
  const [formPriority, setFormPriority] = useState<string>('medium');
  const [formAssignee, setFormAssignee] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formCreatedAt, setFormCreatedAt] = useState('');
  const [formUpdatedAt, setFormUpdatedAt] = useState('');
  const [formTags, setFormTags] = useState('');

  // Product Picker in Modal
  const [productSearch, setProductSearch] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Delete Confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Available unique assignees for filter
  const assignees = useMemo(() => {
    const set = new Set<string>();
    kanban.forEach((item) => {
      if (item.assignee && item.assignee.trim()) {
        set.add(item.assignee.trim());
      }
    });
    return Array.from(set).sort();
  }, [kanban]);

  // Filtered Products for the Product Search Selector in Modal
  const filteredProductOptions = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 15);
    const q = productSearch.toLowerCase().trim();
    return products
      .filter((p) => {
        return (
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.factoryCode && p.factoryCode.toLowerCase().includes(q)) ||
          (p.manufacturer && p.manufacturer.toLowerCase().includes(q))
        );
      })
      .slice(0, 20);
  }, [products, productSearch]);

  // Selected product object corresponding to formProductId
  const selectedProductObj = useMemo(() => {
    if (!formProductId.trim()) return null;
    const clean = formProductId.trim().toLowerCase();
    return products.find((p) => p.id.toLowerCase() === clean);
  }, [products, formProductId]);

  // Filtered Kanban Items
  const filteredItems = useMemo(() => {
    return kanban.filter((item) => {
      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchAssignee = (item.assignee || '').toLowerCase().includes(q);
        const matchProduct = (item.productId || '').toLowerCase().includes(q);
        const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        const matchId = item.id.toLowerCase().includes(q);
        const matchQty = item.quantity !== undefined && String(item.quantity).toLowerCase().includes(q);

        if (!matchTitle && !matchDesc && !matchAssignee && !matchProduct && !matchTags && !matchId && !matchQty) {
          return false;
        }
      }

      // Status filter (for table mode or header filter)
      if (statusFilter !== 'all') {
        if (item.status !== statusFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const itemPriority = (item.priority || 'medium').toLowerCase();
        if (itemPriority !== priorityFilter.toLowerCase()) return false;
      }

      // Assignee filter
      if (assigneeFilter !== 'all') {
        if ((item.assignee || '').trim() !== assigneeFilter) return false;
      }

      return true;
    });
  }, [kanban, searchQuery, statusFilter, priorityFilter, assigneeFilter]);

  // Group items by column for board view
  const columnItems = useMemo(() => {
    const map: Record<KanbanStatus, KanbanItem[]> = {
      Terv: [],
      Folyamatban: [],
      Teszt: [],
      Befejezve: [],
    };

    filteredItems.forEach((item) => {
      if (map[item.status as KanbanStatus]) {
        map[item.status as KanbanStatus].push(item);
      } else {
        map['Terv'].push(item);
      }
    });

    return map;
  }, [filteredItems]);

  // Open Modal for New Item
  const handleOpenNew = (status: KanbanStatus = 'Terv', presetProductId?: string) => {
    const today = new Date().toISOString().split('T')[0];
    const generatedId = getNextKanbanId();

    setEditingItem(null);
    setFormId(generatedId);
    setFormTitle('');
    setFormDescription('');
    setFormStatus(status);
    setFormPriority('medium');
    setFormAssignee('');
    setFormProductId(presetProductId || '');
    setFormDueDate('');
    setFormQuantity('');
    setFormCreatedAt(today);
    setFormUpdatedAt(today);
    setFormTags('');
    setProductSearch('');
    setIsProductDropdownOpen(false);

    if (presetProductId) {
      const found = products.find((p) => p.id.toLowerCase() === presetProductId.toLowerCase());
      if (found) {
        setFormTitle(`${found.name} - feladat`);
      }
    }

    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item: KanbanItem) => {
    const today = new Date().toISOString().split('T')[0];
    setEditingItem(item);
    setFormId(item.id);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormStatus((item.status as KanbanStatus) || 'Terv');
    setFormPriority(item.priority || 'medium');
    setFormAssignee(item.assignee || '');
    setFormProductId(item.productId || '');
    setFormDueDate(item.dueDate || '');
    setFormQuantity(item.quantity !== undefined ? String(item.quantity) : '');
    setFormCreatedAt(item.createdAt || today);
    setFormUpdatedAt(today);
    setFormTags(item.tags ? item.tags.join(', ') : '');
    setProductSearch('');
    setIsProductDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Select product from search dropdown
  const handleSelectProduct = (prod: Product) => {
    setFormProductId(prod.id);
    if (!formTitle.trim() || formTitle === 'Új feladat') {
      setFormTitle(`${prod.name} - művelet`);
    }
    if (!formDescription.trim()) {
      setFormDescription(
        `Kategória: ${prod.category || 'Általános'}${prod.factoryCode ? ` | Gyári kód: ${prod.factoryCode}` : ''}`
      );
    }
    setIsProductDropdownOpen(false);
    setProductSearch('');
  };

  // Save Form
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const now = new Date().toISOString().split('T')[0];
    const finalId = formId.trim() || getNextKanbanId();

    if (editingItem) {
      updateKanbanItem(editingItem.id, {
        id: finalId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        productId: formProductId.trim() || undefined,
        status: formStatus,
        priority: formPriority,
        assignee: formAssignee.trim() || undefined,
        dueDate: formDueDate.trim() || undefined,
        quantity: formQuantity.trim() ? formQuantity.trim() : undefined,
        createdAt: formCreatedAt || editingItem.createdAt || now,
        updatedAt: now,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });
    } else {
      const newItem: KanbanItem = {
        id: finalId,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        productId: formProductId.trim() || undefined,
        status: formStatus,
        priority: formPriority,
        assignee: formAssignee.trim() || undefined,
        dueDate: formDueDate.trim() || undefined,
        quantity: formQuantity.trim() ? formQuantity.trim() : undefined,
        createdAt: formCreatedAt || now,
        updatedAt: now,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      };
      addKanbanItem(newItem);
    }

    setIsModalOpen(false);
  };

  // Handle Export CSV with 11 columns
  const handleDownloadCsv = () => {
    const csvContent = exportKanbanCsv();
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kanban_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Move status helpers
  const getNextStatus = (current: KanbanStatus | string): KanbanStatus | null => {
    if (current === 'Terv') return 'Folyamatban';
    if (current === 'Folyamatban') return 'Teszt';
    if (current === 'Teszt') return 'Befejezve';
    return null;
  };

  const getPrevStatus = (current: KanbanStatus | string): KanbanStatus | null => {
    if (current === 'Befejezve') return 'Teszt';
    if (current === 'Teszt') return 'Folyamatban';
    if (current === 'Folyamatban') return 'Terv';
    return null;
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, status: KanbanStatus) => {
    e.preventDefault();
    if (activeDropCol !== status) {
      setActiveDropCol(status);
    }
  };

  const handleDragLeave = (status: KanbanStatus) => {
    if (activeDropCol === status) {
      setActiveDropCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: KanbanStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedItemId;
    if (id) {
      moveKanbanItem(id, status);
    }
    setDraggedItemId(null);
    setActiveDropCol(null);
  };

  // Metrics
  const totalCards = kanban.length;
  const doneCards = kanban.filter((k) => k.status === 'Befejezve').length;
  const inProgressCards = kanban.filter((k) => k.status === 'Folyamatban').length;
  const donePercent = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Top Header & Toolbar Card */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#006067]/10 flex items-center justify-center text-[#006067] flex-shrink-0">
              <KanbanIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">Kanban Munkalap & Tábla</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E0E9E8] text-[#006067] border border-[#006067]/20">
                  4 Státusz: Terv • Folyamatban • Teszt • Befejezve
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Munkafolyamatok és termék gyártási feladatok követése (ID, Title, Description, ProductId, Status, Priority, Assignee, DueDate, Quantity, CreatedAt, UpdatedAt).
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
              <button
                type="button"
                id="kanban-view-board-btn"
                onClick={() => setViewMode('board')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'board'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tábla</span>
              </button>
              <button
                type="button"
                id="kanban-view-table-btn"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Táblázat (11 oszlop)</span>
              </button>
            </div>

            {/* Progress indicator */}
            <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-stone-400 block leading-none">Készültség</span>
                <span className="text-xs font-bold text-stone-800">
                  {doneCards} / {totalCards} ({donePercent}%)
                </span>
              </div>
              <div className="w-14 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${donePercent}%` }}
                />
              </div>
            </div>

            {/* Clear Board Button (when items exist) */}
            {kanban.length > 0 && (
              <>
                {showClearConfirm ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-1">
                    <span className="text-[11px] text-rose-700 font-semibold px-1">Biztosan törlöd?</span>
                    <button
                      type="button"
                      id="kanban-confirm-clear-btn"
                      onClick={() => {
                        clearKanban();
                        setShowClearConfirm(false);
                      }}
                      className="px-2 py-1 rounded bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
                    >
                      Igen, törlés
                    </button>
                    <button
                      type="button"
                      id="kanban-cancel-clear-btn"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-2 py-1 rounded bg-white text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      Mégse
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    id="kanban-clear-board-btn"
                    onClick={() => setShowClearConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors shadow-xs cursor-pointer"
                    title="Kanban munkalap kiürítése"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tábla ürítése</span>
                  </button>
                )}
              </>
            )}

            {/* Export CSV */}
            <button
              type="button"
              id="kanban-export-csv-btn"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
              title="Kanban adatok exportálása CSV fájlba"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>CSV Export</span>
            </button>

            {/* New Task Button */}
            <button
              type="button"
              id="kanban-new-task-btn"
              onClick={() => handleOpenNew('Terv')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-[#006067] text-white hover:bg-[#004d52] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Új Feladat</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="kanban-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés cím, leírás, felelős, Product ID vagy mennyiség alapján..."
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter in table view */}
            {viewMode === 'table' && (
              <select
                id="kanban-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
              >
                <option value="all">Minden státusz</option>
                <option value="Terv">Terv</option>
                <option value="Folyamatban">Folyamatban</option>
                <option value="Teszt">Teszt</option>
                <option value="Befejezve">Befejezve</option>
              </select>
            )}

            {/* Priority Filter */}
            <select
              id="kanban-priority-filter"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
            >
              <option value="all">Minden prioritás</option>
              <option value="urgent">Sürgős 🔥</option>
              <option value="high">Magas ⚠️</option>
              <option value="medium">Normál</option>
              <option value="low">Alacsony</option>
            </select>

            {/* Assignee Filter */}
            {assignees.length > 0 && (
              <select
                id="kanban-assignee-filter"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
              >
                <option value="all">Minden felelős</option>
                {assignees.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}

            {(searchQuery || priorityFilter !== 'all' || statusFilter !== 'all' || assigneeFilter !== 'all') && (
              <button
                type="button"
                id="kanban-reset-filters-btn"
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('all');
                  setStatusFilter('all');
                  setAssigneeFilter('all');
                }}
                className="px-2.5 py-2 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Szűrők törlése"
              >
                Visszaállítás
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {kanban.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <KanbanIcon className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-1.5">A Kanban tábla jelenleg üres</h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto mb-6">
            Kezdje el a munkafolyamatok kezelését! Adjon hozzá feladatokat manuálisan vagy kattintson bármelyik termék adatlapján a &quot;Hozzáadás Kanbanhoz&quot; gombra.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              id="kanban-empty-add-btn"
              onClick={() => handleOpenNew('Terv')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#006067] text-white text-xs font-bold hover:bg-[#00474c] transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Új Feladat Létrehozása</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-xs font-semibold hover:bg-stone-200 transition-colors cursor-pointer border border-stone-200"
            >
              <Package className="w-4 h-4 text-stone-500" />
              <span>Böngészés a Termékek között</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'board' ? (
        /* 4-Column Drag and Drop Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const items = columnItems[col.id] || [];
            const isDropActive = activeDropCol === col.id;

            return (
              <div
                key={col.id}
                id={`kanban-column-${col.id}`}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => handleDragLeave(col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-stone-100/80 rounded-xl border flex flex-col min-h-[550px] transition-all duration-200 ${
                  isDropActive
                    ? `${col.borderCol} ring-2 ring-offset-1 ring-[#006067]/40 bg-stone-100 shadow-md`
                    : 'border-stone-200/80 shadow-xs'
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-xl border-b flex items-center justify-between ${col.bgHeader}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">{col.title}</h3>
                      <p className="text-[10px] opacity-75 font-normal line-clamp-1">{col.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${col.badgeBg}`}>
                      {items.length}
                    </span>
                    <button
                      type="button"
                      id={`kanban-add-${col.id}-btn`}
                      onClick={() => handleOpenNew(col.id)}
                      className="p-1 rounded-md hover:bg-black/10 transition-colors text-inherit cursor-pointer"
                      title={`Új feladat ide: ${col.title}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Column Body / Cards List */}
                <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[120px]">
                  {items.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-stone-200 rounded-lg flex flex-col items-center justify-center text-stone-400 p-4 text-center">
                      <span className="text-xs">Húzzon ide egy kártyát,</span>
                      <button
                        type="button"
                        onClick={() => handleOpenNew(col.id)}
                        className="mt-1 text-[11px] font-semibold text-[#006067] hover:underline cursor-pointer"
                      >
                        vagy hozzon létre újat
                      </button>
                    </div>
                  ) : (
                    items.map((item) => {
                      const priorityMeta =
                        PRIORITY_CONFIG[(item.priority || 'medium').toLowerCase()] || PRIORITY_CONFIG.medium;
                      const prevCol = getPrevStatus(item.status);
                      const nextCol = getNextStatus(item.status);
                      const isOverdue =
                        item.dueDate && item.status !== 'Befejezve' && new Date(item.dueDate) < new Date();

                      return (
                        <div
                          key={item.id}
                          id={`kanban-card-${item.id}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item.id)}
                          className="bg-white rounded-lg p-3.5 border border-stone-200 shadow-2xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing group hover:border-[#006067]/40"
                        >
                          {/* Card Top: ID & Priority */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                              {item.id}
                            </span>

                            <div className="flex items-center gap-1">
                              {item.quantity !== undefined && item.quantity !== '' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                                  <span>📦</span>
                                  <span>{item.quantity} db</span>
                                </span>
                              )}

                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityMeta.bg} ${priorityMeta.text}`}
                              >
                                {priorityMeta.icon}
                                <span>{priorityMeta.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="text-xs font-bold text-stone-900 leading-snug group-hover:text-[#006067] transition-colors">
                            {item.title}
                          </h4>

                          {/* Description snippet */}
                          {item.description && (
                            <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          {/* Product Connection Link */}
                          {item.productId && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-mono text-[#006067] bg-[#E0E9E8]/60 px-2 py-1 rounded border border-[#006067]/15">
                              <Package className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate font-semibold">{item.productId}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectProductById(item.productId!);
                                }}
                                className="ml-auto text-[9px] font-bold underline hover:text-[#004d52] cursor-pointer"
                                title="Ugrás a termék adatlapjára"
                              >
                                Megnyitás
                              </button>
                            </div>
                          )}

                          {/* Tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {item.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-0.5 text-[9px] font-medium bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded"
                                >
                                  <Tag className="w-2 h-2 text-stone-400" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer: Assignee, Due Date & Quick Actions */}
                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                            <div className="flex items-center gap-2">
                              {item.assignee ? (
                                <span
                                  className="inline-flex items-center gap-1 font-medium text-stone-700"
                                  title={`Felelős: ${item.assignee}`}
                                >
                                  <div className="w-4.5 h-4.5 rounded-full bg-[#006067]/15 text-[#006067] flex items-center justify-center text-[9px] font-bold">
                                    {item.assignee.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate max-w-[80px]">{item.assignee}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 italic">Nincs felelős</span>
                              )}

                              {item.dueDate && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${
                                    isOverdue ? 'text-rose-600 font-bold' : 'text-stone-500'
                                  }`}
                                  title={`Határidő: ${item.dueDate}`}
                                >
                                  <Calendar className="w-3 h-3" />
                                  {item.dueDate}
                                </span>
                              )}
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-1">
                              {prevCol && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveKanbanItem(item.id, prevCol);
                                  }}
                                  className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                                  title={`Vissza ide: ${prevCol}`}
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEdit(item);
                                }}
                                className="p-1 rounded text-stone-400 hover:text-[#006067] hover:bg-stone-100 transition-colors cursor-pointer"
                                title="Szerkesztés"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(item.id);
                                }}
                                className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Törlés"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {nextCol && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveKanbanItem(item.id, nextCol);
                                  }}
                                  className="p-1 rounded text-[#006067] hover:text-[#004d52] hover:bg-[#E0E9E8] transition-colors cursor-pointer"
                                  title={`Tovább ide: ${nextCol}`}
                                >
                                  <ArrowRight className="w-3.5 h-3.5 font-bold" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 11-Column Table / Data Grid View */
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3">ID</th>
                  <th className="p-3">Title (Cím)</th>
                  <th className="p-3">Description (Leírás)</th>
                  <th className="p-3">ProductId</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Assignee (Felelős)</th>
                  <th className="p-3">DueDate</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">CreatedAt</th>
                  <th className="p-3">UpdatedAt</th>
                  <th className="p-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-stone-400">
                      Nincs a megadott szűrési feltételeknek megfelelő tétel.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const priorityMeta =
                      PRIORITY_CONFIG[(item.priority || 'medium').toLowerCase()] || PRIORITY_CONFIG.medium;
                    const statusMeta =
                      COLUMNS.find((c) => c.id === item.status) || COLUMNS[0];

                    return (
                      <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                        {/* ID */}
                        <td className="p-3 font-mono font-bold text-[#006067] whitespace-nowrap">
                          {item.id}
                        </td>

                        {/* Title */}
                        <td className="p-3 font-bold text-stone-900 min-w-[180px]">
                          {item.title}
                        </td>

                        {/* Description */}
                        <td className="p-3 text-stone-600 max-w-[220px] truncate" title={item.description}>
                          {item.description || <span className="text-stone-300 italic">-</span>}
                        </td>

                        {/* ProductId */}
                        <td className="p-3 font-mono whitespace-nowrap">
                          {item.productId ? (
                            <button
                              type="button"
                              onClick={() => {
                                selectProductById(item.productId!);
                              }}
                              className="inline-flex items-center gap-1 text-[#006067] hover:underline font-semibold cursor-pointer"
                              title="Termék adatlap megnyitása"
                            >
                              <Package className="w-3 h-3" />
                              <span>{item.productId}</span>
                            </button>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${statusMeta.badgeBg}`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${priorityMeta.bg} ${priorityMeta.text}`}
                          >
                            {priorityMeta.icon}
                            <span>{priorityMeta.label}</span>
                          </span>
                        </td>

                        {/* Assignee */}
                        <td className="p-3 text-stone-700 whitespace-nowrap">
                          {item.assignee || <span className="text-stone-400 italic">Nincs</span>}
                        </td>

                        {/* DueDate */}
                        <td className="p-3 font-mono text-stone-600 whitespace-nowrap">
                          {item.dueDate || <span className="text-stone-300">-</span>}
                        </td>

                        {/* Quantity */}
                        <td className="p-3 font-bold text-stone-800 whitespace-nowrap">
                          {item.quantity !== undefined && item.quantity !== '' ? (
                            <span>{item.quantity} db</span>
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>

                        {/* CreatedAt */}
                        <td className="p-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {item.createdAt || '-'}
                        </td>

                        {/* UpdatedAt */}
                        <td className="p-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {item.updatedAt || '-'}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-stone-500 hover:text-[#006067] hover:bg-stone-100 rounded cursor-pointer transition-colors"
                              title="Szerkesztés"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                              title="Törlés"
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
      )}

      {/* Edit / New Modal with Product Search & 11 Columns */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#006067]/10 flex items-center justify-center text-[#006067]">
                  <KanbanIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {editingItem ? `Kártya Szerkesztése (${formId})` : 'Új Kanban Feladat Létrehozása'}
                  </h3>
                  <span className="text-[11px] text-stone-400">
                    Kanban oszlopok: ID, Title, Description, ProductId, Status, Priority, Assignee, DueDate, Quantity, CreatedAt, UpdatedAt
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {/* Product Selector with Search */}
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-[#006067]" />
                    <span>Kapcsolódó Termék Kereső (ProductId)</span>
                  </label>
                  {formProductId && (
                    <button
                      type="button"
                      onClick={() => setFormProductId('')}
                      className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                    >
                      Kiválasztás törlése
                    </button>
                  )}
                </div>

                {/* Selected Product Card Preview */}
                {selectedProductObj ? (
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-[#006067]/30 shadow-2xs">
                    <div className="w-10 h-10 rounded bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-stone-200">
                      <SafeImage
                        src={selectedProductObj.image}
                        productId={selectedProductObj.id}
                        alt={selectedProductObj.name}
                        className="w-full h-full object-contain"
                        fallback={<Package className="w-5 h-5 text-stone-400" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#006067]">
                          {selectedProductObj.id}
                        </span>
                        <span className="text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                          {selectedProductObj.category || 'Termék'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-stone-800 truncate">
                        {selectedProductObj.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="px-2.5 py-1 text-xs font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 rounded cursor-pointer"
                    >
                      Csere
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={productSearch}
                          onFocus={() => setIsProductDropdownOpen(true)}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setIsProductDropdownOpen(true);
                          }}
                          placeholder="Keresés termék ID, név vagy kategória alapján..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                        />
                      </div>
                      <input
                        type="text"
                        value={formProductId}
                        onChange={(e) => setFormProductId(e.target.value)}
                        placeholder="vagy kézi ProductId"
                        className="w-36 px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                      />
                    </div>
                  </div>
                )}

                {/* Live Dropdown List */}
                {isProductDropdownOpen && (
                  <div className="absolute left-3.5 right-3.5 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-stone-100">
                    <div className="p-2 bg-stone-50 flex items-center justify-between text-[11px] font-bold text-stone-500">
                      <span>Válasszon egy terméket ({filteredProductOptions.length} találat):</span>
                      <button
                        type="button"
                        onClick={() => setIsProductDropdownOpen(false)}
                        className="text-stone-400 hover:text-stone-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {filteredProductOptions.length === 0 ? (
                      <div className="p-3 text-center text-xs text-stone-400">
                        Nincs találat a(z) &quot;{productSearch}&quot; keresésre.
                      </div>
                    ) : (
                      filteredProductOptions.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className="p-2.5 flex items-center gap-3 hover:bg-[#E0E9E8]/50 cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded bg-stone-100 flex items-center justify-center flex-shrink-0 overflow-hidden border border-stone-200">
                            <SafeImage
                              src={prod.image}
                              productId={prod.id}
                              alt={prod.name}
                              className="w-full h-full object-contain"
                              fallback={<Package className="w-4 h-4 text-stone-400" />}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#006067]">{prod.id}</span>
                              <span className="text-[10px] text-stone-500 font-medium">({prod.category || 'Termék'})</span>
                            </div>
                            <p className="text-xs text-stone-800 font-medium truncate">{prod.name}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Title & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Title (Feladat / Művelet Megnevezése) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="pl. MD-001 mérődoboz összeszerelés és teszt"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ID (Dinamikus Kulcs)
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    placeholder="pl. KB-001"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>
              </div>

              {/* Status, Priority & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Status (Státusz Oszlop) *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as KanbanStatus)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  >
                    <option value="Terv">Terv</option>
                    <option value="Folyamatban">Folyamatban</option>
                    <option value="Teszt">Teszt</option>
                    <option value="Befejezve">Befejezve</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Priority (Prioritás)</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  >
                    <option value="low">Alacsony</option>
                    <option value="medium">Normál</option>
                    <option value="high">Magas ⚠️</option>
                    <option value="urgent">Sürgős 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Quantity (Mennyiség - db)</label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                    placeholder="pl. 10"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>
              </div>

              {/* Assignee & DueDate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Assignee (Felelős Dolgozó)</label>
                  <input
                    type="text"
                    value={formAssignee}
                    onChange={(e) => setFormAssignee(e.target.value)}
                    placeholder="pl. Kovács János"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">DueDate (Határidő)</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Description (Részletes Leírás & Instrukciók)
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Kiegészítő műveleti utasítások, saruzási paraméterek vagy ellenőrzési pontok..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                />
              </div>

              {/* Tags, CreatedAt & UpdatedAt */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Címkék (vesszővel elválasztva)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="pl. Gyártás, C-saru"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">CreatedAt (Létrehozva)</label>
                  <input
                    type="date"
                    value={formCreatedAt}
                    onChange={(e) => setFormCreatedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">UpdatedAt (Módosítva)</label>
                  <input
                    type="date"
                    value={formUpdatedAt}
                    onChange={(e) => setFormUpdatedAt(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#006067] text-white hover:bg-[#004d52] transition-colors shadow-xs cursor-pointer"
                >
                  {editingItem ? 'Módosítások Mentése' : 'Kártya Létrehozása'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-150">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Biztosan törölni szeretnéd?</h3>
            <p className="text-xs text-stone-500 mt-1">
              A(z) <span className="font-mono font-bold text-stone-800">{deleteConfirmId}</span> azonosítójú kártya véglegesen törlésre kerül a tábláról.
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteKanbanItem(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
              >
                Törlés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

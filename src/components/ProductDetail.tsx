import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { Product, KanbanStatus, Order, ProductNote } from '../types';
import { TermekIdLink } from './TermekIdLink';
import { PositionLink } from './PositionLink';
import { FilterTag } from './FilterTag';
import { BarcodeView } from './BarcodeView';
import { SafeImage } from './SafeImage';
import { SaruSpecMatrix } from './SaruSpecMatrix';
import { UrlMediaPreview } from './UrlMediaPreview';
import { resolveDriveImageUrl } from '../services/driveImageService';
import {
  ArrowLeft,
  Printer,
  Edit,
  Trash2,
  Copy,
  Check,
  Tag,
  Factory,
  Layers,
  Shield,
  Hash,
  MapPin,
  Calendar,
  Sparkles,
  Zap,
  Info,
  Maximize2,
  X,
  Share2,
  Boxes,
  Plus,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  History,
  ExternalLink,
  ClipboardList,
  Wrench,
  Link2,
  Gauge,
  Box,
  Cpu,
  Puzzle,
  Sliders,
  Kanban as KanbanIcon,
  Clock,
  PlayCircle,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  PackageCheck,
  QrCode,
  Image as ImageIcon,
  FileText,
  UserCheck,
  Paperclip,
} from 'lucide-react';

interface ProductDetailProps {
  onEdit: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
}

// Helper to render stylish category badges corresponding to the actual category from the database
const renderRelationCategoryBadge = (
  categoryStr?: string,
  fallbackRole?: string,
  defaultIcon?: string
) => {
  const cat = (categoryStr || fallbackRole || '').trim();
  const c = cat.toLowerCase();

  if (c.includes('mérő') || c.includes('merodoboz') || c.includes('doboz')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
        <span>📦</span>
        <span>{cat || 'Mérődoboz'}</span>
      </span>
    );
  }
  if (c.includes('gyártandó') || c.includes('gyartando')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
        <span>🏭</span>
        <span>{cat || 'Gyártandó Termék'}</span>
      </span>
    );
  }
  if (c.includes('saruzófej alkatrész') || (c.includes('alkatrész') && c.includes('fej'))) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
        <span>🔧</span>
        <span>{cat || 'Saruzófej Alkatrész'}</span>
      </span>
    );
  }
  if (c.includes('saruzófej') || c.includes('saruzofej')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
        <span>⚙️</span>
        <span>{cat || 'Saruzófej'}</span>
      </span>
    );
  }
  if (c.includes('konnektor')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
        <span>🔌</span>
        <span>{cat || 'Konnektor'}</span>
      </span>
    );
  }
  if (c.includes('saru')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
        <span>⚡</span>
        <span>{cat || 'Saru'}</span>
      </span>
    );
  }

  // General category tag
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#006067] border border-teal-200">
      <span>{defaultIcon || '🏷️'}</span>
      <span>{cat || 'Termék'}</span>
    </span>
  );
};

export const ProductDetail: React.FC<ProductDetailProps> = ({
  onEdit,
  onPrintLabel,
}) => {
  const {
    selectedProduct,
    setActiveTab,
    deleteProduct,
    products,
    selectProductById,
    positions,
    selectPositionById,
    getProductTotalStock,
    getProductPositions,
    getProductStockBreakdown,
    adjustStock,
    getProductInspections,
    getConnectedKonSar,
    getConnectedTermMerod,
    getConnectedBeepulo,
    getConnectedFejSaru,
    getSaruSpecForProduct,
    getAllSaruSpecsForProduct,
    addKanbanItem,
    getNextKanbanId,
    kanban,
    setSelectedKanbanId,
    getProductOrders,
    getRelatedProductOrders,
    addOrder,
    getNextOrderId,
    getNotesForProduct,
    addNote,
    updateNote,
    deleteNote,
    getNextNoteId,
  } = useProducts();

  const [copied, setCopied] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Note state for this product
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProductNote | null>(null);
  const [noteForm, setNoteForm] = useState<{
    nev: string;
    leiras: string;
    image: string;
    documents: string;
    date: string;
    url: string;
    nevValasztas: string;
  }>({
    nev: '',
    leiras: '',
    image: '',
    documents: '',
    date: new Date().toISOString().split('T')[0],
    url: '',
    nevValasztas: '',
  });

  // Kanban task creation state for this product
  const [isKanbanModalOpen, setIsKanbanModalOpen] = useState(false);
  const [kanbanSuccessMsg, setKanbanSuccessMsg] = useState<string | null>(null);
  const [kanbanForm, setKanbanForm] = useState<{
    title: string;
    description: string;
    status: KanbanStatus;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignee: string;
    dueDate: string;
    quantity: number | string;
  }>({
    title: '',
    description: '',
    status: 'Terv',
    priority: 'medium',
    assignee: '',
    dueDate: '',
    quantity: 1,
  });

  // Stock movement modal state for this product
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState<{
    positionId: string;
    quantity: number;
    type: 'add' | 'remove';
    note: string;
  }>({
    positionId: positions[0]?.id || '',
    quantity: 1,
    type: 'add',
    note: '',
  });

  // Identification code view mode (QR kód vs Vonalkód) - defaults to QR code
  const [codeViewMode, setCodeViewMode] = useState<'qr' | 'barcode'>('qr');

  if (!selectedProduct) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
        <Info className="w-12 h-12 text-stone-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-stone-800 mb-1">Nincs kiválasztott termék</h3>
        <p className="text-sm text-stone-500 mb-6">
          Válasszon ki egy terméket a listából az adatlap és a műszaki adatok megtekintéséhez.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#006067] text-white text-sm font-medium hover:bg-[#00474c] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Vissza a terméklistához</span>
        </button>
      </div>
    );
  }

  const p = selectedProduct;
  const totalStock = getProductTotalStock(p.id);
  const stockBreakdown = getProductStockBreakdown(p.id);
  const stockPositions = getProductPositions(p.id);

  // Find all Kanban tasks assigned to this product
  const productKanbanItems = useMemo(() => {
    if (!p?.id) return [];
    const pIdLower = p.id.trim().toLowerCase();
    return kanban.filter(
      (k) => k.productId && k.productId.trim().toLowerCase() === pIdLower
    );
  }, [kanban, p?.id]);

  // Find direct and related orders for this product
  const productDirectOrders = useMemo(() => {
    if (!p?.id) return [];
    return getProductOrders(p.id);
  }, [p?.id, getProductOrders]);

  const productRelatedOrders = useMemo(() => {
    if (!p?.id) return [];
    return getRelatedProductOrders(p.id);
  }, [p?.id, getRelatedProductOrders]);

  // Helper to parse date string into timestamp for accurate chronological ordering
  const parseOrderDateToTime = (dateStr?: string): number => {
    if (!dateStr || typeof dateStr !== 'string') return 0;
    const s = dateStr.trim();
    if (!s) return 0;
    const match = s.match(/(\d{4})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d.getTime();
    }
    const parsed = Date.parse(s);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getOrderEffectiveTimestamp = (ord: Order): number => {
    return Math.max(
      parseOrderDateToTime(ord.datumRaktarban),
      parseOrderDateToTime(ord.datumMegrendelve),
      parseOrderDateToTime(ord.datum)
    );
  };

  // Helper to classify order status into clean categories
  const getOrderStatusCategory = (status?: string): 'megrendelni' | 'megrendelve' | 'megerkezett' | 'egyeb' => {
    const s = (status || '').toLowerCase().trim();
    if (
      s.includes('érkezett') ||
      s.includes('erkezett') ||
      s.includes('raktár') ||
      s.includes('raktar') ||
      s.includes('átvéve') ||
      s.includes('atveve') ||
      s.includes('befejez')
    ) {
      return 'megerkezett';
    }
    if (
      s.includes('megrendelve') ||
      s.includes('rendelve') ||
      s.includes('leadva') ||
      s.includes('szállítás') ||
      s.includes('folyamatban')
    ) {
      return 'megrendelve';
    }
    if (
      s.includes('megrendelni') ||
      s.includes('tervezett') ||
      s.includes('ajánlat') ||
      s.includes('szükséges') ||
      s.includes('igeny')
    ) {
      return 'megrendelni';
    }
    return 'egyeb';
  };

  // Sorted list of direct orders chronologically by date (most recent first)
  const sortedDirectOrders = useMemo(() => {
    if (!productDirectOrders || productDirectOrders.length === 0) return [];
    return [...productDirectOrders].sort((a, b) => {
      const timeA = getOrderEffectiveTimestamp(a);
      const timeB = getOrderEffectiveTimestamp(b);
      return timeB - timeA;
    });
  }, [productDirectOrders]);

  // Sorted list of related orders chronologically by date (most recent first)
  const sortedRelatedOrders = useMemo(() => {
    if (!productRelatedOrders || productRelatedOrders.length === 0) return [];
    return [...productRelatedOrders].sort((a, b) => {
      const timeA = getOrderEffectiveTimestamp(a.order);
      const timeB = getOrderEffectiveTimestamp(b.order);
      return timeB - timeA;
    });
  }, [productRelatedOrders]);

  // Analyzes the current order status for the header (címsor):
  // - If the series completed and arrived ("megerkezett"), DO NOT show in címsor.
  // - In the címsor, only show ONE current active status: "Megrendelni" (red) or "Megrendelve" (blue).
  const activeHeaderOrder = useMemo(() => {
    if (sortedDirectOrders.length === 0) return null;

    const latestOrder = sortedDirectOrders[0];
    const latestCat = getOrderStatusCategory(latestOrder.statusz);

    // If the latest order is already arrived/completed, the cycle has concluded -> DO NOT show in címsor!
    if (latestCat === 'megerkezett') {
      return null;
    }

    if (latestCat === 'megrendelve') {
      return {
        order: latestOrder,
        type: 'megrendelve' as const,
        label: 'Megrendelve',
      };
    }

    if (latestCat === 'megrendelni') {
      return {
        order: latestOrder,
        type: 'megrendelni' as const,
        label: 'Megrendelni',
      };
    }

    // Check if any active order exists (uncompleted)
    const active = sortedDirectOrders.find((o) => {
      const cat = getOrderStatusCategory(o.statusz);
      return cat === 'megrendelve' || cat === 'megrendelni';
    });

    if (active) {
      const cat = getOrderStatusCategory(active.statusz);
      return {
        order: active,
        type: cat === 'megrendelve' ? ('megrendelve' as const) : ('megrendelni' as const),
        label: cat === 'megrendelve' ? 'Megrendelve' : 'Megrendelni',
      };
    }

    return null;
  }, [sortedDirectOrders]);

  // Order status badge styling helper for the list
  const getOrderStatusBadge = (status?: string) => {
    const cat = getOrderStatusCategory(status);
    if (cat === 'megerkezett') {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
        label: status || 'Megérkezett / Raktárban',
        icon: CheckCircle2,
      };
    }
    if (cat === 'megrendelve') {
      return {
        bg: 'bg-sky-50 text-sky-800 border-sky-300',
        dot: 'bg-sky-500',
        label: status || 'Megrendelve',
        icon: Clock,
      };
    }
    // megrendelni -> piros
    return {
      bg: 'bg-rose-50 text-rose-800 border-rose-300',
      dot: 'bg-rose-500',
      label: status || 'Megrendelni',
      icon: ShoppingCart,
    };
  };

  const hasAnyOrder = sortedDirectOrders.length > 0 || sortedRelatedOrders.length > 0;

  // Helper to format kanban status styles and icons
  const getKanbanStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('terv') || s.includes('plan')) {
      return {
        bg: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100',
        badgeBg: 'bg-sky-100 text-sky-800 border-sky-200',
        dot: 'bg-sky-500',
        icon: Clock,
        label: 'Terv',
      };
    }
    if (s.includes('folyamat') || s.includes('prog') || s.includes('doing')) {
      return {
        bg: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
        dot: 'bg-amber-500',
        icon: PlayCircle,
        label: 'Folyamatban',
      };
    }
    if (s.includes('teszt') || s.includes('test') || s.includes('ellenor')) {
      return {
        bg: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
        dot: 'bg-purple-500',
        icon: FlaskConical,
        label: 'Teszt',
      };
    }
    if (s.includes('befejez') || s.includes('kesz') || s.includes('done') || s.includes('closed')) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2,
        label: 'Befejezve',
      };
    }
    return {
      bg: 'bg-stone-50 text-stone-800 border-stone-300 hover:bg-stone-100',
      badgeBg: 'bg-stone-100 text-stone-800 border-stone-200',
      dot: 'bg-stone-500',
      icon: KanbanIcon,
      label: status || 'Kanban',
    };
  };

  // Helper to render Inspection status badge (Pass = zöld, Repair = sárga, Fail = piros)
  const renderInspectionStatusBadge = (status?: string) => {
    const raw = status?.trim() || 'Pass';
    const s = raw.toLowerCase();

    // Pass -> Zöld
    if (s === 'pass' || s.includes('pass') || s.includes('befejez') || s.includes('kész') || s.includes('kesz') || s.includes('rendben')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>{raw}</span>
        </span>
      );
    }

    // Repair -> Sárga
    if (s === 'repair' || s.includes('repair') || s.includes('csere') || s.includes('alkatrész') || s.includes('alkatresz') || s.includes('javít') || s.includes('javit')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
          <Wrench className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>{raw}</span>
        </span>
      );
    }

    // Fail -> Piros
    if (s === 'fail' || s.includes('fail') || s.includes('hiba') || s.includes('hibás') || s.includes('nem felelt') || s.includes('elutasít') || s.includes('esedék')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
          <span>{raw}</span>
        </span>
      );
    }

    if (s.includes('folyamat') || s.includes('vizsgálat')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span>{raw}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200">
        <span>{raw}</span>
      </span>
    );
  };

  const handleOpenStockModal = (presetPosId?: string) => {
    setStockForm({
      positionId: presetPosId || positions[0]?.id || '',
      quantity: 1,
      type: 'add',
      note: '',
    });
    setIsStockModalOpen(true);
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.abs(Number(stockForm.quantity)) || 1;
    if (!stockForm.positionId) return;

    if (stockForm.type === 'add') {
      adjustStock(
        p.id,
        stockForm.positionId,
        qty,
        stockForm.note || `Bevételezés pozícióra (+${qty} db)`
      );
    } else {
      adjustStock(
        p.id,
        stockForm.positionId,
        -qty,
        stockForm.note || `Kiadás / Levonás pozícióról (-${qty} db)`
      );
    }
    setIsStockModalOpen(false);
  };

  const handleOpenKanbanModal = () => {
    setKanbanForm({
      title: `${p.name} - feladat`,
      description: `Termék kód: ${p.id} | Kategória: ${p.category || 'Általános'}${
        p.factoryCode ? ` | Gyári kód: ${p.factoryCode}` : ''
      }${stockPositions.length > 0 ? ` | Pozíció: ${stockPositions.map((pos) => pos.positionName).join(', ')}` : ''}`,
      status: 'Terv',
      priority: 'medium',
      assignee: '',
      dueDate: '',
      quantity: 1,
    });
    setKanbanSuccessMsg(null);
    setIsKanbanModalOpen(true);
  };

  const handleSaveKanban = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kanbanForm.title.trim()) return;

    const now = new Date().toISOString().split('T')[0];
    const newId = getNextKanbanId();

    addKanbanItem({
      id: newId,
      title: kanbanForm.title.trim(),
      description: kanbanForm.description.trim() || undefined,
      productId: p.id,
      status: kanbanForm.status,
      priority: kanbanForm.priority,
      assignee: kanbanForm.assignee.trim() || undefined,
      dueDate: kanbanForm.dueDate.trim() || undefined,
      quantity: kanbanForm.quantity !== '' ? kanbanForm.quantity : undefined,
      createdAt: now,
      updatedAt: now,
      tags: [p.category || 'Termék', 'Raktár'].filter(Boolean),
    });

    setIsKanbanModalOpen(false);
    setKanbanSuccessMsg(`Sikeresen hozzáadva a Kanban táblához (${newId})!`);
    setTimeout(() => {
      setKanbanSuccessMsg(null);
    }, 6000);
  };

  const handleOpenNoteModal = (note?: ProductNote) => {
    if (note) {
      setEditingNote(note);
      setNoteForm({
        nev: note.nev || '',
        leiras: note.leiras || '',
        image: note.image || '',
        documents: note.documents || '',
        date: note.date || new Date().toISOString().split('T')[0],
        url: note.url || '',
        nevValasztas: note.nevValasztas || '',
      });
    } else {
      setEditingNote(null);
      setNoteForm({
        nev: '',
        leiras: '',
        image: '',
        documents: '',
        date: new Date().toISOString().split('T')[0],
        url: '',
        nevValasztas: '',
      });
    }
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!p) return;
    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          nev: noteForm.nev.trim(),
          leiras: noteForm.leiras.trim(),
          image: noteForm.image.trim(),
          documents: noteForm.documents.trim(),
          date: noteForm.date.trim(),
          url: noteForm.url.trim(),
          nevValasztas: noteForm.nevValasztas.trim(),
        });
      } else {
        await addNote({
          id: getNextNoteId(),
          termekId: p.id,
          nev: noteForm.nev.trim(),
          leiras: noteForm.leiras.trim(),
          image: noteForm.image.trim(),
          documents: noteForm.documents.trim(),
          date: noteForm.date.trim(),
          url: noteForm.url.trim(),
          nevValasztas: noteForm.nevValasztas.trim(),
        });
      }
      setIsNoteModalOpen(false);
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (window.confirm('Biztosan törölni szeretné ezt a jegyzetet?')) {
      await deleteNote(id);
    }
  };

  const handleCopySpecs = () => {
    const lines = [
      `Termék ID: ${p.id}`,
      `Termék név: ${p.name}`,
      `Raktárkészlet: ${totalStock} db`,
      stockPositions.length > 0
        ? `Raktári Pozíció(k): ${stockPositions.map((pos) => `${pos.positionName} (${pos.quantity} db)`).join(', ')}`
        : 'Raktári Pozíció: Nincs megadva / rögzítve',
      p.description ? `Leírás: ${p.description}` : null,
      p.category ? `Kategória: ${p.category}` : null,
      p.manufacturer ? `Gyártó: ${p.manufacturer}` : null,
      p.partType ? `Alkatrész Típus: ${p.partType}` : null,
      p.factoryCode ? `Gyári Kód: ${p.factoryCode}` : null,
      p.insulationType ? `Szigelés Típus: ${p.insulationType}` : null,
      p.insulationGripperType ? `Szigetelésmegfogó: ${p.insulationGripperType}` : null,
      p.connectorType ? `Konektor Típusa: ${p.connectorType}` : null,
      p.terminalType ? `Saru Típusa: ${p.terminalType}` : null,
      p.location ? `Hozzátartozó Alkatrész Helye: ${p.location}` : null,
      p.dosage ? `Adagolás: ${p.dosage}` : null,
      p.quality ? `Minőség: ${p.quality}` : null,
      p.date ? `Dátum: ${p.date}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(lines).catch(() => {});
      }
    } catch {
      // safe fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to test if a string has actual data
  const hasVal = (val?: unknown): boolean => {
    if (val === null || val === undefined) return false;
    const str = String(val).trim();
    return str !== '' && str !== '-';
  };

  // Resolved product image with Google Drive folder fallback
  const productImage = p.image || resolveDriveImageUrl(undefined, p.id);
  const hasImage = hasVal(productImage);

  return (
    <div className="w-full max-w-full overflow-hidden space-y-4 sm:space-y-6">
      {/* Top action header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="detail-back-to-list-btn"
            onClick={() => setActiveTab('inventory')}
            className="p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer"
            title="Vissza a terméklistához"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center px-3 py-1 rounded-lg bg-[#006067] text-white font-mono text-sm sm:text-base font-extrabold shadow-xs tracking-wide border border-[#00474c]">
                <span>{p.id}</span>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  stockBreakdown.newStock > 0
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-red-100 text-red-700 border-red-200'
                }`}
                title={stockBreakdown.newStock > 0 ? 'Új készlet' : 'Nincs új készlet (0 db)'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    stockBreakdown.newStock > 0 ? 'bg-emerald-600' : 'bg-red-500'
                  }`}
                ></span>
                Új ({stockBreakdown.newStock} db)
              </span>
              {stockBreakdown.usedStock > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                  Használt ({stockBreakdown.usedStock} db)
                </span>
              )}

              {/* Kanban státusz kijelzés a fejlécben */}
              {productKanbanItems.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {productKanbanItems.map((kItem) => {
                    const style = getKanbanStatusBadgeStyle(kItem.status);
                    return (
                      <button
                        key={kItem.id}
                        type="button"
                        onClick={() => {
                          setSelectedKanbanId(kItem.id);
                          setActiveTab('kanban');
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${style.bg}`}
                        title={`Kanban feladat: "${kItem.title}" (${kItem.id}). Státusz: ${kItem.status}. Kattintson a megnyitáshoz a Kanban táblán!`}
                      >
                        <KanbanIcon className="w-3 h-3 flex-shrink-0" />
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                        <span>Kanban: {kItem.status}</span>
                        {kItem.priority && (
                          <span className="text-[10px] opacity-75 font-normal">
                            ({kItem.priority === 'urgent' ? '🔥 Sürgős' : kItem.priority === 'high' ? '⚠️ Magas' : kItem.priority})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenKanbanModal}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200/80 hover:text-stone-900 transition-colors cursor-pointer"
                  title="Ez a termék még nincs a Kanban táblán. Kattintson ide a hozzáadáshoz!"
                >
                  <KanbanIcon className="w-3 h-3 text-stone-400" />
                  <span>Kanban: nincs hozzáadva</span>
                </button>
              )}

              {/* Aktuális Rendelés státusz a címsorban: csak 'Megrendelni' (piros) vagy 'Megrendelve' (kék). Ha megérkezett, nem jelenik meg! */}
              {activeHeaderOrder && (
                <button
                  type="button"
                  onClick={() => setActiveTab('rendeles')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors shadow-2xs cursor-pointer ${
                    activeHeaderOrder.type === 'megrendelni'
                      ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                      : 'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200'
                  }`}
                  title={`Aktuális megrendelés státusza: ${activeHeaderOrder.label}. ${
                    activeHeaderOrder.order.datumMegrendelve
                      ? `Megrendelve: ${activeHeaderOrder.order.datumMegrendelve}`
                      : activeHeaderOrder.order.datum
                      ? `Dátum: ${activeHeaderOrder.order.datum}`
                      : ''
                  }. Kattintson a Rendelés munkalap megnyitásához!`}
                >
                  <ShoppingCart
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      activeHeaderOrder.type === 'megrendelni' ? 'text-rose-700' : 'text-sky-700'
                    }`}
                  />
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeHeaderOrder.type === 'megrendelni' ? 'bg-rose-600 animate-pulse' : 'bg-sky-600'
                    }`}
                  ></span>
                  <span>{activeHeaderOrder.label}</span>
                  {(activeHeaderOrder.order.datumMegrendelve || activeHeaderOrder.order.datum) && (
                    <span className="text-[10px] font-normal opacity-80 font-mono">
                      ({activeHeaderOrder.order.datumMegrendelve || activeHeaderOrder.order.datum})
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap mt-1">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {p.name}
              </h1>
              {hasVal(p.manufacturer) && (
                <span className="text-[11px] font-medium text-stone-500">
                  ({p.manufacturer})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            id="detail-copy-specs-btn"
            onClick={handleCopySpecs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer min-h-[40px]"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Másolva!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Adatok másolása</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="detail-print-label-btn"
            onClick={() => onPrintLabel(p)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer min-h-[40px]"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            <span>Címke nyomtatása</span>
          </button>

          <button
            type="button"
            id="detail-add-to-kanban-btn"
            onClick={handleOpenKanbanModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[40px]"
            title="Termék hozzáadása a Kanban táblához"
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            <span>Hozzáadás Kanbanhoz</span>
          </button>

          <button
            type="button"
            id="detail-add-note-btn"
            onClick={() => handleOpenNoteModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold shadow-xs transition-colors cursor-pointer min-h-[40px]"
            title="Új jegyzet vagy csatolmány rögzítése a termékhez"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>+ Notesz</span>
          </button>

          <button
            type="button"
            id="detail-edit-product-btn"
            onClick={() => onEdit(p)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer min-h-[40px]"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Szerkesztés</span>
          </button>

          {deleteConfirm ? (
            <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg p-1 min-h-[40px]">
              <span className="text-[11px] text-red-700 font-medium px-2">Biztosan törli?</span>
              <button
                type="button"
                onClick={() => deleteProduct(p.id)}
                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold cursor-pointer"
              >
                Igen
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded text-[11px] cursor-pointer"
              >
                Mégse
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="detail-delete-product-btn"
              onClick={() => setDeleteConfirm(true)}
              className="p-2 rounded-lg border border-stone-200 text-stone-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Termék törlése"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Kanban Success Banner */}
      {kanbanSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{kanbanSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
          >
            <KanbanIcon className="w-3.5 h-3.5" />
            <span>Ugrás a Kanban Táblára</span>
          </button>
        </div>
      )}

      {/* Active Kanban Tasks Banner for this product */}
      {productKanbanItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 via-sky-50/70 to-emerald-50/60 border-2 border-amber-400/90 rounded-xl p-3.5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                <KanbanIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-stone-900">
                    A termék szerepel a Kanban táblán ({productKanbanItems.length} feladat):
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {productKanbanItems.map((kItem) => {
                    const style = getKanbanStatusBadgeStyle(kItem.status);
                    return (
                      <div
                        key={kItem.id}
                        className="inline-flex items-center gap-1.5 text-xs text-stone-700 bg-white/90 border border-amber-200 px-2.5 py-1 rounded-md shadow-3xs"
                      >
                        <span className="font-mono text-[11px] font-bold text-[#006067]">{kItem.id}</span>
                        <span className="font-semibold text-stone-800 truncate max-w-[180px]">{kItem.title}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border ${style.badgeBg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                          {kItem.status}
                        </span>
                        {kItem.priority && (
                          <span className="text-[10px] font-medium text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                            {kItem.priority === 'urgent' ? '🔥 Sürgős' : kItem.priority === 'high' ? '⚠️ Magas' : kItem.priority}
                          </span>
                        )}
                        {kItem.assignee && (
                          <span className="text-[10px] text-stone-500">👤 {kItem.assignee}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="detail-view-on-kanban-board-btn"
                onClick={() => {
                  if (productKanbanItems[0]) {
                    setSelectedKanbanId(productKanbanItems[0].id);
                  }
                  setActiveTab('kanban');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
              >
                <KanbanIcon className="w-3.5 h-3.5" />
                <span>Megnyitás a Kanban Táblán</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main product showcase grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image & Barcode Info */}
        <div className="space-y-6">
          {/* Product Image Card (only rendered or placeholder shown) */}
          <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-2xs">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                Termék Kép / Fotó
              </span>
              {hasImage && (
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="text-stone-400 hover:text-[#006067] transition-colors p-1"
                  title="Kép megnyitása teljes méretben"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-4 flex items-center justify-center min-h-[220px] bg-stone-50">
              {hasImage ? (
                <div
                  className="relative group cursor-pointer overflow-hidden rounded-lg border border-stone-200 bg-white"
                  onClick={() => setShowImageModal(true)}
                >
                  <SafeImage
                    src={productImage}
                    productId={p.id}
                    alt={p.name}
                    className="max-h-[260px] w-auto object-contain mx-auto transition-transform group-hover:scale-105"
                    fallback={
                      <div className="py-12 px-6 text-center text-stone-400">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-mono text-xs">IMG</div>
                        <p className="text-xs font-medium text-stone-600 break-all">{productImage}</p>
                        <p className="text-[11px] text-stone-400 mt-1">Helyi vagy külső kép hivatkozás</p>
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 pointer-events-none">
                    <Maximize2 className="w-4 h-4" />
                    <span>Nagyítás</span>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-6 text-center text-stone-400">
                  <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-stone-200/70 flex items-center justify-center text-stone-400">
                    <Tag className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-medium text-stone-500">Nincs feltöltött kép</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    A szerkesztésnél megadható kép URL vagy elérési út
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Barcode & Identification Card (QR Kód elsődlegesen) */}
          <div className="bg-white rounded-xl border-2 border-slate-300 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-[#006067]" />
                {codeViewMode === 'qr' ? 'Azonosító QR Kód' : 'Azonosító Vonalkód'}
              </h3>
              {/* Váltó QR kód és vonalkód között */}
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  id="switch-to-qr-btn"
                  onClick={() => setCodeViewMode('qr')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    codeViewMode === 'qr'
                      ? 'bg-white text-[#006067] shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Termék ID megjelenítése QR kódként"
                >
                  QR Kód
                </button>
                <button
                  type="button"
                  id="switch-to-barcode-btn"
                  onClick={() => setCodeViewMode('barcode')}
                  className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    codeViewMode === 'barcode'
                      ? 'bg-white text-[#006067] shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="Termék ID megjelenítése vonalkódként"
                >
                  Vonalkód
                </button>
              </div>
            </div>
            <div className="flex justify-center py-3 bg-stone-50 rounded-lg border border-stone-100">
              <BarcodeView value={p.id} mode={codeViewMode} qrSize={124} height={46} showText={true} />
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500">Közvetlen Kulcs:</span>
              <TermekIdLink id={p.id} showIcon={true} />
            </div>

            {hasVal(p.factoryCode) && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Gyári Kód:</span>
                <span className="font-mono font-semibold text-stone-800">{p.factoryCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Dynamic Műszaki Adatlap (Strictly hiding empty fields!) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Primary Specification Card */}
          <div className="bg-white rounded-xl border-2 border-teal-500/35 p-6 shadow-2xs space-y-6">
            <div className="border-b border-teal-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#006067] bg-[#E0E9E8] px-2 py-0.5 rounded">
                  Műszaki Adatlap
                </span>
                <h2 className="text-xl font-extrabold text-stone-900 mt-1">{p.name}</h2>
              </div>

              {/* Dynamic Interactive Filter Tags header (only showing present items) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {hasVal(p.category) && (
                  <FilterTag type="category" value={p.category} variant="pill" />
                )}
                {hasVal(p.manufacturer) && (
                  <FilterTag type="manufacturer" value={p.manufacturer} variant="pill" />
                )}
                {hasVal(p.quality) && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {p.quality}
                  </span>
                )}
              </div>
            </div>

            {/* Leírás block (ONLY if description exists!) */}
            {hasVal(p.description) && (
              <div className="bg-[#F4F7F6] border border-stone-200/70 rounded-lg p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#006067]" />
                  <span>Leírás & Műszaki Megjegyzés</span>
                </p>
                <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-line font-medium">
                  {p.description}
                </p>
              </div>
            )}

            {/* Dynamic Technical Specs Grid - STRICT FILTERING: NO EMPTY FIELDS! */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">
                Részletes Paraméterek
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Termék ID - Mindig kattintható link */}
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-500 text-xs">
                    <Hash className="w-4 h-4 text-[#006067]" />
                    <span>Termék ID:</span>
                  </div>
                  <TermekIdLink id={p.id} showIcon={true} />
                </div>

                {/* Termék név */}
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-stone-500 text-xs">
                    <Tag className="w-4 h-4 text-[#006067]" />
                    <span>Termék név:</span>
                  </div>
                  <span className="font-bold text-stone-900 text-sm">{p.name}</span>
                </div>

                {/* Kategória (only if non-empty) */}
                {hasVal(p.category) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Layers className="w-4 h-4 text-[#006067]" />
                      <span>Kategória:</span>
                    </div>
                    <FilterTag type="category" value={p.category} variant="pill" />
                  </div>
                )}

                {/* Gyártó (only if non-empty) */}
                {hasVal(p.manufacturer) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Factory className="w-4 h-4 text-[#006067]" />
                      <span>Gyártó:</span>
                    </div>
                    <FilterTag type="manufacturer" value={p.manufacturer} variant="pill" />
                  </div>
                )}

                {/* Gyári Kód (only if non-empty) */}
                {hasVal(p.factoryCode) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Hash className="w-4 h-4 text-[#006067]" />
                      <span>Gyári Kód:</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900 text-xs">
                      {p.factoryCode}
                    </span>
                  </div>
                )}

                {/* Alkatrész Típus (only if non-empty) */}
                {hasVal(p.partType) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Sparkles className="w-4 h-4 text-[#006067]" />
                      <span>Alkatrész Típus:</span>
                    </div>
                    <FilterTag type="partType" value={p.partType} variant="pill" />
                  </div>
                )}

                {/* Szigelés Típus (only if non-empty) */}
                {hasVal(p.insulationType) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Shield className="w-4 h-4 text-[#006067]" />
                      <span>Szigelés Típus:</span>
                    </div>
                    <FilterTag type="insulationType" value={p.insulationType} variant="pill" />
                  </div>
                )}

                {/* Szigetelésmegfogó Típusa (only if non-empty) */}
                {hasVal(p.insulationGripperType) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Zap className="w-4 h-4 text-[#006067]" />
                      <span>Szigetelésmegfogó:</span>
                    </div>
                    <span className="font-bold text-xs px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono">
                      {p.insulationGripperType}
                    </span>
                  </div>
                )}

                {/* Adagolás (only if non-empty) */}
                {hasVal(p.dosage) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Layers className="w-4 h-4 text-[#006067]" />
                      <span>Adagolás:</span>
                    </div>
                    <span className="font-semibold text-xs text-stone-800">{p.dosage}</span>
                  </div>
                )}

                {/* Konektor Típusa (only if non-empty) */}
                {hasVal(p.connectorType) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Zap className="w-4 h-4 text-[#006067]" />
                      <span>Konektor Típusa:</span>
                    </div>
                    <span className="font-semibold text-xs text-stone-800">{p.connectorType}</span>
                  </div>
                )}

                {/* Saru Típusa (only if non-empty) */}
                {hasVal(p.terminalType) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Zap className="w-4 h-4 text-[#006067]" />
                      <span>Saru Típusa:</span>
                    </div>
                    <span className="font-semibold text-xs text-stone-800">{p.terminalType}</span>
                  </div>
                )}

                {/* Raktári Hely (A Raktári Pozíciók kártyán lévő valós készlethelyek) */}
                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 text-xs">
                    <Boxes className="w-4 h-4 text-[#006067] flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-bold text-stone-800">Raktári Hely:</span>
                      <span className="text-[10px] text-emerald-700">(Raktári Pozíciók kártyáról)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end max-w-[60%]">
                    {stockPositions.length > 0 ? (
                      stockPositions.map((sp) => (
                        <div key={sp.positionId} className="inline-flex items-center gap-1">
                          <PositionLink positionName={sp.positionName} variant="pill" />
                          <span className="text-[10px] font-bold text-emerald-800 font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300">
                            {sp.quantity} db
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-stone-400 italic">
                        Nincs pozícióhoz rendelve (0 db)
                      </span>
                    )}
                  </div>
                </div>

                {/* Alkatrész Hely (törzsadaton rögzített alkatrész kód) */}
                {hasVal(p.location) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <MapPin className="w-4 h-4 text-[#006067] flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium text-stone-700">Alkatrész Hely:</span>
                        <span className="text-[10px] text-stone-400">(hozzátartozó alkatrész helye)</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PositionLink positionName={p.location} variant="pill" />
                    </div>
                  </div>
                )}

                {/* Minőség (only if non-empty) */}
                {hasVal(p.quality) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Sparkles className="w-4 h-4 text-[#006067]" />
                      <span>Minőség:</span>
                    </div>
                    <span className="text-xs font-semibold text-stone-800">{p.quality}</span>
                  </div>
                )}

                {/* Date (only if non-empty) */}
                {hasVal(p.date) && (
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-500 text-xs">
                      <Calendar className="w-4 h-4 text-[#006067]" />
                      <span>Dátum:</span>
                    </div>
                    <span className="font-mono text-xs text-stone-700">{p.date}</span>
                  </div>
                )}

                {/* Extra custom fields from Google Sheet (only non-empty ones) */}
                {p.customFields &&
                  Object.entries(p.customFields).map(([k, v]) => {
                    if (!hasVal(v)) return null;
                    return (
                      <div
                        key={k}
                        className="bg-stone-50 p-3 rounded-lg border border-stone-200/80 flex items-center justify-between"
                      >
                        <span className="text-stone-500 text-xs">{k}:</span>
                        <span className="font-medium text-xs text-stone-800">{v}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-width lower sections container */}
      <div className="space-y-6">
        {/* Warehouse Positions & Stock Section (Positions & Inventory) - Teljes szélességű kártya (Full Width) */}
        <div className="bg-white rounded-xl border-2 border-emerald-400 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-3xs flex-shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Raktári Pozíciók
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              {/* Összes készlet keret - szélesebb, kényelmesebb keret */}
              <div className="bg-emerald-50 border border-emerald-300 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl flex items-center justify-between gap-4 shadow-2xs min-w-[200px] sm:min-w-[240px]">
                <div>
                  <span className="text-[11px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                    Összes készlet
                  </span>
                  <span className="text-lg sm:text-xl font-black text-emerald-950 font-mono tracking-tight">
                    {totalStock} db
                  </span>
                </div>
                <div className="flex flex-col gap-1 pl-3.5 border-l border-emerald-300/80 text-xs font-bold text-left">
                  <span
                    className={`inline-flex items-center gap-1.5 ${
                      stockBreakdown.newStock > 0 ? 'text-emerald-800' : 'text-red-700'
                    }`}
                    title={stockBreakdown.newStock > 0 ? 'Új raktárkészlet' : 'Nincs új termék raktáron (0 db)'}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stockBreakdown.newStock > 0 ? 'bg-emerald-600' : 'bg-red-500'
                      }`}
                    />
                    Új: {stockBreakdown.newStock} db
                  </span>
                  {stockBreakdown.usedStock > 0 && (
                    <span className="inline-flex items-center gap-1.5 text-amber-900">
                      <span className="w-2 h-2 rounded-full bg-amber-600" />
                      Használt: {stockBreakdown.usedStock} db
                    </span>
                  )}
                </div>
              </div>

              {/* Mellette lévő keret: Készletmozgatás (+/-) gomb - szélesebb, kényelmesebb keret */}
              <button
                type="button"
                onClick={() => handleOpenStockModal()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl bg-[#006067] hover:bg-[#00474c] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all cursor-pointer whitespace-nowrap"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>Készletmozgatás (+/-)</span>
              </button>
            </div>
          </div>

          {/* Positions breakdown cards */}
          {stockPositions.length === 0 ? (
            <div className="p-8 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-500">
              <Boxes className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="font-semibold text-stone-700">Még nincs rögzített készlet ezen a terméken.</p>
              <p className="text-stone-400 mt-0.5">
                Helyezze el a terméket valamelyik raktári pozícióba a fenti gombbal.
              </p>
              <button
                type="button"
                onClick={() => handleOpenStockModal()}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#006067] font-bold hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Első pozícióba helyezés (+ db)</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {stockPositions.map((pos) => (
                  <div
                    key={pos.positionId}
                    id={`pos-card-${pos.positionId.replace(/[^a-zA-Z0-9]/g, '_')}`}
                    onClick={() => selectPositionById(pos.positionId)}
                    className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 hover:bg-white hover:border-[#006067] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                    title={`Ugrás a(z) ${pos.positionName} pozícióra és a benne tárolt termékek listájára`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#006067] bg-[#E0E9E8] px-2 py-0.5 rounded-md group-hover:bg-[#006067] group-hover:text-white transition-colors">
                          {pos.positionId}
                        </span>
                        <span
                          className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                            pos.quantity > 0
                              ? 'text-emerald-800 bg-emerald-100'
                              : 'text-red-800 bg-red-100'
                          }`}
                        >
                          Össz: {pos.quantity} db
                        </span>
                      </div>
                      <p className="text-xs font-bold text-stone-900 mt-1 flex items-center gap-1.5 group-hover:text-[#006067] transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-[#006067] flex-shrink-0" />
                        <span className="truncate underline-offset-2 group-hover:underline">{pos.positionName}</span>
                        <ExternalLink className="w-3 h-3 text-[#006067] opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                      </p>

                      {/* Condition breakdown badges on position card */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                            pos.newQuantity > 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                          title={
                            pos.newQuantity > 0
                              ? 'Új termék ezen a pozíción'
                              : 'Nincs új termék ezen a pozíción (0 db)'
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              pos.newQuantity > 0 ? 'bg-emerald-600' : 'bg-red-500'
                            }`}
                          />
                          Új: {pos.newQuantity} db
                        </span>

                        {pos.usedQuantity > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                            title="Használt termék ezen a pozíción"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Használt: {pos.usedQuantity} db
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-stone-500 font-medium">
                        {pos.records.length} mozgás
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStockModal(pos.positionId);
                        }}
                        className="text-[11px] font-semibold text-[#006067] hover:text-[#00474c] hover:underline cursor-pointer bg-white px-2 py-0.5 rounded border border-stone-200"
                        title="Készletmozgás rögzítése erre a pozícióra"
                      >
                        +/- Módosítás
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Maintenance & Inspections History Section */}
          {(() => {
            const productInspections = getProductInspections(p.id);
            if (productInspections.length === 0) {
              return null;
            }
            return (
              <div className="bg-white rounded-xl border-2 border-purple-300 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
                      <ClipboardList className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                        Karbantartási Napló
                        <span className="text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-full">
                          {productInspections.length} bejegyzés
                        </span>
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        Eszköz karbantartási vizsgálatai és alkatrészcseréi
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('inspections')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#006067] hover:underline cursor-pointer"
                  >
                    <span>Összes megtekintése</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="divide-y divide-stone-100">
                  {productInspections.map((insp) => {
                    const isMainProduct = (insp.productId || '').toLowerCase() === p.id.toLowerCase();
                    const hasChange = insp.changeItem && insp.changeItem.trim() !== '' && insp.changeItem.trim() !== '-';
                    return (
                      <div key={insp.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {renderInspectionStatusBadge(insp.status)}
                            {insp.date && (
                              <span className="text-[11px] text-stone-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {insp.date}
                              </span>
                            )}
                            {!isMainProduct && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                Cserealkatrészként beépítve a(z) {insp.productId} gépbe
                              </span>
                            )}
                          </div>
                          {insp.description && (
                            <p className="text-stone-600 text-[11px]">{insp.description}</p>
                          )}
                        </div>

                        {hasChange && (
                          <div className="flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => selectProductById(insp.changeItem!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold cursor-pointer group/link"
                            >
                              <Wrench className="w-3 h-3 text-amber-600" />
                              <span>Cserélt alkatrész: {insp.changeItem}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover/link:opacity-100" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Konnektor - Saru Kapcsolatok (KonSar) Section */}
          {(() => {
            const connectedKonSar = getConnectedKonSar(p.id);

            if (connectedKonSar.length === 0) {
              return null;
            }

            return (
              <div className="bg-white rounded-xl border-2 border-sky-400 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-sky-950">
                          Konnektor – Saru Kapcsolat
                        </h3>
                        <span className="text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full">
                          {connectedKonSar.length} kapcsolat
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {connectedKonSar.map(({ relation, partnerId, partnerProduct, partnerType, partnerCategory }, idx) => {
                    const displayCategory = partnerProduct?.category || partnerCategory || (partnerType === 'Konnektor' ? 'Konnektor' : partnerType === 'Saru' ? 'Saru' : 'Kapcsolódó');
                    return (
                      <div
                        key={relation.id ? `${relation.id}-${partnerId}` : `konsar-${partnerId}-${idx}`}
                        onClick={() => selectProductById(partnerId)}
                        className="p-3.5 bg-sky-50/25 hover:bg-sky-50/60 rounded-xl border border-sky-200 hover:border-sky-400 cursor-pointer transition-all hover:shadow-xs group flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Top row: Category badge from table & Prominently highlighted Termék ID */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {renderRelationCategoryBadge(
                              displayCategory,
                              partnerType,
                              partnerType === 'Konnektor' ? '🔌' : '⚡'
                            )}

                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-sky-100 text-sky-950 border border-sky-300 font-mono text-xs font-bold tracking-wide">
                              <span>{partnerId}</span>
                            </div>
                          </div>

                          {/* Main content: Image + Multi-line description */}
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={partnerProduct?.image}
                              productId={partnerProduct?.id || partnerId}
                              alt={partnerProduct?.name || partnerId}
                              className="w-12 h-12 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                              fallback={
                                <div className="w-12 h-12 rounded-lg bg-stone-200/70 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                  <Link2 className="w-5 h-5" />
                                </div>
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900 group-hover:text-[#006067] transition-colors break-words whitespace-normal leading-snug">
                                {partnerProduct?.name || partnerId}
                              </p>

                              {partnerProduct?.factoryCode && (
                                <p className="text-[11px] font-mono text-stone-500 mt-1 break-words">
                                  Gyári kód: <span className="font-semibold text-stone-700">{partnerProduct.factoryCode}</span>
                                </p>
                              )}

                              {partnerProduct?.location && (
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                  <span>Hely: {partnerProduct.location}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Termék - Mérődoboz Kapcsolatok (TermMerod) Section */}
          {(() => {
            const connectedTermMerod = getConnectedTermMerod(p.id);

            if (connectedTermMerod.length === 0) {
              return null;
            }

            return (
              <div className="bg-white rounded-xl border-2 border-emerald-400 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                      <Gauge className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-emerald-950">
                          Termék – Mérődoboz Kapcsolatok
                        </h3>
                        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {connectedTermMerod.length} kapcsolat
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {connectedTermMerod.map(({ relation, partnerId, partnerProduct, role, partnerCategory }, idx) => {
                    const displayCategory = partnerProduct?.category || partnerCategory || (role === 'Mérődoboz' ? 'Mérődoboz' : 'Gyártandó Termék');
                    return (
                      <div
                        key={relation.id ? `${relation.id}-${partnerId}` : `termmerod-${partnerId}-${idx}`}
                        onClick={() => selectProductById(partnerId)}
                        className="p-3.5 bg-emerald-50/25 hover:bg-emerald-50/60 rounded-xl border border-emerald-200 hover:border-emerald-400 cursor-pointer transition-all hover:shadow-xs group flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Top row: Exact Category badge from table & Prominently highlighted Termék ID */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {renderRelationCategoryBadge(
                              displayCategory,
                              role === 'Mérődoboz' ? 'Mérődoboz' : 'Gyártandó Termék',
                              role === 'Mérődoboz' ? '📦' : '🏭'
                            )}

                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-950 border border-emerald-300 font-mono text-xs font-bold tracking-wide">
                              <span>{partnerId}</span>
                            </div>
                          </div>

                          {/* Main content: Image + Multi-line description */}
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={partnerProduct?.image}
                              productId={partnerProduct?.id || partnerId}
                              alt={partnerProduct?.name || partnerId}
                              className="w-12 h-12 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                              fallback={
                                <div className="w-12 h-12 rounded-lg bg-stone-200/70 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                  {role === 'Mérődoboz' || displayCategory.toLowerCase().includes('mérő') || displayCategory.toLowerCase().includes('merod') ? (
                                    <Box className="w-5 h-5 text-amber-700" />
                                  ) : (
                                    <Cpu className="w-5 h-5 text-emerald-700" />
                                  )}
                                </div>
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900 group-hover:text-emerald-800 transition-colors break-words whitespace-normal leading-snug">
                                {partnerProduct?.name || partnerId}
                              </p>

                              {partnerProduct?.description && (
                                <p className="text-[11px] text-stone-600 break-words whitespace-normal leading-tight mt-1">
                                  {partnerProduct.description}
                                </p>
                              )}

                              {partnerProduct?.factoryCode && (
                                <p className="text-[11px] font-mono text-stone-500 mt-1 break-words">
                                  Gyári kód: <span className="font-semibold text-stone-700">{partnerProduct.factoryCode}</span>
                                </p>
                              )}

                              {partnerProduct?.location && (
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                  <span>Hely: {partnerProduct.location}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Beépülő Alkatrészek (Beépülő Alkatrész munkalap) Section */}
          {(() => {
            const connectedBeepulo = getConnectedBeepulo(p.id);

            // Hide completely if there are no connected parts (respecting "ahol nincs akor a hozzá tartozó alkatrész se jelenjen meg")
            if (connectedBeepulo.length === 0) {
              return null;
            }

            const builtInParts = connectedBeepulo.filter((item) => item.role === 'Beépülő alkatrész');
            const parentProducts = connectedBeepulo.filter((item) => item.role === 'Főtermék amibe beépül');

            return (
              <div className="bg-white rounded-xl border-2 border-indigo-400 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-300 flex items-center justify-center text-indigo-700">
                      <Puzzle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-indigo-950">
                          Beépülő Alkatrészek
                        </h3>
                        <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                          {connectedBeepulo.length} tétel
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {builtInParts.length > 0 && parentProducts.length === 0 && 'A termékbe beépülő csere- és kopóalkatrészek'}
                        {parentProducts.length > 0 && builtInParts.length === 0 && 'Főtermékek, amelyekbe ez az alkatrész beépül'}
                        {builtInParts.length > 0 && parentProducts.length > 0 && 'Beépülő alkatrészek és főtermék kapcsolatok'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {connectedBeepulo.map(({ relation, partnerId, partnerProduct, role, quantity, note, partnerCategory }, idx) => {
                    const displayCategory = partnerProduct?.category || partnerCategory || (role === 'Beépülő alkatrész' ? 'Saruzófej Alkatrész' : 'Saruzófej');
                    const isComponent = role === 'Beépülő alkatrész';
                    const breakdown = getProductStockBreakdown(partnerId);

                    return (
                      <div
                        key={relation.id ? `${relation.id}-${partnerId}` : `beepulo-${partnerId}-${idx}`}
                        onClick={() => selectProductById(partnerId)}
                        className="p-3.5 bg-indigo-50/25 hover:bg-indigo-50/60 rounded-xl border border-indigo-200 hover:border-indigo-400 cursor-pointer transition-all hover:shadow-xs group flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Top row: Exact Category badge from table & Prominently highlighted Termék ID */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {renderRelationCategoryBadge(
                                displayCategory,
                                isComponent ? 'Saruzófej Alkatrész' : 'Saruzófej',
                                isComponent ? '🧩' : '🏭'
                              )}
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isComponent
                                    ? 'bg-indigo-100/70 text-indigo-800'
                                    : 'bg-emerald-100/70 text-emerald-800'
                                }`}
                              >
                                {isComponent ? 'Beépülő alkatrész' : 'Beépül ebbe'}
                              </span>
                            </div>

                            {/* Prominent Termék ID */}
                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-950 border border-indigo-300 font-mono text-xs font-bold tracking-wide">
                              <span>{partnerId}</span>
                            </div>
                          </div>

                          {/* Main content: Image + details */}
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={partnerProduct?.image}
                              productId={partnerProduct?.id || partnerId}
                              alt={partnerProduct?.name || partnerId}
                              className="w-12 h-12 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                              fallback={
                                <div className="w-12 h-12 rounded-lg bg-stone-200/70 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                  {isComponent ? (
                                    <Puzzle className="w-5 h-5 text-indigo-600" />
                                  ) : (
                                    <Cpu className="w-5 h-5 text-emerald-700" />
                                  )}
                                </div>
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900 group-hover:text-indigo-800 transition-colors break-words whitespace-normal leading-snug">
                                {partnerProduct?.name || partnerId}
                              </p>

                              {/* Note / Position / Spec info */}
                              {note && (
                                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold">
                                  <span>📌 {note}</span>
                                </div>
                              )}

                              {partnerProduct?.description && !note && (
                                <p className="text-[11px] text-stone-600 break-words whitespace-normal leading-tight mt-1">
                                  {partnerProduct.description}
                                </p>
                              )}

                              {partnerProduct?.factoryCode && (
                                <p className="text-[11px] font-mono text-stone-500 mt-1 break-words">
                                  Gyári kód: <span className="font-semibold text-stone-700">{partnerProduct.factoryCode}</span>
                                </p>
                              )}

                              <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                                {quantity > 0 && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                                    Mennyiség: {quantity} db
                                  </span>
                                )}

                                {partnerProduct?.location && (
                                  <span className="text-[10px] text-stone-500 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                    <span>{partnerProduct.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Warehouse Stock Breakdown: Új, Használt, Összesen */}
                        <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#006067]" />
                            <span>Raktár:</span>
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                breakdown.newStock > 0
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-red-100 text-red-700 border-red-200'
                              }`}
                              title={breakdown.newStock > 0 ? 'Új raktárkészlet' : 'Nincs új raktárkészlet (0 db)'}
                            >
                              Új: {breakdown.newStock} db
                            </span>
                            {breakdown.usedStock > 0 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                title="Használt (H_) raktárkészlet"
                              >
                                Használt: {breakdown.usedStock} db
                              </span>
                            )}
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold"
                              title="Összes raktárkészlet"
                            >
                              Össz: {breakdown.totalStock} db
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Saruzófej - Saru (FejSaru munkalap) Section */}
          {(() => {
            const connectedFejSaru = getConnectedFejSaru(p.id);

            // Hide completely if there are no connected relations
            if (connectedFejSaru.length === 0) {
              return null;
            }

            return (
              <div className="bg-white rounded-xl border-2 border-amber-400 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-amber-950">
                          Saruzófej – Saru Kapcsolat
                        </h3>
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                          {connectedFejSaru.length} kapcsolat
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {connectedFejSaru.map(({ relation, partnerId, partnerProduct, role, note, partnerCategory }, idx) => {
                    const displayCategory = partnerProduct?.category || partnerCategory || (role === 'Saruzófej' ? 'Saruzófej' : 'Saru');
                    const isFej = role === 'Saruzófej';
                    const breakdown = getProductStockBreakdown(partnerId);

                    return (
                      <div
                        key={relation.id ? `${relation.id}-${partnerId}` : `fejsaru-${partnerId}-${idx}`}
                        onClick={() => selectProductById(partnerId)}
                        className="p-3.5 bg-amber-50/25 hover:bg-amber-50/60 rounded-xl border border-amber-200 hover:border-amber-400 cursor-pointer transition-all hover:shadow-xs group flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          {/* Top row: Exact Category badge & Highlighted Termék ID */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  isFej
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-orange-100 text-orange-900 border-orange-300'
                                }`}
                              >
                                <span>{isFej ? '⚡' : '🔌'}</span>
                                <span>{displayCategory}</span>
                              </span>
                            </div>

                            {/* Prominent Termék ID */}
                            <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 border border-amber-300 font-mono text-xs font-bold tracking-wide">
                              <span>{partnerId}</span>
                            </div>
                          </div>

                          {/* Main content: Image + details */}
                          <div className="flex items-start gap-3">
                            <SafeImage
                              src={partnerProduct?.image}
                              alt={partnerProduct?.name || partnerId}
                              className="w-12 h-12 object-cover rounded-lg bg-white border border-stone-200 shrink-0"
                              fallback={
                                <div className="w-12 h-12 rounded-lg bg-stone-200/70 border border-stone-300 flex items-center justify-center text-stone-400 shrink-0">
                                  {isFej ? (
                                    <Cpu className="w-5 h-5 text-teal-700" />
                                  ) : (
                                    <Zap className="w-5 h-5 text-amber-700" />
                                  )}
                                </div>
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-stone-900 group-hover:text-[#006067] transition-colors break-words whitespace-normal leading-snug">
                                {partnerProduct?.name || partnerId}
                              </p>

                              {note && (
                                <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-[#006067] text-[10px] font-bold">
                                  <span>📌 {note}</span>
                                </div>
                              )}

                              {partnerProduct?.description && !note && (
                                <p className="text-[11px] text-stone-600 break-words whitespace-normal leading-tight mt-1">
                                  {partnerProduct.description}
                                </p>
                              )}

                              {partnerProduct?.factoryCode && (
                                <p className="text-[11px] font-mono text-stone-500 mt-1 break-words">
                                  Gyári kód: <span className="font-semibold text-stone-700">{partnerProduct.factoryCode}</span>
                                </p>
                              )}

                              {partnerProduct?.location && (
                                <p className="text-[10px] text-stone-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                  <span>{partnerProduct.location}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Warehouse Stock Breakdown: Új (always shown, red if 0), Használt, Össz */}
                        <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                          <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-[#006067]" />
                            <span>Raktár:</span>
                          </span>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                breakdown.newStock > 0
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : 'bg-red-100 text-red-700 border-red-200'
                              }`}
                              title={breakdown.newStock > 0 ? 'Új raktárkészlet' : 'Nincs új raktárkészlet (0 db)'}
                            >
                              Új: {breakdown.newStock} db
                            </span>
                            {breakdown.usedStock > 0 && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                title="Használt (H_) raktárkészlet"
                              >
                                Használt: {breakdown.usedStock} db
                              </span>
                            )}
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-900 text-white text-[10px] font-mono font-bold"
                              title="Összes raktárkészlet"
                            >
                              Össz: {breakdown.totalStock} db
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Notesz (Note munkalap) Section */}
          {(() => {
            const productNotes = getNotesForProduct(p.id);

            // "ha nincs notesz egy adott termékhez akkor a Notesz kártya se jelenjen meg mint eddig csak ha van"
            if (!productNotes || productNotes.length === 0) {
              return null;
            }

            return (
              <div
                id="product-detail-notes-card"
                className="bg-white rounded-xl border-2 border-amber-400 p-5 shadow-2xs space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-amber-950">
                          Notesz
                        </h3>
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                          {productNotes.length} bejegyzés
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        A termékhez csatolt jegyzetek, műszaki dokumentumok és előnézetek
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenNoteModal()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Új bejegyzés</span>
                  </button>
                </div>

                {/* Notes items list */}
                <div className="space-y-4">
                  {productNotes.map((note, idx) => (
                    <div
                      key={note.id || `note-${idx}`}
                      className="p-4 bg-amber-50/20 hover:bg-amber-50/50 rounded-xl border border-amber-200 transition-all space-y-3"
                    >
                      {/* Top row: Note title, Date, Author (Név választás), Edit/Delete actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-150 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-mono text-xs font-bold flex items-center justify-center border border-amber-200 shrink-0">
                            #{idx + 1}
                          </span>
                          <h4 className="text-sm font-bold text-stone-900">
                            {note.nev || 'Névtelen jegyzet'}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {note.date && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-mono text-[11px]">
                              <Calendar className="w-3 h-3 text-stone-500" />
                              <span>{note.date}</span>
                            </span>
                          )}
                          {note.nevValasztas && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold text-[11px]">
                              <UserCheck className="w-3 h-3 text-indigo-600" />
                              <span>{note.nevValasztas}</span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenNoteModal(note)}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-1 cursor-pointer"
                            title="Jegyzet szerkesztése"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Jegyzet törlése"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Leírás */}
                      {note.leiras && (
                        <div className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                          {note.leiras}
                        </div>
                      )}

                      {/* URL (Előnézet képpel / többoldalas PDF miniatűrökkel) */}
                      {(note.url || note.id) && (
                        <div className="pt-1">
                          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <ExternalLink className="w-3 h-3 text-stone-400" />
                            <span>Csatolt URL / Média előnézet:</span>
                          </div>
                          <UrlMediaPreview
                            url={note.url}
                            noteId={note.id}
                            pageCount={note.pageCount}
                            title={note.nev || 'Dokumentum'}
                          />
                        </div>
                      )}

                      {/* Additional Image if distinct from URL */}
                      {note.image && note.image !== note.url && (
                        <div className="pt-1">
                          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <ImageIcon className="w-3 h-3 text-stone-400" />
                            <span>Csatolt Kép:</span>
                          </div>
                          <UrlMediaPreview
                            url={note.image}
                            title={note.nev ? `${note.nev} - Kép` : 'Kép'}
                          />
                        </div>
                      )}

                      {/* Documents reference if present */}
                      {note.documents && (
                        <div className="flex items-center flex-wrap gap-2 pt-1 text-xs">
                          <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-stone-400 font-medium">Dokumentum:</span>
                          {note.documents.startsWith('http') || note.documents.includes('drive.google.com') ? (
                            <a
                              href={note.documents}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-rose-700 hover:text-rose-900 hover:underline font-bold text-[11px]"
                            >
                              <span>{note.documents}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-800 font-bold text-[11px]">
                              {note.documents}
                            </span>
                          )}
                        </div>
                      )}

                      {/* If note.documents is a URL and note.url is empty, render media preview */}
                      {!note.url && note.documents && (note.documents.startsWith('http') || note.documents.includes('drive.google.com')) && (
                        <div className="pt-1">
                          <UrlMediaPreview
                            url={note.documents}
                            noteId={note.id}
                            pageCount={note.pageCount}
                            title={note.nev || 'Dokumentum'}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>

      {/* Saru Segédtáblázat (Keresztmetszeti mátrix: 0.25..6.00 mm²) Section - Teljes szélességű kártya (Full Width) */}
      {(() => {
        // Only show sarumagasság table on the Saru (terminal) product's own page
        const cat = (p.category || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const isNonSaru =
          cat.includes('saruzófej') ||
          cat.includes('saruzofej') ||
          cat.includes('saruzógép') ||
          cat.includes('saruzogep') ||
          cat.includes('konnektor') ||
          cat.includes('mérődoboz') ||
          cat.includes('merodoboz') ||
          cat.includes('daraboló') ||
          cat.includes('darabolo') ||
          cat.includes('blankoló') ||
          cat.includes('blankolo') ||
          cat.includes('prés') ||
          cat.includes('pres') ||
          cat.includes('gép') ||
          cat.includes('gep') ||
          name.startsWith('saruzófej') ||
          name.startsWith('saruzofej') ||
          name.startsWith('saruzógép') ||
          name.startsWith('saruzogep');

        if (isNonSaru) {
          return null;
        }

        const allSaruSpecs = getAllSaruSpecsForProduct(p);

        if (!allSaruSpecs || allSaruSpecs.length === 0) {
          return null;
        }

        return (
          <div className="w-full space-y-6">
            {allSaruSpecs.map((spec, specIdx) => (
              <SaruSpecMatrix
                key={spec.id || `saru-spec-${specIdx}`}
                spec={spec}
                showHeader={true}
                showMetadata={true}
                variationIndex={allSaruSpecs.length > 1 ? specIdx + 1 : undefined}
                totalVariations={allSaruSpecs.length}
              />
            ))}
          </div>
        );
      })()}

      {/* Rendelési Történet (Active Orders & Connected Orders Banner) - Alul, az utolsó helyen */}
      {hasAnyOrder && (
        <div className="bg-gradient-to-r from-sky-50/90 via-teal-50/80 to-emerald-50/70 border-2 border-sky-400/90 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#006067] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-stone-900">
                    Rendelési Történet
                  </h3>
                  {sortedDirectOrders.length > 0 && (
                    <span className="text-[11px] font-extrabold bg-[#E0E9E8] text-[#006067] border border-[#006067]/20 px-2.5 py-0.5 rounded-full">
                      {sortedDirectOrders.length} db közvetlen tétel
                    </span>
                  )}
                  {sortedRelatedOrders.length > 0 && (
                    <span className="text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      Kapcsolódó: {sortedRelatedOrders.length} tétel
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              id="detail-open-rendeles-tab-btn"
              onClick={() => setActiveTab('rendeles')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Megnyitás a Rendelés Munkalapon</span>
            </button>
          </div>

          {/* Direct orders list sorted chronologically by date - genuine list layout */}
          {sortedDirectOrders.length > 0 && (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                Cikkszám rendelési tételei (időrendi lista):
              </p>
              
              <div className="bg-white/95 rounded-xl border border-stone-200 overflow-hidden shadow-3xs">
                <div className="divide-y divide-stone-150">
                  {sortedDirectOrders.map((ord, idx) => {
                    const badge = getOrderStatusBadge(ord.statusz);
                    const Icon = badge.icon;
                    return (
                      <div
                        key={ord.id || `ord-${idx}`}
                        className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors"
                      >
                        {/* Bal oldal: Sorszám, Cikkszám, Státusz és alatta szépen a Terméknév */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* 1. sor: Sorszám, Cikkszám és Státusz badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 font-mono text-xs font-bold flex items-center justify-center border border-stone-300 shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-700 shrink-0">
                              <span className="text-stone-400 font-sans">Cikkszám:</span>
                              <strong className="font-bold text-[#006067] text-sm bg-[#E0E9E8]/60 px-2 py-0.5 rounded border border-[#006067]/20">
                                {ord.termekId}
                              </strong>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs border ${badge.bg} shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span>{badge.label}</span>
                            </span>
                          </div>

                          {/* 2. sor: Terméknév szépen egymás alatt elrendezve */}
                          {p?.name && (
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-xs">
                              <span className="text-stone-400 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider shrink-0">
                                Terméknév:
                              </span>
                              <span className="font-semibold text-stone-900 break-words text-xs sm:text-sm">
                                {p.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Jobb oldal: 3 egyforma, soha meg nem törő dátum oszlop egymás mellett */}
                        <div className="bg-stone-50/90 border border-stone-200 rounded-lg p-2 shrink-0 w-full md:w-auto md:min-w-[330px] shadow-3xs">
                          <div className="grid grid-cols-3 divide-x divide-stone-200 text-center">
                            <div className="px-1.5 sm:px-2 py-0.5 flex flex-col items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                Létrehozva
                              </span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-800 whitespace-nowrap mt-0.5">
                                {ord.datum || '—'}
                              </span>
                            </div>
                            <div className="px-1.5 sm:px-2 py-0.5 flex flex-col items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                Megrendelve
                              </span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-800 whitespace-nowrap mt-0.5">
                                {ord.datumMegrendelve || '—'}
                              </span>
                            </div>
                            <div className="px-1.5 sm:px-2 py-0.5 flex flex-col items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                Raktárban
                              </span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-800 whitespace-nowrap mt-0.5">
                                {ord.datumRaktarban || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Related orders list sorted chronologically by date - genuine list layout */}
          {sortedRelatedOrders.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-200/60">
              <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                Ehhez a cikkhez kapcsolódó termékek megrendelései ({sortedRelatedOrders.length} db):
              </p>
              <div className="bg-white/95 rounded-xl border border-amber-200/90 overflow-hidden shadow-3xs">
                <div className="divide-y divide-amber-100/80">
                  {sortedRelatedOrders.map((ro, idx) => {
                    const relBadge = getOrderStatusBadge(ro.order.statusz);
                    const RelIcon = relBadge.icon;
                    return (
                      <div
                        key={`rel-ord-${ro.order.id}-${idx}`}
                        className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-amber-50/40 transition-colors"
                      >
                        {/* Bal oldal: Sorszám, Kapcsolat típus, Cikkszám gomb, Státusz és alatta szépen a Terméknév */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* 1. sor: Sorszám, Típus, Cikkszám és Státusz badge */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-mono text-xs font-bold flex items-center justify-center border border-amber-300 shrink-0">
                              #{idx + 1}
                            </span>
                            
                            {ro.relationType && (
                              <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-300/80 shrink-0">
                                {ro.relationType}
                              </span>
                            )}

                            <div className="inline-flex items-center gap-1.5 font-mono text-xs text-stone-700 shrink-0">
                              <span className="text-stone-400 font-sans">Cikkszám:</span>
                              <button
                                type="button"
                                onClick={() => selectProductById(ro.relatedProductId)}
                                className="font-bold text-[#006067] text-sm hover:underline cursor-pointer bg-stone-100 hover:bg-[#E0E9E8] px-2 py-0.5 rounded border border-stone-200 transition-colors"
                                title={`Kattintson ide a(z) ${ro.relatedProductId} termék adatlapjának megnyitásához!`}
                              >
                                {ro.relatedProductId}
                              </button>
                            </div>

                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-xs border ${relBadge.bg} shrink-0`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${relBadge.dot}`}></span>
                              <RelIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{relBadge.label}</span>
                            </span>
                          </div>

                          {/* 2. sor: Terméknév szépen egymás alatt elrendezve */}
                          {ro.relatedProduct?.name && (
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-xs">
                              <span className="text-stone-400 text-[10px] sm:text-[11px] uppercase font-bold tracking-wider shrink-0">
                                Terméknév:
                              </span>
                              <span className="font-semibold text-stone-900 break-words text-xs sm:text-sm" title={ro.relatedProduct.name}>
                                {ro.relatedProduct.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Jobb oldal: 3 egyforma, soha meg nem törő dátum oszlop egymás mellett */}
                        <div className="bg-amber-50/50 border border-amber-200/70 rounded-lg p-2 shrink-0 w-full md:w-auto md:min-w-[330px] shadow-3xs">
                          <div className="grid grid-cols-3 divide-x divide-amber-200/80 text-center">
                            <div className="px-1.5 sm:px-2 py-0.5 flex flex-col items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                Létrehozva
                              </span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-800 whitespace-nowrap mt-0.5">
                                {ro.order.datum || '—'}
                              </span>
                            </div>
                            <div className="px-1.5 sm:px-2 py-0.5 flex flex-col items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                Megrendelve
                              </span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-800 whitespace-nowrap mt-0.5">
                                {ro.order.datumMegrendelve || '—'}
                              </span>
                            </div>
                            <div className="px-1.5 sm:px-2 py-0.5 flex flex-col items-center justify-center">
                              <span className="text-[9px] sm:text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                Raktárban
                              </span>
                              <span className="text-[11px] sm:text-xs font-mono font-bold text-stone-800 whitespace-nowrap mt-0.5">
                                {ro.order.datumRaktarban || '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Stock Movement Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E0E9E8] flex items-center justify-center text-[#006067]">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    Készlet Elhelyezés & Mozgás
                  </h3>
                  <span className="text-xs font-mono text-stone-500">{p.id} — {p.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-5 space-y-4 text-xs">
              {/* Type Selection */}
              <div>
                <label className="block font-bold text-stone-800 mb-1.5">Művelet típusa:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, type: 'add' })}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                      stockForm.type === 'add'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4 mx-auto mb-0.5 text-emerald-600" />
                    <span>Bevételezés (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, type: 'remove' })}
                    className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                      stockForm.type === 'remove'
                        ? 'border-red-600 bg-red-50 text-red-900'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4 mx-auto mb-0.5 text-red-600" />
                    <span>Kiadás / Levonás (-)</span>
                  </button>
                </div>
              </div>

              {/* Position Selection */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Raktári Pozíció (Positions munkalap) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={stockForm.positionId}
                  onChange={(e) => setStockForm({ ...stockForm, positionId: e.target.value })}
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-xs focus:bg-white focus:border-[#006067] outline-none"
                >
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name} ({pos.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Mennyiség (db) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={stockForm.quantity}
                  onChange={(e) =>
                    setStockForm({ ...stockForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-sm text-stone-900 font-bold focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">Megjegyzés</label>
                <input
                  type="text"
                  value={stockForm.note}
                  onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                  placeholder="pl. Raktári elhelyezés, Új beérkezés"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 text-xs focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Készlet Mentése</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Task Creation Modal */}
      {isKanbanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <KanbanIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Termék Hozzáadása a Kanban Táblához</h3>
                  <span className="text-[11px] font-mono text-[#006067] font-semibold">{p.id} - {p.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKanbanModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKanban} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Feladat / Művelet Címe *</label>
                <input
                  type="text"
                  required
                  value={kanbanForm.title}
                  onChange={(e) => setKanbanForm({ ...kanbanForm, title: e.target.value })}
                  placeholder="Feladat megnevezése"
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Státusz Oszlop *</label>
                  <select
                    value={kanbanForm.status}
                    onChange={(e) => setKanbanForm({ ...kanbanForm, status: e.target.value as KanbanStatus })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  >
                    <option value="Terv">Terv</option>
                    <option value="Folyamatban">Folyamatban</option>
                    <option value="Teszt">Teszt</option>
                    <option value="Befejezve">Befejezve</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Prioritás</label>
                  <select
                    value={kanbanForm.priority}
                    onChange={(e) => setKanbanForm({ ...kanbanForm, priority: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 font-medium text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  >
                    <option value="low">Alacsony</option>
                    <option value="medium">Normál</option>
                    <option value="high">Magas ⚠️</option>
                    <option value="urgent">Sürgős 🔥</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Mennyiség (db)</label>
                  <input
                    type="number"
                    min="1"
                    value={kanbanForm.quantity}
                    onChange={(e) => setKanbanForm({ ...kanbanForm, quantity: e.target.value })}
                    placeholder="pl. 10"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Felelős (Munkatárs)</label>
                  <input
                    type="text"
                    value={kanbanForm.assignee}
                    onChange={(e) => setKanbanForm({ ...kanbanForm, assignee: e.target.value })}
                    placeholder="pl. Kovács János"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Határidő</label>
                <input
                  type="date"
                  value={kanbanForm.dueDate}
                  onChange={(e) => setKanbanForm({ ...kanbanForm, dueDate: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Leírás & Megjegyzés</label>
                <textarea
                  rows={3}
                  value={kanbanForm.description}
                  onChange={(e) => setKanbanForm({ ...kanbanForm, description: e.target.value })}
                  placeholder="Részletes leírás..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#006067]"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsKanbanModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Kártya Létrehozása</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Creation / Editing Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    {editingNote ? 'Jegyzet Szerkesztése' : 'Új Jegyzet Hozzáadása'}
                  </h3>
                  <span className="text-xs font-mono text-stone-500">{p.id} — {p.name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-5 space-y-3.5 text-xs">
              {/* Név */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Jegyzet Neve (Név) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={noteForm.nev}
                  onChange={(e) => setNoteForm({ ...noteForm, nev: e.target.value })}
                  placeholder="pl. Préselési beállítás, Műszaki észrevétel"
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                />
              </div>

              {/* Leírás */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Leírás
                </label>
                <textarea
                  rows={3}
                  value={noteForm.leiras}
                  onChange={(e) => setNoteForm({ ...noteForm, leiras: e.target.value })}
                  placeholder="Részletes leírás, megjegyzések, paraméterek..."
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] leading-relaxed"
                />
              </div>

              {/* URL (Előnézethez: kép, PDF, weboldal) */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  URL (Kép vagy többoldalas PDF link előnézettel)
                </label>
                <input
                  type="url"
                  value={noteForm.url}
                  onChange={(e) => setNoteForm({ ...noteForm, url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/... vagy https://.../dokumentum.pdf"
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Támogatja a Google Drive PDF linkeket, direkt PDF és kép fájlokat. Többoldalas PDF-eknél lapozható miniatűr jelenik meg!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Image */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Image (Kép URL / útvonal)
                  </label>
                  <input
                    type="text"
                    value={noteForm.image}
                    onChange={(e) => setNoteForm({ ...noteForm, image: e.target.value })}
                    placeholder="Kép URL vagy fájlnév"
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] text-[11px]"
                  />
                </div>

                {/* Documents */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Documents (Dokumentum azonosító)
                  </label>
                  <input
                    type="text"
                    value={noteForm.documents}
                    onChange={(e) => setNoteForm({ ...noteForm, documents: e.target.value })}
                    placeholder="pl. DOC-2024-01"
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Dátum (Date)
                  </label>
                  <input
                    type="date"
                    value={noteForm.date}
                    onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                {/* Név választás */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Név választás (Felelős / Szerző)
                  </label>
                  <input
                    type="text"
                    value={noteForm.nevValasztas}
                    onChange={(e) => setNoteForm({ ...noteForm, nevValasztas: e.target.value })}
                    placeholder="pl. Kovács János"
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#006067] hover:bg-[#004b50] text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  {editingNote ? 'Frissítés mentése' : 'Jegyzet mentése'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High-res Image Modal */}
      {showImageModal && hasImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-3">
              <div>
                <span className="font-mono text-xs font-bold text-[#006067]">{p.id}</span>
                <h3 className="font-bold text-stone-900 text-sm">{p.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[70vh] overflow-auto">
              <SafeImage
                src={productImage}
                productId={p.id}
                alt={p.name}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
                fallback={
                  <div className="py-16 px-8 text-center text-stone-400">
                    <p className="text-sm font-semibold text-stone-700">A kép nem jeleníthető meg</p>
                    <p className="text-xs font-mono text-stone-500 mt-1 break-all">{productImage}</p>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

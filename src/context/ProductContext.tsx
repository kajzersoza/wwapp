import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  Product,
  WarehousePosition,
  InventoryRecord,
  ProductStockPosition,
  FilterState,
  ViewMode,
  ActiveTab,
  Inspection,
  KonSarRelation,
  TermMerodRelation,
  BeepuloRelation,
  FejSaruRelation,
  SaruSpec,
  KanbanItem,
  KanbanStatus,
  Order,
  ProductNote,
} from '../types';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { INITIAL_POSITIONS } from '../data/initialPositions';
import { INITIAL_INVENTORY } from '../data/initialInventory';
import { INITIAL_INSPECTIONS } from '../data/initialInspections';
import { INITIAL_KANBAN } from '../data/initialKanban';
import { INITIAL_KONSAR } from '../data/initialKonSar';
import { INITIAL_TERMMEROD } from '../data/initialTermMerod';
import { INITIAL_BEEPULO } from '../data/initialBeepulo';
import { INITIAL_FEJSARU } from '../data/initialFejSaru';
import { INITIAL_SARU_SPECS } from '../data/initialSaruSpecs';
import { INITIAL_ORDERS } from '../data/initialOrders';
import { INITIAL_NOTES } from '../data/initialNotes';
import {
  getBaseProductId,
  getNewProductId,
  getUsedProductId,
  isUsedProductId,
  getProductConditionInfo,
  calculateProductStockBreakdown,
  createProductStockMap,
  getProductStockFromMap,
  getUnifiedProductPositions,
  unifyProductList,
  ProductStockBreakdown,
  UnifiedProductPosition,
} from '../utils/productUtils';
import {
  DEFAULT_GOOGLE_SHEET_URL,
  fetchProductsFromGoogleSheet,
  fetchPositionsFromGoogleSheet,
  fetchInventoryFromGoogleSheet,
  fetchInspectionsFromGoogleSheet,
  fetchKanbanFromGoogleSheet,
  fetchKonSarFromGoogleSheet,
  fetchTermMerodFromGoogleSheet,
  fetchBeepuloFromGoogleSheet,
  fetchFejSaruFromGoogleSheet,
  fetchSaruSpecsFromGoogleSheet,
  fetchOrdersFromGoogleSheet,
  fetchNotesFromGoogleSheet,
  parseProductsCsv,
  parsePositionsCsv,
  parseInventoryCsv,
  parseInspectionsCsv,
  parseKanbanCsv,
  parseKonSarCsv,
  parseTermMerodCsv,
  parseBeepuloCsv,
  parseFejSaruCsv,
  parseSaruSpecsCsv,
  parseOrdersCsv,
  parseNotesCsv,
  exportProductsToCsv,
  exportPositionsToCsv,
  exportInventoryToCsv,
  exportInspectionsToCsv,
  exportKanbanToCsv,
  exportKonSarToCsv,
  exportTermMerodToCsv,
  exportBeepuloToCsv,
  exportFejSaruToCsv,
  exportSaruSpecsToCsv,
  exportOrdersToCsv,
  exportNotesToCsv,
} from '../services/sheetsService';
import {
  resolveNoteUrl,
  NOTE_HYPERLINKS_MAP,
  NOTE_HYPERLINKS_BY_TERMEK_ID,
  getNotePageCount,
} from '../data/noteHyperlinksMap';
import {
  FIRESTORE_COLLECTIONS,
  FullDataset,
  saveItemToFirestore,
  deleteItemFromFirestore,
  subscribeToCollection,
  bulkSaveToFirestore,
  uploadAllToFirestore,
  downloadAllFromFirestore,
  clearFirestoreCollection,
  isFirestoreQuotaExhausted,
  setFirestoreQuotaExhausted,
  markQuotaExhausted,
  resetQuotaExhausted,
  getQuotaUpgradeUrl,
  isQuotaError,
} from '../services/firebaseService';

export interface PositionProductItem {
  product: Product;
  quantity: number;
  newQuantity: number;
  usedQuantity: number;
  condition: 'new' | 'used' | 'both';
  isUsed: boolean;
  conditionLabel: string;
  specificId: string;
  baseId: string;
}

interface ProductContextType {
  products: Product[];
  rawProducts: Product[];
  filteredProducts: Product[];
  selectedProduct: Product | null;
  selectedProductId: string | null;
  activeTab: ActiveTab;
  viewMode: ViewMode;
  filters: FilterState;
  isSyncing: boolean;
  syncError: string | null;
  lastSyncedAt: string | null;
  sheetUrl: string;
  totalCount: number;
  categories: string[];
  categoryCounts: Record<string, number>;
  manufacturers: string[];
  partTypes: string[];
  insulationTypes: string[];
  locations: string[];

  // Positions and Inventory state
  positions: WarehousePosition[];
  inventory: InventoryRecord[];
  transactions: InventoryRecord[];
  selectedPositionId: string | null;

  // Inspections (Karbantartás) state
  inspections: Inspection[];
  selectedInspectionId: string | null;

  // Kanban tábla (4 oszlop: Terv, Folyamatban, Teszt, Befejezve) state
  kanban: KanbanItem[];
  selectedKanbanId: string | null;
  setSelectedKanbanId: (id: string | null) => void;

  // KonSar (Konnektor - Saru kapcsolatok) state
  konSar: KonSarRelation[];
  selectedKonSarId: string | null;
  setSelectedKonSarId: (id: string | null) => void;

  // TermMerod (Termék - Mérődoboz kapcsolatok) state
  termMerod: TermMerodRelation[];
  selectedTermMerodId: string | null;
  setSelectedTermMerodId: (id: string | null) => void;

  // Beépülő Alkatrész state
  beepulo: BeepuloRelation[];
  selectedBeepuloId: string | null;
  setSelectedBeepuloId: (id: string | null) => void;

  // FejSaru (Saruzófej - Saru kapcsolatok) state
  fejSaru: FejSaruRelation[];
  selectedFejSaruId: string | null;
  setSelectedFejSaruId: (id: string | null) => void;

  // Rendelés (Megrendelések) state
  orders: Order[];
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;

  // Note (Termék Jegyzetek) state
  notes: ProductNote[];
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  getNotesForProduct: (productId: string) => ProductNote[];
  getNextNoteId: () => string;

  // Saru Segédtáblázat (Saru Keresztmetszet Mátrix 0.25..6.00 mm²) state
  saruSpecs: SaruSpec[];
  selectedSaruSpecId: string | null;
  setSelectedSaruSpecId: (id: string | null) => void;
  getSaruSpecForProduct: (productOrId: Product | string) => SaruSpec | undefined;
  getAllSaruSpecsForProduct: (productOrId: Product | string) => SaruSpec[];

  // Stock and Position calculation helpers
  getProductTotalStock: (productId: string) => number;
  getProductNewStock: (productId: string) => number;
  getProductUsedStock: (productId: string) => number;
  getProductStockBreakdown: (productId: string) => ProductStockBreakdown;
  getProductPositions: (productId: string) => ProductStockPosition[];
  getUnifiedPositions: (productId: string) => UnifiedProductPosition[];
  getPositionProducts: (positionId: string) => PositionProductItem[];
  getPositionTotalItems: (positionId: string) => number;
  getNextTransactionId: () => string;

  // Inspection calculation helpers
  getProductInspections: (productId: string) => Inspection[];
  getProductAsReplacedItemInspections: (productId: string) => Inspection[];
  getNextInspectionId: () => string;

  // KonSar calculation helpers
  getConnectedKonSar: (productId: string) => {
    relation: KonSarRelation;
    partnerId: string;
    partnerProduct?: Product;
    partnerType: 'Konnektor' | 'Saru' | 'Egyéb';
    partnerCategory?: string;
  }[];
  getNextKonSarId: () => string;

  // TermMerod calculation helpers
  getConnectedTermMerod: (productId: string) => {
    relation: TermMerodRelation;
    partnerId: string;
    partnerProduct?: Product;
    role: 'Termék' | 'Mérődoboz' | 'Egyéb';
    partnerCategory?: string;
  }[];
  getNextTermMerodId: () => string;

  // Beépülő Alkatrész calculation helpers
  getConnectedBeepulo: (productId: string) => {
    relation: BeepuloRelation;
    partnerId: string;
    partnerProduct?: Product;
    role: 'Beépülő alkatrész' | 'Főtermék amibe beépül';
    quantity: number;
    note?: string;
    partnerCategory?: string;
  }[];
  getNextBeepuloId: () => string;

  // FejSaru calculation helpers
  getConnectedFejSaru: (productId: string) => {
    relation: FejSaruRelation;
    partnerId: string;
    partnerProduct?: Product;
    role: 'Saruzófej' | 'Saru' | 'Egyéb';
    note?: string;
    partnerCategory?: string;
  }[];
  getNextFejSaruId: () => string;

  // Rendelés calculation & relation helpers
  getNextOrderId: () => string;
  getProductOrders: (productId: string) => Order[];
  getRelatedProductOrders: (productId: string) => {
    order: Order;
    relatedProductId: string;
    relationType: string;
    relatedProduct?: Product;
  }[];
  getProductOrderSummary: (productId: string) => {
    isDirectlyOrdered: boolean;
    hasRelatedOrder: boolean;
    directOrders: Order[];
    relatedOrders: {
      order: Order;
      relatedProductId: string;
      relationType: string;
      relatedProduct?: Product;
    }[];
    totalActiveOrdersCount: number;
  };
  getAllRelatedProductIds: (productId: string) => {
    id: string;
    relationType: string;
    product?: Product;
  }[];

  // Actions
  setActiveTab: (tab: ActiveTab) => void;
  setViewMode: (mode: ViewMode) => void;
  selectProductById: (id: string) => void;
  clearSelectedProduct: () => void;
  setSelectedPositionId: (id: string | null) => void;
  selectPositionById: (positionIdOrName: string) => void;
  clearSelectedPosition: () => void;
  setSelectedInspectionId: (id: string | null) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  toggleFilterItem: (
    key: 'categories' | 'manufacturers' | 'partTypes' | 'insulationTypes' | 'locations',
    value: string
  ) => void;
  setFilterItems: (
    key: 'categories' | 'manufacturers' | 'partTypes' | 'insulationTypes' | 'locations',
    values: string[]
  ) => void;
  clearFilterKey: (key: string) => void;
  filterByValue: (
    key: 'category' | 'manufacturer' | 'partType' | 'insulationType' | 'location',
    value: string
  ) => void;
  resetFilters: () => void;

  // Sync & Export
  syncWithGoogleSheet: (customUrl?: string) => Promise<void>;
  importCsvText: (csvText: string) => number;
  importPositionsCsvText: (csvText: string) => number;
  importInventoryCsvText: (csvText: string) => number;
  importInspectionsCsvText: (csvText: string) => number;
  importKanbanCsvText: (csvText: string) => number;
  importKonSarCsvText: (csvText: string) => number;
  importTermMerodCsvText: (csvText: string) => number;
  importBeepuloCsvText: (csvText: string) => number;
  importFejSaruCsvText: (csvText: string) => number;
  importSaruSpecsCsvText: (csvText: string) => number;
  exportCsv: () => string;
  exportPositionsCsv: () => string;
  exportInventoryCsv: () => string;
  exportInspectionsCsv: () => string;
  exportKanbanCsv: () => string;
  exportKonSarCsv: () => string;
  exportTermMerodCsv: () => string;
  exportBeepuloCsv: () => string;
  exportFejSaruCsv: () => string;
  exportSaruSpecsCsv: () => string;
  importOrdersCsvText: (csvText: string) => number;
  exportOrdersCsv: () => string;
  importNotesCsvText: (csvText: string) => number;
  exportNotesCsv: () => string;

  // Firebase Firestore State & Actions
  isFirebaseConnected: boolean;
  isFirebaseLoading: boolean;
  firebaseError: string | null;
  firebaseSyncTime: string | null;
  firebaseStats: Record<string, number>;
  isQuotaExhausted: boolean;
  retryQuotaConnection: () => Promise<void>;
  upgradeConsoleUrl: string;
  migrateToFirebase: () => Promise<{ success: boolean; stats: Record<string, number> }>;
  refreshFromFirebase: () => Promise<void>;
  exportFullBackupJson: () => string;
  importFullBackupJson: (jsonStr: string) => Promise<{ success: boolean; count: number }>;

  // Products CRUD
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setSheetUrl: (url: string) => void;

  // Positions CRUD
  addPosition: (position: WarehousePosition) => void;
  updatePosition: (id: string, position: Partial<WarehousePosition>) => void;
  deletePosition: (id: string) => void;

  // Inventory Transactions CRUD & Stock movements
  addInventoryRecord: (record: InventoryRecord) => void;
  updateInventoryRecord: (id: string, record: Partial<InventoryRecord>) => void;
  deleteInventoryRecord: (id: string) => void;
  adjustStock: (
    productId: string,
    positionId: string,
    deltaQuantity: number,
    note?: string,
    customDate?: string,
    customTrxId?: string,
    condition?: 'new' | 'used'
  ) => void;
  recordTransaction: (params: {
    id?: string;
    productId: string;
    positionId: string;
    quantity: number;
    date?: string;
    note?: string;
    condition?: 'new' | 'used';
  }) => InventoryRecord;

  // Inspections CRUD
  addInspection: (inspection: Inspection) => void;
  updateInspection: (id: string, inspection: Partial<Inspection>) => void;
  deleteInspection: (id: string) => void;

  // Kanban CRUD & Helpers
  addKanbanItem: (item: KanbanItem) => void;
  updateKanbanItem: (id: string, item: Partial<KanbanItem>) => void;
  deleteKanbanItem: (id: string) => void;
  moveKanbanItem: (id: string, newStatus: KanbanStatus | string) => void;
  clearKanban: () => void;
  getNextKanbanId: () => string;

  // KonSar CRUD
  addKonSarRelation: (relation: KonSarRelation) => void;
  deleteKonSarRelation: (id: string) => void;

  // TermMerod CRUD
  addTermMerodRelation: (relation: TermMerodRelation) => void;
  deleteTermMerodRelation: (id: string) => void;

  // Beépülő Alkatrész CRUD
  addBeepuloRelation: (relation: BeepuloRelation) => void;
  deleteBeepuloRelation: (id: string) => void;

  // FejSaru CRUD
  addFejSaruRelation: (relation: FejSaruRelation) => void;
  deleteFejSaruRelation: (id: string) => void;

  // Rendelés CRUD
  addOrder: (order: Order) => Promise<void>;
  updateOrder: (id: string, updatedFields: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  // Note CRUD
  addNote: (note: Omit<ProductNote, 'id'> | ProductNote) => Promise<ProductNote>;
  updateNote: (id: string, updatedFields: Partial<ProductNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'kinetic_products_cache';
const POSITIONS_STORAGE_KEY = 'kinetic_positions_cache';
const INVENTORY_STORAGE_KEY = 'kinetic_inventory_cache';
const INSPECTIONS_STORAGE_KEY = 'kinetic_inspections_cache';
const KANBAN_STORAGE_KEY = 'kinetic_kanban_cache_v2';
const KONSAR_STORAGE_KEY = 'kinetic_konsar_cache';
const TERMMEROD_STORAGE_KEY = 'kinetic_termmerod_cache';
const BEEPULO_STORAGE_KEY = 'kinetic_beepulo_cache';
const FEJSARU_STORAGE_KEY = 'kinetic_fejsaru_cache';
const SARU_SPECS_STORAGE_KEY = 'kinetic_saruspecs_cache_v8';
const ORDERS_STORAGE_KEY = 'kinetic_orders_cache_v1';
const NOTES_STORAGE_KEY = 'kinetic_notes_cache_v2';
const SYNC_TIME_KEY = 'kinetic_last_sync_time';
const SHEET_URL_KEY = 'kinetic_sheet_url';

const initialFilters: FilterState = {
  searchQuery: '',
  category: '',
  categories: [],
  manufacturer: '',
  manufacturers: [],
  partType: '',
  partTypes: [],
  insulationType: '',
  insulationTypes: [],
  insulationGripperType: '',
  quality: '',
  location: '',
  locations: [],
  hasImageOnly: false,
  sortBy: 'id',
  sortOrder: 'asc',
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Raw Products state
  const [rawProducts, setRawProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_PRODUCTS;
  });

  const setProducts = (newProds: Product[] | ((prev: Product[]) => Product[])) => {
    setRawProducts(newProds);
  };

  // Positions state
  const [positions, setPositions] = useState<WarehousePosition[]>(() => {
    try {
      const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_POSITIONS;
  });

  // Inventory records state
  const [inventory, setInventory] = useState<InventoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(INVENTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_INVENTORY;
  });

  // Inspections state (Karbantartás)
  const [inspections, setInspections] = useState<Inspection[]>(() => {
    try {
      const saved = localStorage.getItem(INSPECTIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_INSPECTIONS;
  });

  // Kanban state (4 oszlop: Terv, Folyamatban, Teszt, Befejezve)
  const [kanban, setKanban] = useState<KanbanItem[]>(() => {
    try {
      localStorage.removeItem('kinetic_kanban_cache');
      const saved = localStorage.getItem(KANBAN_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_KANBAN;
  });

  // KonSar state (Konnektor - Saru kapcsolatok)
  const [konSar, setKonSar] = useState<KonSarRelation[]>(() => {
    try {
      const saved = localStorage.getItem(KONSAR_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_KONSAR;
  });

  // TermMerod state (Termék - Mérődoboz kapcsolatok)
  const [termMerod, setTermMerod] = useState<TermMerodRelation[]>(() => {
    try {
      const saved = localStorage.getItem(TERMMEROD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_TERMMEROD;
  });

  // Beépülő Alkatrész state
  const [beepulo, setBeepulo] = useState<BeepuloRelation[]>(() => {
    try {
      const saved = localStorage.getItem(BEEPULO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_BEEPULO;
  });

  // FejSaru state
  const [fejSaru, setFejSaru] = useState<FejSaruRelation[]>(() => {
    try {
      const saved = localStorage.getItem(FEJSARU_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_FEJSARU;
  });

  // Saru Segédtáblázat (Saru Specs) state
  const [saruSpecs, setSaruSpecs] = useState<SaruSpec[]>(() => {
    try {
      const saved = localStorage.getItem(SARU_SPECS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 400) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_SARU_SPECS;
  });

  // Rendelés (Orders) state
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If cached orders only have the previous 6 dummy items, upgrade to the real 28 orders
          const isOldMock = parsed.some((o: Order) => o.id?.startsWith('REND-2024-00')) || parsed.length <= 6;
          if (isOldMock && INITIAL_ORDERS.length >= 20) {
            return INITIAL_ORDERS;
          }
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_ORDERS;
  });

  // Helper to repair/resolve note URLs if they are placeholders like 'PDF' or empty, and ensure accurate pageCount
  const sanitizeNotes = (items: ProductNote[]): ProductNote[] => {
    return items.map((n) => {
      const canonicalMapUrl = n.id
        ? NOTE_HYPERLINKS_MAP[n.id] || NOTE_HYPERLINKS_MAP[n.id.toLowerCase()]
        : undefined;
      const termekMapUrl = n.termekId
        ? NOTE_HYPERLINKS_BY_TERMEK_ID[n.termekId] ||
          NOTE_HYPERLINKS_BY_TERMEK_ID[n.termekId.toLowerCase()] ||
          NOTE_HYPERLINKS_BY_TERMEK_ID[n.termekId.split('_')[0].split('-')[0].trim()]
        : undefined;
      const resolvedUrl = canonicalMapUrl || termekMapUrl || resolveNoteUrl(n.id, n.url, n.termekId);
      const effectiveUrl = resolvedUrl || n.url;
      const computedPageCount = getNotePageCount(n.id, effectiveUrl) || n.pageCount;
      return {
        ...n,
        url: effectiveUrl,
        pageCount: computedPageCount,
      };
    });
  };

  // Note (Termék Jegyzetek) state
  const [notes, setNotes] = useState<ProductNote[]>(() => {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeNotes(parsed);
        }
      }
    } catch {
      // ignore
    }
    return sanitizeNotes(INITIAL_NOTES);
  });

  // Unified canonical products list with Saru auto-inclusion
  const products = useMemo(() => {
    const unified = unifyProductList(rawProducts);
    const existingIds = new Set(unified.map((p) => p.id.toLowerCase()));

    // Auto-create product entries for Saruk referenced in saruSpecs
    const saruProducts: Product[] = [];
    saruSpecs.forEach((spec) => {
      const celKod = (spec.productId || '').trim();
      const factoryCode = (spec.factoryCode || '').trim();
      const id = celKod || factoryCode;
      if (!id) return;

      const idLower = id.toLowerCase();
      if (!existingIds.has(idLower)) {
        existingIds.add(idLower);
        saruProducts.push({
          id,
          name: celKod ? `Saru (${celKod})` : `Saru (${factoryCode})`,
          category: 'Saru',
          factoryCode: factoryCode || undefined,
          location: spec.saruLocation || undefined,
          description: spec.note || (spec.feederTool ? `Saruzófej: ${spec.feederTool}` : undefined),
        });
      }
    });

    return [...unified, ...saruProducts];
  }, [rawProducts, saruSpecs]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [selectedKanbanId, setSelectedKanbanId] = useState<string | null>(null);
  const [selectedKonSarId, setSelectedKonSarId] = useState<string | null>(null);
  const [selectedTermMerodId, setSelectedTermMerodId] = useState<string | null>(null);
  const [selectedBeepuloId, setSelectedBeepuloId] = useState<string | null>(null);
  const [selectedFejSaruId, setSelectedFejSaruId] = useState<string | null>(null);
  const [selectedSaruSpecId, setSelectedSaruSpecId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem(SYNC_TIME_KEY) || null;
  });
  const [sheetUrl, setSheetUrlState] = useState<string>(() => {
    return localStorage.getItem(SHEET_URL_KEY) || DEFAULT_GOOGLE_SHEET_URL;
  });

  // Firebase State
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [firebaseSyncTime, setFirebaseSyncTime] = useState<string | null>(null);
  const [firebaseStats, setFirebaseStats] = useState<Record<string, number>>({});
  const [isQuotaExhaustedState, setIsQuotaExhaustedState] = useState<boolean>(isFirestoreQuotaExhausted());

  const setSheetUrl = (url: string) => {
    setSheetUrlState(url);
    localStorage.setItem(SHEET_URL_KEY, url);
  };

  // Save to local storage whenever products, positions, inventory, inspections, konSar, termMerod, beepulo, or fejSaru change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rawProducts));
    } catch (e) {
      console.warn('LocalStorage save error (products):', e);
    }
  }, [rawProducts]);

  useEffect(() => {
    try {
      localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
    } catch (e) {
      console.warn('LocalStorage save error (positions):', e);
    }
  }, [positions]);

  useEffect(() => {
    try {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
    } catch (e) {
      console.warn('LocalStorage save error (inventory):', e);
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(inspections));
    } catch (e) {
      console.warn('LocalStorage save error (inspections):', e);
    }
  }, [inspections]);

  useEffect(() => {
    try {
      localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(kanban));
    } catch (e) {
      console.warn('LocalStorage save error (kanban):', e);
    }
  }, [kanban]);

  useEffect(() => {
    try {
      localStorage.setItem(KONSAR_STORAGE_KEY, JSON.stringify(konSar));
    } catch (e) {
      console.warn('LocalStorage save error (konSar):', e);
    }
  }, [konSar]);

  useEffect(() => {
    try {
      localStorage.setItem(TERMMEROD_STORAGE_KEY, JSON.stringify(termMerod));
    } catch (e) {
      console.warn('LocalStorage save error (termMerod):', e);
    }
  }, [termMerod]);

  useEffect(() => {
    try {
      localStorage.setItem(BEEPULO_STORAGE_KEY, JSON.stringify(beepulo));
    } catch (e) {
      console.warn('LocalStorage save error (beepulo):', e);
    }
  }, [beepulo]);

  useEffect(() => {
    try {
      localStorage.setItem(FEJSARU_STORAGE_KEY, JSON.stringify(fejSaru));
    } catch (e) {
      console.warn('LocalStorage save error (fejSaru):', e);
    }
  }, [fejSaru]);

  useEffect(() => {
    try {
      localStorage.setItem(SARU_SPECS_STORAGE_KEY, JSON.stringify(saruSpecs));
    } catch (e) {
      console.warn('LocalStorage save error (saruSpecs):', e);
    }
  }, [saruSpecs]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn('LocalStorage save error (orders):', e);
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn('LocalStorage save error (notes):', e);
    }
  }, [notes]);

  // Initial Firebase real-time listeners & database bootstrapping
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const initFirebase = async () => {
      setIsFirebaseLoading(true);
      setFirebaseError(null);

      // If quota is already exhausted, operate cleanly in local/offline mode without hitting Firestore
      if (isFirestoreQuotaExhausted()) {
        setIsQuotaExhaustedState(true);
        setIsFirebaseConnected(false);
        setFirebaseError(
          'A Firebase Firestore ingyenes napi írási kvótája betelt (Quota limit exceeded). A rendszer automatikusan a helyi gyorsítótárat (LocalStorage/Memória) használja, így minden adat és művelet zavartalanul elérhető. A kvóta a következő napon (UTC 00:00) automatikusan visszaáll.'
        );
        setIsFirebaseLoading(false);
        return;
      }

      try {
        // Check if data exists in Firestore
        const cloudData = await downloadAllFromFirestore();
        const hasCloudData = cloudData.products.length > 0;

        if (hasCloudData) {
          setRawProducts(cloudData.products);
          if (cloudData.positions.length > 0) setPositions(cloudData.positions);
          if (cloudData.inventory.length > 0) setInventory(cloudData.inventory);
          if (cloudData.inspections.length > 0) setInspections(cloudData.inspections);
          if (cloudData.kanban.length > 0) setKanban(cloudData.kanban);
          if (cloudData.konSar.length > 0) setKonSar(cloudData.konSar);
          if (cloudData.termMerod.length > 0) setTermMerod(cloudData.termMerod);
          if (cloudData.beepulo.length > 0) setBeepulo(cloudData.beepulo);
          if (cloudData.fejSaru.length > 0) setFejSaru(cloudData.fejSaru);
          if (cloudData.saruSpecs.length > 0) setSaruSpecs(cloudData.saruSpecs);
          if (cloudData.orders && cloudData.orders.length > 0) {
            const isOldMock = cloudData.orders.some((o) => o.id?.startsWith('REND-2024-00')) || cloudData.orders.length <= 6;
            if (isOldMock && INITIAL_ORDERS.length >= 20) {
              setOrders(INITIAL_ORDERS);
            } else {
              setOrders(cloudData.orders);
            }
          } else if (orders.length === 0) {
            setOrders(INITIAL_ORDERS);
          }
          if (cloudData.notes && cloudData.notes.length > 0) {
            setNotes(sanitizeNotes(cloudData.notes));
          } else if (notes.length === 0) {
            setNotes(sanitizeNotes(INITIAL_NOTES));
          }

          setIsFirebaseConnected(true);
          setFirebaseSyncTime(new Date().toLocaleTimeString('hu-HU'));
        } else {
          // If Firestore has no documents yet, do NOT auto-upload 10,000 documents to avoid exhausting daily quota
          setIsFirebaseConnected(true);
        }

        // Setup real-time subscriptions only if quota is not exhausted
        if (!isFirestoreQuotaExhausted()) {
          unsubs.push(
            subscribeToCollection<Product>(FIRESTORE_COLLECTIONS.PRODUCTS, (items) => {
              if (items.length > 0) setRawProducts(items);
              setIsFirebaseConnected(true);
            })
          );
          unsubs.push(
            subscribeToCollection<WarehousePosition>(FIRESTORE_COLLECTIONS.POSITIONS, (items) => {
              if (items.length > 0) setPositions(items);
            })
          );
          unsubs.push(
            subscribeToCollection<InventoryRecord>(FIRESTORE_COLLECTIONS.INVENTORY, (items) => {
              if (items.length > 0) setInventory(items);
            })
          );
          unsubs.push(
            subscribeToCollection<Inspection>(FIRESTORE_COLLECTIONS.INSPECTIONS, (items) => {
              if (items.length > 0) setInspections(items);
            })
          );
          unsubs.push(
            subscribeToCollection<KanbanItem>(FIRESTORE_COLLECTIONS.KANBAN, (items) => {
              if (items.length > 0) setKanban(items);
            })
          );
          unsubs.push(
            subscribeToCollection<KonSarRelation>(FIRESTORE_COLLECTIONS.KONSAR, (items) => {
              if (items.length > 0) setKonSar(items);
            })
          );
          unsubs.push(
            subscribeToCollection<TermMerodRelation>(FIRESTORE_COLLECTIONS.TERMMEROD, (items) => {
              if (items.length > 0) setTermMerod(items);
            })
          );
          unsubs.push(
            subscribeToCollection<BeepuloRelation>(FIRESTORE_COLLECTIONS.BEEPULO, (items) => {
              if (items.length > 0) setBeepulo(items);
            })
          );
          unsubs.push(
            subscribeToCollection<FejSaruRelation>(FIRESTORE_COLLECTIONS.FEJSARU, (items) => {
              if (items.length > 0) setFejSaru(items);
            })
          );
          unsubs.push(
            subscribeToCollection<SaruSpec>(FIRESTORE_COLLECTIONS.SARUSPECS, (items) => {
              if (items.length > 0) setSaruSpecs(items);
            })
          );
          unsubs.push(
            subscribeToCollection<Order>(FIRESTORE_COLLECTIONS.ORDERS, (items) => {
              if (items.length > 0) {
                const isOldMock = items.some((o) => o.id?.startsWith('REND-2024-00')) || items.length <= 6;
                if (!isOldMock) {
                  setOrders(items);
                }
              }
            })
          );
          unsubs.push(
            subscribeToCollection<ProductNote>(FIRESTORE_COLLECTIONS.NOTES, (items) => {
              if (items.length > 0) {
                setNotes(sanitizeNotes(items));
              }
            })
          );
        }

        // Background check: attempt fetching the latest 28 items directly from Google Sheet if needed
        fetchOrdersFromGoogleSheet(sheetUrl)
          .then((liveOrders) => {
            if (liveOrders.length >= 20) {
              setOrders(liveOrders);
              try {
                localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(liveOrders));
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {});

        fetchNotesFromGoogleSheet(sheetUrl)
          .then((liveNotes) => {
            if (liveNotes.length > 0) {
              const sanitized = sanitizeNotes(liveNotes);
              setNotes(sanitized);
              try {
                localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(sanitized));
              } catch {
                // ignore
              }
            }
          })
          .catch(() => {});
      } catch (err: unknown) {
        if (isQuotaError(err)) {
          markQuotaExhausted();
          setIsQuotaExhaustedState(true);
          setIsFirebaseConnected(false);
          console.warn('[Firebase] Napi ingyenes Firestore kvóta elérve.');
          setFirebaseError('A Firebase ingyenes napi kvótája (20 000 művelet) elérte a határt. Az alkalmazás zavartalanul működik a helyi memóriából és gyorsítótárból.');
        } else {
          console.warn('Firebase inicializálási értesítés:', err);
          setFirebaseError(err instanceof Error ? err.message : 'Firebase hiba');
        }
      } finally {
        setIsFirebaseLoading(false);
      }
    };

    initFirebase();

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const syncWithGoogleSheet = async (customUrl?: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const targetUrl = customUrl || sheetUrl;

      // 1. Fetch Products
      const fetchedProducts = await fetchProductsFromGoogleSheet(targetUrl);
      if (fetchedProducts.length > 0) {
        setRawProducts(fetchedProducts);
      }

      // 2. Fetch Positions
      const fetchedPositions = await fetchPositionsFromGoogleSheet(targetUrl);
      if (fetchedPositions.length > 0) {
        setPositions(fetchedPositions);
      }

      // 3. Fetch Inventory
      const fetchedInventory = await fetchInventoryFromGoogleSheet(targetUrl);
      if (fetchedInventory.length > 0) {
        setInventory(fetchedInventory);
      }

      // 4. Fetch Inspections (Karbantartás munkalap)
      const fetchedInspections = await fetchInspectionsFromGoogleSheet(targetUrl);
      if (fetchedInspections.length > 0) {
        setInspections(fetchedInspections);
      }

      // 5. Fetch Kanban (kanban munkalap: Terv, Folyamatban, Teszt, Befejezve)
      const fetchedKanban = await fetchKanbanFromGoogleSheet(targetUrl);
      if (fetchedKanban.length > 0) {
        setKanban(fetchedKanban);
      }

      // 6. Fetch KonSar (Konnektor - Saru kapcsolatok munkalap)
      const fetchedKonSar = await fetchKonSarFromGoogleSheet(targetUrl);
      if (fetchedKonSar.length > 0) {
        setKonSar(fetchedKonSar);
      }

      // 6. Fetch TermMerod (Termék - Mérődoboz kapcsolatok munkalap)
      const fetchedTermMerod = await fetchTermMerodFromGoogleSheet(targetUrl);
      if (fetchedTermMerod.length > 0) {
        setTermMerod(fetchedTermMerod);
      }

      // 7. Fetch Beépülő Alkatrész munkalap
      const fetchedBeepulo = await fetchBeepuloFromGoogleSheet(targetUrl);
      if (fetchedBeepulo.length > 0) {
        setBeepulo(fetchedBeepulo);
      }

      // 8. Fetch FejSaru (Saruzófej - Saru kapcsolatok munkalap)
      const fetchedFejSaru = await fetchFejSaruFromGoogleSheet(targetUrl);
      if (fetchedFejSaru.length > 0) {
        setFejSaru(fetchedFejSaru);
      }

      // 9. Fetch Saru Segédtáblázat ('Segédtáblázat 1. Saruk másolata' munkalap)
      const fetchedSaruSpecs = await fetchSaruSpecsFromGoogleSheet(targetUrl);
      if (fetchedSaruSpecs.length > 0) {
        setSaruSpecs(fetchedSaruSpecs);
      }

      // 10. Fetch Rendelés munkalap
      const fetchedOrders = await fetchOrdersFromGoogleSheet(targetUrl);
      if (fetchedOrders.length > 0) {
        setOrders(fetchedOrders);
      }

      // 11. Fetch Note munkalap
      const fetchedNotes = await fetchNotesFromGoogleSheet(targetUrl);
      if (fetchedNotes.length > 0) {
        setNotes(sanitizeNotes(fetchedNotes));
      }

      // Also persist fetched data into Firebase Firestore
      const dataset: FullDataset = {
        products: fetchedProducts.length > 0 ? fetchedProducts : rawProducts,
        positions: fetchedPositions.length > 0 ? fetchedPositions : positions,
        inventory: fetchedInventory.length > 0 ? fetchedInventory : inventory,
        inspections: fetchedInspections.length > 0 ? fetchedInspections : inspections,
        kanban: fetchedKanban.length > 0 ? fetchedKanban : kanban,
        konSar: fetchedKonSar.length > 0 ? fetchedKonSar : konSar,
        termMerod: fetchedTermMerod.length > 0 ? fetchedTermMerod : termMerod,
        beepulo: fetchedBeepulo.length > 0 ? fetchedBeepulo : beepulo,
        fejSaru: fetchedFejSaru.length > 0 ? fetchedFejSaru : fejSaru,
        saruSpecs: fetchedSaruSpecs.length > 0 ? fetchedSaruSpecs : saruSpecs,
        orders: fetchedOrders.length > 0 ? fetchedOrders : orders,
        notes: fetchedNotes.length > 0 ? fetchedNotes : notes,
      };
      if (!isFirestoreQuotaExhausted()) {
        uploadAllToFirestore(dataset)
          .then((res) => {
            if (res.quotaExceeded) {
              markQuotaExhausted();
              setIsQuotaExhaustedState(true);
              setFirebaseError('A Firebase ingyenes napi írási kvótája betelt. A helyi gyorsítótár frissült.');
            } else {
              setFirebaseStats(res.stats);
              setIsFirebaseConnected(true);
            }
          })
          .catch(console.error);
      }

      const now = new Date().toLocaleTimeString('hu-HU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const dateStr = `${new Date().toLocaleDateString('hu-HU')} ${now}`;
      setLastSyncedAt(dateStr);
      localStorage.setItem(SYNC_TIME_KEY, dateStr);
    } catch (err: unknown) {
      console.error('Google Sheet sync error:', err);
      const message = err instanceof Error ? err.message : 'Sikertelen szinkronizáció';
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const migrateToFirebase = async (): Promise<{ success: boolean; stats: Record<string, number> }> => {
    setIsSyncing(true);
    setFirebaseError(null);
    if (isFirestoreQuotaExhausted()) {
      setIsQuotaExhaustedState(true);
      setIsSyncing(false);
      const errMsg = 'A Firebase ingyenes napi írási kvótája betelt. A mentés Firestore-ba nem lehetséges, a helyi adatok megmaradnak.';
      setFirebaseError(errMsg);
      throw new Error(errMsg);
    }
    try {
      const dataset: FullDataset = {
        products: rawProducts,
        positions,
        inventory,
        inspections,
        kanban,
        konSar,
        termMerod,
        beepulo,
        fejSaru,
        saruSpecs,
        orders,
        notes,
      };
      const res = await uploadAllToFirestore(dataset);
      if (res.quotaExceeded) {
        markQuotaExhausted();
        setIsQuotaExhaustedState(true);
        setFirebaseError('A feltöltés során a Firebase napi kvótája betelt. A helyi adatok megmaradnak.');
      } else {
        setFirebaseStats(res.stats);
        setIsFirebaseConnected(true);
      }
      const nowStr = `${new Date().toLocaleDateString('hu-HU')} ${new Date().toLocaleTimeString('hu-HU')}`;
      setFirebaseSyncTime(nowStr);
      return res;
    } catch (err: unknown) {
      console.error('Firebase migration error:', err);
      const message = err instanceof Error ? err.message : 'Sikertelen feltöltés Firebase-be';
      setFirebaseError(message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const retryQuotaConnection = async (): Promise<void> => {
    resetQuotaExhausted();
    setIsQuotaExhaustedState(false);
    setFirebaseError(null);
    try {
      await refreshFromFirebase();
      setIsFirebaseConnected(true);
    } catch {
      setIsQuotaExhaustedState(isFirestoreQuotaExhausted());
    }
  };

  const refreshFromFirebase = async (): Promise<void> => {
    setIsFirebaseLoading(true);
    setFirebaseError(null);
    try {
      const data = await downloadAllFromFirestore();
      if (data.products.length > 0) setRawProducts(data.products);
      if (data.positions.length > 0) setPositions(data.positions);
      if (data.inventory.length > 0) setInventory(data.inventory);
      if (data.inspections.length > 0) setInspections(data.inspections);
      if (data.kanban.length > 0) setKanban(data.kanban);
      if (data.konSar.length > 0) setKonSar(data.konSar);
      if (data.termMerod.length > 0) setTermMerod(data.termMerod);
      if (data.beepulo.length > 0) setBeepulo(data.beepulo);
      if (data.fejSaru.length > 0) setFejSaru(data.fejSaru);
      if (data.saruSpecs.length > 0) setSaruSpecs(data.saruSpecs);
      if (data.orders && data.orders.length > 0) setOrders(data.orders);
      if (data.notes && data.notes.length > 0) setNotes(sanitizeNotes(data.notes));

      setIsFirebaseConnected(true);
      setFirebaseSyncTime(new Date().toLocaleTimeString('hu-HU'));
    } catch (err: unknown) {
      console.error('Firebase refresh error:', err);
      setFirebaseError(err instanceof Error ? err.message : 'Sikertelen letöltés Firebase-ből');
      throw err;
    } finally {
      setIsFirebaseLoading(false);
    }
  };

  const exportFullBackupJson = (): string => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      database: 'Firestore',
      data: {
        products: rawProducts,
        positions,
        inventory,
        inspections,
        kanban,
        konSar,
        termMerod,
        beepulo,
        fejSaru,
        saruSpecs,
        orders,
        notes,
      },
    };
    return JSON.stringify(backup, null, 2);
  };

  const importFullBackupJson = async (jsonStr: string): Promise<{ success: boolean; count: number }> => {
    if (isFirestoreQuotaExhausted()) {
      setIsQuotaExhaustedState(true);
      throw new Error('A Firebase Firestore ingyenes napi kvótája betelt. A biztonsági mentés felhőbe töltése jelenleg nem lehetséges.');
    }
    try {
      const parsed = JSON.parse(jsonStr);
      const data = (parsed.data || parsed) as Partial<FullDataset>;
      if (!data || (!data.products && !data.positions)) {
        throw new Error('Érvénytelen biztonsági mentés fájl.');
      }
      const dataset: FullDataset = {
        products: data.products || [],
        positions: data.positions || [],
        inventory: data.inventory || [],
        inspections: data.inspections || [],
        kanban: data.kanban || [],
        konSar: data.konSar || [],
        termMerod: data.termMerod || [],
        beepulo: data.beepulo || [],
        fejSaru: data.fejSaru || [],
        saruSpecs: data.saruSpecs || [],
        orders: data.orders || [],
        notes: data.notes || [],
      };
      const res = await uploadAllToFirestore(dataset);
      await refreshFromFirebase();
      const total = Object.values(res.stats).reduce((a, b) => a + b, 0);
      return { success: true, count: total };
    } catch (err: unknown) {
      console.error('Import backup JSON error:', err);
      throw err;
    }
  };

  const importCsvText = (csvText: string): number => {
    const imported = parseProductsCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, Product>();
      rawProducts.forEach((p) => map.set(p.id, p));
      imported.forEach((p) => map.set(p.id, p));
      const updated = Array.from(map.values());
      setRawProducts(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, updated).catch(console.error);
      const now = `${new Date().toLocaleDateString('hu-HU')} ${new Date().toLocaleTimeString('hu-HU')}`;
      setLastSyncedAt(now);
      localStorage.setItem(SYNC_TIME_KEY, now);
      return imported.length;
    }
    return 0;
  };

  const importPositionsCsvText = (csvText: string): number => {
    const imported = parsePositionsCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, WarehousePosition>();
      positions.forEach((p) => map.set(p.id, p));
      imported.forEach((p) => map.set(p.id, p));
      const updated = Array.from(map.values());
      setPositions(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.POSITIONS, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const importInventoryCsvText = (csvText: string): number => {
    const imported = parseInventoryCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, InventoryRecord>();
      inventory.forEach((i) => map.set(i.id, i));
      imported.forEach((i) => map.set(i.id, i));
      const updated = Array.from(map.values());
      setInventory(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.INVENTORY, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const importInspectionsCsvText = (csvText: string): number => {
    const imported = parseInspectionsCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, Inspection>();
      inspections.forEach((i) => map.set(i.id, i));
      imported.forEach((i) => map.set(i.id, i));
      const updated = Array.from(map.values());
      setInspections(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.INSPECTIONS, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const importKanbanCsvText = (csvText: string): number => {
    const imported = parseKanbanCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, KanbanItem>();
      kanban.forEach((k) => map.set(k.id, k));
      imported.forEach((k) => map.set(k.id, k));
      const updated = Array.from(map.values());
      setKanban(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.KANBAN, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportCsv = (): string => {
    return exportProductsToCsv(products);
  };

  const exportPositionsCsv = (): string => {
    return exportPositionsToCsv(positions);
  };

  const exportInventoryCsv = (): string => {
    return exportInventoryToCsv(inventory);
  };

  const exportInspectionsCsv = (): string => {
    return exportInspectionsToCsv(inspections);
  };

  const exportKanbanCsv = (): string => {
    return exportKanbanToCsv(kanban);
  };

  const importKonSarCsvText = (csvText: string): number => {
    const imported = parseKonSarCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, KonSarRelation>();
      konSar.forEach((k) => map.set(k.id, k));
      imported.forEach((k) => map.set(k.id, k));
      const updated = Array.from(map.values());
      setKonSar(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.KONSAR, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportKonSarCsv = (): string => {
    return exportKonSarToCsv(konSar);
  };

  const importTermMerodCsvText = (csvText: string): number => {
    const imported = parseTermMerodCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, TermMerodRelation>();
      termMerod.forEach((k) => map.set(k.id, k));
      imported.forEach((k) => map.set(k.id, k));
      const updated = Array.from(map.values());
      setTermMerod(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.TERMMEROD, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportTermMerodCsv = (): string => {
    return exportTermMerodToCsv(termMerod);
  };

  const importBeepuloCsvText = (csvText: string): number => {
    const imported = parseBeepuloCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, BeepuloRelation>();
      beepulo.forEach((k) => map.set(k.id, k));
      imported.forEach((k) => map.set(k.id, k));
      const updated = Array.from(map.values());
      setBeepulo(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.BEEPULO, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportBeepuloCsv = (): string => {
    return exportBeepuloToCsv(beepulo);
  };

  const importFejSaruCsvText = (csvText: string): number => {
    const imported = parseFejSaruCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, FejSaruRelation>();
      fejSaru.forEach((k) => map.set(k.id, k));
      imported.forEach((k) => map.set(k.id, k));
      const updated = Array.from(map.values());
      setFejSaru(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.FEJSARU, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportFejSaruCsv = (): string => {
    return exportFejSaruToCsv(fejSaru);
  };

  const importSaruSpecsCsvText = (csvText: string): number => {
    const imported = parseSaruSpecsCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, SaruSpec>();
      saruSpecs.forEach((s) => map.set(s.id, s));
      imported.forEach((s) => map.set(s.id, s));
      const updated = Array.from(map.values());
      setSaruSpecs(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.SARUSPECS, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportSaruSpecsCsv = (): string => {
    return exportSaruSpecsToCsv(saruSpecs);
  };

  const importOrdersCsvText = (csvText: string): number => {
    const imported = parseOrdersCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, Order>();
      orders.forEach((o) => map.set(o.id, o));
      imported.forEach((o) => map.set(o.id, o));
      const updated = Array.from(map.values());
      setOrders(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.ORDERS, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportOrdersCsv = (): string => {
    return exportOrdersToCsv(orders);
  };

  const importNotesCsvText = (csvText: string): number => {
    const imported = parseNotesCsv(csvText);
    if (imported.length > 0) {
      const map = new Map<string, ProductNote>();
      notes.forEach((n) => map.set(n.id, n));
      imported.forEach((n) => map.set(n.id, n));
      const updated = Array.from(map.values());
      setNotes(updated);
      bulkSaveToFirestore(FIRESTORE_COLLECTIONS.NOTES, updated).catch(console.error);
      return imported.length;
    }
    return 0;
  };

  const exportNotesCsv = (): string => {
    return exportNotesToCsv(notes);
  };

  const getAllSaruSpecsForProduct = (productOrId: Product | string): SaruSpec[] => {
    // If a product object is provided and it is explicitly a non-saru product (e.g. Saruzófej, Konnektor, Mérődoboz), do not show saru specs
    if (typeof productOrId === 'object' && productOrId !== null) {
      const cat = (productOrId.category || '').toLowerCase();
      const name = (productOrId.name || '').toLowerCase();
      if (
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
        cat.includes('egyéb gép') ||
        cat.includes('egyeb gep') ||
        cat.includes('fogó') ||
        cat.includes('fogo')
      ) {
        return [];
      }
      if (
        name.startsWith('saruzófej') ||
        name.startsWith('saruzofej') ||
        name.startsWith('saruzógép') ||
        name.startsWith('saruzogep') ||
        name.startsWith('konnektor')
      ) {
        return [];
      }
    }

    const prodId = typeof productOrId === 'string' ? productOrId.trim() : productOrId.id?.trim() || '';
    const baseId = getBaseProductId(prodId);
    const prodIdLower = prodId.toLowerCase();
    const baseIdLower = baseId.toLowerCase();
    const factoryCode = typeof productOrId === 'object' ? productOrId.factoryCode?.trim() : undefined;
    const factoryCodeLower = factoryCode ? factoryCode.toLowerCase() : undefined;
    const prodName = typeof productOrId === 'object' ? productOrId.name?.trim() : undefined;
    const prodNameLower = prodName ? prodName.toLowerCase() : undefined;

    // Normalize helper removing special punctuation (hyphens, dots, slashes, spaces)
    const norm = (str?: string) => (str ? str.toLowerCase().replace(/[\s\-_.\/°]/g, '') : '');
    const normProdId = norm(prodId);
    const normBaseId = norm(baseId);
    const normFactoryCode = norm(factoryCode);
    const normProdName = norm(prodName);

    const matched: SaruSpec[] = [];
    const seenIds = new Set<string>();

    saruSpecs.forEach((s) => {
      let isMatch = false;
      const sProdId = (s.productId || '').trim();
      const sProdIdLower = sProdId.toLowerCase();
      const normSProdId = norm(sProdId);

      const sFactoryCode = (s.factoryCode || '').trim();
      const sFactoryCodeLower = sFactoryCode.toLowerCase();
      const normSFactoryCode = norm(sFactoryCode);

      // 1. Check Product ID / CEL Code match (Saru ID)
      if (sProdIdLower) {
        if (
          sProdIdLower === prodIdLower ||
          sProdIdLower === baseIdLower ||
          prodIdLower.includes(sProdIdLower) ||
          sProdIdLower.includes(prodIdLower) ||
          (normSProdId && normProdId && (normSProdId === normProdId || normSProdId === normBaseId)) ||
          (normSProdId && normFactoryCode && normSProdId === normFactoryCode) ||
          (normSProdId && normProdName && normProdName.includes(normSProdId))
        ) {
          isMatch = true;
        }
      }

      // 2. Check Factory Code match (Saru Gyári Kód)
      if (!isMatch && sFactoryCodeLower) {
        if (
          (factoryCodeLower && (sFactoryCodeLower === factoryCodeLower || factoryCodeLower.includes(sFactoryCodeLower) || sFactoryCodeLower.includes(factoryCodeLower))) ||
          sFactoryCodeLower === prodIdLower ||
          sFactoryCodeLower === baseIdLower ||
          prodIdLower.includes(sFactoryCodeLower) ||
          (prodNameLower && (prodNameLower.includes(sFactoryCodeLower) || sFactoryCodeLower.includes(prodNameLower))) ||
          (normSFactoryCode && normFactoryCode && (normSFactoryCode === normFactoryCode || normFactoryCode.includes(normSFactoryCode) || normSFactoryCode.includes(normFactoryCode))) ||
          (normSFactoryCode && normProdId && (normSFactoryCode === normProdId || normSFactoryCode === normBaseId || normProdId.includes(normSFactoryCode))) ||
          (normSFactoryCode && normProdName && (normProdName.includes(normSFactoryCode) || normSFactoryCode.includes(normProdName)))
        ) {
          isMatch = true;
        }
      }

      if (isMatch && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        matched.push(s);
      }
    });

    return matched;
  };

  const getSaruSpecForProduct = (productOrId: Product | string): SaruSpec | undefined => {
    const all = getAllSaruSpecsForProduct(productOrId);
    return all[0];
  };

  const selectProductById = (id: string) => {
    const baseId = getBaseProductId(id);
    setSelectedProductId(baseId);
    setActiveTab('detail');
  };

  const clearSelectedProduct = () => {
    setSelectedProductId(null);
  };

  const selectPositionById = (idOrName: string) => {
    if (!idOrName) return;
    const clean = idOrName.trim();
    const matched = positions.find(
      (pos) =>
        pos.id.toLowerCase() === clean.toLowerCase() ||
        pos.name.toLowerCase() === clean.toLowerCase() ||
        pos.name.toLowerCase().includes(clean.toLowerCase())
    );
    if (matched) {
      setSelectedPositionId(matched.id);
    } else {
      setSelectedPositionId(clean);
    }
    setActiveTab('positions');
  };

  const clearSelectedPosition = () => {
    setSelectedPositionId(null);
  };

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFilterItem = (
    key: 'categories' | 'manufacturers' | 'partTypes' | 'insulationTypes' | 'locations',
    value: string
  ) => {
    setFilters((prev) => {
      const currentList = prev[key] || [];
      const exists = currentList.includes(value);
      const updatedList = exists
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];
      
      const next = {
        ...prev,
        [key]: updatedList,
      };

      if (key === 'categories') next.category = updatedList.length === 1 ? updatedList[0] : '';
      if (key === 'manufacturers') next.manufacturer = updatedList.length === 1 ? updatedList[0] : '';
      if (key === 'partTypes') next.partType = updatedList.length === 1 ? updatedList[0] : '';
      if (key === 'insulationTypes') next.insulationType = updatedList.length === 1 ? updatedList[0] : '';
      if (key === 'locations') next.location = updatedList.length === 1 ? updatedList[0] : '';

      return next;
    });
  };

  const setFilterItems = (
    key: 'categories' | 'manufacturers' | 'partTypes' | 'insulationTypes' | 'locations',
    values: string[]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: values,
    }));
  };

  const clearFilterKey = (key: string) => {
    setFilters((prev) => {
      const updated = { ...prev };
      if (key === 'categories' || key === 'category') {
        updated.categories = [];
        updated.category = '';
      } else if (key === 'manufacturers' || key === 'manufacturer') {
        updated.manufacturers = [];
        updated.manufacturer = '';
      } else if (key === 'partTypes' || key === 'partType') {
        updated.partTypes = [];
        updated.partType = '';
      } else if (key === 'insulationTypes' || key === 'insulationType') {
        updated.insulationTypes = [];
        updated.insulationType = '';
      } else if (key === 'locations' || key === 'location') {
        updated.locations = [];
        updated.location = '';
      } else if (key in updated) {
        (updated as unknown as Record<string, string>)[key] = '';
      }
      return updated;
    });
  };

  const filterByValue = (
    key: 'category' | 'manufacturer' | 'partType' | 'insulationType' | 'location',
    value: string
  ) => {
    const pluralKeyMap: Record<
      string,
      'categories' | 'manufacturers' | 'partTypes' | 'insulationTypes' | 'locations'
    > = {
      category: 'categories',
      manufacturer: 'manufacturers',
      partType: 'partTypes',
      insulationType: 'insulationTypes',
      location: 'locations',
    };
    const pluralKey = pluralKeyMap[key];

    setFilters((prev) => {
      const currentList = prev[pluralKey] || [];
      const isSelected = currentList.includes(value) || prev[key] === value;
      const updatedList = isSelected
        ? currentList.filter((item) => item !== value)
        : [...currentList, value];

      return {
        ...prev,
        [pluralKey]: updatedList,
        [key]: updatedList.length === 1 ? updatedList[0] : '',
      };
    });
    setActiveTab('inventory');
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  const addProduct = (product: Product) => {
    const baseId = getBaseProductId(product.id);
    const cleanedProd = { ...product, id: baseId };
    setRawProducts((prev) => [cleanedProd, ...prev.filter((p) => getBaseProductId(p.id) !== baseId)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, cleanedProd).catch(console.error);
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    const baseId = getBaseProductId(id);
    let updatedProd: Product | null = null;
    setRawProducts((prev) =>
      prev.map((p) => {
        if (getBaseProductId(p.id) === baseId) {
          updatedProd = { ...p, ...updatedFields };
          return updatedProd;
        }
        return p;
      })
    );
    if (updatedProd) {
      saveItemToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, updatedProd).catch(console.error);
    }
  };

  const deleteProduct = (id: string) => {
    const baseId = getBaseProductId(id);
    setRawProducts((prev) => prev.filter((p) => getBaseProductId(p.id) !== baseId));
    if (selectedProductId === baseId) {
      setSelectedProductId(null);
      setActiveTab('inventory');
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, baseId).catch(console.error);
  };

  // Positions CRUD
  const addPosition = (position: WarehousePosition) => {
    setPositions((prev) => [
      position,
      ...prev.filter((pos) => pos.id !== position.id),
    ]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.POSITIONS, position).catch(console.error);
  };

  const updatePosition = (id: string, updatedFields: Partial<WarehousePosition>) => {
    let updatedPos: WarehousePosition | null = null;
    setPositions((prev) =>
      prev.map((pos) => {
        if (pos.id === id) {
          updatedPos = { ...pos, ...updatedFields };
          return updatedPos;
        }
        return pos;
      })
    );
    if (updatedPos) {
      saveItemToFirestore(FIRESTORE_COLLECTIONS.POSITIONS, updatedPos).catch(console.error);
    }
  };

  const deletePosition = (id: string) => {
    setPositions((prev) => prev.filter((pos) => pos.id !== id));
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.POSITIONS, id).catch(console.error);
  };

  // Inventory Transactions CRUD
  const addInventoryRecord = (record: InventoryRecord) => {
    setInventory((prev) => [record, ...prev]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.INVENTORY, record).catch(console.error);
  };

  const updateInventoryRecord = (id: string, updatedFields: Partial<InventoryRecord>) => {
    let updatedRec: InventoryRecord | null = null;
    setInventory((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          updatedRec = { ...rec, ...updatedFields };
          return updatedRec;
        }
        return rec;
      })
    );
    if (updatedRec) {
      saveItemToFirestore(FIRESTORE_COLLECTIONS.INVENTORY, updatedRec).catch(console.error);
    }
  };

  const deleteInventoryRecord = (id: string) => {
    setInventory((prev) => prev.filter((rec) => rec.id !== id));
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.INVENTORY, id).catch(console.error);
  };

  // Inspections CRUD
  const addInspection = (inspection: Inspection) => {
    setInspections((prev) => [inspection, ...prev.filter((i) => i.id !== inspection.id)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.INSPECTIONS, inspection).catch(console.error);
  };

  const updateInspection = (id: string, updatedFields: Partial<Inspection>) => {
    let updatedInsp: Inspection | null = null;
    setInspections((prev) =>
      prev.map((insp) => {
        if (insp.id === id) {
          updatedInsp = { ...insp, ...updatedFields };
          return updatedInsp;
        }
        return insp;
      })
    );
    if (updatedInsp) {
      saveItemToFirestore(FIRESTORE_COLLECTIONS.INSPECTIONS, updatedInsp).catch(console.error);
    }
  };

  const deleteInspection = (id: string) => {
    setInspections((prev) => prev.filter((insp) => insp.id !== id));
    if (selectedInspectionId === id) {
      setSelectedInspectionId(null);
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.INSPECTIONS, id).catch(console.error);
  };

  const getNextInspectionId = (): string => {
    const nextNum = inspections.length + 1;
    return `INSP-${String(nextNum).padStart(3, '0')}`;
  };

  const getProductInspections = (productId: string): Inspection[] => {
    const baseId = getBaseProductId(productId).toLowerCase();
    return inspections.filter((insp) => {
      const inspProdBase = getBaseProductId(insp.productId || '').toLowerCase();
      const changeProdBase = insp.changeItem ? getBaseProductId(insp.changeItem).toLowerCase() : '';
      return inspProdBase === baseId || changeProdBase === baseId;
    });
  };

  const getProductAsReplacedItemInspections = (productId: string): Inspection[] => {
    const baseId = getBaseProductId(productId).toLowerCase();
    return inspections.filter((insp) => {
      if (!insp.changeItem) return false;
      const changeProdBase = getBaseProductId(insp.changeItem).toLowerCase();
      return changeProdBase === baseId;
    });
  };

  // Kanban CRUD & Helpers
  const addKanbanItem = (item: KanbanItem) => {
    const now = new Date().toISOString().split('T')[0];
    const withDefaults: KanbanItem = {
      ...item,
      id: item.id || getNextKanbanId(),
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
    };
    setKanban((prev) => [withDefaults, ...prev.filter((k) => k.id !== withDefaults.id)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.KANBAN, withDefaults).catch(console.error);
  };

  const updateKanbanItem = (id: string, updatedFields: Partial<KanbanItem>) => {
    const now = new Date().toISOString().split('T')[0];
    let updatedItem: KanbanItem | null = null;
    setKanban((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          updatedItem = { ...item, ...updatedFields, updatedAt: updatedFields.updatedAt || now };
          return updatedItem;
        }
        return item;
      })
    );
    if (updatedItem) {
      saveItemToFirestore(FIRESTORE_COLLECTIONS.KANBAN, updatedItem).catch(console.error);
    }
  };

  const deleteKanbanItem = (id: string) => {
    setKanban((prev) => prev.filter((k) => k.id !== id));
    if (selectedKanbanId === id) {
      setSelectedKanbanId(null);
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.KANBAN, id).catch(console.error);
  };

  const moveKanbanItem = (id: string, newStatus: KanbanStatus | string) => {
    updateKanbanItem(id, { status: newStatus as KanbanStatus });
  };

  const clearKanban = () => {
    setKanban([]);
    setSelectedKanbanId(null);
    try {
      localStorage.removeItem(KANBAN_STORAGE_KEY);
      localStorage.removeItem('kinetic_kanban_cache');
    } catch {
      // ignore
    }
    clearFirestoreCollection(FIRESTORE_COLLECTIONS.KANBAN).catch(console.error);
  };

  const getNextKanbanId = (): string => {
    const nextNum = kanban.length + 1;
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `KB-${String(nextNum).padStart(3, '0')}-${randomSuffix}`;
  };

  // KonSar CRUD & Helpers
  const addKonSarRelation = (relation: KonSarRelation) => {
    setKonSar((prev) => [relation, ...prev.filter((r) => r.id !== relation.id)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.KONSAR, relation).catch(console.error);
  };

  const deleteKonSarRelation = (id: string) => {
    setKonSar((prev) => prev.filter((r) => r.id !== id));
    if (selectedKonSarId === id) {
      setSelectedKonSarId(null);
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.KONSAR, id).catch(console.error);
  };

  const getNextKonSarId = (): string => {
    return Math.random().toString(16).substring(2, 10);
  };

  const getConnectedKonSar = (productId: string) => {
    const cleanId = (productId || '').trim();
    if (!cleanId) return [];
    const baseId = getBaseProductId(cleanId);
    const cLower = cleanId.toLowerCase();
    const bLower = baseId.toLowerCase();

    const seenPartners = new Set<string>();
    const results: {
      relation: KonSarRelation;
      partnerId: string;
      partnerProduct?: Product;
      partnerType: 'Konnektor' | 'Saru' | 'Egyéb';
      partnerCategory?: string;
    }[] = [];

    for (const rel of konSar) {
      const p1 = (rel.productId1 || '').trim();
      const p2 = (rel.productId2 || '').trim();
      const p1Lower = p1.toLowerCase();
      const p2Lower = p2.toLowerCase();

      const isP1 = p1Lower === cLower || p1Lower === bLower;
      const isP2 = p2Lower === cLower || p2Lower === bLower;

      if (!isP1 && !isP2) continue;

      const rawPartnerId = isP1 ? p2 : p1;
      const partnerId = getBaseProductId(rawPartnerId);
      const partnerIdLower = partnerId.toLowerCase();

      // Skip empty, self-relation, or already seen partner
      if (!partnerId || partnerIdLower === cLower || partnerIdLower === bLower) continue;
      if (seenPartners.has(partnerIdLower)) continue;

      seenPartners.add(partnerIdLower);

      // Find partner product in products or rawProducts
      const partnerProduct =
        products.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        rawProducts.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        INITIAL_PRODUCTS.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        );

      let partnerType: 'Konnektor' | 'Saru' | 'Egyéb' = 'Egyéb';
      const cat = (partnerProduct?.category || '').toLowerCase();
      const name = (partnerProduct?.name || '').toLowerCase();
      if (cat.includes('konnektor') || name.includes('konnektor') || partnerProduct?.connectorType) {
        partnerType = 'Konnektor';
      } else if (cat.includes('saru') || name.includes('saru') || partnerProduct?.terminalType) {
        partnerType = 'Saru';
      } else {
        partnerType = isP1 ? 'Saru' : 'Konnektor';
      }

      const partnerCategory = partnerProduct?.category || (partnerType === 'Konnektor' ? 'Konnektor' : partnerType === 'Saru' ? 'Saru' : 'Gyártandó Termék');

      results.push({
        relation: rel,
        partnerId,
        partnerProduct,
        partnerType,
        partnerCategory,
      });
    }

    return results;
  };

  // TermMerod CRUD & Helpers
  const addTermMerodRelation = (relation: TermMerodRelation) => {
    setTermMerod((prev) => [relation, ...prev.filter((r) => r.id !== relation.id)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.TERMMEROD, relation).catch(console.error);
  };

  const deleteTermMerodRelation = (id: string) => {
    setTermMerod((prev) => prev.filter((r) => r.id !== id));
    if (selectedTermMerodId === id) {
      setSelectedTermMerodId(null);
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.TERMMEROD, id).catch(console.error);
  };

  const getNextTermMerodId = (): string => {
    return `tm-${Math.random().toString(16).substring(2, 8)}`;
  };

  const getConnectedTermMerod = (productId: string) => {
    const cleanId = (productId || '').trim();
    if (!cleanId) return [];
    const baseId = getBaseProductId(cleanId);
    const cLower = cleanId.toLowerCase();
    const bLower = baseId.toLowerCase();

    const seenPartners = new Set<string>();
    const results: {
      relation: TermMerodRelation;
      partnerId: string;
      partnerProduct?: Product;
      role: 'Termék' | 'Mérődoboz' | 'Egyéb';
      partnerCategory?: string;
    }[] = [];

    for (const rel of termMerod) {
      const p1 = (rel.productId1 || '').trim();
      const p2 = (rel.productId2 || '').trim();
      const p1Lower = p1.toLowerCase();
      const p2Lower = p2.toLowerCase();

      const isP1 = p1Lower === cLower || p1Lower === bLower;
      const isP2 = p2Lower === cLower || p2Lower === bLower;

      if (!isP1 && !isP2) continue;

      const rawPartnerId = isP1 ? p2 : p1;
      const partnerId = getBaseProductId(rawPartnerId);
      const partnerIdLower = partnerId.toLowerCase();

      // Skip empty, self-relation, or already seen partner
      if (!partnerId || partnerIdLower === cLower || partnerIdLower === bLower) continue;
      if (seenPartners.has(partnerIdLower)) continue;

      seenPartners.add(partnerIdLower);

      // Find partner product in products or rawProducts or initialProducts
      const partnerProduct =
        products.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        rawProducts.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        INITIAL_PRODUCTS.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        );

      let role: 'Termék' | 'Mérődoboz' | 'Egyéb' = isP1 ? 'Mérődoboz' : 'Termék';
      const cat = (partnerProduct?.category || '').toLowerCase();
      const name = (partnerProduct?.name || '').toLowerCase();
      if (
        cat.includes('mérő') ||
        cat.includes('merodoboz') ||
        name.includes('mérő') ||
        name.includes('merodoboz') ||
        partnerId.toUpperCase().startsWith('MD-')
      ) {
        role = 'Mérődoboz';
      } else if (
        cat.includes('saruzófej') ||
        cat.includes('saru') ||
        name.includes('saruzó') ||
        cat.includes('termék') ||
        cat.includes('gyártandó') ||
        cat.includes('gyartando')
      ) {
        role = 'Termék';
      }

      // Always prioritize real category from the table/product metadata
      let partnerCategory = partnerProduct?.category;
      if (!partnerCategory) {
        if (role === 'Mérődoboz') {
          partnerCategory = 'Mérődoboz';
        } else {
          // If it's a product in TermMerod and not an MD, it is a Gyártandó Termék / Termék
          partnerCategory = 'Gyártandó Termék';
        }
      }

      results.push({
        relation: rel,
        partnerId,
        partnerProduct,
        role,
        partnerCategory,
      });
    }

    return results;
  };

  // Beépülő Alkatrész CRUD & Helpers
  const addBeepuloRelation = (relation: BeepuloRelation) => {
    setBeepulo((prev) => [relation, ...prev.filter((r) => r.id !== relation.id)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.BEEPULO, relation).catch(console.error);
  };

  const deleteBeepuloRelation = (id: string) => {
    setBeepulo((prev) => prev.filter((r) => r.id !== id));
    if (selectedBeepuloId === id) {
      setSelectedBeepuloId(null);
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.BEEPULO, id).catch(console.error);
  };

  const getNextBeepuloId = (): string => {
    return `bp-${Math.random().toString(16).substring(2, 8)}`;
  };

  const getConnectedBeepulo = (productId: string) => {
    const cleanId = (productId || '').trim();
    if (!cleanId) return [];
    const baseId = getBaseProductId(cleanId);
    const cLower = cleanId.toLowerCase();
    const bLower = baseId.toLowerCase();

    const seenPartners = new Set<string>();
    const results: {
      relation: BeepuloRelation;
      partnerId: string;
      partnerProduct?: Product;
      role: 'Beépülő alkatrész' | 'Főtermék amibe beépül';
      quantity: number;
      note?: string;
      partnerCategory?: string;
    }[] = [];

    for (const rel of beepulo) {
      const p1 = (rel.productId1 || '').trim();
      const p2 = (rel.productId2 || '').trim();
      const p1Lower = p1.toLowerCase();
      const p2Lower = p2.toLowerCase();

      const isP1 = p1Lower === cLower || p1Lower === bLower;
      const isP2 = p2Lower === cLower || p2Lower === bLower;

      if (!isP1 && !isP2) continue;

      const rawPartnerId = isP1 ? p2 : p1;
      const partnerId = getBaseProductId(rawPartnerId);
      const partnerIdLower = partnerId.toLowerCase();

      // Skip empty, self-relation, or already seen partner (deduplication)
      if (!partnerId || partnerIdLower === cLower || partnerIdLower === bLower) continue;
      if (seenPartners.has(partnerIdLower)) continue;

      seenPartners.add(partnerIdLower);

      // Find partner product in products or rawProducts or initialProducts
      const partnerProduct =
        products.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        rawProducts.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        INITIAL_PRODUCTS.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        );

      const role: 'Beépülő alkatrész' | 'Főtermék amibe beépül' = isP1
        ? 'Beépülő alkatrész'
        : 'Főtermék amibe beépül';

      let partnerCategory = partnerProduct?.category;
      if (!partnerCategory) {
        if (role === 'Beépülő alkatrész') {
          partnerCategory = partnerProduct?.partType || 'Alkatrész';
        } else {
          partnerCategory = 'Főtermék / Saruzófej';
        }
      }

      results.push({
        relation: rel,
        partnerId,
        partnerProduct,
        role,
        quantity: rel.quantity || 1,
        note: rel.note || (rel.customFields ? Object.values(rel.customFields)[0] : undefined),
        partnerCategory,
      });
    }

    return results;
  };

  // FejSaru CRUD & Helpers
  const addFejSaruRelation = (relation: FejSaruRelation) => {
    setFejSaru((prev) => [relation, ...prev.filter((r) => r.id !== relation.id)]);
    saveItemToFirestore(FIRESTORE_COLLECTIONS.FEJSARU, relation).catch(console.error);
  };

  const deleteFejSaruRelation = (id: string) => {
    setFejSaru((prev) => prev.filter((r) => r.id !== id));
    if (selectedFejSaruId === id) {
      setSelectedFejSaruId(null);
    }
    deleteItemFromFirestore(FIRESTORE_COLLECTIONS.FEJSARU, id).catch(console.error);
  };

  const getNextFejSaruId = (): string => {
    return `fs-${Math.random().toString(16).substring(2, 8)}`;
  };

  const getConnectedFejSaru = (productId: string) => {
    const cleanId = (productId || '').trim();
    if (!cleanId) return [];
    const baseId = getBaseProductId(cleanId);
    const cLower = cleanId.toLowerCase();
    const bLower = baseId.toLowerCase();

    const seenPartners = new Set<string>();
    const results: {
      relation: FejSaruRelation;
      partnerId: string;
      partnerProduct?: Product;
      role: 'Saruzófej' | 'Saru' | 'Egyéb';
      note?: string;
      partnerCategory?: string;
    }[] = [];

    for (const rel of fejSaru) {
      const p1 = (rel.productId1 || '').trim();
      const p2 = (rel.productId2 || '').trim();
      const p1Lower = p1.toLowerCase();
      const p2Lower = p2.toLowerCase();

      const isP1 = p1Lower === cLower || p1Lower === bLower;
      const isP2 = p2Lower === cLower || p2Lower === bLower;

      if (!isP1 && !isP2) continue;

      const rawPartnerId = isP1 ? p2 : p1;
      const partnerId = getBaseProductId(rawPartnerId);
      const partnerIdLower = partnerId.toLowerCase();

      // Skip empty, self-relation, or already seen partner
      if (!partnerId || partnerIdLower === cLower || partnerIdLower === bLower) continue;
      if (seenPartners.has(partnerIdLower)) continue;

      seenPartners.add(partnerIdLower);

      // Find partner product in products or rawProducts or initialProducts
      const partnerProduct =
        products.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        rawProducts.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        ) ||
        INITIAL_PRODUCTS.find(
          (p) =>
            p.id.toLowerCase() === partnerIdLower ||
            getBaseProductId(p.id).toLowerCase() === partnerIdLower
        );

      let role: 'Saruzófej' | 'Saru' | 'Egyéb' = isP1 ? 'Saru' : 'Saruzófej';
      const cat = (partnerProduct?.category || '').toLowerCase();
      const name = (partnerProduct?.name || '').toLowerCase();

      if (cat.includes('fej') || name.includes('saruzófej') || (name.startsWith('n') && !isNaN(Number(name.slice(1))))) {
        role = 'Saruzófej';
      } else if (cat.includes('saru') || name.includes('saru')) {
        role = 'Saru';
      }

      let partnerCategory = partnerProduct?.category;
      if (!partnerCategory) {
        partnerCategory = role === 'Saruzófej' ? 'Saruzófej' : 'Saru';
      }

      results.push({
        relation: rel,
        partnerId,
        partnerProduct,
        role,
        note: rel.note || (rel.customFields ? Object.values(rel.customFields)[0] : undefined),
        partnerCategory,
      });
    }

    return results;
  };

  // Rendelés (Orders) CRUD & Helpers
  const getNextOrderId = (): string => {
    const nextNum = orders.length + 1;
    const year = new Date().getFullYear();
    return `REND-${year}-${String(nextNum).padStart(3, '0')}`;
  };

  const addOrder = async (order: Order): Promise<void> => {
    const finalId = order.id || order.rendelesId || getNextOrderId();
    const finalOrder: Order = {
      ...order,
      id: finalId,
      rendelesId: order.rendelesId || finalId,
    };
    setOrders((prev) => [finalOrder, ...prev.filter((o) => o.id !== finalOrder.id && o.rendelesId !== finalOrder.rendelesId)]);
    await saveItemToFirestore(FIRESTORE_COLLECTIONS.ORDERS, finalOrder).catch(console.error);
  };

  const updateOrder = async (id: string, updatedFields: Partial<Order>): Promise<void> => {
    let updatedOrder: Order | null = null;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === id || o.rendelesId === id) {
          updatedOrder = { ...o, ...updatedFields };
          return updatedOrder;
        }
        return o;
      })
    );
    if (updatedOrder) {
      await saveItemToFirestore(FIRESTORE_COLLECTIONS.ORDERS, updatedOrder).catch(console.error);
    }
  };

  const deleteOrder = async (id: string): Promise<void> => {
    setOrders((prev) => prev.filter((o) => o.id !== id && o.rendelesId !== id));
    if (selectedOrderId === id) {
      setSelectedOrderId(null);
    }
    await deleteItemFromFirestore(FIRESTORE_COLLECTIONS.ORDERS, id).catch(console.error);
  };

  // Note CRUD & Helpers
  const getNextNoteId = (): string => {
    const nextNum = notes.length + 1;
    return `NOTE-${1000 + nextNum}`;
  };

  const getNotesForProduct = useCallback(
    (productId: string): ProductNote[] => {
      if (!productId) return [];
      const clean = productId.trim().toLowerCase();
      const base = getBaseProductId(productId).trim().toLowerCase();
      return notes.filter((n) => {
        const noteProdId = (n.termekId || '').trim().toLowerCase();
        const noteBase = getBaseProductId(n.termekId || '').trim().toLowerCase();
        return (
          noteProdId === clean ||
          noteBase === clean ||
          noteProdId === base ||
          noteBase === base
        );
      });
    },
    [notes]
  );

  const addNote = async (note: Omit<ProductNote, 'id'> | ProductNote): Promise<ProductNote> => {
    const finalId = ('id' in note && note.id) ? note.id : getNextNoteId();
    const finalNote: ProductNote = {
      ...note,
      id: finalId,
    };
    setNotes((prev) => [finalNote, ...prev.filter((n) => n.id !== finalId)]);
    await saveItemToFirestore(FIRESTORE_COLLECTIONS.NOTES, finalNote).catch(console.error);
    return finalNote;
  };

  const updateNote = async (id: string, updatedFields: Partial<ProductNote>): Promise<void> => {
    let updatedNote: ProductNote | null = null;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          updatedNote = { ...n, ...updatedFields };
          return updatedNote;
        }
        return n;
      })
    );
    if (updatedNote) {
      await saveItemToFirestore(FIRESTORE_COLLECTIONS.NOTES, updatedNote).catch(console.error);
    }
  };

  const deleteNote = async (id: string): Promise<void> => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
    await deleteItemFromFirestore(FIRESTORE_COLLECTIONS.NOTES, id).catch(console.error);
  };

  const getAllRelatedProductIds = (productId: string): { id: string; relationType: string; product?: Product }[] => {
    const cleanId = (productId || '').trim();
    if (!cleanId) return [];
    const baseId = getBaseProductId(cleanId);
    const cLower = cleanId.toLowerCase();
    const bLower = baseId.toLowerCase();

    const map = new Map<string, { id: string; relationType: string; product?: Product }>();

    // 1. KonSar
    const connectedKonSar = getConnectedKonSar(cleanId);
    for (const rel of connectedKonSar) {
      const pid = (rel.partnerId || '').trim();
      if (pid && !map.has(pid.toLowerCase())) {
        map.set(pid.toLowerCase(), {
          id: pid,
          relationType: `KonSar (${rel.partnerType})`,
          product: rel.partnerProduct,
        });
      }
    }

    // 2. TermMerod
    const connectedTermMerod = getConnectedTermMerod(cleanId);
    for (const rel of connectedTermMerod) {
      const pid = (rel.partnerId || '').trim();
      if (pid && !map.has(pid.toLowerCase())) {
        map.set(pid.toLowerCase(), {
          id: pid,
          relationType: `Mérődoboz (${rel.role})`,
          product: rel.partnerProduct,
        });
      }
    }

    // 3. Beépülő
    const connectedBeepulo = getConnectedBeepulo(cleanId);
    for (const rel of connectedBeepulo) {
      const pid = (rel.partnerId || '').trim();
      if (pid && !map.has(pid.toLowerCase())) {
        map.set(pid.toLowerCase(), {
          id: pid,
          relationType: `Beépülő (${rel.role})`,
          product: rel.partnerProduct,
        });
      }
    }

    // 4. FejSaru
    const connectedFejSaru = getConnectedFejSaru(cleanId);
    for (const rel of connectedFejSaru) {
      const pid = (rel.partnerId || '').trim();
      if (pid && !map.has(pid.toLowerCase())) {
        map.set(pid.toLowerCase(), {
          id: pid,
          relationType: `FejSaru (${rel.role})`,
          product: rel.partnerProduct,
        });
      }
    }

    // 5. Saru Specs: Saruzófej <-> Saru
    for (const spec of saruSpecs) {
      const specPid = (spec.productId || '').trim();
      const specFc = (spec.factoryCode || '').trim();
      const specFeeder = (spec.feederTool || '').trim();

      const matchesTerminal =
        (specPid && (specPid.toLowerCase() === cLower || specPid.toLowerCase() === bLower)) ||
        (specFc && (specFc.toLowerCase() === cLower || specFc.toLowerCase() === bLower));

      if (matchesTerminal && specFeeder && !map.has(specFeeder.toLowerCase())) {
        map.set(specFeeder.toLowerCase(), {
          id: specFeeder,
          relationType: 'Saru specifikáció (Saruzó fej)',
        });
      }

      const matchesFeeder =
        specFeeder && (specFeeder.toLowerCase() === cLower || specFeeder.toLowerCase() === bLower);

      if (matchesFeeder) {
        const partnerTermId = specPid || specFc;
        if (partnerTermId && !map.has(partnerTermId.toLowerCase())) {
          map.set(partnerTermId.toLowerCase(), {
            id: partnerTermId,
            relationType: 'Saru specifikáció (Saru alkatrész)',
          });
        }
      }
    }

    return Array.from(map.values());
  };

  const getProductOrders = (productId: string): Order[] => {
    const cleanId = (productId || '').trim();
    if (!cleanId) return [];
    const baseId = getBaseProductId(cleanId);
    const cLower = cleanId.toLowerCase();
    const bLower = baseId.toLowerCase();

    return orders.filter((o) => {
      const orderPid = (o.termekId || '').trim();
      if (!orderPid) return false;
      const oBase = getBaseProductId(orderPid);
      const oLower = orderPid.toLowerCase();
      const oBaseLower = oBase.toLowerCase();

      return oLower === cLower || oBaseLower === bLower || oLower === bLower || oBaseLower === cLower;
    });
  };

  const getRelatedProductOrders = (productId: string): {
    order: Order;
    relatedProductId: string;
    relationType: string;
    relatedProduct?: Product;
  }[] => {
    const relatedList = getAllRelatedProductIds(productId);
    if (relatedList.length === 0) return [];

    const results: {
      order: Order;
      relatedProductId: string;
      relationType: string;
      relatedProduct?: Product;
    }[] = [];

    const seenOrderIds = new Set<string>();

    for (const rel of relatedList) {
      const relOrders = getProductOrders(rel.id);
      for (const ord of relOrders) {
        if (!seenOrderIds.has(ord.id)) {
          seenOrderIds.add(ord.id);
          results.push({
            order: ord,
            relatedProductId: rel.id,
            relationType: rel.relationType,
            relatedProduct: rel.product,
          });
        }
      }
    }

    return results;
  };

  const getProductOrderSummary = (productId: string) => {
    const directOrders = getProductOrders(productId);
    const relatedOrders = getRelatedProductOrders(productId);

    const isDirectlyOrdered = directOrders.some(
      (o) =>
        (o.statusz && !o.statusz.toLowerCase().includes('töröl') && !o.statusz.toLowerCase().includes('visszavon')) ||
        Boolean(o.datumMegrendelve)
    );
    const hasRelatedOrder = relatedOrders.some(
      (r) =>
        (r.order.statusz && !r.order.statusz.toLowerCase().includes('töröl') && !r.order.statusz.toLowerCase().includes('visszavon')) ||
        Boolean(r.order.datumMegrendelve)
    );

    const totalActiveOrdersCount =
      directOrders.filter(
        (o) => !o.statusz?.toLowerCase().includes('töröl') && !o.statusz?.toLowerCase().includes('visszavon')
      ).length +
      relatedOrders.filter(
        (r) => !r.order.statusz?.toLowerCase().includes('töröl') && !r.order.statusz?.toLowerCase().includes('visszavon')
      ).length;

    return {
      isDirectlyOrdered,
      hasRelatedOrder,
      directOrders,
      relatedOrders,
      totalActiveOrdersCount,
    };
  };

  const getNextTransactionId = (): string => {
    const nextNum = inventory.length + 1;
    return `TRX-${String(nextNum).padStart(3, '0')}`;
  };

  const recordTransaction = (params: {
    id?: string;
    productId: string;
    positionId: string;
    quantity: number;
    date?: string;
    note?: string;
    condition?: 'new' | 'used';
  }): InventoryRecord => {
    const now = new Date();
    const dateFormatted =
      params.date ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
        2,
        '0'
      )}`;

    const trxId = params.id && params.id.trim()
      ? params.id.trim()
      : `TRX-${Date.now().toString().slice(-6)}`;

    let targetProductId = params.productId.trim();
    if (params.condition === 'used' || (params.condition === undefined && isUsedProductId(targetProductId))) {
      targetProductId = getUsedProductId(targetProductId);
    } else if (params.condition === 'new') {
      targetProductId = getNewProductId(targetProductId);
    }

    const newRecord: InventoryRecord = {
      id: trxId,
      productId: targetProductId,
      positionId: params.positionId.trim(),
      quantity: Number(params.quantity) || 0,
      date: dateFormatted,
      note: params.note?.trim() || undefined,
    };

    addInventoryRecord(newRecord);
    return newRecord;
  };

  const adjustStock = (
    productId: string,
    positionId: string,
    deltaQuantity: number,
    note?: string,
    customDate?: string,
    customTrxId?: string,
    condition?: 'new' | 'used'
  ) => {
    if (deltaQuantity === 0) return;
    const now = new Date();
    const dateFormatted =
      customDate ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(
        2,
        '0'
      )}`;

    const trxId =
      customTrxId && customTrxId.trim()
        ? customTrxId.trim()
        : `TRX-${Date.now().toString().slice(-6)}`;

    let targetProductId = productId.trim();
    if (condition === 'used') {
      targetProductId = getUsedProductId(targetProductId);
    } else if (condition === 'new') {
      targetProductId = getNewProductId(targetProductId);
    }

    const isUsed = isUsedProductId(targetProductId);
    const condLabel = isUsed ? 'Használt (H_)' : 'Új';

    const defaultNote =
      deltaQuantity > 0
        ? `Készletnövelés (+${deltaQuantity} db - ${condLabel})`
        : `Készletcsökkentés (${deltaQuantity} db - ${condLabel})`;

    const newRecord: InventoryRecord = {
      id: trxId,
      productId: targetProductId,
      positionId: positionId.trim(),
      quantity: deltaQuantity,
      date: dateFormatted,
      note: note || defaultNote,
    };

    addInventoryRecord(newRecord);
  };

  // Precomputed fast stock map over inventory (O(1) lookups)
  const inventoryStockMap = useMemo(() => {
    return createProductStockMap(inventory);
  }, [inventory]);

  // Stock Calculation Helpers - using O(1) map lookups
  const getProductStockBreakdown = useCallback((productId: string): ProductStockBreakdown => {
    return getProductStockFromMap(productId, inventoryStockMap);
  }, [inventoryStockMap]);

  const getProductTotalStock = useCallback((productId: string): number => {
    return getProductStockFromMap(productId, inventoryStockMap).totalStock;
  }, [inventoryStockMap]);

  const getProductNewStock = useCallback((productId: string): number => {
    return getProductStockFromMap(productId, inventoryStockMap).newStock;
  }, [inventoryStockMap]);

  const getProductUsedStock = useCallback((productId: string): number => {
    return getProductStockFromMap(productId, inventoryStockMap).usedStock;
  }, [inventoryStockMap]);

  const getUnifiedPositions = (productId: string): UnifiedProductPosition[] => {
    return getUnifiedProductPositions(productId, inventory, positions);
  };

  const getProductPositions = (productId: string): ProductStockPosition[] => {
    const unified = getUnifiedProductPositions(productId, inventory, positions);
    return unified.map((u) => ({
      positionId: u.positionId,
      positionName: u.positionName,
      quantity: u.totalQuantity,
      newQuantity: u.newQuantity,
      usedQuantity: u.usedQuantity,
      records: u.records,
    }));
  };

  const getPositionProducts = (positionId: string): PositionProductItem[] => {
    const posRecords = inventory.filter(
      (rec) => rec.positionId.trim() === positionId.trim()
    );

    const baseMap = new Map<
      string,
      {
        newQty: number;
        usedQty: number;
      }
    >();

    posRecords.forEach((rec) => {
      const prodId = (rec.productId || '').trim();
      const baseId = getBaseProductId(prodId);
      if (!baseId) return;

      const isUsed = isUsedProductId(prodId);
      const qty = rec.quantity || 0;

      const current = baseMap.get(baseId) || { newQty: 0, usedQty: 0 };
      if (isUsed) {
        current.usedQty += qty;
      } else {
        current.newQty += qty;
      }
      baseMap.set(baseId, current);
    });

    const result: PositionProductItem[] = [];
    baseMap.forEach(({ newQty, usedQty }, baseId) => {
      const totalQty = newQty + usedQty;
      const masterProd =
        products.find((p) => p.id === baseId) ||
        rawProducts.find((p) => getBaseProductId(p.id) === baseId) || {
          id: baseId,
          name: baseId,
        };

      const cond: 'new' | 'used' | 'both' =
        newQty > 0 && usedQty > 0 ? 'both' : usedQty > 0 ? 'used' : 'new';
      const condLabel =
        newQty > 0 && usedQty > 0
          ? 'Új + Használt'
          : usedQty > 0
          ? 'Használt'
          : 'Új';

      result.push({
        product: {
          ...masterProd,
          id: baseId,
        },
        baseId,
        quantity: totalQty,
        newQuantity: newQty,
        usedQuantity: usedQty,
        condition: cond,
        isUsed: usedQty > 0 && newQty === 0,
        conditionLabel: condLabel,
        specificId: baseId,
      });
    });

    // Sort by baseId
    return result.sort((a, b) => a.baseId.localeCompare(b.baseId));
  };

  const getPositionTotalItems = (positionId: string): number => {
    return inventory
      .filter((rec) => rec.positionId.trim() === positionId.trim())
      .reduce((sum, rec) => sum + (rec.quantity || 0), 0);
  };

  // Selected Product object
  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    const baseId = getBaseProductId(selectedProductId);
    return products.find((p) => p.id === baseId || p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Dynamic filter collections
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < products.length; i++) {
      const cat = products[i].category?.trim();
      if (cat) {
        map[cat] = (map[cat] || 0) + 1;
      }
    }
    return map;
  }, [products]);

  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.manufacturer && p.manufacturer.trim()) set.add(p.manufacturer.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const partTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.partType && p.partType.trim()) set.add(p.partType.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const insulationTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.insulationType && p.insulationType.trim()) set.add(p.insulationType.trim());
    });
    return Array.from(set).sort();
  }, [products]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    // Include both product locations and position names
    products.forEach((p) => {
      if (p.location && p.location.trim()) set.add(p.location.trim());
    });
    positions.forEach((pos) => {
      if (pos.name && pos.name.trim()) set.add(pos.name.trim());
    });
    return Array.from(set).sort();
  }, [products, positions]);

  // Filtered and Sorted Products - Ultra optimized for instant filtering
  const filteredProducts = useMemo(() => {
    // 1. Precalculate active filters outside the loop for instant O(1) set lookup
    const activeCategories =
      filters.categories && filters.categories.length > 0
        ? filters.categories
        : filters.category
        ? [filters.category]
        : [];
    const activeCategoriesSet =
      activeCategories.length > 0 ? new Set(activeCategories.map((c) => c.trim().toLowerCase())) : null;

    const activeManufacturers =
      filters.manufacturers && filters.manufacturers.length > 0
        ? filters.manufacturers
        : filters.manufacturer
        ? [filters.manufacturer]
        : [];
    const activeManufacturersSet =
      activeManufacturers.length > 0
        ? new Set(activeManufacturers.map((m) => m.trim().toLowerCase()))
        : null;

    const activePartTypes =
      filters.partTypes && filters.partTypes.length > 0
        ? filters.partTypes
        : filters.partType
        ? [filters.partType]
        : [];
    const activePartTypesSet =
      activePartTypes.length > 0 ? new Set(activePartTypes.map((p) => p.trim().toLowerCase())) : null;

    const activeInsulationTypes =
      filters.insulationTypes && filters.insulationTypes.length > 0
        ? filters.insulationTypes
        : filters.insulationType
        ? [filters.insulationType]
        : [];
    const activeInsulationTypesSet =
      activeInsulationTypes.length > 0
        ? new Set(activeInsulationTypes.map((i) => i.trim().toLowerCase()))
        : null;

    const activeLocations =
      filters.locations && filters.locations.length > 0
        ? filters.locations
        : filters.location
        ? [filters.location]
        : [];
    const activeLocationsSet =
      activeLocations.length > 0 ? new Set(activeLocations.map((l) => l.trim().toLowerCase())) : null;

    const searchQuery = filters.searchQuery ? filters.searchQuery.toLowerCase().trim() : '';
    const isSearchActive = Boolean(searchQuery);
    const isConditionActive = Boolean(filters.conditionFilter && filters.conditionFilter !== 'all');
    const isSearchKeywordSpecial =
      isSearchActive &&
      (searchQuery === 'használt' ||
        searchQuery === 'hasznalt' ||
        searchQuery === 'h_' ||
        searchQuery === 'új' ||
        searchQuery === 'uj');

    return products
      .filter((p) => {
        // FAST FILTER 1: Categories check first (instant O(1) set lookup)
        if (
          activeCategoriesSet &&
          (!p.category || !activeCategoriesSet.has(p.category.trim().toLowerCase()))
        ) {
          return false;
        }

        // FAST FILTER 2: Other metadata checks (cheap string / set checks)
        if (
          activeManufacturersSet &&
          (!p.manufacturer || !activeManufacturersSet.has(p.manufacturer.trim().toLowerCase()))
        ) {
          return false;
        }

        if (
          activePartTypesSet &&
          (!p.partType || !activePartTypesSet.has(p.partType.trim().toLowerCase()))
        ) {
          return false;
        }

        if (
          activeInsulationTypesSet &&
          (!p.insulationType || !activeInsulationTypesSet.has(p.insulationType.trim().toLowerCase()))
        ) {
          return false;
        }

        if (
          activeLocationsSet &&
          (!p.location || !activeLocationsSet.has(p.location.trim().toLowerCase()))
        ) {
          return false;
        }

        if (
          filters.insulationGripperType &&
          p.insulationGripperType !== filters.insulationGripperType
        ) {
          return false;
        }
        if (filters.quality && p.quality !== filters.quality) {
          return false;
        }
        if (filters.hasImageOnly && !p.image) {
          return false;
        }

        // Fast O(1) stock breakdown only when actually needed
        let breakdown: ProductStockBreakdown | null = null;
        if (isConditionActive || isSearchKeywordSpecial) {
          breakdown = getProductStockFromMap(p.id, inventoryStockMap);
        }

        // Search Query check
        if (isSearchActive) {
          const matchId = p.id.toLowerCase().includes(searchQuery);
          const matchUsedId = `h_${p.id}`.toLowerCase().includes(searchQuery);
          const matchName = p.name.toLowerCase().includes(searchQuery);
          const matchDesc = p.description?.toLowerCase().includes(searchQuery) ?? false;
          const matchFactoryCode = p.factoryCode?.toLowerCase().includes(searchQuery) ?? false;
          const matchCategory = p.category?.toLowerCase().includes(searchQuery) ?? false;
          const matchManufacturer = p.manufacturer?.toLowerCase().includes(searchQuery) ?? false;
          const matchLocation = p.location?.toLowerCase().includes(searchQuery) ?? false;
          const matchPartType = p.partType?.toLowerCase().includes(searchQuery) ?? false;

          let matchUsedKeyword = false;
          let matchNewKeyword = false;
          if (isSearchKeywordSpecial && breakdown) {
            matchUsedKeyword =
              (searchQuery === 'használt' || searchQuery === 'hasznalt' || searchQuery === 'h_') &&
              breakdown.usedStock > 0;
            matchNewKeyword =
              (searchQuery === 'új' || searchQuery === 'uj') && breakdown.newStock > 0;
          }

          if (
            !matchId &&
            !matchUsedId &&
            !matchName &&
            !matchDesc &&
            !matchFactoryCode &&
            !matchCategory &&
            !matchManufacturer &&
            !matchLocation &&
            !matchPartType &&
            !matchUsedKeyword &&
            !matchNewKeyword
          ) {
            return false;
          }
        }

        // Condition Filter check
        if (isConditionActive) {
          if (!breakdown) {
            breakdown = getProductStockFromMap(p.id, inventoryStockMap);
          }
          if (filters.conditionFilter === 'new' && breakdown.newStock <= 0) {
            return false;
          }
          if (filters.conditionFilter === 'used' && breakdown.usedStock <= 0) {
            return false;
          }
          if (
            filters.conditionFilter === 'both' &&
            (breakdown.newStock <= 0 || breakdown.usedStock <= 0)
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        let fieldA = (a[filters.sortBy as keyof Product] || '').toString();
        let fieldB = (b[filters.sortBy as keyof Product] || '').toString();
        const order = filters.sortOrder === 'asc' ? 1 : -1;
        return fieldA.localeCompare(fieldB, 'hu', { numeric: true }) * order;
      });
  }, [products, filters, inventoryStockMap]);

  return (
    <ProductContext.Provider
      value={{
        products,
        rawProducts,
        filteredProducts,
        selectedProduct,
        selectedProductId,
        activeTab,
        viewMode,
        filters,
        isSyncing,
        syncError,
        lastSyncedAt,
        sheetUrl,
        totalCount: products.length,
        categories,
        categoryCounts,
        manufacturers,
        partTypes,
        insulationTypes,
        locations,
        positions,
        inventory,
        transactions: inventory,
        selectedPositionId,
        inspections,
        selectedInspectionId,
        kanban,
        selectedKanbanId,
        setSelectedKanbanId,
        konSar,
        selectedKonSarId,
        setSelectedKonSarId,
        termMerod,
        selectedTermMerodId,
        setSelectedTermMerodId,
        beepulo,
        selectedBeepuloId,
        setSelectedBeepuloId,
        fejSaru,
        selectedFejSaruId,
        setSelectedFejSaruId,
        saruSpecs,
        selectedSaruSpecId,
        setSelectedSaruSpecId,
        orders,
        selectedOrderId,
        setSelectedOrderId,
        notes,
        selectedNoteId,
        setSelectedNoteId,
        getNotesForProduct,
        getNextNoteId,
        addNote,
        updateNote,
        deleteNote,
        exportNotesCsv,
        importNotesCsvText,
        getSaruSpecForProduct,
        getAllSaruSpecsForProduct,
        addOrder,
        updateOrder,
        deleteOrder,
        getNextOrderId,
        getAllRelatedProductIds,
        getProductOrders,
        getRelatedProductOrders,
        getProductOrderSummary,
        exportOrdersCsv,
        importOrdersCsvText,
        getProductTotalStock,
        getProductNewStock,
        getProductUsedStock,
        getProductStockBreakdown,
        getProductPositions,
        getUnifiedPositions,
        getPositionProducts,
        getPositionTotalItems,
        getNextTransactionId,
        getProductInspections,
        getProductAsReplacedItemInspections,
        getNextInspectionId,
        getConnectedKonSar,
        getNextKonSarId,
        getConnectedTermMerod,
        getNextTermMerodId,
        getConnectedBeepulo,
        getNextBeepuloId,
        getConnectedFejSaru,
        getNextFejSaruId,
        setActiveTab,
        setViewMode,
        selectProductById,
        clearSelectedProduct,
        setSelectedPositionId,
        selectPositionById,
        clearSelectedPosition,
        setSelectedInspectionId,
        setFilters,
        updateFilter,
        toggleFilterItem,
        setFilterItems,
        clearFilterKey,
        filterByValue,
        resetFilters,
        syncWithGoogleSheet,
        importCsvText,
        importPositionsCsvText,
        importInventoryCsvText,
        importInspectionsCsvText,
        importKanbanCsvText,
        importKonSarCsvText,
        importTermMerodCsvText,
        exportCsv,
        exportPositionsCsv,
        exportInventoryCsv,
        exportInspectionsCsv,
        exportKanbanCsv,
        exportKonSarCsv,
        exportTermMerodCsv,
        exportBeepuloCsv,
        importBeepuloCsvText,
        exportFejSaruCsv,
        importFejSaruCsvText,
        exportSaruSpecsCsv,
        importSaruSpecsCsvText,
        isFirebaseConnected,
        isFirebaseLoading,
        firebaseError,
        firebaseSyncTime,
        firebaseStats,
        isQuotaExhausted: isQuotaExhaustedState,
        retryQuotaConnection,
        upgradeConsoleUrl: getQuotaUpgradeUrl(),
        migrateToFirebase,
        refreshFromFirebase,
        exportFullBackupJson,
        importFullBackupJson,
        addProduct,
        updateProduct,
        deleteProduct,
        setSheetUrl,
        addPosition,
        updatePosition,
        deletePosition,
        addInventoryRecord,
        updateInventoryRecord,
        deleteInventoryRecord,
        adjustStock,
        recordTransaction,
        addInspection,
        updateInspection,
        deleteInspection,
        addKanbanItem,
        updateKanbanItem,
        deleteKanbanItem,
        moveKanbanItem,
        clearKanban,
        getNextKanbanId,
        addKonSarRelation,
        deleteKonSarRelation,
        addTermMerodRelation,
        deleteTermMerodRelation,
        addBeepuloRelation,
        deleteBeepuloRelation,
        addFejSaruRelation,
        deleteFejSaruRelation,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};


export interface Product {
  id: string; // Termék ID (Kulcs, pl. 40107.00.33, ME.911330114)
  name: string; // Termék név (pl. N1, ELSŐ MOZGÓ ÜLLŐ)
  description?: string; // Leírás
  image?: string; // Image link / útvonal
  category?: string; // Kategória (pl. Saruzófej, Saruzófej Alkatrész)
  manufacturer?: string; // Gyártó (pl. Mecal, Kormak)
  dosage?: string; // Adagolás (pl. Oldal, Hátsó)
  partType?: string; // Alkatrész Típus (pl. MOZGÓ ÜLLŐ, FIX ÜLLŐ)
  insulationType?: string; // Szigelés Típus (pl. Nem Gumis, Gumis)
  factoryCode?: string; // Gyári Kód (pl. MLS0185-J, 911330114)
  insulationGripperType?: string; // Szigetelésmegfogó Típusa (pl. F, O)
  connectorType?: string; // Konektor Típusa
  terminalType?: string; // Saru Típusa
  date?: string; // Date (pl. 2024. 09. 01.)
  quality?: string; // Minőség (pl. Új)
  location?: string; // Alkatrész Hely (pl. Alkatrész A1, A1-B)
  stock?: number; // Raktárkészlet
  minStock?: number; // Min. készlet
  customFields?: Record<string, string>; // Bármilyen egyéb oszlop a táblázatból
}

export interface WarehousePosition {
  id: string; // Pozíció ID (egyedi saját kulcs, pl. POS-001, A-01-01)
  name: string; // Pozíció név (pl. Alkatrész A1, Polc C1 - Saruzófej, Rekesz D2)
  description?: string; // Opcionális megjegyzés / zóna
}

export interface InventoryTransaction {
  id: string; // Tranzakció ID (egyedi saját kulcs, pl. TRX-001, TRX-1002)
  positionId: string; // Pozíció ID (hivatkozik a Positions munkalapra)
  productId: string; // Termék ID (hivatkozik a Productions / Termékek munkalapra)
  quantity: number; // Mennyiség (+/- darabszámot jelöl)
  date?: string; // Dátum / időpont (pl. 2024-09-01 14:30)
  note?: string; // Mozgás megnevezése / megjegyzés
}

// Alias for backwards compatibility
export type InventoryRecord = InventoryTransaction;

export interface ProductStockPosition {
  positionId: string;
  positionName: string;
  quantity: number;
  newQuantity: number;
  usedQuantity: number;
  records: InventoryTransaction[];
}

export interface FilterState {
  searchQuery: string;
  category: string;
  categories: string[]; // multi-select filter
  manufacturer: string;
  manufacturers: string[]; // multi-select filter
  partType: string;
  partTypes: string[]; // multi-select filter
  insulationType: string;
  insulationTypes: string[]; // multi-select filter
  insulationGripperType: string;
  quality: string;
  location: string;
  locations: string[]; // multi-select filter
  hasImageOnly: boolean;
  conditionFilter?: 'all' | 'new' | 'used' | 'both'; // Állapot szűrő (Összes, Csak Új, Csak Használt H_, Mindkettő van)
  sortBy: 'id' | 'name' | 'category' | 'manufacturer' | 'factoryCode' | 'date';
  sortOrder: 'asc' | 'desc';
}

export type ViewMode = 'table' | 'grid';
export type ActiveTab =
  | 'dashboard'
  | 'inventory'
  | 'positions'
  | 'inspections'
  | 'kanban'
  | 'konsar'
  | 'termmerod'
  | 'beepulo'
  | 'fejsaru'
  | 'saruspecs'
  | 'rendeles'
  | 'detail'
  | 'scanner'
  | 'sync'
  | 'settings';

export interface Order {
  id: string; // Belső egyedi azonosító vagy rendelesId
  rendelesId: string; // Rendelés ID (pl. REND-001)
  termekId: string; // Termék ID
  statusz: string; // Státusz (pl. Megrendelve, Raktárban, Folyamatban, Tervezett)
  datum: string; // Dátum (rögzítés ideje)
  datumMegrendelve: string; // Dátum Megrendelve
  datumRaktarban: string; // Dátum Raktárban
  mennyiseg?: number | string; // Mennyiség (db)
  megjegyzes?: string; // Megjegyzés / Leírás
  beszallito?: string; // Beszállító neve / kódja
  customFields?: Record<string, string>;
}

export type KanbanStatus = 'Terv' | 'Folyamatban' | 'Teszt' | 'Befejezve';

export interface KanbanItem {
  id: string; // Dynamic unique key (e.g. KB-001 or UUID)
  title: string; // Title / Feladat címe
  description?: string; // Description / Részletes leírás
  productId?: string; // ProductId / Kapcsolódó Termék ID
  status: KanbanStatus | string; // Status: 'Terv' | 'Folyamatban' | 'Teszt' | 'Befejezve'
  priority?: 'low' | 'medium' | 'high' | 'urgent' | 'Alacsony' | 'Normál' | 'Magas' | 'Kritikus' | string; // Priority / Prioritás
  assignee?: string; // Assignee / Felelős
  dueDate?: string; // DueDate / Határidő
  quantity?: number | string; // Quantity / Mennyiség (db)
  createdAt?: string; // CreatedAt / Létrehozás időpontja
  updatedAt?: string; // UpdatedAt / Utolsó módosítás időpontja
  tags?: string[]; // Címkék (opcionális)
  customFields?: Record<string, string>;
}

export const SARU_CROSS_SECTIONS = [
  '0.25',
  '0.35',
  '0.50',
  '0.75',
  '1.00',
  '1.50',
  '2.00',
  '2.50',
  '3.00',
  '4.00',
  '5.00',
  '6.00',
] as const;

export type SaruCrossSection = typeof SARU_CROSS_SECTIONS[number];

export interface SaruSpec {
  id: string; // Azonosító
  productId: string; // CEL KÓD / Termék ID (B oszlop, pl. 2122120091)
  factoryCode?: string; // Gyári kód / Saru kód (A oszlop, pl. 1718760)
  note?: string; // Megjegyzés mező (C oszlop értéke)
  saruLocation?: string; // Saru hely (D oszlop, pl. T13)
  feederTool?: string; // Saruzó fej (E oszlop, pl. N°79)
  feederLocation?: string; // Saruzó fej hely (F oszlop, pl. C4)
  row1Beallitas?: Record<string, string>; // 1. sor (I-U oszlopok): Beállítás értéke (0.25..6.00)
  row2Magassag?: Record<string, string>; // 2. sor (W-AI oszlopok): Sarumagasság értéke (0.25..6.00)
  row3KeresztmetszetMegjegyzes?: Record<string, string>; // 3. sor (AJ-AV oszlopok): Esetleges megjegyzések az adott keresztmetszethez (0.25..6.00)
  row2Vezetek?: Record<string, string>; // Kompatibilitási mező (keresztmetszet megjegyzés/vezeték)
  row3Magassag?: Record<string, string>; // Kompatibilitási mező (magasság)
  customFields?: Record<string, string>;
}

export interface KonSarRelation {
  id: string; // Kapcsolat ID (egyedi kulcs, pl. 1dd639fe)
  productId1: string; // Termék ID 1 (Konnektor vagy Saru)
  productId2: string; // Termék ID 2 (Saru vagy Konnektor)
  customFields?: Record<string, string>;
}

export interface TermMerodRelation {
  id: string; // Kapcsolat ID (egyedi kulcs, pl. tm-001 vagy generált ID)
  productId1: string; // Termék ID 1 (Termék)
  productId2: string; // Termék ID 2 (Mérődoboz)
  customFields?: Record<string, string>;
}

export interface BeepuloRelation {
  id: string; // Kapcsolat ID (egyedi kulcs, pl. bp-001 vagy generált ID)
  productId1: string; // Főtermék ID (Termék, amibe az alkatrész beépül)
  productId2: string; // Beépülő alkatrész ID (Alkatrész Termék ID)
  quantity?: number; // Mennyiség (db)
  note?: string; // Megjegyzés / Pozíció a termékben
  customFields?: Record<string, string>;
}

export interface FejSaruRelation {
  id: string; // Kapcsolat ID (egyedi kulcs, pl. fs-001 vagy generált ID)
  productId1: string; // Saruzófej ID (Fej)
  productId2: string; // Saru ID
  note?: string; // Megjegyzés / Huzal keresztmetszet / specifikáció
  customFields?: Record<string, string>;
}

export interface Inspection {
  id: string; // Inspection ID (egyedi kulcs, pl. INSP-001, INSP-2024-001) - táblázatban nem jelenik meg oszlopként
  productId: string; // Termék ID (hivatkozik a karbantartott termékre)
  status: string; // Status (Állapot / Státusz, pl. Befejezve, Folyamatban, Alkatrész cserélve, Esedékes, Hibás)
  description?: string; // Leírás
  changeItem?: string; // Change Item (Cserélt alkatrész termék ID - ha van, linkként nyílik meg)
  date?: string; // Date (Dátum, pl. 2024. 09. 15. vagy 2024-09-15)
  customFields?: Record<string, string>;
}

export interface SyncConfig {
  sheetUrl: string;
  autoSync: boolean;
  lastSyncedAt?: string;
  rowCount: number;
}

import Papa from 'papaparse';
import JSZip from 'jszip';
import { NOTE_HYPERLINKS_MAP, getNotePageCount } from '../data/noteHyperlinksMap';
import {
  Product,
  WarehousePosition,
  InventoryTransaction,
  Inspection,
  KonSarRelation,
  TermMerodRelation,
  BeepuloRelation,
  FejSaruRelation,
  SaruSpec,
  SARU_CROSS_SECTIONS,
  KanbanItem,
  KanbanStatus,
  Order,
  ProductNote,
} from '../types';
import { getBaseProductId } from '../utils/productUtils';

export const DEFAULT_GOOGLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/11AeIQrodsaICM3_P6VRQm7bShU5dMfjw/edit?usp=sharing&ouid=112333423231922049269&rtpof=true&sd=true';

export const DEFAULT_GOOGLE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/11AeIQrodsaICM3_P6VRQm7bShU5dMfjw/gviz/tq?tqx=out:csv&sheet=Products';

import { resolveDriveImageUrl } from './driveImageService';

/**
 * Normalizes an image url or relative path using Google Drive mapping
 */
export function resolveImageUrl(imagePath?: string, productId?: string): string | undefined {
  return resolveDriveImageUrl(imagePath, productId);
}

/**
 * Parses raw CSV text into Product array matching exact Google Sheet columns
 */
export function parseProductsCsv(csvText: string): Product[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const products: Product[] = [];

  for (const row of parsed.data) {
    // Find Termék ID column (handle possible quote variations or whitespace)
    const idKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes('termék id') || k.toLowerCase() === 'id' || k.toLowerCase().includes('termek id')
    );
    const rawId = (idKey ? row[idKey] : row['Termék ID'] || row['Termek ID'] || '')?.trim() || '';

    // Strip leading quotes if sheet exported like '""40107.00.33'
    const id = rawId.replace(/^["']+|["']+$/g, '').trim();
    if (!id) continue;

    const name = (row['Termék név'] || row['Termek nev'] || row['Name'] || row['name'] || '').trim();
    const description = (row['Leírás'] || row['Leiras'] || row['Description'] || '').trim();
    const image = (row['Image'] || row['image'] || row['Kép'] || '').trim();
    const category = (row['Kategória'] || row['Kategoria'] || row['Category'] || '').trim();
    const manufacturer = (row['Gyártó'] || row['Gyarto'] || row['Manufacturer'] || '').trim();
    const dosage = (row['Adagolás'] || row['Adagolas'] || '').trim();
    const partType = (row['Alkatrész Típus'] || row['Alkatresz Tipus'] || '').trim();
    const insulationType = (row['Szigelés Típus'] || row['Szigetelés Típus'] || row['Szigeteles Tipus'] || '').trim();
    const factoryCode = (row['Gyári Kód'] || row['Gyari Kod'] || row['Gyári kód'] || '').trim();
    const insulationGripperType = (row['Szigetelésmegfogó Típusa'] || row['Szigetelesmegfogo Tipusa'] || '').trim();
    const connectorType = (row['Konektor Típusa'] || row['Konektor Tipusa'] || '').trim();
    const terminalType = (row['Saru Típusa'] || row['Saru Tipusa'] || '').trim();
    const date = (row['Date'] || row['Dátum'] || '').trim();
    const quality = (row['Minőség'] || row['Minoseg'] || '').trim();
    const location = (row['Alkatrész Hely'] || row['Hely'] || row['Location'] || '').trim();

    // Any remaining custom fields
    const standardKeys = new Set([
      'Termék ID',
      'Termek ID',
      'Termék név',
      'Termek nev',
      'Leírás',
      'Leiras',
      'Image',
      'Kategória',
      'Kategoria',
      'Gyártó',
      'Gyarto',
      'Adagolás',
      'Adagolas',
      'Alkatrész Típus',
      'Alkatresz Tipus',
      'Szigelés Típus',
      'Szigetelés Típus',
      'Szigeteles Tipus',
      'Gyári Kód',
      'Gyari Kod',
      'Szigetelésmegfogó Típusa',
      'Konektor Típusa',
      'Saru Típusa',
      'Date',
      'Minőség',
      'Minoseg',
      'Alkatrész Hely',
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!standardKeys.has(key) && key.trim() && val && val.trim() && !key.toLowerCase().includes('termék id')) {
        customFields[key.trim()] = val.trim();
      }
    }

    products.push({
      id,
      name: name || id,
      description: description || undefined,
      image: image || undefined,
      category: category || undefined,
      manufacturer: manufacturer || undefined,
      dosage: dosage || undefined,
      partType: partType || undefined,
      insulationType: insulationType || undefined,
      factoryCode: factoryCode || undefined,
      insulationGripperType: insulationGripperType || undefined,
      connectorType: connectorType || undefined,
      terminalType: terminalType || undefined,
      date: date || undefined,
      quality: quality || undefined,
      location: location || undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return products;
}

/**
 * Parses raw CSV text into WarehousePosition array (Positions worksheet)
 * Expected columns: Pozíció ID, Pozíció név
 */
export function parsePositionsCsv(csvText: string): WarehousePosition[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const positions: WarehousePosition[] = [];

  for (const row of parsed.data) {
    const idKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes('pozíció id') || k.toLowerCase().includes('pozicio id') || k.toLowerCase() === 'position id' || k.toLowerCase() === 'id'
    );
    const rawId = (idKey ? row[idKey] : row['Pozíció ID'] || row['Pozicio ID'] || row['Position ID'] || '')?.trim() || '';
    const id = rawId.replace(/^["']+|["']+$/g, '').trim();
    if (!id) continue;

    const nameKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes('pozíció név') || k.toLowerCase().includes('pozicio nev') || k.toLowerCase() === 'position name' || k.toLowerCase() === 'name' || k.toLowerCase().includes('név')
    );
    const name = (nameKey ? row[nameKey] : row['Pozíció név'] || row['Pozicio nev'] || row['Position Name'] || id)?.trim() || id;

    const descKey = Object.keys(row).find(
      (k) => k.toLowerCase().includes('leírás') || k.toLowerCase().includes('leiras') || k.toLowerCase().includes('description') || k.toLowerCase().includes('zóna')
    );
    const description = (descKey ? row[descKey] : row['Leírás'] || row['Description'] || '')?.trim() || undefined;

    positions.push({
      id,
      name,
      description,
    });
  }

  return positions;
}

/**
 * Parses raw CSV text into InventoryTransaction array (Inventory Transactions worksheet)
 * Expected columns: Tranzakció ID, Pozíció ID, Termék ID, Mennyiség, Dátum
 */
export function parseInventoryCsv(csvText: string): InventoryTransaction[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const records: InventoryTransaction[] = [];

  for (const row of parsed.data) {
    // Tranzakció ID (also accepts Inventory ID / Transaction ID)
    const trxIdKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('tranzakció id') ||
        k.toLowerCase().includes('tranzakcio id') ||
        k.toLowerCase().includes('transaction id') ||
        k.toLowerCase().includes('inventory id') ||
        k.toLowerCase() === 'id'
    );
    const rawId = (trxIdKey ? row[trxIdKey] : row['Tranzakció ID'] || row['Tranzakcio ID'] || row['Inventory ID'] || '')?.trim() || '';
    const id = rawId.replace(/^["']+|["']+$/g, '').trim();
    if (!id) continue;

    // Pozíció ID
    const posIdKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('pozíció id') ||
        k.toLowerCase().includes('pozicio id') ||
        k.toLowerCase() === 'position id' ||
        k.toLowerCase().includes('pozicio')
    );
    const positionId = (posIdKey ? row[posIdKey] : row['Pozíció ID'] || row['Pozicio ID'] || '')?.trim() || '';

    // Termék ID
    const prodIdKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id') ||
        k.toLowerCase().includes('termek id') ||
        k.toLowerCase() === 'product id'
    );
    const productId = (prodIdKey ? row[prodIdKey] : row['Termék ID'] || row['Termek ID'] || '')?.trim() || '';

    // Mennyiség (+/- darabszám)
    const qtyKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('mennyiség') ||
        k.toLowerCase().includes('mennyiseg') ||
        k.toLowerCase().includes('quantity') ||
        k.toLowerCase() === 'qty'
    );
    const rawQty = (qtyKey ? row[qtyKey] : row['Mennyiség'] || row['Mennyiseg'] || '0')?.trim() || '0';
    const cleanQty = rawQty.replace(/[^0-9+-.]/g, '');
    const quantity = parseFloat(cleanQty) || 0;

    // Dátum
    const dateKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('dátum') ||
        k.toLowerCase().includes('datum') ||
        k.toLowerCase() === 'date'
    );
    const date = (dateKey ? row[dateKey] : row['Dátum'] || row['Datum'] || row['Date'] || '')?.trim() || undefined;

    // Opcionális megjegyzés
    const noteKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('megjegyzés') ||
        k.toLowerCase().includes('megjegyzes') ||
        k.toLowerCase().includes('note') ||
        k.toLowerCase().includes('oka')
    );
    const note = (noteKey ? row[noteKey] : row['Megjegyzés'] || row['Megjegyzes'] || row['Note'] || '')?.trim() || undefined;

    records.push({
      id,
      positionId,
      productId,
      quantity,
      date,
      note,
    });
  }

  return records;
}

export const parseInventoryTransactionsCsv = parseInventoryCsv;

/**
 * Parses raw CSV text into Inspection array (Inspections worksheet)
 * Expected columns: Inspection ID (kulcs), Termék ID, Status, Leírás, Change Item, Date
 */
export function parseInspectionsCsv(csvText: string): Inspection[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const inspections: Inspection[] = [];

  for (const row of parsed.data) {
    // Inspection ID (Kulcs, pl. INSP-001)
    const idKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('inspection id') ||
        k.toLowerCase().includes('ellenőrzés id') ||
        k.toLowerCase().includes('karbantartás id') ||
        k.toLowerCase().includes('karbantartas id') ||
        k.toLowerCase() === 'id'
    );
    const rawId = (idKey ? row[idKey] : row['Inspection ID'] || row['Inspection id'] || '')?.trim() || '';
    const id = rawId.replace(/^["']+|["']+$/g, '').trim();
    if (!id) continue;

    // Termék ID
    const prodIdKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id') ||
        k.toLowerCase().includes('termek id') ||
        k.toLowerCase() === 'product id' ||
        k.toLowerCase().includes('gép id') ||
        k.toLowerCase().includes('gep id')
    );
    const productId = (prodIdKey ? row[prodIdKey] : row['Termék ID'] || row['Termek ID'] || '')?.trim() || '';
    if (!productId) continue;

    // Status
    const statusKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('status') ||
        k.toLowerCase().includes('státusz') ||
        k.toLowerCase().includes('statusz') ||
        k.toLowerCase().includes('állapot') ||
        k.toLowerCase().includes('allapot')
    );
    const status = (statusKey ? row[statusKey] : row['Status'] || row['Státusz'] || row['Állapot'] || 'Befejezve')?.trim() || 'Befejezve';

    // Leírás
    const descKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('leírás') ||
        k.toLowerCase().includes('leiras') ||
        k.toLowerCase().includes('description') ||
        k.toLowerCase().includes('megjegyzés') ||
        k.toLowerCase().includes('megjegyzes')
    );
    const description = (descKey ? row[descKey] : row['Leírás'] || row['Leiras'] || row['Description'] || '')?.trim() || undefined;

    // Change Item
    const changeKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('change item') ||
        k.toLowerCase().includes('change_item') ||
        k.toLowerCase().includes('changeitem') ||
        k.toLowerCase().includes('cserélt') ||
        k.toLowerCase().includes('cserelt') ||
        k.toLowerCase().includes('csere alkatrész') ||
        k.toLowerCase().includes('csere termék')
    );
    const changeItem = (changeKey ? row[changeKey] : row['Change Item'] || row['Change item'] || row['Cserélt alkatrész'] || '')?.trim() || undefined;

    // Date
    const dateKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('date') ||
        k.toLowerCase().includes('dátum') ||
        k.toLowerCase().includes('datum') ||
        k.toLowerCase().includes('időpont')
    );
    const date = (dateKey ? row[dateKey] : row['Date'] || row['Dátum'] || '')?.trim() || undefined;

    // Any remaining custom fields
    const standardKeys = new Set([
      'Inspection ID',
      'Inspection id',
      'inspection id',
      'Termék ID',
      'Termek ID',
      'Product ID',
      'product id',
      'Status',
      'status',
      'Státusz',
      'statusz',
      'Állapot',
      'allapot',
      'Leírás',
      'Leiras',
      'Description',
      'description',
      'Change Item',
      'change item',
      'Change item',
      'Cserélt alkatrész',
      'Date',
      'date',
      'Dátum',
      'datum',
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!standardKeys.has(key) && key.trim() && val && val.trim()) {
        customFields[key.trim()] = val.trim();
      }
    }

    inspections.push({
      id,
      productId,
      status,
      description,
      changeItem,
      date,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return inspections;
}

/**
 * Extracts Google Sheet ID from URL
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Fetches products from Google Sheet URL
 */
export async function fetchProductsFromGoogleSheet(sheetUrl?: string): Promise<Product[]> {
  let targetUrl = sheetUrl || DEFAULT_GOOGLE_SHEET_CSV_URL;

  if (targetUrl.includes('/edit') || !targetUrl.includes('export') && !targetUrl.includes('gviz')) {
    const sheetId = extractSheetId(targetUrl);
    if (sheetId) {
      targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Products`;
    }
  }

  try {
    const response = await fetch(targetUrl);
    if (!response.ok) {
      // Try fallback to Productions sheet
      const sheetId = extractSheetId(targetUrl);
      if (sheetId) {
        const altUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Productions`;
        const altRes = await fetch(altUrl);
        if (altRes.ok) {
          const csvText = await altRes.text();
          return parseProductsCsv(csvText);
        }
      }
      throw new Error(`Google Sheets letöltési hiba: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    return parseProductsCsv(csvText);
  } catch (err) {
    // If specific sheet name failed, try standard default sheet
    const sheetId = extractSheetId(targetUrl);
    if (sheetId) {
      const fallbackUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const fbRes = await fetch(fallbackUrl);
      if (fbRes.ok) {
        const text = await fbRes.text();
        return parseProductsCsv(text);
      }
    }
    throw err;
  }
}

/**
 * Fetches Positions from Google Sheet (Positions worksheet)
 */
export async function fetchPositionsFromGoogleSheet(sheetUrl?: string): Promise<WarehousePosition[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Positions`;
  try {
    const response = await fetch(targetUrl);
    if (!response.ok) return [];
    const csvText = await response.text();
    return parsePositionsCsv(csvText);
  } catch {
    return [];
  }
}

/**
 * Fetches Inventory Transactions from Google Sheet (Inventory Transactions / Inventory worksheet)
 */
export async function fetchInventoryFromGoogleSheet(sheetUrl?: string): Promise<InventoryTransaction[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  // Try "Inventory Transactions" sheet first
  const trySheets = ['Inventory Transactions', 'Inventory_Transactions', 'InventoryTransactions', 'Inventory'];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseInventoryCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Converts products back into Google Sheets formatted CSV string
 */
export function exportProductsToCsv(products: Product[]): string {
  const rows = products.map((p) => {
    const rowObj: Record<string, string> = {
      'Termék ID': p.id,
      'Termék név': p.name,
      'Leírás': p.description || '',
      'Image': p.image || '',
      'Kategória': p.category || '',
      'Gyártó': p.manufacturer || '',
      'Adagolás': p.dosage || '',
      'Alkatrész Típus': p.partType || '',
      'Szigelés Típus': p.insulationType || '',
      'Gyári Kód': p.factoryCode || '',
      'Szigetelésmegfogó Típusa': p.insulationGripperType || '',
      'Konektor Típusa': p.connectorType || '',
      'Saru Típusa': p.terminalType || '',
      'Date': p.date || '',
      'Minőség': p.quality || '',
      'Alkatrész Hely': p.location || '',
    };

    if (p.customFields) {
      for (const [k, v] of Object.entries(p.customFields)) {
        rowObj[k] = v;
      }
    }

    return rowObj;
  });

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Converts positions back into Positions Google Sheets formatted CSV string
 */
export function exportPositionsToCsv(positions: WarehousePosition[]): string {
  const rows = positions.map((pos) => ({
    'Pozíció ID': pos.id,
    'Pozíció név': pos.name,
    'Leírás': pos.description || '',
  }));

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Converts inventory transactions back into Inventory Transactions Google Sheets formatted CSV string
 * Columns: Tranzakció ID, Pozíció ID, Termék ID, Mennyiség, Dátum
 */
export function exportInventoryToCsv(records: InventoryTransaction[]): string {
  const rows = records.map((rec) => ({
    'Tranzakció ID': rec.id,
    'Pozíció ID': rec.positionId,
    'Termék ID': rec.productId,
    'Mennyiség': String(rec.quantity),
    'Dátum': rec.date || '',
    'Megjegyzés': rec.note || '',
  }));

  return Papa.unparse(rows, {
    quotes: true,
  });
}

export const exportInventoryTransactionsToCsv = exportInventoryToCsv;

/**
 * Fetches Inspections from Google Sheet (Inspections worksheet)
 */
export async function fetchInspectionsFromGoogleSheet(sheetUrl?: string): Promise<Inspection[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = ['Inspections', 'Inspection', 'Karbantartás', 'Karbantartások', 'Karbantartasok', 'Maintenance'];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseInspectionsCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Converts inspections back into Inspections Google Sheets formatted CSV string
 * Columns: Inspection ID, Termék ID, Status, Leírás, Change Item, Date
 */
export function exportInspectionsToCsv(inspections: Inspection[]): string {
  const rows = inspections.map((insp) => {
    const rowObj: Record<string, string> = {
      'Inspection ID': insp.id,
      'Termék ID': insp.productId,
      'Status': insp.status || 'Befejezve',
      'Leírás': insp.description || '',
      'Change Item': insp.changeItem || '',
      'Date': insp.date || '',
    };

    if (insp.customFields) {
      for (const [k, v] of Object.entries(insp.customFields)) {
        rowObj[k] = v;
      }
    }

    return rowObj;
  });

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Parses raw CSV text into KonSarRelation array (KonSar worksheet - Konnektor-Saru kapcsolatok)
 * Expected columns: Kapcsolat ID, Termék ID 1, Termék ID 2
 */
export function parseKonSarCsv(csvText: string): KonSarRelation[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const relations: KonSarRelation[] = [];

  for (const row of parsed.data) {
    // Kapcsolat ID (pl. 1dd639fe)
    const idKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('kapcsolat id') ||
        k.toLowerCase().includes('kapcsolat_id') ||
        k.toLowerCase().includes('relation id') ||
        k.toLowerCase() === 'id'
    );
    const rawId = (idKey ? row[idKey] : row['Kapcsolat ID'] || row['Kapcsolat id'] || '')?.trim() || '';
    const id = rawId.replace(/^["']+|["']+$/g, '').trim();
    if (!id) continue;

    // Termék ID 1
    const p1Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id 1') ||
        k.toLowerCase().includes('termek id 1') ||
        k.toLowerCase().includes('product id 1') ||
        k.toLowerCase() === 'termék 1' ||
        k.toLowerCase() === 'termek 1'
    );
    const productId1 = (p1Key ? row[p1Key] : row['Termék ID 1'] || row['Termek ID 1'] || '')?.trim() || '';
    if (!productId1) continue;

    // Termék ID 2
    const p2Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id 2') ||
        k.toLowerCase().includes('termek id 2') ||
        k.toLowerCase().includes('product id 2') ||
        k.toLowerCase() === 'termék 2' ||
        k.toLowerCase() === 'termek 2'
    );
    const productId2 = (p2Key ? row[p2Key] : row['Termék ID 2'] || row['Termek ID 2'] || '')?.trim() || '';
    if (!productId2) continue;

    // Custom fields
    const standardKeys = new Set([
      'Kapcsolat ID',
      'Kapcsolat id',
      'kapcsolat id',
      'Termék ID 1',
      'Termek ID 1',
      'Product ID 1',
      'Termék ID 2',
      'Termek ID 2',
      'Product ID 2',
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!standardKeys.has(key) && key.trim() && val && val.trim()) {
        customFields[key.trim()] = val.trim();
      }
    }

    relations.push({
      id,
      productId1,
      productId2,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return relations;
}

/**
 * Fetches KonSar relations from Google Sheet (KonSar worksheet)
 */
export async function fetchKonSarFromGoogleSheet(sheetUrl?: string): Promise<KonSarRelation[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = ['KonSar', 'Konsar', 'Kon_Sar', 'Konnektor Saru', 'Konnektor-Saru'];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseKonSarCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Converts KonSar relations back into Google Sheets formatted CSV string
 * Columns: Kapcsolat ID, Termék ID 1, Termék ID 2
 */
export function exportKonSarToCsv(relations: KonSarRelation[]): string {
  const rows = relations.map((rel) => {
    const rowObj: Record<string, string> = {
      'Kapcsolat ID': rel.id,
      'Termék ID 1': rel.productId1,
      'Termék ID 2': rel.productId2,
    };

    if (rel.customFields) {
      for (const [k, v] of Object.entries(rel.customFields)) {
        rowObj[k] = v;
      }
    }

    return rowObj;
  });

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Parses raw CSV text into TermMerodRelation array (TermMerod / Termék - Mérődoboz worksheet)
 * Expected columns: Kapcsolat ID / ID, Termék ID 1 / Termék ID, Termék ID 2 / Mérődoboz ID
 */
export function parseTermMerodCsv(csvText: string): TermMerodRelation[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const relations: TermMerodRelation[] = [];

  for (const row of parsed.data) {
    // Kapcsolat ID
    const idKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('kapcsolat id') ||
        k.toLowerCase().includes('kapcsolat') ||
        k.toLowerCase() === 'id' ||
        k.toLowerCase().includes('relation id') ||
        k.toLowerCase().includes('termmerod id')
    );
    const rawId = (idKey ? row[idKey] : row['Kapcsolat ID'] || row['ID'] || '')?.trim() || '';
    const id = rawId.replace(/^["']+|["']+$/g, '').trim();
    if (!id) continue;

    // Termék ID (Termék ID 1)
    const p1Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id 1') ||
        k.toLowerCase().includes('termek id 1') ||
        k.toLowerCase().includes('product id 1') ||
        k.toLowerCase() === 'termék id' ||
        k.toLowerCase() === 'termek id' ||
        k.toLowerCase() === 'termék' ||
        k.toLowerCase() === 'termek'
    );
    const productId1 = (p1Key ? row[p1Key] : row['Termék ID 1'] || row['Termék ID'] || row['Termek ID 1'] || '')?.trim() || '';
    if (!productId1) continue;

    // Mérődoboz ID (Termék ID 2)
    const p2Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id 2') ||
        k.toLowerCase().includes('termek id 2') ||
        k.toLowerCase().includes('product id 2') ||
        k.toLowerCase().includes('mérődoboz') ||
        k.toLowerCase().includes('merodoboz') ||
        k.toLowerCase().includes('doboz id') ||
        k.toLowerCase() === 'mérődoboz id' ||
        k.toLowerCase() === 'merodoboz id'
    );
    const productId2 = (p2Key ? row[p2Key] : row['Termék ID 2'] || row['Mérődoboz ID'] || row['Merodoboz ID'] || '')?.trim() || '';
    if (!productId2) continue;

    // Custom fields
    const standardKeys = new Set([
      'Kapcsolat ID',
      'Kapcsolat id',
      'kapcsolat id',
      'ID',
      'id',
      'Termék ID 1',
      'Termek ID 1',
      'Product ID 1',
      'Termék ID',
      'Termek ID',
      'Termék ID 2',
      'Termek ID 2',
      'Product ID 2',
      'Mérődoboz ID',
      'Merodoboz ID',
      'Mérődoboz',
      'Merodoboz',
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!standardKeys.has(key) && key.trim() && val && val.trim()) {
        customFields[key.trim()] = val.trim();
      }
    }

    relations.push({
      id,
      productId1,
      productId2,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return relations;
}

/**
 * Fetches TermMerod relations from Google Sheet (TermMerod worksheet)
 */
export async function fetchTermMerodFromGoogleSheet(sheetUrl?: string): Promise<TermMerodRelation[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = [
    'TermMerod',
    'Termmerod',
    'Term_Merod',
    'Termék Mérődoboz',
    'Termek Merodoboz',
    'Termék-Mérődoboz',
    'Termek-Merodoboz',
    'Merodoboz',
    'Mérődoboz',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseTermMerodCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Converts TermMerod relations back into Google Sheets formatted CSV string
 * Columns: Kapcsolat ID, Termék ID 1, Termék ID 2
 */
export function exportTermMerodToCsv(relations: TermMerodRelation[]): string {
  const rows = relations.map((rel) => {
    const rowObj: Record<string, string> = {
      'Kapcsolat ID': rel.id,
      'Termék ID 1': rel.productId1,
      'Termék ID 2': rel.productId2,
    };

    if (rel.customFields) {
      for (const [k, v] of Object.entries(rel.customFields)) {
        rowObj[k] = v;
      }
    }

    return rowObj;
  });

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Parses raw CSV text into BeepuloRelation array (Beépülő alkatrész worksheet)
 * Expected columns: Kapcsolat ID / ID, Főtermék ID / Termék ID / Termék ID 1, Beépülő Termék ID / Alkatrész ID / Termék ID 2, Mennyiség, Megjegyzés
 */
export function parseBeepuloCsv(csvText: string): BeepuloRelation[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const relations: BeepuloRelation[] = [];

  for (const row of parsed.data) {
    // Kapcsolat ID
    const idKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('kapcsolat id') ||
        k.toLowerCase().includes('beepulo id') ||
        k.toLowerCase().includes('beépülő id') ||
        k.toLowerCase() === 'id' ||
        k.toLowerCase().includes('relation id')
    );
    const rawId = (idKey ? row[idKey] : row['Kapcsolat ID'] || row['ID'] || '')?.trim() || '';
    const id = (rawId.replace(/^["']+|["']+$/g, '').trim()) || `bp-${Math.random().toString(16).substring(2, 8)}`;

    // Főtermék ID (Termék, amibe beépül)
    const p1Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('főtermék') ||
        k.toLowerCase().includes('fotermek') ||
        k.toLowerCase().includes('termék id 1') ||
        k.toLowerCase().includes('termek id 1') ||
        k.toLowerCase().includes('parent id') ||
        k.toLowerCase().includes('parent') ||
        k.toLowerCase() === 'termék id' ||
        k.toLowerCase() === 'termek id' ||
        k.toLowerCase() === 'termék' ||
        k.toLowerCase() === 'termek'
    );
    const rawP1 = (p1Key ? row[p1Key] : row['Főtermék ID'] || row['Termék ID 1'] || row['Termék ID'] || '')?.trim() || '';
    const productId1 = getBaseProductId(rawP1);
    if (!productId1) continue;

    // Beépülő Termék ID (Alkatrész, ami beépül)
    const p2Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('beépülő termék') ||
        k.toLowerCase().includes('beepulo termek') ||
        k.toLowerCase().includes('beépülő alkatrész') ||
        k.toLowerCase().includes('beepulo alkatresz') ||
        k.toLowerCase().includes('beépülő id') ||
        k.toLowerCase().includes('beepulo id') ||
        k.toLowerCase().includes('beépülő') ||
        k.toLowerCase().includes('beepulo') ||
        k.toLowerCase().includes('alkatrész id') ||
        k.toLowerCase().includes('alkatresz id') ||
        k.toLowerCase().includes('alkatrész') ||
        k.toLowerCase().includes('alkatresz') ||
        k.toLowerCase().includes('termék id 2') ||
        k.toLowerCase().includes('termek id 2') ||
        k.toLowerCase().includes('child id') ||
        k.toLowerCase().includes('component')
    );
    const rawP2 = (p2Key ? row[p2Key] : row['Beépülő Alkatrész ID'] || row['Alkatrész ID'] || row['Termék ID 2'] || '')?.trim() || '';
    const productId2 = getBaseProductId(rawP2);
    if (!productId2 || productId1.toLowerCase() === productId2.toLowerCase()) continue;

    // Mennyiség (db)
    const qtyKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('mennyiség') ||
        k.toLowerCase().includes('mennyiseg') ||
        k.toLowerCase().includes('quantity') ||
        k.toLowerCase().includes('db') ||
        k.toLowerCase() === 'darab'
    );
    const rawQty = (qtyKey ? row[qtyKey] : row['Mennyiség'] || row['db'] || '1')?.trim();
    const cleanQty = rawQty ? parseFloat(rawQty.replace(/[^0-9.]/g, '')) : 1;
    const quantity = !isNaN(cleanQty) && cleanQty > 0 ? cleanQty : 1;

    // Megjegyzés / Pozíció
    const noteKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('megjegyzés') ||
        k.toLowerCase().includes('megjegyzes') ||
        k.toLowerCase().includes('leírás') ||
        k.toLowerCase().includes('leiras') ||
        k.toLowerCase().includes('pozíció') ||
        k.toLowerCase().includes('pozicio') ||
        k.toLowerCase().includes('note')
    );
    const note = (noteKey ? row[noteKey] : row['Megjegyzés'] || row['Pozíció'] || '')?.trim() || undefined;

    // Custom fields
    const standardKeys = new Set([
      'Kapcsolat ID',
      'Kapcsolat id',
      'kapcsolat id',
      'ID',
      'id',
      'Főtermék ID',
      'Fotermek ID',
      'Termék ID 1',
      'Termek ID 1',
      'Termék ID',
      'Termek ID',
      'Termék',
      'Termek',
      'Beépülő Alkatrész ID',
      'Beépülő Termék ID',
      'Beepulo Termek ID',
      'Alkatrész ID',
      'Alkatresz ID',
      'Termék ID 2',
      'Termek ID 2',
      'Beépülő',
      'Beepulo',
      'Alkatrész',
      'Alkatresz',
      'Mennyiség',
      'Mennyiseg',
      'db',
      'Quantity',
      'Megjegyzés',
      'Megjegyzes',
      'Pozíció',
      'Pozicio',
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!standardKeys.has(key) && key.trim() && val && val.trim()) {
        customFields[key.trim()] = val.trim();
      }
    }

    relations.push({
      id,
      productId1,
      productId2,
      quantity,
      note,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return relations;
}

/**
 * Fetches Beépülő Alkatrész relations from Google Sheet
 */
export async function fetchBeepuloFromGoogleSheet(sheetUrl?: string): Promise<BeepuloRelation[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = [
    'Beépülő alkatrész',
    'Beépülő alkatrészek',
    'Beepulo alkatresz',
    'Beepulo alkatreszek',
    'Beépülő_alkatrész',
    'Beepulo_alkatresz',
    'Beépülő',
    'Beepulo',
    'BeepuloAlkatresz',
    'BeépülőAlkatrész',
    'Alkatrészek',
    'Alkatreszek',
    'Components',
    'Component',
    'BOM',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseBeepuloCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Converts Beépülő Alkatrész relations back into Google Sheets formatted CSV string
 * Columns: Kapcsolat ID, Főtermék ID, Beépülő Alkatrész ID, Mennyiség, Megjegyzés
 */
export function exportBeepuloToCsv(relations: BeepuloRelation[]): string {
  const rows = relations.map((rel) => {
    const rowObj: Record<string, string> = {
      'Kapcsolat ID': rel.id,
      'Főtermék ID': rel.productId1,
      'Beépülő Alkatrész ID': rel.productId2,
      'Mennyiség': rel.quantity ? String(rel.quantity) : '1',
      'Megjegyzés': rel.note || '',
    };

    if (rel.customFields) {
      for (const [k, v] of Object.entries(rel.customFields)) {
        rowObj[k] = v;
      }
    }

    return rowObj;
  });

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Parses raw CSV text into FejSaruRelation array (FejSaru / Saruzófej - Saru worksheet)
 * Expected columns: Kapcsolat ID / ID, Saruzófej ID / Fej ID / Termék ID 1, Saru ID / Termék ID 2, Megjegyzés
 */
export function parseFejSaruCsv(csvText: string): FejSaruRelation[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const relations: FejSaruRelation[] = [];

  for (const row of parsed.data) {
    // Kapcsolat ID
    const idKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('kapcsolat id') ||
        k.toLowerCase().includes('fejsaru id') ||
        k.toLowerCase().includes('fej_saru id') ||
        k.toLowerCase().includes('fej-saru id') ||
        k.toLowerCase() === 'id' ||
        k.toLowerCase().includes('relation id')
    );
    const rawId = (idKey ? row[idKey] : row['Kapcsolat ID'] || row['ID'] || '')?.trim() || '';
    const id = (rawId.replace(/^["']+|["']+$/g, '').trim()) || `fs-${Math.random().toString(16).substring(2, 8)}`;

    // Saruzófej / Fej ID (Termék ID 1)
    const p1Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('saruzófej id') ||
        k.toLowerCase().includes('saruzofej id') ||
        k.toLowerCase().includes('fej id') ||
        k.toLowerCase().includes('saruzófej') ||
        k.toLowerCase().includes('saruzofej') ||
        k.toLowerCase().includes('fej') ||
        k.toLowerCase().includes('termék id 1') ||
        k.toLowerCase().includes('termek id 1') ||
        k.toLowerCase().includes('product id 1') ||
        k.toLowerCase() === 'termék id' ||
        k.toLowerCase() === 'termek id'
    );
    const rawP1 = (p1Key ? row[p1Key] : row['Saruzófej ID'] || row['Fej ID'] || row['Termék ID 1'] || row['Termék ID'] || '')?.trim() || '';
    const productId1 = getBaseProductId(rawP1);
    if (!productId1) continue;

    // Saru ID (Termék ID 2)
    const p2Key = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('saru id') ||
        k.toLowerCase().includes('sarú id') ||
        k.toLowerCase().includes('terminal id') ||
        k.toLowerCase().includes('saru') ||
        k.toLowerCase().includes('terminal') ||
        k.toLowerCase().includes('termék id 2') ||
        k.toLowerCase().includes('termek id 2') ||
        k.toLowerCase().includes('product id 2')
    );
    const rawP2 = (p2Key ? row[p2Key] : row['Saru ID'] || row['Termék ID 2'] || '')?.trim() || '';
    const productId2 = getBaseProductId(rawP2);
    if (!productId2 || productId1.toLowerCase() === productId2.toLowerCase()) continue;

    // Megjegyzés
    const noteKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('megjegyzés') ||
        k.toLowerCase().includes('megjegyzes') ||
        k.toLowerCase().includes('leírás') ||
        k.toLowerCase().includes('leiras') ||
        k.toLowerCase().includes('keresztmetszet') ||
        k.toLowerCase().includes('specifikáció') ||
        k.toLowerCase().includes('note')
    );
    const note = (noteKey ? row[noteKey] : row['Megjegyzés'] || row['Leírás'] || '')?.trim() || undefined;

    // Custom fields
    const standardKeys = new Set([
      'Kapcsolat ID',
      'Kapcsolat id',
      'kapcsolat id',
      'ID',
      'id',
      'Saruzófej ID',
      'Saruzofej ID',
      'Fej ID',
      'Fej id',
      'Saruzófej',
      'Saruzofej',
      'Fej',
      'Termék ID 1',
      'Termek ID 1',
      'Termék ID',
      'Termek ID',
      'Saru ID',
      'Saru id',
      'Saru',
      'Termék ID 2',
      'Termek ID 2',
      'Megjegyzés',
      'Megjegyzes',
      'Leírás',
      'Leiras',
      'Note',
    ]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!standardKeys.has(key) && key.trim() && val && val.trim()) {
        customFields[key.trim()] = val.trim();
      }
    }

    relations.push({
      id,
      productId1,
      productId2,
      note,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return relations;
}

/**
 * Fetches FejSaru relations from Google Sheet (FejSaru worksheet)
 */
export async function fetchFejSaruFromGoogleSheet(sheetUrl?: string): Promise<FejSaruRelation[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = [
    'FejSaru',
    'Fejsaru',
    'Fej-Saru',
    'Fej_Saru',
    'Fej Saru',
    'Saruzófej-Saru',
    'Saruzofej-Saru',
    'Saruzófej Saru',
    'Saruzofej Saru',
    'Saruzófej_Saru',
    'Saruzofej_Saru',
    'Fejek Saruk',
    'FejSaru kapcsolatok',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseFejSaruCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Converts FejSaru relations back into Google Sheets formatted CSV string
 * Columns: Kapcsolat ID, Saruzófej ID, Saru ID, Megjegyzés
 */
export function exportFejSaruToCsv(relations: FejSaruRelation[]): string {
  const rows = relations.map((rel) => {
    const rowObj: Record<string, string> = {
      'Kapcsolat ID': rel.id,
      'Saruzófej ID': rel.productId1,
      'Saru ID': rel.productId2,
      'Megjegyzés': rel.note || '',
    };

    if (rel.customFields) {
      for (const [k, v] of Object.entries(rel.customFields)) {
        rowObj[k] = v;
      }
    }

    return rowObj;
  });

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Parses CSV text from 'Segédtáblázat 1. Saruk másolata' or standard Saru Spec format
 */
export function parseSaruSpecsCsv(csvText: string): SaruSpec[] {
  const parsed = Papa.parse<string[]>(csvText, {
    skipEmptyLines: false,
  });

  if (!parsed.data || parsed.data.length < 2) return [];

  const crossSections = SARU_CROSS_SECTIONS;
  const specs: SaruSpec[] = [];

  // Default cross section column positions in the 4-row layout
  let csColMap: Record<string, number> = {
    '0.25': 8,
    '0.35': 9,
    '0.50': 10,
    '0.75': 11,
    '1.00': 12,
    '1.50': 14,
    '2.00': 15,
    '2.50': 16,
    '3.00': 17,
    '4.00': 18,
    '5.00': 19,
    '6.00': 20,
  };

  // 1. Check if first few rows contain a header with labeled cross-sections
  let hasCrossSectionHeader = false;
  for (let r = 0; r < Math.min(parsed.data.length, 10); r++) {
    const row = parsed.data[r];
    if (!Array.isArray(row)) continue;

    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('0.25') && rowStr.includes('0.35')) {
      hasCrossSectionHeader = true;
      const foundMap: Record<string, number> = {};
      row.forEach((cell, idx) => {
        const c = cell.trim().replace(',', '.');
        if (crossSections.includes(c as any)) {
          foundMap[c] = idx;
        }
      });
      if (Object.keys(foundMap).length >= 5) {
        csColMap = { ...csColMap, ...foundMap };
        break;
      }
    }
  }

  // 2. Check if CSV is single-row format with header names like "[Beállítás] 0.25"
  const headerRow = parsed.data[0] || [];
  const isFlattenedHeader = headerRow.some((h) => typeof h === 'string' && (h.includes('[Beállítás]') || h.includes('[Magasság')));
  
  // If neither cross-section header nor flattened header is present, this is NOT a Saru Segédtáblázat (e.g. it is Products tab)
  if (!hasCrossSectionHeader && !isFlattenedHeader) {
    return [];
  }
  
  if (isFlattenedHeader) {
    const headerParsed = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    for (const row of headerParsed.data) {
      const celKod = (row['CEL KÓD (Termék ID)'] || row['CEL KÓD'] || row['Termék ID'] || row['productId'] || '').trim();
      const factoryCode = (row['Gyári Kód'] || row['Gyari Kod'] || row['Saru kód'] || row['factoryCode'] || '').trim();
      const note = (row['Megjegyzés'] || row['Megjegyzes'] || row['note'] || '').trim();
      const saruLocation = (row['Saru hely'] || row['saruLocation'] || '').trim();
      const feederTool = (row['Saruzó fej'] || row['Saruzó Fej'] || row['feederTool'] || '').trim();
      const feederLocation = (row['Saruzó fej hely'] || row['Fej hely'] || row['feederLocation'] || '').trim();

      if (!celKod && !factoryCode) continue;

      const row1Beallitas: Record<string, string> = {};
      const row2Magassag: Record<string, string> = {};
      const row3KeresztmetszetMegjegyzes: Record<string, string> = {};

      crossSections.forEach((cs) => {
        row1Beallitas[cs] = (row[`[Beállítás] ${cs}`] || row[`Beallitas_${cs}`] || '').trim();
        row2Magassag[cs] = (row[`[Sarumagasság mm] ${cs}`] || row[`[Magasság mm] ${cs}`] || row[`Magassag_${cs}`] || '').trim();
        row3KeresztmetszetMegjegyzes[cs] = (row[`[Keresztmetszet Megjegyzés] ${cs}`] || row[`[Vezeték] ${cs}`] || row[`Vezetek_${cs}`] || '').trim();
      });

      specs.push({
        id: celKod ? `spec-${celKod}` : `spec-fc-${factoryCode}`,
        productId: celKod,
        factoryCode: factoryCode || undefined,
        note: note || undefined,
        saruLocation: saruLocation || undefined,
        feederTool: feederTool || undefined,
        feederLocation: feederLocation || undefined,
        row1Beallitas,
        row2Magassag,
        row3KeresztmetszetMegjegyzes,
        row2Vezetek: row3KeresztmetszetMegjegyzes,
        row3Magassag: row2Magassag,
      });
    }

    return specs;
  }

  // 3. Multi-row block parsing (typical 'Segédtáblázat 1. Saruk másolata' format)
  let i = 0;
  while (i < parsed.data.length) {
    const row = parsed.data[i];
    if (!Array.isArray(row)) {
      i++;
      continue;
    }

    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();
    const col3 = (row[3] || '').trim();
    const col4 = (row[4] || '').trim();
    const col5 = (row[5] || '').trim();

    // Check if this row is a header row or completely empty
    const isEmpty =
      !col0 &&
      !col1 &&
      !col2 &&
      !col3 &&
      !col4 &&
      !col5 &&
      row.slice(6).every((c) => !(c || '').trim());

    if (isEmpty) {
      i++;
      continue;
    }

    const isHeaderRow =
      col0.toLowerCase().includes('saru kód') ||
      col0.toLowerCase().includes('sarumagasság') ||
      (col0 === '' && col1 === '' && col2 === '' && col3 === '' && col4 === '' && col5 === '');

    if (isHeaderRow) {
      i++;
      continue;
    }

    // This is Row 1 of a Saru entry (A: Saru kód, B: CEL KÓD, C: Megjegyzés, D: Saru hely, E: Saruzó fej, F: Fej hely)
    let factoryCode = col0;
    let celKod = col1;
    let mainNote = col2;
    const saruLocation = col3;
    const feederTool = col4;
    const feederLocation = col5;

    // Row 1: 1. Beállítás értéke (I-U oszlopok)
    const row1Beallitas: Record<string, string> = {};
    const row2Magassag: Record<string, string> = {};
    const row3KeresztmetszetMegjegyzes: Record<string, string> = {};

    crossSections.forEach((cs) => {
      const colIdx = csColMap[cs] ?? -1;
      if (colIdx >= 0 && row[colIdx]) {
        row1Beallitas[cs] = (row[colIdx] || '').trim();
      }
    });

    // Look at following rows in the 4-row block:
    // Row 2: Sarumagasság értéke (W-AI oszlopok)
    // Row 3: Esetleges megjegyzések az adott keresztmetszethez (AJ-AV oszlopok)
    // Row 4: Extra megjegyzések
    let consumedSubRows = 0;
    for (let offset = 1; offset <= 3; offset++) {
      if (i + offset >= parsed.data.length) break;
      const nextRow = parsed.data[i + offset];
      if (!Array.isArray(nextRow)) break;

      const nextCol0 = (nextRow[0] || '').trim();
      const nextCol1 = (nextRow[1] || '').trim();
      const nextCol4 = (nextRow[4] || '').trim();

      // If next row starts a new distinct entry with its own FeederTool (e.g. N°...) or new CEL kod + Feeder, stop
      if (nextCol4 && nextCol4 !== feederTool && (nextCol4.startsWith('N°') || nextCol4.startsWith('n°'))) {
        break;
      }
      if (nextCol0 && nextCol1 && (nextCol4.startsWith('N°') || nextCol4.startsWith('n°'))) {
        break;
      }

      consumedSubRows++;

      if (offset === 1) {
        // Row 2: Sarumagasság értéke
        if (!celKod && nextCol0 && nextCol0 !== factoryCode) {
          celKod = nextCol0;
        }
        crossSections.forEach((cs) => {
          const colIdx = csColMap[cs] ?? -1;
          if (colIdx >= 0 && nextRow[colIdx]) {
            row2Magassag[cs] = (nextRow[colIdx] || '').trim();
          }
        });
      } else if (offset === 2) {
        // Row 3: Megjegyzések az adott keresztmetszethez
        crossSections.forEach((cs) => {
          const colIdx = csColMap[cs] ?? -1;
          if (colIdx >= 0 && nextRow[colIdx]) {
            row3KeresztmetszetMegjegyzes[cs] = (nextRow[colIdx] || '').trim();
          }
        });
        const extraNote = (nextRow[2] || '').trim();
        if (extraNote && !mainNote.includes(extraNote)) {
          mainNote = mainNote ? `${mainNote} | ${extraNote}` : extraNote;
        }
      } else if (offset === 3) {
        // Row 4: További keresztmetszet vagy C oszlop megjegyzés
        crossSections.forEach((cs) => {
          const colIdx = csColMap[cs] ?? -1;
          if (colIdx >= 0 && nextRow[colIdx] && !row3KeresztmetszetMegjegyzes[cs]) {
            row3KeresztmetszetMegjegyzes[cs] = (nextRow[colIdx] || '').trim();
          }
        });
        const extraNote = (nextRow[2] || '').trim() || (nextRow[8] || '').trim();
        if (extraNote && !mainNote.includes(extraNote)) {
          mainNote = mainNote ? `${mainNote} | ${extraNote}` : extraNote;
        }
      }
    }

    if (celKod || factoryCode) {
      specs.push({
        id: celKod ? `spec-${celKod}-${specs.length}` : `spec-fc-${factoryCode}-${specs.length}`,
        productId: celKod || factoryCode,
        factoryCode: factoryCode || undefined,
        note: mainNote || undefined,
        saruLocation: saruLocation || undefined,
        feederTool: feederTool || undefined,
        feederLocation: feederLocation || undefined,
        row1Beallitas,
        row2Magassag,
        row3KeresztmetszetMegjegyzes,
        row2Vezetek: row3KeresztmetszetMegjegyzes,
        row3Magassag: row2Magassag,
      });
    }

    // Advance by 1 (the main row) + consumed sub-rows
    i += 1 + consumedSubRows;
  }

  return specs;
}

/**
 * Fetches Saru specifications from Google Sheet ('Segédtáblázat 1. Saruk másolata' worksheet)
 */
export async function fetchSaruSpecsFromGoogleSheet(sheetUrl?: string): Promise<SaruSpec[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = [
    'Segédtáblázat 1. Saruk másolata',
    'Segédtáblázat 1. Saruk masolata',
    'Segedtablazat 1. Saruk masolata',
    'Segédtáblázat 1. Saruk',
    'Segedtablazat 1. Saruk',
    'Saruk',
    'Saru Segédtáblázat',
    'Saru Segedtablazat',
    'SaruSpecs',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseSaruSpecsCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Exports Saru Specs into Google Sheets formatted CSV
 */
export function exportSaruSpecsToCsv(specs: SaruSpec[]): string {
  const crossSections = SARU_CROSS_SECTIONS;
  const rows: Array<Record<string, string>> = [];

  for (const spec of specs) {
    const rowObj: Record<string, string> = {
      'Gyári Kód': spec.factoryCode || '',
      'CEL KÓD (Termék ID)': spec.productId,
      'Megjegyzés': spec.note || '',
      'Saru hely': spec.saruLocation || '',
      'Saruzó fej': spec.feederTool || '',
      'Saruzó fej hely': spec.feederLocation || '',
    };

    crossSections.forEach((cs) => {
      rowObj[`[Beállítás] ${cs}`] = spec.row1Beallitas?.[cs] || '';
      rowObj[`[Sarumagasság mm] ${cs}`] = spec.row2Magassag?.[cs] || spec.row3Magassag?.[cs] || '';
      rowObj[`[Keresztmetszet Megjegyzés] ${cs}`] =
        spec.row3KeresztmetszetMegjegyzes?.[cs] || spec.row2Vezetek?.[cs] || '';
    });

    rows.push(rowObj);
  }

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Normalizes any status string into one of the 4 Kanban columns:
 * 'Terv' | 'Folyamatban' | 'Teszt' | 'Befejezve'
 */
export function normalizeKanbanStatus(statusStr?: string): KanbanStatus {
  if (!statusStr) return 'Terv';
  const s = statusStr.trim().toLowerCase();

  if (s.includes('befejez') || s.includes('kész') || s.includes('kesz') || s.includes('done') || s.includes('closed') || s.includes('lezárt') || s.includes('lezart')) {
    return 'Befejezve';
  }
  if (s.includes('teszt') || s.includes('test') || s.includes('qa') || s.includes('ellenőrz') || s.includes('ellenorz') || s.includes('vizsgál') || s.includes('vizsgal')) {
    return 'Teszt';
  }
  if (s.includes('folyamat') || s.includes('in progress') || s.includes('progress') || s.includes('doing') || s.includes('fejleszt')) {
    return 'Folyamatban';
  }
  return 'Terv';
}

/**
 * Parses CSV data into KanbanItem records
 */
export function parseKanbanCsv(csvText: string): KanbanItem[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!parsed.data || parsed.data.length === 0) {
    return [];
  }

  // Check header keys to see if this is actually a Kanban sheet
  const firstRow = parsed.data[0];
  if (!firstRow || typeof firstRow !== 'object') return [];

  const headerKeys = Object.keys(firstRow).map((k) =>
    k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  );

  // Reject if it's the product catalog sheet (which Google Sheet returns as fallback when tab doesn't exist)
  const isProductCatalog = headerKeys.some((k) =>
    ['adagolas', 'szigelestipus', 'szigeles', 'alkatresztipus', 'sarutipusa', 'konektortipusa', 'alkatreszhely', 'gyarikod', 'termeknev', 'gyarto'].includes(k)
  );
  const hasExplicitKanbanCol = headerKeys.some((k) =>
    ['kanbanid', 'cardid', 'taskid', 'feladatid', 'status', 'statusz', 'allapot', 'oszlop', 'prioritas', 'priority', 'felelos', 'assignee', 'duedate', 'hatarido'].includes(k)
  );

  // If it looks like a product catalog and has no dedicated kanban columns, it's NOT a kanban sheet!
  if (isProductCatalog && !hasExplicitKanbanCol) {
    return [];
  }

  // Also verify that at least one recognizable kanban column exists (title/task/feladat/status/kanbanid)
  const hasValidKanbanStructure = headerKeys.some((k) =>
    ['kanbanid', 'cardid', 'taskid', 'feladatid', 'status', 'statusz', 'allapot', 'oszlop', 'title', 'cim', 'feladat', 'task', 'teendo', 'prioritas', 'priority', 'felelos', 'assignee'].includes(k)
  );

  if (!hasValidKanbanStructure) {
    return [];
  }

  const items: KanbanItem[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (!row || typeof row !== 'object') continue;

    // Look for ID
    const idKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'id' ||
        lower === 'kanbanid' ||
        lower === 'feladatid' ||
        lower === 'tetelid' ||
        lower === 'cardid'
      );
    });

    // Look for Title / Name / Task
    const titleKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'title' ||
        lower === 'cím' ||
        lower === 'cim' ||
        lower === 'feladat' ||
        lower === 'megnevezés' ||
        lower === 'megnevezes' ||
        lower === 'tétel' ||
        lower === 'tetel' ||
        lower === 'task' ||
        lower === 'name'
      );
    });

    // Look for Status
    const statusKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'status' ||
        lower === 'státusz' ||
        lower === 'statusz' ||
        lower === 'állapot' ||
        lower === 'allapot' ||
        lower === 'oszlop' ||
        lower === 'stage'
      );
    });

    // Look for Description
    const descKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'description' ||
        lower === 'leírás' ||
        lower === 'leiras' ||
        lower === 'részletek' ||
        lower === 'reszletek' ||
        lower === 'megjegyzés' ||
        lower === 'megjegyzes' ||
        lower === 'notes' ||
        lower === 'note'
      );
    });

    // Look for Product ID
    const prodKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'productid' ||
        lower === 'termékid' ||
        lower === 'termekid' ||
        lower === 'termékkód' ||
        lower === 'termekkod' ||
        lower === 'cikkszám' ||
        lower === 'cikkszam' ||
        lower === 'alkatrészid' ||
        lower === 'alkatreszid' ||
        lower === 'celkód' ||
        lower === 'celkod'
      );
    });

    // Look for Priority
    const priorityKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'priority' ||
        lower === 'prioritás' ||
        lower === 'prioritas' ||
        lower === 'sürgősség' ||
        lower === 'surgosseg' ||
        lower === 'fontosság'
      );
    });

    // Look for Assignee
    const assigneeKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'assignee' ||
        lower === 'felelős' ||
        lower === 'felelos' ||
        lower === 'dolgozó' ||
        lower === 'dolgozo' ||
        lower === 'felelősszemély' ||
        lower === 'tulajdonos' ||
        lower === 'owner'
      );
    });

    // Look for Due Date
    const dueDateKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'duedate' ||
        lower === 'határidő' ||
        lower === 'hatarido' ||
        lower === 'dátum' ||
        lower === 'datum' ||
        lower === 'date' ||
        lower === 'esedékesség'
      );
    });

    // Look for Quantity
    const qtyKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'quantity' ||
        lower === 'mennyiség' ||
        lower === 'mennyiseg' ||
        lower === 'darab' ||
        lower === 'db' ||
        lower === 'qty' ||
        lower === 'amount'
      );
    });

    // Look for CreatedAt
    const createdKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'createdat' ||
        lower === 'létrehozva' ||
        lower === 'letrehozva' ||
        lower === 'created' ||
        lower === 'creationdate' ||
        lower === 'létrehozásdátuma'
      );
    });

    // Look for UpdatedAt
    const updatedKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'updatedat' ||
        lower === 'módosítva' ||
        lower === 'modositva' ||
        lower === 'updated' ||
        lower === 'lastmodified' ||
        lower === 'módosításdátuma'
      );
    });

    // Look for Tags / Categories
    const tagsKey = Object.keys(row).find((k) => {
      const lower = k.toLowerCase().replace(/[_\s-]/g, '');
      return (
        lower === 'tags' ||
        lower === 'címkék' ||
        lower === 'cimkek' ||
        lower === 'kategória' ||
        lower === 'kategoria' ||
        lower === 'tag' ||
        lower === 'labels'
      );
    });

    const rawTitle = titleKey ? row[titleKey]?.trim() : '';
    // If no title found by header, check first non-empty column
    const fallbackTitle = !rawTitle
      ? Object.values(row).find((val) => typeof val === 'string' && val.trim().length > 0) || ''
      : rawTitle;

    if (!fallbackTitle || fallbackTitle === '') {
      continue;
    }

    const rawId = idKey ? row[idKey]?.trim() : '';
    const id = rawId || `KB-${Date.now().toString().slice(-6)}-${String(items.length + 1).padStart(2, '0')}`;

    const rawStatus = statusKey ? row[statusKey]?.trim() : '';
    const status = normalizeKanbanStatus(rawStatus);

    const description = descKey ? row[descKey]?.trim() : undefined;
    const productId = prodKey ? row[prodKey]?.trim() : undefined;
    const assignee = assigneeKey ? row[assigneeKey]?.trim() : undefined;
    const priority = priorityKey ? row[priorityKey]?.trim() : undefined;
    const dueDate = dueDateKey ? row[dueDateKey]?.trim() : undefined;
    const quantity = qtyKey && row[qtyKey]?.trim() ? row[qtyKey].trim() : undefined;
    const createdAt = createdKey ? row[createdKey]?.trim() : undefined;
    const updatedAt = updatedKey ? row[updatedKey]?.trim() : undefined;

    let tags: string[] | undefined = undefined;
    if (tagsKey && row[tagsKey]?.trim()) {
      tags = row[tagsKey]
        .split(/[,;|]/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // Collect custom fields
    const customFields: Record<string, string> = {};
    Object.entries(row).forEach(([k, v]) => {
      if (
        k !== idKey &&
        k !== titleKey &&
        k !== statusKey &&
        k !== descKey &&
        k !== prodKey &&
        k !== assigneeKey &&
        k !== priorityKey &&
        k !== dueDateKey &&
        k !== qtyKey &&
        k !== createdKey &&
        k !== updatedKey &&
        k !== tagsKey &&
        v &&
        v.trim()
      ) {
        customFields[k] = v.trim();
      }
    });

    items.push({
      id,
      title: fallbackTitle,
      status,
      description: description || undefined,
      productId: productId || undefined,
      priority: priority || undefined,
      assignee: assignee || undefined,
      dueDate: dueDate || undefined,
      quantity: quantity || undefined,
      createdAt: createdAt || undefined,
      updatedAt: updatedAt || undefined,
      tags: tags && tags.length > 0 ? tags : undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return items;
}

/**
 * Fetches Kanban items from Google Sheet ('kanban' worksheet)
 */
export async function fetchKanbanFromGoogleSheet(sheetUrl?: string): Promise<KanbanItem[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = [
    'kanban',
    'Kanban',
    'KANBAN',
    'Kanban Tábla',
    'Kanban tabla',
    'Kanban_Board',
    'KanbanBoard',
    'Feladatok',
    'Tasks',
    'Task',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseKanbanCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Exports Kanban items to CSV format with standard columns:
 * ID, Title, Description, ProductId, Status, Priority, Assignee, DueDate, Quantity, CreatedAt, UpdatedAt
 */
export function exportKanbanToCsv(items: KanbanItem[]): string {
  const rows = items.map((item) => ({
    'ID': item.id,
    'Title': item.title,
    'Description': item.description || '',
    'ProductId': item.productId || '',
    'Status': item.status,
    'Priority': item.priority || 'medium',
    'Assignee': item.assignee || '',
    'DueDate': item.dueDate || '',
    'Quantity': item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : '',
    'CreatedAt': item.createdAt || '',
    'UpdatedAt': item.updatedAt || '',
    ...(item.customFields || {}),
  }));

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Helper to normalize header keys: lowercases, strips accents and non-alphanumerics
 */
function normalizeHeaderKey(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses raw CSV text into Order array (Rendelés worksheet)
 * Expected columns: Rendelés ID, Termék ID, Státusz, Dátum, Dátum Megrendelve, Dátum Raktárban
 */
export function parseOrdersCsv(csvText: string): Order[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!parsed.data || parsed.data.length === 0) return [];

  const orders: Order[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (!row || typeof row !== 'object') continue;

    const findKey = (patterns: string[]): string | undefined => {
      return Object.keys(row).find((k) => {
        const norm = normalizeHeaderKey(k);
        return patterns.some((p) => norm === p || norm.includes(p));
      });
    };

    const getVal = (patterns: string[]): string => {
      const key = findKey(patterns);
      return (key ? row[key] : '')?.trim() || '';
    };

    // Rendelés ID
    const rendelesIdKey = findKey(['rendelesid', 'orderid', 'rendeles', 'id']);
    const rawRendelesId = (rendelesIdKey ? row[rendelesIdKey] : '')?.trim() || '';
    const rendelesId = rawRendelesId.replace(/^["']+|["']+$/g, '').trim();

    // Termék ID
    const termekIdKey = findKey(['termekid', 'productid', 'termek', 'product', 'cikkszam', 'cikk']);
    const rawTermekId = (termekIdKey ? row[termekIdKey] : '')?.trim() || '';
    const termekId = rawTermekId.replace(/^["']+|["']+$/g, '').trim();

    if (!rendelesId && !termekId) continue;
    const finalId = rendelesId || `REND-${String(i + 1).padStart(3, '0')}`;

    // Státusz
    const statuszKey = findKey(['statusz', 'status', 'allapot']);
    const statusz = (statuszKey ? row[statuszKey] : '')?.trim() || 'Megrendelve';

    // Dátum
    const datumKey = findKey(['datum', 'date', 'letrehozva']);
    const datum = (datumKey ? row[datumKey] : '')?.trim() || '';

    // Dátum Megrendelve
    const datumMegrKey = findKey(['datummegrendelve', 'megrendelve', 'ordered', 'rendelesdatum']);
    const datumMegrendelve = (datumMegrKey ? row[datumMegrKey] : '')?.trim() || '';

    // Dátum Raktárban
    const datumRaktKey = findKey(['datumraktarban', 'raktarban', 'warehouse', 'megerkezett', 'beerkezve', 'atveve']);
    const datumRaktarban = (datumRaktKey ? row[datumRaktKey] : '')?.trim() || '';

    // Mennyiség
    const qtyKey = findKey(['mennyiseg', 'quantity', 'qty', 'db']);
    const mennyiseg = qtyKey && row[qtyKey] ? Number(row[qtyKey]) || row[qtyKey].trim() : undefined;

    // Megjegyzés
    const noteKey = findKey(['megjegyzes', 'note', 'leiras', 'description']);
    const megjegyzes = noteKey ? row[noteKey]?.trim() : undefined;

    // Beszállító
    const supplierKey = findKey(['beszallito', 'supplier', 'partner']);
    const beszallito = supplierKey ? row[supplierKey]?.trim() : undefined;

    // Custom fields
    const matchedKeys = new Set([
      rendelesIdKey,
      termekIdKey,
      statuszKey,
      datumKey,
      datumMegrKey,
      datumRaktKey,
      qtyKey,
      noteKey,
      supplierKey,
    ].filter(Boolean) as string[]);

    const customFields: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      if (!matchedKeys.has(key) && key.trim() && val && val.trim()) {
        customFields[key.trim()] = val.trim();
      }
    }

    orders.push({
      id: finalId,
      rendelesId: finalId,
      termekId: termekId || '-',
      statusz,
      datum,
      datumMegrendelve,
      datumRaktarban,
      mennyiseg,
      megjegyzes,
      beszallito,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return orders;
}

/**
 * Converts Orders back into Rendelés Google Sheets formatted CSV string
 * Columns: Rendelés ID, Termék ID, Státusz, Dátum, Dátum Megrendelve, Dátum Raktárban
 */
export function exportOrdersToCsv(orders: Order[]): string {
  const rows = orders.map((o) => ({
    'Rendelés ID': o.rendelesId || o.id,
    'Termék ID': o.termekId,
    'Státusz': o.statusz,
    'Dátum': o.datum || '',
    'Dátum Megrendelve': o.datumMegrendelve || '',
    'Dátum Raktárban': o.datumRaktarban || '',
    'Mennyiség': o.mennyiseg !== undefined && o.mennyiseg !== null ? String(o.mennyiseg) : '',
    'Beszállító': o.beszallito || '',
    'Megjegyzés': o.megjegyzes || '',
    ...(o.customFields || {}),
  }));

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Fetches Orders from Google Sheet ('Rendelés' / 'Rendeles' worksheet)
 */
export async function fetchOrdersFromGoogleSheet(sheetUrl?: string): Promise<Order[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  const trySheets = [
    'Rendelés',
    'Rendeles',
    'Rendelések',
    'Rendelesek',
    'Orders',
    'Order',
    'RENDELÉS',
    'RENDELES',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        const records = parseOrdersCsv(csvText);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}

/**
 * Parses raw CSV text into ProductNote array matching Note worksheet columns:
 * Note ID, Termék ID, Név, Leírás, Image, Documents, Date, URL, Név választás
 */
export function parseNotesCsv(csvText: string, hyperlinksByRow?: Map<number, string>): ProductNote[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const notes: ProductNote[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];

    // Find Note ID column
    const noteIdKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'note id' ||
        k.toLowerCase() === 'noteid' ||
        k.toLowerCase() === 'note_id' ||
        k.toLowerCase() === 'jegyzet id' ||
        k.toLowerCase() === 'jegyzetid' ||
        k.toLowerCase() === 'id'
    );
    const rawNoteId = (noteIdKey ? row[noteIdKey] : row['Note ID'] || row['note_id'] || '')?.trim() || '';
    const noteId = rawNoteId ? rawNoteId.replace(/^["']+|["']+$/g, '').trim() : `NOTE-${1000 + i + 1}`;

    // Find Termék ID column
    const termekIdKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('termék id') ||
        k.toLowerCase().includes('termek id') ||
        k.toLowerCase().includes('termekid') ||
        k.toLowerCase().includes('termékid') ||
        k.toLowerCase().includes('product id') ||
        k.toLowerCase().includes('productid')
    );
    const rawTermekId = (termekIdKey ? row[termekIdKey] : row['Termék ID'] || row['Termek ID'] || '')?.trim() || '';
    const termekId = rawTermekId.replace(/^["']+|["']+$/g, '').trim();

    if (!termekId && !rawNoteId) continue;

    // Név column
    const nevKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'név' ||
        k.toLowerCase() === 'nev' ||
        k.toLowerCase() === 'name' ||
        k.toLowerCase() === 'title' ||
        k.toLowerCase() === 'tárgy' ||
        k.toLowerCase() === 'targy'
    );
    const nev = (nevKey ? row[nevKey] : row['Név'] || row['Nev'] || 'Jegyzet')?.trim() || 'Jegyzet';

    // Leírás column
    const leirasKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'leírás' ||
        k.toLowerCase() === 'leiras' ||
        k.toLowerCase() === 'description' ||
        k.toLowerCase() === 'szöveg' ||
        k.toLowerCase() === 'szoveg'
    );
    const leiras = (leirasKey ? row[leirasKey] : row['Leírás'] || row['Leiras'] || '')?.trim();

    // Image column
    const imageKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'image' ||
        k.toLowerCase() === 'kép' ||
        k.toLowerCase() === 'kep' ||
        k.toLowerCase() === 'fotó' ||
        k.toLowerCase() === 'foto'
    );
    const image = (imageKey ? row[imageKey] : row['Image'] || row['image'] || '')?.trim();

    // Documents column
    const docKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'documents' ||
        k.toLowerCase() === 'dokumentumok' ||
        k.toLowerCase() === 'document' ||
        k.toLowerCase() === 'dokumentum' ||
        k.toLowerCase() === 'docs'
    );
    const documents = (docKey ? row[docKey] : row['Documents'] || row['documents'] || '')?.trim();

    // Date column
    const dateKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'date' ||
        k.toLowerCase() === 'dátum' ||
        k.toLowerCase() === 'datum' ||
        k.toLowerCase() === 'időpont'
    );
    const date = (dateKey ? row[dateKey] : row['Date'] || row['Dátum'] || '')?.trim();

    // URL column
    const urlKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'url' ||
        k.toLowerCase() === 'link' ||
        k.toLowerCase() === 'hivatkozás' ||
        k.toLowerCase() === 'hivatkozas'
    );
    let rawUrl = (urlKey ? row[urlKey] : row['URL'] || row['url'] || '')?.trim();
    if (rawUrl) {
      const matchHyperlink = rawUrl.match(/=HYPERLINK\(\s*["']([^"']+)["']/i);
      if (matchHyperlink) {
        rawUrl = matchHyperlink[1];
      }
      rawUrl = rawUrl.replace(/^["']+|["']+$/g, '').trim();
    }

    // Check if the URL is a textual placeholder (such as 'PDF', 'pdf', 'URL', 'KÉP', etc.) or missing
    const isPlaceholder =
      !rawUrl ||
      rawUrl.toLowerCase() === 'pdf' ||
      rawUrl.toLowerCase() === 'url' ||
      rawUrl.toLowerCase() === 'kép' ||
      rawUrl.toLowerCase() === 'kep' ||
      rawUrl.toLowerCase() === 'vázlatos kép' ||
      rawUrl.toLowerCase() === 'vazlatos kep' ||
      rawUrl.toLowerCase() === 'felhelyezés' ||
      rawUrl.toLowerCase() === 'felhelyezes' ||
      rawUrl.toLowerCase() === 'link' ||
      (!rawUrl.startsWith('http') && !rawUrl.startsWith('//') && !rawUrl.includes('/'));

    let finalUrl = rawUrl;
    if (isPlaceholder) {
      // Row 1 is header, row index starts at 0 -> Excel row is i + 2
      const rowNum = i + 2;
      const liveXlsxUrl = hyperlinksByRow?.get(rowNum);
      if (liveXlsxUrl) {
        finalUrl = liveXlsxUrl;
      } else if (noteId && NOTE_HYPERLINKS_MAP[noteId]) {
        finalUrl = NOTE_HYPERLINKS_MAP[noteId];
      }
    }
    const url = finalUrl;

    // Név választás column
    const nevValasztasKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase() === 'név választás' ||
        k.toLowerCase() === 'nev valasztas' ||
        k.toLowerCase() === 'név választó' ||
        k.toLowerCase() === 'nev valaszto' ||
        k.toLowerCase() === 'névválasztás' ||
        k.toLowerCase() === 'nevvalasztas' ||
        k.toLowerCase() === 'felelős' ||
        k.toLowerCase() === 'felelos' ||
        k.toLowerCase() === 'készítette' ||
        k.toLowerCase() === 'author'
    );
    const nevValasztas = (nevValasztasKey ? row[nevValasztasKey] : row['Név választás'] || row['Nev valasztas'] || '')?.trim();

    // Custom fields
    const standardKeys = new Set([
      'Note ID',
      'note_id',
      'Termék ID',
      'Termek ID',
      'Név',
      'Nev',
      'Leírás',
      'Leiras',
      'Image',
      'Documents',
      'Date',
      'Dátum',
      'Datum',
      'URL',
      'Név választás',
      'Nev valasztas',
    ]);

    const customFields: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!standardKeys.has(k) && v && typeof v === 'string' && v.trim()) {
        customFields[k] = v.trim();
      }
    }

    notes.push({
      id: noteId,
      termekId: termekId || 'Ismeretlen',
      nev,
      leiras: leiras || undefined,
      image: image || undefined,
      documents: documents || undefined,
      date: date || undefined,
      url: url || undefined,
      pageCount: getNotePageCount(noteId, url),
      nevValasztas: nevValasztas || undefined,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });
  }

  return notes;
}

/**
 * Extracts live formula hyperlinks from the Note worksheet inside the Google Sheets XLSX export.
 * This directly retrieves true Google Drive and web URLs from =HYPERLINK("...", "PDF") formulas
 * that are otherwise stripped into plain display text ("PDF") by the Google Sheets CSV export.
 */
export async function extractHyperlinksFromXlsx(sheetId: string): Promise<Map<number, string>> {
  const hMap = new Map<number, string>();
  try {
    const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const response = await fetch(targetUrl);
    if (!response.ok) return hMap;
    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find Note sheet id from workbook.xml
    const wbXml = await zip.file('xl/workbook.xml')?.async('string');
    if (!wbXml) return hMap;

    const sheetMatches = [...wbXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)];
    const noteSheet = sheetMatches.find((s) => /note/i.test(s[1]));
    if (!noteSheet) return hMap;
    const rId = noteSheet[2];

    const relsXml = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
    if (!relsXml) return hMap;
    const relMatch = relsXml.match(new RegExp(`Id="${rId}"[^>]*Target="([^"]+)"`));
    if (!relMatch) return hMap;

    const targetPath = relMatch[1].startsWith('xl/')
      ? relMatch[1]
      : relMatch[1].startsWith('/')
      ? `xl${relMatch[1]}`
      : `xl/${relMatch[1].replace(/^\//, '')}`;

    const sheetXml = await zip.file(targetPath)?.async('string');
    if (!sheetXml) return hMap;

    // 1. Extract =HYPERLINK("url", "text") cell formulas
    const hRegex = /<c r="[A-Z]+(\d+)"[^>]*><f>HYPERLINK\(&quot;([^&]+)&quot;,\s*&quot;([^&]*)&quot;\)<\/f>/g;
    let m;
    while ((m = hRegex.exec(sheetXml)) !== null) {
      const row = parseInt(m[1], 10);
      const u = m[2].replace(/&amp;/g, '&').trim();
      if (u && !u.startsWith('Higító') && u.length > 5) {
        hMap.set(row, u);
      }
    }

    // 2. Extract standard cell hyperlinks in sheet relationships if any
    const sheetRelsPath = targetPath.replace('worksheets/', 'worksheets/_rels/') + '.rels';
    const sheetRelsXml = await zip.file(sheetRelsPath)?.async('string');
    if (sheetRelsXml) {
      const relTargets = new Map<string, string>();
      const relMatches = [...sheetRelsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)];
      for (const rm of relMatches) {
        relTargets.set(rm[1], rm[2].replace(/&amp;/g, '&'));
      }
      const cellHlMatches = [...sheetXml.matchAll(/<hyperlink[^>]*ref="[A-Z]+(\d+)"[^>]*r:id="([^"]+)"/g)];
      for (const chm of cellHlMatches) {
        const row = parseInt(chm[1], 10);
        const target = relTargets.get(chm[2]);
        if (target && !hMap.has(row)) {
          hMap.set(row, target);
        }
      }
    }
  } catch (err) {
    console.warn('XLSX live hyperlink extraction skipped or failed:', err);
  }
  return hMap;
}

/**
 * Converts ProductNotes back into Note Google Sheets formatted CSV string
 * Columns: Note ID, Termék ID, Név, Leírás, Image, Documents, Date, URL, Név választás
 */
export function exportNotesToCsv(notes: ProductNote[]): string {
  const rows = notes.map((n) => ({
    'Note ID': n.id,
    'Termék ID': n.termekId,
    'Név': n.nev,
    'Leírás': n.leiras || '',
    'Image': n.image || '',
    'Documents': n.documents || '',
    'Date': n.date || '',
    'URL': n.url || '',
    'Név választás': n.nevValasztas || '',
    ...(n.customFields || {}),
  }));

  return Papa.unparse(rows, {
    quotes: true,
  });
}

/**
 * Fetches Notes from Google Sheet ('Note' / 'Notes' / 'Notesz' / 'Jegyzetek' worksheet)
 */
export async function fetchNotesFromGoogleSheet(sheetUrl?: string): Promise<ProductNote[]> {
  const url = sheetUrl || DEFAULT_GOOGLE_SHEET_URL;
  const sheetId = extractSheetId(url);
  if (!sheetId) return [];

  // Start extracting live formula hyperlinks from XLSX in parallel
  const liveHyperlinksPromise = extractHyperlinksFromXlsx(sheetId).catch(() => new Map<number, string>());

  const trySheets = [
    'Note',
    'Notes',
    'Notesz',
    'Jegyzetek',
    'Jegyzet',
    'NOTE',
    'NOTES',
    'Termék Note',
    'Termek Note',
  ];

  for (const sheetName of trySheets) {
    try {
      const encodedSheet = encodeURIComponent(sheetName);
      const targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodedSheet}`;
      const response = await fetch(targetUrl);
      if (response.ok) {
        const csvText = await response.text();
        // Wait for live hyperlinks with a reasonable timeout so we don't block
        const liveHyperlinks = await Promise.race([
          liveHyperlinksPromise,
          new Promise<Map<number, string>>((resolve) => setTimeout(() => resolve(new Map()), 2500)),
        ]);
        const records = parseNotesCsv(csvText, liveHyperlinks);
        if (records.length > 0) {
          return records;
        }
      }
    } catch {
      // Continue to next sheet variant
    }
  }

  return [];
}










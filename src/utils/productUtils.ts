// Product ID, Condition (Új vs Használt / H_), and Variant Unification Utilities

import { Product, InventoryTransaction, ProductStockPosition, WarehousePosition } from '../types';

/**
 * Checks if a Product ID represents a Used ("Használt") item (starts with H_ or h_)
 */
export function isUsedProductId(id?: string | null): boolean {
  if (!id) return false;
  const clean = id.trim();
  return clean.startsWith('H_') || clean.startsWith('h_');
}

/**
 * Gets the base canonical Product ID without any H_ / h_ prefix
 * e.g. "H_ME.911270246" -> "ME.911270246"
 *      "ME.911270246"   -> "ME.911270246"
 */
export function getBaseProductId(id?: string | null): string {
  if (!id) return '';
  const clean = id.trim();
  if (clean.startsWith('H_') || clean.startsWith('h_')) {
    return clean.slice(2).trim();
  }
  return clean;
}

/**
 * Gets the "Új" (New) product ID for a given base or used ID
 * e.g. "H_ME.911270246" -> "ME.911270246"
 */
export function getNewProductId(id?: string | null): string {
  return getBaseProductId(id);
}

/**
 * Gets the "Használt" (Used / H_) product ID for a given base or new ID
 * e.g. "ME.911270246" -> "H_ME.911270246"
 */
export function getUsedProductId(id?: string | null): string {
  const base = getBaseProductId(id);
  if (!base) return '';
  return `H_${base}`;
}

/**
 * Returns condition info for a product ID
 */
export function getProductConditionInfo(id?: string | null): {
  isUsed: boolean;
  condition: 'new' | 'used';
  label: 'Új' | 'Használt';
  badgeText: string;
  baseId: string;
  newId: string;
  usedId: string;
} {
  const isUsed = isUsedProductId(id);
  const baseId = getBaseProductId(id);
  return {
    isUsed,
    condition: isUsed ? 'used' : 'new',
    label: isUsed ? 'Használt' : 'Új',
    badgeText: isUsed ? 'Használt' : 'Új',
    baseId,
    newId: baseId,
    usedId: baseId ? `H_${baseId}` : '',
  };
}

/**
 * Unified Stock breakdown interface
 */
export interface ProductStockBreakdown {
  baseId: string;
  newId: string;
  usedId: string;
  newStock: number;
  usedStock: number;
  totalStock: number;
  hasNewStock: boolean;
  hasUsedStock: boolean;
  hasAnyStock: boolean;
}

/**
 * Calculates stock breakdown (Új, Használt, Összes) for a base product ID
 */
export function calculateProductStockBreakdown(
  idOrBaseId: string,
  inventory: InventoryTransaction[]
): ProductStockBreakdown {
  const baseId = getBaseProductId(idOrBaseId);
  const newId = baseId;
  const usedId = `H_${baseId}`;

  let newStock = 0;
  let usedStock = 0;

  for (const rec of inventory) {
    const recProdId = (rec.productId || '').trim();
    const qty = rec.quantity || 0;

    if (recProdId.toLowerCase() === newId.toLowerCase()) {
      newStock += qty;
    } else if (
      recProdId.toLowerCase() === usedId.toLowerCase() ||
      (isUsedProductId(recProdId) && getBaseProductId(recProdId).toLowerCase() === baseId.toLowerCase())
    ) {
      usedStock += qty;
    }
  }

  const totalStock = newStock + usedStock;

  return {
    baseId,
    newId,
    usedId,
    newStock,
    usedStock,
    totalStock,
    hasNewStock: newStock > 0,
    hasUsedStock: usedStock > 0,
    hasAnyStock: totalStock > 0,
  };
}

/**
 * Unified product position info with condition tag
 */
export interface UnifiedProductPosition {
  positionId: string;
  positionName: string;
  newQuantity: number;
  usedQuantity: number;
  totalQuantity: number;
  records: InventoryTransaction[];
  newRecords: InventoryTransaction[];
  usedRecords: InventoryTransaction[];
}

/**
 * Gets all positions holding stock of a unified product (both Új and Használt)
 */
export function getUnifiedProductPositions(
  idOrBaseId: string,
  inventory: InventoryTransaction[],
  positions: WarehousePosition[]
): UnifiedProductPosition[] {
  const baseId = getBaseProductId(idOrBaseId);
  const newId = baseId.toLowerCase();
  const usedId = `H_${baseId}`.toLowerCase();

  const map = new Map<
    string,
    {
      newQty: number;
      usedQty: number;
      records: InventoryTransaction[];
      newRecords: InventoryTransaction[];
      usedRecords: InventoryTransaction[];
    }
  >();

  for (const rec of inventory) {
    const recProdId = (rec.productId || '').trim().toLowerCase();
    const isNew = recProdId === newId;
    const isUsed = recProdId === usedId || (recProdId.startsWith('h_') && recProdId.slice(2) === newId);

    if (isNew || isUsed) {
      const posId = (rec.positionId || '').trim();
      const current = map.get(posId) || {
        newQty: 0,
        usedQty: 0,
        records: [],
        newRecords: [],
        usedRecords: [],
      };

      const qty = rec.quantity || 0;
      if (isNew) {
        current.newQty += qty;
        current.newRecords.push(rec);
      } else {
        current.usedQty += qty;
        current.usedRecords.push(rec);
      }
      current.records.push(rec);
      map.set(posId, current);
    }
  }

  const result: UnifiedProductPosition[] = [];
  map.forEach((val, posId) => {
    const posObj = positions.find((p) => p.id === posId);
    result.push({
      positionId: posId,
      positionName: posObj ? posObj.name : posId,
      newQuantity: val.newQty,
      usedQuantity: val.usedQty,
      totalQuantity: val.newQty + val.usedQty,
      records: val.records,
      newRecords: val.newRecords,
      usedRecords: val.usedRecords,
    });
  });

  return result;
}

/**
 * Unifies an array of raw products by their base product ID.
 * Merges duplicate entries where one was "H_..." and another was standard,
 * keeping the canonical master record and attaching unified information.
 */
export function unifyProductList(rawProducts: Product[]): Product[] {
  const map = new Map<string, Product>();

  for (const p of rawProducts) {
    const baseId = getBaseProductId(p.id);
    const isUsed = isUsedProductId(p.id);

    if (!map.has(baseId)) {
      // First time seeing this base product
      map.set(baseId, {
        ...p,
        id: baseId, // Canonical master ID
        quality: isUsed ? p.quality || 'Használt' : p.quality || 'Új',
      });
    } else {
      // Already exists - if current is the non-used master, prefer its primary fields
      const existing = map.get(baseId)!;
      if (!isUsed) {
        map.set(baseId, {
          ...existing,
          ...p,
          id: baseId,
          // Preserve description or image if existing had it and new one doesn't
          image: p.image || existing.image,
          description: p.description || existing.description,
          quality: p.quality || existing.quality || 'Új',
        });
      } else {
        // Current is used, fill any missing properties in existing
        map.set(baseId, {
          ...existing,
          image: existing.image || p.image,
          description: existing.description || p.description,
        });
      }
    }
  }

  return Array.from(map.values());
}

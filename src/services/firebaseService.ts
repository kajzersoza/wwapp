import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Product,
  WarehousePosition,
  InventoryRecord,
  Inspection,
  KanbanItem,
  KonSarRelation,
  TermMerodRelation,
  BeepuloRelation,
  FejSaruRelation,
  SaruSpec,
  Order,
  ProductNote,
} from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
}) : getApp();

// Connect to the Firestore database instance
export const firestoreDb: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// In-memory flag tracking if the free daily quota has been exceeded
let isQuotaExhausted = false;

export function isFirestoreQuotaExhausted(): boolean {
  return isQuotaExhausted;
}

export function setFirestoreQuotaExhausted(value: boolean): void {
  isQuotaExhausted = value;
}

export function isQuotaError(err: any): boolean {
  if (!err) return false;
  const str = String(err?.message || err?.code || err);
  return (
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded') ||
    str.includes('quota metric') ||
    err?.code === 'resource-exhausted'
  );
}

/**
 * Converts any arbitrary entity ID into a safe Firestore document ID.
 * Avoids errors with slashes, dots, and empty strings.
 */
export function toSafeDocId(id: string): string {
  if (!id || typeof id !== 'string') {
    return `doc_${Math.random().toString(36).substring(2, 9)}`;
  }
  return encodeURIComponent(id.trim())
    .replace(/\//g, '__slash__')
    .replace(/\./g, '__dot__');
}

/**
 * Collection Names
 */
export const FIRESTORE_COLLECTIONS = {
  PRODUCTS: 'products',
  POSITIONS: 'positions',
  INVENTORY: 'inventory',
  INSPECTIONS: 'inspections',
  KANBAN: 'kanban',
  KONSAR: 'konsar',
  TERMMEROD: 'termmerod',
  BEEPULO: 'beepulo',
  FEJSARU: 'fejsaru',
  SARUSPECS: 'saruspecs',
  ORDERS: 'rendelesek',
  NOTES: 'notes',
  METADATA: 'metadata',
} as const;

/**
 * Saves or updates a single item in Firestore.
 */
export async function saveItemToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  if (isQuotaExhausted) {
    return;
  }
  try {
    const docId = toSafeDocId(item.id);
    const docRef = doc(firestoreDb, collectionName, docId);
    // Clean undefined values to prevent Firestore error
    const cleanData = JSON.parse(JSON.stringify(item));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExhausted = true;
      console.warn(`[Firestore] Napi ingyenes kvóta elérve a(z) ${collectionName} mentése közben. Lokális mentés aktív.`);
      return;
    }
    console.warn(`[Firestore] Hiba a(z) ${collectionName} mentésekor:`, err?.message || err);
  }
}

/**
 * Deletes a single item from Firestore.
 */
export async function deleteItemFromFirestore(
  collectionName: string,
  id: string
): Promise<void> {
  if (isQuotaExhausted) {
    return;
  }
  try {
    const docId = toSafeDocId(id);
    const docRef = doc(firestoreDb, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExhausted = true;
      console.warn(`[Firestore] Napi ingyenes kvóta elérve a(z) ${collectionName} törlése közben.`);
      return;
    }
    console.warn(`[Firestore] Hiba a(z) ${collectionName} törlésekor:`, err?.message || err);
  }
}

/**
 * Fetches all documents from a Firestore collection.
 */
export async function getAllFromFirestore<T>(collectionName: string): Promise<T[]> {
  try {
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map((d) => d.data() as T);
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExhausted = true;
      console.warn(`[Firestore] Napi kvóta elérve a(z) ${collectionName} lekérésekor.`);
      return [];
    }
    console.warn(`[Firestore] Lekérési figyelmeztetés (${collectionName}):`, err?.message || err);
    return [];
  }
}

/**
 * Subscribes to real-time updates of a Firestore collection.
 */
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  try {
    const colRef = collection(firestoreDb, collectionName);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: T[] = snapshot.docs.map((d) => d.data() as T);
        onUpdate(items);
      },
      (error) => {
        if (isQuotaError(error)) {
          isQuotaExhausted = true;
          console.warn(`[Firestore] Napi kvóta elérve a(z) ${collectionName} valós idejű figyelése közben.`);
        } else {
          console.warn(`[Firestore] Figyelési értesítés (${collectionName}):`, error.message);
        }
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn(`[Firestore] Nem sikerült feliratkozni a(z) ${collectionName} gyűjteményre:`, err?.message || err);
    return () => {};
  }
}

/**
 * Saves a list of items to Firestore in batches of up to 450 items (Firestore limit is 500).
 */
export async function bulkSaveToFirestore<T extends { id: string }>(
  collectionName: string,
  items: T[],
  onProgress?: (savedCount: number, total: number) => void
): Promise<number> {
  if (!items || items.length === 0) return 0;
  if (isQuotaExhausted) {
    console.warn(`[Firestore] Tömeges mentés kihagyva a(z) ${collectionName} gyűjteményhez (kvóta elérve).`);
    return 0;
  }

  const BATCH_SIZE = 400;
  let savedCount = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    if (isQuotaExhausted) break;
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestoreDb);

    for (const item of chunk) {
      const docId = toSafeDocId(item.id);
      const docRef = doc(firestoreDb, collectionName, docId);
      const cleanData = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanData, { merge: true });
    }

    try {
      await batch.commit();
      savedCount += chunk.length;
      if (onProgress) onProgress(savedCount, items.length);
    } catch (err: any) {
      if (isQuotaError(err)) {
        isQuotaExhausted = true;
        console.warn(`[Firestore] Napi ingyenes írási kvóta betelt a(z) ${collectionName} mentésekor.`);
        break;
      }
      console.warn(`[Firestore] Hiba a(z) ${collectionName} köteg mentésekor:`, err?.message || err);
      break;
    }
  }

  return savedCount;
}

/**
 * Deletes all documents in a collection in batches.
 */
export async function clearFirestoreCollection(collectionName: string): Promise<number> {
  if (isQuotaExhausted) {
    return 0;
  }
  try {
    const colRef = collection(firestoreDb, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return 0;

    const BATCH_SIZE = 400;
    let deletedCount = 0;
    const docs = snapshot.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      if (isQuotaExhausted) break;
      const chunk = docs.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(firestoreDb);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      try {
        await batch.commit();
        deletedCount += chunk.length;
      } catch (err: any) {
        if (isQuotaError(err)) {
          isQuotaExhausted = true;
          break;
        }
        throw err;
      }
    }

    return deletedCount;
  } catch (err: any) {
    if (isQuotaError(err)) {
      isQuotaExhausted = true;
    }
    return 0;
  }
}

export interface FullDataset {
  products: Product[];
  positions: WarehousePosition[];
  inventory: InventoryRecord[];
  inspections: Inspection[];
  kanban: KanbanItem[];
  konSar: KonSarRelation[];
  termMerod: TermMerodRelation[];
  beepulo: BeepuloRelation[];
  fejSaru: FejSaruRelation[];
  saruSpecs: SaruSpec[];
  orders?: Order[];
  notes?: ProductNote[];
}

/**
 * Migrates or uploads an entire dataset into Firebase Firestore.
 */
export async function uploadAllToFirestore(
  data: FullDataset,
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; stats: Record<string, number>; quotaExceeded?: boolean }> {
  const stats: Record<string, number> = {};

  if (isQuotaExhausted) {
    console.warn('[Firestore] Feltöltés megállítva: a napi Firestore írási kvóta betelt.');
    return { success: false, stats, quotaExceeded: true };
  }

  try {
    if (onProgress) onProgress('Termékek mentése Firestore-ba...', 10);
    stats.products = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, data.products);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('Raktári pozíciók mentése Firestore-ba...', 20);
    stats.positions = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.POSITIONS, data.positions);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('Készlet tranzakciók mentése Firestore-ba...', 30);
    stats.inventory = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.INVENTORY, data.inventory);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('Karbantartások mentése Firestore-ba...', 40);
    stats.inspections = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.INSPECTIONS, data.inspections);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('Kanban kártyák mentése Firestore-ba...', 50);
    stats.kanban = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.KANBAN, data.kanban);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('KonSar kapcsolatok mentése Firestore-ba...', 60);
    stats.konSar = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.KONSAR, data.konSar);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('TermMerod kapcsolatok mentése Firestore-ba...', 70);
    stats.termMerod = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.TERMMEROD, data.termMerod);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('Beépülő alkatrészek mentése Firestore-ba...', 80);
    stats.beepulo = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.BEEPULO, data.beepulo);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('FejSaru kapcsolatok mentése Firestore-ba...', 85);
    stats.fejSaru = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.FEJSARU, data.fejSaru);

    if (isQuotaExhausted) return { success: false, stats, quotaExceeded: true };

    if (onProgress) onProgress('Saru specifikációs mátrix mentése Firestore-ba...', 90);
    stats.saruSpecs = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.SARUSPECS, data.saruSpecs);

    if (data.orders && data.orders.length > 0) {
      if (onProgress) onProgress('Rendelések mentése Firestore-ba...', 94);
      stats.orders = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.ORDERS, data.orders);
    }

    if (data.notes && data.notes.length > 0) {
      if (onProgress) onProgress('Notesz jegyzetek mentése Firestore-ba...', 97);
      stats.notes = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.NOTES, data.notes);
    }

    // Save sync metadata if quota allows
    if (!isQuotaExhausted) {
      try {
        const metaRef = doc(firestoreDb, FIRESTORE_COLLECTIONS.METADATA, 'sync_info');
        await setDoc(metaRef, {
          lastSyncedAt: new Date().toISOString(),
          syncedBy: 'web_app',
          totalRecords: Object.values(stats).reduce((a, b) => a + b, 0),
        }, { merge: true });
      } catch (mErr) {
        if (isQuotaError(mErr)) isQuotaExhausted = true;
      }
    }

    if (onProgress) onProgress('Kész! Adatok szinkronizálva a Firebase-ben.', 100);
    return { success: !isQuotaExhausted, stats, quotaExceeded: isQuotaExhausted };
  } catch (error: any) {
    if (isQuotaError(error)) {
      isQuotaExhausted = true;
      return { success: false, stats, quotaExceeded: true };
    }
    console.warn('Figyelmeztetés az uploadAllToFirestore során:', error?.message || error);
    return { success: false, stats };
  }
}

/**
 * Downloads the complete current database from Firebase Firestore.
 */
export async function downloadAllFromFirestore(): Promise<FullDataset> {
  const [
    products,
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
  ] = await Promise.all([
    getAllFromFirestore<Product>(FIRESTORE_COLLECTIONS.PRODUCTS),
    getAllFromFirestore<WarehousePosition>(FIRESTORE_COLLECTIONS.POSITIONS),
    getAllFromFirestore<InventoryRecord>(FIRESTORE_COLLECTIONS.INVENTORY),
    getAllFromFirestore<Inspection>(FIRESTORE_COLLECTIONS.INSPECTIONS),
    getAllFromFirestore<KanbanItem>(FIRESTORE_COLLECTIONS.KANBAN),
    getAllFromFirestore<KonSarRelation>(FIRESTORE_COLLECTIONS.KONSAR),
    getAllFromFirestore<TermMerodRelation>(FIRESTORE_COLLECTIONS.TERMMEROD),
    getAllFromFirestore<BeepuloRelation>(FIRESTORE_COLLECTIONS.BEEPULO),
    getAllFromFirestore<FejSaruRelation>(FIRESTORE_COLLECTIONS.FEJSARU),
    getAllFromFirestore<SaruSpec>(FIRESTORE_COLLECTIONS.SARUSPECS),
    getAllFromFirestore<Order>(FIRESTORE_COLLECTIONS.ORDERS).catch(() => []),
    getAllFromFirestore<ProductNote>(FIRESTORE_COLLECTIONS.NOTES).catch(() => []),
  ]);

  return {
    products,
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
}

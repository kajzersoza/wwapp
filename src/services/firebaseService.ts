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
  METADATA: 'metadata',
} as const;

/**
 * Saves or updates a single item in Firestore.
 */
export async function saveItemToFirestore<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  const docId = toSafeDocId(item.id);
  const docRef = doc(firestoreDb, collectionName, docId);
  // Clean undefined values to prevent Firestore error
  const cleanData = JSON.parse(JSON.stringify(item));
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Deletes a single item from Firestore.
 */
export async function deleteItemFromFirestore(
  collectionName: string,
  id: string
): Promise<void> {
  const docId = toSafeDocId(id);
  const docRef = doc(firestoreDb, collectionName, docId);
  await deleteDoc(docRef);
}

/**
 * Fetches all documents from a Firestore collection.
 */
export async function getAllFromFirestore<T>(collectionName: string): Promise<T[]> {
  const colRef = collection(firestoreDb, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => d.data() as T);
}

/**
 * Subscribes to real-time updates of a Firestore collection.
 */
export function subscribeToCollection<T extends { id?: string }>(
  collectionName: string,
  onUpdate: (items: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(firestoreDb, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = snapshot.docs.map((d) => d.data() as T);
      onUpdate(items);
    },
    (error) => {
      console.error(`Firestore subscription error on ${collectionName}:`, error);
      if (onError) onError(error);
    }
  );
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

  const BATCH_SIZE = 400;
  let savedCount = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestoreDb);

    for (const item of chunk) {
      const docId = toSafeDocId(item.id);
      const docRef = doc(firestoreDb, collectionName, docId);
      const cleanData = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanData, { merge: true });
    }

    await batch.commit();
    savedCount += chunk.length;
    if (onProgress) onProgress(savedCount, items.length);
  }

  return savedCount;
}

/**
 * Deletes all documents in a collection in batches.
 */
export async function clearFirestoreCollection(collectionName: string): Promise<number> {
  const colRef = collection(firestoreDb, collectionName);
  const snapshot = await getDocs(colRef);
  if (snapshot.empty) return 0;

  const BATCH_SIZE = 400;
  let deletedCount = 0;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestoreDb);
    for (const d of chunk) {
      batch.delete(d.ref);
    }
    await batch.commit();
    deletedCount += chunk.length;
  }

  return deletedCount;
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
}

/**
 * Migrates or uploads an entire dataset into Firebase Firestore.
 */
export async function uploadAllToFirestore(
  data: FullDataset,
  onProgress?: (step: string, percent: number) => void
): Promise<{ success: boolean; stats: Record<string, number> }> {
  const stats: Record<string, number> = {};

  try {
    if (onProgress) onProgress('Termékek mentése Firestore-ba...', 10);
    stats.products = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.PRODUCTS, data.products);

    if (onProgress) onProgress('Raktári pozíciók mentése Firestore-ba...', 20);
    stats.positions = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.POSITIONS, data.positions);

    if (onProgress) onProgress('Készlet tranzakciók mentése Firestore-ba...', 30);
    stats.inventory = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.INVENTORY, data.inventory);

    if (onProgress) onProgress('Karbantartások mentése Firestore-ba...', 45);
    stats.inspections = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.INSPECTIONS, data.inspections);

    if (onProgress) onProgress('Kanban kártyák mentése Firestore-ba...', 60);
    stats.kanban = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.KANBAN, data.kanban);

    if (onProgress) onProgress('KonSar kapcsolatok mentése Firestore-ba...', 70);
    stats.konSar = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.KONSAR, data.konSar);

    if (onProgress) onProgress('TermMerod kapcsolatok mentése Firestore-ba...', 80);
    stats.termMerod = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.TERMMEROD, data.termMerod);

    if (onProgress) onProgress('Beépülő alkatrészek mentése Firestore-ba...', 85);
    stats.beepulo = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.BEEPULO, data.beepulo);

    if (onProgress) onProgress('FejSaru kapcsolatok mentése Firestore-ba...', 90);
    stats.fejSaru = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.FEJSARU, data.fejSaru);

    if (onProgress) onProgress('Saru specifikációs mátrix mentése Firestore-ba...', 95);
    stats.saruSpecs = await bulkSaveToFirestore(FIRESTORE_COLLECTIONS.SARUSPECS, data.saruSpecs);

    // Save sync metadata
    const metaRef = doc(firestoreDb, FIRESTORE_COLLECTIONS.METADATA, 'sync_info');
    await setDoc(metaRef, {
      lastSyncedAt: new Date().toISOString(),
      syncedBy: 'web_app',
      totalRecords: Object.values(stats).reduce((a, b) => a + b, 0),
    }, { merge: true });

    if (onProgress) onProgress('Kész! Minden adat szinkronizálva a Firebase-ben.', 100);
    return { success: true, stats };
  } catch (error) {
    console.error('Error in uploadAllToFirestore:', error);
    throw error;
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
  };
}

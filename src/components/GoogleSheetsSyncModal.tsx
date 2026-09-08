import React, { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import {
  FileSpreadsheet,
  RefreshCw,
  Upload,
  Download,
  Copy,
  Check,
  X,
  AlertCircle,
  Link2,
  Table,
  Layers,
  Boxes,
  MapPin,
  History,
  ClipboardList,
  Gauge,
  Puzzle,
  Zap,
  Kanban as KanbanIcon,
  Database,
  Flame,
  HardDrive,
} from 'lucide-react';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    sheetUrl,
    setSheetUrl,
    isSyncing,
    syncError,
    lastSyncedAt,
    syncWithGoogleSheet,
    importCsvText,
    importPositionsCsvText,
    importInventoryCsvText,
    importInspectionsCsvText,
    importKanbanCsvText,
    importKonSarCsvText,
    importTermMerodCsvText,
    importBeepuloCsvText,
    importFejSaruCsvText,
    exportCsv,
    exportPositionsCsv,
    exportInventoryCsv,
    exportInspectionsCsv,
    exportKanbanCsv,
    exportKonSarCsv,
    exportTermMerodCsv,
    exportBeepuloCsv,
    exportFejSaruCsv,
    totalCount,
    positions,
    inventory,
    inspections,
    kanban,
    konSar,
    termMerod,
    beepulo,
    fejSaru,
    saruSpecs,
    isFirebaseConnected,
    isFirebaseLoading,
    firebaseError,
    firebaseSyncTime,
    firebaseStats,
    migrateToFirebase,
    refreshFromFirebase,
    exportFullBackupJson,
    importFullBackupJson,
  } = useProducts();

  const [customUrl, setCustomUrl] = useState(sheetUrl);
  const [pasteData, setPasteData] = useState('');
  const [pasteTarget, setPasteTarget] = useState<'products' | 'positions' | 'inventory' | 'inspections' | 'kanban' | 'konsar' | 'termmerod' | 'beepulo' | 'fejsaru'>('products');
  const [importResult, setImportResult] = useState<string | null>(null);
  const [copiedClipboard, setCopiedClipboard] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'file' | 'paste' | 'columns' | 'firebase'>('firebase');
  const [exportSheetType, setExportSheetType] = useState<'products' | 'positions' | 'inventory' | 'inspections' | 'kanban' | 'konsar' | 'termmerod' | 'beepulo' | 'fejsaru'>('products');
  const [isFirebaseActionLoading, setIsFirebaseActionLoading] = useState(false);

  if (!isOpen) return null;

  const handleLiveSync = async () => {
    setSheetUrl(customUrl);
    await syncWithGoogleSheet(customUrl);
    setImportResult('A szinkronizáció sikeresen lezajlott a Google Táblázat összes munkalapjáról és automatikusan el lett mentve a Firebase Firestore-ba!');
  };

  const handleFirebaseRefresh = async () => {
    try {
      setIsFirebaseActionLoading(true);
      await refreshFromFirebase();
      setImportResult('A Firebase Firestore adatbázisból a legfrissebb adatok sikeresen be lettek töltve!');
    } catch (err: unknown) {
      setImportResult(`Hiba történt a Firebase frissítéskor: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFirebaseActionLoading(false);
    }
  };

  const handleFirebaseMigrate = async () => {
    try {
      setIsFirebaseActionLoading(true);
      const res = await migrateToFirebase();
      const total = Object.values(res.stats).reduce((a, b) => a + b, 0);
      setImportResult(`Sikeres szinkronizáció a Firebase Firestore felhőbe! Összesen ${total} tétel mentve.`);
    } catch (err: unknown) {
      setImportResult(`Hiba történt a Firebase mentéskor: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsFirebaseActionLoading(false);
    }
  };

  const handleDownloadFullBackup = () => {
    const jsonString = exportFullBackupJson();
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `world_wires_full_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setImportResult('Teljes adatbázis biztonsági mentés sikeresen letöltve (JSON formátumban)!');
  };

  const handleFullBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          setIsFirebaseActionLoading(true);
          const res = await importFullBackupJson(text);
          setImportResult(`Sikeresen visszatöltve a teljes adatbázis mentés! (${res.count} rekord frissítve a Firebase Firestore-ban).`);
        } catch (err: unknown) {
          setImportResult(`Hiba a JSON mentés beolvasásakor: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          setIsFirebaseActionLoading(false);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, targetSheet: 'products' | 'positions' | 'inventory' | 'inspections' | 'kanban' | 'konsar' | 'termmerod' | 'beepulo' | 'fejsaru') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        if (targetSheet === 'products') {
          const count = importCsvText(text);
          setImportResult(`Sikeresen importálva ${count} termék a fájlból!`);
        } else if (targetSheet === 'positions') {
          const count = importPositionsCsvText(text);
          setImportResult(`Sikeresen importálva ${count} raktári pozíció a fájlból!`);
        } else if (targetSheet === 'inventory') {
          const count = importInventoryCsvText(text);
          setImportResult(`Sikeresen importálva ${count} tranzakció az Inventory Transactions fájlból!`);
        } else if (targetSheet === 'inspections') {
          const count = importInspectionsCsvText(text);
          setImportResult(`Sikeresen importálva ${count} karbantartási bejegyzés az Inspections fájlból!`);
        } else if (targetSheet === 'kanban') {
          const count = importKanbanCsvText(text);
          setImportResult(`Sikeresen importálva ${count} feladat a Kanban fájlból!`);
        } else if (targetSheet === 'konsar') {
          const count = importKonSarCsvText(text);
          setImportResult(`Sikeresen importálva ${count} kapcsolat a KonSar fájlból!`);
        } else if (targetSheet === 'termmerod') {
          const count = importTermMerodCsvText(text);
          setImportResult(`Sikeresen importálva ${count} kapcsolat a TermMerod fájlból!`);
        } else if (targetSheet === 'beepulo') {
          const count = importBeepuloCsvText(text);
          setImportResult(`Sikeresen importálva ${count} kapcsolat a Beépülő Alkatrész fájlból!`);
        } else {
          const count = importFejSaruCsvText(text);
          setImportResult(`Sikeresen importálva ${count} kapcsolat a FejSaru fájlból!`);
        }
      }
    };
    reader.readAsText(file);
  };

  const handlePasteImport = () => {
    if (!pasteData.trim()) return;
    if (pasteTarget === 'products') {
      const count = importCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} termék!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes termékeket találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'positions') {
      const count = importPositionsCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} raktári pozíció!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes pozíciókat találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'inventory') {
      const count = importInventoryCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} tranzakció (Inventory Transactions)!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes raktármozgási tranzakciókat találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'inspections') {
      const count = importInspectionsCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} karbantartási bejegyzés (Inspections)!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes karbantartási adatokat találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'kanban') {
      const count = importKanbanCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} feladat a Kanban táblára!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes Kanban feladatokat találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'konsar') {
      const count = importKonSarCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} Konnektor - Saru kapcsolat (KonSar)!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes KonSar adatokat találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'termmerod') {
      const count = importTermMerodCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} Termék - Mérődoboz kapcsolat (TermMerod)!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes TermMerod adatokat találni a beillesztett szövegben.');
      }
    } else if (pasteTarget === 'beepulo') {
      const count = importBeepuloCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} Beépülő Alkatrész kapcsolat!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes Beépülő Alkatrész adatokat találni a beillesztett szövegben.');
      }
    } else {
      const count = importFejSaruCsvText(pasteData);
      if (count > 0) {
        setImportResult(`Sikeresen beillesztve és frissítve ${count} Saruzófej - Saru kapcsolat (FejSaru)!`);
        setPasteData('');
      } else {
        setImportResult('Nem sikerült érvényes FejSaru adatokat találni a beillesztett szövegben.');
      }
    }
  };

  const getExportData = (): { csv: string; filename: string } => {
    if (exportSheetType === 'positions') {
      return {
        csv: exportPositionsCsv(),
        filename: `Positions_Worksheet_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'inventory') {
      return {
        csv: exportInventoryCsv(),
        filename: `Inventory_Transactions_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'inspections') {
      return {
        csv: exportInspectionsCsv(),
        filename: `Inspections_Worksheet_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'kanban') {
      return {
        csv: exportKanbanCsv(),
        filename: `Kanban_Worksheet_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'konsar') {
      return {
        csv: exportKonSarCsv(),
        filename: `KonSar_Relations_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'termmerod') {
      return {
        csv: exportTermMerodCsv(),
        filename: `TermMerod_Relations_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'beepulo') {
      return {
        csv: exportBeepuloCsv(),
        filename: `Beepulo_Alkatreszek_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    if (exportSheetType === 'fejsaru') {
      return {
        csv: exportFejSaruCsv(),
        filename: `FejSaru_Relations_${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }
    return {
      csv: exportCsv(),
      filename: `Productions_Products_${new Date().toISOString().slice(0, 10)}.csv`,
    };
  };

  const handleCopyCsv = () => {
    const { csv } = getExportData();
    navigator.clipboard.writeText(csv);
    setCopiedClipboard(true);
    setTimeout(() => setCopiedClipboard(false), 2000);
  };

  const handleDownloadCsv = () => {
    const { csv, filename } = getExportData();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columnsList = [
    { name: 'Termék ID', desc: 'Egyedi azonosító kulcs (pl. 40107.00.33, ME.911330114)', required: true },
    { name: 'Termék név', desc: 'Megnevezés (pl. N1, ELSŐ MOZGÓ ÜLLŐ)', required: true },
    { name: 'Leírás', desc: 'Műszaki leírás, megjegyzés' },
    { name: 'Image', desc: 'Kép URL vagy fájlútvonal' },
    { name: 'Kategória', desc: 'Csoportosítás (pl. Saruzófej, Alkatrész)' },
    { name: 'Gyártó', desc: 'Gyártó (pl. Mecal, Kormak)' },
    { name: 'Adagolás', desc: 'Oldal / Hátsó norma' },
    { name: 'Alkatrész Típus', desc: 'Specifikus típus (pl. MOZGÓ ÜLLŐ)' },
    { name: 'Szigelés Típus', desc: 'Nem Gumis / Gumis' },
    { name: 'Gyári Kód', desc: 'Gyári cikkszám (pl. MLS0185-J)' },
    { name: 'Szigetelésmegfogó Típusa', desc: 'Pofa profil (pl. F, O)' },
    { name: 'Konektor Típusa', desc: 'Csatlakozó típus' },
    { name: 'Saru Típusa', desc: 'Saru specifikáció' },
    { name: 'Date', desc: 'Dátum (pl. 2024. 09. 01.)' },
    { name: 'Minőség', desc: 'Állapot (pl. Új)' },
    { name: 'Alkatrész Hely', desc: 'Raktári rekesz / polc' },
  ];

  const positionsColumnsList = [
    { name: 'Pozíció ID', desc: 'Egyedi pozíció kulcs (pl. POS-001, A-01-01)', required: true },
    { name: 'Pozíció név', desc: 'Lehetséges raktári pozíció megnevezése (pl. Alkatrész A1, Polc C1)', required: true },
    { name: 'Leírás', desc: 'Opcionális zóna, megjegyzés vagy szintek' },
  ];

  const inventoryColumnsList = [
    { name: 'Tranzakció ID', desc: 'Egyedi saját raktármozgási kulcs (pl. TRX-001, TRX-1002)', required: true },
    { name: 'Pozíció ID', desc: 'A Positions munkalapról vett Pozíció ID', required: true },
    { name: 'Termék ID', desc: 'A Productions munkalapról vett Termék ID', required: true },
    { name: 'Mennyiség', desc: '+/- darabszámot jelöl (pl. +10 bevételezés, -2 kiadás)', required: true },
    { name: 'Dátum', desc: 'Dátum és időpont (pl. 2024-09-01 14:30)' },
    { name: 'Megjegyzés', desc: 'Mozgás indoklása (opcionális)' },
  ];

  const inspectionsColumnsList = [
    { name: 'Inspection ID', desc: 'Egyedi karbantartási azonosító kulcs (pl. INSP-001)', required: true },
    { name: 'Termék ID', desc: 'A karbantartott gép/eszköz Termék ID-ja (pl. 40107.00.33)', required: true },
    { name: 'Status', desc: 'Karbantartási státusz (pl. Befejezve, Alkatrész cserélve, Folyamatban)', required: true },
    { name: 'Leírás', desc: 'Elvégzett munka, hiba leírása, észrevételek' },
    { name: 'Change Item', desc: 'Cserélt alkatrész Termék ID-ja (ha volt csere, kattintható közvetlen link)' },
    { name: 'Date', desc: 'Karbantartás dátuma (pl. 2024. 09. 15.)' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-stone-900 text-base">
                Google Sheets Szinkronizáció & Adatkezelés
              </h2>
              <p className="text-xs text-stone-500">
                Productions, Positions, Inventory Transactions és Inspections munkalapok kezelése
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub tabs */}
        <div className="flex border-b border-stone-200 bg-stone-100/70 px-4 text-xs font-semibold gap-2 overflow-x-auto">
          <button
            type="button"
            id="tab-firebase-btn"
            onClick={() => setActiveSubTab('firebase')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'firebase'
                ? 'border-[#006067] text-[#006067] font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-[#006067]" />
            <span>Firebase Adatbázis</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Élő Firestore felhő" />
          </button>
          <button
            type="button"
            id="tab-live-btn"
            onClick={() => setActiveSubTab('live')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'live'
                ? 'border-[#006067] text-[#006067] font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Élő Google Táblázat Link
          </button>
          <button
            type="button"
            id="tab-file-btn"
            onClick={() => setActiveSubTab('file')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'file'
                ? 'border-[#006067] text-[#006067] font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            CSV / Fájl Feltöltés
          </button>
          <button
            type="button"
            id="tab-paste-btn"
            onClick={() => setActiveSubTab('paste')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'paste'
                ? 'border-[#006067] text-[#006067] font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Vágólapról Beillesztés
          </button>
          <button
            type="button"
            id="tab-columns-btn"
            onClick={() => setActiveSubTab('columns')}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeSubTab === 'columns'
                ? 'border-[#006067] text-[#006067] font-bold'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            Munkalap Struktúrák
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs text-stone-700">
          {importResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{importResult}</span>
            </div>
          )}

          {firebaseError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Firebase figyelmeztetés</p>
                <p className="text-[11px] mt-0.5">{firebaseError}</p>
              </div>
            </div>
          )}

          {syncError && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Szinkronizálási figyelmeztetés</p>
                <p className="text-[11px] mt-0.5">{syncError}</p>
              </div>
            </div>
          )}

          {/* TAB 0: Firebase Cloud Database */}
          {activeSubTab === 'firebase' && (
            <div className="space-y-5">
              {/* Cloud Status Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-stone-50 to-[#E0E9E8]/40 border border-[#006067]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#006067] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-sm">Firebase Firestore Adatbázis</span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {isFirebaseConnected ? 'Csatlakozva (Élő felhő)' : 'Inicializálás...'}
                      </span>
                    </div>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      {firebaseSyncTime ? `Legutóbbi szinkronizálás: ${firebaseSyncTime}` : 'Valós idejű szinkronizáció aktív'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    id="firebase-refresh-btn"
                    onClick={handleFirebaseRefresh}
                    disabled={isFirebaseActionLoading || isFirebaseLoading}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-medium flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-60 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#006067] ${isFirebaseActionLoading || isFirebaseLoading ? 'animate-spin' : ''}`} />
                    <span>Újratöltés</span>
                  </button>
                  <button
                    type="button"
                    id="firebase-migrate-btn"
                    onClick={handleFirebaseMigrate}
                    disabled={isFirebaseActionLoading || isFirebaseLoading}
                    className="px-3 py-1.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-medium flex items-center gap-1.5 cursor-pointer text-xs disabled:opacity-60 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Feltöltés / Mentés</span>
                  </button>
                </div>
              </div>

              {/* Collections stats overview */}
              <div>
                <h3 className="font-bold text-stone-900 text-xs mb-2">Firestore Kollekciók & Tételek</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Productions (Termékek)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.products ?? totalCount).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Positions (Raktári helyek)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.positions ?? positions.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Inventory (Mozgások)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.inventory ?? inventory.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Inspections (Karbantartás)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.inspections ?? inspections.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Kanban Tábla</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.kanban ?? kanban.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">KonSar (Konnektor-Saru)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.konSar ?? konSar.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">TermMerod (Termék-Mérődoboz)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.termMerod ?? termMerod.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Beépülő Alkatrészek</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.beepulo ?? beepulo.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">FejSaru (Saruzófej-Saru)</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.fejSaru ?? fejSaru.length).toLocaleString('hu-HU')} db</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-stone-200">
                    <div className="text-stone-500 text-[10px] uppercase font-bold tracking-wider">Saru Segédtáblázat</div>
                    <div className="text-stone-900 font-bold text-base mt-0.5">{(firebaseStats?.saruSpecs ?? saruSpecs.length).toLocaleString('hu-HU')} db</div>
                  </div>
                </div>
              </div>

              {/* Full Database Backup & Restore Box */}
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#006067]" />
                  <span className="font-bold text-stone-900 text-xs">Teljes Adatbázis Biztonsági Mentés & Visszaállítás (JSON)</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  A teljes adatbázis – beleértve az összes terméket, raktári pozíciót, tranzakciót, karbantartási jegyzőkönyvet és relációt – egyetlen biztonsági JSON fájlba exportálható, illetve onnan egy kattintással visszaállítható.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="full-backup-download-btn"
                    onClick={handleDownloadFullBackup}
                    className="px-3 py-2 rounded-lg bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold flex items-center gap-1.5 cursor-pointer text-xs shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#006067]" />
                    <span>Teljes Mentés Letöltése (.JSON)</span>
                  </button>

                  <label
                    htmlFor="full-backup-upload-input"
                    className="px-3 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-semibold flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Mentés Visszatöltése (.JSON)</span>
                    <input
                      id="full-backup-upload-input"
                      type="file"
                      accept=".json"
                      onChange={handleFullBackupUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Live Sync */}
          {activeSubTab === 'live' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Google Táblázat Fő URL (vagy megosztott link)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      id="google-sheet-url-input"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:bg-white focus:border-[#006067] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    id="sync-now-modal-btn"
                    onClick={handleLiveSync}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-[#006067] hover:bg-[#00474c] disabled:opacity-50 text-white font-medium rounded-lg flex items-center gap-2 transition-colors cursor-pointer flex-shrink-0 shadow-xs"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Letöltés...' : 'Összes Munkalap Szinkronizálása'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5">
                  A szinkronizálás automatikusan beolvassa a <strong>Productions</strong> (termékek), <strong>Positions</strong> (raktári pozíciók), <strong>Inventory Transactions</strong> (raktármozgások), <strong>Inspections</strong> (karbantartások), <strong>Kanban</strong> (feladatok), <strong>KonSar</strong> (konnektor-saru), <strong>TermMerod</strong> (mérődobozok) és <strong>Beépülő alkatrész</strong> munkalapokat.
                </p>
              </div>

              {/* Worksheets overview card */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <p className="text-xs font-bold text-stone-800">Szinkronizált munkalapok állapota:</p>
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">Productions</span>
                    <span className="font-mono font-bold text-stone-900 text-sm">{totalCount} termék</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">Positions</span>
                    <span className="font-mono font-bold text-[#006067] text-sm">{positions.length} pozíció</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">Kanban</span>
                    <span className="font-mono font-bold text-amber-700 text-sm">{kanban.length} kártya</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">Inventory</span>
                    <span className="font-mono font-bold text-emerald-800 text-sm">{inventory.length} mozgás</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">Inspections</span>
                    <span className="font-mono font-bold text-amber-800 text-sm">{inspections.length} szerviz</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">KonSar</span>
                    <span className="font-mono font-bold text-teal-800 text-sm">{konSar.length} kapcsolat</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">TermMerod</span>
                    <span className="font-mono font-bold text-emerald-900 text-sm">{termMerod.length} kapcsolat</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">Beépülő</span>
                    <span className="font-mono font-bold text-indigo-900 text-sm">{beepulo.length} kapcsolat</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                    <span className="text-[10px] text-stone-400 font-bold block uppercase">FejSaru</span>
                    <span className="font-mono font-bold text-amber-800 text-sm">{fejSaru.length} kapcsolat</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-200/80 text-[11px]">
                  <span className="text-stone-500 font-medium">Utolsó sikeres szinkron:</span>
                  <span className="font-mono text-stone-800 font-semibold">
                    {lastSyncedAt || 'Még nem történt'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: File Upload */}
          {activeSubTab === 'file' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-stone-800 mb-2">
                  Válassza ki, melyik munkalap adatait kívánja feltölteni CSV formátumban:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <Boxes className="w-5 h-5 text-[#006067] mb-1" />
                    <span className="font-bold text-stone-900 text-xs">Productions</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Terméklista</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'products')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <MapPin className="w-5 h-5 text-[#006067] mb-1" />
                    <span className="font-bold text-stone-900 text-xs">Positions</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Pozíciók</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'positions')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <KanbanIcon className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="font-bold text-stone-900 text-xs">Kanban</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Feladatok</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'kanban')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <History className="w-5 h-5 text-[#006067] mb-1" />
                    <span className="font-bold text-stone-900 text-xs">Inventory</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Mozgások</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'inventory')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <ClipboardList className="w-5 h-5 text-[#006067] mb-1" />
                    <span className="font-bold text-stone-900 text-xs">Inspections</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Karbantartás</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'inspections')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <Link2 className="w-5 h-5 text-[#006067] mb-1" />
                    <span className="font-bold text-stone-900 text-xs">KonSar</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Kapcsolatok</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'konsar')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <Gauge className="w-5 h-5 text-emerald-800 mb-1" />
                    <span className="font-bold text-stone-900 text-xs">TermMerod</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Mérődobozok</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'termmerod')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <Puzzle className="w-5 h-5 text-indigo-700 mb-1" />
                    <span className="font-bold text-stone-900 text-xs">Beépülő</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Alkatrészek</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'beepulo')}
                    />
                  </label>

                  <label className="border border-stone-200 rounded-xl p-3 bg-stone-50 hover:bg-[#E0E9E8]/30 transition-all cursor-pointer flex flex-col items-center text-center">
                    <Zap className="w-5 h-5 text-amber-600 mb-1" />
                    <span className="font-bold text-stone-900 text-xs">FejSaru</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">Saruzófej-Saru</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'fejsaru')}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Paste Import */}
          {activeSubTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  Cél munkalap:
                </label>
                <select
                  value={pasteTarget}
                  onChange={(e) => setPasteTarget(e.target.value as 'products' | 'positions' | 'inventory' | 'inspections' | 'kanban' | 'konsar' | 'termmerod' | 'beepulo' | 'fejsaru')}
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white focus:border-[#006067] outline-none mb-3"
                >
                  <option value="products">Productions — Terméklista és alkatrészek</option>
                  <option value="positions">Positions — Raktári pozíciók (Pozíció ID, Pozíció név)</option>
                  <option value="kanban">Kanban — Feladatok és munkafolyamat (ID, Cím, Státusz, Prioritás, Felelős, Határidő)</option>
                  <option value="inventory">Inventory Transactions — Raktármozgások (Tranzakció ID, Pozíció ID, Termék ID, Mennyiség, Dátum)</option>
                  <option value="inspections">Inspections — Karbantartási munkalap (Inspection ID, Termék ID, Status, Leírás, Change Item, Date)</option>
                  <option value="konsar">KonSar — Konnektor - Saru kapcsolatok (ID, Termék ID 1, Termék ID 2)</option>
                  <option value="termmerod">TermMerod — Termék - Mérődoboz kapcsolatok (ID, Termék ID, Mérődoboz ID)</option>
                  <option value="beepulo">Beépülő alkatrész — Termékbe beépülő alkatrészek (ID, Főtermék ID, Beépülő Termék ID)</option>
                  <option value="fejsaru">FejSaru — Saruzófej - Saru kapcsolatok (ID, Saruzófej ID, Saru ID)</option>
                </select>

                <label className="block text-xs font-bold text-stone-800 mb-1">
                  CSV vagy Tabulátorral tagolt szöveg:
                </label>
                <textarea
                  rows={6}
                  value={pasteData}
                  onChange={(e) => setPasteData(e.target.value)}
                  placeholder="Illessze be ide a Google Táblázatból vagy Excelből kimásolt sorokat..."
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg p-3 text-xs font-mono focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handlePasteImport}
                disabled={!pasteData.trim()}
                className="w-full py-2.5 bg-[#006067] hover:bg-[#00474c] disabled:opacity-50 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Adatok Beillesztése és Frissítése</span>
              </button>
            </div>
          )}

          {/* TAB 4: Columns Documentation */}
          {activeSubTab === 'columns' && (
            <div className="space-y-5">
              {/* Kanban Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <KanbanIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Kanban Munkalap Oszlopai (Feladatok és Munkafolyamat)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">ID / Kártya ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Egyedi feladat azonosító (pl. KAN-001)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Cím / Feladat</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Feladat vagy művelet rövid megnevezése</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Státusz</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező (4 oszlop)
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px] font-semibold text-amber-800">
                      Terv | Folyamatban | Teszt | Befejezve
                    </span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Prioritás</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">low / medium / high / urgent</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Felelős</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Hozzárendelt munkatárs neve</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Termék ID / Cél Kód</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Kapcsolódó termék vagy eszköz azonosítója</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Határidő</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">ÉÉÉÉ-HH-NN formátum (pl. 2024-09-20)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Címkék</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Vesszővel elválasztott címkék</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Leírás</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Részletes technikai és műveleti leírás</span>
                  </div>
                </div>
              </div>

              {/* FejSaru Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>FejSaru Munkalap Oszlopai (Saruzófej – Saru Kapcsolatok)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Egyedi kapcsolat azonosító (pl. FS-001, 1, 2)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Saruzófej ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Saruzófej termék azonosító kulcsa (pl. ME.911330114)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Saru ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Saru termék azonosító kulcsa (pl. 40107.00.33)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Megjegyzés / Típus</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Megjegyzés, illesztési specifikáció</span>
                  </div>
                </div>
              </div>

              {/* Beépülő Alkatrész Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <Puzzle className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Beépülő alkatrész Munkalap Oszlopai (Termékbe Beépülő Komponensek)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Egyedi kapcsolat azonosító (pl. BP-001, 1, 2)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Főtermék ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Fő termék azonosító kulcsa (pl. 40107.00.33)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Beépülő Termék ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Beépülő alkatrész termék azonosító kulcsa (pl. ME.911330114)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Mennyiség</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Beépülő darabszám (alapértelmezett: 1)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Megjegyzés / Pozíció</span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Beépítési megjegyzés vagy alkatrész pozíció</span>
                  </div>
                </div>
              </div>

              {/* TermMerod Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-800" />
                  <span>TermMerod Munkalap Oszlopai (Termék - Mérődoboz Kapcsolatok)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Egyedi kapcsolat azonosító (pl. TM-001, 1, 2)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Termék ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Termék azonosító kulcsa (pl. 40107.00.33)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Mérődoboz ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Mérődoboz termék azonosító kulcsa (pl. MD-001)</span>
                  </div>
                </div>
              </div>

              {/* KonSar Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-[#006067]" />
                  <span>KonSar Munkalap Oszlopai (Konnektor - Saru Kapcsolatok)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">ID</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Egyedi kapcsolat azonosító (pl. KS-001, 1, 2)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Termék ID 1</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Konnektor termék azonosító kulcsa (pl. 40107.00.33)</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-stone-800">Termék ID 2</span>
                      <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                        Kötelező kulcs
                      </span>
                    </div>
                    <span className="text-stone-500 text-[11px]">Saru termék azonosító kulcsa (pl. ME.911330114)</span>
                  </div>
                </div>
              </div>

              {/* Inspections Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-[#006067]" />
                  <span>Inspections Munkalap Oszlopai (Karbantartás)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  {inspectionsColumnsList.map((col) => (
                    <div key={col.name} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-stone-800">{col.name}</span>
                        {col.required && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                            Kötelező kulcs
                          </span>
                        )}
                      </div>
                      <span className="text-stone-500 text-[11px]">{col.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Positions Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#006067]" />
                  <span>Positions Munkalap Oszlopai</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  {positionsColumnsList.map((col) => (
                    <div key={col.name} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-stone-800">{col.name}</span>
                        {col.required && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                            Kötelező kulcs
                          </span>
                        )}
                      </div>
                      <span className="text-stone-500 text-[11px]">{col.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inventory Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#006067]" />
                  <span>Inventory Transactions Munkalap Oszlopai</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden bg-white">
                  {inventoryColumnsList.map((col) => (
                    <div key={col.name} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-stone-800">{col.name}</span>
                        {col.required && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                            Kötelező
                          </span>
                        )}
                      </div>
                      <span className="text-stone-500 text-[11px]">{col.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Productions Structure */}
              <div>
                <h4 className="font-bold text-stone-900 text-xs mb-1.5 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-[#006067]" />
                  <span>Productions Munkalap Oszlopai (16 mező)</span>
                </h4>
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden max-h-48 overflow-y-auto bg-white">
                  {columnsList.map((col) => (
                    <div key={col.name} className="p-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-stone-800">{col.name}</span>
                        {col.required && (
                          <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                            Kötelező
                          </span>
                        )}
                      </div>
                      <span className="text-stone-500 text-[11px]">{col.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer: CSV Export Options */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-stone-500 font-medium">Export:</span>
            <select
              value={exportSheetType}
              onChange={(e) => setExportSheetType(e.target.value as 'products' | 'positions' | 'inventory' | 'inspections' | 'kanban' | 'konsar' | 'termmerod' | 'beepulo' | 'fejsaru')}
              className="bg-white border border-stone-300 rounded-md px-2 py-1 text-xs font-medium text-stone-800"
            >
              <option value="products">Productions CSV</option>
              <option value="positions">Positions CSV</option>
              <option value="kanban">Kanban CSV</option>
              <option value="inventory">Inventory Transactions CSV</option>
              <option value="inspections">Inspections CSV</option>
              <option value="konsar">KonSar (Konnektor-Saru) CSV</option>
              <option value="termmerod">TermMerod (Termék-Mérődoboz) CSV</option>
              <option value="beepulo">Beépülő alkatrész CSV</option>
              <option value="fejsaru">FejSaru (Saruzófej-Saru) CSV</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyCsv}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedClipboard ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Másolva!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Másolás</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3 py-1.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Letöltés (.CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

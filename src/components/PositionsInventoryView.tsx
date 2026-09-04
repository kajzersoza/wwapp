import React, { useState, useMemo, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { WarehousePosition, InventoryTransaction } from '../types';
import { TermekIdLink } from './TermekIdLink';
import {
  MapPin,
  Boxes,
  Plus,
  Search,
  ArrowUpDown,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Layers,
  Edit2,
  Trash2,
  X,
  Check,
  Package,
  History,
  MoveHorizontal,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Info,
  ExternalLink,
} from 'lucide-react';

export const PositionsInventoryView: React.FC = () => {
  const {
    positions,
    inventory,
    products,
    selectedPositionId,
    setSelectedPositionId,
    addPosition,
    updatePosition,
    deletePosition,
    deleteInventoryRecord,
    adjustStock,
    recordTransaction,
    getNextTransactionId,
    getPositionProducts,
    getPositionTotalItems,
    getProductTotalStock,
    getProductPositions,
    getProductStockBreakdown,
    selectProductById,
  } = useProducts();

  const [activeTab, setActiveTab] = useState<'transactions' | 'positions'>(
    selectedPositionId ? 'positions' : 'transactions'
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Switch to positions tab if a position is selected from elsewhere (e.g. from product detail or card)
  useEffect(() => {
    if (selectedPositionId) {
      setActiveTab('positions');
    }
  }, [selectedPositionId]);

  // Quick Inline / Card Form visibility
  const [showTransactionForm, setShowTransactionForm] = useState(true);

  // Position Modal state
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<WarehousePosition | null>(null);
  const [positionForm, setPositionForm] = useState({ id: '', name: '', description: '' });

  // Current date formatted for datetime-local input
  const getTodayDateTimeString = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // Transaction Form state
  const [trxForm, setTrxForm] = useState<{
    id: string;
    type: 'add' | 'remove' | 'transfer';
    productId: string;
    positionId: string;
    targetPositionId: string;
    quantity: number;
    date: string;
    note: string;
  }>({
    id: '',
    type: 'add',
    productId: products[0]?.id || '',
    positionId: positions[0]?.id || '',
    targetPositionId: positions[1]?.id || positions[0]?.id || '',
    quantity: 1,
    date: getTodayDateTimeString(),
    note: '',
  });

  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);

  // Calculate high-level stats from Inventory Transactions
  const totalStockCount = useMemo(() => {
    return inventory.reduce((sum, rec) => sum + (rec.quantity || 0), 0);
  }, [inventory]);

  const uniqueProductsInStock = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((rec) => {
      if (rec.productId) set.add(rec.productId.trim());
    });
    return set.size;
  }, [inventory]);

  // Filtered inventory transactions
  const filteredTransactions = useMemo(() => {
    let list = [...inventory];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((rec) => {
        const prod = products.find((p) => p.id === rec.productId);
        const pos = positions.find((p) => p.id === rec.positionId);
        return (
          rec.id.toLowerCase().includes(q) ||
          rec.productId.toLowerCase().includes(q) ||
          rec.positionId.toLowerCase().includes(q) ||
          (prod && prod.name.toLowerCase().includes(q)) ||
          (pos && pos.name.toLowerCase().includes(q)) ||
          (rec.date && rec.date.toLowerCase().includes(q)) ||
          (rec.note && rec.note.toLowerCase().includes(q))
        );
      });
    }
    // Sort descending by date or id
    return list.sort((a, b) => (b.date || b.id).localeCompare(a.date || a.id));
  }, [inventory, products, positions, searchQuery]);

  // Filtered positions
  const filteredPositions = useMemo(() => {
    if (!searchQuery.trim()) return positions;
    const q = searchQuery.toLowerCase().trim();
    return positions.filter(
      (pos) =>
        pos.id.toLowerCase().includes(q) ||
        pos.name.toLowerCase().includes(q) ||
        pos.description?.toLowerCase().includes(q)
    );
  }, [positions, searchQuery]);

  // Selected product & position preview calculations for form
  const currentSelectedProd = useMemo(() => {
    return products.find((p) => p.id === trxForm.productId) || null;
  }, [products, trxForm.productId]);

  const currentSelectedPos = useMemo(() => {
    return positions.find((p) => p.id === trxForm.positionId) || null;
  }, [positions, trxForm.positionId]);

  const currentTargetPos = useMemo(() => {
    return positions.find((p) => p.id === trxForm.targetPositionId) || null;
  }, [positions, trxForm.targetPositionId]);

  // Current stock on selected position
  const currentStockOnPos = useMemo(() => {
    if (!trxForm.productId || !trxForm.positionId) return 0;
    return inventory
      .filter((r) => r.productId === trxForm.productId && r.positionId === trxForm.positionId)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  }, [inventory, trxForm.productId, trxForm.positionId]);

  // Current stock on target position (if transfer)
  const currentStockOnTargetPos = useMemo(() => {
    if (!trxForm.productId || !trxForm.targetPositionId) return 0;
    return inventory
      .filter((r) => r.productId === trxForm.productId && r.positionId === trxForm.targetPositionId)
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
  }, [inventory, trxForm.productId, trxForm.targetPositionId]);

  // Handle Submit of Transaction Form
  const handleSubmitTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxForm.productId || !trxForm.positionId) return;

    const qty = Math.abs(Number(trxForm.quantity)) || 1;
    const trxId = trxForm.id.trim() || getNextTransactionId();
    const trxDate = trxForm.date.trim() || getTodayDateTimeString();

    if (trxForm.type === 'add') {
      recordTransaction({
        id: trxId,
        productId: trxForm.productId,
        positionId: trxForm.positionId,
        quantity: qty,
        date: trxDate,
        note: trxForm.note || `Bevételezés (+${qty} db)`,
      });
      setFormSuccessMessage(`Sikeres bevételezés: ${trxId} rögzítve az Inventory Transactions munkalapra (+${qty} db).`);
    } else if (trxForm.type === 'remove') {
      recordTransaction({
        id: trxId,
        productId: trxForm.productId,
        positionId: trxForm.positionId,
        quantity: -qty,
        date: trxDate,
        note: trxForm.note || `Kiadás (-${qty} db)`,
      });
      setFormSuccessMessage(`Sikeres kiadás: ${trxId} rögzítve az Inventory Transactions munkalapra (-${qty} db).`);
    } else if (trxForm.type === 'transfer') {
      if (trxForm.positionId === trxForm.targetPositionId) {
        alert('A forrás és cél pozíció nem lehet azonos!');
        return;
      }
      const sourceName = currentSelectedPos?.name || trxForm.positionId;
      const targetName = currentTargetPos?.name || trxForm.targetPositionId;

      // Out from source
      recordTransaction({
        id: trxId,
        productId: trxForm.productId,
        positionId: trxForm.positionId,
        quantity: -qty,
        date: trxDate,
        note: trxForm.note ? `${trxForm.note} (Áthelyezés -> ${targetName})` : `Áthelyezés innen: ${sourceName} -> ide: ${targetName} (-${qty} db)`,
      });

      // In to target
      const targetTrxId = `${trxId}-IN`;
      recordTransaction({
        id: targetTrxId,
        productId: trxForm.productId,
        positionId: trxForm.targetPositionId,
        quantity: qty,
        date: trxDate,
        note: `Áthelyezés beérkezett innen: ${sourceName} (+${qty} db)`,
      });

      setFormSuccessMessage(`Sikeres áthelyezés: ${trxId} és ${targetTrxId} rögzítve az Inventory Transactions munkalapra (${qty} db).`);
    }

    // Reset Form ID and note, refresh date
    setTrxForm((prev) => ({
      ...prev,
      id: '',
      note: '',
      date: getTodayDateTimeString(),
    }));

    setTimeout(() => {
      setFormSuccessMessage(null);
    }, 4500);
  };

  // Open Position Modal
  const handleOpenPositionModal = (pos?: WarehousePosition) => {
    if (pos) {
      setEditingPosition(pos);
      setPositionForm({
        id: pos.id,
        name: pos.name,
        description: pos.description || '',
      });
    } else {
      setEditingPosition(null);
      const nextNum = positions.length + 1;
      const suggestedId = `POS-${String(nextNum).padStart(3, '0')}`;
      setPositionForm({
        id: suggestedId,
        name: '',
        description: '',
      });
    }
    setIsPositionModalOpen(true);
  };

  const handleSavePosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionForm.id.trim() || !positionForm.name.trim()) return;

    if (editingPosition) {
      updatePosition(editingPosition.id, {
        name: positionForm.name.trim(),
        description: positionForm.description.trim() || undefined,
      });
    } else {
      addPosition({
        id: positionForm.id.trim(),
        name: positionForm.name.trim(),
        description: positionForm.description.trim() || undefined,
      });
    }
    setIsPositionModalOpen(false);
  };

  const selectedPosition = useMemo(() => {
    if (!selectedPositionId) return null;
    return positions.find((p) => p.id === selectedPositionId) || null;
  }, [positions, selectedPositionId]);

  const selectedPositionProducts = useMemo(() => {
    if (!selectedPositionId) return [];
    return getPositionProducts(selectedPositionId);
  }, [selectedPositionId, getPositionProducts]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary Card */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#E0E9E8] flex items-center justify-center text-[#006067] flex-shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#006067] bg-[#E0E9E8] px-2 py-0.5 rounded">
                  Google Sheet: Inventory Transactions
                </span>
                <span className="text-xs text-stone-400 font-mono">Positions & Transactions</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-0.5">
                Raktármozgások & Készletszámítás
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="toggle-trx-form-btn"
              onClick={() => setShowTransactionForm(!showTransactionForm)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                showTransactionForm
                  ? 'bg-[#006067] text-white hover:bg-[#00474c]'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{showTransactionForm ? 'Rögzítő Űrlap Megnyitva' : 'Új Raktármozgás Form'}</span>
            </button>

            <button
              type="button"
              id="add-new-position-btn"
              onClick={() => handleOpenPositionModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#006067]" />
              <span>Új Pozíció (Positions)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Summary Cards calculated from Inventory Transactions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-stone-100 text-xs">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
            <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Számított Összkészlet</span>
            </p>
            <p className="text-lg font-black text-emerald-800 mt-1 font-mono">
              {totalStockCount.toLocaleString('hu-HU')} db
            </p>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
            <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#006067]" />
              <span>Készleten Lévő Cikkszámok</span>
            </p>
            <p className="text-lg font-black text-stone-900 mt-1 font-mono">
              {uniqueProductsInStock} termék
            </p>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
            <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#006067]" />
              <span>Raktári Pozíciók</span>
            </p>
            <p className="text-lg font-black text-stone-900 mt-1 font-mono">
              {positions.length} hely
            </p>
          </div>

          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/80">
            <p className="text-[11px] text-stone-500 font-medium flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-stone-600" />
              <span>Tranzakciók Száma</span>
            </p>
            <p className="text-lg font-black text-stone-800 mt-1 font-mono">
              {inventory.length} sor
            </p>
          </div>
        </div>
      </div>

      {/* DEDICATED TRANSACTION ENTRY FORM */}
      {showTransactionForm && (
        <div className="bg-white rounded-xl border-2 border-[#006067]/30 shadow-md p-5 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E0E9E8] flex items-center justify-center text-[#006067]">
                <ArrowUpDown className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-stone-900 text-sm">
                  Új Raktármozgás Rögzítése (Form)
                </h2>
                <p className="text-[11px] text-stone-500">
                  Oszlopok: <code>Tranzakció ID</code>, <code>Pozíció ID</code>, <code>Termék ID</code>, <code>Mennyiség</code>, <code>Dátum</code>
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-[#006067] bg-[#E0E9E8] px-2.5 py-1 rounded-full font-bold">
              Inventory Transactions
            </span>
          </div>

          {formSuccessMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{formSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitTransaction} className="space-y-4 text-xs">
            {/* 1. Transaction Type selection */}
            <div>
              <label className="block font-bold text-stone-800 mb-1.5">
                Mozgás jellege:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTrxForm({ ...trxForm, type: 'add' })}
                  className={`py-2 px-3 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    trxForm.type === 'add'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-950 font-bold shadow-2xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-800 flex-shrink-0">
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs">Bevételezés (+)</div>
                    <div className="text-[10px] text-emerald-700 font-normal">Készletnövelés raktárhelyre</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTrxForm({ ...trxForm, type: 'remove' })}
                  className={`py-2 px-3 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    trxForm.type === 'remove'
                      ? 'border-red-600 bg-red-50/80 text-red-950 font-bold shadow-2xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center text-red-800 flex-shrink-0">
                    <TrendingDown className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs">Kiadás / Levonás (-)</div>
                    <div className="text-[10px] text-red-700 font-normal">Készletcsökkentés felhaszn./selejt</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTrxForm({ ...trxForm, type: 'transfer' })}
                  className={`py-2 px-3 rounded-lg border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                    trxForm.type === 'transfer'
                      ? 'border-[#006067] bg-[#E0E9E8]/80 text-[#00474c] font-bold shadow-2xs'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-[#006067]/10 flex items-center justify-center text-[#006067] flex-shrink-0">
                    <MoveHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs">Áthelyezés (Forrás → Cél)</div>
                    <div className="text-[10px] text-[#006067] font-normal">Pozíciók közötti mozgatás</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Main Row: Tranzakció ID, Termék ID, Pozíció ID, Mennyiség, Dátum */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Tranzakció ID */}
              <div className="md:col-span-3">
                <label className="block font-bold text-stone-800 mb-1">
                  Tranzakció ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={trxForm.id}
                    onChange={(e) => setTrxForm({ ...trxForm, id: e.target.value })}
                    placeholder={getNextTransactionId()}
                    className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-xs font-bold text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                  />
                  <span className="text-[9px] text-stone-400 absolute right-2 top-2.5">
                    (Auto)
                  </span>
                </div>
              </div>

              {/* Termék ID selection */}
              <div className="md:col-span-4">
                <label className="block font-bold text-stone-800 mb-1">
                  Termék ID & Megnevezés <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={trxForm.productId}
                  onChange={(e) => setTrxForm({ ...trxForm, productId: e.target.value })}
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-2.5 py-2 font-mono text-xs text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name} {p.category ? `(${p.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pozíció ID selection */}
              <div className={trxForm.type === 'transfer' ? 'md:col-span-2' : 'md:col-span-3'}>
                <label className="block font-bold text-stone-800 mb-1">
                  {trxForm.type === 'transfer' ? 'Forrás Pozíció ID' : 'Pozíció ID'} <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={trxForm.positionId}
                  onChange={(e) => setTrxForm({ ...trxForm, positionId: e.target.value })}
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-2.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                >
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.id} — {pos.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Position (if Transfer) */}
              {trxForm.type === 'transfer' && (
                <div className="md:col-span-3">
                  <label className="block font-bold text-stone-800 mb-1">
                    Cél Pozíció ID <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={trxForm.targetPositionId}
                    onChange={(e) => setTrxForm({ ...trxForm, targetPositionId: e.target.value })}
                    className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-2.5 py-2 text-xs text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                  >
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.id} — {pos.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Mennyiség */}
              <div className={trxForm.type === 'transfer' ? 'md:col-span-2' : 'md:col-span-2'}>
                <label className="block font-bold text-stone-800 mb-1">
                  Mennyiség (db) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={trxForm.quantity}
                  onChange={(e) =>
                    setTrxForm({ ...trxForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-sm text-stone-900 font-extrabold focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>
            </div>

            {/* 3. Date, Note & Calculation Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
              <div className="md:col-span-3">
                <label className="block font-bold text-stone-800 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#006067]" />
                  <span>Dátum</span>
                </label>
                <input
                  type="text"
                  value={trxForm.date}
                  onChange={(e) => setTrxForm({ ...trxForm, date: e.target.value })}
                  placeholder="2024-09-01 14:30"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-xs text-stone-800 focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block font-bold text-stone-800 mb-1">
                  Megjegyzés / Indoklás (opcionális)
                </label>
                <input
                  type="text"
                  value={trxForm.note}
                  onChange={(e) => setTrxForm({ ...trxForm, note: e.target.value })}
                  placeholder="pl. Bevételezés Mecal szállítmányból, Gépbe helyezés..."
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-xs text-stone-800 focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>

              {/* Dynamic preview badge */}
              <div className="md:col-span-4 flex items-center">
                <div className="w-full p-2.5 rounded-lg bg-stone-100 border border-stone-200 text-[11px] text-stone-700 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Jelenlegi készlet a helyen:</span>
                    <strong className="font-mono text-stone-900">{currentStockOnPos} db</strong>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-stone-200">
                    <span className="text-stone-500 font-medium">Módosulás után számított:</span>
                    <strong
                      className={`font-mono font-bold ${
                        trxForm.type === 'add'
                          ? 'text-emerald-700'
                          : trxForm.type === 'remove'
                          ? 'text-red-700'
                          : 'text-[#006067]'
                      }`}
                    >
                      {trxForm.type === 'add'
                        ? `${currentStockOnPos + Number(trxForm.quantity || 0)} db (+${trxForm.quantity})`
                        : trxForm.type === 'remove'
                        ? `${currentStockOnPos - Number(trxForm.quantity || 0)} db (-${trxForm.quantity})`
                        : `${currentStockOnPos - Number(trxForm.quantity || 0)} db (${currentSelectedPos?.id}) → ${
                            currentStockOnTargetPos + Number(trxForm.quantity || 0)
                          } db (${currentTargetPos?.id})`}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Action bar */}
            <div className="pt-3 border-t border-stone-200 flex items-center justify-between flex-wrap gap-2">
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#006067]" />
                <span>
                  A mentés azonnal bejegyzi a tranzakciót az <strong>Inventory Transactions</strong> táblába, és újraszámolja a termék készletét.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  id="submit-trx-form-btn"
                  className="px-5 py-2.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Tranzakció Rögzítése az Inventory Transactions Munkalapra</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Main Tabs Navigation & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200">
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
          <button
            type="button"
            id="tab-transactions-btn"
            onClick={() => {
              setActiveTab('transactions');
              setSelectedPositionId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-white text-[#006067] shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Inventory Transactions ({inventory.length} sor)</span>
          </button>

          <button
            type="button"
            id="tab-positions-btn"
            onClick={() => {
              setActiveTab('positions');
              setSelectedPositionId(null);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'positions'
                ? 'bg-white text-[#006067] shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Positions — Raktári Pozíciók ({positions.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'transactions'
                ? 'Keresés Termék ID, Pozíció ID, Név, Dátum alapján...'
                : 'Keresés pozíció név, ID alapján...'
            }
            className="w-full bg-[#F4F7F6] border border-stone-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-stone-800 focus:bg-white focus:border-[#006067] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: INVENTORY TRANSACTIONS VIEW */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                <span>Inventory Transactions Munkalap Adatai</span>
                <span className="text-[10px] bg-[#E0E9E8] text-[#006067] font-mono px-2 py-0.5 rounded font-bold">
                  Pozíció ID | Termék ID | Mennyiség | Dátum
                </span>
              </span>
              <p className="text-[11px] text-stone-500 mt-0.5">
                A rendszer ebből a munkalapból összesíti a termékek és pozíciók pontos raktárkészletét (+/- mozgások).
              </p>
            </div>
            <span className="text-xs font-mono text-stone-500 font-semibold">
              {filteredTransactions.length} / {inventory.length} tranzakció
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3.5">Pozíció ID & Név</th>
                  <th className="py-3 px-3.5">Termék ID & Megnevezés</th>
                  <th className="py-3 px-3.5 text-right">Mennyiség (+/-)</th>
                  <th className="py-3 px-3.5">Dátum</th>
                  <th className="py-3 px-3.5">Megjegyzés</th>
                  <th className="py-3 px-3.5 text-right">Művelet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">
                      Nem található tranzakció a megadott szűrési feltételekkel.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((rec) => {
                    const prod = products.find((p) => p.id === rec.productId);
                    const pos = positions.find((p) => p.id === rec.positionId);
                    const isPositive = (rec.quantity || 0) >= 0;

                    return (
                      <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                        {/* Pozíció ID & Név */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#006067] flex-shrink-0" />
                            <span className="font-semibold text-stone-900">
                              {pos ? pos.name : rec.positionId}
                            </span>
                            <span className="font-mono text-[10px] text-stone-400">({rec.positionId})</span>
                          </div>
                        </td>

                        {/* Termék ID & Megnevezés */}
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2">
                            <TermekIdLink id={rec.productId} showIcon={false} />
                            <span className="font-medium text-stone-800 truncate max-w-[200px]">
                              {prod ? prod.name : rec.productId}
                            </span>
                          </div>
                        </td>

                        {/* Mennyiség */}
                        <td className="py-2.5 px-3.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-bold text-xs ${
                              isPositive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-600" />
                            )}
                            {isPositive ? `+${rec.quantity}` : rec.quantity} db
                          </span>
                        </td>

                        {/* Dátum */}
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                          {rec.date || '-'}
                        </td>

                        {/* Megjegyzés */}
                        <td className="py-2.5 px-3.5 text-stone-600 max-w-[220px] truncate">
                          {rec.note || '-'}
                        </td>

                        {/* Művelet */}
                        <td className="py-2.5 px-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Biztosan törli ezt a tranzakciót (${rec.id}) az Inventory Transactions munkalapról?`)) {
                                deleteInventoryRecord(rec.id);
                              }
                            }}
                            className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Tranzakció törlése"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TAB 2: POSITIONS VIEW */}
      {activeTab === 'positions' && (
        <>
          {selectedPosition ? (
            /* SINGLE POSITION FOCUSED VIEW (ONLY this position is shown) */
            <div className="space-y-5">
              {/* Back to all positions button bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs">
                <button
                  type="button"
                  id="back-to-all-positions-btn"
                  onClick={() => setSelectedPositionId(null)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-[#E0E9E8] text-stone-700 hover:text-[#006067] text-xs font-bold transition-all cursor-pointer shadow-2xs group"
                >
                  <ArrowLeft className="w-4 h-4 text-[#006067] group-hover:-translate-x-0.5 transition-transform" />
                  <span>Vissza az összes raktári pozícióhoz ({positions.length} hely)</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-stone-500 font-medium">Aktív Raktári Pozíció:</span>
                  <span className="text-xs font-bold text-[#006067] bg-[#E0E9E8] px-2.5 py-1 rounded-md font-mono">
                    {selectedPosition.name} ({selectedPosition.id})
                  </span>
                </div>
              </div>

              {/* Position Header & Details Card */}
              <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-2xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#E0E9E8] flex items-center justify-center text-[#006067] flex-shrink-0 shadow-2xs">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-black text-[#006067] bg-[#E0E9E8] px-2.5 py-1 rounded-md">
                          {selectedPosition.id}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                          {selectedPosition.name}
                        </h2>
                      </div>
                      {selectedPosition.description ? (
                        <p className="text-sm text-stone-600 mt-1.5 max-w-2xl">
                          {selectedPosition.description}
                        </p>
                      ) : (
                        <p className="text-xs text-stone-400 italic mt-1">Nincs leírás megadva ehhez a pozícióhoz.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setTrxForm((prev) => ({
                          ...prev,
                          positionId: selectedPosition.id,
                          type: 'add',
                        }));
                        setShowTransactionForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#006067] hover:bg-[#00474c] text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Készletmozgás erre a pozícióra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPositionModal(selectedPosition)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>Szerkesztés</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Biztosan törli a(z) ${selectedPosition.name} (${selectedPosition.id}) pozíciót?`)) {
                          deletePosition(selectedPosition.id);
                          setSelectedPositionId(null);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Törlés</span>
                    </button>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                  {(() => {
                    const posNewItems = selectedPositionProducts.reduce((sum, item) => sum + (item.newQuantity || 0), 0);
                    const posUsedItems = selectedPositionProducts.reduce((sum, item) => sum + (item.usedQuantity || 0), 0);
                    const posTotalItems = posNewItems + posUsedItems;

                    return (
                      <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                          Összes Készlet ezen a helyen
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span
                            className={`text-xl font-black font-mono ${
                              posTotalItems > 0 ? 'text-emerald-800' : 'text-red-600'
                            }`}
                          >
                            {posTotalItems.toLocaleString('hu-HU')} db
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {posNewItems > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Új: {posNewItems} db
                            </span>
                          )}
                          {posUsedItems > 0 && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                              Használt: {posUsedItems} db
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Tárolt Termékfajták
                    </span>
                    <span className="text-xl font-black text-stone-900 font-mono mt-1 block">
                      {selectedPositionProducts.length} féle termék
                    </span>
                  </div>

                  <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70 col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      Pozíció Azonosító
                    </span>
                    <span className="text-sm font-bold text-[#006067] font-mono mt-1 block">
                      {selectedPosition.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Products stored in this position */}
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#006067]" />
                    <h3 className="font-extrabold text-stone-900 text-sm">
                      A(z) {selectedPosition.name} pozícióban lévő termékek ({selectedPositionProducts.length})
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTrxForm((prev) => ({
                        ...prev,
                        positionId: selectedPosition.id,
                        type: 'add',
                      }));
                      setShowTransactionForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E0E9E8] hover:bg-[#006067] text-[#006067] hover:text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Új Termék Hozzáadása erre a helyre</span>
                  </button>
                </div>

                {selectedPositionProducts.length === 0 ? (
                  <div className="p-10 text-center text-stone-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40 text-stone-400" />
                    <p className="text-sm font-semibold text-stone-700">Jelenleg nincs termék ezen a raktári pozíción.</p>
                    <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                      A fenti űrlap segítségével vételezzen be vagy helyezzen át termékeket ide.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-3.5">Termék ID</th>
                          <th className="py-3 px-3.5">Megnevezés</th>
                          <th className="py-3 px-3.5">Kategória & Gyári Kód</th>
                          <th className="py-3 px-3.5">Készlet Ezen a Pozíción</th>
                          <th className="py-3 px-3.5">Raktári Összkészlet (Minden Helyen)</th>
                          <th className="py-3 px-3.5 text-right">Művelet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {selectedPositionProducts.map((item) => {
                          const { product, quantity, newQuantity, usedQuantity, baseId } = item;
                          const totalBreakdown = getProductStockBreakdown(product.id);
                          return (
                            <tr key={baseId || product.id} className="hover:bg-stone-50 transition-colors">
                              {/* 1. Termék ID (Clean base ID) */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <TermekIdLink id={product.id} className="text-base font-black" />
                              </td>

                              {/* 2. Megnevezés */}
                              <td className="py-3 px-3.5 font-bold text-stone-900">
                                <button
                                  type="button"
                                  onClick={() => selectProductById(product.id)}
                                  className="text-left hover:text-[#006067] hover:underline cursor-pointer font-bold leading-snug"
                                >
                                  {product.name}
                                </button>
                              </td>

                              {/* 3. Kategória & Gyári Kód */}
                              <td className="py-3 px-3.5">
                                <div className="space-y-1">
                                  {product.category ? (
                                    <span className="inline-block text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                                      {product.category}
                                    </span>
                                  ) : (
                                    <span className="text-stone-300">-</span>
                                  )}
                                  {product.factoryCode && (
                                    <div className="font-mono text-[11px] text-stone-500 font-semibold">
                                      Kód: {product.factoryCode}
                                    </div>
                                  )}
                                </div>
                              </td>

                              {/* 4. Készlet Ezen a Pozíción (Új + Használt bontás) */}
                              <td className="py-3 px-3.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {newQuantity > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        title="Új termékek ezen a pozíción"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                        Új: {newQuantity} db
                                      </span>
                                    )}
                                    {usedQuantity > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                        title="Használt termékek ezen a pozíción"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                        Használt: {usedQuantity} db
                                      </span>
                                    )}
                                    {quantity === 0 && (
                                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                                        0 db
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] font-bold text-stone-600">
                                    Helyi össz: <span className="text-stone-900 font-black">{quantity} db</span>
                                  </span>
                                </div>
                              </td>

                              {/* 5. Raktári Összkészlet (Minden helyen) */}
                              <td className="py-3 px-3.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {totalBreakdown.newStock > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                                        title="Összes új készlet a teljes raktárban"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                        Új: {totalBreakdown.newStock} db
                                      </span>
                                    )}
                                    {totalBreakdown.usedStock > 0 && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80"
                                        title="Összes használt készlet a teljes raktárban"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                        Használt: {totalBreakdown.usedStock} db
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] font-bold text-stone-600">
                                    Teljes raktár: <span className={`font-black ${totalBreakdown.totalStock > 0 ? 'text-[#006067]' : 'text-red-700'}`}>{totalBreakdown.totalStock} db</span>
                                  </span>
                                </div>
                              </td>

                              {/* 6. Művelet */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTrxForm((prev) => ({
                                        ...prev,
                                        productId: product.id,
                                        positionId: selectedPosition.id,
                                        type: 'add',
                                      }));
                                      setShowTransactionForm(true);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-2.5 py-1 rounded bg-[#E0E9E8] hover:bg-[#006067] text-[#006067] hover:text-white font-semibold text-[11px] transition-colors cursor-pointer"
                                    title="Készlet bevételezés ide"
                                  >
                                    + Bevételezés
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => selectProductById(product.id)}
                                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-[11px] transition-colors cursor-pointer"
                                    title="Ugrás a termék adatlapjára"
                                  >
                                    Adatlap
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transactions on this specific position */}
              {(() => {
                const posTransactions = inventory.filter((t) => t.positionId === selectedPosition.id);
                return (
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-stone-600" />
                        <h3 className="font-extrabold text-stone-900 text-sm">
                          Pozícióhoz kapcsolódó mozgások ({posTransactions.length})
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-stone-400">
                        {selectedPosition.name} ({selectedPosition.id})
                      </span>
                    </div>

                    {posTransactions.length === 0 ? (
                      <div className="p-6 text-center text-stone-400 text-xs">
                        Nincsenek rögzített tranzakciók ehhez a raktárhelyhez.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-stone-100 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                              <th className="py-3 px-3.5">Termék ID & Megnevezés</th>
                              <th className="py-3 px-3.5 text-right">Mennyiség (+/-)</th>
                              <th className="py-3 px-3.5">Dátum</th>
                              <th className="py-3 px-3.5">Megjegyzés</th>
                              <th className="py-3 px-3.5 text-right">Művelet</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {posTransactions.map((rec) => {
                              const prod = products.find((p) => p.id === rec.productId);
                              const isPositive = (rec.quantity || 0) >= 0;
                              return (
                                <tr key={rec.id} className="hover:bg-stone-50">
                                  <td className="py-2.5 px-3.5">
                                    <div className="flex items-center gap-2">
                                      <TermekIdLink id={rec.productId} showIcon={false} />
                                      <span className="font-medium text-stone-800 truncate max-w-[240px]">
                                        {prod ? prod.name : rec.productId}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-xs ${
                                        isPositive
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {isPositive ? `+${rec.quantity}` : rec.quantity} db
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3.5 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                                    {rec.date || '-'}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-stone-600 max-w-[200px] truncate">
                                    {rec.note || '-'}
                                  </td>
                                  <td className="py-2.5 px-3.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`Biztosan törli ezt a tételt?`)) {
                                          deleteInventoryRecord(rec.id);
                                        }
                                      }}
                                      className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                      title="Törlés"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            /* FULL POSITIONS LIST (shown when no position is explicitly selected or when clicking Raktári Pozíciók) */
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                      Raktári Pozíciók Teljes Listája (Positions munkalap)
                    </span>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Kattintson bármelyik pozícióra a benne tárolt termékek és készletmozgások megnyitásához.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-stone-500 font-bold">
                    {filteredPositions.length} / {positions.length} pozíció
                  </span>
                </div>

                <div className="divide-y divide-stone-100">
                  {filteredPositions.length === 0 ? (
                    <div className="p-8 text-center text-stone-400">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium text-stone-600">Nincs találat a pozíciók között</p>
                      <p className="text-xs mt-1">Próbáljon másik keresőkifejezést vagy vegyen fel új pozíciót.</p>
                    </div>
                  ) : (
                    filteredPositions.map((pos) => {
                      const prodList = getPositionProducts(pos.id);
                      const newItems = prodList.reduce((sum, item) => sum + (item.newQuantity || 0), 0);
                      const usedItems = prodList.reduce((sum, item) => sum + (item.usedQuantity || 0), 0);
                      const totalItems = newItems + usedItems;

                      return (
                        <div
                          key={pos.id}
                          onClick={() => setSelectedPositionId(pos.id)}
                          className="p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[#E0E9E8]/30 group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#E0E9E8] group-hover:bg-[#006067] text-[#006067] group-hover:text-white flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#006067] bg-[#E0E9E8] px-2 py-0.5 rounded">
                                  {pos.id}
                                </span>
                                <h3 className="font-bold text-stone-900 text-sm group-hover:text-[#006067] transition-colors">
                                  {pos.name}
                                </h3>
                              </div>
                              {pos.description && (
                                <p className="text-xs text-stone-500 mt-0.5">{pos.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone-500 flex-wrap">
                                <span>Tárolt termékfajták: <strong className="text-stone-800">{prodList.length} db</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1.5 flex-wrap">
                                  <span>Összes darabszám:</span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-black text-xs ${
                                      totalItems > 0
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-red-100 text-red-800 border border-red-300'
                                    }`}
                                  >
                                    {totalItems > 0 ? `${totalItems} db` : '0 db'}
                                  </span>
                                  {newItems > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      title="Új termékek darabszáma"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      Új: {newItems} db
                                    </span>
                                  )}
                                  {usedItems > 0 && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                      title="Használt termékek darabszáma"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                      Használt: {usedItems} db
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div
                            className="flex items-center gap-2 self-end sm:self-center flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedPositionId(pos.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#E0E9E8] hover:bg-[#006067] text-[#006067] hover:text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              Megnyitás →
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setTrxForm((prev) => ({
                                  ...prev,
                                  positionId: pos.id,
                                  type: 'add',
                                }));
                                setShowTransactionForm(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors cursor-pointer"
                              title="Készlet bevételezése erre a pozícióra"
                            >
                              <Plus className="w-3.5 h-3.5 inline mr-1" />
                              <span>Bevételezés</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenPositionModal(pos)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Pozíció szerkesztése"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Biztosan törli a(z) ${pos.name} (${pos.id}) pozíciót?`)) {
                                  deletePosition(pos.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Pozíció törlése"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD / EDIT POSITION */}
      {isPositionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E0E9E8] flex items-center justify-center text-[#006067]">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  {editingPosition ? 'Pozíció Módosítása' : 'Új Raktári Pozíció (Positions)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPositionModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePosition} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Pozíció ID <span className="text-red-500">*</span> (Egyedi kulcs)
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingPosition}
                  value={positionForm.id}
                  onChange={(e) => setPositionForm({ ...positionForm, id: e.target.value })}
                  placeholder="pl. POS-001, A-01-01"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-stone-900 focus:bg-white focus:border-[#006067] outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Pozíció Név <span className="text-red-500">*</span> (Lehetséges raktári pozíció)
                </label>
                <input
                  type="text"
                  required
                  value={positionForm.name}
                  onChange={(e) => setPositionForm({ ...positionForm, name: e.target.value })}
                  placeholder="pl. Alkatrész A1, Polc C1 - Saruzófej"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Leírás / Zóna / Megjegyzés
                </label>
                <textarea
                  rows={3}
                  value={positionForm.description}
                  onChange={(e) => setPositionForm({ ...positionForm, description: e.target.value })}
                  placeholder="pl. 1. szint, Mecal saruzófejek tárolója"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPositionModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Mentés</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

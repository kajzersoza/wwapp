import React, { useState, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { Product } from '../types';
import { X, Save, Plus, Tag, Check, AlertCircle } from 'lucide-react';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
}) => {
  const { addProduct, updateProduct, selectProductById } = useProducts();

  const isEditing = Boolean(productToEdit);

  const [formData, setFormData] = useState<Partial<Product>>({
    id: '',
    name: '',
    description: '',
    image: '',
    category: '',
    manufacturer: '',
    dosage: '',
    partType: '',
    insulationType: '',
    factoryCode: '',
    insulationGripperType: '',
    connectorType: '',
    terminalType: '',
    date: new Date().toISOString().slice(0, 10),
    quality: 'Új',
    location: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setFormData({ ...productToEdit });
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        image: '',
        category: 'Saruzófej Alkatrész',
        manufacturer: 'Mecal',
        dosage: '',
        partType: '',
        insulationType: 'Nem Gumis',
        factoryCode: '',
        insulationGripperType: '',
        connectorType: '',
        terminalType: '',
        date: new Date().toISOString().slice(0, 10),
        quality: 'Új',
        location: '',
      });
    }
    setError(null);
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Product, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id?.trim()) {
      setError('A Termék ID megadása kötelező (elsődleges kulcs)!');
      return;
    }

    if (!formData.name?.trim()) {
      setError('A Termék név megadása kötelező!');
      return;
    }

    const cleanProduct: Product = {
      id: formData.id.trim(),
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      image: formData.image?.trim() || undefined,
      category: formData.category?.trim() || undefined,
      manufacturer: formData.manufacturer?.trim() || undefined,
      dosage: formData.dosage?.trim() || undefined,
      partType: formData.partType?.trim() || undefined,
      insulationType: formData.insulationType?.trim() || undefined,
      factoryCode: formData.factoryCode?.trim() || undefined,
      insulationGripperType: formData.insulationGripperType?.trim() || undefined,
      connectorType: formData.connectorType?.trim() || undefined,
      terminalType: formData.terminalType?.trim() || undefined,
      date: formData.date?.trim() || undefined,
      quality: formData.quality?.trim() || undefined,
      location: formData.location?.trim() || undefined,
    };

    if (isEditing && productToEdit) {
      updateProduct(productToEdit.id, cleanProduct);
      selectProductById(cleanProduct.id);
    } else {
      addProduct(cleanProduct);
      selectProductById(cleanProduct.id);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006067] text-white flex items-center justify-center font-bold">
              {isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">
                {isEditing ? 'Termék Módosítása' : 'Új Termék Rögzítése'}
              </h3>
              <p className="text-xs text-stone-500">Google Sheets kompatibilis műszaki adatlap</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Termék ID */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                Termék ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="edit-termek-id"
                value={formData.id || ''}
                disabled={isEditing}
                onChange={(e) => handleChange('id', e.target.value)}
                placeholder="pl. 40107.00.33 vagy ME.911330114"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono font-bold text-stone-900 focus:bg-white focus:border-[#006067] outline-none disabled:bg-stone-100 disabled:text-stone-500"
              />
            </div>

            {/* Termék név */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                Termék Név <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="edit-termek-nev"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="pl. N1 vagy ELSŐ MOZGÓ ÜLLŐ"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-medium text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Kategória */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Kategória</label>
              <input
                type="text"
                id="edit-kategoria"
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="pl. Saruzófej, Saruzófej Alkatrész"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Gyártó */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Gyártó</label>
              <input
                type="text"
                id="edit-gyarto"
                value={formData.manufacturer || ''}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                placeholder="pl. Mecal, Kormak, Molex"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Alkatrész Típus */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Alkatrész Típus</label>
              <input
                type="text"
                id="edit-alkatresz-tipus"
                value={formData.partType || ''}
                onChange={(e) => handleChange('partType', e.target.value)}
                placeholder="pl. MOZGÓ ÜLLŐ, FIX ÜLLŐ, SZIGETELÉSMEGFOGÓ"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Gyári Kód */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Gyári Kód (MPN)</label>
              <input
                type="text"
                id="edit-gyari-kod"
                value={formData.factoryCode || ''}
                onChange={(e) => handleChange('factoryCode', e.target.value)}
                placeholder="pl. MLS0185-J, 911330114"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Szigelés Típus */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Szigelés Típus</label>
              <input
                type="text"
                id="edit-szigeles-tipus"
                value={formData.insulationType || ''}
                onChange={(e) => handleChange('insulationType', e.target.value)}
                placeholder="pl. Nem Gumis, Gumis"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Szigetelésmegfogó Típusa */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                Szigetelésmegfogó Típusa
              </label>
              <input
                type="text"
                id="edit-szigetelesmegfogo-tipusa"
                value={formData.insulationGripperType || ''}
                onChange={(e) => handleChange('insulationGripperType', e.target.value)}
                placeholder="pl. F, O"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 font-mono text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Adagolás */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Adagolás</label>
              <input
                type="text"
                id="edit-adagolas"
                value={formData.dosage || ''}
                onChange={(e) => handleChange('dosage', e.target.value)}
                placeholder="pl. Oldal, Hátsó"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Alkatrész Hely */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">
                Alkatrész Hely <span className="font-normal text-stone-500 text-xs">(hozzátartozó alkatrész helye)</span>
              </label>
              <input
                type="text"
                id="edit-alkatresz-hely"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="pl. Alkatrész A1, A1-B, Raktár B-4"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Megjegyzés: A termék saját raktári elhelyezése a Raktári Pozíciókból olvasható ki.
              </p>
            </div>

            {/* Konektor Típusa */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Konektor Típusa</label>
              <input
                type="text"
                id="edit-konektor-tipusa"
                value={formData.connectorType || ''}
                onChange={(e) => handleChange('connectorType', e.target.value)}
                placeholder="pl. Faston, Molex"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Saru Típusa */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Saru Típusa</label>
              <input
                type="text"
                id="edit-saru-tipusa"
                value={formData.terminalType || ''}
                onChange={(e) => handleChange('terminalType', e.target.value)}
                placeholder="pl. Csapos, Szemes, Hüvelyes"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Image Link */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Kép URL / Fájlnév</label>
              <input
                type="text"
                id="edit-image"
                value={formData.image || ''}
                onChange={(e) => handleChange('image', e.target.value)}
                placeholder="pl. https://... vagy Products_Images/..."
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>

            {/* Minőség */}
            <div>
              <label className="block font-bold text-stone-800 mb-1">Minőség / Állapot</label>
              <input
                type="text"
                id="edit-minoseg"
                value={formData.quality || ''}
                onChange={(e) => handleChange('quality', e.target.value)}
                placeholder="pl. Új, Használt, Felújított"
                className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
              />
            </div>
          </div>

          {/* Leírás */}
          <div>
            <label className="block font-bold text-stone-800 mb-1">Leírás & Műszaki Megjegyzés</label>
            <textarea
              id="edit-leiras"
              rows={3}
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Részletes leírás vagy műszaki jellemzők..."
              className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg p-3 text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              id="save-product-submit-btn"
              className="px-5 py-2 bg-[#006067] hover:bg-[#00474c] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Módosítások mentése' : 'Termék hozzáadása'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

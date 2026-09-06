import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { TermekIdLink } from './TermekIdLink';
import { FilterTag } from './FilterTag';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { getCategoryColor } from '../utils/categoryColors';
import {
  Filter,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  X,
  Check,
  SlidersHorizontal,
  ListFilter,
  Layers,
  Factory,
  Wrench,
  Shield,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  Link2,
} from 'lucide-react';

interface ProductListProps {
  onOpenNewProduct: () => void;
  onOpenSyncModal: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  onOpenNewProduct,
}) => {
  const {
    products,
    filteredProducts,
    totalCount,
    filters,
    updateFilter,
    toggleFilterItem,
    clearFilterKey,
    resetFilters,
    viewMode,
    setViewMode,
    selectProductById,
    categories,
    manufacturers,
    partTypes,
    insulationTypes,
    locations,
    exportCsv,
    getProductTotalStock,
    getProductStockBreakdown,
    getProductOrderSummary,
  } = useProducts();

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [exportedToast, setExportedToast] = useState<boolean>(false);
  const [mobileStyle, setMobileStyle] = useState<'card' | 'compact'>('card');

  // Compute option counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category?.trim()) map[p.category.trim()] = (map[p.category.trim()] || 0) + 1;
    });
    return map;
  }, [products]);

  const manufacturerCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.manufacturer?.trim()) map[p.manufacturer.trim()] = (map[p.manufacturer.trim()] || 0) + 1;
    });
    return map;
  }, [products]);

  const partTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.partType?.trim()) map[p.partType.trim()] = (map[p.partType.trim()] || 0) + 1;
    });
    return map;
  }, [products]);

  const insulationTypeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.insulationType?.trim()) map[p.insulationType.trim()] = (map[p.insulationType.trim()] || 0) + 1;
    });
    return map;
  }, [products]);

  const locationCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.location?.trim()) map[p.location.trim()] = (map[p.location.trim()] || 0) + 1;
    });
    return map;
  }, [products]);

  // Selected arrays helpers
  const activeCategories = useMemo(() => {
    if (filters.categories && filters.categories.length > 0) return filters.categories;
    if (filters.category) return [filters.category];
    return [];
  }, [filters.categories, filters.category]);

  const activeManufacturers = useMemo(() => {
    if (filters.manufacturers && filters.manufacturers.length > 0) return filters.manufacturers;
    if (filters.manufacturer) return [filters.manufacturer];
    return [];
  }, [filters.manufacturers, filters.manufacturer]);

  const activePartTypes = useMemo(() => {
    if (filters.partTypes && filters.partTypes.length > 0) return filters.partTypes;
    if (filters.partType) return [filters.partType];
    return [];
  }, [filters.partTypes, filters.partType]);

  const activeInsulationTypes = useMemo(() => {
    if (filters.insulationTypes && filters.insulationTypes.length > 0) return filters.insulationTypes;
    if (filters.insulationType) return [filters.insulationType];
    return [];
  }, [filters.insulationTypes, filters.insulationType]);

  const activeLocations = useMemo(() => {
    if (filters.locations && filters.locations.length > 0) return filters.locations;
    if (filters.location) return [filters.location];
    return [];
  }, [filters.locations, filters.location]);

  // Sorting handler
  const handleSort = (field: 'id' | 'name' | 'category' | 'manufacturer' | 'factoryCode' | 'date') => {
    if (filters.sortBy === field) {
      updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      updateFilter('sortBy', field);
      updateFilter('sortOrder', 'asc');
    }
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  const handleExport = () => {
    const csv = exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Products_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportedToast(true);
    setTimeout(() => setExportedToast(false), 2500);
  };

  const hasActiveFilters = Boolean(
    activeCategories.length > 0 ||
      activeManufacturers.length > 0 ||
      activePartTypes.length > 0 ||
      activeInsulationTypes.length > 0 ||
      activeLocations.length > 0 ||
      filters.insulationGripperType ||
      filters.quality ||
      filters.hasImageOnly ||
      filters.searchQuery
  );

  const hasVal = (val?: string) => Boolean(val && val.trim() !== '' && val.trim() !== '-');

  return (
    <div className="w-full max-w-full space-y-3.5 sm:space-y-4 overflow-hidden">
      {/* Top Filter and Controls Bar */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 sm:p-4 shadow-2xs space-y-3 w-full">
        {/* Title and Action Buttons Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Summary and Count Badge */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <h2 className="text-sm sm:text-lg font-black text-stone-900 tracking-tight">
              Termékek & Alkatrészek
            </h2>
            <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#E0E9E8] text-[#006067] text-xs sm:text-sm font-mono font-bold whitespace-nowrap">
              {filteredProducts.length.toLocaleString('hu-HU')} / {totalCount.toLocaleString('hu-HU')} db
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-wrap">
            {/* Sort Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#006067] flex-shrink-0" />
              <span className="text-stone-500 font-medium hidden sm:inline">Rendezés:</span>
              <select
                id="product-sort-select"
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  updateFilter('sortBy', field as 'id' | 'name' | 'category' | 'manufacturer' | 'factoryCode' | 'date');
                  updateFilter('sortOrder', order as 'asc' | 'desc');
                }}
                className="bg-transparent text-stone-800 font-bold outline-none cursor-pointer text-xs"
                title="Rendezési sorrend beállítása"
              >
                <option value="name-asc">Termék név (A → Z)</option>
                <option value="name-desc">Termék név (Z → A)</option>
                <option value="id-asc">Termék ID (Növekvő)</option>
                <option value="id-desc">Termék ID (Csökkenő)</option>
                <option value="factoryCode-asc">Gyári kód (A → Z)</option>
                <option value="factoryCode-desc">Gyári kód (Z → A)</option>
                <option value="category-asc">Kategória (A → Z)</option>
                <option value="category-desc">Kategória (Z → A)</option>
              </select>
            </div>

            {/* Desktop View Mode Toggle */}
            <div className="hidden md:flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                type="button"
                id="view-mode-table-btn"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs font-medium transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                  viewMode === 'table'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Táblázatos nézet"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                id="view-mode-grid-btn"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded text-xs font-medium transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Kártyás nézet"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile View Style Toggle (Card vs Compact List) */}
            <div className="flex md:hidden items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                type="button"
                id="mobile-view-card-btn"
                onClick={() => setMobileStyle('card')}
                className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer min-h-[34px] flex items-center gap-1 ${
                  mobileStyle === 'card'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kártya</span>
              </button>
              <button
                type="button"
                id="mobile-view-compact-btn"
                onClick={() => setMobileStyle('compact')}
                className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer min-h-[34px] flex items-center gap-1 ${
                  mobileStyle === 'compact'
                    ? 'bg-white text-[#006067] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>
            </div>

            {/* Filter Toggle Drawer/Dropdown */}
            <button
              type="button"
              id="filter-drawer-toggle-btn"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer min-h-[36px] ${
                showFilterDrawer || hasActiveFilters
                  ? 'border-[#006067] bg-[#E0E9E8] text-[#006067]'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Szűrők</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#006067]" />
              )}
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              id="export-csv-btn"
              onClick={handleExport}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors cursor-pointer min-h-[36px]"
              title="Exportálás CSV formátumba"
            >
              {exportedToast ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Kész!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-stone-500" />
                  <span className="hidden sm:inline">CSV</span>
                </>
              )}
            </button>

            {/* Add New Product Button */}
            <button
              type="button"
              id="add-product-list-btn"
              onClick={onOpenNewProduct}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Új</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Dropdown Filters Grid with Checkboxes */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2.5 border-t border-stone-100 ${showFilterDrawer ? 'block' : 'hidden md:grid'}`}>
          {/* 1. Kategória Multi-Select (with category colors) */}
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Kategória
            </label>
            <MultiSelectDropdown
              id="multiselect-categories"
              title="Kategória"
              options={categories}
              selectedValues={activeCategories}
              onToggle={(cat) => toggleFilterItem('categories', cat)}
              onClear={() => clearFilterKey('categories')}
              isCategory={true}
              itemCounts={categoryCounts}
              icon={<Layers className="w-3.5 h-3.5" />}
              placeholder="Összes kategória"
            />
          </div>

          {/* 2. Gyártó Multi-Select */}
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Gyártó
            </label>
            <MultiSelectDropdown
              id="multiselect-manufacturers"
              title="Gyártó"
              options={manufacturers}
              selectedValues={activeManufacturers}
              onToggle={(mfg) => toggleFilterItem('manufacturers', mfg)}
              onClear={() => clearFilterKey('manufacturers')}
              itemCounts={manufacturerCounts}
              icon={<Factory className="w-3.5 h-3.5" />}
              placeholder="Összes gyártó"
            />
          </div>

          {/* 3. Alkatrész Típus Multi-Select */}
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Alkatrész Típus
            </label>
            <MultiSelectDropdown
              id="multiselect-parttypes"
              title="Alkatrész Típus"
              options={partTypes}
              selectedValues={activePartTypes}
              onToggle={(pt) => toggleFilterItem('partTypes', pt)}
              onClear={() => clearFilterKey('partTypes')}
              itemCounts={partTypeCounts}
              icon={<Wrench className="w-3.5 h-3.5" />}
              placeholder="Összes alkatrész típus"
            />
          </div>

          {/* 4. Szigetelés Típus Multi-Select */}
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Szigetelés Típus
            </label>
            <MultiSelectDropdown
              id="multiselect-insulationtypes"
              title="Szigetelés Típus"
              options={insulationTypes}
              selectedValues={activeInsulationTypes}
              onToggle={(it) => toggleFilterItem('insulationTypes', it)}
              onClear={() => clearFilterKey('insulationTypes')}
              itemCounts={insulationTypeCounts}
              icon={<Shield className="w-3.5 h-3.5" />}
              placeholder="Összes szigetelés"
            />
          </div>

          {/* 5. Alkatrész Hely Multi-Select */}
          <div className="w-full">
            <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">
              Alkatrész Hely
            </label>
            <MultiSelectDropdown
              id="multiselect-locations"
              title="Alkatrész Hely"
              options={locations}
              selectedValues={activeLocations}
              onToggle={(loc) => toggleFilterItem('locations', loc)}
              onClear={() => clearFilterKey('locations')}
              itemCounts={locationCounts}
              icon={<MapPin className="w-3.5 h-3.5" />}
              placeholder="Összes hely"
            />
          </div>
        </div>

        {/* Quick Condition (Új / Használt H_) Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-stone-500 mr-1">Állapot szűrés:</span>
            <button
              type="button"
              id="condition-filter-all-btn"
              onClick={() => updateFilter('conditionFilter', 'all')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                !filters.conditionFilter || filters.conditionFilter === 'all'
                  ? 'bg-[#006067] text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Összes termék
            </button>

            <button
              type="button"
              id="condition-filter-new-btn"
              onClick={() => updateFilter('conditionFilter', 'new')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filters.conditionFilter === 'new'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Csak Új készlet</span>
            </button>

            <button
              type="button"
              id="condition-filter-used-btn"
              onClick={() => updateFilter('conditionFilter', 'used')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filters.conditionFilter === 'used'
                  ? 'bg-amber-700 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Csak Használt készlet</span>
            </button>

            <button
              type="button"
              id="condition-filter-both-btn"
              onClick={() => updateFilter('conditionFilter', 'both')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                filters.conditionFilter === 'both'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-900 border border-purple-200/80 hover:bg-purple-100'
              }`}
            >
              <span>Új és Használt is van</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips with Individual Close Buttons */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100">
            <span className="text-[11px] text-stone-400 font-medium mr-1">Aktív szűrők:</span>
            
            {/* Search query tag */}
            {filters.searchQuery && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[#E0E9E8] text-[#006067] font-semibold border border-[#006067]/20">
                <span className="max-w-[150px] truncate">Keresés: "{filters.searchQuery}"</span>
                <button
                  type="button"
                  onClick={() => updateFilter('searchQuery', '')}
                  className="hover:text-stone-900 cursor-pointer p-0.5"
                  title="Keresés törlése"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Active Condition Filter Tag */}
            {filters.conditionFilter && filters.conditionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 font-bold border border-amber-300">
                <span>
                  Állapot:{' '}
                  {filters.conditionFilter === 'new'
                    ? 'Csak Új'
                    : filters.conditionFilter === 'used'
                    ? 'Csak Használt'
                    : 'Mindkettő (Új + Használt)'}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilter('conditionFilter', 'all')}
                  className="hover:text-amber-950 cursor-pointer p-0.5"
                  title="Állapot szűrő törlése"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {/* Active Categories with Color Coding */}
            {activeCategories.map((cat) => {
              const palette = getCategoryColor(cat);
              return (
                <span
                  key={`chip-cat-${cat}`}
                  className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-bold ${palette.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
                  <span className="max-w-[150px] truncate">{cat}</span>
                  <button
                    type="button"
                    onClick={() => toggleFilterItem('categories', cat)}
                    className="hover:opacity-75 cursor-pointer p-0.5"
                    title={`Kategória szűrő eltávolítása: ${cat}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* Active Manufacturers */}
            {activeManufacturers.map((mfg) => (
              <span
                key={`chip-mfg-${mfg}`}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200"
              >
                <span>Gyártó: {mfg}</span>
                <button
                  type="button"
                  onClick={() => toggleFilterItem('manufacturers', mfg)}
                  className="hover:text-stone-900 cursor-pointer p-0.5"
                  title={`Gyártó eltávolítása: ${mfg}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Active Part Types */}
            {activePartTypes.map((pt) => (
              <span
                key={`chip-pt-${pt}`}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200"
              >
                <span>Típus: {pt}</span>
                <button
                  type="button"
                  onClick={() => toggleFilterItem('partTypes', pt)}
                  className="hover:text-stone-900 cursor-pointer p-0.5"
                  title={`Típus eltávolítása: ${pt}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Active Insulation Types */}
            {activeInsulationTypes.map((it) => (
              <span
                key={`chip-it-${it}`}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200"
              >
                <span>Szigetelés: {it}</span>
                <button
                  type="button"
                  onClick={() => toggleFilterItem('insulationTypes', it)}
                  className="hover:text-stone-900 cursor-pointer p-0.5"
                  title={`Szigetelés eltávolítása: ${it}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Active Locations */}
            {activeLocations.map((loc) => (
              <span
                key={`chip-loc-${loc}`}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 font-medium border border-stone-200"
              >
                <span>Hely: {loc}</span>
                <button
                  type="button"
                  onClick={() => toggleFilterItem('locations', loc)}
                  className="hover:text-stone-900 cursor-pointer p-0.5"
                  title={`Hely eltávolítása: ${loc}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Reset All */}
            <button
              type="button"
              id="clear-all-filters-btn"
              onClick={resetFilters}
              className="text-[11px] font-semibold text-red-600 hover:text-red-800 ml-1 cursor-pointer underline py-1"
            >
              Összes törlése
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center space-y-3 w-full">
          <Filter className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-base font-bold text-stone-800">Nincs találat</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            A megadott szűrési feltételeknek egyetlen termék sem felel meg.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-4 py-2 rounded-lg bg-[#006067] text-white text-xs font-medium hover:bg-[#00474c] transition-colors cursor-pointer"
          >
            Szűrők visszaállítása
          </button>
        </div>
      ) : (
        <>
          {/* ============================================================ */}
          {/* 1. DEDICATED MOBILE VIEW: 4 ESSENTIAL FIELDS, LARGE ID       */}
          {/* ============================================================ */}
          <div className="block md:hidden w-full space-y-2.5">
            {paginatedProducts.map((p) => {
              const bd = getProductStockBreakdown(p.id);
              if (mobileStyle === 'compact') {
                /* ULTRA COMPACT MOBILE ROW */
                return (
                  <div
                    key={p.id}
                    onClick={() => selectProductById(p.id)}
                    className="w-full bg-white rounded-xl border border-stone-200 p-3 shadow-2xs hover:border-[#006067] active:bg-[#006067]/5 transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {/* Termék ID - Large font, no icon */}
                      <TermekIdLink id={p.id} className="text-base font-black" />
                      {/* Kategória with color coding */}
                      {hasVal(p.category) && (
                        <FilterTag type="category" value={p.category} variant="pill" />
                      )}
                    </div>

                    {/* Termék Név */}
                    <h3 className="font-bold text-stone-900 text-sm leading-snug">
                      {p.name}
                    </h3>

                    {/* Stock & Condition badges + Gyári Kód */}
                    <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs">
                      <div className="font-mono text-stone-600 font-semibold">
                        {hasVal(p.factoryCode) ? (
                          <span>Gyári kód: {p.factoryCode}</span>
                        ) : (
                          <span className="text-stone-300 font-normal">Gyári kód: -</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {bd.totalStock === 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            0 db
                          </span>
                        ) : (
                          <>
                            {bd.newStock > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Új: {bd.newStock} db
                              </span>
                            )}
                            {bd.usedStock > 0 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Használt: {bd.usedStock} db
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              /* STANDARD COMFORTABLE MOBILE CARD */
              return (
                <div
                  key={p.id}
                  onClick={() => selectProductById(p.id)}
                  className="w-full bg-white rounded-xl border border-stone-200 p-3.5 shadow-2xs hover:border-[#006067] active:bg-[#006067]/5 transition-all cursor-pointer space-y-2.5"
                >
                  {/* Top row: Termék ID (Large font, no icon) & Kategória */}
                  <div className="flex items-center justify-between gap-2">
                    <TermekIdLink id={p.id} className="text-lg font-black" />
                    {hasVal(p.category) && (
                      <FilterTag type="category" value={p.category} variant="pill" />
                    )}
                  </div>

                  {/* Termék Név */}
                  <div>
                    <h3 className="font-bold text-stone-900 text-base leading-snug break-words">
                      {p.name}
                    </h3>
                  </div>

                  {/* Condition Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {bd.totalStock === 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        0 db készlet
                      </span>
                    ) : (
                      <>
                        {bd.newStock > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Új: {bd.newStock} db
                          </span>
                        )}
                        {bd.usedStock > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Használt: {bd.usedStock} db
                          </span>
                        )}
                      </>
                    )}
                    {(() => {
                      const ord = getProductOrderSummary(p.id);
                      if (ord.directOrders.length > 0) {
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300"
                            title={`Rendelve: ${ord.directOrders[0].statusz}`}
                          >
                            <ShoppingCart className="w-3 h-3 text-sky-700" />
                            <span>Rendelve ({ord.directOrders[0].statusz})</span>
                          </span>
                        );
                      }
                      if (ord.relatedOrders.length > 0) {
                        return (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300"
                            title={`Kapcsolódó termék megrendelve`}
                          >
                            <Link2 className="w-3 h-3 text-amber-700" />
                            <span>Kapcs. Rendelés</span>
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Gyári Kód (No # character) */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                    <span className="font-mono text-stone-700 font-bold">
                      {hasVal(p.factoryCode) ? (
                        <>Gyári kód: {p.factoryCode}</>
                      ) : (
                        <span className="text-stone-400 font-normal">Gyári kód: -</span>
                      )}
                    </span>
                    <span className="text-[#006067] font-bold text-xs">
                      Adatlap →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* 2. DESKTOP & TABLET VIEW: 4 ESSENTIAL COLUMNS / CLEAN CARDS   */}
          {/* ============================================================ */}
          <div className="hidden md:block w-full">
            {viewMode === 'table' ? (
              <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden w-full">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F4F7F6] border-b border-stone-200 text-stone-700 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        {/* 1. Termék ID Header - Sortable */}
                        <th
                          className="py-3.5 px-4 w-[28%] cursor-pointer hover:bg-stone-200/60 transition-colors select-none group/th"
                          onClick={() => handleSort('id')}
                          title="Kattintson a rendezéshez Termék ID szerint"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Termék ID & Állapot</span>
                            {filters.sortBy === 'id' ? (
                              filters.sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[#006067]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[#006067]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-stone-300 group-hover/th:text-stone-500" />
                            )}
                          </div>
                        </th>

                        {/* 2. Termék Név Header - Sortable */}
                        <th
                          className="py-3.5 px-4 w-[37%] cursor-pointer hover:bg-stone-200/60 transition-colors select-none group/th"
                          onClick={() => handleSort('name')}
                          title="Kattintson a rendezéshez Termék Név szerint (A-Z / Z-A)"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={filters.sortBy === 'name' ? 'text-[#006067]' : ''}>Termék Név</span>
                            {filters.sortBy === 'name' ? (
                              filters.sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[#006067]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[#006067]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-stone-300 group-hover/th:text-stone-500" />
                            )}
                          </div>
                        </th>

                        {/* 3. Gyári Kód Header - Sortable */}
                        <th
                          className="py-3.5 px-4 w-[18%] cursor-pointer hover:bg-stone-200/60 transition-colors select-none group/th"
                          onClick={() => handleSort('factoryCode')}
                          title="Kattintson a rendezéshez Gyári Kód szerint"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Gyári Kód</span>
                            {filters.sortBy === 'factoryCode' ? (
                              filters.sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[#006067]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[#006067]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-stone-300 group-hover/th:text-stone-500" />
                            )}
                          </div>
                        </th>

                        {/* 4. Kategória Header - Sortable */}
                        <th
                          className="py-3.5 px-4 w-[17%] cursor-pointer hover:bg-stone-200/60 transition-colors select-none group/th"
                          onClick={() => handleSort('category')}
                          title="Kattintson a rendezéshez Kategória szerint"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Kategória</span>
                            {filters.sortBy === 'category' ? (
                              filters.sortOrder === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-[#006067]" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-[#006067]" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-stone-300 group-hover/th:text-stone-500" />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-normal text-stone-800">
                      {paginatedProducts.map((p) => {
                        const bd = getProductStockBreakdown(p.id);
                        return (
                          <tr
                            key={p.id}
                            onClick={() => selectProductById(p.id)}
                            className="hover:bg-[#006067]/5 transition-colors cursor-pointer group"
                          >
                            {/* 1. Termék ID & Condition Breakdown */}
                            <td className="py-3 px-4 font-mono">
                              <div className="space-y-1">
                                <TermekIdLink id={p.id} className="text-base sm:text-lg font-black" />
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {bd.totalStock === 0 ? (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                      0 db
                                    </span>
                                  ) : (
                                    <>
                                      {bd.newStock > 0 && (
                                        <span
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          title="Új termék készlet"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                          Új: {bd.newStock} db
                                        </span>
                                      )}
                                      {bd.usedStock > 0 && (
                                        <span
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                          title="Használt termék készlet"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                          Használt: {bd.usedStock} db
                                        </span>
                                      )}
                                    </>
                                  )}
                                  {(() => {
                                    const ord = getProductOrderSummary(p.id);
                                    if (ord.directOrders.length > 0) {
                                      return (
                                        <span
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-300"
                                          title={`Rendelve: ${ord.directOrders[0].statusz} (${ord.directOrders.length} tétel)`}
                                        >
                                          <ShoppingCart className="w-2.5 h-2.5 text-sky-700" />
                                          <span>Rendelve ({ord.directOrders[0].statusz})</span>
                                        </span>
                                      );
                                    }
                                    if (ord.relatedOrders.length > 0) {
                                      return (
                                        <span
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300"
                                          title={`Kapcsolódó termék megrendelve: ${ord.relatedOrders[0].relatedProductId}`}
                                        >
                                          <Link2 className="w-2.5 h-2.5 text-amber-700" />
                                          <span>Kapcs. Rendelés</span>
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </td>

                            {/* 2. Termék Név */}
                            <td className="py-3 px-4 font-bold text-stone-900">
                              <div className="group-hover:text-[#006067] transition-colors text-sm sm:text-base">
                                {p.name}
                              </div>
                            </td>

                            {/* 3. Gyári Kód (No # character) */}
                            <td className="py-3 px-4 font-mono text-xs sm:text-sm font-semibold text-stone-700 whitespace-nowrap">
                              {hasVal(p.factoryCode) ? (
                                <span>{p.factoryCode}</span>
                              ) : (
                                <span className="text-stone-300 font-normal">-</span>
                              )}
                            </td>

                            {/* 4. Kategória with color coding */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              {hasVal(p.category) ? (
                                <FilterTag type="category" value={p.category} variant="pill" />
                              ) : (
                                <span className="text-stone-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* GRID VIEW: Clean card with 4 fields + condition badges */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                {paginatedProducts.map((p) => {
                  const bd = getProductStockBreakdown(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectProductById(p.id)}
                      className="bg-white rounded-xl border border-stone-200 hover:border-[#006067] p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99] space-y-3"
                    >
                      <div className="space-y-2">
                        {/* 1. Termék ID (Large font, no icon) */}
                        <div className="flex items-center justify-between gap-2">
                          <TermekIdLink id={p.id} className="text-lg font-black" />
                          {hasVal(p.category) && (
                            <FilterTag type="category" value={p.category} variant="pill" />
                          )}
                        </div>

                        {/* 2. Termék Név */}
                        <div>
                          <h3 className="font-extrabold text-stone-900 text-sm sm:text-base group-hover:text-[#006067] transition-colors leading-snug">
                            {p.name}
                          </h3>
                        </div>

                        {/* Condition & Stock Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {bd.totalStock === 0 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              0 db készlet
                            </span>
                          ) : (
                            <>
                              {bd.newStock > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  Új: {bd.newStock} db
                                </span>
                              )}
                              {bd.usedStock > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                                  Használt: {bd.usedStock} db
                                </span>
                              )}
                            </>
                          )}
                          {(() => {
                            const ord = getProductOrderSummary(p.id);
                            if (ord.directOrders.length > 0) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300"
                                  title={`Rendelve: ${ord.directOrders[0].statusz}`}
                                >
                                  <ShoppingCart className="w-3 h-3 text-sky-700" />
                                  <span>Rendelve ({ord.directOrders[0].statusz})</span>
                                </span>
                              );
                            }
                            if (ord.relatedOrders.length > 0) {
                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300"
                                  title={`Kapcsolódó termék megrendelve`}
                                >
                                  <Link2 className="w-3 h-3 text-amber-700" />
                                  <span>Kapcs. Rendelés</span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>

                      {/* Bottom row: Gyári Kód */}
                      <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        {/* 3. Gyári Kód (No # character) */}
                        <div className="font-mono text-xs font-semibold text-stone-700">
                          {hasVal(p.factoryCode) ? (
                            <span>Gyári kód: {p.factoryCode}</span>
                          ) : (
                            <span className="text-stone-300 font-normal">-</span>
                          )}
                        </div>
                        <span className="text-[#006067] font-bold text-xs">
                          Adatlap →
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Pagination Controls */}
      <div className="bg-white rounded-xl border border-stone-200 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-stone-600 shadow-2xs w-full">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 text-[11px] sm:text-xs">Oldalanként:</span>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-[#F4F7F6] border border-stone-200 rounded px-2 py-1 text-xs text-stone-800 outline-none font-medium min-h-[32px]"
            >
              <option value={25}>25 tétel</option>
              <option value={50}>50 tétel</option>
              <option value={100}>100 tétel</option>
              <option value={250}>250 tétel</option>
            </select>
          </div>
          <span className="text-stone-400 hidden sm:inline">|</span>
          <span className="text-[11px] sm:text-xs font-mono font-medium text-stone-700">
            {filteredProducts.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
            {Math.min(currentPage * pageSize, filteredProducts.length)} / {filteredProducts.length}
          </span>
        </div>

        {/* Page navigation buttons */}
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            id="prev-page-btn"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer min-h-[36px] flex items-center gap-1"
            title="Előző oldal"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs font-medium">Előző</span>
          </button>

          <span className="px-2 font-mono font-bold text-stone-800 text-xs">
            {currentPage} / {totalPages}
          </span>

          <button
            type="button"
            id="next-page-btn"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer min-h-[36px] flex items-center gap-1"
            title="Következő oldal"
          >
            <span className="text-xs font-medium">Következő</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

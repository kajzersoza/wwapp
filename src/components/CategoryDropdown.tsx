import React, { useState, useRef, useEffect } from 'react';
import { useProducts } from '../context/ProductContext';
import { Layers, ChevronDown, Check, Search, X, FolderTree } from 'lucide-react';
import { getCategoryColor } from '../utils/categoryColors';

interface CategoryDropdownProps {
  variant?: 'header' | 'filter' | 'mobile' | 'compact';
  className?: string;
  onSelect?: (category: string) => void;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  variant = 'filter',
  className = '',
  onSelect,
}) => {
  const {
    categories,
    products,
    filters,
    toggleFilterItem,
    clearFilterKey,
    totalCount,
  } = useProducts();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Selected categories list
  const selectedCategories = React.useMemo(() => {
    if (filters.categories && filters.categories.length > 0) {
      return filters.categories;
    }
    if (filters.category) {
      return [filters.category];
    }
    return [];
  }, [filters.categories, filters.category]);

  const selectedCount = selectedCategories.length;

  // Compute category counts
  const categoryCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        const cat = p.category.trim();
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return map;
  }, [products]);

  // Filtered categories based on inner search
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((cat) => cat.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleCategory = (cat: string) => {
    toggleFilterItem('categories', cat);
    if (onSelect) onSelect(cat);
  };

  const handleClearAll = () => {
    clearFilterKey('categories');
  };

  // Label calculation
  const getButtonLabel = () => {
    if (selectedCount === 0) {
      return 'Összes Kategória';
    }
    if (selectedCount === 1) {
      return selectedCategories[0];
    }
    return `Kategóriák (${selectedCount})`;
  };

  if (variant === 'header') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          type="button"
          id="header-category-dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none min-h-[40px] ${
            selectedCount > 0
              ? 'bg-[#E0E9E8] border-[#006067] text-[#006067]'
              : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 hover:border-stone-300'
          }`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Layers className="w-4 h-4 text-[#006067]" />
          {selectedCount === 1 && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                getCategoryColor(selectedCategories[0]).dot
              }`}
            />
          )}
          <span className="max-w-[130px] sm:max-w-[170px] truncate">
            {getButtonLabel()}
          </span>
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[#006067] text-white rounded-full text-[10px] font-mono font-bold">
              {selectedCount}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#006067]' : ''
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[420px] animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Header / Search */}
            <div className="p-2.5 border-b border-stone-100 bg-stone-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  id="category-search-input-header"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Kategória keresése..."
                  className="w-full bg-white border border-stone-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-stone-800 focus:border-[#006067] outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions (Count & Clear) */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50/80 border-b border-stone-100 text-[11px] font-semibold text-stone-500">
              <span>{selectedCount} kiválasztva</span>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-stone-500 hover:text-red-600 hover:underline cursor-pointer"
                >
                  Kijelölések törlése
                </button>
              )}
            </div>

            {/* List with checkboxes and distinct category colors */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[280px]">
              {filteredCategories.map((cat) => {
                const count = categoryCounts[cat] || 0;
                const isSelected = selectedCategories.includes(cat);
                const palette = getCategoryColor(cat);

                return (
                  <label
                    key={cat}
                    onClick={() => handleToggleCategory(cat)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer select-none ${
                      isSelected
                        ? 'bg-[#E0E9E8] text-[#006067] font-semibold'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Checkbox square */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#006067] border-[#006067] text-white shadow-2xs'
                            : 'border-stone-300 bg-white hover:border-stone-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      {/* Color Dot & Text */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${palette.dot}`} />
                      <span className="truncate mr-1">{cat}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        isSelected ? 'bg-[#006067]/15 text-[#006067] font-bold' : 'bg-stone-100 text-stone-500'
                      }`}
                    >
                      {count} db
                    </span>
                  </label>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="p-4 text-center text-xs text-stone-400">
                  Nincs találat a(z) "{searchQuery}" kifejezésre.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter / Mobile variant
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id="category-dropdown-filter-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none min-h-[42px] ${
          selectedCount > 0
            ? 'bg-[#E0E9E8] border-[#006067] text-[#006067]'
            : 'bg-[#F4F7F6] border-stone-200 hover:bg-white text-stone-800 focus:border-[#006067]'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          <Layers className={`w-4 h-4 flex-shrink-0 ${selectedCount > 0 ? 'text-[#006067]' : 'text-stone-500'}`} />
          {selectedCount === 1 && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                getCategoryColor(selectedCategories[0]).dot
              }`}
            />
          )}
          <span className="truncate">
            {getButtonLabel()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {selectedCount > 0 && (
            <span className="text-[10px] font-mono bg-[#006067] text-white px-1.5 py-0.5 rounded-full font-bold">
              {selectedCount}
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#006067]' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Quick Search */}
          <div className="p-2.5 border-b border-stone-100 bg-stone-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="category-search-input-filter"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kategória keresése..."
                className="w-full bg-white border border-stone-200 rounded-lg pl-8 pr-7 py-2 text-xs text-stone-800 focus:border-[#006067] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions (Count & Clear) */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50/80 border-b border-stone-100 text-[11px] font-semibold text-stone-500">
            <span>{selectedCount} kiválasztva</span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-stone-500 hover:text-red-600 hover:underline cursor-pointer"
              >
                Kijelölések törlése
              </button>
            )}
          </div>

          {/* List items with checkboxes */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {filteredCategories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategories.includes(cat);
              const palette = getCategoryColor(cat);

              return (
                <label
                  key={cat}
                  onClick={() => handleToggleCategory(cat)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer min-h-[40px] select-none ${
                    isSelected
                      ? 'bg-[#E0E9E8] text-[#006067] font-semibold'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Checkbox square */}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#006067] border-[#006067] text-white shadow-2xs'
                          : 'border-stone-300 bg-white hover:border-stone-400'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    {/* Category Color Dot & Name */}
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${palette.dot}`} />
                    <span className="truncate mr-2 font-medium">{cat}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isSelected ? 'bg-[#006067]/15 text-[#006067] font-bold' : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {count} db
                  </span>
                </label>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="p-4 text-center text-xs text-stone-400">
                Nem található kategória "{searchQuery}" névvel.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

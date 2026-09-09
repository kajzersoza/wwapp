import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X, CheckSquare, Square } from 'lucide-react';
import { getCategoryColor, COMMON_CATEGORIES } from '../utils/categoryColors';

interface MultiSelectDropdownProps {
  id?: string;
  title: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onSelectAll?: (values: string[]) => void;
  onClear?: () => void;
  isCategory?: boolean;
  hideSearch?: boolean;
  itemCounts?: Record<string, number>;
  icon?: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  title,
  options,
  selectedValues = [],
  onToggle,
  onSelectAll,
  onClear,
  isCategory = false,
  hideSearch = false,
  itemCounts = {},
  icon,
  className = '',
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCount = selectedValues.length;

  const shouldShowSearch = !isCategory && !hideSearch && options.length > 5;

  // Filter options by internal search query
  const filteredOptions = React.useMemo(() => {
    if (!shouldShowSearch || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchQuery, shouldShowSearch]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (shouldShowSearch) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, shouldShowSearch]);

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(options);
    } else {
      options.forEach((opt) => {
        if (!selectedValues.includes(opt)) {
          onToggle(opt);
        }
      });
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      selectedValues.forEach((opt) => onToggle(opt));
    }
  };

  // Preview label for the trigger button
  const getButtonLabel = () => {
    if (selectedCount === 0) {
      return placeholder || `Összes ${title.toLowerCase()}`;
    }
    if (selectedCount === 1) {
      return selectedValues[0];
    }
    return `${title} (${selectedCount})`;
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id || `multiselect-${title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer min-h-[42px] select-none text-left ${
          selectedCount > 0
            ? 'bg-[#E0E9E8] border-[#006067] text-[#006067] font-semibold ring-1 ring-[#006067]/20 shadow-2xs'
            : 'bg-[#F4F7F6] border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-50'
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-stone-400 flex-shrink-0">{icon}</span>}
          
          {/* If single category is selected, show its color dot */}
          {isCategory && selectedCount === 1 && (
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                getCategoryColor(selectedValues[0]).dot
              }`}
            />
          )}

          <span className="truncate text-xs font-medium">
            {getButtonLabel()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selectedCount > 0 && (
            <span className="px-1.5 py-0.2 bg-[#006067] text-white rounded-full text-[10px] font-mono font-bold">
              {selectedCount}
            </span>
          )}

          {selectedCount > 0 && onClear && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClear();
                }
              }}
              className="p-0.5 hover:bg-stone-300/40 rounded text-stone-500 hover:text-stone-900 cursor-pointer"
              title="Kijelölés törlése"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}

          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-[#006067]' : ''
            }`}
          />
        </div>
      </button>

      {/* Popover Menu with Checkboxes */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[240px] sm:min-w-[280px] bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Box (hidden for category) */}
          {shouldShowSearch && (
            <div className="p-2 border-b border-stone-100 bg-stone-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Keresés: ${title}...`}
                  className="w-full bg-white border border-stone-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-stone-800 focus:border-[#006067] outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions (Select all / Clear) */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-stone-50/80 border-b border-stone-100 text-[11px] font-semibold text-stone-500">
            <span>
              {selectedCount} / {options.length} kiválasztva
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#006067] hover:underline cursor-pointer"
              >
                Mindet
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleClear}
                disabled={selectedCount === 0}
                className="text-stone-500 hover:text-red-600 hover:underline cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Törlés
              </button>
            </div>
          </div>

          {/* Gyakori Kategóriák Quick Chips (if isCategory) */}
          {isCategory && (
            <div className="px-2.5 py-2 border-b border-stone-100 bg-stone-50/60">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Gyakori Kategóriák
              </div>
              <div className="flex flex-wrap gap-1">
                {COMMON_CATEGORIES.map((cat) => {
                  const isSelected = selectedValues.includes(cat);
                  const palette = getCategoryColor(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => onToggle(cat)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer border select-none ${
                        isSelected
                          ? 'bg-[#006067] text-white border-[#006067] shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : palette.dot
                        }`}
                      />
                      <span className="truncate">{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options list with checkboxes */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 max-h-[260px]">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400">
                Nincs találat: "{searchQuery}"
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option);
                const count = itemCounts[option];
                const catPalette = isCategory ? getCategoryColor(option) : null;

                return (
                  <button
                    type="button"
                    key={option}
                    onClick={() => onToggle(option)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors select-none ${
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
                      {catPalette && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${catPalette.dot}`}
                        />
                      )}

                      <span className="truncate text-xs">{option}</span>
                    </div>

                    {/* Count badge */}
                    {count !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          isSelected
                            ? 'bg-[#006067]/15 text-[#006067] font-bold'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer close bar */}
          <div className="p-2 border-t border-stone-100 bg-stone-50 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#006067] hover:bg-[#00474c] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Alkalmaz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

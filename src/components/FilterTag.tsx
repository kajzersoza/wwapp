import React from 'react';
import { useProducts } from '../context/ProductContext';
import { getCategoryColor } from '../utils/categoryColors';

interface FilterTagProps {
  type: 'category' | 'manufacturer' | 'partType' | 'insulationType' | 'location';
  value?: string;
  variant?: 'pill' | 'subtle' | 'badge';
  className?: string;
  showDot?: boolean;
}

export const FilterTag: React.FC<FilterTagProps> = ({
  type,
  value,
  variant = 'pill',
  className = '',
  showDot = true,
}) => {
  const { filters, filterByValue } = useProducts();

  if (!value || !value.trim() || value === '-') return null;

  const cleanVal = value.trim();

  // Check if active in either multi-select array or single string
  let isActive = false;
  if (type === 'category') {
    isActive = (filters.categories && filters.categories.includes(cleanVal)) || filters.category === cleanVal;
  } else if (type === 'manufacturer') {
    isActive = (filters.manufacturers && filters.manufacturers.includes(cleanVal)) || filters.manufacturer === cleanVal;
  } else if (type === 'partType') {
    isActive = (filters.partTypes && filters.partTypes.includes(cleanVal)) || filters.partType === cleanVal;
  } else if (type === 'insulationType') {
    isActive = (filters.insulationTypes && filters.insulationTypes.includes(cleanVal)) || filters.insulationType === cleanVal;
  } else if (type === 'location') {
    isActive = (filters.locations && filters.locations.includes(cleanVal)) || filters.location === cleanVal;
  }

  const typeLabels: Record<string, string> = {
    category: 'Kategória',
    manufacturer: 'Gyártó',
    partType: 'Alkatrész Típus',
    insulationType: 'Szigetelés',
    location: 'Hely',
  };

  // If it's a category, apply distinct category color palette!
  if (type === 'category') {
    const palette = getCategoryColor(cleanVal);

    if (variant === 'pill') {
      return (
        <button
          type="button"
          id={`tag-${type}-${cleanVal.replace(/[^a-zA-Z0-9]/g, '_')}`}
          onClick={(e) => {
            e.stopPropagation();
            filterByValue(type, cleanVal);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
            isActive
              ? `${palette.activeBg} ring-2 ring-[#006067]/30 shadow-xs scale-[1.02]`
              : `${palette.badgeClass} hover:brightness-95`
          } ${className}`}
          title={`Szűrés Kategória: "${cleanVal}"`}
        >
          {showDot && (
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isActive ? 'bg-white' : palette.dot
              }`}
            />
          )}
          <span className="truncate max-w-[170px]">{cleanVal}</span>
        </button>
      );
    }

    if (variant === 'badge') {
      return (
        <button
          type="button"
          id={`tag-${type}-${cleanVal.replace(/[^a-zA-Z0-9]/g, '_')}`}
          onClick={(e) => {
            e.stopPropagation();
            filterByValue(type, cleanVal);
          }}
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold border transition-all cursor-pointer ${
            isActive ? palette.activeBg : palette.badgeClass
          } ${className}`}
          title={`Szűrés Kategória: "${cleanVal}"`}
        >
          {showDot && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : palette.dot}`} />}
          <span>{cleanVal}</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        id={`tag-${type}-${cleanVal.replace(/[^a-zA-Z0-9]/g, '_')}`}
        onClick={(e) => {
          e.stopPropagation();
          filterByValue(type, cleanVal);
        }}
        className={`inline-flex items-center gap-1 text-xs font-bold cursor-pointer hover:underline ${palette.subtleClass} ${className}`}
        title={`Szűrés Kategória: "${cleanVal}"`}
      >
        {showDot && <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />}
        <span>{cleanVal}</span>
      </button>
    );
  }

  // Non-category standard styling
  const isManufacturer = type === 'manufacturer';
  let baseStyle = `inline-flex items-center ${isManufacturer ? 'text-[11px]' : 'text-xs'} font-medium cursor-pointer transition-all`;
  if (variant === 'pill') {
    baseStyle += isActive
      ? ' px-2.5 py-0.5 rounded-full bg-[#006067] text-white shadow-xs font-semibold'
      : isManufacturer
      ? ' px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
      : ' px-2.5 py-0.5 rounded-full bg-[#E0E9E8] text-[#006067] hover:bg-[#006067]/15 hover:text-[#00474c]';
  } else if (variant === 'badge') {
    baseStyle += isActive
      ? ' px-2 py-0.5 rounded bg-[#006067] text-white'
      : ' px-2 py-0.5 rounded bg-stone-100 text-stone-700 hover:bg-stone-200';
  } else {
    baseStyle += isActive
      ? ' text-[#006067] font-bold underline'
      : ' text-stone-600 hover:text-[#006067] hover:underline';
  }

  return (
    <button
      type="button"
      id={`tag-${type}-${cleanVal.replace(/[^a-zA-Z0-9]/g, '_')}`}
      onClick={(e) => {
        e.stopPropagation();
        filterByValue(type, cleanVal);
      }}
      className={`${baseStyle} ${className}`}
      title={`Szűrés: ${typeLabels[type] || type} = "${cleanVal}"`}
    >
      <span>{cleanVal}</span>
    </button>
  );
};

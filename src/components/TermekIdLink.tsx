import React from 'react';
import { useProducts } from '../context/ProductContext';
import { getBaseProductId } from '../utils/productUtils';

interface TermekIdLinkProps {
  id: string;
  className?: string;
  showIcon?: boolean;
  truncate?: boolean;
}

export const TermekIdLink: React.FC<TermekIdLinkProps> = ({
  id,
  className = '',
  truncate = false,
}) => {
  const { selectProductById } = useProducts();

  if (!id || !id.trim()) {
    return <span className="text-stone-400 italic text-sm">Nincs ID</span>;
  }

  const cleanId = id.trim();
  const baseId = getBaseProductId(cleanId);

  return (
    <button
      type="button"
      id={`link-termek-id-${baseId.replace(/[^a-zA-Z0-9]/g, '_')}`}
      onClick={(e) => {
        e.stopPropagation();
        selectProductById(baseId);
      }}
      className={`inline-flex items-center font-mono text-left font-black text-base sm:text-lg text-[#006067] hover:text-[#00474c] hover:underline decoration-1 underline-offset-2 transition-colors cursor-pointer group py-0.5 rounded px-1 -mx-1 hover:bg-[#006067]/8 tracking-tight ${className}`}
      title={`Ugrás a(z) ${baseId} termék adatlapjára`}
    >
      <span className={truncate ? 'truncate max-w-[160px]' : ''}>{baseId}</span>
    </button>
  );
};


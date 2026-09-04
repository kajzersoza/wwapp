import React from 'react';
import { useProducts } from '../context/ProductContext';
import { MapPin, ExternalLink } from 'lucide-react';

interface PositionLinkProps {
  positionId?: string;
  positionName?: string;
  quantity?: number;
  className?: string;
  showIcon?: boolean;
  showBadge?: boolean;
  variant?: 'pill' | 'badge' | 'link';
}

export const PositionLink: React.FC<PositionLinkProps> = ({
  positionId,
  positionName,
  quantity,
  className = '',
  showIcon = true,
  showBadge = true,
  variant = 'pill',
}) => {
  const { positions, selectPositionById } = useProducts();

  const query = (positionId || positionName || '').trim();
  if (!query) return null;

  // Try to match position in positions list
  const matchedPos = positions.find(
    (p) =>
      p.id.toLowerCase() === query.toLowerCase() ||
      p.name.toLowerCase() === query.toLowerCase()
  );

  const displayId = matchedPos ? matchedPos.id : positionId || '';
  const displayName = matchedPos ? matchedPos.name : positionName || query;
  const targetKey = matchedPos ? matchedPos.id : query;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectPositionById(targetKey);
  };

  if (variant === 'link') {
    return (
      <button
        type="button"
        id={`pos-link-${targetKey.replace(/[^a-zA-Z0-9]/g, '_')}`}
        onClick={handleClick}
        className={`inline-flex items-center gap-1 font-semibold text-[#006067] hover:text-[#00474c] hover:underline cursor-pointer group text-xs ${className}`}
        title={`Ugrás a(z) ${displayName} pozícióra és a benne tárolt termékek listájára`}
      >
        {showIcon && <MapPin className="w-3.5 h-3.5 text-[#006067] flex-shrink-0" />}
        <span className="truncate">{displayName}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        id={`pos-badge-${targetKey.replace(/[^a-zA-Z0-9]/g, '_')}`}
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E0E9E8] hover:bg-[#006067] text-[#006067] hover:text-white font-medium text-xs border border-[#006067]/20 transition-all cursor-pointer group ${className}`}
        title={`Ugrás a(z) ${displayName} pozícióra és a benne tárolt termékek listájára`}
      >
        {showIcon && <MapPin className="w-3 h-3 flex-shrink-0" />}
        <span className="truncate">{displayName}</span>
        {displayId && displayId !== displayName && (
          <span className="font-mono text-[10px] opacity-75">({displayId})</span>
        )}
        {quantity !== undefined && (
          <span className="ml-1 font-mono font-bold bg-white/60 group-hover:bg-black/20 text-stone-900 group-hover:text-white px-1.5 py-0.2 rounded text-[10px]">
            {quantity} db
          </span>
        )}
      </button>
    );
  }

  // Default: pill
  return (
    <button
      type="button"
      id={`pos-pill-${targetKey.replace(/[^a-zA-Z0-9]/g, '_')}`}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0E9E8] hover:bg-[#006067] text-[#006067] hover:text-white font-bold text-xs border border-[#006067]/30 transition-all cursor-pointer group shadow-2xs ${className}`}
      title={`Ugrás a(z) ${displayName} pozícióra és a benne tárolt termékek listájára`}
    >
      {showIcon && <MapPin className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="truncate">{displayName}</span>
      {displayId && showBadge && displayId !== displayName && (
        <span className="font-mono text-[10px] bg-white/70 group-hover:bg-white/20 text-[#006067] group-hover:text-white px-1.5 py-0.2 rounded font-normal">
          {displayId}
        </span>
      )}
      {quantity !== undefined && (
        <span className="font-mono text-[11px] bg-emerald-100 group-hover:bg-emerald-700 text-emerald-900 group-hover:text-white px-1.5 py-0.2 rounded-full font-bold">
          {quantity} db
        </span>
      )}
      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0" />
    </button>
  );
};

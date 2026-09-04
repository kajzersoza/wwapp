// Category distinct color palette mapping utility

export interface CategoryColorTheme {
  bg: string;
  text: string;
  border: string;
  dot: string;
  activeBg: string;
  badgeClass: string;
  pillClass: string;
  subtleClass: string;
}

const PRESET_PALETTES: Record<string, CategoryColorTheme> = {
  // Saruzófej - Distinct Deep Teal / Jade
  'saruzófej': {
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-200',
    dot: 'bg-teal-600',
    activeBg: 'bg-teal-700 text-white border-teal-700',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    pillClass: 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100',
    subtleClass: 'text-teal-700 hover:text-teal-900',
  },
  // Saruzófej Alkatrész - Deep Royal Violet / Indigo
  'saruzófej alkatrész': {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
    activeBg: 'bg-purple-700 text-white border-purple-700',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    pillClass: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
    subtleClass: 'text-purple-700 hover:text-purple-900',
  },
  // Alkatrész - Sapphire Blue
  'alkatrész': {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    activeBg: 'bg-blue-700 text-white border-blue-700',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    pillClass: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100',
    subtleClass: 'text-blue-700 hover:text-blue-900',
  },
  // Csatlakozó - Warm Amber / Bronze
  'csatlakozó': {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    activeBg: 'bg-amber-700 text-white border-amber-700',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    pillClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
    subtleClass: 'text-amber-700 hover:text-amber-900',
  },
  // Készülék - Rose / Crimson
  'készülék': {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    dot: 'bg-rose-600',
    activeBg: 'bg-rose-700 text-white border-rose-700',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    pillClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    subtleClass: 'text-rose-700 hover:text-rose-900',
  },
  // Kábel / Vezeték - Fresh Emerald Green
  'kábel': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    activeBg: 'bg-emerald-700 text-white border-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    subtleClass: 'text-emerald-700 hover:text-emerald-900',
  },
  // Szerszám - Sky Blue / Azure
  'szerszám': {
    bg: 'bg-sky-50',
    text: 'text-sky-900',
    border: 'border-sky-200',
    dot: 'bg-sky-600',
    activeBg: 'bg-sky-700 text-white border-sky-700',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    pillClass: 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100',
    subtleClass: 'text-sky-700 hover:text-sky-900',
  },
  // Gép - Indigo / Slate
  'gép': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-900',
    border: 'border-indigo-200',
    dot: 'bg-indigo-600',
    activeBg: 'bg-indigo-700 text-white border-indigo-700',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    pillClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100',
    subtleClass: 'text-indigo-700 hover:text-indigo-900',
  },
  // Egyéb / Vegyes - Neutral Warm Stone
  'egyéb': {
    bg: 'bg-stone-100',
    text: 'text-stone-800',
    border: 'border-stone-200',
    dot: 'bg-stone-500',
    activeBg: 'bg-stone-700 text-white border-stone-700',
    badgeClass: 'bg-stone-100 text-stone-700 border-stone-200',
    pillClass: 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200',
    subtleClass: 'text-stone-600 hover:text-stone-900',
  },
};

// Fallback color list for dynamic categories from external sheets
const DYNAMIC_PALETTES: CategoryColorTheme[] = [
  {
    bg: 'bg-teal-50',
    text: 'text-teal-900',
    border: 'border-teal-200',
    dot: 'bg-teal-600',
    activeBg: 'bg-teal-700 text-white border-teal-700',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    pillClass: 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100',
    subtleClass: 'text-teal-700',
  },
  {
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200',
    dot: 'bg-purple-600',
    activeBg: 'bg-purple-700 text-white border-purple-700',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    pillClass: 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100',
    subtleClass: 'text-purple-700',
  },
  {
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200',
    dot: 'bg-blue-600',
    activeBg: 'bg-blue-700 text-white border-blue-700',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    pillClass: 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100',
    subtleClass: 'text-blue-700',
  },
  {
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200',
    dot: 'bg-amber-600',
    activeBg: 'bg-amber-700 text-white border-amber-700',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    pillClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
    subtleClass: 'text-amber-700',
  },
  {
    bg: 'bg-rose-50',
    text: 'text-rose-900',
    border: 'border-rose-200',
    dot: 'bg-rose-600',
    activeBg: 'bg-rose-700 text-white border-rose-700',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    pillClass: 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100',
    subtleClass: 'text-rose-700',
  },
  {
    bg: 'bg-emerald-50',
    text: 'text-emerald-900',
    border: 'border-emerald-200',
    dot: 'bg-emerald-600',
    activeBg: 'bg-emerald-700 text-white border-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100',
    subtleClass: 'text-emerald-700',
  },
  {
    bg: 'bg-cyan-50',
    text: 'text-cyan-900',
    border: 'border-cyan-200',
    dot: 'bg-cyan-600',
    activeBg: 'bg-cyan-700 text-white border-cyan-700',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    pillClass: 'bg-cyan-50 text-cyan-800 border-cyan-300 hover:bg-cyan-100',
    subtleClass: 'text-cyan-700',
  },
  {
    bg: 'bg-violet-50',
    text: 'text-violet-900',
    border: 'border-violet-200',
    dot: 'bg-violet-600',
    activeBg: 'bg-violet-700 text-white border-violet-700',
    badgeClass: 'bg-violet-50 text-violet-800 border-violet-200',
    pillClass: 'bg-violet-50 text-violet-800 border-violet-300 hover:bg-violet-100',
    subtleClass: 'text-violet-700',
  },
  {
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-200',
    dot: 'bg-orange-600',
    activeBg: 'bg-orange-700 text-white border-orange-700',
    badgeClass: 'bg-orange-50 text-orange-900 border-orange-200',
    pillClass: 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100',
    subtleClass: 'text-orange-700',
  },
  {
    bg: 'bg-lime-50',
    text: 'text-lime-900',
    border: 'border-lime-200',
    dot: 'bg-lime-600',
    activeBg: 'bg-lime-700 text-white border-lime-700',
    badgeClass: 'bg-lime-50 text-lime-800 border-lime-200',
    pillClass: 'bg-lime-50 text-lime-800 border-lime-300 hover:bg-lime-100',
    subtleClass: 'text-lime-700',
  },
];

/**
 * Returns a consistent and distinct color palette theme for any category name.
 */
export function getCategoryColor(category?: string): CategoryColorTheme {
  if (!category || !category.trim()) {
    return PRESET_PALETTES['egyéb'];
  }

  const clean = category.trim().toLowerCase();

  // Exact match
  if (PRESET_PALETTES[clean]) {
    return PRESET_PALETTES[clean];
  }

  // Partial match
  for (const [key, palette] of Object.entries(PRESET_PALETTES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return palette;
    }
  }

  // Hash-based deterministic color assignment
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_PALETTES.length;
  return DYNAMIC_PALETTES[index];
}

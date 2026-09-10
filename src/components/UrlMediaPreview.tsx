import React, { useState, useMemo, useEffect } from 'react';
import { NOTE_HYPERLINKS_MAP, resolveNoteUrl, getNotePageCount } from '../data/noteHyperlinksMap';
import {
  FileText,
  ExternalLink,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Layers,
  Globe,
  Image as ImageIcon,
  FolderOpen,
  ArrowUpRight,
} from 'lucide-react';

export interface UrlMediaPreviewProps {
  url?: string;
  noteId?: string;
  termekId?: string;
  pageCount?: number;
  title?: string;
  className?: string;
  compact?: boolean;
}

/**
 * Checks if a string is merely a textual placeholder rather than a valid URL
 */
export function isPlaceholderUrl(val?: string): boolean {
  if (!val) return true;
  const lower = val.trim().toLowerCase();
  return (
    lower === 'pdf' ||
    lower === 'url' ||
    lower === 'link' ||
    lower === 'kép' ||
    lower === 'kep' ||
    lower === 'vázlatos kép' ||
    lower === 'vazlatos kep' ||
    lower === 'felhelyezés' ||
    lower === 'felhelyezes' ||
    lower === 'egyedi név választása' ||
    lower === 'egyedi nev valasztasa' ||
    lower === 'pontozott rajz' ||
    lower === 'eredeti rajz' ||
    (!lower.startsWith('http') && !lower.startsWith('//') && !lower.includes('/') && !lower.includes('.'))
  );
}

/**
 * Normalizes a URL: trims whitespace, strips quotes/formulas, adds https:// if missing,
 * or resolves using noteId / termekId mapping if the URL was exported as a plain placeholder like "PDF".
 */
export function normalizeUrl(rawUrl?: string, noteId?: string, termekId?: string): string {
  // If noteId or termekId is known and rawUrl is missing or a placeholder, resolve from pre-indexed map
  if (!rawUrl || isPlaceholderUrl(rawUrl)) {
    const resolved = resolveNoteUrl(noteId, rawUrl, termekId);
    if (resolved) return resolved;
  }

  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // If wrapped in formula e.g. =HYPERLINK("https://...", "...")
  const hyperlinkMatch = url.match(/=HYPERLINK\(\s*["']([^"']+)["']/i);
  if (hyperlinkMatch) {
    url = hyperlinkMatch[1].trim();
  }

  // Strip surrounding quotes, angle brackets, or spaces
  url = url.replace(/^["'<\s]+|["'>\s]+$/g, '').trim();

  if (!url) return '';

  // If it's still a placeholder (e.g. "PDF", "pdf", "URL")
  if (isPlaceholderUrl(url)) {
    const resolved = resolveNoteUrl(noteId, url, termekId);
    if (resolved) return resolved;
    return ''; // Do not turn "PDF" into https://pdf
  }

  // Check if it's a standalone Google Drive file or folder ID (25+ characters)
  if (/^[a-zA-Z0-9_-]{25,50}$/.test(url)) {
    return `https://drive.google.com/file/d/${url}/view?usp=sharing`;
  }

  // Handle schemeless URLs like //example.com
  if (url.startsWith('//')) {
    return 'https:' + url;
  }

  // Add https:// if missing protocol and not data: URI
  if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
    if (url.includes('.') || url.includes('/')) {
      return 'https://' + url;
    }
    return '';
  }

  return url;
}

/**
 * Extracts Google Drive file ID if url matches drive.google.com
 */
export function extractGoogleDriveId(rawUrl: string, noteId?: string): string | null {
  if (!rawUrl && !noteId) return null;
  const url = normalizeUrl(rawUrl, noteId);
  if (!url) return null;
  // Don't extract file ID from folder URLs
  if (url.toLowerCase().includes('/folders/')) return null;

  const match =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts Google Drive folder ID
 */
export function extractGoogleDriveFolderId(rawUrl: string, noteId?: string): string | null {
  if (!rawUrl && !noteId) return null;
  const url = normalizeUrl(rawUrl, noteId);
  if (!url) return null;
  const match =
    url.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
    url.match(/folderId=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Checks if a URL is a Google Drive folder
 */
export function isGoogleDriveFolder(rawUrl: string, noteId?: string): boolean {
  const url = normalizeUrl(rawUrl, noteId);
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('/drive/folders') ||
    lower.includes('/folders/') ||
    lower.includes('folderid=')
  );
}

/**
 * Checks if a URL is likely a PDF
 */
export function isPdfUrl(rawUrl: string, noteId?: string): boolean {
  const url = normalizeUrl(rawUrl, noteId);
  if (!url) return false;
  if (isGoogleDriveFolder(url)) return false;

  const lower = url.toLowerCase();
  if (lower.includes('.pdf') || lower.includes('/pdf') || lower.includes('application/pdf')) {
    return true;
  }
  // Drive preview / view for files often points to PDFs or docs
  if (lower.includes('drive.google.com/file/d/') || lower.includes('drive.google.com/open?id=')) {
    return true;
  }
  return false;
}

/**
 * Checks if a URL is an image
 */
export function isImageUrl(rawUrl: string, noteId?: string): boolean {
  const url = normalizeUrl(rawUrl, noteId);
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.gif') ||
    lower.startsWith('data:image/') ||
    lower.includes('lh3.googleusercontent.com')
  );
}

/**
 * Returns the best external URL for opening directly in a new browser tab
 */
export function getExternalOpenUrl(rawUrl: string, noteId?: string): string {
  const norm = normalizeUrl(rawUrl, noteId);
  if (!norm) return '';
  const driveId = extractGoogleDriveId(norm);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
  }
  const folderId = extractGoogleDriveFolderId(norm);
  if (folderId) {
    return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  }
  return norm;
}

/**
 * Guaranteed external link opener for browsers and iframe sandboxes
 */
export function openExternalUrl(url: string, e?: React.SyntheticEvent, noteId?: string) {
  if (e) {
    e.stopPropagation();
  }
  const target = getExternalOpenUrl(url, noteId);
  if (!target || isPlaceholderUrl(target) || target === 'https://pdf' || target === 'https://url') return;

  try {
    // Creating an anchor and triggering click is the most compliant method across browsers and sandboxes
    const a = document.createElement('a');
    a.href = target;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {
        // ignore
      }
    }, 300);
  } catch {
    try {
      window.open(target, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Failed to open external link:', err);
    }
  }
}

export const UrlMediaPreview: React.FC<UrlMediaPreviewProps> = ({
  url: rawUrl,
  noteId,
  termekId,
  pageCount: propPageCount,
  title = 'Melléklet',
  className = '',
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const cleanUrl = normalizeUrl(rawUrl, noteId, termekId);
  const [imageError, setImageError] = useState(false);

  // Dynamic & accurate page count calculation:
  // If 1-page, totalPages is 1. If 4-page, totalPages is 4, etc.
  const [detectedPageCount, setDetectedPageCount] = useState<number>(() => {
    if (propPageCount && propPageCount > 0) return propPageCount;
    return getNotePageCount(noteId, cleanUrl);
  });

  useEffect(() => {
    if (propPageCount && propPageCount > 0) {
      setDetectedPageCount(propPageCount);
    } else {
      setDetectedPageCount(getNotePageCount(noteId, cleanUrl));
    }
  }, [propPageCount, noteId, cleanUrl]);

  const totalPages = Math.max(1, detectedPageCount || 1);

  // If cleanUrl is empty but rawUrl is a placeholder (e.g. "PDF"):
  if (!cleanUrl) {
    if (rawUrl && isPlaceholderUrl(rawUrl)) {
      return (
        <div className={`p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 ${className}`}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Csatolt dokumentum: {rawUrl}</strong> (A Google Táblázatban a cellához nincs közvetlen webes link társítva)
            </span>
          </div>
        </div>
      );
    }
    return null;
  }

  const isPdf = isPdfUrl(cleanUrl);
  const isImage = !isPdf && isImageUrl(cleanUrl);
  const isFolder = isGoogleDriveFolder(cleanUrl);
  const driveId = extractGoogleDriveId(cleanUrl);
  const externalOpenUrl = getExternalOpenUrl(cleanUrl);

  // Resolved sources for thumbnail & preview
  const driveThumbnailUrl = driveId
    ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w800`
    : null;

  const driveEmbedUrl = driveId
    ? `https://drive.google.com/file/d/${driveId}/preview`
    : null;

  // Google Docs viewer as universal fallback for public PDFs
  const docsViewerUrl =
    isPdf && !driveId
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`
      : null;

  const activePdfEmbedSrc = useMemo(() => {
    if (driveEmbedUrl) return driveEmbedUrl;
    if (docsViewerUrl) return docsViewerUrl;
    return `${cleanUrl}#page=${currentPage}`;
  }, [driveEmbedUrl, docsViewerUrl, cleanUrl, currentPage]);

  return (
    <div className={`url-media-preview ${className}`}>
      {/* 1. PDF PREVIEW - WITH MULTI-PAGE MINIATURES & RELIABLE OPEN */}
      {isPdf && (
        <div className="rounded-xl border-2 border-rose-300/80 bg-rose-50/50 p-3.5 space-y-3 shadow-2xs">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-rose-950 truncate block">
                  PDF Dokumentum {title ? `• ${title}` : ''}
                </span>
                <span className="text-[10px] text-stone-500 font-mono truncate block max-w-xs sm:max-w-md">
                  {externalOpenUrl}
                </span>
              </div>
            </div>

            {/* Action Buttons: Prominent PDF Megnyitása */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                <Layers className="w-3 h-3" />
                {totalPages > 1 ? `${totalPages} oldal` : '1 oldal'}
              </span>

              {/* PRIMARY OPEN BUTTON */}
              <a
                href={externalOpenUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => openExternalUrl(externalOpenUrl, e)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer hover:shadow-sm"
                title="PDF megnyitása új lapon"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>PDF Megnyitása</span>
              </a>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/60 text-xs font-semibold transition-colors cursor-pointer"
                title="Beágyazott előnézet megtekintése"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Előnézet</span>
              </button>
            </div>
          </div>

          {/* Miniature Multi-Page Thumbnails Grid: 1 thumbnail if 1 page, 4 if 4 pages, etc. */}
          <div className="flex items-start gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <div
                key={page}
                className="group relative flex flex-col items-center shrink-0 w-24 sm:w-28 rounded-lg overflow-hidden border border-rose-200 hover:border-rose-400 bg-white transition-all shadow-2xs hover:shadow-xs"
              >
                {/* Miniature Page Canvas / Thumbnail */}
                <div
                  onClick={() => openExternalUrl(`${externalOpenUrl}#page=${page}`)}
                  className="w-full aspect-[3/4] bg-stone-100 relative overflow-hidden flex flex-col items-center justify-center border-b border-rose-100 cursor-pointer"
                  title={`${page}. oldal megnyitása a PDF-ben`}
                >
                  {page === 1 && driveThumbnailUrl ? (
                    <img
                      src={driveThumbnailUrl}
                      alt={`${page}. oldal`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full p-2.5 flex flex-col justify-between text-stone-400 bg-white group-hover:bg-rose-50/30 transition-colors">
                      <div className="flex items-center justify-between border-b border-rose-100 pb-1">
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {page}. oldal
                        </span>
                        <span className="text-[9px] font-mono text-stone-400">{page} / {totalPages}</span>
                      </div>
                      <div className="space-y-1.5 py-1">
                        <div className="w-full h-1 bg-stone-200 rounded-xs" />
                        <div className="w-5/6 h-1 bg-stone-200 rounded-xs" />
                        <div className="w-full h-1 bg-stone-100 rounded-xs" />
                        <div className="w-4/6 h-1 bg-stone-200 rounded-xs" />
                        <div className="w-3/4 h-1 bg-stone-100 rounded-xs" />
                      </div>
                      <div className="flex items-center justify-between text-rose-500 pt-1 border-t border-stone-100">
                        <FileText className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
                        <span className="text-[9px] text-stone-500 font-medium">{page}. oldal</span>
                      </div>
                    </div>
                  )}

                  {/* Hover action overlay with direct open */}
                  <div className="absolute inset-0 bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white p-1 text-center">
                    <ExternalLink className="w-4 h-4 drop-shadow-md" />
                    <span className="text-[9px] font-bold drop-shadow-sm leading-tight">
                      {page}. oldal
                    </span>
                  </div>
                </div>

                {/* Page Label with Quick external link */}
                <div className="w-full py-1 px-1.5 flex items-center justify-between bg-rose-50 text-[10px] font-bold text-rose-900">
                  <span>{page}. oldal</span>
                  <a
                    href={`${externalOpenUrl}#page=${page}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternalUrl(`${externalOpenUrl}#page=${page}`, e)}
                    className="text-rose-600 hover:text-rose-900 cursor-pointer p-0.5"
                    title={`${page}. oldal megnyitása külső lapon`}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}

            {/* Quick action button to directly open external PDF */}
            <a
              href={externalOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => openExternalUrl(externalOpenUrl, e)}
              className="flex flex-col items-center justify-center shrink-0 w-24 sm:w-28 aspect-[3/4] rounded-lg border-2 border-dashed border-rose-300 hover:border-rose-600 bg-white hover:bg-rose-100/50 transition-all text-rose-700 p-2 text-center cursor-pointer shadow-2xs group"
              title="A teljes PDF dokumentum megnyitása új lapon"
            >
              <ExternalLink className="w-6 h-6 mb-1.5 text-rose-600 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] font-bold leading-tight">PDF Megnyitása</span>
              <span className="text-[9px] text-rose-500 mt-0.5">
                {totalPages > 1 ? `${totalPages} oldal` : '1 oldal'}
              </span>
            </a>
          </div>
        </div>
      )}

      {/* 2. IMAGE PREVIEW */}
      {isImage && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#006067] flex items-center gap-1.5 truncate">
              <ImageIcon className="w-3.5 h-3.5" />
              Kép Csatolmány {title ? `• ${title}` : ''}
            </span>
            <a
              href={externalOpenUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => openExternalUrl(externalOpenUrl, e)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Kép megnyitása külső lapon"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Megnyitás</span>
            </a>
          </div>

          <div
            onClick={() => openExternalUrl(externalOpenUrl)}
            className="group relative rounded-lg overflow-hidden border border-stone-200 bg-white max-h-48 flex items-center justify-center cursor-pointer"
            title="Kép megnyitása"
          >
            {!imageError ? (
              <img
                src={cleanUrl}
                alt={title || 'Csatolt kép'}
                className="max-h-48 w-auto object-contain group-hover:scale-105 transition-transform"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="p-6 text-center text-stone-400">
                <ImageIcon className="w-8 h-8 mx-auto mb-1 text-stone-300" />
                <span className="text-xs">Kép megnyitása új lapon</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
              <ExternalLink className="w-4 h-4" />
              <span>Megnyitás új lapon</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. GOOGLE DRIVE FOLDER PREVIEW */}
      {isFolder && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-amber-950 truncate block">
                Google Drive Mappa {title ? `• ${title}` : ''}
              </span>
              <span className="text-[11px] font-mono text-stone-500 truncate block max-w-xs sm:max-w-md">
                {externalOpenUrl}
              </span>
            </div>
          </div>
          <a
            href={externalOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternalUrl(externalOpenUrl, e)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs cursor-pointer"
          >
            <span>Mappa Megnyitása</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* 4. GENERAL WEB LINK */}
      {!isPdf && !isImage && !isFolder && (
        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-stone-900 truncate">
                {title || 'Web Hivatkozás'}
              </p>
              <p className="text-[11px] font-mono text-stone-500 truncate max-w-xs sm:max-w-md">
                {externalOpenUrl}
              </p>
            </div>
          </div>
          <a
            href={externalOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternalUrl(externalOpenUrl, e)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-semibold shrink-0 transition-colors shadow-xs cursor-pointer"
          >
            <span>Megnyitás</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* FULL-SIZE INTERACTIVE PREVIEW MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isPdf
                      ? 'bg-rose-100 text-rose-700'
                      : isImage
                      ? 'bg-teal-100 text-[#006067]'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {isPdf ? <FileText className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base truncate">
                    {title || (isPdf ? 'PDF Dokumentum Megtekintő' : 'Csatolt Kép')}
                  </h3>
                  <p className="text-[11px] font-mono text-stone-500 truncate max-w-md">
                    {externalOpenUrl}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={externalOpenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => openExternalUrl(externalOpenUrl, e)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
                  title="Megnyitás új lapon"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Megnyitás új lapon</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                  title="Bezárás"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Prominent notification / direct opener bar for PDF */}
            {isPdf && (
              <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-rose-950 font-medium">
                  <FileText className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>A PDF külső linkként azonnal megtekinthető a böngészőben:</span>
                </div>
                <a
                  href={externalOpenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => openExternalUrl(externalOpenUrl, e)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-md shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>PDF megnyitása külső lapon</span>
                </a>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden relative flex flex-col min-h-[450px]">
              {isPdf ? (
                <div className="flex-1 flex flex-col h-full">
                  {/* Top multi-page pagination controls (only if multi-page) */}
                  {totalPages > 1 && (
                    <div className="px-4 py-2 border-b border-stone-200 bg-stone-100/80 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-700">Oldal választás:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`px-2.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
                                currentPage === p
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-white text-stone-700 hover:bg-stone-200 border border-stone-300'
                              }`}
                            >
                              {p}. oldal
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`${externalOpenUrl}#page=${currentPage}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => openExternalUrl(`${externalOpenUrl}#page=${currentPage}`, e)}
                          className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 font-bold hover:underline"
                        >
                          <span>{currentPage}. oldal külső megnyitása</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* PDF Viewer Frame */}
                  <div className="flex-1 w-full h-[60vh] bg-stone-900 relative">
                    <iframe
                      src={activePdfEmbedSrc}
                      title="PDF előnézet"
                      className="w-full h-full border-none"
                      allow="autoplay"
                    />
                  </div>

                  {/* Bottom helper info */}
                  <div className="bg-stone-800 text-stone-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-stone-700">
                    <span className="truncate max-w-md font-mono text-[11px] text-stone-400">
                      {externalOpenUrl}
                    </span>
                    <a
                      href={externalOpenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => openExternalUrl(externalOpenUrl, e)}
                      className="inline-flex items-center gap-1 text-white hover:text-rose-300 font-bold cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ha nem töltődik be: Kattintson a megnyitáshoz</span>
                    </a>
                  </div>
                </div>
              ) : isImage ? (
                <div className="flex-1 p-4 flex items-center justify-center bg-stone-900/90 overflow-auto">
                  <img
                    src={cleanUrl}
                    alt={title}
                    className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="p-12 text-center space-y-4">
                  <Globe className="w-12 h-12 mx-auto text-stone-400" />
                  <p className="text-sm font-semibold text-stone-800">Külső webes hivatkozás</p>
                  <a
                    href={externalOpenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternalUrl(externalOpenUrl, e)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#006067] text-white font-semibold text-xs shadow-md cursor-pointer"
                  >
                    <span>Megnyitás a böngészőben</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

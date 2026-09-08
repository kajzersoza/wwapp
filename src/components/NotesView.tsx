import React, { useState, useMemo } from 'react';
import { useProducts } from '../context/ProductContext';
import { ProductNote } from '../types';
import { TermekIdLink } from './TermekIdLink';
import { UrlMediaPreview } from './UrlMediaPreview';
import {
  FileText,
  Plus,
  Search,
  Download,
  Upload,
  Calendar,
  UserCheck,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  Boxes,
  Tag,
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  Layers,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';

interface NotesViewProps {
  onOpenSyncModal?: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({ onOpenSyncModal }) => {
  const {
    notes,
    products,
    addNote,
    updateNote,
    deleteNote,
    getNextNoteId,
    selectProductById,
    setActiveTab,
    exportNotesCsv,
    importNotesCsvText,
    isSyncing,
    syncWithGoogleSheet,
  } = useProducts();

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [hasMediaFilter, setHasMediaFilter] = useState<'all' | 'url_only' | 'image_only' | 'pdf_only'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ProductNote | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    termekId: '',
    nev: '',
    leiras: '',
    image: '',
    documents: '',
    date: new Date().toISOString().split('T')[0],
    url: '',
    nevValasztas: '',
  });

  // Unique list of authors for filter
  const uniqueAuthors = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.nevValasztas && n.nevValasztas.trim()) {
        set.add(n.nevValasztas.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'hu'));
  }, [notes]);

  // Product lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, (typeof products)[0]>();
    products.forEach((p) => {
      map.set(p.id.toLowerCase().trim(), p);
    });
    return map;
  }, [products]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTermekId = (n.termekId || '').toLowerCase().includes(q);
        const matchNev = (n.nev || '').toLowerCase().includes(q);
        const matchLeiras = (n.leiras || '').toLowerCase().includes(q);
        const matchNevVal = (n.nevValasztas || '').toLowerCase().includes(q);
        const matchDocs = (n.documents || '').toLowerCase().includes(q);
        const prod = productMap.get((n.termekId || '').toLowerCase().trim());
        const matchProdName = prod?.name?.toLowerCase().includes(q);

        if (!matchTermekId && !matchNev && !matchLeiras && !matchNevVal && !matchDocs && !matchProdName) {
          return false;
        }
      }

      // Author filter
      if (authorFilter !== 'all') {
        if ((n.nevValasztas || '').trim() !== authorFilter) {
          return false;
        }
      }

      // Media filter
      if (hasMediaFilter === 'url_only') {
        if (!n.url || !n.url.trim()) return false;
      } else if (hasMediaFilter === 'image_only') {
        if (!n.image || !n.image.trim()) return false;
      } else if (hasMediaFilter === 'pdf_only') {
        const u = (n.url || '').toLowerCase();
        if (!u.includes('.pdf') && !u.includes('/pdf') && !u.includes('drive.google.com')) return false;
      }

      return true;
    });
  }, [notes, searchQuery, authorFilter, hasMediaFilter, productMap]);

  // Open modal for new note
  const handleOpenNewModal = (prefillProductId?: string) => {
    setEditingNote(null);
    setFormData({
      termekId: prefillProductId || '',
      nev: '',
      leiras: '',
      image: '',
      documents: '',
      date: new Date().toISOString().split('T')[0],
      url: '',
      nevValasztas: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (note: ProductNote) => {
    setEditingNote(note);
    setFormData({
      termekId: note.termekId || '',
      nev: note.nev || '',
      leiras: note.leiras || '',
      image: note.image || '',
      documents: note.documents || '',
      date: note.date || new Date().toISOString().split('T')[0],
      url: note.url || '',
      nevValasztas: note.nevValasztas || '',
    });
    setIsModalOpen(true);
  };

  // Save note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.termekId.trim()) {
      setNotification({ type: 'error', message: 'A Termék ID megadása kötelező!' });
      return;
    }

    try {
      if (editingNote) {
        await updateNote(editingNote.id, {
          termekId: formData.termekId.trim(),
          nev: formData.nev.trim(),
          leiras: formData.leiras.trim(),
          image: formData.image.trim(),
          documents: formData.documents.trim(),
          date: formData.date.trim(),
          url: formData.url.trim(),
          nevValasztas: formData.nevValasztas.trim(),
        });
        setNotification({ type: 'success', message: 'Jegyzet sikeresen frissítve!' });
      } else {
        await addNote({
          id: getNextNoteId(),
          termekId: formData.termekId.trim(),
          nev: formData.nev.trim(),
          leiras: formData.leiras.trim(),
          image: formData.image.trim(),
          documents: formData.documents.trim(),
          date: formData.date.trim(),
          url: formData.url.trim(),
          nevValasztas: formData.nevValasztas.trim(),
        });
        setNotification({ type: 'success', message: 'Új jegyzet sikeresen hozzáadva!' });
      }
      setIsModalOpen(false);
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Hiba mentéskor: ${err.message || err}` });
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Biztosan törölni szeretné ezt a jegyzetet?')) return;
    try {
      await deleteNote(id);
      setNotification({ type: 'success', message: 'Jegyzet törölve!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification({ type: 'error', message: `Hiba törléskor: ${err.message || err}` });
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const csvContent = exportNotesCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `notes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const count = importNotesCsvText(text);
        setNotification({
          type: 'success',
          message: `${count} jegyzet sikeresen importálva!`,
        });
        setTimeout(() => setNotification(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shadow-3xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
                  Notesz
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  {notes.length} bejegyzés
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Termékekhez csatolt jegyzetek, dokumentációk, képek és többoldalas PDF előnézetek
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="notes-add-new-btn"
              onClick={() => handleOpenNewModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006067] hover:bg-[#004b50] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Új Jegyzet</span>
            </button>

            <button
              type="button"
              id="notes-export-csv-btn"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-bold transition-all shadow-3xs cursor-pointer"
              title="Notesz exportálása CSV fájlba"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Export CSV</span>
            </button>

            <label
              htmlFor="notes-csv-input"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-xs font-bold transition-all shadow-3xs cursor-pointer"
              title="Notesz importálása CSV fájlból"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>Import CSV</span>
              <input
                id="notes-csv-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleImportCsv}
                className="hidden"
              />
            </label>

            {onOpenSyncModal && (
              <button
                type="button"
                id="notes-sync-sheets-btn"
                onClick={onOpenSyncModal}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-3xs cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification.message}</span>
          </div>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="notes-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés Termék ID, Név, Leírás vagy Szerző szerint..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] bg-stone-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Author Selector */}
          <div>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] bg-white text-stone-700"
            >
              <option value="all">Minden szerző (Név választás)</option>
              {uniqueAuthors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>

          {/* Media Filter */}
          <div>
            <select
              value={hasMediaFilter}
              onChange={(e) => setHasMediaFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] bg-white text-stone-700"
            >
              <option value="all">Minden típus</option>
              <option value="url_only">Csak URL / Csatolmány</option>
              <option value="pdf_only">Csak PDF / Drive</option>
              <option value="image_only">Csak Kép csatolmánnyal</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Count */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-100">
          <span>
            Találatok száma: <strong className="text-stone-800 font-bold">{filteredNotes.length}</strong> / {notes.length}
          </span>
          {(searchQuery || authorFilter !== 'all' || hasMediaFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setAuthorFilter('all');
                setHasMediaFilter('all');
              }}
              className="text-[#006067] hover:underline font-bold cursor-pointer"
            >
              Szűrők törlése
            </button>
          )}
        </div>
      </div>

      {/* Notes Grid / List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-800">Nem található jegyzet</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            A megadott szűrési feltételeknek nem felelt meg egyetlen jegyzet sem, vagy még nem lettek bejegyzések rögzítve.
          </p>
          <button
            type="button"
            onClick={() => handleOpenNewModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#006067] hover:bg-[#004b50] text-white text-xs font-bold transition-all shadow-xs cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Új Jegyzet létrehozása</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map((note) => {
            const prod = productMap.get((note.termekId || '').toLowerCase().trim());
            return (
              <div
                key={note.id}
                id={`note-card-${note.id}`}
                className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3.5 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Termék ID badge + Date + Author + Actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TermekIdLink
                        id={note.termekId}
                        className="font-mono text-xs font-bold text-[#006067] bg-[#E0E9E8] hover:bg-[#006067] hover:text-white px-2.5 py-1 rounded-md transition-colors"
                      />
                      {prod?.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                          {prod.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(note)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                        title="Jegyzet szerkesztése"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Jegyzet törlése"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Note Title & Associated Product Name */}
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 leading-snug">
                      {note.nev || 'Névtelen bejegyzés'}
                    </h3>
                    {prod?.name && (
                      <p className="text-xs text-stone-500 font-medium line-clamp-1 mt-0.5">
                        {prod.name}
                      </p>
                    )}
                  </div>

                  {/* Metadata Row: Date & Author */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-stone-600">
                    {note.date && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-stone-700 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        <span>{note.date}</span>
                      </span>
                    )}
                    {note.nevValasztas && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[11px]">
                        <UserCheck className="w-3 h-3 text-indigo-600" />
                        <span>{note.nevValasztas}</span>
                      </span>
                    )}
                  </div>

                  {/* Leírás */}
                  {note.leiras && (
                    <p className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed bg-stone-50/70 p-3 rounded-xl border border-stone-150">
                      {note.leiras}
                    </p>
                  )}

                  {/* URL Media Preview (Miniature Thumbnail / Multi-page PDF thumbnails) */}
                  {(note.url || note.id) && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        <span>URL Előnézet</span>
                      </div>
                      <UrlMediaPreview
                        url={note.url}
                        noteId={note.id}
                        pageCount={note.pageCount}
                        title={note.nev || 'Csatolmány'}
                      />
                    </div>
                  )}

                  {/* Additional Image if distinct from URL */}
                  {note.image && note.image !== note.url && (
                    <div className="pt-1">
                      <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        <span>Kép</span>
                      </div>
                      <UrlMediaPreview
                        url={note.image}
                        title={note.nev ? `${note.nev} - Kép` : 'Kép'}
                      />
                    </div>
                  )}

                  {/* Documents field */}
                  {note.documents && (
                    <div className="flex items-center flex-wrap gap-1.5 text-xs text-stone-600 pt-1">
                      <Paperclip className="w-3.5 h-3.5 text-stone-400" />
                      <span className="font-medium text-stone-400">Dokumentum:</span>
                      {note.documents.startsWith('http') || note.documents.includes('drive.google.com') ? (
                        <a
                          href={note.documents}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono bg-stone-100 px-2 py-0.5 rounded text-rose-700 hover:text-rose-900 hover:underline text-[11px] font-bold"
                        >
                          <span>{note.documents}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-800 text-[11px] font-bold">
                          {note.documents}
                        </span>
                      )}
                    </div>
                  )}

                  {/* If note.documents is a URL and note.url is empty, render media preview */}
                  {!note.url && note.documents && (note.documents.startsWith('http') || note.documents.includes('drive.google.com')) && (
                    <div className="pt-1">
                      <UrlMediaPreview
                        url={note.documents}
                        noteId={note.id}
                        pageCount={note.pageCount}
                        title={note.nev || 'Dokumentum'}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Bar with Quick Link to Product Details */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      selectProductById(note.termekId);
                      setActiveTab('detail');
                    }}
                    className="inline-flex items-center gap-1 text-[#006067] hover:text-[#004b50] font-bold cursor-pointer"
                  >
                    <span>Termék adatlap megnyitása</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  {editingNote ? 'Jegyzet Szerkesztése' : 'Új Jegyzet Hozzáadása'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-5 space-y-3.5 text-xs">
              {/* Termék ID */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Termék ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.termekId}
                  onChange={(e) => setFormData({ ...formData, termekId: e.target.value })}
                  placeholder="pl. 1018898 vagy SARU-01"
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] font-mono"
                />
                {formData.termekId && productMap.has(formData.termekId.toLowerCase().trim()) && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    ✓ Kapcsolódó termék: {productMap.get(formData.termekId.toLowerCase().trim())?.name}
                  </p>
                )}
              </div>

              {/* Név */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Jegyzet Neve (Név)
                </label>
                <input
                  type="text"
                  value={formData.nev}
                  onChange={(e) => setFormData({ ...formData, nev: e.target.value })}
                  placeholder="pl. Préselési műszaki utasítás, Saru adatlap"
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                />
              </div>

              {/* Leírás */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Leírás
                </label>
                <textarea
                  rows={3}
                  value={formData.leiras}
                  onChange={(e) => setFormData({ ...formData, leiras: e.target.value })}
                  placeholder="Megjegyzések, instrukciók, karbantartási vagy beállítási részletek..."
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] leading-relaxed"
                />
              </div>

              {/* URL (Előnézethez: kép, PDF, weboldal) */}
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  URL (Kép vagy többoldalas PDF link előnézettel)
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/... vagy https://.../dokumentum.pdf"
                  className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Támogatja a Google Drive PDF linkeket, direkt PDF és kép fájlokat. Többoldalas PDF-eknél lapozható miniatűr jelenik meg!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Image */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Image (Kép link / útvonal)
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="Kép URL vagy fájlnév"
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] text-[11px]"
                  />
                </div>

                {/* Documents */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Documents (Dokumentum azonosító)
                  </label>
                  <input
                    type="text"
                    value={formData.documents}
                    onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
                    placeholder="pl. DOC-2024-01"
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067] text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Dátum (Date)
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                </div>

                {/* Név választás */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Név választás (Felelős / Szerző)
                  </label>
                  <input
                    type="text"
                    list="authors-datalist"
                    value={formData.nevValasztas}
                    onChange={(e) => setFormData({ ...formData, nevValasztas: e.target.value })}
                    placeholder="pl. Kovács János"
                    className="w-full p-2.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#006067]"
                  />
                  <datalist id="authors-datalist">
                    {uniqueAuthors.map((auth) => (
                      <option key={auth} value={auth} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#006067] hover:bg-[#004b50] text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  {editingNote ? 'Frissítés mentése' : 'Jegyzet hozzáadása'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

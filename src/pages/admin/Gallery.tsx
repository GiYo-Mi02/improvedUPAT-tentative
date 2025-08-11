import React, { useEffect, useMemo, useRef, useState } from 'react';
import { galleryAPI } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

type GalleryItem = {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

const AdminGallery: React.FC = () => {
  useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await galleryAPI.adminList();
        const list: GalleryItem[] = res.data.items;
        if (mounted) setItems(list);
      } catch (e: any) {
        showToast(e?.response?.data?.message || 'Failed to load gallery', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [showToast]);

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (!/image\/(png|jpe?g|webp)/.test(file.type)) {
      showToast('Only PNG, JPG, or WEBP images are allowed', 'warning');
      return;
    }
    const form = new FormData();
    form.append('image', file);
    form.append('title', file.name.replace(/\.[^.]+$/, ''));
    form.append('description', '');
    form.append('sortOrder', String(items.length));
    setUploading(true);
    try {
      const res = await galleryAPI.create(form);
      const item: GalleryItem = res.data.item;
      setItems(prev => [...prev, item]);
      showToast('Image uploaded', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleActive = async (idx: number) => {
    const item = items[idx];
    const next = { ...item, isActive: !item.isActive };
    setItems(prev => prev.map((it, i) => i === idx ? next : it));
    try {
      await galleryAPI.update(item.id, { isActive: next.isActive });
    } catch (e) {
      // revert
      setItems(prev => prev.map((it, i) => i === idx ? item : it));
      showToast('Failed to update status', 'error');
    }
  };

  const removeItem = async (idx: number) => {
    const item = items[idx];
    const confirmDelete = window.confirm('Delete this image? This cannot be undone.');
    if (!confirmDelete) return;
    const backup = items;
    setItems(prev => prev.filter((_, i) => i !== idx));
    try {
      await galleryAPI.remove(item.id);
      showToast('Deleted', 'success');
    } catch (e) {
      setItems(backup);
      showToast('Failed to delete', 'error');
    }
  };

  // Drag & drop reordering (mouse-only minimal impl to avoid extra deps)
  const onDragStart = (index: number) => setDragIndex(index);
  const onDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIndex) return;
    setItems(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(overIndex, 0, moved);
      return copy.map((it, i) => ({ ...it, sortOrder: i }));
    });
    setDragIndex(overIndex);
  };
  const onDragEnd = async () => {
    setDragIndex(null);
    // Persist new order sequentially (small lists okay)
    try {
      await Promise.all(items.map(it => galleryAPI.update(it.id, { sortOrder: it.sortOrder })));
      showToast('Order saved', 'success');
    } catch (e) {
      showToast('Failed to save order', 'error');
    }
  };

  const grid = useMemo(() => items, [items]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-luxury-gold">Gallery</h1>
          <p className="text-sm text-luxury-champagne/80">Showcase event moments. Drag to reorder, click to preview, toggle visibility.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload Image'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-luxury-champagne">Loading…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {grid.map((item, idx) => (
            <div
              key={item.id}
              className="group relative card-luxury overflow-hidden cursor-move"
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDragEnd={onDragEnd}
            >
              <img
                src={/^https?:/i.test(item.imagePath) ? item.imagePath : `${(import.meta as any).env.VITE_API_URL?.replace(/\/api$/i,'') || 'http://localhost:3001' }${item.imagePath.startsWith('/') ? item.imagePath : '/' + item.imagePath}`}
                alt={item.title}
                className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                onClick={() => setSelected(item)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between text-xs">
                <span className="truncate text-white/90">{item.title || 'Untitled'}</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 text-white/80">
                    <input type="checkbox" checked={item.isActive} onChange={() => toggleActive(idx)} />
                    <span>Active</span>
                  </label>
                  <button
                    className="text-luxury-gold hover:text-yellow-300"
                    onClick={() => { setEditing(item); setEditTitle(item.title || ''); setEditDesc(item.description || ''); }}
                  >
                    Edit
                  </button>
                  <button className="text-red-400 hover:text-red-300" onClick={() => removeItem(idx)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
          {grid.length === 0 && (
            <div className="col-span-full text-center text-luxury-champagne/70">No images yet. Upload to get started.</div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-luxury-night rounded-xl max-w-3xl w-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold text-luxury-gold">{selected.title || 'Untitled'}</h2>
                {selected.description && (
                  <p className="text-sm text-luxury-champagne/80 mt-1">{selected.description}</p>
                )}
              </div>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
      <img src={/^https?:/i.test(selected.imagePath) ? selected.imagePath : `${(import.meta as any).env.VITE_API_URL?.replace(/\/api$/i,'') || 'http://localhost:3001' }${selected.imagePath.startsWith('/') ? selected.imagePath : '/' + selected.imagePath}`}
        alt={selected.title}
        className="w-full max-h-[70vh] object-contain rounded" />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => !saving && setEditing(null)}>
          <div className="bg-luxury-night rounded-xl max-w-lg w-full p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold text-luxury-gold">Edit Gallery Item</h2>
              <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Close</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-luxury-champagne mb-1">Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-luxury w-full"
                  maxLength={255}
                  placeholder="Enter title"
                />
                <div className="text-right text-xs text-luxury-champagne/70 mt-1">{editTitle.length}/255</div>
              </div>
              <div>
                <label className="block text-sm text-luxury-champagne mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="input-luxury w-full h-32 resize-y"
                  maxLength={5000}
                  placeholder="Optional description"
                />
                <div className="text-right text-xs text-luxury-champagne/70 mt-1">{editDesc.length}/5000</div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button className="btn-secondary" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
                <button
                  className="btn-primary"
                  disabled={saving || !editTitle.trim()}
                  onClick={async () => {
                    if (!editing) return;
                    if (!editTitle.trim()) { showToast('Title is required', 'warning'); return; }
                    setSaving(true);
                    try {
                      await galleryAPI.update(editing.id, { title: editTitle.trim(), description: editDesc });
                      setItems(prev => prev.map(it => it.id === editing.id ? { ...it, title: editTitle.trim(), description: editDesc } : it));
                      showToast('Saved', 'success');
                      setEditing(null);
                    } catch (e) {
                      showToast('Failed to save changes', 'error');
                    } finally { setSaving(false); }
                  }}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGallery;

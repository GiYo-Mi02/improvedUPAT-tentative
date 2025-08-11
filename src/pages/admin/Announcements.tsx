import React, { useState } from 'react';
import { useAdminAnnouncements } from '../../hooks/useAnnouncements';
import api from '../../services/api';
import { Plus, Trash2, Edit3, Save, X } from 'lucide-react';

const AdminAnnouncements: React.FC = () => {
  const { items, loading, error, remove } = useAdminAnnouncements();
  const [draft, setDraft] = useState({ title: '', message: '', isActive: true, priority: 0, startsAt: '', endsAt: '' });
  const [draftImage, setDraftImage] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetDraft = () => { setDraft({ title: '', message: '', isActive: true, priority: 0, startsAt: '', endsAt: '' }); setDraftImage(null); };

  const onCreate = async () => {
    const fd = new FormData();
    fd.append('title', draft.title);
    fd.append('message', draft.message);
    fd.append('isActive', String(draft.isActive));
    fd.append('priority', String(draft.priority));
    if (draft.startsAt) fd.append('startsAt', draft.startsAt);
    if (draft.endsAt) fd.append('endsAt', draft.endsAt);
    if (draftImage) fd.append('image', draftImage);
    await api.post('/announcements/admin', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    // reload list
    (await import('../../hooks/useAnnouncements'));
    window.location.reload();
  };

  const onUpdate = async (id: string, fields: any) => {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    if ((fields as any)._image instanceof File) {
      fd.append('image', (fields as any)._image);
    }
    await api.put(`/announcements/admin/${id}`, fd);
    setEditingId(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="heading-primary">Announcements</h1>
        </div>

        {/* Create */}
  <div className="card-luxury p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Title</label>
              <input className="input-luxury w-full" value={draft.title} onChange={e => setDraft(v => ({ ...v, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Priority (0-100)</label>
              <input type="number" min={0} max={100} className="input-luxury w-full" value={draft.priority} onChange={e => setDraft(v => ({ ...v, priority: Number(e.target.value) }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400">Message</label>
              <textarea className="input-luxury w-full min-h-28" value={draft.message} onChange={e => setDraft(v => ({ ...v, message: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Starts At</label>
              <input type="datetime-local" className="input-luxury w-full" value={draft.startsAt} onChange={e => setDraft(v => ({ ...v, startsAt: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Ends At</label>
              <input type="datetime-local" className="input-luxury w-full" value={draft.endsAt} onChange={e => setDraft(v => ({ ...v, endsAt: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400">Active</label>
              <input type="checkbox" checked={draft.isActive} onChange={e => setDraft(v => ({ ...v, isActive: e.target.checked }))} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400">Image (optional)</label>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setDraftImage(e.target.files?.[0] || null)} className="input-luxury w-full" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary inline-flex items-center gap-2" onClick={onCreate}><Plus className="w-4 h-4" /> Create</button>
            <button className="btn-secondary" onClick={resetDraft}>Reset</button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading && <div className="text-gray-400">Loading…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!loading && items.map((a) => (
            <div key={a.id} className="card-luxury p-4">
              {editingId === a.id ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="input-luxury" defaultValue={a.title} onChange={(e) => (a as any)._title = e.target.value} />
                  <input type="number" min={0} max={100} className="input-luxury" defaultValue={a.priority} onChange={(e) => (a as any)._priority = Number(e.target.value)} />
                  <textarea className="input-luxury md:col-span-2" defaultValue={a.message} onChange={(e) => (a as any)._message = e.target.value} />
                  <input type="datetime-local" className="input-luxury" defaultValue={a.startsAt ? new Date(a.startsAt).toISOString().slice(0,16) : ''} onChange={(e) => (a as any)._startsAt = e.target.value} />
                  <input type="datetime-local" className="input-luxury" defaultValue={a.endsAt ? new Date(a.endsAt).toISOString().slice(0,16) : ''} onChange={(e) => (a as any)._endsAt = e.target.value} />
                  <div className="flex items-center gap-2"><label className="text-xs text-gray-400">Active</label><input type="checkbox" defaultChecked={a.isActive} onChange={(e) => (a as any)._isActive = e.target.checked} /></div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-400">Replace Image</label>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => (a as any)._image = (e.target.files?.[0] || null)} className="input-luxury w-full" />
                  </div>
                  <div className="flex gap-3 md:col-span-2">
                    <button className="btn-primary inline-flex items-center gap-2" onClick={() => onUpdate(a.id, {
                      title: (a as any)._title ?? a.title,
                      message: (a as any)._message ?? a.message,
                      priority: (a as any)._priority ?? a.priority,
                      startsAt: (a as any)._startsAt || null,
                      endsAt: (a as any)._endsAt || null,
                      isActive: (a as any)._isActive ?? a.isActive,
                      _image: (a as any)._image,
                    })}><Save className="w-4 h-4" /> Save</button>
                    <button className="btn-secondary inline-flex items-center gap-2" onClick={() => setEditingId(null)}><X className="w-4 h-4" /> Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">{a.title}</div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">{a.message}</div>
                    { (a as any).imagePath && (
                      <div className="mt-2">
                        <img src={`${(import.meta as any).env.VITE_API_URL?.replace(/\/api$/i,'') || 'http://localhost:3001'}${((a as any).imagePath as string).startsWith('/') ? (a as any).imagePath : '/' + (a as any).imagePath}`} alt={a.title} className="w-full max-w-sm rounded-lg border border-white/10" />
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">Priority {a.priority}{a.startsAt ? ` • From ${new Date(a.startsAt).toLocaleString()}` : ''}{a.endsAt ? ` • Until ${new Date(a.endsAt).toLocaleString()}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary inline-flex items-center gap-2" onClick={() => setEditingId(a.id)}><Edit3 className="w-4 h-4" /> Edit</button>
                    <button className="btn-secondary inline-flex items-center gap-2" onClick={() => remove(a.id)}><Trash2 className="w-4 h-4" /> Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;

import React, { useState, useEffect } from 'react';
import { useAdminEvents } from '../../hooks/useAdminEvents';
import { useToast } from '../../contexts/ToastContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE.replace(/\/api$/i,'');

const AdminEvents: React.FC = () => {
  const { items, loading, error, filters, setFilter, setPage, totalPages, create, update, remove, saving, deletingId, publish } = ((): any => {
    const hook: any = useAdminEvents();
    return { ...hook, totalPages: hook.totalPages };
  })();
  const { showToast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: '', eventDate: '', type: 'theater', category: 'performance', maxSeats: 1196, vipCount: 0 });
  const [editing, setEditing] = useState<any | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<any | null>(null);
  const [publishForm, setPublishForm] = useState<{ description: string; endDate: string; posterFile: File | null }>({ description: '', endDate: '', posterFile: null });
  const [editPosterFile, setEditPosterFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [extendedForm, setExtendedForm] = useState<{ description: string; endDate: string } | null>(null);

  useEffect(() => { if (editPosterFile) { const url = URL.createObjectURL(editPosterFile); setEditPreview(url); return () => URL.revokeObjectURL(url); } else setEditPreview(null); }, [editPosterFile]);

  const openEdit = (ev: any) => {
  setEditing(ev); setFormOpen(true); setForm({ title: ev.title, eventDate: ev.eventDate?.slice(0,16), type: ev.type, category: ev.category, maxSeats: ev.maxSeats, vipCount: ev.metadata?.vipCount || 0 }); setExtendedForm({ description: ev.description || '', endDate: ev.endDate ? ev.endDate.slice(0,16) : '' }); setEditPosterFile(null);
  };

  const submit = async () => {
    try {
      if (editing) {
        const fd = new FormData();
        if (form.title) fd.append('title', form.title);
        if (form.eventDate) fd.append('eventDate', form.eventDate);
        fd.append('type', form.type); fd.append('category', form.category);
  if (form.maxSeats) fd.append('maxSeats', String(form.maxSeats));
  fd.append('vipCount', String(form.vipCount ?? 0));
        // allow triggering seat regeneration when maxSeats changes
        fd.append('regenerateSeats', 'true');
        fd.append('force', 'true');
        if (extendedForm?.description) fd.append('description', extendedForm.description);
        if (extendedForm?.endDate) fd.append('endDate', extendedForm.endDate);
        if (editPosterFile) fd.append('posterImage', editPosterFile);
        await fetch(`${API_BASE}/admin/events/${editing.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }, body: fd });
        await update(editing.id, {}); showToast('Event updated','success');
      } else {
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.eventDate) fd.append('eventDate', form.eventDate);
        fd.append('type', form.type); fd.append('category', form.category);
  if (form.maxSeats) fd.append('maxSeats', String(form.maxSeats));
  fd.append('vipCount', String(form.vipCount ?? 0));
        if (extendedForm?.description) fd.append('description', extendedForm.description);
        if (extendedForm?.endDate) fd.append('endDate', extendedForm.endDate);
        if (editPosterFile) fd.append('posterImage', editPosterFile);
        await create(fd);
        showToast('Event created','success');
      }
      setFormOpen(false); setEditing(null); setForm({ title: '', eventDate: '', type: 'theater', category: 'performance', maxSeats: 100 }); setExtendedForm(null); setEditPosterFile(null); setEditPreview(null);
    } catch (e: any) { showToast(e.message || 'Save failed','error'); }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="heading-primary">Admin Events</h1>
          <div className="flex gap-3">
            <select value={filters.status || 'all'} onChange={(e) => setFilter({ status: e.target.value === 'all' ? undefined : e.target.value })} className="input-luxury w-36">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <input
              placeholder="Search" className="input-luxury w-48" onChange={(e) => setFilter({ search: e.target.value || undefined })}
            />
            <button className="btn-primary text-sm" onClick={() => { setFormOpen(true); setEditing(null); }}>New Event</button>
          </div>
        </div>
        {loading && <div className="text-gray-400">Loading events...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs uppercase text-gray-400 border-b border-gray-700/60">
              <tr>
                <th className="py-3 pr-4">Title</th>
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Category</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Seats</th>
                <th className="py-3 pr-4" />
              </tr>
            </thead>
            <tbody>
              {items.map((ev: any) => (
                <tr key={ev.id} className="border-b border-gray-800/60">
                  <td className="py-3 pr-4 font-medium text-white">{ev.title}</td>
                  <td className="py-3 pr-4">{new Date(ev.eventDate).toLocaleDateString()}</td>
                  <td className="py-3 pr-4 capitalize">{ev.type}</td>
                  <td className="py-3 pr-4 capitalize">{ev.category}</td>
                  <td className="py-3 pr-4 capitalize">{ev.status}</td>
                  <td className="py-3 pr-4">{ev.statistics?.availableSeats ?? '-'} avail</td>
                  <td className="py-3 pr-4 flex gap-2">
                    <button className="btn-secondary text-xs px-3 py-1" onClick={() => openEdit(ev)}>Edit</button>
                    {ev.status === 'draft' && <button className="btn-secondary text-xs px-3 py-1" onClick={() => { setPublishTarget(ev); setPublishForm({ description: ev.description || '', endDate: ev.endDate ? ev.endDate.slice(0,16) : '', posterFile: null }); setPublishOpen(true); }}>Publish</button>}
                    <button className="btn-secondary text-xs px-3 py-1" disabled={deletingId === ev.id} onClick={() => remove(ev.id)}>{deletingId === ev.id ? '...' : 'Delete'}</button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-gray-400">No events</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-3">
            <button className="btn-secondary text-xs px-3 py-2 disabled:opacity-30" disabled={filters.page === 1} onClick={() => setPage(Math.max(1, (filters.page || 1) - 1))}>Prev</button>
            <div className="text-gray-300 text-xs flex items-center">Page {filters.page} / {totalPages}</div>
            <button className="btn-secondary text-xs px-3 py-2 disabled:opacity-30" disabled={filters.page === totalPages} onClick={() => setPage(Math.min(totalPages, (filters.page || 1) + 1))}>Next</button>
          </div>
        )}

        {formOpen && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="card-luxury p-6 w-full max-w-2xl relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => { setFormOpen(false); setEditing(null); }}>✕</button>
              <h3 className="heading-tertiary mb-4">{editing ? 'Edit Event' : 'New Event'}</h3>
              <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">Title</label>
                    <input className="input-luxury w-full" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Date/Time</label>
                      <input type="datetime-local" className="input-luxury w-full" value={form.eventDate} onChange={e => setForm((f: any) => ({ ...f, eventDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">End Date/Time</label>
                      <input type="datetime-local" className="input-luxury w-full" value={extendedForm?.endDate || ''} onChange={e => setExtendedForm(f => ({ ...(f || { description: '', endDate: '' }), endDate: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Type</label>
                      <select className="input-luxury w-full" value={form.type} onChange={e => setForm((f: any) => ({ ...f, type: e.target.value }))}>
                        <option value="seminar">Seminar</option>
                        <option value="workshop">Workshop</option>
                        <option value="theater">Theater</option>
                        <option value="competition">Competition</option>
                        <option value="performance">Performance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Category</label>
                      <select className="input-luxury w-full" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                        <option value="academic">Academic</option>
                        <option value="performance">Performance</option>
                        <option value="competition">Competition</option>
                        <option value="cultural">Cultural</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">Max Seats</label>
                      <input type="number" className="input-luxury w-full" value={form.maxSeats} onChange={e => setForm((f: any) => ({ ...f, maxSeats: Number(e.target.value) }))} />
                    </div>
                    <div>
                      <label className="block text-xs mb-1 text-gray-400">VIP Seats</label>
                      <input type="number" min={0} className="input-luxury w-full" value={form.vipCount ?? 0} onChange={e => setForm((f: any) => ({ ...f, vipCount: Math.max(0, Number(e.target.value)) }))} />
                      <p className="text-[10px] text-gray-500 mt-1">Non-VIP fixed totals: Orchestra 468, Lower 422, Upper 214, Lodges 92. Max seats = totals + VIP.</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1 text-gray-400">Description</label>
                    <textarea className="input-luxury w-full h-32" value={extendedForm?.description || ''} onChange={e => setExtendedForm(f => ({ ...(f || { description: '', endDate: '' }), description: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs mb-1 text-gray-400">Poster</label>
                  <div className="aspect-[3/4] w-full rounded-md border border-luxury-gold/20 overflow-hidden bg-luxury-night flex items-center justify-center text-[10px] text-gray-500">
                    {editPreview ? <img src={editPreview} className="w-full h-full object-cover" /> : (editing?.posterImage ? <img src={/^https?:/i.test(editing.posterImage) ? editing.posterImage : `${SERVER_BASE}${editing.posterImage}`} className="w-full h-full object-cover" /> : 'No Poster')}
                  </div>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setEditPosterFile(e.target.files?.[0] || null)} className="text-xs text-gray-300" />
                  {editPosterFile && <div className="text-[10px] text-gray-400">{editPosterFile.name}</div>}
                  <p className="text-[10px] text-gray-500 leading-relaxed">JPEG/PNG/WebP up to 2MB. Replaces existing poster on save.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button className="btn-secondary px-4 py-2" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</button>
                <button className="btn-primary px-6 py-2 disabled:opacity-40" disabled={saving} onClick={submit}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        {publishOpen && publishTarget && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="card-luxury p-6 w-full max-w-lg relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => { setPublishOpen(false); setPublishTarget(null); }}>✕</button>
              <h3 className="heading-tertiary mb-4">Publish Event</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Description (min 10 chars)</label>
                  <textarea className="input-luxury w-full h-32" value={publishForm.description} onChange={e => setPublishForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">End Date/Time (optional)</label>
                  <input type="datetime-local" className="input-luxury w-full" value={publishForm.endDate} onChange={e => setPublishForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Poster Image (JPEG/PNG/WebP, max 2MB)</label>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setPublishForm(f => ({ ...f, posterFile: e.target.files?.[0] || null }))} className="text-xs text-gray-300" />
                  {publishForm.posterFile && <div className="text-xs text-gray-400 mt-1">{publishForm.posterFile.name}</div>}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button className="btn-secondary px-4 py-2" onClick={() => { setPublishOpen(false); setPublishTarget(null); }}>Cancel</button>
                  <button className="btn-primary px-6 py-2 disabled:opacity-40" disabled={saving || publishForm.description.trim().length < 10} onClick={async () => { await publish(publishTarget.id, publishForm); setPublishOpen(false); setPublishTarget(null); }}> {saving ? 'Publishing...' : 'Publish'} </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEvents;

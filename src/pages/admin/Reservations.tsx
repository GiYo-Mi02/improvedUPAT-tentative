import React, { useState } from 'react';
import { useAdminReservations } from '../../hooks/useAdminReservations';
import { adminBulkApproveReservations, adminMandatoryInvite } from '../../services/modules/adminService';
import { useToast } from '../../contexts/ToastContext';

const Reservations: React.FC = () => {
  const { items, loading, error, page, totalPages, setPage, setStatus, status, setEventId, approve, reject } = useAdminReservations();
  const { showToast } = useToast();
  const [bulkEventId, setBulkEventId] = useState<string>('');
  const [bulkLimit, setBulkLimit] = useState<number>(500);
  const [busy, setBusy] = useState<boolean>(false);
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);
  const [invite, setInvite] = useState<{ eventId: string; emails: string; message: string; sendTickets: boolean; limit: number }>({ eventId: '', emails: '', message: '', sendTickets: false, limit: 1000 });

  const badge = (s: string) => {
    const base = 'px-2 py-0.5 rounded text-xs font-medium';
    switch (s) {
      case 'pending': return base + ' bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'confirmed': return base + ' bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'cancelled': return base + ' bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'used': return base + ' bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      default: return base + ' bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="heading-primary">Reservations</h1>
          <div className="flex flex-wrap gap-3 items-center">
            <select value={status || 'all'} onChange={e => setStatus(e.target.value === 'all' ? undefined : e.target.value)} className="input-luxury w-40">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="used">Used</option>
            </select>
            <input placeholder="Filter by Event ID" className="input-luxury w-48" onChange={e => setEventId(e.target.value || undefined)} />
            <div className="flex items-center gap-2">
              <input placeholder="Bulk Event ID" value={bulkEventId} onChange={e => setBulkEventId(e.target.value)} className="input-luxury w-48" />
              <input type="number" min={1} max={2000} value={bulkLimit} onChange={e => setBulkLimit(Math.max(1, Math.min(2000, Number(e.target.value))))} className="input-luxury w-24" />
        <button className="btn-primary text-xs px-3 py-2 disabled:opacity-50" disabled={!bulkEventId || busy} onClick={async () => {
                try {
                  setBusy(true);
                  const r = await adminBulkApproveReservations(bulkEventId, bulkLimit);
                  showToast(r.message || 'Bulk approved','success');
          // if filtering by event, keep in sync
          setEventId(bulkEventId);
                } catch (e: any) {
                  showToast(e.message || 'Bulk approve failed','error');
                } finally {
                  setBusy(false);
                }
              }}>Bulk Approve Pending</button>
              <button className="btn-secondary text-xs px-3 py-2" onClick={() => { setInviteOpen(true); setInvite(i => ({ ...i, eventId: bulkEventId || i.eventId })); }}>Mandatory Invite</button>
            </div>
          </div>
        </div>

        {loading && <div className="text-gray-400">Loading reservations...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}

        <div className="overflow-x-auto rounded-lg border border-luxury-gold/10 shadow-lg shadow-black/40 bg-luxury-night/40 backdrop-blur">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-400/80 bg-luxury-night/60">
              <tr>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-700/50 hover:bg-luxury-deep/30 transition">
                  <td className="py-3 px-4 font-medium text-white">{r.event.title}</td>
                  <td className="py-3 px-4 text-white">{r.user.name}<div className="text-xs text-gray-400">{r.user.email}</div></td>
                  <td className="py-3 px-4 text-white">{r.seat.section.toUpperCase()} {r.seat.row}{r.seat.number}</td>
                  <td className="py-3 px-4"><span className={badge(r.status)}>{r.status}</span></td>
                  <td className="py-3 px-4 whitespace-nowrap text-white">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    {r.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => approve(r.id)} className="btn-primary px-3 py-1 text-xs">Approve</button>
                        <button onClick={() => reject(r.id)} className="btn-secondary px-3 py-1 text-xs">Reject</button>
                      </div>
                    ) : <div className="text-right text-gray-500 text-xs">—</div>}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-gray-400">No reservations</td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-3 pt-4">
            <button className="btn-secondary text-xs px-3 py-2 disabled:opacity-30" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
            <div className="text-gray-300 text-xs flex items-center">Page {page} / {totalPages}</div>
            <button className="btn-secondary text-xs px-3 py-2 disabled:opacity-30" disabled={page === totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))}>Next</button>
          </div>
        )}

        {inviteOpen && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="card-luxury p-6 w-full max-w-2xl relative">
              <button className="absolute top-2 right-2 text-gray-400 hover:text-white" onClick={() => setInviteOpen(false)}>✕</button>
              <h3 className="heading-tertiary mb-4">Mandatory Event Invite</h3>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Event ID</label>
                  <input className="input-luxury w-full" value={invite.eventId} onChange={e => setInvite(i => ({ ...i, eventId: e.target.value }))} placeholder="Event ID" />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Limit</label>
                  <input type="number" min={1} max={2000} className="input-luxury w-full" value={invite.limit} onChange={e => setInvite(i => ({ ...i, limit: Math.max(1, Math.min(2000, Number(e.target.value))) }))} />
                  <p className="text-[10px] text-gray-500 mt-1">If emails are empty, first N active students will be invited.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs mb-1 text-gray-400">Emails (comma or newline separated)</label>
                  <textarea className="input-luxury w-full h-32" value={invite.emails} onChange={e => setInvite(i => ({ ...i, emails: e.target.value }))} placeholder="jane@upat.edu, john@upat.edu\n..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs mb-1 text-gray-400">Message (optional)</label>
                  <textarea className="input-luxury w-full h-24" value={invite.message} onChange={e => setInvite(i => ({ ...i, message: e.target.value }))} placeholder={`You are required to attend ...`} />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input id="sendTickets" type="checkbox" checked={invite.sendTickets} onChange={e => setInvite(i => ({ ...i, sendTickets: e.target.checked }))} />
                  <label htmlFor="sendTickets" className="text-sm text-gray-300">Also issue tickets automatically</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button className="btn-secondary px-4 py-2" onClick={() => setInviteOpen(false)}>Cancel</button>
                <button className="btn-primary px-6 py-2 disabled:opacity-40" disabled={!invite.eventId || busy} onClick={async () => {
                  try {
                    setBusy(true);
                    const emails = invite.emails.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
                    const r = await adminMandatoryInvite(invite.eventId, { emails, message: invite.message, sendTickets: invite.sendTickets, limit: invite.limit });
                    showToast(r.message || 'Invites sent','success');
                    setInviteOpen(false);
                  } catch (e: any) {
                    showToast(e.message || 'Invite failed','error');
                  } finally {
                    setBusy(false);
                  }
                }}>Send</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reservations;

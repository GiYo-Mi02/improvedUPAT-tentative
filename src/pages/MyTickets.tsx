import React, { useState } from 'react';
import { useReservations } from '../hooks/useReservations';
import { useToast } from '../contexts/ToastContext';

const MyTickets: React.FC = () => {
  const { items, loading, error, page, totalPages, setPage, status, setStatus, cancel, getQR, resend } = useReservations();
  const { showToast } = useToast();
  const [qrView, setQrView] = useState<{ id: string; qr: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setActionLoading(id);
    try {
      await cancel(id);
      showToast('Reservation cancelled', 'success');
    } catch (e: any) {
      showToast(e.message || 'Cancel failed', 'error');
    } finally { setActionLoading(null); }
  };

  const handleQR = async (id: string) => {
    setActionLoading(id);
    try {
      const data = await getQR(id);
      setQrView({ id, qr: data.qrCode });
    } catch (e: any) {
      showToast(e.message || 'QR fetch failed', 'error');
    } finally { setActionLoading(null); }
  };

  const handleResend = async (id: string) => {
    setActionLoading(id);
    try { await resend(id); showToast('Email sent', 'success'); } catch (e: any) { showToast(e.message || 'Email failed', 'error'); } finally { setActionLoading(null); }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="heading-primary">My Tickets</h1>
          <select
            value={status || 'all'}
            onChange={(e) => setStatus(e.target.value === 'all' ? 'all' : e.target.value)}
            className="input-luxury w-40"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="used">Used</option>
          </select>
        </div>

        {loading && <div className="text-gray-400">Loading reservations...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}
        {!loading && items.length === 0 && <div className="text-gray-400">No reservations found.</div>}

        <div className="space-y-4">
          {items.map((r: any) => (
            <div key={r.id} className="card-luxury p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 justify-between">
              <div className="flex-1 space-y-1 text-sm text-gray-300">
                <div className="text-white font-medium">{r.event.title}</div>
                <div>{new Date(r.event.eventDate).toLocaleString()} • {r.event.venue}</div>
                <div>Seat: {r.seat.section.toUpperCase()} {r.seat.row}{r.seat.number} {r.seat.isVip && <span className="text-luxury-gold">(VIP)</span>}</div>
                <div>Status: <span className="capitalize">{r.status}</span></div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {r.status !== 'cancelled' && r.status !== 'used' && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    disabled={actionLoading === r.id}
                    className="btn-secondary text-xs px-3 py-2"
                  >{actionLoading === r.id ? '...' : 'Cancel'}</button>
                )}
                {r.qrCode && (
                  <button
                    onClick={() => handleQR(r.id)}
                    disabled={actionLoading === r.id}
                    className="btn-secondary text-xs px-3 py-2"
                  >{actionLoading === r.id ? '...' : 'View QR'}</button>
                )}
                {r.status !== 'cancelled' && (
                  <button
                    onClick={() => handleResend(r.id)}
                    disabled={actionLoading === r.id}
                    className="btn-secondary text-xs px-3 py-2"
                  >{actionLoading === r.id ? '...' : 'Resend Email'}</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-10 gap-3">
            <button
              className="btn-secondary px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >Prev</button>
            <div className="text-gray-300 text-sm flex items-center">Page {page} / {totalPages}</div>
            <button
              className="btn-secondary px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >Next</button>
          </div>
        )}

        {qrView && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="card-luxury p-6 w-full max-w-sm relative">
              <button
                onClick={() => setQrView(null)}
                className="absolute top-2 right-2 text-gray-400 hover:text-white"
                aria-label="Close"
              >✕</button>
              <h3 className="heading-tertiary mb-4">Ticket QR</h3>
              <img src={qrView.qr} alt="QR" className="w-full h-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;

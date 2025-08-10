import React, { useMemo, useState } from 'react';
import { CalendarDays, MapPin, QrCode, Mail, Ban, Eye } from 'lucide-react';
import { useReservations } from '../hooks/useReservations';
import { useToast } from '../contexts/ToastContext';
import Reveal from '../components/ui/Reveal';

const MyTickets: React.FC = () => {
  const { items, loading, error, page, totalPages, setPage, status, setStatus, cancel, getQR, resend } = useReservations();
  const { showToast } = useToast();
  const [qrView, setQrView] = useState<{ id: string; qr: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const SERVER_BASE = useMemo(() => API_BASE.replace(/\/api$/i, ''), [API_BASE]);

  const resolvePoster = (ev: any) => {
    const rel = ev?.posterImage;
    const url = ev?.posterImageUrl;
    if (url) return url;
    if (!rel) return null;
    if (/^https?:/i.test(rel)) return rel;
    return `${SERVER_BASE}${rel.startsWith('/') ? rel : '/' + rel}`;
  };

  const badgeForStatus = (s: string) => {
    const base = 'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide';
    switch (s) {
      case 'confirmed':
        return `${base} bg-green-600/20 text-green-400 border border-green-600/40`;
      case 'pending':
        return `${base} bg-yellow-600/20 text-yellow-300 border border-yellow-600/40`;
      case 'cancelled':
        return `${base} bg-red-600/20 text-red-300 border border-red-600/40`;
      case 'used':
        return `${base} bg-gray-600/30 text-gray-300 border border-gray-600/50`;
      default:
        return `${base} bg-gray-600/30 text-gray-300 border border-gray-600/50`;
    }
  };

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

        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-luxury p-5 animate-pulse">
                <div className="h-32 rounded-md bg-white/5 mb-4" />
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-white/10 rounded w-2/3" />
              </div>
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="card-luxury p-5 text-red-300">{error}</div>
        )}
        {!loading && items.length === 0 && (
          <div className="card-luxury p-8 text-center text-gray-400">No reservations found.</div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r: any, i: number) => {
            const imgSrc = resolvePoster(r.event);
            const seat = `${String(r.seat.section || '').toUpperCase()} ${r.seat.row || ''}${r.seat.number || ''}`;
            const dateStr = new Date(r.event.eventDate).toLocaleString();
            return (
              <Reveal key={r.id} variant="up" delay={i * 60}>
                <div className="card-luxury p-5 h-full flex flex-col">
                  {/* Poster */}
                  {imgSrc ? (
                    <div className="relative h-40 mb-4 -mt-2 -mx-2 overflow-hidden rounded-md border border-luxury-gold/10">
                      <img src={imgSrc} alt={r.event.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-1 left-2 text-[10px] tracking-wide bg-black/50 px-2 py-0.5 rounded text-luxury-champagne">{new Date(r.event.eventDate).toLocaleDateString()}</span>
                    </div>
                  ) : (
                    <div className="h-40 mb-4 -mt-2 -mx-2 rounded-md bg-gradient-to-br from-luxury-deep/60 to-luxury-night/60 flex items-center justify-center text-[11px] text-gray-500 border border-luxury-gold/10">No Poster</div>
                  )}

                  {/* Title and status */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="heading-tertiary line-clamp-2 pr-2" title={r.event.title}>{r.event.title}</h3>
                    <span className={badgeForStatus(r.status)}>{r.status}</span>
                  </div>

                  {/* Meta */}
                  <div className="space-y-2 text-sm text-gray-300 mb-4">
                    <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-luxury-gold" /><span>{dateStr}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-luxury-gold" /><span>{r.event.venue}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-luxury-gold/15 border border-luxury-gold/40 text-luxury-gold text-[11px]">Seat: {seat} {r.seat.isVip && <span className="ml-1">(VIP)</span>}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <a href={`/events/${r.event.id}`} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1">
                      <Eye className="h-4 w-4" /> Details
                    </a>
                    {r.qrCode && (
                      <button onClick={() => handleQR(r.id)} disabled={actionLoading === r.id} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1">
                        <QrCode className="h-4 w-4" /> {actionLoading === r.id ? '...' : 'View QR'}
                      </button>
                    )}
                    {r.status !== 'cancelled' && (
                      <button onClick={() => handleResend(r.id)} disabled={actionLoading === r.id} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1">
                        <Mail className="h-4 w-4" /> {actionLoading === r.id ? '...' : 'Resend Email'}
                      </button>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'used' && (
                      <button onClick={() => handleCancel(r.id)} disabled={actionLoading === r.id} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1 ml-auto">
                        <Ban className="h-4 w-4" /> {actionLoading === r.id ? '...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
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

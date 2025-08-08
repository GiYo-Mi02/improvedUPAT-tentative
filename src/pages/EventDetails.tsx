import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEvent } from '../hooks/useEvent';
import SeatMap from '../components/events/SeatMap';
import { createReservation } from '../services/modules/reservationService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Helper to build absolute URL from relative path
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE.replace(/\/api$/i, '');
function resolvePoster(event: any): string | null {
  if (!event) return null;
  if (event.posterImageUrl) return event.posterImageUrl; // backend constructed absolute
  const rel = event.posterImage;
  if (!rel) return null;
  if (/^https?:/i.test(rel)) return rel;
  return `${SERVER_BASE}${rel.startsWith('/') ? rel : '/' + rel}`;
}

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { event, seats, loading, seatLoading, error, reloadSeats } = useEvent(id);
  const { state } = useAuth();
  const { showToast } = useToast();
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [booking, setBooking] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const handleSelect = (seat: any | null) => setSelectedSeat(seat);

  const reserve = useCallback(async () => {
    if (!id || !selectedSeat) return;
    setBooking(true);
    try {
      const res = await createReservation({
        eventId: id,
        seatId: selectedSeat.id,
        paymentMethod: event?.isPaid ? 'cash' : 'free',
      });
      setQr(res.qrCode);
      showToast('Reservation successful', 'success');
      reloadSeats();
    } catch (e: any) {
      showToast(e.message || 'Reservation failed', 'error');
    } finally { setBooking(false); }
  }, [id, selectedSeat, event, showToast, reloadSeats]);

  const posterSrc = resolvePoster(event);

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading && <div className="text-gray-400">Loading event...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}
        {!loading && event && (
          <div className="space-y-12">
            <header className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              <div className="lg:col-span-3 flex flex-col gap-6">
                <div>
                  <h1 className="heading-primary mb-3">{event.title}</h1>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-luxury-deep/50 border border-luxury-gold/20 px-2 py-1 rounded text-white">{event.type}</span>
                    <span className="bg-luxury-deep/50 border border-luxury-gold/20 px-2 py-1 rounded text-white">{event.category}</span>
                    <span className="bg-luxury-deep/50 border border-luxury-gold/20 px-2 py-1 rounded capitalize text-white">{event.status}</span>
                  </div>
                </div>
                {event.description && <p className="text-gray-300 leading-relaxed max-w-3xl text-sm">{event.description}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="card-luxury p-3 space-y-1">
                    <div className="text-gray-400">Date & Time</div>
                    <div className="text-white font-medium">{new Date(event.eventDate).toLocaleString()}</div>
                  </div>
                  <div className="card-luxury p-3 space-y-1">
                    <div className="text-gray-400">Venue</div>
                    <div className="text-white font-medium">{event.venue}</div>
                  </div>
                  <div className="card-luxury p-3 space-y-1">
                    <div className="text-gray-400">Organizer</div>
                    <div className="text-white font-medium">{event.organizer || 'CCIS'}</div>
                  </div>
                  <div className="card-luxury p-3 space-y-1">
                    <div className="text-gray-400">Available</div>
                    <div className="text-luxury-gold font-semibold">{event.statistics?.availableSeats ?? '—'}</div>
                  </div>
                  <div className="card-luxury p-3 space-y-1">
                    <div className="text-gray-400">Pricing</div>
                    <div className="text-white font-medium">{event.isPaid ? `Base ₱${event.basePrice}${event.vipPrice ? ` / VIP ₱${event.vipPrice}` : ''}` : 'Free'}</div>
                  </div>
                  {event.endDate && (
                    <div className="card-luxury p-3 space-y-1">
                      <div className="text-gray-400">Ends</div>
                      <div className="text-white font-medium">{new Date(event.endDate).toLocaleString()}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-xs pt-1">
                  <span className="px-2 py-1 rounded bg-gray-700/40 text-white">Max Seats: {event.maxSeats}</span>
                  <span className="px-2 py-1 rounded bg-gray-700/40 text-white">Paid: {event.isPaid ? 'Yes' : 'No'}</span>
                  {event.vipPrice > 0 && <span className="px-2 py-1 rounded bg-gray-700/40 text-white">VIP Available</span>}
                </div>
              </div>
              <div className="lg:col-span-2 flex flex-col gap-6">
                {posterSrc ? (
                  <div className="rounded-xl overflow-hidden shadow-xl shadow-black/50 ring-1 ring-luxury-gold/30 h-96 bg-luxury-night flex items-center justify-center">
                    <img
                      src={posterSrc}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-96 rounded-xl bg-gradient-to-br from-luxury-deep to-luxury-night flex items-center justify-center text-gray-500 text-sm border border-dashed border-luxury-gold/30">
                    No Poster
                  </div>
                )}
                {qr && (
                  <div className="card-luxury p-4 text-center">
                    <h3 className="heading-tertiary mb-2">Your Ticket QR</h3>
                    <img src={qr} alt="QR Code" className="w-40 h-40 mx-auto" />
                    <p className="text-[10px] text-gray-400 mt-2 break-all">Keep this QR for entry</p>
                  </div>
                )}
              </div>
            </header>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="heading-secondary">Seat Selection</h2>
                <div className="flex gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-white"><span className="w-3 h-3 rounded bg-green-500 inline-block text-white" /> Available</div>
                  <div className="flex items-center gap-1 text-white"><span className="w-3 h-3 rounded bg-yellow-500 inline-block text-white" /> Reserved</div>
                  <div className="flex items-center gap-1 text-white"><span className="w-3 h-3 rounded bg-red-500 inline-block text-white" /> Sold</div>
                  {event.vipPrice > 0 && <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> VIP</div>}
                </div>
              </div>
              {seatLoading && <div className="text-gray-400">Loading seats...</div>}
              <div className="rounded-xl border border-luxury-gold/10 p-4 bg-luxury-deep/30 backdrop-blur">
                <SeatMap seats={seats} onSelect={handleSelect} />
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="text-sm text-gray-300 min-w-[220px]">
                  {selectedSeat ? (
                    <>Selected: <span className="text-luxury-gold font-semibold">{selectedSeat.section.toUpperCase()} {selectedSeat.row}{selectedSeat.number}</span> – {selectedSeat.price ? `₱${selectedSeat.price}` : 'Free'} </>
                  ) : 'No seat selected'}
                </div>
                <button
                  disabled={!selectedSeat || booking || !state.isAuthenticated}
                  onClick={reserve}
                  className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {state.isAuthenticated ? (booking ? 'Reserving...' : 'Reserve Seat') : 'Login to Reserve'}
                </button>
                <button onClick={reloadSeats} className="btn-secondary text-xs px-3 py-2">Refresh Seats</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;

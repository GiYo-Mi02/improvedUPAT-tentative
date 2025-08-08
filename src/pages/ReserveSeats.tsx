import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEvent } from '../hooks/useEvent';
import SeatMap from '../components/events/SeatMap';
import { createReservation } from '../services/modules/reservationService';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

const ReserveSeats: React.FC = () => {
  const [params] = useSearchParams();
  const eventId = params.get('eventId') || '';
  const { event, seats, loading, seatLoading, error, reloadSeats } = useEvent(eventId);
  const { state } = useAuth();
  const { showToast } = useToast();
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [booking, setBooking] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  const reserve = useCallback(async () => {
    if (!eventId || !selectedSeat) return;
    setBooking(true);
    try {
      const res = await createReservation({ eventId, seatId: selectedSeat.id, paymentMethod: event?.isPaid ? 'cash' : 'free' });
      setQr(res.qrCode);
      showToast('Reservation successful','success');
      reloadSeats();
    } catch (e: any) { showToast(e.message || 'Reservation failed','error'); } finally { setBooking(false); }
  }, [eventId, selectedSeat, event, showToast, reloadSeats]);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="heading-primary mb-6">Reserve Seats</h1>
        {!eventId && <div className="text-red-400 mb-6">Missing eventId query parameter.</div>}
        {loading && <div className="text-gray-400">Loading event...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}
        {!loading && event && (
          <div className="space-y-8">
            <div className="card-luxury p-6 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="heading-secondary mb-1">{event.title}</h2>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div>Date: {new Date(event.eventDate).toLocaleString()}</div>
                    <div>Venue: {event.venue}</div>
                    <div>Type: {event.type} • {event.category}</div>
                  </div>
                </div>
                {qr && (
                  <div className="card-luxury p-3 w-52 text-center">
                    <div className="text-xs text-gray-400 mb-1">Ticket QR</div>
                    <img src={qr} alt="QR" className="w-full h-auto" />
                  </div>
                )}
              </div>
              {event.description && <p className="text-gray-400 text-sm mt-2">{event.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs pt-2">
                <span className="px-2 py-1 rounded bg-gray-700/60">Status: {event.status}</span>
                <span className="px-2 py-1 rounded bg-gray-700/60">Available: {event.statistics?.availableSeats}</span>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="heading-tertiary">Choose a Seat</h3>
              {seatLoading && <div className="text-gray-400">Loading seats...</div>}
              <SeatMap seats={seats} onSelect={(s) => setSelectedSeat(s)} />
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-300">
                  {selectedSeat ? (
                    <>Selected: <span className="text-luxury-gold font-semibold">{selectedSeat.section.toUpperCase()} {selectedSeat.row}{selectedSeat.number}</span> - {selectedSeat.price ? `₱${selectedSeat.price}` : 'Free'}</>
                  ) : 'No seat selected'}
                </div>
                <button disabled={!selectedSeat || booking || !state.isAuthenticated} onClick={reserve} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  {state.isAuthenticated ? (booking ? 'Reserving...' : 'Reserve Seat') : 'Login to Reserve'}
                </button>
                <button onClick={reloadSeats} className="btn-secondary text-xs px-3 py-2">Refresh Seats</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReserveSeats;

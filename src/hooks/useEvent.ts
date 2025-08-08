import { useEffect, useState, useCallback } from 'react';
import { fetchEvent, fetchEventSeats } from '../services/modules/eventService';

interface Seat {
  id: string;
  section: string;
  row: string;
  number: number;
  status: string;
  isVip: boolean;
  price: number;
  holdExpiry?: string | null;
}

export function useEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<any>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [seatLoading, setSeatLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await fetchEvent(eventId);
      setEvent(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load event');
    } finally { setLoading(false); }
  }, [eventId]);

  const loadSeats = useCallback(async () => {
    if (!eventId) return;
    setSeatLoading(true);
    try {
      const seatData = await fetchEventSeats(eventId);
      setSeats(seatData);
    } catch (e: any) {
      // swallow seat errors separately
    } finally { setSeatLoading(false); }
  }, [eventId]);

  useEffect(() => { loadEvent(); }, [loadEvent]);
  useEffect(() => { loadSeats(); }, [loadSeats]);

  return { event, seats, loading, seatLoading, error, reload: loadEvent, reloadSeats: loadSeats };
}

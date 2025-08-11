import { useCallback, useEffect, useState } from 'react';
import { adminGetEventAnalytics } from '../services/modules/adminService';

export interface EventAnalyticsItem {
  id: string;
  title: string;
  eventDate: string;
  venue: string;
  status: string;
  totalSeats: number;
  soldSeats: number;
  availableSeats: number;
  reservations: { total: number; pending: number; confirmed: number; cancelled: number };
  occupancy: number;
  confirmationRate: number;
  daysUntil: number;
}

export function useEventAnalytics(range: 'all' | 'upcoming' | 'past' = 'upcoming', limit = 20) {
  const [items, setItems] = useState<EventAnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { analytics } = await adminGetEventAnalytics({ range, limit });
      setItems(analytics as EventAnalyticsItem[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics');
    } finally { setLoading(false); }
  }, [range, limit]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}

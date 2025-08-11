import { useCallback, useEffect, useState } from 'react';
import { adminGetEventTrends } from '../services/modules/adminService';

export function useEventTrends(range: 'all' | 'upcoming' | 'past' = 'upcoming', rangeDays = 14, limit = 8) {
  const [labels, setLabels] = useState<string[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await adminGetEventTrends({ rangeDays, range, limit });
      setLabels(data.labels);
      setTrends(data.trends);
    } catch (e: any) {
      setError(e.message || 'Failed to load trends');
    } finally { setLoading(false); }
  }, [range, rangeDays, limit]);

  useEffect(() => { load(); }, [load]);

  return { labels, trends, loading, error, reload: load };
}

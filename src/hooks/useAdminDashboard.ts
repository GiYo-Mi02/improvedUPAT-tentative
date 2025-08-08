import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '../services/modules/adminService';

interface DashboardState {
  statistics: any | null;
  recentReservations: any[];
  upcomingEvents: any[];
  loading: boolean;
  error: string | null;
}

export function useAdminDashboard() {
  const [state, setState] = useState<DashboardState>({
    statistics: null,
    recentReservations: [],
    upcomingEvents: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getDashboard();
      setState((s) => ({
        ...s,
        statistics: data.statistics,
        recentReservations: data.recentReservations,
        upcomingEvents: data.upcomingEvents,
        loading: false,
      }));
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Failed to load dashboard' }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}

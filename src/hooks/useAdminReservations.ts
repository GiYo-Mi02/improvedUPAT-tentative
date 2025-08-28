import { useCallback, useEffect, useState } from 'react';
import { adminGetReservations, adminApproveReservation, adminRejectReservation } from '../services/modules/adminService';

interface State {
  items: any[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalReservations: number;
  status?: string;
  eventId?: string;
}

export function useAdminReservations() {
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    error: null,
    page: 1,
    totalPages: 1,
    totalReservations: 0,
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await adminGetReservations({ page: state.page, status: state.status, eventId: state.eventId });
      setState(s => ({ ...s, items: data.reservations, totalPages: data.totalPages, totalReservations: data.totalReservations, loading: false }));
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message || 'Failed to load reservations' }));
    }
  }, [state.page, state.status, state.eventId]);

  useEffect(() => { load(); }, [load]);

  const setPage = (page: number) => setState(s => ({ ...s, page }));
  const setStatus = (status?: string) => setState(s => ({ ...s, page: 1, status }));
  const setEventId = (eventId?: string) => setState(s => ({ ...s, page: 1, eventId }));
  const approve = async (id: string) => {
    const res = await adminApproveReservation(id);
    await load();
    return res;
  };
  const reject = async (id: string) => {
    await adminRejectReservation(id);
    await load();
  };

  return { ...state, setPage, setStatus, setEventId, reload: load, approve, reject };
}

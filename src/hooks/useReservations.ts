import { useCallback, useEffect, useState } from 'react';
import { fetchReservations, cancelReservation, fetchQR, resendEmail } from '../services/modules/reservationService';

interface ReservationListState {
  items: any[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalReservations: number;
  status?: string;
}

export function useReservations(initialStatus: string = 'all') {
  const [state, setState] = useState<ReservationListState>({
    items: [],
    loading: true,
    error: null,
    page: 1,
    totalPages: 1,
    totalReservations: 0,
    status: initialStatus,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchReservations({ page: state.page, status: state.status });
      setState((s) => ({
        ...s,
        items: data.reservations,
        totalPages: data.totalPages,
        totalReservations: data.totalReservations,
        loading: false,
      }));
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Failed to load reservations' }));
    }
  }, [state.page, state.status]);

  useEffect(() => { load(); }, [load]);

  const setPage = (page: number) => setState((s) => ({ ...s, page }));
  const setStatus = (status?: string) => setState((s) => ({ ...s, page: 1, status }));

  const cancel = async (id: string) => {
    await cancelReservation(id);
    await load();
  };

  const getQR = async (id: string) => fetchQR(id);
  const resend = async (id: string) => resendEmail(id);

  return { ...state, setPage, setStatus, reload: load, cancel, getQR, resend };
}

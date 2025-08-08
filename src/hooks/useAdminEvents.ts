import { useCallback, useEffect, useState } from 'react';
import { adminGetEvents, adminCreateEvent, adminUpdateEvent, adminDeleteEvent, adminPublishEvent } from '../services/modules/adminService';

export interface AdminEventFilters { page?: number; limit?: number; status?: string; type?: string; search?: string; }

interface State {
  items: any[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalEvents: number;
  filters: AdminEventFilters;
  saving: boolean;
  deletingId: string | null;
}

export function useAdminEvents(initial: AdminEventFilters = {}) {
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    error: null,
    page: 1,
    totalPages: 1,
    totalEvents: 0,
    filters: { page: 1, limit: 10, ...initial },
    saving: false,
    deletingId: null,
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await adminGetEvents({ ...state.filters, page: state.filters.page });
      setState(s => ({ ...s, items: data.events, totalPages: data.totalPages, totalEvents: data.totalEvents, loading: false }));
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message || 'Failed to load events' }));
    }
  }, [state.filters]);

  useEffect(() => { load(); }, [load]);

  const setPage = (page: number) => setState(s => ({ ...s, filters: { ...s.filters, page } }));
  const setFilter = (patch: Partial<AdminEventFilters>) => setState(s => ({ ...s, filters: { ...s.filters, ...patch, page: 1 } }));

  const create = async (payload: any) => {
    setState(s => ({ ...s, saving: true }));
    try { await adminCreateEvent(payload); await load(); } finally { setState(s => ({ ...s, saving: false })); }
  };

  const update = async (id: string, payload: any) => {
    setState(s => ({ ...s, saving: true }));
    try { await adminUpdateEvent(id, payload); await load(); } finally { setState(s => ({ ...s, saving: false })); }
  };

  const remove = async (id: string) => {
    setState(s => ({ ...s, deletingId: id }));
    try { await adminDeleteEvent(id); await load(); } finally { setState(s => ({ ...s, deletingId: null })); }
  };

  const publish = async (id: string, payload: { description?: string; endDate?: string; posterFile?: File | null }) => {
    const form = new FormData();
    if (payload.description) form.append('description', payload.description);
    if (payload.endDate) form.append('endDate', payload.endDate);
    if (payload.posterFile) form.append('posterImage', payload.posterFile);
    setState(s => ({ ...s, saving: true }));
    try { await adminPublishEvent(id, form); await load(); } finally { setState(s => ({ ...s, saving: false })); }
  };

  return { ...state, setPage, setFilter, reload: load, create, update, remove, publish };
}

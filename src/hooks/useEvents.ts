import { useEffect, useState, useCallback } from 'react';
import { fetchEvents } from '../services/modules/eventService';
import type { EventFilters } from '../services/modules/eventService';

interface UseEventsState {
  items: any[];
  totalPages: number;
  currentPage: number;
  totalEvents: number;
  loading: boolean;
  error: string | null;
  filters: EventFilters;
}

export function useEvents(initial: EventFilters = {}) {
  const [state, setState] = useState<UseEventsState>({
    items: [],
    totalPages: 1,
    currentPage: 1,
    totalEvents: 0,
    loading: true,
    error: null,
    filters: { page: 1, limit: 10, upcoming: true, ...initial },
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchEvents(state.filters);
      setState((s) => ({
        ...s,
        items: data.events,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
        totalEvents: data.totalEvents,
        loading: false,
      }));
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e.message || 'Failed to load events' }));
    }
  }, [state.filters]);

  useEffect(() => { load(); }, [load]);

  const setPage = (page: number) => setState((s) => ({ ...s, filters: { ...s.filters, page } }));
  const setFilter = (patch: Partial<EventFilters>) => setState((s) => ({ ...s, filters: { ...s.filters, page: 1, ...patch } }));
  // Debounce search changes
  useEffect(() => {
    const handler = setTimeout(() => {
      if (state.filters.search && state.filters.search.length < 2) {
        setState((s) => ({ ...s, filters: { ...s.filters, search: undefined } }));
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [state.filters.search]);
  const refresh = () => load();

  return { ...state, setPage, setFilter, refresh };
}

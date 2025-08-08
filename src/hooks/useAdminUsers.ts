import { useCallback, useEffect, useState } from 'react';
import { adminGetUsers, adminUpdateUserStatus } from '../services/modules/adminService';

interface State {
  items: any[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalUsers: number;
  role?: string;
  search?: string;
  updatingId: string | null;
}

export function useAdminUsers() {
  const [state, setState] = useState<State>({
    items: [],
    loading: true,
    error: null,
    page: 1,
    totalPages: 1,
    totalUsers: 0,
    updatingId: null,
  });

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await adminGetUsers({ page: state.page, role: state.role, search: state.search });
      setState(s => ({ ...s, items: data.users, totalPages: data.totalPages, totalUsers: data.totalUsers, loading: false }));
    } catch (e: any) {
      setState(s => ({ ...s, loading: false, error: e.message || 'Failed to load users' }));
    }
  }, [state.page, state.role, state.search]);

  useEffect(() => { load(); }, [load]);

  const setPage = (page: number) => setState(s => ({ ...s, page }));
  const setRole = (role?: string) => setState(s => ({ ...s, page: 1, role }));
  const setSearch = (search?: string) => setState(s => ({ ...s, page: 1, search }));

  const toggleStatus = async (id: string, isActive: boolean) => {
    setState(s => ({ ...s, updatingId: id }));
    try { await adminUpdateUserStatus(id, isActive); await load(); } finally { setState(s => ({ ...s, updatingId: null })); }
  };

  return { ...state, setPage, setRole, setSearch, reload: load, toggleStatus };
}

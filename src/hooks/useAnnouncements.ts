import { useEffect, useState, useCallback } from 'react';
import { announcementsAPI } from '../services/api';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  imagePath?: string | null;
  isActive: boolean;
  priority: number;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
}

export function usePublicAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await announcementsAPI.listPublic();
      setItems(r.data.announcements);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load announcements');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load };
}

export function useAdminAnnouncements() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await announcementsAPI.adminList();
      setItems(r.data.announcements);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load announcements');
    } finally { setLoading(false); }
  }, []);

  const create = useCallback(async (data: any) => {
    await announcementsAPI.create(data);
    await load();
  }, [load]);

  const update = useCallback(async (id: string, data: any) => {
    await announcementsAPI.update(id, data);
    await load();
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await announcementsAPI.remove(id);
    await load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, reload: load, create, update, remove };
}

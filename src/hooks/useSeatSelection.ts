import { useCallback, useEffect, useRef, useState } from 'react';
import { holdSeat, releaseSeat } from '../services/modules/seatService';

interface SelectedSeat {
  id: string;
  section: string;
  row: string;
  number: number;
  price: number;
  holdExpiry?: string | null;
}

export function useSeatSelection() {
  const [selected, setSelected] = useState<SelectedSeat | null>(null);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0); // ms remaining

  const clearTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startCountdown = (expiry?: string | null) => {
    clearTimer();
    if (!expiry) return;
    const end = new Date(expiry).getTime();
    timerRef.current = window.setInterval(() => {
      const diff = end - Date.now();
      if (diff <= 0) {
        clearTimer();
        setRemaining(0);
        setSelected(null); // expired locally
      } else {
        setRemaining(diff);
      }
    }, 1000);
  };

  const selectSeat = useCallback(async (seat: SelectedSeat) => {
    if (selected?.id === seat.id) return; // already selected
    setHolding(true);
    setError(null);
    try {
      // release previous seat first
      if (selected) {
        try { await releaseSeat(selected.id); } catch {}
      }
      const res = await holdSeat(seat.id);
      setSelected({ ...seat, holdExpiry: res.seat?.holdExpiry });
      startCountdown(res.seat?.holdExpiry);
    } catch (e: any) {
      setError(e.message || 'Unable to hold seat');
    } finally { setHolding(false); }
  }, [selected]);

  const release = useCallback(async () => {
    if (!selected) return;
    try { await releaseSeat(selected.id); } catch {}
    setSelected(null);
    clearTimer();
    setRemaining(0);
  }, [selected]);

  // auto-release on unmount
  useEffect(() => () => { release(); }, [release]);

  return {
    selected,
    holding,
    error,
    remaining, // ms
    selectSeat,
    release,
    isExpired: selected && remaining === 0,
    remainingSeconds: Math.max(0, Math.floor(remaining / 1000)),
  };
}

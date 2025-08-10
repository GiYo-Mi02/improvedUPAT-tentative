import React from 'react';
import { useSeatSelection } from '../../hooks/useSeatSelection';

interface Seat {
  id: string;
  section: string;
  row: string;
  number: number;
  status: string;
  isVip: boolean;
  price: number;
  holdExpiry?: string | null;
}

interface SeatMapProps {
  seats: Seat[];
  onSelect?: (seat: Seat | null) => void;
}

// Hide VIP section per requirement; VIP seats (if any) won’t render here
const sectionOrder = ['orchestra', 'balcony', 'lodge_left', 'lodge_right'];

export const SeatMap: React.FC<SeatMapProps> = ({ seats, onSelect }) => {
  const { selected, selectSeat, release, remainingSeconds, isExpired } = useSeatSelection();

  const grouped: Record<string, Seat[]> = sectionOrder.reduce((acc, s) => { acc[s] = []; return acc; }, {} as Record<string, Seat[]>);
  seats.forEach((seat) => { if (!grouped[seat.section]) grouped[seat.section] = []; grouped[seat.section].push(seat); });
  Object.values(grouped).forEach(list => list.sort((a,b) => a.row.localeCompare(b.row) || a.number - b.number));

  const handleClick = (seat: Seat) => {
    if (seat.status !== 'available') return;
    if (selected && selected.id === seat.id) {
      release();
      onSelect?.(null);
    } else {
      selectSeat(seat as any);
      onSelect?.(seat);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 text-xs text-gray-300">
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-green-500 rounded" /> Available</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-red-500 rounded" /> Reserved</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-luxury-gold rounded" /> VIP</div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 bg-blue-500 rounded" /> Selected</div>
        {selected && (
          <div className="ml-auto flex items-center gap-2 text-yellow-300">
            Holding: {remainingSeconds}s{isExpired && ' (expired)'}
          </div>
        )}
      </div>

      {sectionOrder.map((section) => {
        const list = grouped[section];
        if (!list || list.length === 0) return null;
        return (
          <div key={section}>
            <h3 className="heading-tertiary mb-2 capitalize">{section.replace('_', ' ')}</h3>
            <div className="inline-block p-4 rounded-lg bg-gray-800/40 border border-gray-700/60" role="group" aria-label={`${section} seats`}>
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `repeat(${Math.max(...list.map(s => s.number))}, minmax(18px, 1fr))` }}
              >
                {list.map((seat) => {
                  const isSelected = selected?.id === seat.id;
                  const base = seat.isVip ? 'seat-vip' : (seat.status === 'available' ? 'seat-available' : seat.status === 'reserved' ? 'seat-reserved' : 'seat-reserved');
                  return (
                    <button
                      key={seat.id}
                      onClick={() => handleClick(seat)}
                      className={`w-6 h-6 rounded text-[10px] flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-luxury-gold/60 ${base} ${isSelected ? 'seat-selected' : ''}`}
                      title={`${seat.section.toUpperCase()} ${seat.row}${seat.number} - ${seat.status}`}
                      aria-label={`Seat ${seat.section} ${seat.row}${seat.number} ${seat.isVip ? 'VIP' : ''} ${seat.status}`} aria-pressed={isSelected}
                      disabled={seat.status !== 'available' && !isSelected}
                    >
                      {seat.row}{seat.number}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SeatMap;

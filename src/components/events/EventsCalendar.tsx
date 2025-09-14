import React from 'react';
import { Link } from 'react-router-dom';
import { calendarPlaceholders } from '../../config/calendarPlaceholders';

export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string; // ISO
  venue?: string;
  // Optional fields coming from backend for richer hover cards
  posterImage?: string;
  posterImageUrl?: string;
  description?: string;
}

interface EventsCalendarProps {
  events: CalendarEvent[];
  month: Date; // any day within the month to display
  onMonthChange?: (newMonth: Date) => void;
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

const weekdayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const EventsCalendar: React.FC<EventsCalendarProps> = ({ events, month, onMonthChange }) => {
  const start = startOfMonth(month);
  const end = endOfMonth(month);

  // Resolve image for hover preview
  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';
  const SERVER_BASE = API_BASE.replace(/\/api$/i, '');
  const resolvePoster = (ev: Partial<CalendarEvent>): string | null => {
    const anyEv: any = ev;
    if (anyEv?.posterImageUrl) return anyEv.posterImageUrl as string;
    const p = anyEv?.posterImage as string | undefined;
    if (!p) return null;
    if (/^https?:/i.test(p)) return p;
    return `${SERVER_BASE}${p.startsWith('/') ? p : '/' + p}`;
  };

  // Build grid: days from Sunday start
  const startPadding = start.getDay();
  const totalDays = end.getDate();
  const days: Date[] = [];
  for (let i = 0; i < startPadding; i++) days.push(new Date(start.getFullYear(), start.getMonth(), i - startPadding + 1));
  for (let d = 1; d <= totalDays; d++) days.push(new Date(start.getFullYear(), start.getMonth(), d));
  const totalCells = Math.ceil(days.length / 7) * 7;
  for (let i = days.length; i < totalCells; i++) days.push(new Date(end.getFullYear(), end.getMonth(), end.getDate() + (i - days.length) + 1));

  // Group events by day of this month (backend + placeholders)
  const eventsByDay = new Map<number, (CalendarEvent & { _placeholder?: boolean; _href?: string })[]>();
  const addToDay = (ev: CalendarEvent & { _placeholder?: boolean; _href?: string }) => {
    const d = new Date(ev.eventDate);
    if (d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()) {
      const key = d.getDate();
      const arr = eventsByDay.get(key) || [];
      arr.push(ev);
      eventsByDay.set(key, arr);
    }
  };

  // Add real events first
  events.forEach(ev => addToDay(ev));

  // Then add placeholders (skip if an event with the same id already exists for that day)
  calendarPlaceholders.forEach(ph => {
    const d = new Date(ph.eventDate);
    if (d.getMonth() !== month.getMonth() || d.getFullYear() !== month.getFullYear()) return;
    const key = d.getDate();
    const arr = eventsByDay.get(key) || [];
    if (!arr.some(e => e.id === ph.id)) {
      addToDay({ id: ph.id, title: ph.title, eventDate: ph.eventDate, venue: ph.venue, _placeholder: true, _href: ph.href });
    }
  });

  const goPrev = () => onMonthChange?.(addMonths(month, -1));
  const goNext = () => onMonthChange?.(addMonths(month, 1));

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-heading text-white">
          {month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-1 text-sm" onClick={goPrev}>Prev</button>
          <button className="btn-secondary px-3 py-1 text-sm" onClick={() => onMonthChange?.(new Date())}>Today</button>
          <button className="btn-secondary px-3 py-1 text-sm" onClick={goNext}>Next</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-700/30 rounded-md overflow-visible">
        {weekdayLabels.map((w) => (
          <div key={w} className="bg-gray-800/70 text-gray-300 text-center py-2 text-xs font-medium">{w}</div>
        ))}
        {days.map((d, idx) => {
          const inMonth = d.getMonth() === month.getMonth();
          const dayEvents = inMonth ? eventsByDay.get(d.getDate()) || [] : [];
          const isToday = isSameDay(d, today);
          return (
            <div key={idx} className={`min-h-[110px] bg-gray-900/60 p-2 ${inMonth ? '' : 'opacity-40'} relative`}> 
              <div className={`text-[11px] mb-1 ${isToday ? 'text-luxury-gold font-semibold' : 'text-gray-400'}`}>{d.getDate()}</div>
              <div className="space-y-1">
                {dayEvents.slice(0,3).map(ev => {
                  const isPlaceholder = (ev as any)._placeholder;
                  const href = (ev as any)._href as string | undefined;
                  const imgSrc = resolvePoster(ev);
                  const prettyDate = new Date(ev.eventDate).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const className = isPlaceholder
                    ? 'block text-[11px] leading-tight bg-blue-500/15 text-blue-200 px-2 py-1 rounded border border-blue-400/30'
                    : 'block text-[11px] leading-tight bg-luxury-gold/15 text-luxury-champagne px-2 py-1 rounded hover:bg-luxury-gold/25';
                  const HoverCard = (
                    <div className="pointer-events-none absolute z-30 left-0 top-full mt-2 w-64 rounded-lg border border-white/10 shadow-xl bg-gray-900/95 backdrop-blur p-3 opacity-0 scale-95 origin-top-left transition-all duration-150 group-hover:opacity-100 group-hover:scale-100">
                      {imgSrc && (
                        <img src={imgSrc} alt={ev.title} className="w-full h-28 object-cover rounded-md border border-white/10 mb-2" loading="lazy" />
                      )}
                      <div className="text-white text-sm font-semibold leading-snug line-clamp-2">{ev.title}</div>
                      <div className="text-[11px] text-gray-300 mt-1">{prettyDate}</div>
                      {ev.venue && <div className="text-[11px] text-gray-400">{ev.venue}</div>}
                    </div>
                  );
                  if (isPlaceholder) {
                    return href ? (
                      <div key={ev.id} className="relative group">
                        <a href={href} target="_blank" rel="noreferrer" className={className}>
                          {ev.title}
                        </a>
                        {HoverCard}
                      </div>
                    ) : (
                      <div key={ev.id} className="relative group">
                        <div className={className} title="Planned (placeholder)">{ev.title}</div>
                        {HoverCard}
                      </div>
                    );
                  }
                  return (
                    <div key={ev.id} className="relative group">
                      <Link to={`/events/${ev.id}`} className={className}>
                        {ev.title}
                      </Link>
                      {HoverCard}
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EventsCalendar;

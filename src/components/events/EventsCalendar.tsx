import React from 'react';
import { Link } from 'react-router-dom';
import { calendarPlaceholders } from '../../config/calendarPlaceholders';

export interface CalendarEvent {
  id: string;
  title: string;
  eventDate: string; // ISO
  venue?: string;
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

      <div className="grid grid-cols-7 gap-px bg-gray-700/30 rounded-md overflow-hidden">
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
                  const className = isPlaceholder
                    ? 'block text-[11px] leading-tight bg-blue-500/15 text-blue-200 px-2 py-1 rounded border border-blue-400/30'
                    : 'block text-[11px] leading-tight bg-luxury-gold/15 text-luxury-champagne px-2 py-1 rounded hover:bg-luxury-gold/25';
                  if (isPlaceholder) {
                    return href ? (
                      <a href={href} target="_blank" rel="noreferrer" key={ev.id} className={className}>
                        {ev.title}
                      </a>
                    ) : (
                      <div key={ev.id} className={className} title="Planned (placeholder)">{ev.title}</div>
                    );
                  }
                  return (
                    <Link to={`/events/${ev.id}`} key={ev.id} className={className}>
                      {ev.title}
                    </Link>
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

import React, { useEffect, useMemo, useState } from 'react';
import { eventsAPI } from '../services/api';

// Strong typing for events
interface EventItem {
  id: string;
  title: string;
  description?: string;
  posterImage?: string | null;
  posterImageUrl?: string | null;
  eventDate: string;
  availableSeats: number;
  totalSeats: number;
  type: string;
  category: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = API_BASE.replace(/\/api$/i, '');

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

type Filters = { type?: string; category?: string; search?: string };

const Events: React.FC = () => {
  // filters
  const [filters, setFilters] = useState<Filters>({});
  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  // data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thisMonthOpen, setThisMonthOpen] = useState<EventItem[]>([]);
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [closed, setClosed] = useState<EventItem[]>([]);

  const now = useMemo(() => new Date(), []);
  const start = useMemo(() => startOfMonth(now), [now]);
  const end = useMemo(() => endOfMonth(now), [now]);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        // Build shared params
        const base: any = {
          status: 'published',
          upcoming: false,
          limit: 300,
          page: 1,
        };
        if (filters.type) base.type = filters.type;
        if (filters.category) base.category = filters.category;
        if (filters.search) base.search = filters.search;

        // Three queries
        const pMonth = eventsAPI.getAll({ ...base, from: start.toISOString(), to: end.toISOString() });
        const pUpcoming = eventsAPI.getAll({ ...base, from: new Date(end.getTime() + 1).toISOString() });
        const pClosed = eventsAPI.getAll({ ...base, to: new Date(start.getTime() - 1).toISOString() });

        const [rMonth, rUpcoming, rClosed] = await Promise.all([pMonth, pUpcoming, pClosed]);

        const monthEvents: EventItem[] = rMonth.data.events || [];
        const upcomingEvents: EventItem[] = rUpcoming.data.events || [];
        const closedEventsRaw: EventItem[] = rClosed.data.events || [];

        // Filter month: only open (availableSeats > 0)
        setThisMonthOpen(monthEvents.filter((e) => (e as any).isAvailable ?? ((e.availableSeats || 0) > 0)));
        setUpcoming(upcomingEvents);
        // Closed: include past published and also sold-out events within current month
        const soldOutThisMonth = monthEvents.filter((e) => !((e as any).isAvailable ?? ((e.availableSeats || 0) > 0)));
        // Sort closed descending by date for nicer view
        const allClosed = [...closedEventsRaw, ...soldOutThisMonth].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
        setClosed(allClosed);
      } catch (e: any) {
        setError(e?.message || 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters, start, end]);

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="heading-primary">Events</h1>
          <div className="flex flex-wrap gap-3 text-sm">
            <select
              value={filters.type || 'all'}
              onChange={(e) => setFilter({ type: e.target.value === 'all' ? undefined : e.target.value })}
              className="input-luxury w-40"
            >
              <option value="all">All Types</option>
              <option value="seminar">Seminar</option>
              <option value="workshop">Workshop</option>
              <option value="theater">Theater</option>
              <option value="competition">Competition</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select>
            <select
              value={filters.category || 'all'}
              onChange={(e) => setFilter({ category: e.target.value === 'all' ? undefined : e.target.value })}
              className="input-luxury w-40"
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="performance">Performance</option>
              <option value="competition">Competition</option>
              <option value="cultural">Cultural</option>
            </select>
            <input
              type="text"
              placeholder="Search..."
              className="input-luxury w-56"
              onChange={(e) => setFilter({ search: e.target.value || undefined })}
            />
          </div>
        </div>

        {loading && (<div className="text-gray-400">Loading events...</div>)}
        {error && !loading && (<div className="text-red-400">{error}</div>)}

        {/* This Month (Open) */}
        {!loading && !error && (
          <div className="space-y-6">
            <h2 className="heading-secondary">Events This Month</h2>
            {thisMonthOpen.length === 0 ? (
              <div className="text-gray-400">No open events this month.</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {thisMonthOpen.map((ev) => {
                  const rawRel = ev.posterImage || null;
                  const imgSrc = ev.posterImageUrl || (rawRel ? `${SERVER_BASE}${rawRel.startsWith('/') ? rawRel : `/${rawRel}`}` : null);
                  return (
                    <div key={ev.id} className="card-luxury p-5 flex flex-col justify-between">
                      <div>
                        {imgSrc ? (
                          <div className="relative h-40 mb-4 -mt-2 -mx-2 overflow-hidden rounded-md border border-luxury-gold/10">
                            <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <span className="absolute bottom-1 left-2 text-[10px] tracking-wide bg-black/50 px-2 py-0.5 rounded text-luxury-champagne">{new Date(ev.eventDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <div className="h-40 mb-4 -mt-2 -mx-2 rounded-md bg-gradient-to-br from-luxury-deep/60 to-luxury-night/60 flex items-center justify-center text-[11px] text-gray-500 border border-luxury-gold/10">No Poster</div>
                        )}
                        <h2 className="heading-secondary mb-2 line-clamp-1" title={ev.title}>{ev.title}</h2>
                        <p className="text-sm text-gray-400 line-clamp-3 mb-3 min-h-[60px]">{ev.description || 'No description'}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-300 mb-3">
                          <span className="px-2 py-1 bg-gray-700/40 rounded uppercase tracking-wide">{ev.type}</span>
                          <span className="px-2 py-1 bg-gray-700/40 rounded uppercase tracking-wide">{ev.category}</span>
                          {!imgSrc && (<span className="px-2 py-1 bg-gray-700/40 rounded">{new Date(ev.eventDate).toLocaleDateString()}</span>)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-400">{ev.availableSeats} / {ev.totalSeats} seats</div>
                        <a href={`/events/${ev.id}`} className="btn-secondary text-xs px-3 py-2">Details</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Upcoming (Next Months) */}
        {!loading && !error && (
          <div className="space-y-6 mt-12">
            <h2 className="heading-secondary">Upcoming Events</h2>
            {upcoming.length === 0 ? (
              <div className="text-gray-400">No upcoming events.</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((ev) => {
                  const rawRel = ev.posterImage || null;
                  const imgSrc = ev.posterImageUrl || (rawRel ? `${SERVER_BASE}${rawRel.startsWith('/') ? rawRel : `/${rawRel}`}` : null);
                  const isAvailable = (ev as any).isAvailable ?? ((ev.availableSeats || 0) > 0);
                  return (
                    <div key={ev.id} className="card-luxury p-5 flex flex-col justify-between">
                      <div>
                        {imgSrc ? (
                          <div className="relative h-40 mb-4 -mt-2 -mx-2 overflow-hidden rounded-md border border-luxury-gold/10">
                            <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <span className="absolute bottom-1 left-2 text-[10px] tracking-wide bg-black/50 px-2 py-0.5 rounded text-luxury-champagne">{new Date(ev.eventDate).toLocaleDateString()}</span>
                            {!isAvailable && (<span className="absolute top-2 right-2 text-[10px] bg-red-600/80 text-white px-2 py-0.5 rounded">Sold Out</span>)}
                          </div>
                        ) : (
                          <div className="h-40 mb-4 -mt-2 -mx-2 rounded-md bg-gradient-to-br from-luxury-deep/60 to-luxury-night/60 flex items-center justify-center text-[11px] text-gray-500 border border-luxury-gold/10">No Poster</div>
                        )}
                        <h2 className="heading-secondary mb-2 line-clamp-1" title={ev.title}>{ev.title}</h2>
                        <p className="text-sm text-gray-400 line-clamp-3 mb-3 min-h-[60px]">{ev.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-400">{ev.availableSeats} / {ev.totalSeats} seats</div>
                        <a href={`/events/${ev.id}`} className="btn-secondary text-xs px-3 py-2">Details</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Closed */}
        {!loading && !error && (
          <div className="space-y-6 mt-12">
            <h2 className="heading-secondary">Closed Events</h2>
            {closed.length === 0 ? (
              <div className="text-gray-400">No closed events.</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {closed.map((ev) => {
                  const rawRel = ev.posterImage || null;
                  const imgSrc = ev.posterImageUrl || (rawRel ? `${SERVER_BASE}${rawRel.startsWith('/') ? rawRel : `/${rawRel}`}` : null);
                  return (
                    <div key={ev.id} className="card-luxury p-5 flex flex-col justify-between opacity-80">
                      <div>
                        {imgSrc ? (
                          <div className="relative h-40 mb-4 -mt-2 -mx-2 overflow-hidden rounded-md border border-luxury-gold/10">
                            <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-1 left-2 text-[10px] tracking-wide bg-black/50 px-2 py-0.5 rounded text-luxury-champagne">{new Date(ev.eventDate).toLocaleDateString()}</span>
                            <span className="absolute top-2 right-2 text-[10px] bg-gray-600/80 text-white px-2 py-0.5 rounded">Closed</span>
                          </div>
                        ) : (
                          <div className="h-40 mb-4 -mt-2 -mx-2 rounded-md bg-gradient-to-br from-luxury-deep/60 to-luxury-night/60 flex items-center justify-center text-[11px] text-gray-500 border border-luxury-gold/10">No Poster</div>
                        )}
                        <h2 className="heading-secondary mb-2 line-clamp-1" title={ev.title}>{ev.title}</h2>
                        <p className="text-sm text-gray-400 line-clamp-3 mb-3 min-h-[60px]">{ev.description || 'No description'}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-400">{ev.availableSeats} / {ev.totalSeats} seats</div>
                        <a href={`/events/${ev.id}`} className="btn-secondary text-xs px-3 py-2">Details</a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;

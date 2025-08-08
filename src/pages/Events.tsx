import React from 'react';
import { useEvents } from '../hooks/useEvents';

// Added interface for stronger typing
interface EventItem {
  id: number;
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

const Events: React.FC = () => {
  const { items, loading, error, filters, setFilter, setPage, currentPage, totalPages } = useEvents();

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

        {loading && (
          <div className="text-gray-400">Loading events...</div>
        )}
        {error && !loading && (
          <div className="text-red-400">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="text-gray-400">No events found.</div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(items as EventItem[]).map((ev) => {
            const rawRel = ev.posterImage || null; // legacy field
            const imgSrc = ev.posterImageUrl || (rawRel ? `${SERVER_BASE}${rawRel.startsWith('/') ? rawRel : `/${rawRel}`}` : null);
            return (
              <div key={ev.id} className="card-luxury p-5 flex flex-col justify-between">
                <div>
                  {/* Poster */}
                  {imgSrc ? (
                    <div className="relative h-40 mb-4 -mt-2 -mx-2 overflow-hidden rounded-md border border-luxury-gold/10">
                      <img
                        src={imgSrc}
                        alt={ev.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-1 left-2 text-[10px] tracking-wide bg-black/50 px-2 py-0.5 rounded text-luxury-champagne">
                        {new Date(ev.eventDate).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="h-40 mb-4 -mt-2 -mx-2 rounded-md bg-gradient-to-br from-luxury-deep/60 to-luxury-night/60 flex items-center justify-center text-[11px] text-gray-500 border border-luxury-gold/10">
                      No Poster
                    </div>
                  )}
                  <h2 className="heading-secondary mb-2 line-clamp-1" title={ev.title}>{ev.title}</h2>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-3 min-h-[60px]">{ev.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-300 mb-3">
                    <span className="px-2 py-1 bg-gray-700/40 rounded uppercase tracking-wide">{ev.type}</span>
                    <span className="px-2 py-1 bg-gray-700/40 rounded uppercase tracking-wide">{ev.category}</span>
                    {!imgSrc && (
                      <span className="px-2 py-1 bg-gray-700/40 rounded">{new Date(ev.eventDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs text-gray-400">
                    {ev.availableSeats} / {ev.totalSeats} seats
                  </div>
                  <a href={`/events/${ev.id}`} className="btn-secondary text-xs px-3 py-2">Details</a>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-10 gap-3">
            <button
              className="btn-secondary px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >Prev</button>
            <div className="text-gray-300 text-sm flex items-center">Page {currentPage} / {totalPages}</div>
            <button
              className="btn-secondary px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;

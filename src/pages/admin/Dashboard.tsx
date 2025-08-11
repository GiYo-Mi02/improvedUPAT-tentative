import React, { useMemo, useState } from 'react';
import { useEventAnalytics } from '../../hooks/useEventAnalytics';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { Calendar, Users, Activity, RefreshCcw, Clock, CheckCircle2, Hourglass, TrendingUp, MapPin } from 'lucide-react';
import { useEventTrends } from '../../hooks/useEventTrends';
import { Sparkline } from '../../components/ui/Sparkline';
import { Modal } from '../../components/ui/Modal';
import { downloadCSV, toCSV } from '../../utils/csv';

const Dashboard: React.FC = () => {
  const { statistics, recentReservations, upcomingEvents, loading, error, reload } = useAdminDashboard();
  const [range, setRange] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const { items: analytics, loading: loadingAnalytics, error: analyticsError, reload: reloadAnalytics } = useEventAnalytics(range, 10);
  const { trends, loading: loadingTrends, error: trendsError } = useEventTrends(range, 14, 6);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(() => analytics.find(a => a.id === selectedId) || null, [analytics, selectedId]);

  const csvRows = useMemo(() => {
    return analytics.map((a: any) => ({
      id: a.id,
      title: a.title,
      date: new Date(a.eventDate).toISOString(),
      venue: a.venue,
      status: a.status,
      totalSeats: a.totalSeats,
      soldSeats: a.soldSeats,
      availableSeats: a.availableSeats,
      reservations_total: a.reservations.total,
      reservations_confirmed: a.reservations.confirmed,
      reservations_pending: a.reservations.pending,
      occupancy_pct: a.occupancy,
      confirmation_rate_pct: a.confirmationRate,
    }));
  }, [analytics]);

  const exportCSV = () => {
    const csv = toCSV(csvRows, [
      { key: 'id', label: 'ID' },
      { key: 'title', label: 'Title' },
      { key: 'date', label: 'Event Date' },
      { key: 'venue', label: 'Venue' },
      { key: 'status', label: 'Status' },
      { key: 'totalSeats', label: 'Total Seats' },
      { key: 'soldSeats', label: 'Sold Seats' },
      { key: 'availableSeats', label: 'Available Seats' },
      { key: 'reservations_total', label: 'Reservations (Total)' },
      { key: 'reservations_confirmed', label: 'Reservations (Confirmed)' },
      { key: 'reservations_pending', label: 'Reservations (Pending)' },
      { key: 'occupancy_pct', label: 'Occupancy %' },
      { key: 'confirmation_rate_pct', label: 'Confirmation Rate %' },
    ]);
    downloadCSV(`event-analytics-${range}.csv`, csv);
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="heading-primary">Admin Dashboard</h1>
          <button onClick={reload} className="btn-secondary text-xs px-3 py-2">Refresh</button>
        </div>
        {loading && <div className="text-gray-400">Loading dashboard...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}
        {!loading && statistics && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="card-luxury p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-luxury-gold/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-luxury-gold" />
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Total Events</div>
                <div className="text-3xl font-light text-white">{statistics.totalEvents}</div>
              </div>
            </div>
            <div className="card-luxury p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-luxury-gold/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-luxury-gold" />
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Active Events</div>
                <div className="text-3xl font-light text-white">{statistics.activeEvents}</div>
              </div>
            </div>
            <div className="card-luxury p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-luxury-gold/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-luxury-gold" />
              </div>
              <div>
                <div className="text-gray-400 text-xs uppercase tracking-wide">Users</div>
                <div className="text-3xl font-light text-white">{statistics.totalUsers}</div>
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="heading-secondary mb-4">Recent Reservations</h2>
              <div className="space-y-3">
                {recentReservations.length === 0 && <div className="text-gray-400 text-sm">No recent reservations.</div>}
                {recentReservations.map((r: any) => (
                  <div key={r.id} className="card-luxury p-4 flex items-center justify-between text-sm text-gray-300">
                    <div className="space-y-1">
                      <div className="text-white font-medium">{r.event.title}</div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="text-xs">{r.user.name} • Seat: {r.seat.section.toUpperCase()} {r.seat.row}{r.seat.number}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs capitalize ${r.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300' : r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>{r.status}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="heading-secondary mb-4">Upcoming Events</h2>
              <div className="space-y-3">
                {upcomingEvents.length === 0 && <div className="text-gray-400 text-sm">No upcoming events.</div>}
                {upcomingEvents.map((ev: any) => (
                  <div key={ev.id} className="card-luxury p-4 flex items-center justify-between text-sm text-gray-300">
                    <div className="space-y-1">
                      <div className="text-white font-medium">{ev.title}</div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-gray-400" /> {new Date(ev.eventDate).toLocaleString()}</span>
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {ev.venue}</span>
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded bg-gray-700/60 text-xs">{ev.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

  {/* Event Analytics */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-secondary">Event Performance</h2>
            <div className="flex items-center gap-2">
              <div className="bg-luxury-night/60 rounded-lg p-1 flex text-xs">
                {(['upcoming','all','past'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRange(opt)}
                    className={`px-3 py-1.5 rounded-md capitalize ${range === opt ? 'bg-luxury-gold/20 text-white' : 'text-gray-300 hover:text-white'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button onClick={reloadAnalytics} className="btn-secondary text-xs px-3 py-2 inline-flex items-center gap-1">
                <RefreshCcw className="h-3.5 w-3.5" /> Refresh
              </button>
              <button onClick={exportCSV} className="btn-primary text-xs px-3 py-2">Export CSV</button>
            </div>
          </div>

          {(loadingTrends || trendsError) && (
            <div className="text-xs mt-2 text-gray-400">{loadingTrends ? 'Loading trends…' : trendsError}</div>
          )}

          {loadingAnalytics && <div className="text-gray-400">Loading analytics...</div>}
          {analyticsError && <div className="text-red-400">{analyticsError}</div>}
          {!loadingAnalytics && analytics.length === 0 && (
            <div className="text-gray-400 text-sm">No analytics available.</div>
          )}

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.map((a) => {
              const t = trends.find(t => t.id === a.id);
              const change = t?.changePct ?? 0;
              const series = t?.series || [];
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="text-left card-luxury p-4 hover:shadow-xl transition-shadow"
                >
                  <div className="mb-2">
                    <div className="text-white font-medium truncate">{a.title}</div>
                    <div className="text-xs flex items-center gap-3 text-gray-400">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(a.eventDate).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {a.venue}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-400 text-xs">Seats</div>
                      <div className="text-white">{a.soldSeats}/{a.totalSeats}</div>
                      <div className="text-xs text-gray-400">{a.availableSeats} available</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">Occupancy</div>
                      <div className="text-white flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-luxury-gold" /> {a.occupancy}%</div>
                      <div className="h-1.5 rounded bg-gray-700/60 overflow-hidden mt-1">
                        <div className="h-full bg-gradient-to-r from-luxury-gold to-luxury-champagne" style={{ width: `${Math.min(100, Math.max(0, a.occupancy))}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-gray-400 text-xs mb-1">Trend (14d)</div>
                    <Sparkline values={series} />
                    <div className="text-xs mt-1 flex items-center gap-2 text-gray-300">
                      <span className={`px-1.5 py-0.5 rounded ${change >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{change >= 0 ? '+' : ''}{change}%</span>
                      <span className="text-gray-400">{a.daysUntil >= 0 ? `${a.daysUntil}d to go` : `${Math.abs(a.daysUntil)}d ago`}</span>
                      <span className="text-gray-400 capitalize">• {a.status}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <Modal isOpen={!!selected} onClose={() => setSelectedId(null)} title={selected ? selected.title : ''} maxWidthClass="max-w-3xl">
            {selected && (
              <div className="text-sm text-gray-300 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-luxury-night/60 rounded-lg p-4">
                    <div className="text-gray-400 text-xs uppercase">Event</div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" /> {new Date(selected.eventDate).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" /> {selected.venue}
                    </div>
                    <div className="mt-1 text-xs capitalize">Status: {selected.status}</div>
                  </div>
                  <div className="bg-luxury-night/60 rounded-lg p-4">
                    <div className="text-gray-400 text-xs uppercase">Seats</div>
                    <div className="mt-1 text-white">{selected.soldSeats}/{selected.totalSeats} sold</div>
                    <div className="text-xs">{selected.availableSeats} available</div>
                  </div>
                  <div className="bg-luxury-night/60 rounded-lg p-4">
                    <div className="text-gray-400 text-xs uppercase">Reservations</div>
                    <div className="mt-1 text-white inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> {selected.reservations.confirmed}/{selected.reservations.total} confirmed</div>
                    <div className="text-xs inline-flex items-center gap-1"><Hourglass className="h-3.5 w-3.5 text-yellow-400" /> {selected.reservations.pending} pending</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-luxury-night/60 rounded-lg p-4">
                    <div className="text-gray-400 text-xs uppercase">Occupancy</div>
                    <div className="text-white mb-1 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-luxury-gold" /> {selected.occupancy}%</div>
                    <div className="h-1.5 rounded bg-gray-700/60 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-luxury-gold to-luxury-champagne" style={{ width: `${Math.min(100, Math.max(0, selected.occupancy))}%` }} />
                    </div>
                    <div className="text-xs mt-1">Confirmation rate {selected.confirmationRate}%</div>
                  </div>
                  <div className="md:col-span-2 bg-luxury-night/60 rounded-lg p-4">
                    <div className="text-gray-400 text-xs uppercase mb-2">Trend (last 14 days)</div>
                    <Sparkline values={(trends.find(t => t.id === selected.id)?.series) || []} width={360} height={64} />
                    <div className="text-xs mt-1">
                      {(() => { const c = trends.find(t => t.id === selected.id)?.changePct ?? 0; return (
                        <span className={`px-1.5 py-0.5 rounded ${c >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>{c >= 0 ? '+' : ''}{c}%</span>
                      ); })()}
                      <span className="ml-2 text-gray-400">{selected.daysUntil >= 0 ? `${selected.daysUntil} days to go` : `${Math.abs(selected.daysUntil)} days ago`}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

const Dashboard: React.FC = () => {
  const { statistics, recentReservations, upcomingEvents, loading, error, reload } = useAdminDashboard();

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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="card-luxury p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total Events</div>
              <div className="text-3xl font-light text-white">{statistics.totalEvents}</div>
            </div>
            <div className="card-luxury p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Active Events</div>
              <div className="text-3xl font-light text-white">{statistics.activeEvents}</div>
            </div>
            <div className="card-luxury p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Users</div>
              <div className="text-3xl font-light text-white">{statistics.totalUsers}</div>
            </div>
            <div className="card-luxury p-5">
              <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Revenue (₱)</div>
              <div className="text-3xl font-light text-white">{statistics.totalRevenue}</div>
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
                      <div>{r.user.name} • {new Date(r.createdAt).toLocaleString()}</div>
                      <div className="text-xs">Seat: {r.seat.section.toUpperCase()} {r.seat.row}{r.seat.number}</div>
                    </div>
                    <div className="px-2 py-1 rounded bg-gray-700/60 text-xs capitalize">{r.status}</div>
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
                      <div>{new Date(ev.eventDate).toLocaleString()} • {ev.venue}</div>
                    </div>
                    <div className="px-2 py-1 rounded bg-gray-700/60 text-xs">{ev.type}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

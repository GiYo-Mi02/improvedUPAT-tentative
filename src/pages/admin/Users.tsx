import React from 'react';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useToast } from '../../contexts/ToastContext';

const AdminUsers: React.FC = () => {
  const { items, loading, error, page, totalPages, setPage, setRole, setSearch, role, updatingId, toggleStatus } = useAdminUsers();
  const { showToast } = useToast();

  const handleToggle = async (id: string, isActive: boolean) => {
    try { await toggleStatus(id, !isActive); showToast('User status updated','success'); } catch (e: any) { showToast(e.message || 'Update failed','error'); }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="heading-primary">Users</h1>
            <p className="text-gray-400 text-sm">Search users, filter by role, and toggle account status.</p>
            {/* Role Group Segments: Admins vs Clients */}
            <div className="mt-3 inline-flex rounded-lg bg-luxury-deep/50 border border-luxury-gold/10 overflow-hidden">
              {(['admins','clients'] as const).map((seg) => {
                const isAdmins = seg === 'admins';
                const active = (isAdmins && (role === 'admin' || role === 'staff')) || (!isAdmins && (role === 'student' || role === 'user' || !role));
                return (
                  <button
                    key={seg}
                    className={`px-4 py-1.5 text-sm transition ${active ? 'bg-luxury-gold/20 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                    onClick={() => {
                      // Default selection per segment
                      if (isAdmins) setRole('admin'); else setRole('student');
                    }}
                  >
                    {isAdmins ? 'Admins' : 'Clients'}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <select value={role || 'all'} onChange={e => setRole(e.target.value === 'all' ? undefined : e.target.value)} className="input-luxury w-36">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="student">Student</option>
              <option value="user">User</option>
            </select>
            <input placeholder="Search" className="input-luxury w-48" onChange={e => setSearch(e.target.value || undefined)} />
          </div>
        </div>

        {loading && <div className="text-gray-400">Loading users...</div>}
        {error && !loading && <div className="text-red-400">{error}</div>}

        <div className="overflow-x-auto rounded-lg border border-luxury-gold/10 shadow-lg shadow-black/40 bg-luxury-night/40 backdrop-blur">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-gray-400/80 bg-luxury-night/60">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Reservations</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right" />
              </tr>
            </thead>
            <tbody>
              {items.map((u: any) => (
                <tr key={u.id} className="border-t border-gray-700/50 hover:bg-luxury-deep/30 transition">
                  <td className="py-3 px-4 font-medium text-white">{u.name}</td>
                  <td className="py-3 px-4 text-white">{u.email}</td>
                  <td className="py-3 px-4 capitalize text-white">{u.role}</td>
                  <td className="py-3 px-4 text-white">{u.studentId || '-'}</td>
                  <td className="py-3 px-4 text-white">{u.totalReservations}</td>
                  <td className="py-3 px-4">
                    <span className={u.isActive ? 'px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'px-2 py-0.5 rounded text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end">
                      <button className="btn-secondary text-xs px-3 py-1" disabled={updatingId === u.id} onClick={() => handleToggle(u.id, u.isActive)}>{updatingId === u.id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-gray-400">No users</td></tr>}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-3">
            <button className="btn-secondary text-xs px-3 py-2 disabled:opacity-30" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
            <div className="text-gray-300 text-xs flex items-center">Page {page} / {totalPages}</div>
            <button className="btn-secondary text-xs px-3 py-2 disabled:opacity-30" disabled={page === totalPages} onClick={() => setPage(Math.min(totalPages, page + 1))}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;

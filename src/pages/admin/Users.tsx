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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="heading-primary">Admin Users</h1>
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs uppercase text-gray-400 border-b border-gray-700/60">
              <tr>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Student ID</th>
                <th className="py-3 pr-4">Reservations</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4" />
              </tr>
            </thead>
            <tbody>
              {items.map((u: any) => (
                <tr key={u.id} className="border-b border-gray-800/60">
                  <td className="py-3 pr-4 font-medium text-white">{u.name}</td>
                  <td className="py-3 pr-4">{u.email}</td>
                  <td className="py-3 pr-4 capitalize">{u.role}</td>
                  <td className="py-3 pr-4">{u.studentId || '-'}</td>
                  <td className="py-3 pr-4">{u.totalReservations}</td>
                  <td className="py-3 pr-4">{u.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="py-3 pr-4 flex gap-2">
                    <button className="btn-secondary text-xs px-3 py-1" disabled={updatingId === u.id} onClick={() => handleToggle(u.id, u.isActive)}>{updatingId === u.id ? '...' : u.isActive ? 'Deactivate' : 'Activate'}</button>
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

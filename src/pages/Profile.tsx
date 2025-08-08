import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { changePassword } from '../services/modules/authService';

const Profile: React.FC = () => {
  const { state, updateProfile } = useAuth();
  const { showToast } = useToast();
  const user = state.user;
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', phone: (user as any).phone || '' });
    }
  }, [user]);

  const onProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      await updateProfile({ name: profileForm.name, phone: profileForm.phone });
      showToast('Profile updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally { setProfileSaving(false); }
  };

  const onPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      showToast('Password changed', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      showToast(err.message || 'Change failed', 'error');
    } finally { setPwSaving(false); }
  };

  if (!user) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="heading-primary mb-4">Profile</h1>
          <div className="text-gray-400">You must be logged in to view this page.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <h1 className="heading-primary">Profile</h1>
        <div className="grid gap-10 lg:grid-cols-2">
          <form onSubmit={onProfileSubmit} className="card-luxury p-6 space-y-6">
            <div>
              <h2 className="heading-secondary mb-1">Account Information</h2>
              <p className="text-xs text-gray-400">Update your basic profile details.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1 text-gray-400">Name</label>
                <input className="input-luxury w-full" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">Email (read-only)</label>
                <input className="input-luxury w-full opacity-70 cursor-not-allowed" value={user.email} disabled />
              </div>
              <div>
                <label className="block text-xs mb-1 text-gray-400">Phone</label>
                <input className="input-luxury w-full" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 09xxxxxxxxx" />
              </div>
              <div className="flex justify-end pt-2">
                <button disabled={profileSaving} className="btn-primary px-6 py-2 disabled:opacity-40">{profileSaving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          </form>

            <form onSubmit={onPasswordSubmit} className="card-luxury p-6 space-y-6">
              <div>
                <h2 className="heading-secondary mb-1">Change Password</h2>
                <p className="text-xs text-gray-400">Use a strong password with at least 6 characters.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Current Password</label>
                  <input type="password" className="input-luxury w-full" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">New Password</label>
                  <input type="password" className="input-luxury w-full" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={6} />
                </div>
                <div>
                  <label className="block text-xs mb-1 text-gray-400">Confirm New Password</label>
                  <input type="password" className="input-luxury w-full" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
                </div>
                <div className="flex justify-end pt-2">
                  <button disabled={pwSaving} className="btn-secondary px-6 py-2 disabled:opacity-40">{pwSaving ? 'Updating...' : 'Update Password'}</button>
                </div>
              </div>
            </form>
        </div>

        <div className="card-luxury p-6 space-y-4">
          <h2 className="heading-secondary mb-1">Account Details</h2>
          <div className="grid gap-4 md:grid-cols-2 text-sm text-gray-300">
            <div><span className="text-gray-400 block text-xs mb-1">Role</span><span className="capitalize">{user.role}</span></div>
            {user.studentId && <div><span className="text-gray-400 block text-xs mb-1">Student ID</span>{user.studentId}</div>}
            <div><span className="text-gray-400 block text-xs mb-1">User ID</span>{user.id}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

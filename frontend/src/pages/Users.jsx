import React, { useEffect, useState } from 'react';
import { userService } from '../services/api';
import { Users, Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react';

export default function UserControls() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await userService.list();
      setUsers(data);
    } catch (e) {
      console.error('Error loading users list', e);
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (userId, newRoleId, isActive) => {
    try {
      await userService.updateRole(userId, newRoleId, isActive);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update user role.');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.updateRole(user.id, user.role_id, !user.is_active);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle user status.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.delete(userId);
        loadUsers();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete user.');
      }
    }
  };

  return (
    <div className="p-8 space-y-6 text-slate-100 min-h-screen bg-slate-950">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">User Controls</h1>
        <p className="text-slate-400 text-sm mt-1">Manage global system access and role-based permissions.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Current Role Badge</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Delete Account</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 text-sm text-slate-350">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/30 transition-all">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold text-white block">{u.full_name}</span>
                      <span className="text-xs text-slate-500 block mt-0.5">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={u.role_id}
                      onChange={(e) => handleRoleChange(u.id, parseInt(e.target.value), u.is_active)}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value={1}>Administrator</option>
                      <option value={2}>Store Manager</option>
                      <option value={3}>Retail Analyst</option>
                      <option value={4}>Marketing Manager</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className="flex items-center space-x-1.5 focus:outline-none text-xs transition-all cursor-pointer"
                    >
                      {u.is_active ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400 hover:underline">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-slate-500" />
                          <span className="text-slate-550 hover:underline">Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-455 transition-all cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

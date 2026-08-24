import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiSettings, FiUsers, FiFileText, FiSave, 
  FiPlus, FiLock, FiCheckCircle, FiClock, FiRefreshCw 
} from 'react-icons/fi';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    company_name: '',
    currency_symbol: '₹',
    currency_code: 'INR',
    decimal_precision: '2'
  });
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New user form state
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [creatingUser, setCreatingUser] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [sRes, uRes, aRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/users').catch(() => ({ data: [] })),
        api.get('/settings/audit-logs').catch(() => ({ data: [] }))
      ]);

      if (sRes.data) setSettings(sRes.data);
      if (uRes.data) setUsers(uRes.data);
      if (aRes.data) setAuditLogs(aRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/settings', settings);
      toast.success('System configuration saved!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('All user fields are required');
      return;
    }

    try {
      setCreatingUser(true);
      const res = await api.post('/settings/users', newUser);
      toast.success(`User '${res.data.name}' registered successfully!`);
      setUsers([res.data, ...users]);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-gray-100 text-gray-700 rounded-xl">
              <FiSettings className="h-6 w-6" />
            </div>
            System Administration & Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Global ERP configuration, organizational roles, and full database audit logging
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl text-xs font-bold w-fit">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'general' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiSettings className="h-4 w-4" /> General Preferences
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiUsers className="h-4 w-4" /> User Accounts & Roles
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2 ${
            activeTab === 'audit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FiFileText className="h-4 w-4" /> System Audit Trail
        </button>
      </div>

      {/* Tab 1: General Preferences */}
      {activeTab === 'general' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-gray-900">Organization & Currency Standards</h2>
            <p className="text-xs text-gray-500 mt-0.5">Control organization name and financial notation</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Manufacturing Organization Name
              </label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="e.g. Apex Dynamic Manufacturing Ltd"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={settings.currency_symbol || '₹'}
                  onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={settings.currency_code || 'INR'}
                  onChange={(e) => setSettings({ ...settings, currency_code: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Display Decimal Precision
              </label>
              <select
                value={settings.decimal_precision || '2'}
                onChange={(e) => setSettings({ ...settings, decimal_precision: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="2">2 Decimal Places (e.g. ₹1,040.50)</option>
                <option value="4">4 Decimal Places (e.g. ₹1,040.5025)</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                <FiSave className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save General Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Users & Roles */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add User Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FiPlus className="text-primary-600" /> Create Authorized Operator / Estimator Account
            </h2>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Priya Nair"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="priya@company.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold"
                >
                  <option value="user">User (Estimator)</option>
                  <option value="admin">Admin (Director)</option>
                </select>

                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm"
                >
                  {creatingUser ? 'Creating...' : '+ Register'}
                </button>
              </div>
            </form>
          </div>

          {/* User List Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-900">Active Authorized Accounts</h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-xs">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role Permission</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{u.name}</td>
                    <td className="py-3 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <FiCheckCircle className="h-3.5 w-3.5" /> Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: System Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Database Audit & Price Propagation Event Log</h2>
            <span className="text-xs text-gray-500">Latest 50 events</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-gray-500">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-mono text-gray-500 flex items-center gap-1.5">
                        <FiClock className="text-gray-400" />
                        {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-800">{log.user?.name || 'System Operator'}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          log.action.includes('PRICE') ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-700">{log.entity}</td>
                      <td className="py-2.5 px-4 text-gray-700">{log.details || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

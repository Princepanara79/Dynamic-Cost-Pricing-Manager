import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiUsers, FiPlus, FiSearch, FiEdit2, FiTrash2, 
  FiDollarSign, FiRefreshCw, FiPercent, FiArchive 
} from 'react-icons/fi';
import ClientModal from '../components/ClientModal';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const [modalClient, setModalClient] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = { status };
      if (search) params.search = search;

      const res = await api.get('/clients', { params });
      setClients(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClients();
  };

  const handleDelete = async (client) => {
    const isUsed = client.salesCount > 0;
    const confirmMsg = isUsed
      ? `Client '${client.name}' has ${client.salesCount} historical transactions. They will be archived to preserve records. Proceed?`
      : `Are you sure you want to delete '${client.name}'?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/clients/${client.id}`);
      toast.success(res.data.message);
      fetchClients();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FiUsers className="h-6 w-6" />
            </div>
            Enterprise Client Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage client accounts, customized price agreements, and transaction histories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClients}
            className="p-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            title="Refresh List"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/clients/pricing"
            className="inline-flex items-center px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FiDollarSign className="mr-1.5 h-4 w-4 text-emerald-600" /> Client Pricing Matrix
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2 h-4 w-4" /> Add Client
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, code, contact or email..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setStatus('active')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Active ({clients.length})
          </button>
          <button
            onClick={() => setStatus('archived')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-gray-400">
            <FiRefreshCw className="animate-spin h-6 w-6 text-primary-600 mx-auto mb-2" />
            <span>Loading client directory...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 p-8">
            <FiUsers className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No clients registered</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">Register your client accounts to create customized pricing schedules.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold"
            >
              <FiPlus className="mr-2" /> Register Client
            </button>
          </div>
        ) : (
          clients.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                    <span className="text-xs text-gray-400 font-mono font-semibold">{c.code}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold shrink-0">
                    {c.customPricesCount} Custom Price{c.customPricesCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-600 mt-3">
                  {c.contact && <div><strong>Contact:</strong> {c.contact}</div>}
                  {c.email && <div><strong>Email:</strong> {c.email}</div>}
                  {c.phone && <div><strong>Phone:</strong> {c.phone}</div>}
                  {c.address && <div className="text-gray-400 truncate"><strong>Address:</strong> {c.address}</div>}
                </div>

                {/* Financial Summary */}
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-gray-400">Sales Rev</div>
                    <div className="font-bold text-gray-900 mt-0.5">₹{c.totalRevenue?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-gray-400">Net Profit</div>
                    <div className="font-bold text-emerald-600 mt-0.5">₹{c.totalProfit?.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg">
                    <div className="text-gray-400">Avg Margin</div>
                    <div className="font-bold text-primary-700 mt-0.5">{c.averageMargin}%</div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <Link
                  to={`/clients/pricing?clientId=${c.id}`}
                  className="text-primary-600 hover:underline font-semibold"
                >
                  Manage Prices →
                </Link>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setModalClient(c)}
                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit Client"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={c.salesCount > 0 ? "Archive Client" : "Delete Client"}
                  >
                    {c.salesCount > 0 ? <FiArchive className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Client Modal */}
      <ClientModal
        isOpen={isAddModalOpen || !!modalClient}
        client={modalClient}
        onClose={() => { setIsAddModalOpen(false); setModalClient(null); }}
        onSaved={fetchClients}
      />
    </div>
  );
};

export default Clients;

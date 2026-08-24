import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiTool, FiPlus, FiSearch, FiEdit2, FiCopy, 
  FiTrash2, FiRefreshCw, FiChevronRight, FiBox, FiArchive 
} from 'react-icons/fi';

const Components = () => {
  const [components, setComponents] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const params = { status };
      if (search) params.search = search;

      const res = await api.get('/components', { params });
      setComponents(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load components');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, [status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComponents();
  };

  const handleDuplicate = async (comp) => {
    try {
      await api.post(`/components/${comp.id}/duplicate`);
      toast.success(`Cloned '${comp.name}' successfully!`);
      fetchComponents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to duplicate component');
    }
  };

  const handleDelete = async (comp) => {
    const isUsed = comp.productsCount > 0;
    const confirmMsg = isUsed
      ? `Component '${comp.name}' is used in ${comp.productsCount} active product(s). It will be archived instead of permanently deleted. Proceed?`
      : `Are you sure you want to delete '${comp.name}'?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/components/${comp.id}`);
      toast.success(res.data.message);
      fetchComponents();
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
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FiTool className="h-6 w-6" />
            </div>
            Component BOM Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Build multi-material component assemblies with live unit conversions and cost rollups
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchComponents}
            className="p-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            title="Refresh List"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/components/add"
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2 h-4 w-4" /> Add Component BOM
          </Link>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components by name or description..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </form>

        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setStatus('active')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Active ({components.length})
          </button>
          <button
            onClick={() => setStatus('archived')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Components Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-gray-400">
            <FiRefreshCw className="animate-spin h-6 w-6 text-primary-600 mx-auto mb-2" />
            <span>Loading component assemblies...</span>
          </div>
        ) : components.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200 p-8">
            <FiTool className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No components found</h3>
            <p className="text-xs text-gray-500 mt-1 mb-4">Start by building your first component BOM using raw materials.</p>
            <Link to="/components/add" className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold">
              <FiPlus className="mr-2" /> Create Component
            </Link>
          </div>
        ) : (
          components.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-extrabold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-xl shrink-0">
                    ₹{c.currentCost?.toFixed(2)}
                  </span>
                </div>

                {/* Materials Breakdown Pills */}
                <div className="my-3.5 pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Raw Materials ({c.materials?.length || 0})</span>
                    {c.additionalCost > 0 && (
                      <span className="text-gray-400 font-normal">Processing: +₹{c.additionalCost}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {c.materials?.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg">
                        <span className="font-medium text-gray-800 truncate mr-2">
                          {m.name} <span className="text-gray-400 font-normal">({m.quantity} {m.unit})</span>
                        </span>
                        <span className="font-semibold text-gray-900 shrink-0">₹{m.cost?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Used in <strong className="text-gray-800">{c.productsCount}</strong> finished product{c.productsCount !== 1 ? 's' : ''}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(c)}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Duplicate Component"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                  <Link
                    to={`/components/edit/${c.id}`}
                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit BOM"
                  >
                    <FiEdit2 className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(c)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={c.productsCount > 0 ? "Archive Component" : "Delete Component"}
                  >
                    {c.productsCount > 0 ? <FiArchive className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Components;

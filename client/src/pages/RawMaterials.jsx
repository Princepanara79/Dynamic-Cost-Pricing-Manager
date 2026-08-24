import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiBox, FiPlus, FiSearch, FiEdit2, FiTrash2, 
  FiTrendingUp, FiTrendingDown, FiClock, FiDollarSign, 
  FiRefreshCw, FiArchive, FiCheckCircle
} from 'react-icons/fi';
import PriceUpdateModal from '../components/PriceUpdateModal';
import RawMaterialModal from '../components/RawMaterialModal';
import PriceHistoryModal from '../components/PriceHistoryModal';

const RawMaterials = () => {
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [priceModalMaterial, setPriceModalMaterial] = useState(null);
  const [editModalMaterial, setEditModalMaterial] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [historyModalMaterial, setHistoryModalMaterial] = useState(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = { status };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (search) params.search = search;

      const [matRes, catRes] = await Promise.all([
        api.get('/raw-materials', { params }),
        api.get('/raw-materials/categories')
      ]);

      setMaterials(matRes.data);
      setCategories(['All', ...catRes.data]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [selectedCategory, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMaterials();
  };

  const handleDelete = async (mat) => {
    const isUsed = mat.componentsCount > 0;
    const confirmMsg = isUsed
      ? `Material '${mat.name}' is currently used in ${mat.componentsCount} component(s). It will be archived instead of permanently deleted. Proceed?`
      : `Are you sure you want to delete '${mat.name}'?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/raw-materials/${mat.id}`);
      toast.success(res.data.message);
      fetchMaterials();
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
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <FiBox className="h-6 w-6" />
            </div>
            Raw Materials & Supplier Pricing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage base raw materials, monitor supplier price movements, and trigger automated BOM cost propagation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMaterials}
            className="p-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            title="Refresh List"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2 h-4 w-4" /> Add Raw Material
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials by name, specs or category..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </form>

        {/* Categories & Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tab */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatus('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Active ({materials.length})
            </button>
            <button
              onClick={() => setStatus('archived')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Archived
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:bg-white focus:ring-2 focus:ring-primary-500"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Material Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Base Unit</th>
                <th className="py-3.5 px-4 text-right">Current Price</th>
                <th className="py-3.5 px-4 text-right">Previous Price</th>
                <th className="py-3.5 px-4 text-right">Price Movement</th>
                <th className="py-3.5 px-4 text-center">BOM Usage</th>
                <th className="py-3.5 px-4 text-right">Last Revision</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <FiRefreshCw className="animate-spin h-5 w-5 text-primary-600" />
                      <span>Loading materials catalogue...</span>
                    </div>
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No raw materials found matching your criteria.
                  </td>
                </tr>
              ) : (
                materials.map((mat) => {
                  const isIncrease = mat.priceChange > 0;
                  const isDecrease = mat.priceChange < 0;

                  return (
                    <tr key={mat.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">{mat.name}</div>
                        {mat.description && (
                          <div className="text-xs text-gray-400 line-clamp-1 max-w-xs">{mat.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg">
                          {mat.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-700 uppercase text-xs">
                        {mat.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-base font-bold text-gray-900">
                          ₹{mat.currentPrice?.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-400 block">/{mat.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-500">
                        {mat.previousPrice ? `₹${mat.previousPrice.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {mat.priceChange ? (
                          <div className={`font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="inline-flex items-center gap-0.5">
                              {isIncrease && <FiTrendingUp className="h-3.5 w-3.5" />}
                              {isDecrease && <FiTrendingDown className="h-3.5 w-3.5" />}
                              {isIncrease ? '+' : ''}₹{mat.priceChange.toFixed(2)}
                            </span>
                            <div className="text-xs font-medium">
                              ({isIncrease ? '+' : ''}{mat.priceChangePct?.toFixed(1)}%)
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">No Change</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${mat.componentsCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                          {mat.componentsCount} Component{mat.componentsCount !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-xs text-gray-500">
                        {new Date(mat.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Update Price & Propagate */}
                          <button
                            onClick={() => setPriceModalMaterial(mat)}
                            className="inline-flex items-center px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            title="Update Price & Trigger Automatic Recalculation"
                          >
                            <FiDollarSign className="mr-1 h-3.5 w-3.5 text-amber-600" />
                            Update Price
                          </button>

                          {/* Price History Chart */}
                          <button
                            onClick={() => setHistoryModalMaterial(mat)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Price History Chart"
                          >
                            <FiClock className="h-4 w-4" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => setEditModalMaterial(mat)}
                            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Material Specs"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>

                          {/* Delete / Archive */}
                          <button
                            onClick={() => handleDelete(mat)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={mat.componentsCount > 0 ? "Archive Material" : "Delete Material"}
                          >
                            {mat.componentsCount > 0 ? <FiArchive className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price Update & Recalculate Modal */}
      <PriceUpdateModal
        material={priceModalMaterial}
        isOpen={!!priceModalMaterial}
        onClose={() => setPriceModalMaterial(null)}
        onUpdated={fetchMaterials}
      />

      {/* Add / Edit Material Modal */}
      <RawMaterialModal
        isOpen={isAddModalOpen || !!editModalMaterial}
        material={editModalMaterial}
        onClose={() => { setIsAddModalOpen(false); setEditModalMaterial(null); }}
        onSaved={fetchMaterials}
      />

      {/* Price History Modal */}
      <PriceHistoryModal
        material={historyModalMaterial}
        isOpen={!!historyModalMaterial}
        onClose={() => setHistoryModalMaterial(null)}
      />
    </div>
  );
};

export default RawMaterials;

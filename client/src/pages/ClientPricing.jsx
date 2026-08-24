import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiSearch, 
  FiUsers, FiPackage, FiRefreshCw, FiPercent, FiTrendingUp, FiX, FiCheck 
} from 'react-icons/fi';

const ClientPricing = () => {
  const [searchParams] = useSearchParams();
  const initialClientId = searchParams.get('clientId') || '';

  const [prices, setPrices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedClientFilter, setSelectedClientFilter] = useState(initialClientId);
  const [selectedProductFilter, setSelectedProductFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalClientId, setModalClientId] = useState('');
  const [modalProductId, setModalProductId] = useState('');
  const [modalPrice, setModalPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedClientFilter) params.clientId = selectedClientFilter;
      if (selectedProductFilter) params.productId = selectedProductFilter;

      const [pricesRes, clientsRes, prodsRes] = await Promise.all([
        api.get('/client-prices', { params }),
        api.get('/clients'),
        api.get('/products')
      ]);

      setPrices(pricesRes.data);
      setClients(clientsRes.data);
      setProducts(prodsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load client pricing matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClientFilter, selectedProductFilter]);

  const handleOpenModal = (cp = null) => {
    if (cp) {
      setModalClientId(cp.clientId.toString());
      setModalProductId(cp.productId.toString());
      setModalPrice(cp.sellingPrice.toString());
    } else {
      setModalClientId(clients.length > 0 ? clients[0].id.toString() : '');
      setModalProductId(products.length > 0 ? products[0].id.toString() : '');
      setModalPrice('');
    }
    setIsModalOpen(true);
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!modalClientId || !modalProductId || !modalPrice || isNaN(Number(modalPrice)) || Number(modalPrice) < 0) {
      toast.error('Please select client, product, and valid selling price');
      return;
    }

    try {
      setSaving(true);
      await api.post('/client-prices', {
        clientId: Number(modalClientId),
        productId: Number(modalProductId),
        sellingPrice: Number(modalPrice)
      });
      toast.success('Client custom selling price saved successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save client price');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrice = async (id) => {
    if (!window.confirm('Remove this custom client price override? The system will revert to recommended pricing.')) return;

    try {
      await api.delete(`/client-prices/${id}`);
      toast.success('Custom client price removed');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete client price');
    }
  };

  const selectedProdForModal = products.find(p => p.id.toString() === modalProductId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FiDollarSign className="h-6 w-6" />
            </div>
            Client-Specific Selling Price Matrix
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Maintain independent contract rates per enterprise client with dedicated margin isolation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/clients/profit"
            className="inline-flex items-center px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FiTrendingUp className="mr-1.5 h-4 w-4 text-emerald-600" /> Client Profit Analysis
          </Link>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2 h-4 w-4" /> Set Client Custom Price
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Filter by Client:
          </label>
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-primary-500 min-w-48"
          >
            <option value="">All Clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Filter by Product:
          </label>
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-primary-500 min-w-48"
          >
            <option value="">All Products</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        {(selectedClientFilter || selectedProductFilter) && (
          <button
            onClick={() => { setSelectedClientFilter(''); setSelectedProductFilter(''); }}
            className="mt-5 text-xs text-primary-600 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Pricing Matrix Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Client Account</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4 text-right">Current Mfg Cost</th>
                <th className="py-3.5 px-4 text-right">Standard Recommended</th>
                <th className="py-3.5 px-4 text-right">Agreed Client Price</th>
                <th className="py-3.5 px-4 text-right">Net Profit / Unit</th>
                <th className="py-3.5 px-4 text-right">Markup (%)</th>
                <th className="py-3.5 px-4 text-right">Profit Margin (%)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <FiRefreshCw className="animate-spin h-5 w-5 text-primary-600 mx-auto mb-2" />
                    <span>Loading client pricing matrix...</span>
                  </td>
                </tr>
              ) : prices.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No custom pricing overrides found. Click "Set Client Custom Price" to create one.
                  </td>
                </tr>
              ) : (
                prices.map((cp) => {
                  const isProfitable = cp.profit > 0;
                  return (
                    <tr key={cp.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{cp.clientName}</div>
                        <div className="text-xs text-gray-400 font-mono">{cp.clientCode}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Link to={`/products/${cp.productId}/cost`} className="font-bold text-gray-900 hover:text-primary-600">
                          {cp.productName}
                        </Link>
                        <div className="text-xs text-gray-400 font-mono">{cp.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right text-gray-600 font-medium">
                        ₹{cp.manufacturingCost?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-gray-500">
                        ₹{cp.recommendedSellingPrice?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-gray-900 text-base">
                        ₹{cp.sellingPrice?.toFixed(2)}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-black ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                        {isProfitable ? '+' : ''}₹{cp.profit?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-semibold text-gray-700">
                        {cp.markup?.toFixed(1)}%
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isProfitable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {cp.profitMargin?.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenModal(cp)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Client Rate"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrice(cp.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Custom Price"
                          >
                            <FiTrash2 className="h-4 w-4" />
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

      {/* Set Client Custom Price Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <FiX className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <FiDollarSign className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Set Custom Client Selling Price</h3>
                <p className="text-xs text-gray-500">Agreed contract rate for this client without affecting other accounts</p>
              </div>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Enterprise Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalClientId}
                  onChange={(e) => setModalClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                >
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  value={modalProductId}
                  onChange={(e) => setModalProductId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Mfg Cost: ₹{Number(p.manufacturingCost).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedProdForModal && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Current Mfg Cost:</span>
                    <div className="font-bold text-gray-900">₹{Number(selectedProdForModal.manufacturingCost).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Standard Recommended:</span>
                    <div className="font-bold text-primary-700">₹{Number(selectedProdForModal.recommendedSellingPrice).toFixed(2)}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Agreed Custom Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={modalPrice}
                    onChange={(e) => setModalPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-base font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {selectedProdForModal && modalPrice && (
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                  <div>
                    <span>Calculated Net Unit Profit: </span>
                    <strong className="text-sm block">
                      +₹{(Number(modalPrice) - Number(selectedProdForModal.manufacturingCost)).toFixed(2)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span>Profit Margin: </span>
                    <strong className="text-sm block">
                      {Number(modalPrice) > 0 ? (((Number(modalPrice) - Number(selectedProdForModal.manufacturingCost)) / Number(modalPrice)) * 100).toFixed(1) : 0}%
                    </strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Custom Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPricing;

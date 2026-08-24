import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiDollarSign, FiPlus, FiSearch, FiCalendar, 
  FiLock, FiRefreshCw, FiTrendingUp, FiDownload 
} from 'react-icons/fi';
import AddSaleModal from '../components/AddSaleModal';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedClient) params.clientId = selectedClient;
      if (selectedProduct) params.productId = selectedProduct;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [salesRes, clientsRes, prodsRes] = await Promise.all([
        api.get('/sales', { params }),
        api.get('/clients'),
        api.get('/products')
      ]);

      setSales(salesRes.data);
      setClients(clientsRes.data);
      setProducts(prodsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sales transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedClient, selectedProduct, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  // Summary Metrics
  const totalRevenue = sales.reduce((acc, s) => acc + s.revenue, 0);
  const totalCost = sales.reduce((acc, s) => acc + s.totalCost, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);
  const totalUnits = sales.reduce((acc, s) => acc + s.quantity, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FiDollarSign className="h-6 w-6" />
            </div>
            Sales & Transaction Ledger
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historical transactions with immutable locked manufacturing cost basis per invoice
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSales}
            className="p-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
            title="Refresh List"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2 h-4 w-4" /> Record Sales Invoice
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 uppercase font-semibold">Total Revenue</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">₹{totalRevenue.toLocaleString('en-IN')}</div>
          <span className="text-xs text-gray-400">{totalUnits} units sold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 uppercase font-semibold">Total Cost of Goods</span>
          <div className="text-2xl font-bold text-gray-700 mt-1">₹{totalCost.toLocaleString('en-IN')}</div>
          <span className="text-xs text-gray-400">Locked historical cost basis</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 uppercase font-semibold">Total Realized Profit</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">+₹{totalProfit.toLocaleString('en-IN')}</div>
          <span className="text-xs text-emerald-600 font-medium">Net commercial profit</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs text-gray-500 uppercase font-semibold">Average Realized Margin</span>
          <div className="text-2xl font-black text-primary-700 mt-1">{avgMargin.toFixed(2)}%</div>
          <span className="text-xs text-gray-400">Across {sales.length} transactions</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client, product or PO notes..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 min-w-40"
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 min-w-40"
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs"
          />
        </div>

        {(search || selectedClient || selectedProduct || startDate || endDate) && (
          <button
            onClick={() => { setSearch(''); setSelectedClient(''); setSelectedProduct(''); setStartDate(''); setEndDate(''); }}
            className="text-xs text-primary-600 hover:underline font-semibold"
          >
            Reset
          </button>
        )}
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Client Account</th>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4 text-center">Qty</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-right">Locked Cost @ Sale</th>
                <th className="py-3.5 px-4 text-right">Gross Revenue</th>
                <th className="py-3.5 px-4 text-right">Total Cost</th>
                <th className="py-3.5 px-4 text-right">Net Profit / Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <FiRefreshCw className="animate-spin h-5 w-5 text-primary-600 mx-auto mb-2" />
                    <span>Loading transaction ledger...</span>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No sales transactions found. Record your first sale to start tracking locked historical profit.
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{s.clientName}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.clientCode}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{s.productName}</div>
                      <div className="text-xs text-gray-400 font-mono">{s.sku}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                      {s.quantity}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                      ₹{s.sellingPrice?.toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4 text-right text-gray-500 font-medium">
                      <span className="inline-flex items-center gap-1">
                        <FiLock className="text-gray-400 h-3 w-3" />
                        ₹{s.costAtSale?.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                      ₹{s.revenue?.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right text-gray-500">
                      ₹{s.totalCost?.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="font-black text-emerald-600">
                        +₹{s.profit?.toLocaleString('en-IN')}
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 mt-0.5">
                        {s.profitMargin?.toFixed(1)}% margin
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      <AddSaleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaved={fetchSales}
      />
    </div>
  );
};

export default Sales;

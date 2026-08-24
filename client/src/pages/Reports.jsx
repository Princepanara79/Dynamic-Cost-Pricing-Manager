import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiFileText, FiDownload, FiRefreshCw, FiPieChart, 
  FiAlertTriangle, FiUsers, FiDollarSign, FiSearch 
} from 'react-icons/fi';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('product-cost');
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReport = async (tab = activeTab) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/${tab}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(activeTab);
    setSearch('');
  }, [activeTab]);

  const handleExportCsv = () => {
    window.open(`/api/reports/${activeTab}?format=csv`, '_blank');
    toast.success('Downloading report CSV export...');
  };

  const filteredData = data.filter(item => {
    if (!search) return true;
    const str = JSON.stringify(item).toLowerCase();
    return str.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FiFileText className="h-6 w-6" />
            </div>
            Manufacturing & Costing Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate, inspect, and export comprehensive financial and operational reports in CSV format
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchReport()}
            className="p-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
            title="Refresh Report"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <FiDownload className="mr-2 h-4 w-4" /> Export CSV Report
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('product-cost')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'product-cost' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiPieChart className="h-4 w-4" /> Product Cost Breakdown
          </button>

          <button
            onClick={() => setActiveTab('material-impact')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'material-impact' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiAlertTriangle className="h-4 w-4" /> Material Price Impact
          </button>

          <button
            onClick={() => setActiveTab('client-profit')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'client-profit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FiUsers className="h-4 w-4" /> Client Profitability
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Report Tables */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <FiRefreshCw className="animate-spin h-6 w-6 text-primary-600 mx-auto mb-2" />
            <span>Compiling report data...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'product-cost' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Product Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-right">Material (₹)</th>
                    <th className="py-3 px-3 text-right">Labour (₹)</th>
                    <th className="py-3 px-3 text-right">Machine (₹)</th>
                    <th className="py-3 px-3 text-right">Overhead (₹)</th>
                    <th className="py-3 px-3 text-right">Packaging (₹)</th>
                    <th className="py-3 px-3 text-right">Wastage (₹)</th>
                    <th className="py-3 px-3 text-right">Total Cost (₹)</th>
                    <th className="py-3 px-3 text-right">Selling Price (₹)</th>
                    <th className="py-3 px-3 text-right">Profit (₹)</th>
                    <th className="py-3 px-3 text-right">Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-mono text-gray-500">{p.sku}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-gray-500">{p.category}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-gray-700">₹{p.materialCost?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">₹{p.labourCost?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">₹{p.machineCost?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">₹{p.manufacturingOverhead?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">₹{p.packagingCost?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">₹{p.wastageCost?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-gray-900 text-sm">₹{p.totalManufacturingCost?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-primary-700 text-sm">₹{p.sellingPrice?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">+₹{p.profit?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{p.profitMargin?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'material-impact' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-3">Raw Material</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-3 text-right">Old Rate (₹)</th>
                    <th className="py-3 px-3 text-right">Current Rate (₹)</th>
                    <th className="py-3 px-3 text-right">Difference (₹)</th>
                    <th className="py-3 px-3 text-right">% Change</th>
                    <th className="py-3 px-3 text-center">Affected Components</th>
                    <th className="py-3 px-3 text-center">Affected Products</th>
                    <th className="py-3 px-3">Impacted Finished Products List</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{m.name}</td>
                      <td className="py-2.5 px-3 text-gray-500">{m.category}</td>
                      <td className="py-2.5 px-3 font-medium uppercase text-gray-600">{m.unit}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500">₹{m.previousPrice?.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-900">₹{m.currentPrice?.toFixed(2)}</td>
                      <td className={`py-2.5 px-3 text-right font-bold ${m.priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {m.priceDifference > 0 ? '+' : ''}₹{m.priceDifference?.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${m.priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {m.priceDifference > 0 ? '+' : ''}{m.priceDifferencePct?.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700">{m.affectedComponentsCount}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-purple-700">{m.affectedProductsCount}</td>
                      <td className="py-2.5 px-3 text-gray-600">{m.affectedProductsList || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'client-profit' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Client Name</th>
                    <th className="py-3 px-4">Client Code</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4 text-center">Configured Prices</th>
                    <th className="py-3 px-4 text-center">Units Sold</th>
                    <th className="py-3 px-4 text-right">Total Revenue (₹)</th>
                    <th className="py-3 px-4 text-right">Total Mfg Cost (₹)</th>
                    <th className="py-3 px-4 text-right">Net Profit (₹)</th>
                    <th className="py-3 px-4 text-right">Profit Margin (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-bold text-gray-900">{c.name}</td>
                      <td className="py-3 px-4 font-mono text-gray-500">{c.code}</td>
                      <td className="py-3 px-4 text-gray-600">{c.contact}</td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-700">{c.configuredProductsCount}</td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-700">{c.unitsSold}</td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">₹{c.totalRevenue?.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-gray-500">₹{c.totalCost?.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">+₹{c.totalProfit?.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">{c.profitMargin?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;

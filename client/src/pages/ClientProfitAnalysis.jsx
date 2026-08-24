import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiTrendingUp, FiUsers, FiDollarSign, FiPercent, 
  FiRefreshCw, FiPieChart, FiBarChart2 
} from 'react-icons/fi';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell 
} from 'recharts';

const ClientProfitAnalysis = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clients/profit-analysis');
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load client profit analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const details = data?.details || [];
  const clientSummaries = data?.clientSummaries || [];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <FiTrendingUp className="h-6 w-6" />
            </div>
            Client Profitability & Margin Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Comparative analysis of contract profitability, revenue contributions, and realized profit margins by client
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalysis}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiRefreshCw className="mr-2 h-4 w-4" /> Refresh
          </button>
          <Link
            to="/clients/pricing"
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm"
          >
            <FiDollarSign className="mr-1.5 h-4 w-4" /> Adjust Client Pricing
          </Link>
        </div>
      </div>

      {/* Visual Recharts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit by Client Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Total Profit by Enterprise Client</h2>
              <p className="text-xs text-gray-500">Realized historical net profit across all invoices</p>
            </div>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Loading charts...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientSummaries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="clientName" stroke="#94a3b8" fontSize={11} tickFormatter={(n) => n.split(' ')[0]} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]} />
                  <Legend />
                  <Bar dataKey="totalProfit" name="Total Profit (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Revenue by Client Chart */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Revenue Contribution by Client</h2>
              <p className="text-xs text-gray-500">Gross sales volume generated per client account</p>
            </div>
          </div>
          <div className="h-72">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Loading charts...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientSummaries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="clientName" stroke="#94a3b8" fontSize={11} tickFormatter={(n) => n.split(' ')[0]} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]} />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Revenue (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalCost" name="Total Cost (₹)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Client Accounts Summary Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Client Accounts Performance Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4 text-center">Units Sold</th>
                <th className="py-3.5 px-4 text-right">Total Revenue</th>
                <th className="py-3.5 px-4 text-right">Total Mfg Cost</th>
                <th className="py-3.5 px-4 text-right">Total Profit</th>
                <th className="py-3.5 px-4 text-right">Realized Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientSummaries.map((cs) => (
                <tr key={cs.clientId} className="hover:bg-gray-50/80">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{cs.clientName}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-gray-500">{cs.clientCode}</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-700">{cs.totalUnitsSold}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-gray-900">₹{cs.totalRevenue?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-right text-gray-500">₹{cs.totalCost?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-600 text-base">₹{cs.totalProfit?.toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                      {cs.averageMargin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Product-Wise Client Pricing & Margin Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-900">Product-Wise Contract Pricing & Profit Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Client</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4 text-right">Current Cost</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-right">Unit Profit</th>
                <th className="py-3.5 px-4 text-right">Markup %</th>
                <th className="py-3.5 px-4 text-right">Profit Margin %</th>
                <th className="py-3.5 px-4 text-right">Units Sold</th>
                <th className="py-3.5 px-4 text-right">Total Historical Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {details.map((d, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-bold text-gray-900">{d.clientName}</td>
                  <td className="py-3 px-4 font-medium text-gray-800">
                    <Link to={`/products/${d.productId}/cost`} className="hover:text-primary-600">
                      {d.productName}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-500">₹{d.currentManufacturingCost?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">₹{d.sellingPrice?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-600">+₹{d.unitProfit?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{d.markupPercentage?.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">{d.profitMarginPercentage?.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-700">{d.totalQuantitySold}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-900">₹{d.totalHistoricalProfit?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientProfitAnalysis;

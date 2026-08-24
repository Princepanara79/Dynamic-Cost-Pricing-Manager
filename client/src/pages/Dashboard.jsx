import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FiBox, FiTool, FiPackage, FiUsers, 
  FiTrendingUp, FiTrendingDown, FiAlertCircle, 
  FiDollarSign, FiPercent, FiArrowUpRight, FiArrowDownRight,
  FiRefreshCw, FiSliders, FiFileText
} from 'react-icons/fi';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, CartesianGrid, BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { toast } from 'react-hot-toast';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      setData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recentChanges = data?.recentPriceChanges || [];
  const attentionProducts = data?.productsRequiringAttention || [];
  const monthlyTrends = data?.monthlyTrends || [];
  const clientProfitData = data?.clientProfitData || [];

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manufacturing Cost & Pricing Operations</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time raw material price propagation, BOM rollups, and profit margins</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboard}
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <FiRefreshCw className="mr-2 h-4 w-4" /> Refresh
          </button>
          <Link
            to="/what-if"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <FiSliders className="mr-2 h-4 w-4" /> What-If Simulator
          </Link>
        </div>
      </div>

      {/* 11 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Products</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FiPackage className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.totalProducts || 0}</div>
          <Link to="/products" className="text-xs text-primary-600 hover:underline mt-1 inline-block font-medium">View all products →</Link>
        </div>

        {/* Total Components */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Components</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FiTool className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.totalComponents || 0}</div>
          <Link to="/components" className="text-xs text-primary-600 hover:underline mt-1 inline-block font-medium">View BOMs →</Link>
        </div>

        {/* Total Raw Materials */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Raw Materials</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FiBox className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.totalRawMaterials || 0}</div>
          <Link to="/raw-materials" className="text-xs text-primary-600 hover:underline mt-1 inline-block font-medium">Manage rates →</Link>
        </div>

        {/* Total Clients */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Clients</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FiUsers className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpis.totalClients || 0}</div>
          <Link to="/clients" className="text-xs text-primary-600 hover:underline mt-1 inline-block font-medium">Client pricing →</Link>
        </div>

        {/* Cost Increase Products */}
        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm bg-red-50/20">
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost Increased</span>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><FiTrendingUp className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-red-600">{kpis.productsCostIncrease || 0}</div>
          <Link to="/products/comparison?filter=increased" className="text-xs text-red-600 hover:underline mt-1 inline-block font-medium">Review impacts →</Link>
        </div>

        {/* Cost Decrease Products */}
        <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm bg-green-50/20">
          <div className="flex items-center justify-between text-green-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cost Decreased</span>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><FiTrendingDown className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-green-600">{kpis.productsCostDecrease || 0}</div>
          <Link to="/products/comparison?filter=decreased" className="text-xs text-green-600 hover:underline mt-1 inline-block font-medium">Review margins →</Link>
        </div>

        {/* Average Manufacturing Cost */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Mfg Cost</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FiDollarSign className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{kpis.averageManufacturingCost?.toLocaleString('en-IN') || 0}</div>
          <span className="text-xs text-gray-500 mt-1 inline-block">Across all active items</span>
        </div>

        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sales Revenue</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FiDollarSign className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-gray-900">₹{kpis.totalRevenue?.toLocaleString('en-IN') || 0}</div>
          <Link to="/sales" className="text-xs text-primary-600 hover:underline mt-1 inline-block font-medium">Sales records →</Link>
        </div>

        {/* Total Profit */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Profit</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FiTrendingUp className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">₹{kpis.totalProfit?.toLocaleString('en-IN') || 0}</div>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Locked cost basis</span>
        </div>

        {/* Average Profit Margin */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Margin</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FiPercent className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{kpis.averageProfitMargin || 0}%</div>
          <span className="text-xs text-gray-500 mt-1 inline-block">Realized sales margin</span>
        </div>

        {/* Recent Price Changes Count */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm col-span-1 sm:col-span-2">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Price Revisions Tracked</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><FiAlertCircle className="h-4 w-4" /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-bold text-gray-900">{kpis.recentPriceChangesCount || 0}</div>
            <span className="text-xs text-gray-500">Historical audit points recorded</span>
          </div>
          <Link to="/raw-materials/history" className="text-xs text-primary-600 hover:underline mt-1 inline-block font-medium">Explore price history charts →</Link>
        </div>
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Cost vs Profit */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Monthly Financial Overview</h2>
              <p className="text-xs text-gray-500">Historical Revenue, Manufacturing Cost, and Profit</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Locked Invariant</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, '']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="cost" name="Cost" stroke="#f43f5e" fillOpacity={0.3} fill="#f43f5e" />
                <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Profit Contribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Profit by Enterprise Client</h2>
              <p className="text-xs text-gray-500">Real-time margin analysis across client accounts</p>
            </div>
            <Link to="/clients/profit" className="text-xs text-primary-600 hover:underline font-medium">Full Analysis →</Link>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientProfitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickFormatter={(n) => n.split(' ')[0]} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(val, name) => [`₹${val.toLocaleString('en-IN')}`, name]} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Section: Products Requiring Attention & Recent RM Price Changes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Products Requiring Attention */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiAlertCircle className="text-amber-500 h-5 w-5" /> Products Requiring Attention
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Products with raw material price propagation impact or margin erosion</p>
            </div>
            <Link to="/products/comparison" className="text-xs text-primary-600 hover:underline font-medium">
              View Cost Comparison →
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 text-right">Old Cost</th>
                  <th className="py-3 px-4 text-right">New Cost</th>
                  <th className="py-3 px-4 text-right">Cost Diff</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Recommended</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attentionProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No cost changes detected. All product margins are steady.
                    </td>
                  </tr>
                ) : (
                  attentionProducts.map((p) => {
                    const isIncrease = p.costDifference > 0;
                    const isDecrease = p.costDifference < 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <Link to={`/products/${p.id}/cost`} className="hover:text-primary-600">
                            {p.name}
                          </Link>
                          <div className="text-xs text-gray-400">{p.sku}</div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">₹{p.oldCost?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">₹{p.newCost?.toFixed(2)}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                          <span className="inline-flex items-center gap-0.5">
                            {isIncrease && <FiArrowUpRight className="h-3.5 w-3.5" />}
                            {isDecrease && <FiArrowDownRight className="h-3.5 w-3.5" />}
                            {isIncrease ? '+' : ''}₹{p.costDifference?.toFixed(2)}
                          </span>
                          <div className="text-xs">({isIncrease ? '+' : ''}{p.costDifferencePct?.toFixed(1)}%)</div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-800">₹{p.currentSellingPrice?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium text-primary-700">₹{p.recommendedSellingPrice?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            to={`/products/${p.id}/cost`}
                            className="inline-flex items-center px-2.5 py-1 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded text-xs font-medium"
                          >
                            Breakdown
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Raw Material Price Changes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiTrendingUp className="text-primary-600 h-5 w-5" /> Recent Raw Material Price Changes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Automated propagation triggered from supplier price changes</p>
            </div>
            <Link to="/raw-materials/history" className="text-xs text-primary-600 hover:underline font-medium">
              View History Table →
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Old Price</th>
                  <th className="py-3 px-4 text-right">New Price</th>
                  <th className="py-3 px-4 text-right">Change</th>
                  <th className="py-3 px-4 text-right">Change %</th>
                  <th className="py-3 px-4 text-right">Updated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentChanges.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No price changes recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentChanges.map((c) => {
                    const isIncrease = c.difference > 0;
                    const isDecrease = c.difference < 0;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-900">
                          <Link to="/raw-materials" className="hover:text-primary-600">
                            {c.materialName}
                          </Link>
                          <span className="text-xs text-gray-400 ml-1">({c.unit})</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {c.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-500">₹{c.oldPrice?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">₹{c.newPrice?.toFixed(2)}</td>
                        <td className={`py-3 px-4 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                          {isIncrease ? '+' : ''}₹{c.difference?.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isIncrease ? 'bg-red-50 text-red-700' : isDecrease ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                            {isIncrease ? '+' : ''}{c.differencePct?.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-500">
                          {new Date(c.changedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

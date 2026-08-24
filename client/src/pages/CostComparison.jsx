import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiTrendingUp, FiTrendingDown, FiFilter, FiRefreshCw, 
  FiArrowUpRight, FiArrowDownRight, FiCheckCircle, FiPackage 
} from 'react-icons/fi';

const CostComparison = () => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/comparison', { params: { filter } });
      setItems(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load cost comparison');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <FiTrendingUp className="h-6 w-6" />
            </div>
            Product Cost Comparison Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Compare baseline vs revised manufacturing costs and recommended pricing adjustments
          </p>
        </div>

        <button
          onClick={fetchComparison}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FiRefreshCw className="mr-2 h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2 flex items-center gap-1">
          <FiFilter className="h-3.5 w-3.5" /> Filter by:
        </span>

        {[
          { key: 'all', label: 'All Products' },
          { key: 'increased', label: 'Increased Cost', icon: FiTrendingUp, color: 'text-red-600' },
          { key: 'decreased', label: 'Decreased Cost', icon: FiTrendingDown, color: 'text-green-600' },
          { key: 'unchanged', label: 'No Change', icon: FiCheckCircle, color: 'text-gray-500' },
          { key: 'highest_increase', label: 'Highest Absolute Increase' },
          { key: 'highest_pct_increase', label: 'Highest % Increase' }
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
              filter === btn.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {btn.icon && <btn.icon className={`h-3.5 w-3.5 ${filter === btn.key ? 'text-white' : btn.color}`} />}
            {btn.label}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Product Info</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Previous Cost</th>
                <th className="py-3.5 px-4 text-right">New Mfg Cost</th>
                <th className="py-3.5 px-4 text-right">Cost Difference</th>
                <th className="py-3.5 px-4 text-right">% Change</th>
                <th className="py-3.5 px-4 text-right">Old Rec. Price</th>
                <th className="py-3.5 px-4 text-right">New Rec. Price</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <FiRefreshCw className="animate-spin h-5 w-5 text-primary-600" />
                      <span>Loading comparison analysis...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No products matched this filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isIncrease = item.difference > 0;
                  const isDecrease = item.difference < 0;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link to={`/products/${item.id}/cost`} className="font-bold text-gray-900 hover:text-primary-600">
                          {item.name}
                        </Link>
                        <div className="text-xs text-gray-400 font-mono">{item.sku}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg">
                          {item.category || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-gray-500 font-medium">
                        ₹{item.oldCost?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-gray-900 text-base">
                        ₹{item.newCost?.toFixed(2)}
                      </td>

                      <td className={`py-3.5 px-4 text-right font-bold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className="inline-flex items-center gap-0.5">
                          {isIncrease && <FiArrowUpRight className="h-4 w-4" />}
                          {isDecrease && <FiArrowDownRight className="h-4 w-4" />}
                          {isIncrease ? '+' : ''}₹{item.difference?.toFixed(2)}
                        </span>
                      </td>

                      <td className={`py-3.5 px-4 text-right font-bold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${isIncrease ? 'bg-red-50 text-red-700' : isDecrease ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                          {isIncrease ? '+' : ''}{item.differencePct?.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-gray-500">
                        ₹{item.oldRecommendedPrice?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-primary-700 text-base">
                        ₹{item.newRecommendedPrice?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Link
                          to={`/products/${item.id}/cost`}
                          className="inline-flex items-center px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          Cost Tree
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
    </div>
  );
};

export default CostComparison;

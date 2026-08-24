import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiPackage, FiPlus, FiSearch, FiEdit2, FiCopy, 
  FiTrash2, FiTrendingUp, FiTrendingDown, FiRefreshCw, 
  FiPieChart, FiDollarSign, FiPercent, FiArchive, FiSliders 
} from 'react-icons/fi';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [costFilter, setCostFilter] = useState('all'); // all, increased, decreased, unchanged
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = { status };
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (costFilter !== 'all') params.costFilter = costFilter;
      if (search) params.search = search;

      const [prodRes, catRes] = await Promise.all([
        api.get('/products', { params }),
        api.get('/products/categories')
      ]);

      setProducts(prodRes.data);
      setCategories(['All', ...catRes.data]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, costFilter, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleDuplicate = async (prod) => {
    try {
      await api.post(`/products/${prod.id}/duplicate`);
      toast.success(`Duplicated '${prod.name}' successfully!`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to duplicate product');
    }
  };

  const handleDelete = async (prod) => {
    const isUsed = prod.salesCount > 0;
    const confirmMsg = isUsed
      ? `Product '${prod.name}' has ${prod.salesCount} historical sales recorded. It will be safely archived instead of deleted to preserve past transaction costs. Proceed?`
      : `Are you sure you want to delete '${prod.name}'?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.delete(`/products/${prod.id}`);
      toast.success(res.data.message);
      fetchProducts();
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
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FiPackage className="h-6 w-6" />
            </div>
            Finished Products Catalogue & Costing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-level BOM costing, packaging hierarchies, wastage formulas, and dynamic recommended selling prices
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="p-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            title="Refresh List"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
          <Link
            to="/products/add"
            className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiPlus className="mr-2 h-4 w-4" /> Add Finished Product
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by SKU, name, or description..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cost Movement Filter */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCostFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${costFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              All Items
            </button>
            <button
              onClick={() => setCostFilter('increased')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${costFilter === 'increased' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <FiTrendingUp className="h-3 w-3" /> Cost Up
            </button>
            <button
              onClick={() => setCostFilter('decreased')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${costFilter === 'decreased' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <FiTrendingDown className="h-3 w-3" /> Cost Down
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

          {/* Status Tab */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatus('active')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatus('archived')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${status === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Product Info</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-center">BOM Components</th>
                <th className="py-3.5 px-4 text-right">Mfg Cost</th>
                <th className="py-3.5 px-4 text-right">Cost Movement</th>
                <th className="py-3.5 px-4 text-right">Recommended Price</th>
                <th className="py-3.5 px-4 text-right">Actual Selling Price</th>
                <th className="py-3.5 px-4 text-right">Profit / Margin</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <div className="flex justify-center items-center gap-2">
                      <FiRefreshCw className="animate-spin h-5 w-5 text-primary-600" />
                      <span>Loading products costing...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isIncrease = p.costDifference > 0;
                  const isDecrease = p.costDifference < 0;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link to={`/products/${p.id}/cost`} className="font-bold text-gray-900 hover:text-primary-600 block">
                          {p.name}
                        </Link>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{p.sku}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg">
                          {p.category || 'General'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                          {p.componentsCount} Component{p.componentsCount !== 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-gray-900 text-base">
                        ₹{p.manufacturingCost?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {p.costDifference !== 0 ? (
                          <div className={`font-semibold text-xs ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                            <span className="inline-flex items-center gap-0.5">
                              {isIncrease && <FiTrendingUp className="h-3 w-3" />}
                              {isDecrease && <FiTrendingDown className="h-3 w-3" />}
                              {isIncrease ? '+' : ''}₹{p.costDifference?.toFixed(2)}
                            </span>
                            <div>({isIncrease ? '+' : ''}{p.costDifferencePct?.toFixed(1)}%)</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">No Change</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-primary-700">
                        ₹{p.recommendedSellingPrice?.toFixed(2)}
                        <span className="text-xs text-gray-400 block font-normal capitalize">
                          {p.profitType} {p.profitPercentage}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                        ₹{p.currentSellingPrice?.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-emerald-600">
                          +₹{p.profit?.toFixed(2)}
                        </div>
                        <div className="text-xs font-medium text-gray-500">
                          {p.profitMargin?.toFixed(1)}% margin
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Cost Breakdown */}
                          <Link
                            to={`/products/${p.id}/cost`}
                            className="inline-flex items-center px-2.5 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-xs font-bold transition-colors"
                            title="Deep Cost Breakdown Tree"
                          >
                            <FiPieChart className="mr-1 h-3.5 w-3.5" /> Breakdown
                          </Link>

                          {/* Edit */}
                          <Link
                            to={`/products/edit/${p.id}`}
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Product Details & BOM"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </Link>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(p)}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Duplicate Product"
                          >
                            <FiCopy className="h-4 w-4" />
                          </button>

                          {/* Archive/Delete */}
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={p.salesCount > 0 ? "Archive Product" : "Delete Product"}
                          >
                            {p.salesCount > 0 ? <FiArchive className="h-4 w-4" /> : <FiTrash2 className="h-4 w-4" />}
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
    </div>
  );
};

export default Products;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiCheckCircle, FiTrendingUp, FiTrendingDown, FiX, FiRefreshCw } from 'react-icons/fi';

const PriceUpdateModal = ({ material, isOpen, onClose, onUpdated }) => {
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (material) {
      setNewPrice(material.currentPrice?.toString() || '');
      setReason('');
      setPreview(null);
    }
  }, [material]);

  const handlePriceChange = async (val) => {
    setNewPrice(val);
    if (!val || isNaN(Number(val)) || Number(val) < 0) {
      setPreview(null);
      return;
    }

    try {
      setLoadingPreview(true);
      const res = await api.get(`/raw-materials/${material.id}/impact-preview?newPrice=${val}`);
      setPreview(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmUpdate = async () => {
    if (!newPrice || isNaN(Number(newPrice)) || Number(newPrice) < 0) {
      toast.error('Please enter a valid positive price');
      return;
    }

    try {
      setUpdating(true);
      const res = await api.put(`/raw-materials/${material.id}/price`, {
        newPrice: Number(newPrice),
        reason: reason || undefined
      });
      toast.success(res.data.message || 'Price updated & costs recalculated!');
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update price');
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen || !material) return null;

  const oldPrice = Number(material.currentPrice);
  const parsedNewPrice = Number(newPrice) || oldPrice;
  const diff = parsedNewPrice - oldPrice;
  const pctChange = oldPrice > 0 ? (diff / oldPrice) * 100 : 0;
  const isIncrease = diff > 0;
  const isDecrease = diff < 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FiX className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FiAlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Update Raw Material Price & Recalculate</h3>
            <p className="text-xs text-gray-500">
              Automatic price propagation across all child components & finished products
            </p>
          </div>
        </div>

        {/* Message Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 text-sm text-amber-900">
          <span className="font-semibold">Confirmation Notice: </span>
          You are changing <span className="font-bold underline">{material.name}</span> from{' '}
          <span className="font-bold">₹{oldPrice.toFixed(2)}/{material.unit}</span> to{' '}
          <span className="font-bold text-amber-950">₹{parsedNewPrice.toFixed(2)}/{material.unit}</span>.
        </div>

        {/* Price Input & Reason Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              New Price per {material.unit} (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                placeholder="Enter new price"
                className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Adjustment Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Supplier Q2 tariff revision"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Real-time Propagation Impact Summary */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Real-Time Impact Simulation
            </h4>
            {loadingPreview && (
              <span className="text-xs text-primary-600 flex items-center gap-1 font-medium">
                <FiRefreshCw className="animate-spin h-3 w-3" /> Calculating propagation...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">Current Price</div>
              <div className="text-base font-bold text-gray-800">₹{oldPrice.toFixed(2)}</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">New Price</div>
              <div className="text-base font-bold text-primary-700">₹{parsedNewPrice.toFixed(2)}</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">Difference</div>
              <div className={`text-base font-bold flex items-center justify-center gap-0.5 ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-700'}`}>
                {isIncrease && <FiTrendingUp className="h-4 w-4" />}
                {isDecrease && <FiTrendingDown className="h-4 w-4" />}
                {isIncrease ? '+' : ''}₹{diff.toFixed(2)}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-500">% Change</div>
              <div className={`text-base font-bold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-700'}`}>
                {isIncrease ? '+' : ''}{pctChange.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Counts of affected entities */}
          <div className="flex items-center justify-around bg-white p-3 rounded-lg border border-gray-200 text-sm">
            <div>
              <span className="text-gray-500">Components Affected: </span>
              <span className="font-bold text-gray-900">{preview?.affectedComponentsCount ?? material.componentsCount ?? 0}</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div>
              <span className="text-gray-500">Products Affected: </span>
              <span className="font-bold text-primary-700">{preview?.affectedProductsCount ?? preview?.productImpacts?.length ?? 0}</span>
            </div>
          </div>

          {/* Affected Products Mini Table */}
          {preview?.productImpacts && preview.productImpacts.length > 0 && (
            <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3 text-right">Old Cost</th>
                    <th className="py-2 px-3 text-right">New Cost</th>
                    <th className="py-2 px-3 text-right">Cost Diff</th>
                    <th className="py-2 px-3 text-right">New Rec. Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.productImpacts.map(p => (
                    <tr key={p.id}>
                      <td className="py-1.5 px-3 font-medium text-gray-800">{p.name}</td>
                      <td className="py-1.5 px-3 text-right text-gray-500">₹{p.oldCost?.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-right font-semibold text-gray-900">₹{p.newCost?.toFixed(2)}</td>
                      <td className="py-1.5 px-3 text-right font-semibold text-red-600">
                        +{p.costDifference?.toFixed(2)} ({p.costDifferencePct?.toFixed(1)}%)
                      </td>
                      <td className="py-1.5 px-3 text-right font-bold text-primary-700">₹{p.newRecommendedSellingPrice?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmUpdate}
            disabled={updating || !newPrice || Number(newPrice) === oldPrice}
            className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {updating ? (
              <>
                <FiRefreshCw className="animate-spin mr-2 h-4 w-4" /> Recalculating...
              </>
            ) : (
              <>
                <FiCheckCircle className="mr-2 h-4 w-4" /> Update & Recalculate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceUpdateModal;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiDollarSign, FiX, FiPackage, FiUsers, FiCalendar, FiLock } from 'react-icons/fi';

const AddSaleModal = ({ isOpen, onClose, onSaved }) => {
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [clientId, setClientId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const init = async () => {
        try {
          const [cRes, pRes] = await Promise.all([
            api.get('/clients'),
            api.get('/products')
          ]);
          setClients(cRes.data);
          setProducts(pRes.data);

          if (cRes.data.length > 0) setClientId(cRes.data[0].id.toString());
          if (pRes.data.length > 0) {
            setProductId(pRes.data[0].id.toString());
            setSelectedProduct(pRes.data[0]);
            setSellingPrice(pRes.data[0].currentSellingPrice?.toString() || '');
          }
        } catch (err) {
          console.error(err);
        }
      };
      init();
    }
  }, [isOpen]);

  // When client or product changes, look for client-specific price
  useEffect(() => {
    if (!clientId || !productId) return;

    const prod = products.find(p => p.id.toString() === productId);
    setSelectedProduct(prod || null);

    const checkClientPrice = async () => {
      try {
        const res = await api.get('/client-prices', {
          params: { clientId, productId }
        });
        if (res.data && res.data.length > 0) {
          setSellingPrice(res.data[0].sellingPrice.toString());
        } else if (prod) {
          setSellingPrice(prod.currentSellingPrice?.toString() || prod.recommendedSellingPrice?.toString() || '');
        }
      } catch (err) {
        if (prod) setSellingPrice(prod.currentSellingPrice?.toString() || '');
      }
    };
    checkClientPrice();
  }, [clientId, productId, products]);

  const qty = Number(quantity) || 0;
  const price = Number(sellingPrice) || 0;
  const unitCostAtSale = selectedProduct ? Number(selectedProduct.manufacturingCost) || 0 : 0;
  const revenue = qty * price;
  const totalCost = qty * unitCostAtSale;
  const profit = revenue - totalCost;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clientId || !productId || qty <= 0 || price < 0) {
      toast.error('Please enter valid client, product, quantity, and price');
      return;
    }

    try {
      setSaving(true);
      await api.post('/sales', {
        clientId: Number(clientId),
        productId: Number(productId),
        quantity: qty,
        sellingPrice: price,
        date,
        notes: notes || undefined
      });
      toast.success('Sale transaction logged with locked historical cost basis!');
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to record sale');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FiDollarSign className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Record Sales Invoice / Transaction</h3>
            <p className="text-xs text-gray-500">Locks in current unit manufacturing cost permanently for historical accounting</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Client Account <span className="text-red-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Finished Product <span className="text-red-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Quantity Sold <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Unit Selling Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Locked Cost Snapshot Callout */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-bold mb-1">
              <FiLock className="h-4 w-4 text-amber-600" />
              Locked Historical Cost Snapshot: ₹{unitCostAtSale.toFixed(2)}/unit
            </div>
            <p className="text-amber-800">
              Future raw-material tariff changes will not alter this sale transaction's recorded cost basis.
            </p>
          </div>

          {/* Financial Totals Preview */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-gray-500">Gross Revenue:</span>
              <div className="font-extrabold text-gray-900 text-sm mt-0.5">₹{revenue.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Total Mfg Cost:</span>
              <div className="font-extrabold text-gray-700 text-sm mt-0.5">₹{totalCost.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Invoice Net Profit:</span>
              <div className="font-black text-emerald-600 text-sm mt-0.5">
                +₹{profit.toFixed(2)} ({marginPct.toFixed(1)}%)
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Invoice / PO Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Batch #2026-Q1 PO-4481"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              {saving ? 'Recording Sale...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSaleModal;

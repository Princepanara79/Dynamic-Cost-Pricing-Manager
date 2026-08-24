import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiBox, FiX } from 'react-icons/fi';

const CATEGORIES = ['Metal', 'Plastic', 'Chemical', 'Rubber', 'Glass', 'Packaging', 'Fastener', 'Electrical', 'Other'];
const UNITS = ['kg', 'gram', 'mg', 'litre', 'ml', 'piece', 'unit'];

const RawMaterialModal = ({ isOpen, onClose, material, onSaved }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Metal',
    unit: 'kg',
    currentPrice: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name || '',
        category: material.category || 'Metal',
        unit: material.unit || 'kg',
        currentPrice: material.currentPrice?.toString() || '',
        description: material.description || ''
      });
    } else {
      setFormData({
        name: '',
        category: 'Metal',
        unit: 'kg',
        currentPrice: '',
        description: ''
      });
    }
  }, [material, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.currentPrice === '') {
      toast.error('Material name and price are required');
      return;
    }

    try {
      setSaving(true);
      if (material) {
        // Edit details
        await api.put(`/raw-materials/${material.id}`, {
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          description: formData.description
        });
        toast.success('Raw material updated successfully');
      } else {
        // Create new
        await api.post('/raw-materials', {
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          currentPrice: Number(formData.currentPrice),
          description: formData.description
        });
        toast.success('Raw material created successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Operation failed');
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
          <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
            <FiBox className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {material ? 'Edit Raw Material' : 'Add New Raw Material'}
            </h3>
            <p className="text-xs text-gray-500">
              {material ? 'Update specifications and category' : 'Register a new base raw material with starting rate'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Material Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Cold Rolled Steel Sheet 2mm"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Base Unit
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              >
                {UNITS.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {!material && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Initial Rate per {formData.unit} (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Description / Supplier Specs
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Grade 304, high corrosion resistance, supplier ISO 9001 certified"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            ></textarea>
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
              {saving ? 'Saving...' : material ? 'Save Changes' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RawMaterialModal;

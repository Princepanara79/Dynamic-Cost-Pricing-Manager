import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiTool, FiPlus, FiTrash2, FiArrowLeft, FiSave, FiDollarSign } from 'react-icons/fi';

const UNIT_CONVERSIONS = {
  // Mass to kg
  kg: 1, kilogram: 1, gram: 0.001, grams: 0.001, g: 0.001, mg: 0.000001,
  // Volume to litre
  litre: 1, liter: 1, l: 1, ml: 0.001,
  // Count to piece
  piece: 1, pc: 1, pcs: 1, unit: 1, units: 1
};

// Client-side quick calculation helper for instantaneous typing preview
const calculateLineCost = (quantity, usageUnit, materialRate, materialUnit) => {
  const q = Number(quantity) || 0;
  const r = Number(materialRate) || 0;
  if (q <= 0 || r <= 0) return 0;

  const uNorm = (usageUnit || '').toLowerCase();
  const mNorm = (materialUnit || '').toLowerCase();

  const uFactor = UNIT_CONVERSIONS[uNorm] || 1;
  const mFactor = UNIT_CONVERSIONS[mNorm] || 1;

  // Convert quantity to base unit, then compare to material base
  const quantityInMaterialUnit = (q * uFactor) / mFactor;
  return quantityInMaterialUnit * r;
};

const ComponentForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [rawMaterials, setRawMaterials] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [additionalCost, setAdditionalCost] = useState('0');
  const [materialsList, setMaterialsList] = useState([
    { rawMaterialId: '', quantity: '1', unit: 'kg', cost: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch available raw materials
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const rmRes = await api.get('/raw-materials');
        setRawMaterials(rmRes.data);

        if (isEdit) {
          const compRes = await api.get(`/components/${id}`);
          const comp = compRes.data;
          setName(comp.name);
          setDescription(comp.description || '');
          setAdditionalCost(comp.additionalCost?.toString() || '0');
          if (comp.materials && comp.materials.length > 0) {
            setMaterialsList(comp.materials.map(m => ({
              rawMaterialId: m.rawMaterialId.toString(),
              quantity: m.quantity.toString(),
              unit: m.unit,
              cost: m.cost
            })));
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  const handleAddMaterialRow = () => {
    const defaultRm = rawMaterials.length > 0 ? rawMaterials[0] : null;
    setMaterialsList([
      ...materialsList,
      {
        rawMaterialId: defaultRm ? defaultRm.id.toString() : '',
        quantity: '1',
        unit: defaultRm ? defaultRm.unit : 'kg',
        cost: defaultRm ? Number(defaultRm.currentPrice) : 0
      }
    ]);
  };

  const handleRemoveMaterialRow = (index) => {
    if (materialsList.length <= 1) {
      toast.error('At least one raw material is required for the component BOM');
      return;
    }
    const updated = materialsList.filter((_, i) => i !== index);
    setMaterialsList(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updated = [...materialsList];
    updated[index][field] = value;

    // If raw material selected, sync default unit
    if (field === 'rawMaterialId') {
      const selected = rawMaterials.find(r => r.id.toString() === value);
      if (selected) {
        updated[index].unit = selected.unit;
      }
    }

    // Recalculate line cost live
    const rm = rawMaterials.find(r => r.id.toString() === updated[index].rawMaterialId);
    if (rm) {
      const calculated = calculateLineCost(
        updated[index].quantity,
        updated[index].unit,
        rm.currentPrice,
        rm.unit
      );
      updated[index].cost = calculated;
    }

    setMaterialsList(updated);
  };

  // Compute live totals
  const totalMaterialCost = materialsList.reduce((acc, row) => acc + (Number(row.cost) || 0), 0);
  const totalProcessingCost = Number(additionalCost) || 0;
  const totalComponentCost = totalMaterialCost + totalProcessingCost;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Component name is required');
      return;
    }

    // Validate rows
    for (let i = 0; i < materialsList.length; i++) {
      const row = materialsList[i];
      if (!row.rawMaterialId) {
        toast.error(`Please select a raw material in row #${i + 1}`);
        return;
      }
      if (!row.quantity || Number(row.quantity) <= 0) {
        toast.error(`Quantity in row #${i + 1} must be greater than zero`);
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        name,
        description,
        additionalCost: Number(additionalCost) || 0,
        materials: materialsList.map(m => ({
          rawMaterialId: Number(m.rawMaterialId),
          quantity: Number(m.quantity),
          unit: m.unit
        }))
      };

      if (isEdit) {
        await api.put(`/components/${id}`, payload);
        toast.success('Component BOM updated & parent products recalculated!');
      } else {
        await api.post('/components', payload);
        toast.success('Component BOM created successfully!');
      }
      navigate('/components');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save component');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/components" className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Component BOM' : 'Build New Component BOM'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Specify raw material compositions with automatic unit conversion (kg/gram/mg/litre/ml/piece)
            </p>
          </div>
        </div>

        {/* Live Total Cost Badge */}
        <div className="text-right bg-primary-50 px-4 py-2 rounded-xl border border-primary-100">
          <div className="text-xs font-semibold text-primary-600 uppercase">Total Component Cost</div>
          <div className="text-2xl font-extrabold text-primary-700">₹{totalComponentCost.toFixed(2)}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiTool className="text-primary-600" /> Component Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Component Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Metal Frame, Seat Assembly, Caster Base"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Additional Processing Cost (₹)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description / Engineering Notes
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Welded tubular assembly with anti-rust phosphate bath"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Dynamic Raw Materials Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Raw Materials Bill of Materials (BOM)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Add materials, specify quantity and unit. The rate and cost calculate in real-time.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddMaterialRow}
              className="inline-flex items-center px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold transition-colors"
            >
              <FiPlus className="mr-1.5 h-4 w-4" /> Add Raw Material
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 w-5/12">Raw Material</th>
                  <th className="py-3 px-4 w-2/12">Quantity</th>
                  <th className="py-3 px-4 w-2/12">Usage Unit</th>
                  <th className="py-3 px-4 w-2/12 text-right">Current Rate</th>
                  <th className="py-3 px-4 w-2/12 text-right">Cost (₹)</th>
                  <th className="py-3 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {materialsList.map((row, idx) => {
                  const selectedRm = rawMaterials.find(r => r.id.toString() === row.rawMaterialId);
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      {/* Material Selector */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.rawMaterialId}
                          onChange={(e) => handleRowChange(idx, 'rawMaterialId', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">-- Select Material --</option>
                          {rawMaterials.map(rm => (
                            <option key={rm.id} value={rm.id}>
                              {rm.name} (₹{Number(rm.currentPrice).toFixed(2)}/{rm.unit})
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-4">
                        <input
                          type="number"
                          step="0.001"
                          min="0.0001"
                          required
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 text-right focus:ring-2 focus:ring-primary-500"
                        />
                      </td>

                      {/* Unit */}
                      <td className="py-2.5 px-4">
                        <select
                          value={row.unit}
                          onChange={(e) => handleRowChange(idx, 'unit', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="kg">kg</option>
                          <option value="gram">gram (g)</option>
                          <option value="mg">mg</option>
                          <option value="litre">litre (L)</option>
                          <option value="ml">ml</option>
                          <option value="piece">piece (pc)</option>
                          <option value="unit">unit</option>
                        </select>
                      </td>

                      {/* Current Rate */}
                      <td className="py-2.5 px-4 text-right font-medium text-gray-600">
                        {selectedRm ? `₹${Number(selectedRm.currentPrice).toFixed(2)}/${selectedRm.unit}` : '—'}
                      </td>

                      {/* Calculated Cost */}
                      <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                        ₹{(Number(row.cost) || 0).toFixed(2)}
                      </td>

                      {/* Delete Row */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterialRow(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Remove Material"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* BOM Summary Footer */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-500">
              Formula: <span className="font-semibold text-gray-700">Material Cost = Quantity × Converted Rate</span> + Processing Cost
            </div>

            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-gray-500">Sum of Materials: </span>
                <span className="font-bold text-gray-900">₹{totalMaterialCost.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Additional Processing: </span>
                <span className="font-bold text-gray-900">₹{totalProcessingCost.toFixed(2)}</span>
              </div>
              <div className="text-base font-extrabold text-primary-700 border-l border-gray-300 pl-4">
                Total: ₹{totalComponentCost.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            to="/components"
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 transition-colors"
          >
            <FiSave className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Component BOM' : 'Create Component BOM'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ComponentForm;

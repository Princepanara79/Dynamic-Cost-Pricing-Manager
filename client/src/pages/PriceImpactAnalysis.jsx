import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiAlertTriangle, FiTrendingUp, FiTrendingDown, FiBox, 
  FiTool, FiPackage, FiArrowRight, FiSliders, FiDollarSign, FiRefreshCw 
} from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const PriceImpactAnalysis = () => {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [targetNewPrice, setTargetNewPrice] = useState('');
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await api.get('/raw-materials');
        setMaterials(res.data);
        if (res.data.length > 0) {
          setSelectedMaterialId(res.data[0].id.toString());
          setTargetNewPrice((Number(res.data[0].currentPrice) * 1.15).toFixed(2)); // default +15% simulation
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMaterials();
  }, []);

  const handleRunAnalysis = async (matId, price) => {
    if (!matId || !price || isNaN(Number(price))) return;

    try {
      setLoading(true);
      const res = await api.get(`/raw-materials/${matId}/impact-preview?newPrice=${price}`);
      setImpactData(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to calculate price impact');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMaterialId && targetNewPrice) {
      handleRunAnalysis(selectedMaterialId, targetNewPrice);
    }
  }, [selectedMaterialId]);

  const handleMaterialChange = (matId) => {
    setSelectedMaterialId(matId);
    const m = materials.find(x => x.id.toString() === matId);
    if (m) {
      setTargetNewPrice((Number(m.currentPrice) * 1.15).toFixed(2));
    }
  };

  const chartData = impactData?.productImpacts?.map(p => ({
    name: p.name.split(' ')[0],
    oldCost: p.oldCost,
    newCost: p.newCost,
    newRecommended: p.newRecommendedSellingPrice,
    sellingPrice: p.currentSellingPrice
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <FiAlertTriangle className="h-6 w-6" />
            </div>
            Price Impact & Propagation Analysis
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Simulate supplier tariff revisions to visualize downstream component & finished product margin impact
          </p>
        </div>

        <button
          onClick={() => handleRunAnalysis(selectedMaterialId, targetNewPrice)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-primary-700 transition-colors"
        >
          <FiRefreshCw className="mr-2 h-4 w-4" /> Recalculate Simulation
        </button>
      </div>

      {/* Interactive Simulation Controls Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            1. Select Raw Material to Simulate:
          </label>
          <select
            value={selectedMaterialId}
            onChange={(e) => handleMaterialChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} (Current: ₹{Number(m.currentPrice).toFixed(2)}/{m.unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            2. Proposed Simulated Rate (₹):
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 font-bold">₹</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={targetNewPrice}
              onChange={(e) => setTargetNewPrice(e.target.value)}
              onBlur={() => handleRunAnalysis(selectedMaterialId, targetNewPrice)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-base font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            {[10, 20, -10].map(pct => (
              <button
                key={pct}
                type="button"
                onClick={() => {
                  const m = materials.find(x => x.id.toString() === selectedMaterialId);
                  if (m) {
                    const sim = (Number(m.currentPrice) * (1 + pct / 100)).toFixed(2);
                    setTargetNewPrice(sim);
                    handleRunAnalysis(selectedMaterialId, sim);
                  }
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
              >
                {pct > 0 ? `+${pct}%` : `${pct}%`} Quick
              </button>
            ))}
          </div>
        </div>
      </div>

      {impactData && (
        <>
          {/* Material Delta Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Base Rate Shift</span>
              <div className="text-xl font-bold text-gray-900 mt-1">
                ₹{impactData.rawMaterial.oldPrice?.toFixed(2)} → <strong className="text-primary-700">₹{impactData.rawMaterial.newPrice?.toFixed(2)}</strong>
              </div>
              <span className="text-xs text-gray-400 mt-0.5 block">per {impactData.rawMaterial.unit}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Simulated Net Delta</span>
              <div className={`text-xl font-black mt-1 ${impactData.rawMaterial.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {impactData.rawMaterial.difference > 0 ? '+' : ''}₹{impactData.rawMaterial.difference?.toFixed(2)} ({impactData.rawMaterial.differencePct?.toFixed(1)}%)
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Affected Components</span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {impactData.affectedComponentsCount}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Affected Products</span>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {impactData.affectedProductsCount}
              </div>
            </div>
          </div>

          {/* Visual Bar Comparison */}
          {chartData.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Product Cost & Recommended Price Impact</h2>
                  <p className="text-xs text-gray-500">Side-by-side comparison of baseline cost, simulated cost, and new recommended selling price</p>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(val, name) => [`₹${val.toFixed(2)}`, name]} />
                    <Legend />
                    <Bar dataKey="oldCost" name="Baseline Cost (₹)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="newCost" name="Simulated Cost (₹)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="newRecommended" name="New Rec. Price (₹)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Affected Products Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FiPackage className="text-primary-600" /> Affected Finished Products Impact Breakdown
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-right">Old Cost</th>
                    <th className="py-3 px-4 text-right">New Cost</th>
                    <th className="py-3 px-4 text-right">Cost Difference</th>
                    <th className="py-3 px-4 text-right">Current Selling Price</th>
                    <th className="py-3 px-4 text-right">New Recommended Price</th>
                    <th className="py-3 px-4 text-right">Profit Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {impactData.productImpacts?.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500">
                        No products are affected by this raw material.
                      </td>
                    </tr>
                  ) : (
                    impactData.productImpacts?.map((p) => {
                      const isIncrease = p.costDifference > 0;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80">
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {p.name}
                            <div className="text-xs text-gray-400 font-mono font-normal">{p.sku}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right text-gray-500 font-medium">₹{p.oldCost?.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-gray-900">₹{p.newCost?.toFixed(2)}</td>
                          <td className={`py-3.5 px-4 text-right font-bold ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                            {isIncrease ? '+' : ''}₹{p.costDifference?.toFixed(2)} ({isIncrease ? '+' : ''}{p.costDifferencePct?.toFixed(1)}%)
                          </td>
                          <td className="py-3.5 px-4 text-right text-gray-700 font-medium">₹{p.currentSellingPrice?.toFixed(2)}</td>
                          <td className="py-3.5 px-4 text-right font-black text-primary-700 text-base">₹{p.newRecommendedSellingPrice?.toFixed(2)}</td>
                          <td className={`py-3.5 px-4 text-right font-semibold ${p.profitDifference < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {p.profitDifference > 0 ? '+' : ''}₹{p.profitDifference?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Affected Components Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FiTool className="text-blue-600" /> Affected Component Assemblies
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Component Name</th>
                    <th className="py-3 px-4 text-right">Old Component Cost</th>
                    <th className="py-3 px-4 text-right">New Component Cost</th>
                    <th className="py-3 px-4 text-right">Difference (₹)</th>
                    <th className="py-3 px-4 text-right">% Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {impactData.componentImpacts?.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-gray-500">
                        No components directly use this raw material.
                      </td>
                    </tr>
                  ) : (
                    impactData.componentImpacts?.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-bold text-gray-900">{c.name}</td>
                        <td className="py-3 px-4 text-right text-gray-500 font-medium">₹{c.oldCost?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-gray-900">₹{c.newCost?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">+₹{c.difference?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-red-600">+{c.differencePct?.toFixed(1)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceImpactAnalysis;

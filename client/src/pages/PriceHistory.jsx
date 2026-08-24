import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { FiTrendingUp, FiCalendar, FiBox, FiArrowUpRight, FiArrowDownRight, FiRefreshCw } from 'react-icons/fi';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const PriceHistory = () => {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [history, setHistory] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await api.get('/raw-materials');
        setMaterials(res.data);
        if (res.data.length > 0) {
          setSelectedMaterialId(res.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load materials');
      }
    };
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (!selectedMaterialId) return;

    const fetchHistory = async () => {
      try {
        setLoading(true);
        const [histRes, matRes] = await Promise.all([
          api.get(`/raw-materials/${selectedMaterialId}/history`),
          api.get(`/raw-materials/${selectedMaterialId}`)
        ]);
        setHistory(histRes.data);
        setSelectedMaterial(matRes.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [selectedMaterialId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FiTrendingUp className="h-6 w-6" />
            </div>
            Raw Material Price History Explorer
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze historical supplier price movements and audit trails over time
          </p>
        </div>

        {/* Material Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
            Select Material:
          </label>
          <select
            value={selectedMaterialId}
            onChange={(e) => setSelectedMaterialId(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 min-w-56"
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category} - {m.unit})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedMaterial && (
        <>
          {/* Material Stats Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Current Rate</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ₹{selectedMaterial.currentPrice?.toFixed(2)}
                <span className="text-xs text-gray-400 font-normal ml-1">/{selectedMaterial.unit}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Previous Rate</span>
              <div className="text-2xl font-bold text-gray-600 mt-1">
                {selectedMaterial.previousPrice ? `₹${selectedMaterial.previousPrice.toFixed(2)}` : '—'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Net Change</span>
              <div className={`text-2xl font-bold mt-1 ${selectedMaterial.priceChange > 0 ? 'text-red-600' : selectedMaterial.priceChange < 0 ? 'text-green-600' : 'text-gray-700'}`}>
                {selectedMaterial.priceChange > 0 ? '+' : ''}₹{selectedMaterial.priceChange?.toFixed(2) || '0.00'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <span className="text-xs text-gray-500 uppercase font-semibold">Components Affected</span>
              <div className="text-2xl font-bold text-primary-700 mt-1">
                {selectedMaterial.affectedComponents?.length || 0}
              </div>
            </div>
          </div>

          {/* Recharts Trend Line Graph */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {selectedMaterial.name} — Price Movement Timeline
                </h2>
                <p className="text-xs text-gray-500">Track how the cost rate per {selectedMaterial.unit} shifted over time</p>
              </div>
            </div>

            <div className="h-80">
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400">Loading timeline data...</div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">No price records available.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(val) => [`₹${val.toFixed(2)} / ${selectedMaterial.unit}`, 'Price']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="newPrice"
                      name={`Rate (₹/${selectedMaterial.unit})`}
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#6366f1' }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Historical Log Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-900">Complete Historical Price Ledger</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-right">Previous Rate</th>
                    <th className="py-3 px-4 text-right">New Rate</th>
                    <th className="py-3 px-4 text-right">Difference (₹)</th>
                    <th className="py-3 px-4 text-right">% Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-gray-500">
                        No historical records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => {
                      const isIncrease = h.difference > 0;
                      const isDecrease = h.difference < 0;
                      return (
                        <tr key={h.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-800 flex items-center gap-2">
                            <FiCalendar className="text-gray-400" />
                            {new Date(h.changedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-500">₹{h.previousPrice?.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-bold text-gray-900">₹{h.newPrice?.toFixed(2)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-700'}`}>
                            {isIncrease ? '+' : ''}₹{h.difference?.toFixed(2)}
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-700'}`}>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isIncrease ? 'bg-red-50 text-red-700' : isDecrease ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                              {isIncrease && <FiArrowUpRight className="mr-0.5" />}
                              {isDecrease && <FiArrowDownRight className="mr-0.5" />}
                              {isIncrease ? '+' : ''}{h.changePct?.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
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

export default PriceHistory;

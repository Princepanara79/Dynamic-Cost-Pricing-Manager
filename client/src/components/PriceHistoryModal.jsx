import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiTrendingUp, FiX, FiCalendar, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const PriceHistoryModal = ({ isOpen, onClose, material }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (material && isOpen) {
      const fetchHistory = async () => {
        try {
          setLoading(true);
          const res = await api.get(`/raw-materials/${material.id}/history`);
          setHistory(res.data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [material, isOpen]);

  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
        >
          <FiX className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FiTrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Price History: {material.name}
            </h3>
            <p className="text-xs text-gray-500">
              Historical rate trend ({material.unit}) and complete revision ledger
            </p>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-5">
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-400">Loading history...</div>
            ) : history.length <= 1 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Only 1 historical price recorded. Price trend line will populate as new supplier rates are logged.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(val) => [`₹${val.toFixed(2)}/${material.unit}`, 'Price']} />
                  <Legend />
                  <Line type="monotone" dataKey="newPrice" name="Rate (₹)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 font-semibold sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Previous Price</th>
                <th className="py-2.5 px-3 text-right">New Price</th>
                <th className="py-2.5 px-3 text-right">Difference</th>
                <th className="py-2.5 px-3 text-right">% Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((h) => {
                const isIncrease = h.difference > 0;
                const isDecrease = h.difference < 0;
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-700 flex items-center gap-1.5">
                      <FiCalendar className="text-gray-400" />
                      {new Date(h.changedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-500">₹{h.previousPrice?.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right font-bold text-gray-900">₹{h.newPrice?.toFixed(2)}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                      {isIncrease ? '+' : ''}₹{h.difference?.toFixed(2)}
                    </td>
                    <td className={`py-2 px-3 text-right font-semibold ${isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-600'}`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isIncrease ? 'bg-red-50 text-red-700' : isDecrease ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'}`}>
                        {isIncrease && <FiArrowUpRight className="mr-0.5" />}
                        {isDecrease && <FiArrowDownRight className="mr-0.5" />}
                        {isIncrease ? '+' : ''}{h.changePct?.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryModal;

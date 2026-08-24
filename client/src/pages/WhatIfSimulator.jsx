import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiSliders, FiSave, FiRefreshCw, FiArrowRight, FiCheckCircle, 
  FiAlertCircle, FiFolder, FiTrash2, FiDollarSign, FiPercent, FiPackage 
} from 'react-icons/fi';

const WhatIfSimulator = () => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productDetails, setProductDetails] = useState(null);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Simulation Overrides
  const [rmPriceOverrides, setRmPriceOverrides] = useState({});
  const [compQtyOverrides, setCompQtyOverrides] = useState({});
  const [labour, setLabour] = useState('');
  const [machine, setMachine] = useState('');
  const [overhead, setOverhead] = useState('');
  const [packaging, setPackaging] = useState('');
  const [transport, setTransport] = useState('');
  const [wastage, setWastage] = useState('');
  const [profitType, setProfitType] = useState('markup');
  const [profitPct, setProfitPct] = useState('20');
  const [givenPrice, setGivenPrice] = useState('');

  // Simulation Results
  const [simulationResult, setSimulationResult] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);

  // Scenarios
  const [scenarios, setScenarios] = useState([]);
  const [scenarioName, setScenarioName] = useState('');
  const [isSaveScenarioModalOpen, setIsSaveScenarioModalOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [pRes, rmRes, sRes] = await Promise.all([
          api.get('/products'),
          api.get('/raw-materials'),
          api.get('/what-if/scenarios')
        ]);
        setProducts(pRes.data);
        setRawMaterials(rmRes.data);
        setScenarios(sRes.data);

        if (pRes.data.length > 0) {
          setSelectedProductId(pRes.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // When product changes, reset simulation form to baseline
  useEffect(() => {
    if (!selectedProductId) return;

    const fetchProd = async () => {
      try {
        const res = await api.get(`/products/${selectedProductId}`);
        const p = res.data;
        setProductDetails(p);

        // Reset overrides to baseline
        setRmPriceOverrides({});
        const initCompQty = {};
        p.components?.forEach(c => {
          initCompQty[c.componentId] = c.quantity.toString();
        });
        setCompQtyOverrides(initCompQty);

        setLabour(p.labourCost?.toString() || '0');
        setMachine(p.machineCost?.toString() || '0');
        setOverhead(p.manufacturingOverhead?.toString() || '0');
        setPackaging(p.packagingCost?.toString() || '0');
        setTransport(p.transportationCost?.toString() || '0');
        setWastage(p.wastagePct?.toString() || '0');
        setProfitType(p.profitType || 'markup');
        setProfitPct(p.profitPercentage?.toString() || '20');
        setGivenPrice(p.givenSellingPrice?.toString() || '');

        // Trigger simulation
        runSimulation(p.id, {}, initCompQty, p.labourCost, p.machineCost, p.manufacturingOverhead, p.packagingCost, p.transportationCost, p.wastagePct, p.profitType, p.profitPercentage, p.givenSellingPrice);
      } catch (err) {
        console.error(err);
      }
    };
    fetchProd();
  }, [selectedProductId]);

  const runSimulation = async (
    pId = selectedProductId,
    rmOverrides = rmPriceOverrides,
    cqOverrides = compQtyOverrides,
    lab = labour,
    mac = machine,
    ovh = overhead,
    pkg = packaging,
    tra = transport,
    wst = wastage,
    pType = profitType,
    pPct = profitPct,
    gPrice = givenPrice
  ) => {
    if (!pId) return;

    try {
      setLoadingSim(true);
      const res = await api.post('/what-if/simulate', {
        productId: Number(pId),
        rawMaterialPriceOverrides: rmOverrides,
        componentQuantityOverrides: cqOverrides,
        labourCost: Number(lab) || 0,
        machineCost: Number(mac) || 0,
        manufacturingOverhead: Number(ovh) || 0,
        packagingCost: Number(pkg) || 0,
        transportationCost: Number(tra) || 0,
        wastagePct: Number(wst) || 0,
        profitType: pType,
        profitPercentage: Number(pPct) || 0,
        givenSellingPrice: pType === 'given' ? Number(gPrice) || 0 : undefined
      });
      setSimulationResult(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Simulation calculation failed');
    } finally {
      setLoadingSim(false);
    }
  };

  const handleSaveScenario = async (e) => {
    e.preventDefault();
    if (!scenarioName.trim() || !simulationResult) {
      toast.error('Scenario name is required');
      return;
    }

    try {
      const res = await api.post('/what-if/scenarios', {
        name: scenarioName,
        description: `Simulation for ${productDetails?.name}`,
        parameters: {
          productId: selectedProductId,
          rmPriceOverrides,
          compQtyOverrides,
          labour,
          machine,
          overhead,
          packaging,
          transport,
          wastage,
          profitType,
          profitPct,
          givenPrice
        },
        results: simulationResult
      });
      toast.success('Simulation scenario saved!');
      setScenarios([res.data, ...scenarios]);
      setIsSaveScenarioModalOpen(false);
      setScenarioName('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save scenario');
    }
  };

  const handleLoadScenario = (sc) => {
    const p = sc.parameters || {};
    if (p.productId) setSelectedProductId(p.productId.toString());
    setRmPriceOverrides(p.rmPriceOverrides || {});
    setCompQtyOverrides(p.compQtyOverrides || {});
    setLabour(p.labour?.toString() || '0');
    setMachine(p.machine?.toString() || '0');
    setOverhead(p.overhead?.toString() || '0');
    setPackaging(p.packaging?.toString() || '0');
    setTransport(p.transport?.toString() || '0');
    setWastage(p.wastage?.toString() || '0');
    setProfitType(p.profitType || 'markup');
    setProfitPct(p.profitPct?.toString() || '20');
    setGivenPrice(p.givenPrice?.toString() || '');

    runSimulation(
      p.productId,
      p.rmPriceOverrides,
      p.compQtyOverrides,
      p.labour,
      p.machine,
      p.overhead,
      p.packaging,
      p.transport,
      p.wastage,
      p.profitType,
      p.profitPct,
      p.givenPrice
    );
    toast.success(`Loaded scenario '${sc.name}'`);
  };

  const handleDeleteScenario = async (id) => {
    try {
      await api.delete(`/what-if/scenarios/${id}`);
      setScenarios(scenarios.filter(s => s.id !== id));
      toast.success('Scenario removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete scenario');
    }
  };

  const baseline = simulationResult?.baseline || {};
  const simulated = simulationResult?.simulated || {};
  const delta = simulationResult?.delta || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
              <FiSliders className="h-6 w-6" />
            </div>
            Interactive "What-If" Cost & Profit Simulator
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sandbox pricing modifications, volume shifts, scrap rates, and material spikes safely without modifying database
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSaveScenarioModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <FiSave className="mr-2 h-4 w-4" /> Save Scenario
          </button>
        </div>
      </div>

      {/* Target Product Selector & Saved Scenarios Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">
            Target Finished Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 min-w-64"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        {/* Saved Scenarios Quick Dropdown */}
        {scenarios.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <FiFolder className="h-3.5 w-3.5" /> Saved Scenarios:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {scenarios.slice(0, 3).map(sc => (
                <div key={sc.id} className="inline-flex items-center bg-gray-100 rounded-lg text-xs font-medium pl-2.5 pr-1 py-1">
                  <button onClick={() => handleLoadScenario(sc)} className="text-primary-700 hover:underline mr-1">
                    {sc.name}
                  </button>
                  <button onClick={() => handleDeleteScenario(sc.id)} className="text-gray-400 hover:text-red-600 p-0.5">
                    <FiTrash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Baseline Product State */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Baseline Actual Costing</span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded">Active State</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Material Cost:</span>
              <div className="font-bold text-gray-900 text-sm">₹{baseline.materialCost?.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Overhead & Scrap:</span>
              <div className="font-bold text-gray-900 text-sm">
                ₹{((baseline.labourCost || 0) + (baseline.machineCost || 0) + (baseline.manufacturingOverhead || 0) + (baseline.packagingCost || 0) + (baseline.wastageCost || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 font-semibold uppercase">Total Manufacturing Cost</div>
            <div className="text-2xl font-black text-gray-900 mt-0.5">₹{baseline.manufacturingCost?.toFixed(2)}</div>
          </div>

          <div className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-xl">
            <div>Selling: <strong>₹{baseline.sellingPrice?.toFixed(2)}</strong></div>
            <div>Profit: <strong className="text-emerald-600">+₹{baseline.profit?.toFixed(2)}</strong> ({baseline.profitMargin?.toFixed(1)}%)</div>
          </div>
        </div>

        {/* Simulated Sandbox State */}
        <div className="bg-white p-6 rounded-2xl border-2 border-primary-500 shadow-md space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-primary-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-700">Simulated Sandbox Outcome</span>
            <span className="px-2 py-0.5 bg-primary-100 text-primary-800 text-xs font-bold rounded">Live Sandbox</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Simulated Materials:</span>
              <div className="font-bold text-primary-900 text-sm">₹{simulated.materialCost?.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-gray-500">Simulated Overheads:</span>
              <div className="font-bold text-primary-900 text-sm">
                ₹{((simulated.labourCost || 0) + (simulated.machineCost || 0) + (simulated.manufacturingOverhead || 0) + (simulated.packagingCost || 0) + (simulated.wastageCost || 0)).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-primary-100">
            <div className="text-xs text-primary-700 font-bold uppercase">Simulated Manufacturing Cost</div>
            <div className="text-2xl font-black text-primary-800 mt-0.5">₹{simulated.manufacturingCost?.toFixed(2)}</div>
          </div>

          <div className="flex items-center justify-between text-xs bg-primary-50 p-2.5 rounded-xl text-primary-900">
            <div>Target: <strong>₹{simulated.sellingPrice?.toFixed(2)}</strong></div>
            <div>Profit: <strong className="text-emerald-600">+₹{simulated.profit?.toFixed(2)}</strong> ({simulated.profitMargin?.toFixed(1)}%)</div>
          </div>
        </div>

        {/* Delta Shift Card */}
        <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-md space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Net Impact Delta</span>
          </div>

          <div>
            <span className="text-xs text-gray-400 uppercase">Cost Delta Shift</span>
            <div className={`text-2xl font-black mt-1 ${delta.costDifference > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {delta.costDifference > 0 ? '+' : ''}₹{delta.costDifference?.toFixed(2)} ({delta.costDifference > 0 ? '+' : ''}{delta.costDifferencePct?.toFixed(1)}%)
            </div>
          </div>

          <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-gray-400 block">Profit Delta:</span>
              <strong className={delta.profitDifference >= 0 ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
                {delta.profitDifference >= 0 ? '+' : ''}₹{delta.profitDifference?.toFixed(2)}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-gray-400 block">Margin Shift:</span>
              <strong className={delta.marginDifference >= 0 ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
                {delta.marginDifference >= 0 ? '+' : ''}{delta.marginDifference?.toFixed(1)}%
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Raw Material Rate Overrides & Component Quantities */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiSliders className="text-primary-600" /> 1. Raw Material Supplier Rates Sandbox
          </h2>
          <p className="text-xs text-gray-500">
            Tweak component raw-material rates to observe real-time cost propagation
          </p>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {rawMaterials.map(rm => {
              const currentRate = Number(rm.currentPrice);
              const overrideVal = rmPriceOverrides[rm.id] !== undefined ? rmPriceOverrides[rm.id] : currentRate;

              return (
                <div key={rm.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-xs text-gray-900">{rm.name}</div>
                    <div className="text-xs text-gray-400">Baseline: ₹{currentRate.toFixed(2)}/{rm.unit}</div>
                  </div>

                  <div className="w-36 relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-gray-400 font-semibold text-xs">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={overrideVal}
                      onChange={(e) => {
                        const updated = { ...rmPriceOverrides, [rm.id]: Number(e.target.value) };
                        setRmPriceOverrides(updated);
                        runSimulation(selectedProductId, updated);
                      }}
                      className="w-full pl-6 pr-2 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 text-right focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Operational Overheads & Profit Modeling Sandbox */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FiDollarSign className="text-primary-600" /> 2. Overheads, Scrap & Profit Margin Sandbox
          </h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Direct Labour (₹)</label>
              <input
                type="number"
                value={labour}
                onChange={(e) => { setLabour(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Machine & Power (₹)</label>
              <input
                type="number"
                value={machine}
                onChange={(e) => { setMachine(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Plant Overhead (₹)</label>
              <input
                type="number"
                value={overhead}
                onChange={(e) => { setOverhead(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, machine, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Packaging Cost (₹)</label>
              <input
                type="number"
                value={packaging}
                onChange={(e) => { setPackaging(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, machine, overhead, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Wastage / Scrap (%)</label>
              <input
                type="number"
                value={wastage}
                onChange={(e) => { setWastage(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, machine, overhead, packaging, transport, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right"
              />
            </div>

            <div>
              <label className="font-semibold text-gray-700 block mb-1">Pricing Model</label>
              <select
                value={profitType}
                onChange={(e) => { setProfitType(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, machine, overhead, packaging, transport, wastage, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-900"
              >
                <option value="markup">Markup %</option>
                <option value="margin">Profit Margin %</option>
                <option value="given">Fixed Given Price</option>
              </select>
            </div>
          </div>

          {profitType !== 'given' ? (
            <div>
              <label className="font-semibold text-gray-700 block mb-1 text-xs">
                Target {profitType === 'markup' ? 'Markup' : 'Margin'} (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={profitPct}
                onChange={(e) => { setProfitPct(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, machine, overhead, packaging, transport, wastage, profitType, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="font-semibold text-gray-700 block mb-1 text-xs">Fixed Target Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                value={givenPrice}
                onChange={(e) => { setGivenPrice(e.target.value); runSimulation(selectedProductId, rmPriceOverrides, compQtyOverrides, labour, machine, overhead, packaging, transport, wastage, profitType, profitPct, e.target.value); }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900 text-right text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Scenario Modal */}
      {isSaveScenarioModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Save What-If Scenario</h3>
            <p className="text-xs text-gray-500 mb-4">Store this simulated parameter configuration for future reference</p>

            <form onSubmit={handleSaveScenario} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. Q3 20% Steel Price Spike + 5% Labour Increase"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveScenarioModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold shadow-sm"
                >
                  Save Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfSimulator;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiPackage, FiPlus, FiTrash2, FiArrowLeft, FiArrowRight, 
  FiCheck, FiSave, FiDollarSign, FiPercent, FiTool, FiLayers, FiTruck 
} from 'react-icons/fi';

const STEPS = [
  { id: 1, name: 'Product Details' },
  { id: 2, name: 'Component BOM' },
  { id: 3, name: 'Manufacturing Overhead' },
  { id: 4, name: 'Packaging Hierarchy' },
  { id: 5, name: 'Wastage & Pricing' },
  { id: 6, name: 'Costing Summary' }
];

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [componentsList, setComponentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Details
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Industrial Furnishing');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('');
  const [size, setSize] = useState('');

  // Step 2: Components Selection
  const [selectedComponents, setSelectedComponents] = useState([
    { componentId: '', quantity: '1' }
  ]);

  // Step 3: Additional Costs
  const [labourCost, setLabourCost] = useState('0');
  const [machineCost, setMachineCost] = useState('0');
  const [manufacturingOverhead, setManufacturingOverhead] = useState('0');
  const [otherCost, setOtherCost] = useState('0');
  const [transportationCost, setTransportationCost] = useState('0');

  // Step 4: Multi-Level Packaging
  const [packagingConfigs, setPackagingConfigs] = useState([
    { name: 'Master Shipping Crate', level: 0, unitCost: '0', unitsPerParent: 1, productsPerUnit: 1 }
  ]);

  // Step 5: Wastage & Pricing
  const [wastagePct, setWastagePct] = useState('0');
  const [profitType, setProfitType] = useState('markup'); // 'markup', 'margin', 'given'
  const [profitPercentage, setProfitPercentage] = useState('20');
  const [givenSellingPrice, setGivenSellingPrice] = useState('');

  // Fetch initial components catalogue
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const compRes = await api.get('/components');
        setComponentsList(compRes.data);

        if (isEdit) {
          const prodRes = await api.get(`/products/${id}`);
          const prod = prodRes.data;

          setName(prod.name);
          setSku(prod.sku);
          setCategory(prod.category || 'General');
          setDescription(prod.description || '');
          setWeight(prod.weight?.toString() || '');
          setSize(prod.size || '');

          if (prod.components && prod.components.length > 0) {
            setSelectedComponents(prod.components.map(c => ({
              componentId: c.componentId.toString(),
              quantity: c.quantity.toString()
            })));
          }

          setLabourCost(prod.labourCost?.toString() || '0');
          setMachineCost(prod.machineCost?.toString() || '0');
          setManufacturingOverhead(prod.manufacturingOverhead?.toString() || '0');
          setOtherCost(prod.otherCost?.toString() || '0');
          setTransportationCost(prod.transportationCost?.toString() || '0');
          setWastagePct(prod.wastagePct?.toString() || '0');
          setProfitType(prod.profitType || 'markup');
          setProfitPercentage(prod.profitPercentage?.toString() || '20');
          setGivenSellingPrice(prod.givenSellingPrice?.toString() || '');

          if (prod.packagingConfigs && prod.packagingConfigs.length > 0) {
            setPackagingConfigs(prod.packagingConfigs.map(pkg => ({
              name: pkg.name,
              level: pkg.level,
              unitCost: pkg.unitCost?.toString() || '0',
              unitsPerParent: pkg.unitsPerParent || 1,
              productsPerUnit: pkg.productsPerUnit || 1
            })));
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load initial form data');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  // Live Cost Calculations
  const compMap = new Map(componentsList.map(c => [c.id.toString(), c]));

  let materialCostSum = 0;
  for (const sc of selectedComponents) {
    const comp = compMap.get(sc.componentId);
    if (comp) {
      const q = Number(sc.quantity) || 0;
      materialCostSum += q * (Number(comp.currentCost) || 0);
    }
  }

  // Calculate packaging cost per product
  let packagingCostPerProduct = 0;
  for (const pkg of packagingConfigs) {
    const cost = Number(pkg.unitCost) || 0;
    const unitsPerParent = Number(pkg.unitsPerParent) || 1;
    const prodsPerUnit = Number(pkg.productsPerUnit) || 1;
    if (prodsPerUnit > 0) {
      packagingCostPerProduct += (cost * unitsPerParent) / prodsPerUnit;
    } else {
      packagingCostPerProduct += cost;
    }
  }

  const lab = Number(labourCost) || 0;
  const mac = Number(machineCost) || 0;
  const ovh = Number(manufacturingOverhead) || 0;
  const oth = Number(otherCost) || 0;
  const tra = Number(transportationCost) || 0;
  const wst = Number(wastagePct) || 0;

  const wastageCost = (materialCostSum * wst) / 100;
  const totalManufacturingCost = materialCostSum + lab + mac + ovh + oth + tra + packagingCostPerProduct + wastageCost;

  // Calculate recommended selling price & profits
  const pct = Number(profitPercentage) || 0;
  let calculatedSellingPrice = 0;
  let calculatedProfit = 0;
  let calculatedMarginPct = 0;
  let calculatedMarkupPct = 0;

  if (profitType === 'markup') {
    calculatedSellingPrice = totalManufacturingCost * (1 + pct / 100);
    calculatedProfit = calculatedSellingPrice - totalManufacturingCost;
    calculatedMarkupPct = pct;
    calculatedMarginPct = calculatedSellingPrice > 0 ? (calculatedProfit / calculatedSellingPrice) * 100 : 0;
  } else if (profitType === 'margin') {
    calculatedSellingPrice = pct < 100 ? totalManufacturingCost / (1 - pct / 100) : 0;
    calculatedProfit = calculatedSellingPrice - totalManufacturingCost;
    calculatedMarginPct = pct;
    calculatedMarkupPct = totalManufacturingCost > 0 ? (calculatedProfit / totalManufacturingCost) * 100 : 0;
  } else if (profitType === 'given') {
    calculatedSellingPrice = Number(givenSellingPrice) || 0;
    calculatedProfit = calculatedSellingPrice - totalManufacturingCost;
    calculatedMarkupPct = totalManufacturingCost > 0 ? (calculatedProfit / totalManufacturingCost) * 100 : 0;
    calculatedMarginPct = calculatedSellingPrice > 0 ? (calculatedProfit / calculatedSellingPrice) * 100 : 0;
  }

  const handleAddComponentRow = () => {
    const defaultComp = componentsList.length > 0 ? componentsList[0] : null;
    setSelectedComponents([
      ...selectedComponents,
      { componentId: defaultComp ? defaultComp.id.toString() : '', quantity: '1' }
    ]);
  };

  const handleRemoveComponentRow = (index) => {
    if (selectedComponents.length <= 1) {
      toast.error('Product must contain at least one component');
      return;
    }
    setSelectedComponents(selectedComponents.filter((_, i) => i !== index));
  };

  const handleAddPackagingRow = () => {
    setPackagingConfigs([
      ...packagingConfigs,
      { name: 'Box / Wrapping', level: packagingConfigs.length, unitCost: '0', unitsPerParent: 1, productsPerUnit: 1 }
    ]);
  };

  const handleRemovePackagingRow = (index) => {
    setPackagingConfigs(packagingConfigs.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!name.trim() || !sku.trim()) {
        toast.error('Product name and SKU are required');
        return;
      }
    }
    if (currentStep === 2) {
      for (let i = 0; i < selectedComponents.length; i++) {
        if (!selectedComponents[i].componentId) {
          toast.error(`Please select a component in row #${i + 1}`);
          return;
        }
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      const payload = {
        name,
        sku,
        category,
        description,
        weight: Number(weight) || 0,
        size,
        components: selectedComponents.map(c => ({
          componentId: Number(c.componentId),
          quantity: Number(c.quantity) || 1
        })),
        labourCost: lab,
        machineCost: mac,
        manufacturingOverhead: ovh,
        otherCost: oth,
        transportationCost: tra,
        packagingConfigs: packagingConfigs.map(pkg => ({
          name: pkg.name,
          level: pkg.level,
          unitCost: Number(pkg.unitCost) || 0,
          unitsPerParent: Number(pkg.unitsPerParent) || 1,
          productsPerUnit: Number(pkg.productsPerUnit) || 1
        })),
        wastagePct: wst,
        profitType,
        profitPercentage: pct,
        givenSellingPrice: profitType === 'given' ? Number(givenSellingPrice) || null : null
      };

      if (isEdit) {
        await api.put(`/products/${id}`, payload);
        toast.success('Finished Product updated successfully!');
      } else {
        await api.post('/products', payload);
        toast.success('Finished Product created successfully!');
      }
      navigate('/products');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to save product');
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
          <Link to="/products" className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit Finished Product' : 'Guided Product Creation Wizard'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Step-by-step BOM configuration, overhead attribution, multi-level packaging, and profit modeling
            </p>
          </div>
        </div>

        <div className="text-right bg-primary-50 px-4 py-2 rounded-xl border border-primary-100 hidden sm:block">
          <div className="text-xs font-semibold text-primary-600 uppercase">Live Mfg Cost</div>
          <div className="text-2xl font-extrabold text-primary-700">₹{totalManufacturingCost.toFixed(2)}</div>
        </div>
      </div>

      {/* Step Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-max gap-2">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-xs ${
                  isActive ? 'bg-white text-primary-700' : isCompleted ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {isCompleted ? <FiCheck className="h-3 w-3" /> : step.id}
                </span>
                {step.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Form Canvas */}
      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
        {/* STEP 1: Details */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FiPackage className="text-primary-600" /> Step 1: Product Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Industrial Chair Model Pro"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  SKU / Part Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. PRD-CHR-001"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Product Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Seating, Furnishing, Machinery"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Dimensions / Size Specs
                </label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="e.g. 120x60x85 cm"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Finished Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Description & Manufacturing Notes
                </label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Heavy duty standard unit for warehouse and factory environments"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Component BOM Selection */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiTool className="text-primary-600" /> Step 2: Component Bill of Materials
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select sub-assemblies and specify quantities used per product unit
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddComponentRow}
                className="inline-flex items-center px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold transition-colors"
              >
                <FiPlus className="mr-1.5 h-4 w-4" /> Add Component
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 w-6/12">Component Sub-Assembly</th>
                    <th className="py-3 px-4 w-2/12">Quantity</th>
                    <th className="py-3 px-4 w-2/12 text-right">Unit BOM Cost</th>
                    <th className="py-3 px-4 w-2/12 text-right">Extended Cost (₹)</th>
                    <th className="py-3 px-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedComponents.map((row, idx) => {
                    const comp = compMap.get(row.componentId);
                    const compCost = comp ? Number(comp.currentCost) : 0;
                    const lineCost = compCost * (Number(row.quantity) || 0);

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4">
                          <select
                            value={row.componentId}
                            onChange={(e) => {
                              const updated = [...selectedComponents];
                              updated[idx].componentId = e.target.value;
                              setSelectedComponents(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">-- Select Component --</option>
                            {componentsList.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} (Current Cost: ₹{Number(c.currentCost).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-2.5 px-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            value={row.quantity}
                            onChange={(e) => {
                              const updated = [...selectedComponents];
                              updated[idx].quantity = e.target.value;
                              setSelectedComponents(updated);
                            }}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 text-right focus:ring-2 focus:ring-primary-500"
                          />
                        </td>

                        <td className="py-2.5 px-4 text-right font-medium text-gray-600">
                          {comp ? `₹${compCost.toFixed(2)}` : '—'}
                        </td>

                        <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                          ₹{lineCost.toFixed(2)}
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveComponentRow(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
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

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Total Product Material BOM Cost:</span>
              <span className="text-lg font-extrabold text-primary-700">₹{materialCostSum.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* STEP 3: Additional Manufacturing Costs */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiDollarSign className="text-primary-600" /> Step 3: Additional Manufacturing Overheads
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Attribute labour, machine depreciation, plant overhead, and transport expenses (leave unused as 0)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Direct Labour Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1 block">Operator wage & assembly time per unit</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Machine & Power Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={machineCost}
                    onChange={(e) => setMachineCost(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1 block">Machine hourly wear & electricity per unit</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Manufacturing Overhead (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manufacturingOverhead}
                    onChange={(e) => setManufacturingOverhead(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1 block">Factory maintenance, supervision, QA</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Transportation & Freight (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={transportationCost}
                    onChange={(e) => setTransportationCost(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1 block">Inbound/outbound transit handling per unit</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Other Miscellaneous Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-semibold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={otherCost}
                    onChange={(e) => setOtherCost(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center text-sm text-indigo-900 font-semibold">
              <span>Total Manufacturing Overhead:</span>
              <span className="text-lg font-extrabold text-indigo-950">
                ₹{(lab + mac + ovh + oth + tra).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* STEP 4: Packaging Hierarchy */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FiLayers className="text-primary-600" /> Step 4: Multi-Level Packaging Hierarchy
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure outer shipping crates, inner boxes, foam, tape, and automated per-product unit cost allocation
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddPackagingRow}
                className="inline-flex items-center px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs font-bold transition-colors"
              >
                <FiPlus className="mr-1.5 h-4 w-4" /> Add Packaging Tier
              </button>
            </div>

            <div className="space-y-3">
              {packagingConfigs.map((pkg, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Packaging Name</label>
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => {
                        const updated = [...packagingConfigs];
                        updated[idx].name = e.target.value;
                        setPackagingConfigs(updated);
                      }}
                      placeholder="e.g. Master Carton, Box"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Crate/Box Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pkg.unitCost}
                      onChange={(e) => {
                        const updated = [...packagingConfigs];
                        updated[idx].unitCost = e.target.value;
                        setPackagingConfigs(updated);
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-right font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Products Contained</label>
                    <input
                      type="number"
                      min="1"
                      value={pkg.productsPerUnit}
                      onChange={(e) => {
                        const updated = [...packagingConfigs];
                        updated[idx].productsPerUnit = e.target.value;
                        setPackagingConfigs(updated);
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-right font-bold text-gray-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 sm:pt-0">
                    <div className="text-xs text-gray-500">
                      Per Unit: <strong className="text-gray-900">₹{((Number(pkg.unitCost) || 0) / (Number(pkg.productsPerUnit) || 1)).toFixed(2)}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePackagingRow(idx)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 flex justify-between items-center text-sm text-amber-900 font-semibold">
              <span>Calculated Packaging Cost per Finished Product:</span>
              <span className="text-lg font-extrabold text-amber-950">₹{packagingCostPerProduct.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* STEP 5: Wastage & Pricing Model */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiPercent className="text-primary-600" /> Step 5: Wastage & Dynamic Pricing Model
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Apply scrap/wastage factor and choose between Markup % vs Profit Margin % vs Fixed Selling Price
              </p>
            </div>

            {/* Wastage */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Material Wastage / Scrap Factor (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={wastagePct}
                  onChange={(e) => setWastagePct(e.target.value)}
                  className="w-32 px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-lg font-bold text-gray-900 text-right"
                />
                <span className="text-sm text-gray-600">
                  Calculated Wastage Cost: <strong className="text-gray-900">₹{wastageCost.toFixed(2)}</strong> (Applied on ₹{materialCostSum.toFixed(2)} BOM material cost)
                </span>
              </div>
            </div>

            {/* Pricing Method Selection */}
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Pricing Strategy
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Markup */}
                <div
                  onClick={() => setProfitType('markup')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profitType === 'markup'
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-900">MARKUP</div>
                  <div className="text-xs text-gray-500 mt-1">Selling Price = Cost × (1 + Markup %)</div>
                </div>

                {/* Profit Margin */}
                <div
                  onClick={() => setProfitType('margin')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profitType === 'margin'
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-900">PROFIT MARGIN</div>
                  <div className="text-xs text-gray-500 mt-1">Selling Price = Cost ÷ (1 - Margin %)</div>
                </div>

                {/* Given Selling Price */}
                <div
                  onClick={() => setProfitType('given')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    profitType === 'given'
                      ? 'border-primary-600 bg-primary-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm text-gray-900">GIVEN SELLING PRICE</div>
                  <div className="text-xs text-gray-500 mt-1">Enter target price → calculates Profit & Margin %</div>
                </div>
              </div>

              {/* Profit percentage or Target Selling Price input */}
              {profitType !== 'given' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Target {profitType === 'markup' ? 'Markup' : 'Profit Margin'} Percentage (%)
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={profitType === 'margin' ? '99.9' : '1000'}
                      value={profitPercentage}
                      onChange={(e) => setProfitPercentage(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-lg font-bold text-gray-900 text-right pr-8"
                    />
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 font-bold">%</span>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Actual Given Selling Price (₹)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={givenSellingPrice}
                      onChange={(e) => setGivenSellingPrice(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-lg font-bold text-gray-900"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Live Costing Summary */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiCheck className="text-emerald-600" /> Step 6: Complete Costing Preview & Confirmation
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review the transparent breakdown hierarchy before saving to permanent database
              </p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <div className="text-xl font-extrabold text-gray-900">{name || 'Unnamed Product'}</div>
                  <div className="text-xs text-gray-500 font-mono">SKU: {sku} | {category}</div>
                </div>
                <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-bold uppercase">
                  {profitType} {profitType !== 'given' ? `${pct}%` : ''}
                </span>
              </div>

              {/* Cost Line Items */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500">Material BOM Cost</div>
                  <div className="text-base font-bold text-gray-900">₹{materialCostSum.toFixed(2)}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500">Labour & Machine</div>
                  <div className="text-base font-bold text-gray-900">₹{(lab + mac).toFixed(2)}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500">Packaging Allocated</div>
                  <div className="text-base font-bold text-gray-900">₹{packagingCostPerProduct.toFixed(2)}</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                  <div className="text-xs text-gray-500">Wastage ({wst}%)</div>
                  <div className="text-base font-bold text-gray-900">₹{wastageCost.toFixed(2)}</div>
                </div>
              </div>

              {/* Total Summary Callout */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Total Manufacturing Cost</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">₹{totalManufacturingCost.toFixed(2)}</div>
                  <span className="text-xs text-gray-400">Break-even threshold</span>
                </div>

                <div className="border-y sm:border-y-0 sm:border-x border-gray-200 py-2 sm:py-0">
                  <div className="text-xs font-semibold text-primary-600 uppercase">Recommended Selling Price</div>
                  <div className="text-2xl font-black text-primary-700 mt-1">₹{calculatedSellingPrice.toFixed(2)}</div>
                  <span className="text-xs text-gray-400 capitalize">{profitType} model</span>
                </div>

                <div>
                  <div className="text-xs font-semibold text-emerald-600 uppercase">Unit Net Profit</div>
                  <div className="text-2xl font-black text-emerald-600 mt-1">+₹{calculatedProfit.toFixed(2)}</div>
                  <span className="text-xs text-emerald-700 font-semibold">{calculatedMarginPct.toFixed(1)}% margin ({calculatedMarkupPct.toFixed(1)}% markup)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            ← Previous Step
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="inline-flex items-center px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
            >
              Continue to Step {currentStep + 1} <FiArrowRight className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-extrabold shadow-lg disabled:opacity-50 transition-colors"
            >
              <FiSave className="mr-2 h-5 w-5" />
              {saving ? 'Saving Product...' : isEdit ? 'Save Product Changes' : 'Confirm & Create Product'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductForm;

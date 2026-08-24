import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  FiPackage, FiTool, FiBox, FiDollarSign, FiPercent, 
  FiChevronDown, FiChevronRight, FiArrowLeft, FiEdit2, 
  FiLayers, FiTruck, FiActivity, FiCheckCircle, FiAlertCircle 
} from 'react-icons/fi';

const ProductCosting = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [productsList, setProductsList] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(id || '');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedComponents, setExpandedComponents] = useState({});

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await api.get('/products');
        setProductsList(res.data);
        if (!selectedProductId && res.data.length > 0) {
          setSelectedProductId(res.data[0].id.toString());
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    if (id) {
      setSelectedProductId(id);
    }
  }, [id]);

  useEffect(() => {
    if (!selectedProductId) return;

    const fetchProductCost = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/products/${selectedProductId}`);
        setProduct(res.data);
        // Expand all components by default
        const exp = {};
        res.data.components?.forEach(c => {
          exp[c.componentId] = true;
        });
        setExpandedComponents(exp);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load product costing breakdown');
      } finally {
        setLoading(false);
      }
    };
    fetchProductCost();
  }, [selectedProductId]);

  const toggleComponent = (compId) => {
    setExpandedComponents(prev => ({ ...prev, [compId]: !prev[compId] }));
  };

  if (loading && !product) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const mfgCost = product?.manufacturingCost || 0;
  const sellPrice = product?.currentSellingPrice || 0;
  const profit = product?.profit || 0;
  const isLoss = sellPrice < mfgCost;
  const isBreakEven = Math.abs(sellPrice - mfgCost) < 0.01;
  const isProfitable = sellPrice > mfgCost;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/products" className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <FiPackage className="h-5 w-5" />
              </div>
              Detailed Product Cost Breakdown
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Transparent multi-tier BOM breakdown from raw materials to components to finished product
            </p>
          </div>
        </div>

        {/* Product Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary-500 min-w-56"
          >
            {productsList.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
          {product && (
            <Link
              to={`/products/edit/${product.id}`}
              className="p-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
              title="Edit Product"
            >
              <FiEdit2 className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {product && (
        <>
          {/* Top KPI Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 uppercase font-semibold">Total Mfg Cost (Break-Even)</div>
              <div className="text-2xl font-black text-gray-900 mt-1">₹{mfgCost.toFixed(2)}</div>
              <span className="text-xs text-gray-400 mt-1 block">Full unit cost threshold</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 uppercase font-semibold">Current Selling Price</div>
              <div className="text-2xl font-black text-primary-700 mt-1">₹{sellPrice.toFixed(2)}</div>
              <span className="text-xs text-gray-400 mt-1 block">
                {product.givenSellingPrice ? 'Fixed custom selling price' : `Recommended (${product.profitType} ${product.profitPercentage}%)`}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-500 uppercase font-semibold">Unit Net Profit</div>
              <div className={`text-2xl font-black mt-1 ${isProfitable ? 'text-emerald-600' : isLoss ? 'text-red-600' : 'text-gray-700'}`}>
                {isProfitable ? '+' : ''}₹{profit.toFixed(2)}
              </div>
              <span className="text-xs font-semibold text-emerald-700 mt-1 block">
                {product.profitMargin?.toFixed(1)}% margin | {product.markup?.toFixed(1)}% markup
              </span>
            </div>

            {/* Break-Even Visual Status */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="text-xs text-gray-500 uppercase font-semibold">Break-Even Status</div>
              <div className="my-1">
                {isProfitable ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-extrabold rounded-xl text-sm border border-emerald-200">
                    <FiCheckCircle className="h-4 w-4" /> PROFITABLE (+₹{profit.toFixed(2)})
                  </span>
                ) : isLoss ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 font-extrabold rounded-xl text-sm border border-red-200">
                    <FiAlertCircle className="h-4 w-4" /> LOSS (₹{profit.toFixed(2)})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 font-extrabold rounded-xl text-sm border border-amber-200">
                    <FiActivity className="h-4 w-4" /> BREAK-EVEN
                  </span>
                )}
              </div>
              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isProfitable ? 'bg-emerald-500' : isLoss ? 'bg-red-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(Math.max((sellPrice / (mfgCost || 1)) * 50, 10), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Interactive Expandable Cost Breakdown Tree */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiPackage className="text-primary-600" /> {product.name}
              </h2>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                SKU: {product.sku} | Category: {product.category || 'General'} | Weight: {product.weight || '—'} kg
              </div>
            </div>

            {/* Tree Nodes: Components & Nested Raw Materials */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>1. Sub-Assembly Components ({product.components?.length || 0})</span>
                <span>Subtotal: ₹{product.materialCost?.toFixed(2)}</span>
              </div>

              <div className="space-y-3">
                {product.components?.map((pc) => {
                  const isExpanded = expandedComponents[pc.componentId];
                  return (
                    <div key={pc.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50/50">
                      {/* Component Node Header */}
                      <div
                        onClick={() => toggleComponent(pc.componentId)}
                        className="p-4 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <button className="text-gray-400 hover:text-gray-600">
                            {isExpanded ? <FiChevronDown className="h-5 w-5" /> : <FiChevronRight className="h-5 w-5" />}
                          </button>
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <FiTool className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm">{pc.name}</div>
                            <div className="text-xs text-gray-500">
                              Quantity used: <strong>{pc.quantity}</strong> × Unit Cost: <strong>₹{pc.unitCost?.toFixed(2)}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-extrabold text-gray-900">₹{pc.totalCost?.toFixed(2)}</div>
                          <div className="text-xs text-primary-600 font-semibold">
                            {pc.rawMaterials?.length || 0} Raw Material{(pc.rawMaterials?.length || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Nested Raw Materials Leaf Nodes */}
                      {isExpanded && (
                        <div className="p-4 bg-gray-50/80 border-t border-gray-200 space-y-2">
                          <div className="text-xs font-semibold text-gray-600 mb-2 pl-2">
                            Raw Material Composition for "{pc.name}":
                          </div>

                          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-gray-100 text-gray-600 font-semibold">
                                <tr>
                                  <th className="py-2.5 px-3">Raw Material</th>
                                  <th className="py-2.5 px-3">Category</th>
                                  <th className="py-2.5 px-3">Quantity</th>
                                  <th className="py-2.5 px-3 text-right">Base Supplier Rate</th>
                                  <th className="py-2.5 px-3 text-right">Component Line Cost</th>
                                  <th className="py-2.5 px-3 text-right">Extended for Product</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {pc.rawMaterials?.map((mat) => (
                                  <tr key={mat.id} className="hover:bg-gray-50">
                                    <td className="py-2 px-3 font-semibold text-gray-900 flex items-center gap-1.5">
                                      <FiBox className="text-amber-500" />
                                      {mat.name}
                                    </td>
                                    <td className="py-2 px-3 text-gray-500">{mat.category}</td>
                                    <td className="py-2 px-3 font-medium text-gray-800">
                                      {mat.quantity} {mat.unit}
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-600">
                                      ₹{mat.rate?.toFixed(2)}/{mat.materialBaseUnit}
                                    </td>
                                    <td className="py-2 px-3 text-right font-semibold text-gray-900">
                                      ₹{mat.cost?.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-primary-700">
                                      ₹{mat.extendedCostForProduct?.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tree Node: Additional Manufacturing Overheads */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>2. Manufacturing Overheads & Operational Expenses</span>
                <span>
                  Subtotal: ₹{((product.labourCost || 0) + (product.machineCost || 0) + (product.manufacturingOverhead || 0) + (product.otherCost || 0) + (product.transportationCost || 0)).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 font-medium">Direct Labour</div>
                  <div className="text-base font-bold text-gray-900 mt-1">₹{product.labourCost?.toFixed(2)}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 font-medium">Machine & Power</div>
                  <div className="text-base font-bold text-gray-900 mt-1">₹{product.machineCost?.toFixed(2)}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 font-medium">Plant Overhead</div>
                  <div className="text-base font-bold text-gray-900 mt-1">₹{product.manufacturingOverhead?.toFixed(2)}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 font-medium">Transportation</div>
                  <div className="text-base font-bold text-gray-900 mt-1">₹{product.transportationCost?.toFixed(2)}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 font-medium">Other Miscellaneous</div>
                  <div className="text-base font-bold text-gray-900 mt-1">₹{product.otherCost?.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Tree Node: Packaging & Wastage */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                3. Packaging Allocation & Material Wastage
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-amber-900 text-sm">Packaging Hierarchy Allocation</div>
                    <div className="text-gray-600 mt-0.5">
                      {product.packagingConfigs?.length > 0
                        ? product.packagingConfigs.map(p => `${p.name} (₹${p.unitCost}/${p.productsPerUnit} units)`).join(' + ')
                        : 'Standard packaging'}
                    </div>
                  </div>
                  <div className="text-lg font-black text-amber-950">₹{product.packagingCost?.toFixed(2)}</div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">Material Scrap / Wastage ({product.wastagePct}%)</div>
                    <div className="text-gray-500 mt-0.5">Applied directly on BOM raw materials baseline</div>
                  </div>
                  <div className="text-lg font-black text-gray-900">₹{product.wastageCost?.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Complete Rollup Summary */}
            <div className="bg-primary-900 text-white p-6 rounded-2xl shadow-lg mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary-800 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary-300">Total Manufacturing Unit Cost</span>
                  <div className="text-3xl font-black mt-1">₹{mfgCost.toFixed(2)}</div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-widest text-primary-300">Recommended Selling Price</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1">₹{sellPrice.toFixed(2)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-primary-300 block">Pricing Formula:</span>
                  <span className="font-bold uppercase">{product.profitType} ({product.profitPercentage}%)</span>
                </div>

                <div>
                  <span className="text-primary-300 block">Unit Net Profit:</span>
                  <span className="font-bold text-emerald-400">₹{profit.toFixed(2)}</span>
                </div>

                <div>
                  <span className="text-primary-300 block">Realized Profit Margin:</span>
                  <span className="font-bold">{product.profitMargin?.toFixed(2)}%</span>
                </div>

                <div>
                  <span className="text-primary-300 block">Markup on Cost:</span>
                  <span className="font-bold">{product.markup?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductCosting;

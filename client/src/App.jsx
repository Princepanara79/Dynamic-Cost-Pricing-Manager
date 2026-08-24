import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RawMaterials from './pages/RawMaterials';
import PriceHistory from './pages/PriceHistory';
import Components from './pages/Components';
import ComponentForm from './pages/ComponentForm';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import ProductCosting from './pages/ProductCosting';
import CostComparison from './pages/CostComparison';
import PriceImpactAnalysis from './pages/PriceImpactAnalysis';
import Clients from './pages/Clients';
import ClientPricing from './pages/ClientPricing';
import ClientProfitAnalysis from './pages/ClientProfitAnalysis';
import Sales from './pages/Sales';
import WhatIfSimulator from './pages/WhatIfSimulator';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        
        {/* Raw Materials */}
        <Route path="raw-materials">
          <Route index element={<RawMaterials />} />
          <Route path="history" element={<PriceHistory />} />
        </Route>

        {/* Components */}
        <Route path="components">
          <Route index element={<Components />} />
          <Route path="add" element={<ComponentForm />} />
          <Route path="edit/:id" element={<ComponentForm />} />
        </Route>

        {/* Products */}
        <Route path="products">
          <Route index element={<Products />} />
          <Route path="add" element={<ProductForm />} />
          <Route path="edit/:id" element={<ProductForm />} />
          <Route path="costing" element={<ProductCosting />} />
          <Route path=":id/cost" element={<ProductCosting />} />
          <Route path="comparison" element={<CostComparison />} />
          <Route path="impact" element={<PriceImpactAnalysis />} />
        </Route>

        {/* Clients */}
        <Route path="clients">
          <Route index element={<Clients />} />
          <Route path="pricing" element={<ClientPricing />} />
          <Route path="profit" element={<ClientProfitAnalysis />} />
        </Route>

        {/* Sales */}
        <Route path="sales">
          <Route index element={<Sales />} />
        </Route>

        {/* What-If Simulator */}
        <Route path="what-if" element={<WhatIfSimulator />} />

        {/* Reports */}
        <Route path="reports">
          <Route index element={<Reports />} />
          <Route path="product-cost" element={<Reports />} />
          <Route path="material-impact" element={<Reports />} />
          <Route path="client-profit" element={<Reports />} />
        </Route>

        {/* Settings */}
        <Route path="settings" element={<Settings />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;

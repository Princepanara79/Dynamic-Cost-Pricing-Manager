import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FiHome, FiBox, FiTool, FiPackage, 
  FiUsers, FiDollarSign, FiPieChart, FiSettings,
  FiChevronDown, FiChevronRight, FiSliders, FiTrendingUp, FiActivity
} from 'react-icons/fi';

const Sidebar = ({ onClose }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({
    materials: true,
    components: true,
    products: true,
    clients: true,
    sales: true,
    reports: true,
  });

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const NavItem = ({ to, icon: Icon, label, exact = false }) => {
    const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
    return (
      <NavLink
        to={to}
        onClick={() => { if (window.innerWidth < 1024) onClose(); }}
        className={`flex items-center px-3.5 py-2 text-sm font-semibold rounded-xl transition-colors ${
          isActive 
            ? 'bg-primary-600 text-white shadow-sm' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className={`mr-3 h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
        {label}
      </NavLink>
    );
  };

  const NavGroup = ({ id, icon: Icon, label, children }) => {
    const isExpanded = expandedMenus[id];
    
    return (
      <div className="space-y-1">
        <button
          onClick={() => toggleMenu(id)}
          className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-slate-400" />
            {label}
          </div>
          {isExpanded ? <FiChevronDown className="h-3.5 w-3.5" /> : <FiChevronRight className="h-3.5 w-3.5" />}
        </button>
        {isExpanded && (
          <div className="space-y-1 pl-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  const SubNavItem = ({ to, label, exact = true }) => {
    const isActive = exact ? location.pathname === to : location.pathname.startsWith(to);
    return (
      <NavLink
        to={to}
        onClick={() => { if (window.innerWidth < 1024) onClose(); }}
        className={`flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700 font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full mr-2.5 ${isActive ? 'bg-primary-600' : 'bg-slate-300'}`}></span>
        {label}
      </NavLink>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-slate-200">
      {/* Brand */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100 bg-slate-900 text-white">
        <div className="h-9 w-9 bg-primary-600 rounded-xl flex items-center justify-center mr-3 shadow-md shadow-primary-500/30">
          <FiBox className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-black tracking-tight block">Profit Manager</span>
          <span className="text-[10px] text-slate-400 block font-medium">Dynamic Manufacturing ERP</span>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        <NavItem to="/" icon={FiHome} label="Dashboard" exact />
        <NavItem to="/what-if" icon={FiSliders} label="What-If Simulator" />

        <div className="border-t border-slate-100 pt-2 space-y-3">
          <NavGroup id="materials" icon={FiBox} label="Raw Materials">
            <SubNavItem to="/raw-materials" label="All Raw Materials" exact />
            <SubNavItem to="/raw-materials/history" label="Price History" />
          </NavGroup>

          <NavGroup id="components" icon={FiTool} label="Components">
            <SubNavItem to="/components" label="All Components" exact />
            <SubNavItem to="/components/add" label="Build Component BOM" />
          </NavGroup>

          <NavGroup id="products" icon={FiPackage} label="Finished Products">
            <SubNavItem to="/products" label="Products Catalogue" exact />
            <SubNavItem to="/products/add" label="Add Finished Product" />
            <SubNavItem to="/products/costing" label="Product Costing Tree" />
            <SubNavItem to="/products/comparison" label="Cost Comparison" />
            <SubNavItem to="/products/impact" label="Price Impact Analysis" />
          </NavGroup>

          <NavGroup id="clients" icon={FiUsers} label="Clients & Pricing">
            <SubNavItem to="/clients" label="Client Accounts" exact />
            <SubNavItem to="/clients/pricing" label="Client-Specific Pricing" />
            <SubNavItem to="/clients/profit" label="Client Profit Analysis" />
          </NavGroup>

          <NavGroup id="sales" icon={FiDollarSign} label="Sales Operations">
            <SubNavItem to="/sales" label="Sales Ledger" exact />
          </NavGroup>

          <NavGroup id="reports" icon={FiPieChart} label="Reports & Analytics">
            <SubNavItem to="/reports/product-cost" label="Product Cost Report" />
            <SubNavItem to="/reports/material-impact" label="Material Impact Report" />
            <SubNavItem to="/reports/client-profit" label="Client Profit Report" />
          </NavGroup>
        </div>

        <div className="border-t border-slate-100 pt-2">
          <NavItem to="/settings" icon={FiSettings} label="System Settings" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Box, Truck, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ModalType } from '../../types';

interface Props {
 onOpenModal?: (type: ModalType) => void;
}

const SalesLayout: React.FC<Props> = ({ onOpenModal }) => {
 const { user } = useAuth();
 const location = useLocation();

 const navItems = [
 { name: 'Dashboard', path: 'sales-dashboard', icon: LayoutDashboard },
 { name: 'POS', path: 'pos', icon: ShoppingCart },
 { name: 'Products', path: 'products', icon: Package },
 { name: 'Inventory', path: 'inventory', icon: Box },
 { name: 'Orders', path: 'orders', icon: BarChart3 },
 { name: 'Customers', path: 'customers', icon: Users },
 { name: 'Procurement', path: 'procurement', icon: Truck },
 { name: 'Reports & Financials', path: 'financials', icon: FileText },
 ];

 return (
 <div className="flex flex-col h-full bg-gray-50">
 {/* Top Nav for Module */}
 <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-20">
 <div className="flex overflow-x-auto hide-scrollbar">
 {navItems.map((item) => (
 <NavLink
 key={item.name}
 to={item.path}
 className={({ isActive }) =>
 `flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
 isActive || location.pathname.includes(`/sales/${item.path}`)
 ? 'border-ministry-orange text-ministry-orange '
 : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
 }`
 }
 >
 <item.icon className="w-4 h-4 mr-2"/>
 {item.name}
 </NavLink>
 ))}
 </div>
 </div>

 {/* Main Content Area */}
 <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
 <Outlet />
 </div>
 </div>
 );
};

export default SalesLayout;

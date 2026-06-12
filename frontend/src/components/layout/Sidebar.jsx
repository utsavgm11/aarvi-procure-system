// src/components/layout/Sidebar.jsx
import React from 'react';
import { 
  LayoutDashboard, FileSpreadsheet, FileCheck, ShieldAlert, 
  LogOut, UserCheck, ShoppingCart, CheckSquare, DollarSign, X 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MOCK_PROFILES = [
  { id: 1, name: 'Amit Sharma', email: 'coordinator@aarviencon.com', role: 'Site Coordinator' },
  { id: 2, name: 'Vikram Rathore', email: 'manager@aarviencon.com', role: 'Site Manager' },
  { id: 3, name: 'Sagar Mehta', email: 'sagar@aarviencon.com', role: 'Purchase Executive' },
  { id: 4, name: 'Aadarsh Mishra', email: 'aadarsh@aarviencon.com', role: 'Purchase Executive' },
  { id: 5, name: 'Rohan Kapoor', email: 'pm@aarviencon.com', role: 'Project Manager' },
  { id: 6, name: 'Devendra Shah', email: 'director@aarviencon.com', role: 'Director' }
];

export default function Sidebar({ isMobileOpen, setIsMobileOpen, userSession, setUserSession }) {
  const location = useLocation();
  const currentPath = location.pathname;

  // 🎯 DYNAMIC ROLE-BASED NAVIGATION ENGINE
  const getNavItems = (role) => {
    switch (role) {
      case 'Site Coordinator':
        return [
          { name: 'Field Workspace', path: '/', icon: FileSpreadsheet },
        ];
      case 'Site Manager':
        return [
          { name: 'Vetting Gateway', path: '/', icon: ShieldAlert },
        ];
      case 'Purchase Executive':
        return [
          { name: 'Sourcing Hub', path: '/', icon: ShoppingCart },
          { name: 'PO Distribution', path: '/pos', icon: FileCheck },
        ];
      case 'Project Manager':
      case 'Director':
        return [
          { name: 'Corporate Approvals', path: '/', icon: CheckSquare },
          { name: 'Budget Control', path: '/dashboard', icon: DollarSign },
          { name: 'ERP Analytics', path: '/analytics', icon: LayoutDashboard },
        ];
      default:
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard }
        ];
    }
  };

  const navItems = getNavItems(userSession?.role);

  return (
    <aside 
      className={`bg-white border-r border-slate-200 fixed top-16 bottom-10 left-0 z-40 w-64 flex flex-col justify-between transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* 🎯 FLEX-1 WRAPPER WITH INTERNAL SCROLL TO PREVENT CONTENT OVERLAPPING */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar justify-between">
        
        {/* Navigation Navigation Section */}
        <div className="py-6 px-3 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3 select-none">
            Main Navigation
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              
              return (
                <Link 
                  key={item.name} 
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${
                    isActive 
                      ? 'bg-slate-100/80 text-[#2c2a57]' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#2c2a57]'
                  }`}
                >
                  {/* Visual Active Left Indicator (Aarvi Emerald Green from website banner) */}
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#0b9c54] rounded-r-md"></div>
                  )}
                  
                  <Icon 
                    size={18} 
                    className={`mr-3 flex-shrink-0 ${isActive ? 'text-[#0b9c54]' : 'text-slate-400'}`} 
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Identity Profile Swapper (Pinned Safely at the Bottom container) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          <div className="mb-3">
            <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 px-1">
              <UserCheck size={12} className="text-[#0b9c54]" />
              <span>Identity Swapper</span>
            </div>
            <select 
              value={userSession?.id || 1}
              onChange={(e) => {
                const selected = MOCK_PROFILES.find(p => p.id === parseInt(e.target.value));
                if (selected) setUserSession(selected);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#2c2a57] focus:ring-1 focus:ring-[#2c2a57] cursor-pointer shadow-xs transition-all"
            >
              {MOCK_PROFILES.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role.split(' ')[1] || p.role})
                </option>
              ))}
            </select>
          </div>

          {/* Secure Logout Action Button */}
          <button className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-slate-500 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 rounded-lg text-sm font-semibold transition-all shadow-xs">
            <LogOut size={16} className="flex-shrink-0" />
            <span>Secure Logout</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
// src/components/layout/Sidebar.jsx
import React from 'react';
import { 
  LayoutDashboard, FileSpreadsheet, FileCheck, ShieldAlert, 
  LogOut, ShoppingCart, CheckSquare, ShieldCheck, Building2 
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

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
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileSpreadsheet },
          { name: 'Vendor Directory', path: '/vendors', icon: Building2 }, 
          { name: 'IT Control Center', path: '/admin', icon: ShieldCheck }
        ];
      case 'Project Manager':
        return [
          { name: 'Commercial Approvals', path: '/', icon: CheckSquare },
          { name: 'Technical Vetting', path: '/vetting', icon: ShieldAlert },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileCheck },
        ];
      case 'Director':
        return [
          { name: 'Corporate Approvals', path: '/', icon: CheckSquare },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileCheck },
        ];
      case 'Admin':
        return [
          { name: 'IT Control Center', path: '/admin', icon: ShieldCheck },
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
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar justify-between">
        
        {/* TOP SECTION: MAIN NAVIGATION */}
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

        {/* BOTTOM SECTION: PROFILE FOOTER & CLEAR DISPATCH LOGOUT */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
          
          {/* Real-time Current User Context Display */}
          <div className="mb-4 bg-white p-3 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
              Active Session
            </p>
            <p className="text-sm font-extrabold text-[#2c2a57] truncate">
              {userSession?.name || 'Aarvi Operator'}
            </p>
            <p className="text-xs text-[#0b9c54] font-bold truncate mt-0.5">
              {userSession?.role || 'System Profile'}
            </p>
          </div>

          {/* Fully Functional Logout Action Button */}
          <button 
            onClick={() => {
              // Wipe persistent browser tokens safely
              localStorage.removeItem('aarvi_session');
              sessionStorage.removeItem('aarvi_session');
              // Trigger state boundary collapse back to landing page
              setUserSession(null);
            }}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 text-slate-500 hover:text-rose-600 bg-white border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 rounded-lg text-sm font-semibold transition-all shadow-xs duration-150"
          >
            <LogOut size={16} className="flex-shrink-0" />
            <span>Secure Logout</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
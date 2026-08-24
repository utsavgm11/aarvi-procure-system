// src/components/layout/Sidebar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, FileSpreadsheet, FileCheck, ShieldAlert, 
  LogOut, ShoppingCart, CheckSquare, ShieldCheck, Building2, Zap, Landmark
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function Sidebar({ isMobileOpen, setIsMobileOpen, userSession, setUserSession }) {
  const location = useLocation();
  const currentPath = location.pathname;

  // 🎯 BADGE COUNTS STATE
  const [counts, setCounts] = useState({
    pending_sourcing: 0,
    pending_signature: 0,
    po_ledger_alerts: 0,
    pending_approvals: 0,
    pending_vetting: 0,
    pending_disbursements: 0,
    coordinator_queries: 0
  });

  // 🎯 LIGHTWEIGHT SIDEBAR COUNTS FETCH
  const fetchCounts = useCallback(async () => {
    if (!userSession?.id) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/sidebar-counts`, {
        params: { user_id: userSession.id, role: userSession.role }
      });
      setCounts(res.data);
    } catch (err) {
      // Gracefully silent on failure to avoid disrupting UI
      console.debug("Sidebar counts sync idle");
    }
  }, [userSession]);

  // 🎯 RENDER FREE-OPTIMIZED TAB-AWARE POLLING (30 Seconds)
  useEffect(() => {
    let isMounted = true;

    const syncIfVisible = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        fetchCounts();
      }
    };

    // Initial fetch
    syncIfVisible();

    // 30-Second Tab-Aware Interval
    const interval = setInterval(syncIfVisible, 30000);

    // Visibility Listener (Instant Sync on Tab Focus)
    document.addEventListener('visibilitychange', syncIfVisible);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', syncIfVisible);
    };
  }, [fetchCounts]);

  // 🎯 DYNAMIC ROLE-BASED NAVIGATION WITH BADGE MAPPINGS
  const getNavItems = (role) => {
    switch (role) {
      case 'Site Coordinator':
        return [
          { name: 'Field Workspace', path: '/field-workspace', icon: FileSpreadsheet, badgeKey: 'coordinator_queries', badgeColor: 'bg-rose-500 text-white' },
        ];
      case 'Site Manager':
        return [
          { name: 'Vetting Gateway', path: '/vetting-gateway', icon: ShieldAlert, badgeKey: 'pending_vetting', badgeColor: 'bg-amber-500 text-white' },
        ];
      case 'Purchase Executive':
        return [
          { name: 'Sourcing Hub', path: '/sourcing-hub', icon: ShoppingCart, badgeKey: 'pending_sourcing', badgeColor: 'bg-indigo-600 text-white' },
          { name: 'PO Distribution', path: '/pos', icon: FileCheck, badgeKey: 'pending_signature', badgeColor: 'bg-[#2c2a57] text-white' },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileSpreadsheet, badgeKey: 'po_ledger_alerts', badgeColor: 'bg-rose-600 text-white' },
          { name: 'Vendor Directory', path: '/vendors', icon: Building2 }, 
          { name: 'IT Control Center', path: '/admin', icon: ShieldCheck }
        ];
      case 'Project Manager':
        return [
          { name: 'Commercial Approvals', path: '/commercial-approvals', icon: CheckSquare, badgeKey: 'pending_approvals', badgeColor: 'bg-amber-500 text-white' },
          { name: 'Technical Vetting', path: '/vetting', icon: ShieldAlert, badgeKey: 'pending_vetting', badgeColor: 'bg-indigo-600 text-white' },
          { name: 'Direct Procurement', path: '/direct-request', icon: Zap },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileCheck, badgeKey: 'po_ledger_alerts', badgeColor: 'bg-rose-600 text-white' },
        ];
      case 'Accounts Executive':
      case 'Accounts':
      case 'Finance Manager':
        return [
          { name: 'Accounts Desk', path: '/accounts-desk', icon: Landmark, badgeKey: 'pending_disbursements', badgeColor: 'bg-[#0b9c54] text-white' },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileSpreadsheet, badgeKey: 'po_ledger_alerts', badgeColor: 'bg-rose-600 text-white' },
        ];
      case 'IT Manager':
        return [
          { name: 'Direct Procurement', path: '/direct-procurement', icon: Zap },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileCheck, badgeKey: 'po_ledger_alerts', badgeColor: 'bg-rose-600 text-white' },
        ];
      case 'Director':
        return [
          { name: 'Corporate Approvals', path: '/corporate-approvals', icon: CheckSquare, badgeKey: 'pending_approvals', badgeColor: 'bg-amber-500 text-white' },
          { name: 'Master PO Ledger', path: '/po-ledger', icon: FileCheck, badgeKey: 'po_ledger_alerts', badgeColor: 'bg-rose-600 text-white' },
        ];
      case 'Admin':
        return [
          { name: 'IT Control Center', path: '/admin', icon: ShieldCheck },
          { name: 'Direct Procurement', path: '/direct-procurement', icon: Zap }
        ];  
      default:
        return [
          { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
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
              const badgeValue = item.badgeKey ? counts[item.badgeKey] : 0;
              
              return (
                <Link 
                  key={item.name} 
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all relative ${
                    isActive 
                      ? 'bg-slate-100/80 text-[#2c2a57]' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-[#2c2a57]'
                  }`}
                >
                  <div className="flex items-center truncate">
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#0b9c54] rounded-r-md"></div>
                    )}
                    
                    <Icon 
                      size={18} 
                      className={`mr-3 flex-shrink-0 ${isActive ? 'text-[#0b9c54]' : 'text-slate-400'}`} 
                    />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {/* 🎯 DYNAMIC NUMERIC BADGE PILL */}
                  {badgeValue > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono tracking-tight shadow-3xs flex-shrink-0 ml-2 animate-in zoom-in ${item.badgeColor || 'bg-slate-800 text-white'}`}>
                      {badgeValue}
                    </span>
                  )}
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
              localStorage.removeItem('aarvi_session');
              sessionStorage.removeItem('aarvi_session');
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
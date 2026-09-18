// src/components/DirectorDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  CheckSquare, ShieldCheck, ThumbsUp, DollarSign, Inbox, Archive, 
  Clock, Award, AlertCircle, FileText, ExternalLink, IndianRupee,
  Building2, AlertOctagon, X, Landmark, TrendingUp, ShieldAlert, 
  Search, Users, PieChart, RefreshCw, ChevronRight, ArrowRight, Filter
} from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function DirectorDashboard({ currentUser, onNavigateToLedger }) {
  // 🎯 SET DEFAULT TAB TO ANALYTICS (HOME SCREEN)
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'queue' | 'history'
  
  // Existing States for Queue & History
  const [tickets, setTickets] = useState([]);
  const [historyTickets, setHistoryTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [items, setItems] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // 🎯 NEW: Analytics States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [projectSearch, setProjectSearch] = useState('');
  const [pmFilter, setPmFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Safely grab current user
  const storedSession = localStorage.getItem('aarvi_session') || sessionStorage.getItem('aarvi_session');
  const activeUser = currentUser || (storedSession ? JSON.parse(storedSession) : {});
  const currentUserId = activeUser.id || 1;

  // --- DATA FETCHERS ---
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/analytics/director-summary`);
      setAnalyticsData(res.data);
    } catch (err) { 
      console.error("Failed to load director analytics summary", err); 
    } finally { 
      setAnalyticsLoading(false); 
    }
  }, []);

  const fetchDirectorQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/pending-management-approval/${currentUserId}`);
      setTickets(res.data.filter(t => t.status === "Pending Director" || t.status === "Query Raised"));
    } catch (err) { 
      console.error("Error loading Director queue", err); 
    } finally { 
      setLoading(false); 
    }
  }, [currentUserId]);

  const fetchDirectorHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/director-history`);
      setHistoryTickets(res.data);
    } catch (err) { 
      console.error("Error loading Director history", err); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  // --- EFFECT HOOK: Tab-Based Routing ---
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        if (activeTab === 'analytics') fetchAnalytics();
        if (activeTab === 'queue') fetchDirectorQueue();
        if (activeTab === 'history') fetchDirectorHistory();
      }
    }, 0);
    return () => { 
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, fetchAnalytics, fetchDirectorQueue, fetchDirectorHistory]);

  // --- ANALYTICS MEMOIZED FILTERS ---
  const filteredProjects = useMemo(() => {
    if (!analyticsData?.all_projects) return [];
    return analyticsData.all_projects.filter(p => {
      if (pmFilter !== 'ALL' && p.pm_name !== pmFilter) return false;
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (projectSearch) {
        const query = projectSearch.toLowerCase();
        return p.project_code.toLowerCase().includes(query) ||
               p.project_name.toLowerCase().includes(query) ||
               p.pm_name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [analyticsData, projectSearch, pmFilter, categoryFilter]);

  const uniquePMs = useMemo(() => {
    if (!analyticsData?.pm_spend) return [];
    return ['ALL', ...analyticsData.pm_spend.map(p => p.pm_name)];
  }, [analyticsData]);

  // --- CAPEX QUEUE LOGIC ---
  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setRemarks('');
    setAlert(null);
    try {
      const itemsRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setItems(itemsRes.data);
      
      const quotesRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/quotations`);
      
      // Auto-select the lowest bid if no bid is currently selected
      let fetchedQuotes = quotesRes.data;
      itemsRes.data.forEach(item => {
        const itemBids = fetchedQuotes.filter(q => q.item_index === item.item_index);
        const hasSelection = itemBids.some(q => q.is_selected);
        if (!hasSelection && itemBids.length > 0) {
          const lowest = itemBids.reduce((min, b) => b.total_amount < min.total_amount ? b : min, itemBids[0]);
          fetchedQuotes = fetchedQuotes.map(q => 
            (q.item_index === lowest.item_index && q.vendor_name === lowest.vendor_name) 
              ? { ...q, is_selected: true } 
              : q
          );
        }
      });
      
      setVendorQuotes(fetchedQuotes);
      setTimeout(() => {
        document.getElementById('executive-dossier-view')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) { 
      console.error("Error loading financial data", err); 
    }
  };

  const handleSelectBid = (itemIndex, vendorName) => {
    setVendorQuotes(prevQuotes => prevQuotes.map(q => {
      if (q.item_index === itemIndex) {
        return { ...q, is_selected: q.vendor_name === vendorName };
      }
      return q;
    }));
  };

  const handlePreviewFile = (url, title) => {
    if (!url) return;
    let fullUrl = url.startsWith('/') ? `https://aarvi-procure-system.onrender.com${url}` : url;
    setPreviewDoc({ url: fullUrl, title });
  };

  const handleDirectorSignOff = async (actionType) => {
    if (actionType === "Raise Query" && !remarks.trim()) {
      setAlert({ type: 'error', message: "Corporate audit notes are required before issuing technical holds." });
      return;
    }
    setLoading(true);
    try {
      const selectedBids = {};
      if (actionType === "Approve") {
        items.forEach(item => {
          const winner = vendorQuotes.find(q => q.item_index === item.item_index && q.is_selected);
          if (winner) {
            selectedBids[item.item_index] = winner.vendor_name;
          } else {
            const bids = vendorQuotes.filter(q => q.item_index === item.item_index);
            if (bids.length > 0) {
              const lowest = bids.reduce((min, b) => b.total_amount < min.total_amount ? b : min, bids[0]);
              selectedBids[item.item_index] = lowest.vendor_name;
            }
          }
        });
      }
      await axios.post(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/action`, {
        user_name: activeUser?.name || "Director",
        action: actionType,
        remarks: remarks || "Grand-scale budget authorization approved via executive director board.",
        selected_bids: selectedBids
      });
      
      setAlert({
        type: 'success',
        message: actionType === "Approve" 
          ? "Executive Board Sanction Granted! PO templates dispatched for immediate sealing." 
          : "Requisition flagged back to purchasing for vendor renegotiation."
      });
      setSelectedTicket(null);
      fetchDirectorQueue();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || "Failed to apply executive board authorization." });
    } finally {
      setLoading(false);
    }
  };

  const totalCapexValue = useMemo(() => {
    if (!selectedTicket || vendorQuotes.length === 0) return 0;
    return items.reduce((sum, item) => {
      const bids = vendorQuotes.filter(q => q.item_index === item.item_index);
      const chosen = bids.find(b => b.is_selected) || bids.reduce((min, b) => (b.total_amount < min.total_amount ? b : min), bids[0]);
      return sum + (chosen ? parseFloat(chosen.total_amount) || 0 : 0);
    }, 0);
  }, [selectedTicket, items, vendorQuotes]);

  return (
    <div className="space-y-6 relative pb-10 sm:px-2 md:px-4 lg:px-0">
      
      {/* 🎯 SMOOTH INLINE DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPreviewDoc(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2c2a57] p-4 text-white flex justify-between items-center shrink-0 z-10">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-300" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">{previewDoc.title}</h3>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-300 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-auto custom-scrollbar">
              {previewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) != null ? (
                <div className="min-h-full flex items-center justify-center p-4">
                  <img src={previewDoc.url} alt={previewDoc.title} className="max-w-full h-auto rounded-lg shadow-sm" />
                </div>
              ) : (
                <iframe 
                  src={previewDoc.url} 
                  className="w-full h-full border-0"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🎯 HEADER WITH 3-TAB NAVIGATION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#2c2a57] tracking-tight">Executive Director Portal</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Financial Intelligence, Capital Authorizations & Board-Level Oversight.</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full lg:w-auto overflow-x-auto">
          <Button 
            variant={activeTab === 'analytics' ? 'primary' : 'ghost'} 
            onClick={() => { setActiveTab('analytics'); setSelectedTicket(null); }} 
            className="text-xs py-2 flex-1 lg:flex-none flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <TrendingUp size={14} /> <span>Analytics Home</span>
          </Button>
          <Button 
            variant={activeTab === 'queue' ? 'primary' : 'ghost'} 
            onClick={() => { setActiveTab('queue'); setSelectedTicket(null); }} 
            className="text-xs py-2 flex-1 lg:flex-none flex items-center justify-center gap-1.5 whitespace-nowrap relative"
          >
            <Inbox size={14} /> 
            <span>CAPEX Backlog</span>
            {/* Red Dot Alert for Pending Approvals */}
            {analyticsData?.pending_director_action_count > 0 && activeTab !== 'queue' && (
              <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
            )}
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'primary' : 'ghost'} 
            onClick={() => { setActiveTab('history'); setSelectedTicket(null); }} 
            className="text-xs py-2 flex-1 lg:flex-none flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Archive size={14} /> <span>Approval Ledger</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border shadow-sm animate-in fade-in ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckSquare size={18} className="flex-shrink-0" /> <span className="font-semibold text-xs md:text-sm">{alert.message}</span>
        </div>
      )}

      {/* ========================================== */}
      {/* 📊 TAB 1: EXECUTIVE ANALYTICS COMMAND CENTER */}
      {/* ========================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {analyticsLoading ? (
            <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-indigo-600" />
              <p className="text-sm font-bold">Compiling Corporate Financial Metrics...</p>
            </div>
          ) : !analyticsData ? (
            <div className="p-12 text-center text-slate-400">Failed to load analytics engine. Please verify system connection.</div>
          ) : (
            <>
              {/* TOP EXECUTIVE KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border-l-4 border-l-emerald-500 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Committed Capital</p>
                      <h3 className="text-xl font-black text-slate-900 mt-1">₹{analyticsData.total_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Landmark size={20} /></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">All approved purchase orders & active leases</p>
                </Card>

                <Card className="p-4 bg-white border-l-4 border-l-indigo-500 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Monthly Run-Rate</p>
                      <h3 className="text-xl font-black text-indigo-900 mt-1">₹{analyticsData.active_monthly_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span className="text-[10px] text-slate-400 font-bold">/ mo</span></h3>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><TrendingUp size={20} /></div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">Recurring leases (Vehicles & Guest Houses)</p>
                </Card>

                <Card className="p-4 bg-white border-l-4 border-l-cyan-500 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reimbursement Split</p>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <h3 className="text-lg font-black text-cyan-700">₹{analyticsData.reimbursable_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                        <span className="text-xs font-bold text-cyan-600">({analyticsData.reimbursable_percentage}%)</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600"><PieChart size={20} /></div>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-2 font-bold">Company Cost: ₹{analyticsData.non_reimbursable_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({analyticsData.non_reimbursable_percentage}%)</p>
                </Card>

                <Card className="p-4 bg-white border-l-4 border-l-rose-500 shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Pipelines</p>
                      <h3 className="text-xl font-black text-slate-900 mt-1">{analyticsData.active_procurements_count} <span className="text-[10px] text-slate-400 font-bold">Open Orders</span></h3>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600"><ShieldAlert size={20} /></div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('queue')}
                    className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline mt-2 font-bold flex items-center gap-1 bg-transparent border-0 cursor-pointer p-0 transition-colors w-max"
                  >
                    <span>{analyticsData.pending_director_action_count} Require Director Seal</span>
                    <ArrowRight size={10} />
                  </button>
                </Card>
              </div>

              {/* MID SECTION: CATEGORY & MANAGER BREAKDOWNS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Category Breakdown Progress */}
                <Card className="lg:col-span-5 p-5 bg-white space-y-4">
                  <h2 className="text-xs font-black text-[#2c2a57] uppercase tracking-widest border-b border-slate-100 pb-2">Category Capital Allocation</h2>
                  <div className="space-y-4 pt-1">
                    {Object.entries(analyticsData.category_spend).map(([cat, amount]) => {
                      const pct = analyticsData.total_spend > 0 ? (amount / analyticsData.total_spend * 100).toFixed(1) : 0;
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-700">{cat}</span>
                            <span className="font-mono text-slate-900">₹{amount.toLocaleString('en-IN')} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                            <div 
                              className={`h-2 rounded-full ${
                                cat === 'GOODS' ? 'bg-blue-600' :
                                cat === 'VEHICLE' ? 'bg-amber-500' :
                                cat === 'ACCOMMODATION' ? 'bg-purple-600' :
                                cat === 'FOOD' ? 'bg-emerald-500' : 'bg-pink-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* PM Leaderboard */}
                <Card className="lg:col-span-7 p-5 bg-white space-y-4">
                  <h2 className="text-xs font-black text-[#2c2a57] uppercase tracking-widest border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>Project Manager Spending Leaderboard</span>
                    <Users size={16} className="text-slate-400" />
                  </h2>
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    {analyticsData.pm_spend.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center p-4">No spending data available.</p>
                    ) : (
                      analyticsData.pm_spend.map((pm, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center hover:border-indigo-300 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-[#2c2a57] text-white flex items-center justify-center font-bold text-[10px]">
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{pm.pm_name}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">{pm.orders_count} Authorized Orders</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-sm text-[#0b9c54]">₹{pm.total_spend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

              {/* DRILL-DOWN PROJECT SPEND EXPLORER */}
              <Card className="p-0 overflow-hidden bg-white">
                <div className="p-5 border-b border-slate-100 bg-slate-50">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h2 className="text-sm font-black text-[#2c2a57] uppercase tracking-wider flex items-center gap-2">
                        <Building2 size={18} className="text-indigo-600" />
                        <span>Project & Sub-Project Financial Explorer</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-1">Click inspect on any project to drill down directly into its Master PO Ledger records.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                        <input 
                          type="text" 
                          value={projectSearch}
                          onChange={e => setProjectSearch(e.target.value)}
                          placeholder="Search project or PM..."
                          className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-[#2c2a57] shadow-3xs"
                        />
                      </div>

                      <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-3xs">
                        <Filter size={12} className="text-slate-400" />
                        <select value={pmFilter} onChange={e => setPmFilter(e.target.value)} className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer max-w-[100px] truncate">
                          {uniquePMs.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1.5 shadow-3xs">
                        <Filter size={12} className="text-slate-400" />
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer max-w-[100px]">
                          <option value="ALL">All Categories</option>
                          <option value="GOODS">Goods</option>
                          <option value="VEHICLE">Vehicle</option>
                          <option value="ACCOMMODATION">Guest House</option>
                          <option value="FOOD">Food</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Projects Table */}
                <div className="overflow-x-auto custom-scrollbar max-h-96 bg-white p-2">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-50 border-b border-slate-200">
                        <th className="py-2.5 px-4 rounded-tl-lg">Project Code</th>
                        <th className="py-2.5 px-3">Project / Sub-Project Name</th>
                        <th className="py-2.5 px-3">Project Manager</th>
                        <th className="py-2.5 px-3 text-center">Orders</th>
                        <th className="py-2.5 px-3 text-right">Committed Spend</th>
                        <th className="py-2.5 px-4 text-center rounded-tr-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredProjects.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-slate-400 italic">No projects found matching the specified filters.</td>
                        </tr>
                      ) : (
                        filteredProjects.map((proj) => (
                          <tr key={proj.project_code} className="hover:bg-indigo-50/40 transition-colors group">
                            <td className="py-3 px-4 font-mono font-black text-[#2c2a57]">{proj.project_code}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{proj.project_name}</td>
                            <td className="py-3 px-3 text-slate-600">{proj.pm_name}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                {proj.orders_count}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-slate-900">₹{proj.total_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="py-3 px-4 text-center">
                              <button 
                                onClick={() => onNavigateToLedger && onNavigateToLedger(proj.project_code)}
                                className="text-[10px] font-extrabold text-[#2c2a57] bg-slate-100 hover:bg-[#2c2a57] hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 transition-all inline-flex items-center gap-1 shadow-3xs cursor-pointer group-hover:border-[#2c2a57]/50"
                              >
                                <span>Inspect in Ledger</span>
                                <ChevronRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 📥 VIEW 2: ACTIVE CAPEX QUEUE (Approvals)  */}
      {/* ========================================== */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px] animate-in fade-in duration-300">
          
          {/* Left Column: Ticket Stack */}
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Board CAPEX Backlog</h2>
            {tickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 bg-white text-xs md:text-sm">No high-value expenditures awaiting director clearance loops.</Card>
            ) : (
              tickets.map(t => (
                <div 
                  key={t.ticket_number} 
                  onClick={() => openTicket(t)} 
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTicket?.ticket_number === t.ticket_number 
                      ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs ring-1 ring-[#2c2a57]' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-3xs'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[#2c2a57] font-black text-xs md:text-sm">{t.ticket_number}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 truncate mt-1">{t.project_name}</p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Site: {t.project_code}</span>
                    <span className="text-rose-600 font-black flex items-center gap-0.5"><IndianRupee size={10}/>CAPEX Clearance</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Right Column: Active Dossier Review */}
          <div id="executive-dossier-view" className="xl:col-span-8 scroll-mt-24">
            {selectedTicket ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* 🎯 Header Card with Grand Total Financial Summary */}
                <Card className="p-4 bg-white border-slate-200 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="bg-[#2c2a57] text-white p-2.5 rounded-xl shrink-0"><ShieldCheck size={20} /></div>
                      <div>
                        <h3 className="font-extrabold text-[#2c2a57] text-sm uppercase tracking-wider">Executive Board Fiscal Review</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTicket.ticket_number} • {selectedTicket.project_name}</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={selectedTicket.status} />
                    </div>
                  </div>
                  {/* 💰 Financial Commitment Metric Box */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Total CAPEX Commitment</span>
                      <span className="text-[10px] md:text-xs text-slate-500 font-medium">Aggregated winning vendor bids</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg md:text-xl font-mono font-black text-[#0b9c54]">
                        ₹{totalCapexValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </Card>
                
                {/* Quotation Grid Ledger */}
                <Card className="overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#2c2a57] uppercase tracking-wider flex justify-between items-center">
                    <span>Attached Supplier Quotation Grid Ledger</span>
                    <span className="text-[10px] text-slate-400 font-mono">Items: {items.length}</span>
                  </div>
                  
                  <div className="p-4 space-y-6 divide-y divide-slate-100">
                    {items.map(item => {
                      const itemBids = vendorQuotes.filter(q => q.item_index === item.item_index);
                      return (
                        <div key={item.item_index} className="pt-4 first:pt-0 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <h4 className="text-xs md:text-sm font-bold text-[#2c2a57]">{item.item_index}. {item.product_description}</h4>
                              <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Technical Justification: <span className="italic text-slate-600 font-semibold">{item.purpose}</span></span>
                            </div>
                            
                            {/* Dynamic Reimbursable Badge */}
                            {item.is_reimbursable && (
                              <div className="flex items-center space-x-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight h-max shrink-0">
                                <AlertCircle size={10} />
                                <span>Client Billed Expense</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Bids Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {itemBids.map((bid, bIdx) => {
                              const isWinner = bid.is_selected === true;
                              return (
                                <div 
                                  key={bIdx} 
                                  onClick={() => handleSelectBid(item.item_index, bid.vendor_name)}
                                  className={`p-3 rounded-xl border flex flex-col justify-between relative overflow-hidden transition-all cursor-pointer ${
                                    isWinner 
                                      ? 'border-[#0b9c54] bg-emerald-50/40 ring-2 ring-[#0b9c54] shadow-xs' 
                                      : 'border-slate-200 bg-white opacity-90 hover:border-indigo-400 hover:shadow-md'
                                  }`}
                                >
                                  {isWinner && (
                                    <div className="absolute top-0 right-0 bg-[#0b9c54] text-white px-1.5 py-0.5 rounded-bl-lg flex items-center gap-1 text-[9px] font-bold" title="Selected Winning Bid">
                                      <Award size={10} /> WINNER
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <span className={`text-[9px] font-black uppercase tracking-wider block ${isWinner ? 'text-[#0b9c54]' : 'text-slate-400'}`}>
                                      Option {bIdx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 truncate block" title={bid.vendor_name}>{bid.vendor_name}</span>
                                    
                                    {bid.special_terms && (
                                      <span className="text-[9px] font-medium text-slate-500 italic block line-clamp-1">Terms: {bid.special_terms}</span>
                                    )}
                                    {/* 🎯 View Vendor Quote PDF File Link */}
                                    {bid.file_url && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePreviewFile(bid.file_url, `Quotation: ${bid.vendor_name}`);
                                        }} 
                                        className="text-indigo-600 hover:text-indigo-800 font-bold text-[10px] hover:underline flex items-center gap-1 pt-1 bg-transparent border-0 cursor-pointer text-left p-0"
                                      >
                                        <FileText size={11} /> View Quote File <ExternalLink size={9} />
                                      </button>
                                    )}
                                  </div>
                                  <div className="mt-3 flex justify-between items-baseline border-t border-slate-100 pt-2">
                                    <span className={`text-xs font-black font-mono ${isWinner ? 'text-[#0b9c54]' : 'text-slate-700'}`}>
                                      ₹{floatVal(bid.total_amount).toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400">{bid.time_of_delivery || '7 Days'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Action Footer */}
                  <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
                    <Input 
                      label="Executive Board Directives / Audit Remarks" 
                      value={remarks} 
                      onChange={e => setRemarks(e.target.value)} 
                      placeholder="Enter directive board parameters to append onto this order run..." 
                    />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button 
                        variant="danger" 
                        onClick={() => handleDirectorSignOff("Raise Query")} 
                        disabled={loading} 
                        className="text-xs py-2.5 sm:w-auto"
                      >
                        <AlertOctagon size={14} className="mr-1" />
                        <span>Reject & Force Renegotiation</span>
                      </Button>
                      <Button 
                        variant="primary" 
                        onClick={() => handleDirectorSignOff("Approve")} 
                        disabled={loading} 
                        className="text-xs py-2.5 shadow-sm bg-[#0b9c54] hover:bg-emerald-600 sm:w-auto"
                      >
                        <ThumbsUp size={14} className="mr-1" /> 
                        <span>Grant Executive Board Sanction</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
                <span className="text-3xl mb-2">👑</span>
                <h3 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Executive Sanctions Staged</h3>
                <p className="max-w-xs mt-1 text-xs text-slate-500">Isolate a commercial dossier package block from the queue stack to execute board sign-off overrides.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🗄️ VIEW 3: EXECUTIVE HISTORY LEDGER       */}
      {/* ========================================== */}
      {activeTab === 'history' && (
        <Card className="p-4 md:p-5 max-w-5xl animate-in fade-in duration-300 mx-auto lg:mx-0">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="text-[#0b9c54]" size={18} />
            <h2 className="text-xs md:text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Executive Authorization Ledger</h2>
          </div>
          
          {historyTickets.length === 0 ? (
            <div className="h-48 flex flex-col justify-center items-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white text-xs md:text-sm">
              <p>No processed Director clearances found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyTickets.map((ticket, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl gap-3 hover:shadow-3xs transition-shadow">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-[#2c2a57] font-black text-xs md:text-sm">{ticket.ticket_number}</span>
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">Cost Center: {ticket.project_code}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{ticket.project_name}</p>
                    <div className="flex items-center space-x-1.5 mt-2 text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded w-max border border-slate-100">
                      <Clock size={10} className="text-[#0b9c54]" />
                      <span>Approved On: <strong className="text-slate-700">{ticket.approval_date || "Date Unavailable"}</strong></span>
                    </div>
                  </div>
                  <div className="flex sm:justify-end shrink-0">
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
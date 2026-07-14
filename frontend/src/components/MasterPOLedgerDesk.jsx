// src/components/MasterPOLedgerDesk.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  FileCheck, Search, ChevronDown, ChevronUp, Landmark, Layers3, 
  Save, Calendar, ArrowLeft, Clock, Edit, Eye, X, Printer, Filter
} from 'lucide-react';
import { Card, Button } from './ui/SharedUI';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export default function MasterPOLedgerDesk({ currentUser }) {
  const [ledgerList, setLedgerList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedPoForView, setSelectedPoForView] = useState(null);
  const [poItems, setPoItems] = useState([]);

  // Filter Dropdown Selection States
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('ALL'); 

  // Form states for manual entry parameters
  const [invoiceForms, setInvoiceForms] = useState({});
  const [editingInvoices, setEditingInvoices] = useState({});

  const isPurchaseExecutive = currentUser?.role === 'Purchase Executive';

  const fetchLedgerPOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/purchase-orders/finalized`);
      setLedgerList(res.data);
      
      const initialForms = {};
      res.data.forEach(po => {
        initialForms[po.po_number] = {
          invoice_no: po.invoice_no || '',
          invoice_date: po.invoice_date || '',
          invoice_remark: po.invoice_remark || '',
          invoice_duration: po.invoice_duration || '' 
        };
      });
      setInvoiceForms(initialForms);
    } catch (err) {
      console.error("Error fetching Master PO Ledger", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 🎯 THE FIX: Defer state invocation via macro-task to prevent cascading render fault lines
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        fetchLedgerPOs();
      }
    }, 0);
    
    return () => { 
      isMounted = false;
      clearTimeout(timer);
    };
  }, [fetchLedgerPOs]);

  const handleInputChange = (poNumber, field, value) => {
    setInvoiceForms(prev => ({
      ...prev,
      [poNumber]: { ...prev[poNumber], [field]: value }
    }));
  };

  const toggleEditInvoice = (poNumber) => {
    setEditingInvoices(prev => ({ ...prev, [poNumber]: !prev[poNumber] }));
  };

  const handleSaveInvoiceDetails = async (poNumber) => {
    const formData = invoiceForms[poNumber];
    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/invoice`, formData);
      setEditingInvoices(prev => ({ ...prev, [poNumber]: false }));
      fetchLedgerPOs();
    } catch (err) {
      alert("Failed to commit manual invoice data changes to the backend engine.");
    }
  };

  const openPoDocumentSection = async (po) => {
    setSelectedPoForView(po);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/${po.ticket_number}/quotations`);
      setPoItems(res.data.filter(q => q.is_selected === true));
    } catch (err) {
      console.error("Error generating PO template rows injection", err);
    }
  };

  // --- TIME-SERIES TIMELINE MATRIX CHECKER ---
  const isWithinLast6Months = (dateStr) => {
    if (!dateStr || dateStr === 'N/A') return false;
    try {
      const cleanStr = dateStr.split(' ')[0];
      const parts = cleanStr.split('-');
      const day = parseInt(parts[0], 10);
      
      const monthsMap = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
      const month = monthsMap[parts[1].toLowerCase()];
      const year = parseInt(parts[2], 10);
      
      const poDate = new Date(year, month, day);
      const comparisonLimit = new Date(2026, 6, 9); 
      comparisonLimit.setMonth(comparisonLimit.getMonth() - 6);
      
      return poDate >= comparisonLimit;
    } catch(e) {
      return true; 
    }
  };

  // --- COMPREHENSIVE Spend Analytics Evaluation Engine ---
  const analyticsMetrics = useMemo(() => {
    let totalSpend = 0;
    let reimbursableTotal = 0;
    let nonReimbursableTotal = 0;
    const projectCodes = new Set();

    ledgerList.forEach(po => {
      if (selectedTimeFilter === '6_MONTHS' && !isWithinLast6Months(po.generated_at)) return;
      if (selectedProjectFilter !== 'ALL' && po.project_code !== selectedProjectFilter) return;

      totalSpend += po.grand_total;
      projectCodes.add(po.project_code);

      const itemArray = po.items || [];
      if (itemArray.length === 0) {
        nonReimbursableTotal += po.grand_total; 
      } else {
        const reimbursableCount = itemArray.filter(i => i.is_reimbursable).length;
        const ratio = reimbursableCount / itemArray.length;
        reimbursableTotal += po.grand_total * ratio;
        nonReimbursableTotal += po.grand_total * (1 - ratio);
      }
    });

    const reimbursablePercentage = totalSpend > 0 ? (reimbursableTotal / totalSpend) * 100 : 0;
    const nonReimbursablePercentage = totalSpend > 0 ? (nonReimbursableTotal / totalSpend) * 100 : 0;

    return {
      totalSpend,
      reimbursableTotal,
      nonReimbursableTotal,
      reimbursablePercentage,
      nonReimbursablePercentage,
      uniqueSitesCount: projectCodes.size
    };
  }, [ledgerList, selectedProjectFilter, selectedTimeFilter]);

  // --- RUNTIME FILTERS CONTROLLER ---
  const filteredLedger = useMemo(() => {
    return ledgerList.filter(po => {
      if (selectedProjectFilter !== 'ALL' && po.project_code !== selectedProjectFilter) return false;
      if (selectedTimeFilter === '6_MONTHS' && !isWithinLast6Months(po.generated_at)) return false;

      const matchesSearch = po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchesSearch;
    });
  }, [ledgerList, selectedProjectFilter, selectedTimeFilter, searchQuery]);

  const uniqueProjectFilterOptions = useMemo(() => {
    return ['ALL', ...new Set(ledgerList.map(po => po.project_code))];
  }, [ledgerList]);

  return (
    <div className="space-y-6 relative">
      
      {/* SECTION VIEW A: DOCUMENT PREVIEW */}
      {selectedPoForView ? (
        <div className="space-y-4 animate-in fade-in duration-200 pb-10">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setSelectedPoForView(null)} className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-[#2c2a57] transition-colors">
              <ArrowLeft size={16} /> <span>Return to Master Ledger Desk</span>
            </button>
            <Button variant="primary" onClick={() => window.print()} className="shadow-sm bg-[#0b9c54] hover:bg-emerald-600">
              <Printer size={16} className="mr-2" /> <span>Print / Save as PDF</span>
            </Button>
          </div>

          <div className="bg-white p-12 mx-auto border border-slate-200 shadow-lg max-w-4xl text-sm text-slate-800 font-sans">
            <div className="flex justify-between items-start border-b-[3px] border-[#2c2a57] pb-6 mb-8">
              <div>
                <h1 className="text-4xl font-black text-[#2c2a57] tracking-tighter">AARVI ENCON</h1>
                <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">Official Purchase Order</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-slate-900">{selectedPoForView.po_number}</h2>
                <p className="text-xs text-slate-500 mt-1 font-mono">Date: {selectedPoForView.generated_at}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-10">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-2">To Vendor</h3>
                <p className="font-extrabold text-slate-900 text-base">{selectedPoForView.vendor_name}</p>
                <p className="text-slate-600 text-xs mt-1.5 whitespace-pre-wrap">{selectedPoForView.vendor_address || "Address Not Available"}</p>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100/50">
                <h3 className="text-[10px] font-black uppercase text-[#0b9c54] tracking-wider mb-2">Project Destination</h3>
                <p className="font-extrabold text-slate-900 text-base">{selectedPoForView.project_name}</p>
                <p className="text-slate-600 text-xs mt-1 font-mono">Project Code: {selectedPoForView.project_code}</p>
              </div>
            </div>

            <table className="w-full text-left mb-8 border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center w-12">Sr.</th>
                  <th className="py-2.5 px-3">Description & Specifications</th>
                  <th className="py-2.5 px-3 text-center w-20">Qty</th>
                  <th className="py-2.5 px-3 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {poItems.map((item, i) => (
                  <tr key={i} className="text-xs border-b border-slate-200">
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">{i + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{item.product_description}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{item.quantity || 1}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">₹{(item.base_total_value || item.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mb-10">
              <div className="w-72 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-sm font-black text-[#2c2a57]">
                  <span>Grand Total:</span>
                  <span className="font-mono text-lg">₹{selectedPoForView.grand_total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SECTION VIEW B: MAIN SHEET INTERFACE */
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Spend Analytics & PO Registry</h1>
              <p className="text-sm text-slate-500 font-medium">Automatic spend extraction records linked with physical manual invoice filing systems.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="p-4 flex items-center space-x-4 border-l-4 border-emerald-500 bg-white shadow-2xs">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Landmark size={20} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Evaluated Outflow</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">₹{analyticsMetrics.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              </div>
            </Card>

            <Card className="p-4 flex items-center justify-between bg-white shadow-2xs border border-slate-200">
              <div className="space-y-1.5 flex-1 pr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Flag Ratio</p>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-700 flex justify-between">
                    <span className="text-cyan-600">Reimbursable:</span>
                    <span>₹{analyticsMetrics.reimbursableTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({analyticsMetrics.reimbursablePercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex justify-between">
                    <span className="text-amber-600">Non-Reimbursable:</span>
                    <span>₹{analyticsMetrics.nonReimbursableTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({analyticsMetrics.nonReimbursablePercentage.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
              <div className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: `conic-gradient(#06b6d4 0% ${analyticsMetrics.reimbursablePercentage}%, #f59e0b ${analyticsMetrics.reimbursablePercentage}% 100%)` }}>
                <div className="w-8 h-8 bg-white rounded-full absolute"></div>
              </div>
            </Card>

            <Card className="p-4 grid grid-cols-2 gap-2 bg-white shadow-2xs border border-slate-200">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><FileCheck size={12} /> Active POs</p>
                <h4 className="text-base font-black text-slate-800 mt-1">{filteredLedger.length} Rows</h4>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Layers3 size={12} /> Sites Served</p>
                <h4 className="text-base font-black text-slate-800 mt-1">{analyticsMetrics.uniqueSitesCount} Codes</h4>
              </div>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across codes, products, or vendors..." 
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 outline-none focus:border-[#2c2a57] shadow-3xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-3xs">
                <Filter size={12} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Site:</span>
                <select value={selectedProjectFilter} onChange={(e) => setSelectedProjectFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                  {uniqueProjectFilterOptions.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-3xs">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase">Duration:</span>
                <select value={selectedTimeFilter} onChange={(e) => setSelectedTimeFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                  <option value="ALL">All-Time Spend Records</option>
                  <option value="6_MONTHS">Last 6 Months Outlay</option>
                </select>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1600px]">
                <thead>
                  <tr className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-50 border-b border-slate-200">
                    <th className="p-4 w-12 text-center">Manifest</th>
                    <th className="p-4 w-44">Requisition Context</th>
                    <th className="p-4 w-40">PO Code ID</th>
                    <th className="p-4 w-48">Project Scope Context</th>
                    <th className="p-4 w-60">Vendor Communication Matrix</th>
                    <th className="p-4 w-36">Sign-off Trail</th>
                    <th className="p-4 text-right">Landed Cost</th>
                    <th className="p-4 bg-slate-100/60 text-[#2c2a57] font-extrabold w-[450px]">Manual Invoice Logging (Purchase Scope)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLedger.map((po) => {
                    const isExpanded = !!expandedRows[po.po_number];
                    const isEditing = !!editingInvoices[po.po_number];
                    const form = invoiceForms[po.po_number] || { invoice_no: '', invoice_date: '', invoice_remark: '', invoice_duration: '' };

                    return (
                      <React.Fragment key={po.po_number}>
                        <tr className={`hover:bg-slate-50/40 transition-colors ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                          <td className="p-4 text-center align-top">
                            <button onClick={() => setExpandedRows(prev => ({ ...prev, [po.po_number]: !prev[po.po_number] }))} className="text-slate-400 p-1 border rounded bg-white shadow-3xs">
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </td>
                          <td className="p-4 space-y-1 align-top">
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono"><Calendar size={10} className="text-[#0b9c54]" /> <span>Req Raised: <strong>{po.requisition_date}</strong></span></div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono"><Clock size={10} className="text-indigo-500" /> <span>PO Sealed: <strong>{po.generated_at}</strong></span></div>
                          </td>
                          <td className="p-4 align-top">
                            <div className="font-mono font-black text-[#2c2a57]">{po.po_number}</div>
                            <button 
                              onClick={() => openPoDocumentSection(po)} 
                              className="mt-2 flex items-center space-x-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-3xs"
                            >
                              <Eye size={12} /> <span>Preview Full PO</span>
                            </button>
                          </td>
                          <td className="p-4 space-y-1 align-top">
                            <div><strong className="text-slate-900">{po.project_code}</strong></div>
                            <div className="text-[10px] text-slate-500 truncate w-40">{po.project_name}</div>
                            <div className="text-[10px] bg-indigo-50/60 border border-indigo-100/50 rounded text-slate-600 px-1.5 py-0.5 w-max font-medium mt-1"><strong>Purpose:</strong> {po.purpose}</div>
                          </td>
                          <td className="p-4 space-y-0.5 leading-tight align-top">
                            <div className="font-extrabold text-slate-800 uppercase">{po.vendor_name}</div>
                            <div className="text-[10px] text-slate-400 truncate w-60">{po.vendor_address}</div>
                            <div className="text-[10px] font-mono text-slate-500">Contact: {po.vendor_contact} | {po.vendor_email}</div>
                          </td>
                          <td className="p-4 space-y-1 align-top">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 uppercase">Site Manager</span>
                              <span className="text-[11px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded w-max">{po.site_manager}</span>
                            </div>
                            <div className="flex flex-col mt-1">
                              <span className="text-[9px] font-bold text-indigo-400 uppercase">Project Manager</span>
                              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded w-max">{po.project_manager}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-slate-900 text-sm pr-6 align-top">₹{po.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          
                          <td className="p-3 bg-slate-50/40 border-l border-slate-200 align-top">
                            {isPurchaseExecutive && isHealthyFormActive(isEditing) ? (
                              <div className="flex flex-wrap items-center gap-2 animate-in fade-in zoom-in duration-150">
                                <input 
                                  type="text" 
                                  value={form.invoice_no} 
                                  onChange={(e) => handleInputChange(po.po_number, 'invoice_no', e.target.value)} 
                                  placeholder="Invoice No" 
                                  className="bg-white border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1.5 text-[11px] w-24 font-mono outline-none shadow-3xs"
                                />
                                <input 
                                  type="text" 
                                  value={form.invoice_date} 
                                  onChange={(e) => handleInputChange(po.po_number, 'invoice_date', e.target.value)} 
                                  placeholder="DD-MM-YYYY" 
                                  className="bg-white border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1.5 text-[11px] w-24 font-mono outline-none shadow-3xs"
                                />
                                <input 
                                  type="text" 
                                  value={form.invoice_duration} 
                                  onChange={(e) => handleInputChange(po.po_number, 'invoice_duration', e.target.value)} 
                                  placeholder="Duration (Opt)" 
                                  className="bg-white border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1.5 text-[11px] w-24 outline-none shadow-3xs"
                                />
                                <input 
                                  type="text" 
                                  value={form.invoice_remark} 
                                  onChange={(e) => handleInputChange(po.po_number, 'invoice_remark', e.target.value)} 
                                  placeholder="Remarks..." 
                                  className="bg-white border border-indigo-300 focus:ring-1 focus:ring-indigo-500 rounded-md px-2 py-1.5 text-[11px] flex-1 min-w-[100px] outline-none shadow-3xs"
                                />
                                <div className="flex space-x-1">
                                  <button onClick={() => handleSaveInvoiceDetails(po.po_number)} className="p-1.5 bg-[#0b9c54] text-white rounded-md hover:bg-emerald-600 transition-colors shadow-3xs">
                                    <Save size={13} />
                                  </button>
                                  <button onClick={() => toggleEditInvoice(po.po_number)} className="p-1.5 bg-slate-400 text-white rounded-md hover:bg-slate-500 transition-colors shadow-3xs">
                                    <X size={13} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start w-full">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1 w-full mr-2">
                                  <div className="text-[11px] text-slate-700">
                                    <span className="font-bold text-slate-400 mr-1 uppercase text-[9px]">Inv No:</span> 
                                    {po.invoice_no ? <span className="font-mono font-bold text-slate-800">{po.invoice_no}</span> : <span className="italic text-slate-400 font-medium">Pending Entry</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-700">
                                    <span className="font-bold text-slate-400 mr-1 uppercase text-[9px]">Date:</span> 
                                    {po.invoice_date ? <span className="font-mono">{po.invoice_date}</span> : <span className="italic text-slate-400 font-medium">Pending Entry</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-700">
                                    <span className="font-bold text-slate-400 mr-1 uppercase text-[9px]">Duration:</span> 
                                    {po.invoice_duration ? <span className="font-medium text-slate-800">{po.invoice_duration}</span> : <span className="italic text-slate-400 font-medium">-</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-700 truncate max-w-[180px]" title={po.invoice_remark}>
                                    <span className="font-bold text-slate-400 mr-1 uppercase text-[9px]">Remark:</span> 
                                    {po.invoice_remark ? po.invoice_remark : <span className="italic text-slate-400 font-medium">None</span>}
                                  </div>
                                </div>
                                
                                {isPurchaseExecutive && (
                                  <button 
                                    onClick={() => toggleEditInvoice(po.po_number)} 
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg shadow-3xs hover:border-indigo-200 hover:bg-indigo-50 transition-all flex-shrink-0"
                                  >
                                    <Edit size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/40">
                            <td colSpan="8" className="p-4 pl-16 border-y border-slate-200">
                              <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5">
                                <span>Material Manifest Components</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(po.items || []).map((item, idx) => (
                                  <div key={idx} className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex justify-between items-center shadow-3xs">
                                    <div className="truncate pr-4 flex flex-col">
                                      <span className="font-bold text-slate-700 truncate">{item.desc}</span>
                                      {item.is_reimbursable && (
                                        <span className="text-[9px] text-cyan-600 font-extrabold uppercase mt-0.5">✓ Reimbursable Asset</span>
                                      )}
                                    </div>
                                    <span className="font-mono font-black text-[#0b9c54] bg-emerald-50 px-2 py-0.5 rounded text-[10px] flex-shrink-0">Qty: {item.qty}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function isHealthyFormActive(isEditing) {
  return isEditing === true;
}
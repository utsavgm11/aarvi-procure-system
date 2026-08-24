// src/components/MasterPOLedgerDesk.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  FileCheck, Search, ChevronDown, ChevronUp, Landmark, Layers3, 
  Calendar, ArrowLeft, Clock, Edit, Eye, X, Printer, Filter,
  UploadCloud, Paperclip, Trash2, FileText, CheckCircle2,
  ShieldAlert, AlertOctagon
} from 'lucide-react';
import { Card, Button } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function MasterPOLedgerDesk({ currentUser }) {
  const [ledgerList, setLedgerList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedPoForView, setSelectedPoForView] = useState(null);
  const [poItems, setPoItems] = useState([]);
  
  // 🎯 NEW: Store dynamically fetched history logs for expanded rows
  const [rowLogs, setRowLogs] = useState({});

  // Filter Dropdown Selection States
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('ALL'); 

  // Form states for PI, Tax Invoice, and Signed PO
  const [invoiceForms, setInvoiceForms] = useState({});
  const [taxInvoiceForms, setTaxInvoiceForms] = useState({});
  const [poFileForms, setPoFileForms] = useState({});
  
  const [editingInvoices, setEditingInvoices] = useState({}); // Controls PI edit form
  const [editingTaxInvoices, setEditingTaxInvoices] = useState({}); // Controls Tax Invoice edit form
  const [editingPOs, setEditingPOs] = useState({}); // Controls Signed PO edit form
  
  const isPurchaseExecutive = currentUser?.role === 'Purchase Executive';

  const fetchLedgerPOs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/purchase-orders/finalized`);
      setLedgerList(res.data);
      
      const initialForms = {};
      const initialTaxForms = {};
      const initialPoFileForms = {};
      
      res.data.forEach(po => {
        initialForms[po.po_number] = {
          invoice_no: po.invoice_no || '',
          invoice_date: po.invoice_date || '',
          payment_terms: po.invoice_duration || '', 
          file: null
        };
        
        initialTaxForms[po.po_number] = {
          tax_invoice_no: po.tax_invoice_no || '',
          tax_invoice_date: po.tax_invoice_date || '',
          file: null
        };

        initialPoFileForms[po.po_number] = {
          file: null
        };
      });
      
      setInvoiceForms(initialForms);
      setTaxInvoiceForms(initialTaxForms);
      setPoFileForms(initialPoFileForms);
    } catch (err) {
      console.error("Error fetching Master PO Ledger", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) fetchLedgerPOs();
    }, 0);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [fetchLedgerPOs]);

  // 🎯 Fetch History Log when expanding a row to see exact GRN details and proof files
  const toggleExpandRow = async (poNumber, ticketNumber) => {
    const isCurrentlyExpanded = !!expandedRows[poNumber];
    setExpandedRows(prev => ({ ...prev, [poNumber]: !isCurrentlyExpanded }));
    
    // Only fetch if we are opening it and don't already have the logs
    if (!isCurrentlyExpanded && !rowLogs[poNumber]) {
      try {
        const res = await axios.get(`${API_BASE_URL}/requisitions/${ticketNumber}/history`);
        setRowLogs(prev => ({ ...prev, [poNumber]: res.data }));
      } catch (err) {
        console.error("Failed to fetch row history logs", err);
      }
    }
  };

  // --- Signed PO Form Handlers ---
  const handlePoFileChange = (poNumber, event) => {
    const file = event.target.files[0];
    setPoFileForms(prev => ({ ...prev, [poNumber]: { file } }));
  };

  const toggleEditPO = (poNumber) => {
    setEditingPOs(prev => ({ ...prev, [poNumber]: !prev[poNumber] }));
    if (editingInvoices[poNumber]) setEditingInvoices(prev => ({...prev, [poNumber]: false}));
    if (editingTaxInvoices[poNumber]) setEditingTaxInvoices(prev => ({...prev, [poNumber]: false}));
  };

  const handleSaveSignedPo = async (poNumber) => {
    const formState = poFileForms[poNumber];
    if (!formState?.file) {
      alert("Please select a signed PO file first.");
      return;
    }

    const formData = new FormData();
    formData.append('file', formState.file);

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/signed-po`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data'} 
      });
      setEditingPOs(prev => ({ ...prev, [poNumber]: false }));
      fetchLedgerPOs(); 
    } catch (err) { 
      alert("Failed to upload signed PO file."); 
    }
  };

  // --- PI Form Handlers ---
  const handleInputChange = (poNumber, field, value) => {
    setInvoiceForms(prev => ({ ...prev, [poNumber]: { ...prev[poNumber], [field]: value } }));
  };
  const handleFileChange = (poNumber, event) => {
    const file = event.target.files[0];
    setInvoiceForms(prev => ({ ...prev, [poNumber]: { ...prev[poNumber], file: file } }));
  };
  const toggleEditInvoice = (poNumber) => {
    setEditingInvoices(prev => ({ ...prev, [poNumber]: !prev[poNumber] }));
    if (editingTaxInvoices[poNumber]) setEditingTaxInvoices(prev => ({...prev, [poNumber]: false}));
    if (editingPOs[poNumber]) setEditingPOs(prev => ({...prev, [poNumber]: false}));
  };

  // --- Tax Invoice Form Handlers ---
  const handleTaxInputChange = (poNumber, field, value) => {
    setTaxInvoiceForms(prev => ({ ...prev, [poNumber]: { ...prev[poNumber], [field]: value } }));
  };
  const handleTaxFileChange = (poNumber, event) => {
    const file = event.target.files[0];
    setTaxInvoiceForms(prev => ({ ...prev, [poNumber]: { ...prev[poNumber], file: file } }));
  };
  const toggleEditTaxInvoice = (poNumber) => {
    setEditingTaxInvoices(prev => ({ ...prev, [poNumber]: !prev[poNumber] }));
    if (editingInvoices[poNumber]) setEditingInvoices(prev => ({...prev, [poNumber]: false}));
    if (editingPOs[poNumber]) setEditingPOs(prev => ({...prev, [poNumber]: false}));
  };

  // --- Submit API Calls ---
  const handleSaveInvoiceDetails = async (poNumber) => {
    const formState = invoiceForms[poNumber];
    const formData = new FormData();
    formData.append('invoice_no', formState.invoice_no);
    formData.append('invoice_date', formState.invoice_date);
    formData.append('invoice_duration', formState.payment_terms); 
    formData.append('invoice_remark', ""); 
    if (formState.file) formData.append('file', formState.file);

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/invoice`, formData, { headers: { 'Content-Type': 'multipart/form-data'} });
      setEditingInvoices(prev => ({ ...prev, [poNumber]: false }));
      fetchLedgerPOs(); 
    } catch (err) { alert("Failed to commit manual PI data and attachment to the backend engine."); }
  };

  const handleSaveTaxInvoiceDetails = async (poNumber) => {
    const formState = taxInvoiceForms[poNumber];
    const formData = new FormData();
    formData.append('tax_invoice_no', formState.tax_invoice_no);
    formData.append('tax_invoice_date', formState.tax_invoice_date);
    if (formState.file) formData.append('file', formState.file);

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/tax-invoice`, formData, { headers: { 'Content-Type': 'multipart/form-data'} });
      setEditingTaxInvoices(prev => ({ ...prev, [poNumber]: false }));
      fetchLedgerPOs(); 
    } catch (err) { alert("Failed to commit final Tax Invoice data to the backend engine."); }
  };

  // --- Delete API Calls ---
  const handleDeleteInvoiceFile = async (poNumber) => {
    if (!window.confirm("Are you sure you want to permanently delete this attached Proforma Invoice?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/purchase-orders/${poNumber}/invoice-file`);
      fetchLedgerPOs();
    } catch (err) { alert("Failed to delete attachment from server."); }
  };

  const openPoDocumentSection = async (po) => {
    setSelectedPoForView(po);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/${po.ticket_number}/quotations`);
      setPoItems(res.data.filter(q => q.is_selected === true));
    } catch (err) { console.error("Error generating PO template rows injection", err); }
  };

  // --- Metrics & Search Logic ---
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
      const comparisonLimit = new Date(); 
      comparisonLimit.setMonth(comparisonLimit.getMonth() - 6);
      return poDate >= comparisonLimit;
    } catch(e) { return true; }
  };

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

    return { totalSpend, reimbursableTotal, nonReimbursableTotal, reimbursablePercentage, nonReimbursablePercentage, uniqueSitesCount: projectCodes.size };
  }, [ledgerList, selectedProjectFilter, selectedTimeFilter]);

  const filteredLedger = useMemo(() => {
    return ledgerList.filter(po => {
      if (selectedProjectFilter !== 'ALL' && po.project_code !== selectedProjectFilter) return false;
      if (selectedTimeFilter === '6_MONTHS' && !isWithinLast6Months(po.generated_at)) return false;
      return po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [ledgerList, selectedProjectFilter, selectedTimeFilter, searchQuery]);

  const uniqueProjectFilterOptions = useMemo(() => ['ALL', ...new Set(ledgerList.map(po => po.project_code))], [ledgerList]);

  return (
    <div className="space-y-6 relative sm:px-2 md:px-4 lg:px-0">
      
      {/* SECTION VIEW A: DOCUMENT PREVIEW */}
      {selectedPoForView ? (
        <div className="space-y-4 animate-in fade-in duration-200 pb-10">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setSelectedPoForView(null)} className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-[#2c2a57] transition-colors">
              <ArrowLeft size={16} /> <span>Return to Master Ledger Desk</span>
            </button>
            <Button variant="primary" onClick={() => window.print()} className="shadow-sm bg-[#0b9c54] hover:bg-emerald-600">
              <Printer size={16} className="mr-2 hidden sm:inline" /> <span>Print / Save as PDF</span>
            </Button>
          </div>

          <div className="bg-white p-6 sm:p-12 mx-auto border border-slate-200 shadow-lg max-w-4xl text-sm text-slate-800 font-sans overflow-x-auto">
            <div className="min-w-[600px]">
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

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
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
                <span className="text-[11px] font-bold text-slate-500 uppercase hidden sm:inline">Site:</span>
                <select value={selectedProjectFilter} onChange={(e) => setSelectedProjectFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[120px] truncate">
                  {uniqueProjectFilterOptions.map(code => <option key={code} value={code}>{code}</option>)}
                </select>
              </div>
              <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-3xs">
                <Calendar size={12} className="text-slate-400" />
                <span className="text-[11px] font-bold text-slate-500 uppercase hidden sm:inline">Duration:</span>
                <select value={selectedTimeFilter} onChange={(e) => setSelectedTimeFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer">
                  <option value="ALL">All-Time</option>
                  <option value="6_MONTHS">Last 6 Months</option>
                </select>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
            {/* 🎯 MOBILE RESPONSIVE WRAPPER */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-50 border-b border-slate-200">
                    <th className="p-4 w-12 text-center">Manifest</th>
                    <th className="p-4 w-44">Requisition Context</th>
                    <th className="p-4 w-48">Project Scope Context</th>
                    <th className="p-4 w-52">Vendor Matrix</th>
                    <th className="p-4 text-right w-32">Landed Cost</th>
                    <th className="p-4 bg-slate-100/60 text-[#2c2a57] font-extrabold w-[380px]">3-Way Document Vault</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLedger.map((po) => {
                    const isExpanded = !!expandedRows[po.po_number];
                    const isEditingPI = !!editingInvoices[po.po_number];
                    const isEditingTax = !!editingTaxInvoices[po.po_number];
                    const isEditingPO = !!editingPOs[po.po_number];
                    
                    const piForm = invoiceForms[po.po_number] || {};
                    const taxForm = taxInvoiceForms[po.po_number] || {};
                    const poFileForm = poFileForms[po.po_number] || {};
                    
                    // 🎯 Check GRN Status
                    const isDiscrepancy = po.status === 'Material Discrepancy Raised';
                    const isShortage = po.status === 'Partially Delivered';
                    const isDelivered = po.status === 'Delivered - GRN Logged';
                    const hasGrn = isDiscrepancy || isShortage || isDelivered;

                    // Extract the specific GRN log if available
                    const poLogs = rowLogs[po.po_number] || [];
                    const grnLogEntry = poLogs.find(l => 
                      l.action_taken.includes("Material Delivered") || 
                      l.action_taken.includes("Partial Delivery") || 
                      l.action_taken.includes("CRITICAL ALERT")
                    );

                    return (
                      <React.Fragment key={po.po_number}>
                        <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/20' : 'hover:bg-slate-50/40'} ${isDiscrepancy ? 'bg-rose-50/40 hover:bg-rose-50/60' : isShortage ? 'bg-amber-50/40 hover:bg-amber-50/60' : isDelivered ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : ''}`}>
                          
                          {/* Col 1: Manifest Expand */}
                          <td className="p-4 text-center align-top">
                            <button onClick={() => toggleExpandRow(po.po_number, po.ticket_number)} className={`p-1 border rounded shadow-3xs transition-colors ${isExpanded ? 'bg-[#2c2a57] text-white border-[#2c2a57]' : 'text-slate-400 bg-white hover:text-[#2c2a57]'}`}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </td>
                          
                          {/* Col 2: Context */}
                          <td className="p-4 space-y-1 align-top">
                            <div className={`font-mono font-black text-sm ${isDiscrepancy ? 'text-rose-700' : 'text-[#2c2a57]'}`}>{po.po_number}</div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mt-1"><Calendar size={10} className="text-[#0b9c54]" /> <span>PO Sealed: <strong>{po.generated_at}</strong></span></div>
                          </td>
                          
                          {/* Col 3: Project Scope */}
                          <td className="p-4 space-y-1 align-top">
                            <div><strong className="text-slate-900">{po.project_code}</strong></div>
                            <div className="text-[10px] text-slate-500 truncate w-40" title={po.project_name}>{po.project_name}</div>
                            <div className={`mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded w-max uppercase tracking-wider ${
                              isDiscrepancy ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 
                              isShortage ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                              po.status === 'Dispatched' || po.status.includes('Delivered') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                              'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            }`}>
                              {po.status}
                            </div>
                          </td>

                          {/* Col 4: Vendor */}
                          <td className="p-4 space-y-0.5 leading-tight align-top">
                            <div className="font-extrabold text-slate-800 uppercase line-clamp-2 pr-2" title={po.vendor_name}>{po.vendor_name}</div>
                          </td>
                          
                          {/* Col 5: Total */}
                          <td className="p-4 text-right font-mono font-black text-slate-900 text-sm pr-6 align-top">
                            ₹{po.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          
                          {/* Col 6: 3-WAY DOCUMENT VAULT & UPLOADER */}
                          <td className="p-3 bg-slate-50/40 border-l border-slate-200 align-top">
                            <div className="flex flex-col gap-2 relative">
                              
                              {/* DOC 1: SYSTEM / SIGNED PO */}
                              {isEditingPO && isPurchaseExecutive ? (
                                <div className="border border-indigo-300 bg-indigo-50/30 p-2.5 rounded-xl shadow-md animate-in fade-in space-y-2 z-10">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700">Upload Signed PO</span>
                                    <button onClick={() => toggleEditPO(po.po_number)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-indigo-200/50">
                                    <label className="cursor-pointer text-[9px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-100 flex items-center shadow-3xs">
                                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => handlePoFileChange(po.po_number, e)} className="hidden" />
                                      <UploadCloud size={10} className="mr-1"/> {poFileForm.file ? "Change File" : "Attach Signed PO"}
                                    </label>
                                    <button onClick={() => handleSaveSignedPo(po.po_number)} className="bg-[#2c2a57] hover:bg-indigo-900 text-white font-bold text-[9px] px-3 py-1 rounded shadow-3xs transition-colors">Submit</button>
                                  </div>
                                  {poFileForm.file && <p className="text-[9px] font-bold text-emerald-600 truncate mt-1">📄 {poFileForm.file.name}</p>}
                                </div>
                              ) : (
                                <div className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs hover:border-[#2c2a57] transition-all group">
                                  <div className="flex items-center gap-1.5">
                                    <FileText size={12} className="text-[#2c2a57]"/>
                                    <span className="text-[10px] font-bold text-slate-600">PO Document</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => openPoDocumentSection(po)} className="text-[10px] font-black text-[#2c2a57] hover:underline px-1.5 py-0.5 bg-indigo-50 rounded transition-colors">
                                      📄 View PO
                                    </button>
                                    {po.signed_po_url ? (
                                      <a href={po.signed_po_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-emerald-700 hover:underline px-1.5 py-0.5 bg-emerald-50 rounded flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Signed PO
                                      </a>
                                    ) : (
                                      isPurchaseExecutive && (
                                        <button onClick={() => toggleEditPO(po.po_number)} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 rounded px-1.5 py-0.5 hover:border-indigo-400 bg-slate-50 transition-colors">
                                          + Add Signed PO
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* DOC 2: PROFORMA INVOICE (Advance Payment) */}
                              {isEditingPI && isPurchaseExecutive ? (
                                <div className="border border-amber-300 bg-amber-50/30 p-2.5 rounded-xl shadow-md animate-in fade-in space-y-2 z-10">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Upload Proforma (PI)</span>
                                    <button onClick={() => toggleEditInvoice(po.po_number)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
                                  </div>
                                  
                                  <div className="flex gap-2">
                                    <input type="text" value={piForm.invoice_no} onChange={(e) => handleInputChange(po.po_number, 'invoice_no', e.target.value)} placeholder="Invoice No." className="bg-white border border-amber-200 focus:ring-1 focus:ring-amber-400 rounded-md px-2 py-1.5 text-[10px] w-1/2 font-mono outline-none shadow-3xs" />
                                    <input type="text" value={piForm.invoice_date} onChange={(e) => handleInputChange(po.po_number, 'invoice_date', e.target.value)} placeholder="DD-MM-YYYY" className="bg-white border border-amber-200 focus:ring-1 focus:ring-amber-400 rounded-md px-2 py-1.5 text-[10px] w-1/2 font-mono outline-none shadow-3xs" />
                                  </div>
                                  
                                  <div className="flex gap-2 mt-2">
                                    <input type="text" value={piForm.payment_terms} onChange={(e) => handleInputChange(po.po_number, 'payment_terms', e.target.value)} placeholder="Payment Terms" className="w-full bg-white border border-amber-200 focus:ring-1 focus:ring-amber-400 rounded-md px-2 py-1.5 text-[10px] outline-none shadow-3xs" />
                                  </div>

                                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-amber-200/50">
                                    <label className="cursor-pointer text-[9px] font-bold text-amber-700 bg-white border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 flex items-center shadow-3xs">
                                      <input type="file" accept=".pdf,.png,.jpg" onChange={(e) => handleFileChange(po.po_number, e)} className="hidden" />
                                      <UploadCloud size={10} className="mr-1"/> {piForm.file ? "Change File" : "Attach PI"}
                                    </label>
                                    <button onClick={() => handleSaveInvoiceDetails(po.po_number)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] px-4 py-1.5 rounded shadow-3xs transition-colors">Submit</button>
                                  </div>
                                  {piForm.file && <p className="text-[9px] font-bold text-emerald-600 truncate mt-1">📄 {piForm.file.name}</p>}
                                </div>
                              ) : (
                                <div className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs hover:border-amber-400 transition-all group">
                                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><FileText size={12} className="text-amber-500"/> Proforma Invoice (PI)</span>
                                  {po.proforma_invoice_url ? (
                                    <div className="flex items-center gap-1.5">
                                      <a href={po.proforma_invoice_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-amber-600 hover:underline px-2 py-0.5 bg-amber-50 rounded">📄 View PI</a>
                                      {isPurchaseExecutive && (
                                        <button onClick={() => handleDeleteInvoiceFile(po.po_number)} className="text-slate-300 hover:text-rose-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete PI"><Trash2 size={12}/></button>
                                      )}
                                    </div>
                                  ) : (
                                    isPurchaseExecutive ? (
                                      <button onClick={() => toggleEditInvoice(po.po_number)} className="text-[9px] font-bold text-slate-400 hover:text-amber-600 border border-dashed border-slate-300 rounded px-1.5 py-0.5 hover:border-amber-400 bg-slate-50 transition-colors">+ Add PI</button>
                                    ) : <span className="text-[9px] text-slate-400 italic">Not Uploaded</span>
                                  )}
                                </div>
                              )}

                              {/* DOC 3: TAX INVOICE (Final Document) */}
                              {isEditingTax && isPurchaseExecutive ? (
                                <div className="border border-emerald-300 bg-emerald-50/30 p-2.5 rounded-xl shadow-md animate-in fade-in space-y-2 z-10">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Upload Final Tax Invoice</span>
                                    <button onClick={() => toggleEditTaxInvoice(po.po_number)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
                                  </div>
                                  <div className="flex gap-2">
                                    <input type="text" value={taxForm.tax_invoice_no} onChange={(e) => handleTaxInputChange(po.po_number, 'tax_invoice_no', e.target.value)} placeholder="Tax Inv No." className="bg-white border border-emerald-200 focus:ring-1 focus:ring-emerald-400 rounded-md px-2 py-1 text-[10px] w-1/2 font-mono outline-none" />
                                    <input type="text" value={taxForm.tax_invoice_date} onChange={(e) => handleTaxInputChange(po.po_number, 'tax_invoice_date', e.target.value)} placeholder="DD-MM-YYYY" className="bg-white border border-emerald-200 focus:ring-1 focus:ring-emerald-400 rounded-md px-2 py-1 text-[10px] w-1/2 font-mono outline-none" />
                                  </div>
                                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/50">
                                    <label className="cursor-pointer text-[9px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 flex items-center shadow-3xs">
                                      <input type="file" accept=".pdf,.png,.jpg" onChange={(e) => handleTaxFileChange(po.po_number, e)} className="hidden" />
                                      <UploadCloud size={10} className="mr-1"/> {taxForm.file ? "Change File" : "Attach Tax Inv"}
                                    </label>
                                    <button onClick={() => handleSaveTaxInvoiceDetails(po.po_number)} className="bg-[#0b9c54] hover:bg-emerald-600 text-white font-bold text-[9px] px-4 py-1.5 rounded shadow-3xs transition-colors">Submit Final</button>
                                  </div>
                                  {taxForm.file && <p className="text-[9px] font-bold text-emerald-600 truncate mt-1">📄 {taxForm.file.name}</p>}
                                </div>
                              ) : (
                                <div className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs hover:border-[#0b9c54] transition-all group">
                                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><FileText size={12} className="text-[#0b9c54]"/> Final Tax Invoice</span>
                                  {po.tax_invoice_url ? (
                                    <div className="flex items-center gap-1.5">
                                      <a href={po.tax_invoice_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-emerald-700 hover:underline px-2 py-0.5 bg-emerald-50 rounded flex items-center gap-1">
                                        <CheckCircle2 size={10}/> View Tax Inv
                                      </a>
                                    </div>
                                  ) : (
                                    isPurchaseExecutive ? (
                                      <button onClick={() => toggleEditTaxInvoice(po.po_number)} className="text-[9px] font-bold text-slate-400 hover:text-emerald-600 border border-dashed border-slate-300 rounded px-1.5 py-0.5 hover:border-emerald-400 bg-slate-50 transition-colors">+ Add Tax Inv</button>
                                    ) : <span className="text-[9px] text-slate-400 italic">Not Uploaded</span>
                                  )}
                                </div>
                              )}
                              
                            </div>
                          </td>
                        </tr>

                        {/* EXANDED MATERIAL MANIFEST ROW */}
                        {isExpanded && (
                          <tr className={`border-b-2 border-slate-200 ${isDiscrepancy ? 'bg-rose-50/20' : isShortage ? 'bg-amber-50/20' : isDelivered ? 'bg-emerald-50/20' : 'bg-slate-50/40'}`}>
                            <td colSpan="6" className="p-4 pl-16">
                              
                              {/* 🎯 DYNAMIC GRN DISCREPANCY & CLEAN DELIVERY AUDIT BANNER */}
                              {hasGrn && grnLogEntry && (
                                <div className={`mb-4 p-4 rounded-xl border ${isDiscrepancy ? 'bg-rose-50 border-rose-200' : isShortage ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                  <div className="flex items-center space-x-2 mb-2">
                                    {isDiscrepancy ? <ShieldAlert size={18} className="text-rose-600" /> : 
                                     isShortage ? <AlertOctagon size={18} className="text-amber-600" /> :
                                     <CheckCircle2 size={18} className="text-emerald-600" />}
                                    <h4 className={`text-xs font-black uppercase tracking-wider ${isDiscrepancy ? 'text-rose-800' : isShortage ? 'text-amber-800' : 'text-emerald-800'}`}>
                                      {grnLogEntry.action_taken}
                                    </h4>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-3xs space-y-1">
                                    <p className="text-xs text-slate-800">
                                      <span className="font-bold text-slate-500 mr-2">Site Inspector Remarks:</span>
                                      {grnLogEntry.remarks.split(' | Proof')[0]}
                                    </p>
                                    <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-100">
                                      <p className="text-[10px] text-slate-400 font-mono">Logged by {grnLogEntry.user_name} on {grnLogEntry.timestamp}</p>
                                      {grnLogEntry.remarks.includes('Proof File:') && (
                                        <a href={grnLogEntry.remarks.split('Proof File: ')[1]} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                          View Attached Proof <Paperclip size={10} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2.5">
                                <span>Material Manifest Components</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(po.items || []).map((item, idx) => (
                                  <div key={idx} className="bg-white border border-slate-200 px-3 py-2 rounded-xl flex justify-between items-center shadow-3xs hover:border-[#2c2a57]/30 transition-colors">
                                    <div className="truncate pr-4 flex flex-col">
                                      <span className="font-bold text-slate-700 truncate" title={item.desc}>{item.desc}</span>
                                      {item.is_reimbursable && (
                                        <span className="text-[9px] text-cyan-600 font-extrabold uppercase mt-0.5">✓ Reimbursable Asset</span>
                                      )}
                                    </div>
                                    <span className="font-mono font-black text-[#0b9c54] bg-emerald-50 px-2 py-0.5 rounded text-[10px] flex-shrink-0 border border-emerald-100">Qty: {item.qty}</span>
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
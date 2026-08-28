// src/components/AccountsDesk.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  Landmark, Search, Calendar, FileText, UploadCloud, CheckCircle2, 
  Clock, ExternalLink, Paperclip, ShieldCheck, ArrowRight, X, Building2,
  Filter, CheckSquare, Download, Wallet, AlertCircle, Printer, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, Button, StatusBadge, Input } from './ui/SharedUI';

// Assets for System PO Rendering
import aarviLogo from '../assets/logo.png';
import Letterhead from '../assets/letter_head.jpg';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function AccountsDesk({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [selectedPo, setSelectedPo] = useState(null);
  
  // 🎯 Payment Ledger Expansion State
  const [expandedRows, setExpandedRows] = useState({});
  const [rowLogs, setRowLogs] = useState({});

  // 🎯 Modals State
  const [previewDoc, setPreviewDoc] = useState(null); // For Cloudinary PDFs/Images
  const [selectedSystemPo, setSelectedSystemPo] = useState(null); // For Live System PO HTML
  const [poItems, setPoItems] = useState([]);

  // Form States
  const [utrNo, setUtrNo] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [disbursedAmount, setDisbursedAmount] = useState(0);
  const [paymentFile, setPaymentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchAccountsOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/accounts/pending-disbursement`);
      setOrders(res.data);
    } catch (err) {
      console.error("Error fetching Accounts queue", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) fetchAccountsOrders();
    }, 0);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [fetchAccountsOrders]);

  // 🎯 HELPER: Fetch History Log when expanding a row to see multi-payment ledger details
  const toggleExpandRow = async (poNumber, ticketNumber) => {
    const isCurrentlyExpanded = !!expandedRows[poNumber];
    setExpandedRows(prev => ({ ...prev, [poNumber]: !isCurrentlyExpanded }));
    
    // Only fetch if opening and logs don't exist yet
    if (!isCurrentlyExpanded && !rowLogs[poNumber]) {
      try {
        const res = await axios.get(`${API_BASE_URL}/requisitions/${ticketNumber}/history`);
        setRowLogs(prev => ({ ...prev, [poNumber]: res.data }));
      } catch (err) {
        console.error("Failed to fetch row history logs", err);
      }
    }
  };

  // 🎯 HELPER: Smart calculation of payable amount based on text terms (e.g. "50% Advance")
  const calculatePayableNow = (termsStr, grandTotal) => {
    if (!termsStr) return grandTotal;
    const match = termsStr.match(/(\d+)%/);
    if (match && match[1]) {
      const pct = parseFloat(match[1]);
      if (!isNaN(pct) && pct > 0 && pct <= 100) {
        return (grandTotal * pct) / 100;
      }
    }
    return grandTotal;
  };

  // 🎯 HELPER: Handles Opening Cloudinary Documents in Modal
  const handlePreview = (url, title) => {
    if (!url) return;
    let fullUrl = url.startsWith('/') ? `https://aarvi-procure-system.onrender.com${url}` : url;
    setPreviewDoc({ url: fullUrl, title });
  };

  // 🎯 HELPER: Fetches and Opens the Live System Generated PO
  const openSystemPoView = async (po) => {
    setSelectedSystemPo(po);
    try {
      const quotesRes = await axios.get(`${API_BASE_URL}/requisitions/${po.ticket_number}/quotations`);
      const winningLines = quotesRes.data.filter(q => q.is_selected === true);
      setPoItems(winningLines);
    } catch (err) {
      console.error("Error loading PO items", err);
    }
  };

  const openDisbursementModal = (po) => {
    setSelectedPo(po);
    setUtrNo('');
    // Ensure we only grab the date portion YYYY-MM-DD
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentRemark('');
    
    // Auto-calculate the amount defaulting to remaining balance
    const calculatedPayable = (po.remaining_balance && po.remaining_balance > 0) 
      ? po.remaining_balance 
      : calculatePayableNow(po.payment_terms, po.grand_total);
      
    setDisbursedAmount(calculatedPayable);
    setPaymentFile(null);
    setAlert(null);
  };

  const handleDisbursementSubmit = async () => {
    if (!utrNo.trim()) {
      setAlert({ type: 'error', message: "Bank UTR / Transaction Reference No. is mandatory." });
      return;
    }
    if (disbursedAmount <= 0) {
      setAlert({ type: 'error', message: "Payment amount must be greater than zero." });
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('utr_no', utrNo);
    formData.append('payment_date', paymentDate);
    formData.append('payment_remark', paymentRemark);
    formData.append('disbursed_amount', disbursedAmount);
    
    if (paymentFile) {
      formData.append('file', paymentFile);
    }

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${selectedPo.po_number}/disbursement`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAlert({ type: 'success', message: `Payment UTR ${utrNo} recorded successfully!` });
      setTimeout(() => {
        const fullPaymentCleared = disbursedAmount >= (selectedPo.remaining_balance || selectedPo.grand_total);
        setSelectedPo(null);
        fetchAccountsOrders();
        if (fullPaymentCleared) setActiveTab('history');
      }, 1500);
    } catch (err) {
      setAlert({ type: 'error', message: "Failed to submit payment disbursement details." });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(po => {
      const matchesSearch = 
        po.po_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Include "Partially Disbursed" in pending tab
      const matchesTab = activeTab === 'pending' 
        ? (po.status === 'PI Approved - Sent to Accounts' || po.status === 'Partially Disbursed')
        : (po.status === 'Dispatched' || po.status === 'Partially Delivered' || po.status === 'Material Discrepancy Raised' || po.status === 'Delivered - GRN Logged');

      return matchesSearch && matchesTab;
    });
  }, [orders, searchQuery, activeTab]);

  const pendingCount = useMemo(() => orders.filter(o => o.status === 'PI Approved - Sent to Accounts' || o.status === 'Partially Disbursed').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'Dispatched' || o.status === 'Partially Delivered' || o.status === 'Material Discrepancy Raised' || o.status === 'Delivered - GRN Logged').length, [orders]);

  return (
    <div className="space-y-6 relative pb-10 sm:px-2 md:px-4 lg:px-0">
      
      {/* 🎯 1. SMOOTH INLINE DOCUMENT PREVIEW MODAL */}
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

      {/* 🎯 2. LIVE SYSTEM PO VIEWER MODAL */}
      {selectedSystemPo && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedSystemPo(null)} 
        >
          <div 
            className="bg-slate-100 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden relative"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Modal Header */}
            <div className="bg-[#2c2a57] p-4 text-white flex justify-between items-center shrink-0 z-10 print:hidden">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-300" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">System Generated Purchase Order</h3>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => window.print()} className="text-xs bg-white/10 hover:bg-white/20 text-white border-0 py-1.5 px-3">
                  <Printer size={14} className="mr-1.5 inline" /> Print
                </Button>
                <button onClick={() => setSelectedSystemPo(null)} className="text-slate-300 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            
            {/* Scrollable Document Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
              <div className="bg-white p-8 md:p-12 mx-auto border border-slate-200 shadow-sm max-w-4xl text-sm text-slate-800 font-sans print:shadow-none print:border-none print:p-0">
                
                {/* Branding Header */}
                <div className="w-full text-xs text-slate-700 font-sans relative avoid-break">
                  <div className="w-full bg-white relative z-10 mb-1">
                    <img src={Letterhead} alt="Aarvi Letterhead" className="w-full h-auto object-contain select-none" onError={(e) => e.target.style.display='none'} />
                  </div>
                  <div className="mt-2 flex justify-between items-baseline border-t border-slate-400 pt-1 font-mono text-[11px] relative z-10">
                    <span className="font-black text-slate-900">Ref: AEL/{selectedSystemPo.vendor_name?.substring(0,6).toUpperCase()}-PO/{selectedSystemPo.po_number?.split('-')[2]}</span>
                    <span className="font-bold text-slate-800">Date: {selectedSystemPo.generated_at}</span>
                  </div>
                  <h1 className="text-base font-black text-slate-950 tracking-wider uppercase text-center mt-2 bg-slate-100 py-1 border-y border-slate-400 relative z-10">
                    Purchase Order
                  </h1>
                </div>

                {/* Vendor & Project Info */}
                <div className="grid grid-cols-2 gap-12 my-8">
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-wider mb-1">To Vendor</h3>
                    <p className="font-extrabold text-slate-900 text-sm uppercase">M/s. {selectedSystemPo.vendor_name}</p>
                    <p className="text-slate-600 text-xs mt-1">{selectedSystemPo.vendor_address || "Address Not Available"}</p>
                    <p className="text-slate-600 text-xs mt-1 font-mono">Contact: {selectedSystemPo.vendor_contact || "N/A"}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-[10px] font-black uppercase text-[#0b9c54] tracking-wider mb-1">Project Destination</h3>
                    <p className="font-extrabold text-slate-900 text-sm">{selectedSystemPo.project_name}</p>
                    <p className="text-slate-600 text-xs mt-1 font-mono">Project Code: {selectedSystemPo.project_code}</p>
                  </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-left mb-6 border-collapse border border-slate-400">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 text-[10px] uppercase tracking-wider border-b border-slate-400">
                      <th className="py-2.5 px-3 border-r border-slate-400 text-center w-12">Sr.</th>
                      <th className="py-2.5 px-3 border-r border-slate-400">Description & Specifications</th>
                      <th className="py-2.5 px-3 border-r border-slate-400 text-center w-20">Qty</th>
                      <th className="py-2.5 px-3 text-right w-32">Total Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.map((item, i) => (
                      <tr key={i} className="text-xs border-b border-slate-300">
                        <td className="py-3 px-3 border-r border-slate-400 text-center text-slate-600 font-mono">{i + 1}</td>
                        <td className="py-3 px-3 border-r border-slate-400 font-bold text-slate-800">{item.product_description} {item.make_brand && `(${item.make_brand})`}</td>
                        <td className="py-3 px-3 border-r border-slate-400 text-center font-mono font-bold">{item.quantity || 1}</td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">{(item.base_total_value || item.total_amount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      </tr>
                    ))}
                    <tr className="font-black bg-slate-100 border-t-2 border-slate-400 text-black">
                      <td colSpan="3" className="py-2.5 px-3 border-r border-slate-400 text-right uppercase text-[10px]">Net Amount Payable (Incl. GST)</td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm">{selectedSystemPo.grand_total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-xs space-y-2 mt-8 text-slate-700">
                  <p><strong className="text-slate-900 uppercase">Payment Terms:</strong> {selectedSystemPo.payment_terms || "100% Payable on Delivery"}</p>
                  <p><strong className="text-slate-900 uppercase">Billing Status:</strong> Proforma Invoice Generated</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#2c2a57] tracking-tight">Accounts & Disbursement Desk</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Verify Proforma Invoices, execute partial or full bank transfers, and log receipts.</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button 
            variant={activeTab === 'pending' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('pending')} 
            className="text-[11px] md:text-xs py-2 px-3 flex-1 md:flex-none whitespace-nowrap"
          >
            <Wallet size={14} className="mr-1.5 inline" /> <span>Pending Payments ({pendingCount})</span>
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('history')} 
            className="text-[11px] md:text-xs py-2 px-3 flex-1 md:flex-none whitespace-nowrap"
          >
            <CheckSquare size={14} className="mr-1.5 inline" /> <span>Cleared Ledger ({completedCount})</span>
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        <Card className="p-4 flex items-center space-x-4 border-l-4 border-indigo-500 bg-white shadow-2xs">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><Landmark size={20} /></div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Awaiting Disbursement</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{pendingCount} Orders</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4 border-l-4 border-emerald-500 bg-white shadow-2xs">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Disbursed & Dispatched</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{completedCount} Orders</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center space-x-4 border-l-4 border-amber-500 bg-white shadow-2xs sm:col-span-2 md:col-span-1">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Building2 size={20} /></div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace</p>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">Finance Ledger</h3>
          </div>
        </Card>
      </div>

      {/* SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO number, vendor, or project name..." 
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 outline-none focus:border-[#2c2a57] shadow-3xs"
          />
        </div>
      </div>

      {/* 📱 MOBILE RESPONSIVE CARD VIEW (Hidden on md and up) */}
      <div className="md:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-sm border-dashed border-2">
            No orders found in this view.
          </Card>
        ) : (
          filteredOrders.map((po) => {
            const isPartiallyPaid = po.status === 'Partially Disbursed';
            const isExpanded = !!expandedRows[po.po_number];
            const logs = rowLogs[po.po_number] || [];
            // Filter logs to find payment related entries
            const paymentLogs = logs.filter(l => l.action_taken.includes("Disbursement") || l.action_taken.includes("Payment"));

            return (
              <Card key={po.po_number} className={`p-4 space-y-4 bg-white border-slate-200 ${isPartiallyPaid ? 'border-l-4 border-l-amber-500' : ''}`}>
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <div className="font-mono font-black text-[#2c2a57] text-sm">{po.po_number}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.ticket_number}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={po.status} />
                    {isPartiallyPaid && (
                      <button onClick={() => toggleExpandRow(po.po_number, po.ticket_number)} className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        View Payment Ledger {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Vendor</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{po.vendor_name}</span>
                  </div>
                  
                  {/* Financial Breakdown Mobile */}
                  <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 mt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Total PO Value:</span>
                      <span className="font-mono font-bold text-slate-800">₹{po.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {po.disbursed_amount > 0 && (
                      <div className="flex justify-between items-center text-xs text-emerald-600 font-bold">
                        <span>Already Paid:</span>
                        <span className="font-mono">₹{po.disbursed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    {(po.remaining_balance > 0 || !po.disbursed_amount) && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                        <span className="font-bold text-rose-600">Balance Pending:</span>
                        <span className="font-mono font-black text-rose-600 text-sm">₹{(po.remaining_balance || po.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Payment Ledger Mobile */}
                {isExpanded && isPartiallyPaid && (
                  <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 space-y-2">
                    <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">Payment History Audit</span>
                    <div className="space-y-2">
                      {paymentLogs.map((log, idx) => (
                        <div key={idx} className="bg-white p-2 border border-slate-200 rounded text-[10px] space-y-1">
                          <p className="font-bold text-slate-700">{log.remarks}</p>
                          <p className="text-[9px] font-mono text-slate-400">Logged on: {log.timestamp}</p>
                          {log.remarks.includes('Proof File:') && (
                            <button onClick={() => handlePreview(log.remarks.split('Proof File: ')[1], `Payment Advice`)} className="mt-1 text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-max flex items-center gap-1">
                              <Paperclip size={10} /> View Bank Receipt
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document Links Mobile */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Audit Vault:</span>
                  <div className="flex flex-col gap-1.5">
                    {/* 1. Signed PO / System PO */}
                    {po.signed_po_url ? (
                      <button 
                        onClick={() => handlePreview(po.signed_po_url, `Signed PO Document`)} 
                        className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1.5 rounded hover:bg-indigo-100 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1">✍️ Signed PO</span>
                        <ExternalLink size={10} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => openSystemPoView(po)} 
                        className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-1.5 rounded hover:bg-indigo-50 transition-colors flex items-center justify-between shadow-3xs"
                      >
                        <span className="flex items-center gap-1">📄 System Generated PO</span>
                        <ExternalLink size={10} />
                      </button>
                    )}

                    {/* 2. PI */}
                    {po.proforma_invoice_url ? (
                      <button 
                        onClick={() => handlePreview(po.proforma_invoice_url, `Proforma Invoice #${po.invoice_no}`)}
                        className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded hover:bg-amber-100 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1">📄 PI ({po.invoice_no || 'Pending'})</span>
                        <ExternalLink size={10} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded w-full block">No PI Attached</span>
                    )}

                    {/* 3. Tax Invoice */}
                    {po.tax_invoice_url ? (
                      <button 
                        onClick={() => handlePreview(po.tax_invoice_url, `Tax Invoice #${po.tax_invoice_no}`)}
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded hover:bg-emerald-100 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-1">🧾 Tax Inv ({po.tax_invoice_no || 'Pending'})</span>
                        <ExternalLink size={10} />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded w-full block">Tax Inv Pending</span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  {po.status === 'PI Approved - Sent to Accounts' || po.status === 'Partially Disbursed' ? (
                    <Button variant="primary" onClick={() => openDisbursementModal(po)} className="w-full text-xs py-2 bg-[#0b9c54] hover:bg-emerald-600 shadow-3xs">
                      {isPartiallyPaid ? "Clear Remaining Balance" : "Process Advance Payment"}
                    </Button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center space-y-1">
                      <span className="text-[11px] font-bold text-emerald-700 block">Final UTR: {po.utr_no}</span>
                      <span className="text-[9px] font-bold text-emerald-600 block">100% Cleared: ₹{(po.disbursed_amount || po.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 💻 DESKTOP TABLE VIEW (Hidden on small screens) */}
      <Card className="hidden md:block overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="text-[10px] uppercase font-black tracking-wider text-slate-400 bg-slate-50 border-b border-slate-200">
                <th className="p-4 w-40">PO / Ticket Code</th>
                <th className="p-4 w-44">Project Scope</th>
                <th className="p-4 w-48">Vendor Information</th>
                <th className="p-4 text-right w-44">Financial Breakdown</th>
                <th className="p-4 w-60">Document Vault & Terms</th>
                <th className="p-4 w-36 text-center">Workflow Status</th>
                <th className="p-4 text-center w-40">Accounts Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 text-sm">
                    No orders found in this view.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const isPartiallyPaid = po.status === 'Partially Disbursed';
                  const isExpanded = !!expandedRows[po.po_number];
                  const logs = rowLogs[po.po_number] || [];
                  const paymentLogs = logs.filter(l => l.action_taken.includes("Disbursement") || l.action_taken.includes("Payment"));

                  return (
                    <React.Fragment key={po.po_number}>
                      <tr className={`hover:bg-slate-50/50 transition-colors ${isPartiallyPaid ? 'bg-amber-50/20' : ''} ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                        
                        <td className="p-4 align-top">
                          <div className="font-mono font-black text-[#2c2a57] text-sm">{po.po_number}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.ticket_number}</div>
                          {isPartiallyPaid && (
                            <button onClick={() => toggleExpandRow(po.po_number, po.ticket_number)} className="mt-2 text-[9px] font-black uppercase flex items-center gap-1 text-amber-600 bg-white border border-amber-200 px-1.5 py-0.5 rounded hover:bg-amber-100">
                              {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />} Payment Ledger
                            </button>
                          )}
                        </td>
                        
                        <td className="p-4 align-top">
                          <div className="font-bold text-slate-800">{po.project_code}</div>
                          <div className="text-[10px] text-slate-500 truncate w-40" title={po.project_name}>{po.project_name}</div>
                        </td>
                        
                        <td className="p-4 align-top">
                          <div className="font-extrabold text-slate-800 uppercase line-clamp-1" title={po.vendor_name}>{po.vendor_name}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{po.vendor_contact} | {po.vendor_email}</div>
                        </td>
                        
                        {/* 🎯 FINANCIAL BREAKDOWN */}
                        <td className="p-4 text-right font-mono align-top bg-slate-50/30 space-y-1 border-l border-slate-100">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Value:</span>
                            <span className="font-extrabold text-slate-800">₹{po.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          {po.disbursed_amount > 0 && (
                            <div className="pt-0.5 text-emerald-600">
                              <span className="text-[9px] font-bold uppercase block">Already Paid:</span>
                              <span className="font-bold">₹{po.disbursed_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                          {(po.remaining_balance > 0 || !po.disbursed_amount) && (
                            <div className="pt-1 border-t border-slate-200/60">
                              <span className="text-[9px] font-bold text-rose-500 uppercase block">Pending Balance:</span>
                              <span className="font-black text-rose-600 text-sm">₹{(po.remaining_balance || po.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </td>
                        
                        {/* DOCUMENT VAULT */}
                        <td className="p-4 align-top space-y-2 border-l border-slate-100">
                          <div className="inline-block bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 text-[10px] font-black text-indigo-800 truncate max-w-full" title={po.payment_terms}>
                            Terms: {po.payment_terms || '100% Payable'}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            {po.signed_po_url ? (
                              <button onClick={() => handlePreview(po.signed_po_url, `Signed PO - ${po.po_number}`)} className="flex items-center justify-between bg-white border border-slate-200 px-2 py-1 rounded text-[10px] hover:border-indigo-400 transition-colors shadow-3xs w-full text-left">
                                <span className="font-bold text-slate-700 flex items-center gap-1">✍️ Signed PO</span><ExternalLink size={10} className="text-indigo-400 flex-shrink-0" />
                              </button>
                            ) : (
                              <button onClick={() => openSystemPoView(po)} className="flex items-center justify-between bg-white border border-slate-200 px-2 py-1 rounded text-[10px] hover:border-indigo-400 transition-colors shadow-3xs w-full text-left">
                                <span className="font-bold text-slate-700 flex items-center gap-1">📄 System PO</span><span className="text-[9px] font-black text-indigo-600 uppercase">View</span>
                              </button>
                            )}

                            {po.proforma_invoice_url ? (
                              <button onClick={() => handlePreview(po.proforma_invoice_url, `Proforma Invoice #${po.invoice_no}`)} className="flex items-center justify-between bg-amber-50/60 border border-amber-200 px-2 py-1 rounded text-[10px] hover:border-amber-400 transition-colors shadow-3xs w-full text-left">
                                <span className="font-bold text-amber-800 flex items-center gap-1 truncate max-w-[130px]">📄 PI #{po.invoice_no}</span><ExternalLink size={10} className="text-amber-500 flex-shrink-0" />
                              </button>
                            ) : <span className="text-[9px] italic text-slate-400 pl-1 block">No PI Attached</span>}

                            {po.tax_invoice_url ? (
                              <button onClick={() => handlePreview(po.tax_invoice_url, `Tax Invoice #${po.tax_invoice_no}`)} className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 px-2 py-1 rounded text-[10px] hover:border-emerald-400 transition-colors shadow-3xs w-full text-left">
                                <span className="font-bold text-emerald-800 flex items-center gap-1 truncate max-w-[130px]">🧾 Tax Inv #{po.tax_invoice_no}</span><ExternalLink size={10} className="text-emerald-500 flex-shrink-0" />
                              </button>
                            ) : <span className="text-[9px] italic text-slate-400 pl-1 block">Tax Inv Pending</span>}
                          </div>
                        </td>

                        <td className="p-4 align-top text-center">
                          <StatusBadge status={po.status} />
                        </td>

                        {/* Accounts Action */}
                        <td className="p-4 text-center align-top border-l border-slate-100">
                          {po.status === 'PI Approved - Sent to Accounts' || po.status === 'Partially Disbursed' ? (
                            <Button variant="primary" onClick={() => openDisbursementModal(po)} className="text-[11px] py-2 px-3 bg-[#0b9c54] hover:bg-emerald-600 shadow-3xs w-full font-bold">
                              {isPartiallyPaid ? "Clear Remaining Balance" : "Process Advance Payment"}
                            </Button>
                          ) : (
                            <div className="space-y-1.5 text-center flex flex-col items-center">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex flex-col w-full">
                                <span className="text-[8px] text-emerald-500 uppercase tracking-widest">Final UTR No:</span>
                                {po.utr_no}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500">
                                Total Paid: ₹{(po.disbursed_amount || po.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              {po.payment_advice_url && (
                                <button onClick={() => handlePreview(po.payment_advice_url, `Payment Receipt - ${po.utr_no}`)} className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded hover:text-indigo-800 hover:bg-indigo-100 font-bold text-[10px] flex items-center gap-1 justify-center transition-colors w-full mt-1">
                                  <Download size={10} /> View Receipt
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* 🎯 EXPANDED PAYMENT LEDGER ROW */}
                      {isExpanded && isPartiallyPaid && (
                        <tr className="bg-amber-50/30 border-b-2 border-slate-200">
                          <td colSpan="7" className="p-4 pl-12 pr-12">
                            <div className="bg-white border border-amber-200 p-4 rounded-xl shadow-3xs">
                              <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-amber-600 tracking-wider mb-3">
                                <span>Multi-Payment Audit Ledger</span>
                              </div>
                              <div className="space-y-2">
                                {paymentLogs.map((log, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-800">{log.remarks.split(' | ')[0]}</span>
                                      <span className="text-[9px] font-mono text-slate-400 mt-0.5">Processed by {log.user_name} on {log.timestamp}</span>
                                    </div>
                                    {log.remarks.includes('Proof File:') && (
                                      <button 
                                        onClick={() => handlePreview(log.remarks.split('Proof File: ')[1], `Payment Advice`)}
                                        className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-100 flex items-center gap-1"
                                      >
                                        <Paperclip size={10} /> View Bank Receipt
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 🎯 DISBURSEMENT PAYMENT MODAL */}
      {selectedPo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#2c2a57] p-4 sm:p-5 text-white flex justify-between items-center shrink-0 shadow-sm z-10">
              <div className="flex items-center space-x-2.5">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Landmark size={18} className="text-emerald-400" />
                </div>
                <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">Execute Bank Disbursement</h3>
              </div>
              <button onClick={() => setSelectedPo(null)} className="text-slate-300 hover:text-white bg-white/10 p-1 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              
              {alert && (
                <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{alert.message}</span>
                </div>
              )}

              {/* 🎯 FINANCIAL SUMMARY BANNER */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs shadow-3xs">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">PO Number:</span> 
                  <span className="font-mono font-black text-[#2c2a57] text-sm bg-white px-2 py-0.5 rounded border border-slate-200">{selectedPo.po_number}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Total PO Value</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5">₹{selectedPo.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  
                  <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-200 shadow-3xs flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase">Payment Terms</span>
                    <span className="font-bold text-indigo-900 text-[10px] mt-0.5 line-clamp-2 leading-tight">{selectedPo.payment_terms || '100% Payable'}</span>
                  </div>
                  
                  <div className="col-span-2 bg-emerald-50 border border-emerald-200 p-3 rounded-lg shadow-3xs flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800 uppercase">Remaining Balance Pending:</span>
                    <span className="font-mono font-black text-emerald-700 text-lg">₹{(selectedPo.remaining_balance || selectedPo.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Input 
                    label="Amount Paying Now (₹) *" 
                    type="number"
                    value={disbursedAmount} 
                    onChange={e => setDisbursedAmount(parseFloat(e.target.value) || 0)} 
                    placeholder="0.00" 
                    className="font-mono font-black text-base bg-white border-emerald-300 focus:ring-emerald-500 text-emerald-900"
                  />
                  <div className="flex justify-between items-center mt-1.5">
                    <p className="text-[9px] text-emerald-600 font-medium pl-1">Edit manually for custom partial payments.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Input 
                    label="Bank UTR / Transaction Reference Number *" 
                    value={utrNo} 
                    onChange={e => setUtrNo(e.target.value)} 
                    placeholder="e.g. UTR1234567890AX" 
                    className="font-mono text-sm uppercase"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Payment Execution Date" 
                    type="date"
                    value={paymentDate} 
                    onChange={e => setPaymentDate(e.target.value)} 
                  />
                </div>

                <Input 
                  label="Disbursement Notes / Payment Mode" 
                  value={paymentRemark} 
                  onChange={e => setPaymentRemark(e.target.value)} 
                  placeholder="e.g. RTGS Payment via HDFC Bank / 50% Advance cleared..." 
                />

                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 space-y-2">
                  <label className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Paperclip size={12} /> Attach Bank Transfer Advice (Optional)
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={e => setPaymentFile(e.target.files[0])}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 bg-white border border-slate-200 rounded-lg p-1 text-slate-500 transition-all cursor-pointer shadow-3xs"
                  />
                  {paymentFile && (
                    <p className="text-[10px] font-bold text-emerald-600 pt-1 flex items-center gap-1">
                      <CheckCircle2 size={12} /> {paymentFile.name} selected.
                    </p>
                  )}
                </div>
              </div>

            </div>
            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
              <Button variant="ghost" onClick={() => setSelectedPo(null)} disabled={submitting} className="px-5 text-xs font-bold">
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleDisbursementSubmit} 
                disabled={submitting} 
                className="bg-[#0b9c54] hover:bg-emerald-600 px-6 py-2 shadow-sm text-xs"
              >
                {submitting ? "Processing Upload..." : "Confirm & Send Funds"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
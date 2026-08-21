// src/components/AccountsDesk.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  Landmark, Search, Calendar, FileText, UploadCloud, CheckCircle2, 
  Clock, ExternalLink, Paperclip, ShieldCheck, ArrowRight, X, Building2,
  Filter, CheckSquare, Download, Wallet, AlertCircle
} from 'lucide-react';
import { Card, Button, StatusBadge, Input } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function AccountsDesk({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [selectedPo, setSelectedPo] = useState(null);

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

  // Defer state invocation via macro-task to prevent cascading render fault lines
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) fetchAccountsOrders();
    }, 0);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [fetchAccountsOrders]);

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

  const openDisbursementModal = (po) => {
    setSelectedPo(po);
    setUtrNo(po.utr_no || '');
    setPaymentDate(po.payment_date || new Date().toISOString().split('T')[0]);
    setPaymentRemark(po.payment_remark || '');
    
    // Auto-calculate the amount if not previously disbursed
    const calculatedPayable = po.disbursed_amount > 0 
      ? po.disbursed_amount 
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

    setSubmitting(true);
    const formData = new FormData();
    formData.append('utr_no', utrNo);
    formData.append('payment_date', paymentDate);
    formData.append('payment_remark', paymentRemark);
    formData.append('disbursed_amount', disbursedAmount); // 🎯 Send disbursed amount to backend
    if (paymentFile) {
      formData.append('file', paymentFile);
    }

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${selectedPo.po_number}/disbursement`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAlert({ type: 'success', message: `Payment UTR ${utrNo} recorded successfully! Order marked as Dispatched.` });
      setTimeout(() => {
        setSelectedPo(null);
        fetchAccountsOrders();
        setActiveTab('history'); // Switch to history tab to show the completed item
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
      
      const matchesTab = activeTab === 'pending' 
        ? po.status === 'PI Approved - Sent to Accounts' 
        : po.status === 'Dispatched';

      return matchesSearch && matchesTab;
    });
  }, [orders, searchQuery, activeTab]);

  const pendingCount = useMemo(() => orders.filter(o => o.status === 'PI Approved - Sent to Accounts').length, [orders]);
  const completedCount = useMemo(() => orders.filter(o => o.status === 'Dispatched').length, [orders]);

  return (
    <div className="space-y-6 relative pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Accounts & Disbursement Desk</h1>
          <p className="text-sm text-slate-500 font-medium">Verify PM-approved Proforma Invoices, execute bank transfers, and log payment receipts.</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button 
            variant={activeTab === 'pending' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('pending')} 
            className="text-xs py-2 flex-1 md:flex-none flex items-center justify-center gap-1.5"
          >
            <Wallet size={14} /> <span>Pending Payments ({pendingCount})</span>
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'primary' : 'ghost'} 
            onClick={() => setActiveTab('history')} 
            className="text-xs py-2 flex-1 md:flex-none flex items-center justify-center gap-1.5"
          >
            <CheckSquare size={14} /> <span>Disbursed Ledger ({completedCount})</span>
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
          <Search className="absolute left-3 top-3 text-slate-400" size={15} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO number, vendor, or project name..." 
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-[#2c2a57] shadow-3xs"
          />
        </div>
      </div>

      {/* MOBILE RESPONSIVE CARD VIEW (Hidden on md and up) */}
      <div className="md:hidden space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-sm border-dashed border-2">
            No orders found in this view.
          </Card>
        ) : (
          filteredOrders.map((po) => {
            const poDocUrl = po.signed_po_url || po.po_pdf_url;
            const targetPayable = calculatePayableNow(po.payment_terms, po.grand_total);

            return (
              <Card key={po.po_number} className="p-4 space-y-4 bg-white border-slate-200">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <div className="font-mono font-black text-[#2c2a57] text-sm">{po.po_number}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.ticket_number}</div>
                  </div>
                  <StatusBadge status={po.status} />
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Vendor</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{po.vendor_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Project</span>
                    <span className="font-bold text-slate-800 line-clamp-1">{po.project_code}</span>
                  </div>
                  
                  {/* Financial Breakdown Mobile */}
                  <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-500">Total PO Value:</span>
                      <span className="font-mono font-bold text-slate-800">₹{po.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                      <span className="font-bold text-[#0b9c54]">Payable Now ({po.payment_terms || '100%'}):</span>
                      <span className="font-mono font-black text-[#0b9c54] text-sm">₹{targetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Document Links Mobile */}
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Audit Vault:</span>
                  <div className="flex flex-col gap-1.5">
                    {poDocUrl && (
                      <a href={poDocUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1.5 rounded hover:bg-indigo-100 transition-colors flex items-center justify-between">
                        <span className="flex items-center gap-1">{po.signed_po_url ? "✍️ Signed PO" : "📄 System PO"}</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                    {po.proforma_invoice_url ? (
                      <a href={po.proforma_invoice_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded hover:bg-amber-100 transition-colors flex items-center justify-between">
                        <span className="flex items-center gap-1">📄 PI ({po.invoice_no || 'Pending'})</span>
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded">No PI Attached</span>
                    )}
                    {po.tax_invoice_url ? (
                      <a href={po.tax_invoice_url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded hover:bg-emerald-100 transition-colors flex items-center justify-between">
                        <span className="flex items-center gap-1">🧾 Tax Inv ({po.tax_invoice_no || 'Pending'})</span>
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded">Tax Inv Pending</span>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  {po.status === 'PI Approved - Sent to Accounts' ? (
                    <Button variant="primary" onClick={() => openDisbursementModal(po)} className="w-full text-xs py-2 bg-[#0b9c54] hover:bg-emerald-600 shadow-3xs">
                      Process Payment
                    </Button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center space-y-1">
                      <span className="text-[11px] font-bold text-emerald-700 block">UTR: {po.utr_no}</span>
                      <span className="text-[9px] font-bold text-emerald-600 block">Disbursed: ₹{(po.disbursed_amount || po.grand_total).toLocaleString('en-IN')}</span>
                      {po.payment_advice_url && (
                        <a href={po.payment_advice_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold text-[10px] inline-block hover:underline mt-1">
                          📄 View Payment Receipt
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Hidden on small screens) */}
      <Card className="hidden md:block overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="overflow-x-auto">
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
                  const poDocUrl = po.signed_po_url || po.po_pdf_url;
                  const targetPayable = calculatePayableNow(po.payment_terms, po.grand_total);

                  return (
                    <tr key={po.po_number} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 align-top">
                        <div className="font-mono font-black text-[#2c2a57] text-sm">{po.po_number}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.ticket_number}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-bold text-slate-800">{po.project_code}</div>
                        <div className="text-[10px] text-slate-500 truncate w-40" title={po.project_name}>{po.project_name}</div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-extrabold text-slate-800 uppercase line-clamp-1" title={po.vendor_name}>{po.vendor_name}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">{po.vendor_contact} | {po.vendor_email}</div>
                      </td>
                      
                      {/* 🎯 FINANCIAL BREAKDOWN */}
                      <td className="p-4 text-right font-mono align-top bg-slate-50/30 space-y-1">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Total PO:</span>
                          <span className="font-extrabold text-slate-800">₹{po.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="pt-1 border-t border-slate-200/60">
                          <span className="text-[9px] font-bold text-[#0b9c54] uppercase block">Payable Now:</span>
                          <span className="font-black text-[#0b9c54] text-sm">₹{targetPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                      
                      {/* 🎯 DOCUMENT VAULT & TERMS */}
                      <td className="p-4 align-top space-y-2 border-l border-slate-100">
                        {/* Terms Badge */}
                        <div className="inline-block bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5 text-[10px] font-black text-indigo-800 truncate max-w-full" title={po.payment_terms}>
                          Terms: {po.payment_terms || '100% Payable'}
                        </div>

                        {/* Document Badges */}
                        <div className="flex flex-col gap-1.5">
                          {/* 1. Signed PO / System PO */}
                          <a 
                            href={poDocUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-between bg-white border border-slate-200 px-2 py-1 rounded text-[10px] hover:border-indigo-400 transition-colors shadow-3xs"
                          >
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              {po.signed_po_url ? "✍️ Signed PO" : "📄 System PO"}
                            </span>
                            <ExternalLink size={10} className="text-indigo-400" />
                          </a>

                          {/* 2. Proforma Invoice (PI) */}
                          {po.proforma_invoice_url ? (
                            <a 
                              href={po.proforma_invoice_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center justify-between bg-amber-50/60 border border-amber-200 px-2 py-1 rounded text-[10px] hover:border-amber-400 transition-colors shadow-3xs"
                            >
                              <span className="font-bold text-amber-800 flex items-center gap-1 truncate max-w-[130px]">
                                📄 PI #{po.invoice_no}
                              </span>
                              <ExternalLink size={10} className="text-amber-500" />
                            </a>
                          ) : (
                            <span className="text-[9px] italic text-slate-400 pl-1">No PI Attached</span>
                          )}

                          {/* 3. Final Tax Invoice (TI) */}
                          {po.tax_invoice_url ? (
                            <a 
                              href={po.tax_invoice_url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 px-2 py-1 rounded text-[10px] hover:border-emerald-400 transition-colors shadow-3xs"
                            >
                              <span className="font-bold text-emerald-800 flex items-center gap-1 truncate max-w-[130px]">
                                🧾 Tax Inv #{po.tax_invoice_no}
                              </span>
                              <ExternalLink size={10} className="text-emerald-500" />
                            </a>
                          ) : (
                            <span className="text-[9px] italic text-slate-400 pl-1">Tax Inv Pending</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 align-top text-center">
                        <StatusBadge status={po.status} />
                      </td>

                      {/* Accounts Action */}
                      <td className="p-4 text-center align-top border-l border-slate-100">
                        {po.status === 'PI Approved - Sent to Accounts' ? (
                          <Button 
                            variant="primary" 
                            onClick={() => openDisbursementModal(po)}
                            className="text-xs py-1.5 px-3 bg-[#0b9c54] hover:bg-emerald-600 shadow-3xs w-full"
                          >
                            Process Payment
                          </Button>
                        ) : (
                          <div className="space-y-1.5 text-center flex flex-col items-center">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 flex flex-col w-full">
                              <span className="text-[8px] text-emerald-500 uppercase tracking-widest">UTR No:</span>
                              {po.utr_no}
                            </span>
                            <span className="text-[9px] font-bold text-slate-500">
                              Disbursed: ₹{(po.disbursed_amount || po.grand_total).toLocaleString('en-IN')}
                            </span>
                            {po.payment_advice_url && (
                              <a 
                                href={po.payment_advice_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded hover:text-indigo-800 hover:bg-indigo-100 font-bold text-[10px] flex items-center gap-1 justify-center transition-colors w-full mt-1"
                              >
                                <Download size={10} /> Receipt PDF
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DISBURSEMENT PAYMENT MODAL */}
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

              {/* 🎯 4-CARD FINANCIAL SUMMARY BANNER */}
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
                    <span className="font-bold text-indigo-900 text-xs mt-0.5 line-clamp-2 leading-tight">{selectedPo.payment_terms || '100% Payable'}</span>
                  </div>
                  
                  <div className="col-span-2 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg shadow-3xs flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Calculated Payable Now:</span>
                    <span className="font-mono font-black text-emerald-700 text-base">₹{calculatePayableNow(selectedPo.payment_terms, selectedPo.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                
                {/* 🎯 EDITABLE DISBURSED AMOUNT INPUT */}
                <div>
                  <Input 
                    label="Final Amount Disbursing Now (₹) *" 
                    type="number"
                    value={disbursedAmount} 
                    onChange={e => setDisbursedAmount(parseFloat(e.target.value) || 0)} 
                    placeholder="0.00" 
                    className="font-mono font-bold text-sm bg-white border-emerald-300 focus:ring-emerald-500 text-emerald-900"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[9px] text-emerald-600 font-medium pl-1">
                      Edit manually if releasing a custom partial amount.
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 pr-1">
                      Balance: <span className="text-rose-500 font-mono">₹{(selectedPo.grand_total - disbursedAmount).toLocaleString('en-IN')}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Input 
                    label="Bank UTR / Transaction Reference Number *" 
                    value={utrNo} 
                    onChange={e => setUtrNo(e.target.value)} 
                    placeholder="e.g. UTR1234567890AX" 
                    className="font-mono text-sm"
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
                {submitting ? "Processing Upload..." : "Confirm Payment & Dispatch"}
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
// src/components/InvoiceRecoveryDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  FileText, CheckCircle2, AlertCircle, Clock, 
  Send, Landmark, Download, FileOutput, ExternalLink, X, Search
} from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function InvoiceRecoveryDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('pending_invoicing'); // 'pending_invoicing' | 'pending_recovery'
  const [pendingInvoicing, setPendingInvoicing] = useState([]);
  const [pendingRecovery, setPendingRecovery] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [invoiceForms, setInvoiceForms] = useState({});
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchQueues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/expenses/invoice-queue`);
      setPendingInvoicing(res.data.pending_invoicing);
      setPendingRecovery(res.data.pending_recovery);
    } catch (err) {
      console.error("Failed to load invoice queues", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const handlePreviewFile = (url, title) => {
    if (!url) return;
    let fullUrl = url.startsWith('/') ? `https://aarvi-procure-system.onrender.com${url}` : url;
    setPreviewDoc({ url: fullUrl, title });
  };

  const handleInvoiceSubmit = async (claimId) => {
    const invoiceNo = invoiceForms[claimId];
    if (!invoiceNo) return setAlert({ type: 'error', message: 'Client Invoice Number is required.' });

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/expenses/${claimId}/invoice`, {
        client_invoice_no: invoiceNo
      });
      setAlert({ type: 'success', message: `Invoice ${invoiceNo} generated successfully. Moved to Recovery Queue.` });
      setInvoiceForms(prev => {
        const newState = { ...prev };
        delete newState[claimId];
        return newState;
      });
      fetchQueues();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to log client invoice.' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRecovered = async (claimId) => {
    if (!window.confirm("Are you sure you want to mark these funds as officially recovered from the client? This closes the loop.")) return;

    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/expenses/${claimId}/recover`);
      setAlert({ type: 'success', message: 'Funds marked as recovered! Loop successfully closed.' });
      fetchQueues();
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to process recovery status.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoicing = pendingInvoicing.filter(c => 
    c.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.project_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.emp_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecovery = pendingRecovery.filter(c => 
    c.claim_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.project_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.client_invoice_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInvoicingValue = pendingInvoicing.reduce((sum, item) => sum + item.total_amount, 0);
  const totalRecoveryValue = pendingRecovery.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <div className="space-y-6 relative pb-10 sm:px-2 md:px-4">
      {/* 🎯 DOCUMENT PREVIEWER */}
      {previewDoc && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#2c2a57] p-4 text-white flex justify-between items-center shrink-0 z-10">
              <div className="flex items-center gap-2"><FileText size={18} className="text-indigo-300" /><h3 className="font-extrabold text-sm uppercase tracking-wider">{previewDoc.title}</h3></div>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-300 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors"><X size={16} /></button>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-auto custom-scrollbar">
              {previewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) != null ? (
                <div className="min-h-full flex items-center justify-center p-4"><img src={previewDoc.url} alt={previewDoc.title} className="max-w-full h-auto rounded-lg shadow-sm" /></div>
              ) : (
                <iframe src={previewDoc.url} className="w-full h-full border-0" title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER & METRICS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#2c2a57] tracking-tight">Client Invoice & Recovery Ledger</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Track billable employee expenses, generate client invoices, and log funds recovery.</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pending Invoicing</p>
                <p className="text-lg font-black text-amber-900">₹{totalInvoicingValue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Pending Recovery</p>
                <p className="text-lg font-black text-emerald-900">₹{totalRecoveryValue.toLocaleString('en-IN')}</p>
            </div>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border shadow-sm ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckCircle2 size={18} className="flex-shrink-0" /> <span className="font-semibold text-xs md:text-sm">{alert.message}</span>
        </div>
      )}

      {/* SEARCH & TABS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="flex w-full sm:w-auto p-1 bg-white rounded-lg border border-slate-200 shadow-3xs">
          <Button variant={activeTab === 'pending_invoicing' ? 'primary' : 'ghost'} onClick={() => setActiveTab('pending_invoicing')} className="text-[11px] md:text-xs py-2 px-4 whitespace-nowrap flex-1">
            <FileOutput size={14} className="mr-1.5 inline" /> Pending Invoicing ({pendingInvoicing.length})
          </Button>
          <Button variant={activeTab === 'pending_recovery' ? 'primary' : 'ghost'} onClick={() => setActiveTab('pending_recovery')} className="text-[11px] md:text-xs py-2 px-4 whitespace-nowrap flex-1">
            <Landmark size={14} className="mr-1.5 inline" /> Pending Recovery ({pendingRecovery.length})
          </Button>
        </div>

        <div className="w-full sm:w-72 relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Claim No, Project, or Employee..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 outline-none focus:border-indigo-400 shadow-3xs"
            />
        </div>
      </div>

      {/* 🎯 TAB 1: PENDING INVOICING (Kiska Invoice Banna Hai) */}
      {activeTab === 'pending_invoicing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
            {filteredInvoicing.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                    No billable claims are currently pending client invoicing.
                </div>
            ) : (
                filteredInvoicing.map(claim => (
                    <Card key={claim.id} className="p-0 overflow-hidden border-amber-200 shadow-sm">
                        <div className="bg-amber-50 p-3 border-b border-amber-100 flex justify-between items-center">
                            <span className="font-mono font-black text-amber-900 text-xs">{claim.claim_number}</span>
                            <span className="text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                {claim.expense_category}
                            </span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="font-black text-slate-800">{claim.project_code}</h3>
                                <p className="text-xs text-slate-500 font-medium">Employee: {claim.emp_name} ({claim.emp_code})</p>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Claim Amount</p>
                                    <p className="font-mono font-black text-slate-900 text-sm">₹{claim.total_amount.toLocaleString('en-IN')}</p>
                                </div>
                                <button onClick={() => handlePreviewFile(claim.receipt_url, `Receipt: ${claim.claim_number}`)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded flex items-center gap-1 border border-indigo-100 transition-colors">
                                    <ExternalLink size={12} /> View Receipt
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle2 size={12}/> Paid to Employee via NEFT:
                                </p>
                                <p className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded inline-block border border-slate-200">
                                    {claim.neft_utr} ({claim.paid_date})
                                </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <p className="text-[10px] font-black uppercase text-[#2c2a57] tracking-widest">Generate Client Bill</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={invoiceForms[claim.id] || ''}
                                        onChange={(e) => setInvoiceForms(prev => ({...prev, [claim.id]: e.target.value}))}
                                        placeholder="Enter Client Invoice No..." 
                                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-amber-400 shadow-3xs bg-white"
                                    />
                                    <Button variant="primary" onClick={() => handleInvoiceSubmit(claim.id)} disabled={loading} className="px-4 bg-amber-500 hover:bg-amber-600 shadow-sm text-xs shrink-0">
                                        <Send size={14}/>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
      )}

      {/* 🎯 TAB 2: PENDING RECOVERY (Kiska Recovery Hua Hai) */}
      {activeTab === 'pending_recovery' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in">
            {filteredRecovery.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                    No invoices are currently pending recovery from clients.
                </div>
            ) : (
                filteredRecovery.map(claim => (
                    <Card key={claim.id} className="p-0 overflow-hidden border-emerald-200 shadow-sm relative">
                        {/* Status Ribbon */}
                        <div className="absolute top-3 -right-6 rotate-45 bg-amber-500 text-white text-[8px] font-black uppercase py-0.5 px-8 shadow-sm tracking-widest">
                            Awaiting Funds
                        </div>

                        <div className="bg-emerald-50 p-3 border-b border-emerald-100 flex justify-between items-center">
                            <span className="font-mono font-black text-emerald-900 text-xs">{claim.claim_number}</span>
                            <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 mr-8">
                                {claim.expense_category}
                            </span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="font-black text-slate-800">{claim.project_code}</h3>
                                <p className="text-xs text-slate-500 font-medium">Employee: {claim.emp_name}</p>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Amount to Recover</p>
                                    <p className="font-mono font-black text-slate-900 text-sm">₹{claim.total_amount.toLocaleString('en-IN')}</p>
                                </div>
                                <button onClick={() => handlePreviewFile(claim.receipt_url, `Receipt: ${claim.claim_number}`)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded flex items-center gap-1 border border-indigo-100 transition-colors">
                                    <ExternalLink size={12} /> View Base Bill
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                <div>
                                    <span className="text-[9px] font-bold uppercase text-indigo-400 block mb-0.5">Employee NEFT Paid</span>
                                    <span className="font-mono font-bold text-indigo-900">{claim.paid_date}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-bold uppercase text-indigo-400 block mb-0.5">Client Invoice No.</span>
                                    <span className="font-mono font-black text-indigo-900">{claim.client_invoice_no}</span>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100">
                                <Button 
                                    variant="success" 
                                    onClick={() => handleMarkRecovered(claim.id)} 
                                    disabled={loading} 
                                    className="w-full text-xs py-2.5 shadow-md bg-[#0b9c54] hover:bg-emerald-600"
                                >
                                    <Landmark size={14} className="mr-1.5"/> Mark Funds Recovered
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))
            )}
        </div>
      )}
    </div>
  );
}
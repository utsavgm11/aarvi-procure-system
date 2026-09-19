// src/components/MasterPOLedgerDesk.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { 
  FileCheck, Search, ChevronDown, ChevronUp, Landmark, Layers3, 
  Calendar, ArrowLeft, Clock, Edit, Eye, X, Printer, Filter,
  UploadCloud, Paperclip, Trash2, FileText, CheckCircle2,
  ShieldAlert, AlertOctagon, Wallet, ExternalLink, Download, Scissors, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Card, Button, StatusBadge, Input } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function MasterPOLedgerDesk({ currentUser }) {
  // 🎯 3-TAB ARCHITECTURE STATE
  const [activeMasterTab, setActiveMasterTab] = useState('ledger'); // 'ledger' | 'renewals'
  const [ledgerList, setLedgerList] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedPoForView, setSelectedPoForView] = useState(null);
  const [poItems, setPoItems] = useState([]);
  
  // 🎯 Modal Preview State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Store dynamically fetched history logs for expanded rows
  const [rowLogs, setRowLogs] = useState({});

  // Filter Dropdown Selection States
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('ALL');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('ALL'); 
  const [selectedPMFilter, setSelectedPMFilter] = useState('ALL'); 

  // Form states for PI, Tax Invoice, and Signed PO
  const [invoiceForms, setInvoiceForms] = useState({});
  const [taxInvoiceForms, setTaxInvoiceForms] = useState({});
  const [poFileForms, setPoFileForms] = useState({});
  
  const [editingInvoices, setEditingInvoices] = useState({});
  const [editingTaxInvoices, setEditingTaxInvoices] = useState({});
  const [editingPOs, setEditingPOs] = useState({});

  // 🎯 NEW: Form states for Billing Date Editor
  const [editingBillingDate, setEditingBillingDate] = useState({});
  const [billingDateForms, setBillingDateForms] = useState({});
  
  const isPurchaseExecutive = currentUser?.role === 'Purchase Executive';
  const isManagerOrDirector = ['Director', 'Project Manager', 'Admin', 'IT Manager'].includes(currentUser?.role);
  
  const canViewAll = [
    'Director', 
    'Purchase Executive', 
    'Admin', 
    'Accounts', 
    'Accounts Executive', 
    'Finance Manager',
    'IT Manager'
  ].includes(currentUser?.role);

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

  const fetchExpiringContracts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/purchase-orders/expiring`);
      setExpiringContracts(res.data);
    } catch (err) {
      console.error("Error fetching expiring contracts", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        if (activeMasterTab === 'ledger') fetchLedgerPOs();
        if (activeMasterTab === 'renewals') fetchExpiringContracts();
      }
    }, 0);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [activeMasterTab, fetchLedgerPOs, fetchExpiringContracts]);

  const toggleExpandRow = async (poNumber, ticketNumber) => {
    const isCurrentlyExpanded = !!expandedRows[poNumber];
    setExpandedRows(prev => ({ ...prev, [poNumber]: !isCurrentlyExpanded }));
    
    if (!isCurrentlyExpanded && !rowLogs[poNumber]) {
      try {
        const res = await axios.get(`${API_BASE_URL}/requisitions/${ticketNumber}/history`);
        setRowLogs(prev => ({ ...prev, [poNumber]: res.data }));
      } catch (err) {
        console.error("Failed to fetch row history logs", err);
      }
    }
  };

  const handlePreviewFile = (url, title) => {
    if (!url) return;
    let fullUrl = url.startsWith('/') ? `https://aarvi-procure-system.onrender.com${url}` : url;
    setPreviewDoc({ url: fullUrl, title });
  };

  // 🎯 NEW HELPER: Mathematical Offset Engine & Billing Logic for Display
  const getLeaseMetrics = (po) => {
    if (!po.is_recurring || !po.contract_end_date) return null;
    const end = new Date(po.contract_end_date);
    const today = new Date();
    const monthsLeft = Math.max(0, (end.getFullYear() - today.getFullYear()) * 12 + (end.getMonth() - today.getMonth()));
    const deposit = parseFloat(po.security_deposit_amount) || 0;
    const rate = parseFloat(po.monthly_rate) || 0;
    return { monthsLeft, deposit, rate };
  };

  const handleTruncatePO = async (poNumber) => {
    const actualMonthsUsed = prompt("Early Contract Closure.\nHow many total months were actually consumed? (e.g. 4)");
    if (!actualMonthsUsed || isNaN(actualMonthsUsed)) return;

    const depositAdjusted = prompt("Security Deposit Recovery.\nEnter amount of deposit being offset/adjusted from final payout: (e.g. 100000)");
    if (!depositAdjusted || isNaN(depositAdjusted)) return;

    const remarks = prompt("Provide reasoning for early termination (Required):");
    if (!remarks) return;

    if (!window.confirm(`WARNING: You are about to permanently truncate PO ${poNumber} to ${actualMonthsUsed} months and adjust ₹${depositAdjusted} from the final payout. This will close the contract. Proceed?`)) return;

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/truncate`, {
        user_name: currentUser?.name || "System User",
        remarks: remarks,
        actual_months_used: parseInt(actualMonthsUsed),
        deposit_adjusted_amount: parseFloat(depositAdjusted)
      });
      alert(`Success! Contract PO ${poNumber} truncated and unspent funds returned to project ledger.`);
      fetchLedgerPOs();
    } catch (err) {
      alert("Failed to truncate contract: " + (err.response?.data?.detail || "System Error"));
    }
  };

  // 🎯 RENEWAL SUBMISSION
  const [renewalForm, setRenewalForm] = useState({});
  const handleRenewSubmit = async (poNumber) => {
    const formState = renewalForm[poNumber];
    if (!formState || !formState.months || !formState.endDate || !formState.remarks) {
      alert("Please fill all renewal fields.");
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/renew`, {
        user_name: currentUser?.name || "System User",
        user_role: currentUser?.role || "Manager",
        additional_months: parseInt(formState.months),
        new_end_date: formState.endDate,
        remarks: formState.remarks
      });
      alert(`Success! PO ${poNumber} has been successfully renewed and ceiling increased.`);
      
      setRenewalForm(prev => {
        const newState = { ...prev };
        delete newState[poNumber];
        return newState;
      });
      fetchExpiringContracts();
    } catch (err) {
      alert("Failed to process renewal.");
    }
  };

  // 🎯 NEW: UPDATE BILLING DATE SUBMISSION
  const handleBillingDateSubmit = async (poNumber) => {
    try {
      const newDate = parseInt(billingDateForms[poNumber]);
      if (!newDate || newDate < 1 || newDate > 28) {
        alert("Valid billing date (1-28) required.");
        return;
      }
      await axios.put(`${API_BASE_URL}/purchase-orders/${poNumber}/billing-date`, {
        user_name: currentUser?.name || "System User",
        billing_trigger_date: newDate
      });
      alert("Billing cycle successfully updated.");
      setEditingBillingDate(prev => ({...prev, [poNumber]: false}));
      fetchLedgerPOs();
    } catch (err) {
      alert("Failed to update billing date.");
    }
  };

  // --- Form Handlers ---
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
    } catch (err) { alert("Failed to save Proforma Invoice details."); }
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
    } catch (err) { alert("Failed to save Final Tax Invoice."); }
  };

  const handleDeleteInvoiceFile = async (poNumber) => {
    if (!window.confirm("Are you sure you want to permanently delete this attached Proforma Invoice?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/purchase-orders/${poNumber}/invoice-file`);
      fetchLedgerPOs();
    } catch (err) { alert("Failed to delete attachment."); }
  };

  const openPoDocumentSection = async (po) => {
    setSelectedPoForView(po);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/${po.ticket_number}/quotations`);
      setPoItems(res.data.filter(q => q.is_selected === true));
    } catch (err) { console.error("Error generating PO template", err); }
  };

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

  const filteredLedger = useMemo(() => {
    return ledgerList.filter(po => {
      if (!canViewAll) {
        if (po.pm_id !== currentUser?.id && po.project_manager !== currentUser?.name) return false;
      } else {
        if (selectedPMFilter !== 'ALL' && po.project_manager !== selectedPMFilter) return false;
      }
      if (selectedProjectFilter !== 'ALL' && po.project_code !== selectedProjectFilter) return false;
      if (selectedTimeFilter === '6_MONTHS' && !isWithinLast6Months(po.generated_at)) return false;
      
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch = po.po_number.toLowerCase().includes(search) ||
          po.project_code.toLowerCase().includes(search) ||
          po.project_name.toLowerCase().includes(search) ||
          po.vendor_name.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      return true;
    });
  }, [ledgerList, selectedProjectFilter, selectedTimeFilter, selectedPMFilter, searchQuery, currentUser, canViewAll]);

  const analyticsMetrics = useMemo(() => {
    let totalSpend = 0;
    let reimbursableTotal = 0;
    let nonReimbursableTotal = 0;
    const projectCodes = new Set();
    
    filteredLedger.forEach(po => {
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
  }, [filteredLedger]);

  const uniqueProjectFilterOptions = useMemo(() => ['ALL', ...new Set(ledgerList.map(po => po.project_code))], [ledgerList]);
  const uniquePMOptions = useMemo(() => ['ALL', ...new Set(ledgerList.map(po => po.project_manager).filter(pm => pm && pm !== "Pending / N/A"))], [ledgerList]);

  const handleExportToExcel = () => {
    if (!filteredLedger || filteredLedger.length === 0) {
      alert("No records to export based on current filters.");
      return;
    }
    const headers = [
      "PO Number", "PO Date", "Project Manager", "Project Code", "Project Name", "Vendor Name", 
      "Product Descriptions", "Quantities", "Duration of Contract", "Payment Terms", 
      "Base Amount", "GST Amount", "Total Amount", 
      "Tax Invoice No", "Tax Invoice Date", 
      "Disbursed Payment", "Remaining Balance", "Payment UTR", "Payment Date", "Current Status"
    ];
    const csvRows = filteredLedger.map(po => {
      const products = po.items ? po.items.map(i => i.desc).join(" | ").replace(/"/g, '""') : "N/A";
      const quantities = po.items ? po.items.map(i => i.qty).join(" | ") : "0";
      const balance = Math.max(0, po.grand_total - po.disbursed_amount);
      return [
        `"${po.po_number}"`, `"${po.generated_at}"`, `"${po.project_manager}"`, `"${po.project_code}"`, `"${po.project_name}"`, `"${po.vendor_name}"`,
        `"${products}"`, `"${quantities}"`, `"${po.contract_duration}"`, `"${po.payment_terms}"`,
        `"${po.base_total}"`, `"${po.gst_amount}"`, `"${po.grand_total}"`,
        `"${po.tax_invoice_no}"`, `"${po.tax_invoice_date}"`,
        `"${po.disbursed_amount}"`, `"${balance}"`, `"${po.utr_no}"`, `"${po.payment_date}"`, `"${po.status}"`
      ].join(',');
    });
    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `Aarvi_Master_PO_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 relative sm:px-2 md:px-4 lg:px-0 pb-12">
      
      {/* 🎯 IN-APP MODAL DOCUMENT VIEWER */}
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
                <iframe src={previewDoc.url} className="w-full h-full border-0" title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION WITH 🎯 TAB NAVIGATION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Master PO & Spend Ledger</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Track all authorized purchases, monitor deliveries, and renew expiring contracts.</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button 
            variant={activeMasterTab === 'ledger' ? 'primary' : 'ghost'} 
            onClick={() => setActiveMasterTab('ledger')} 
            className="text-[11px] md:text-xs py-2 px-3 flex-1 md:flex-none whitespace-nowrap"
          >
            <Wallet size={14} className="mr-1.5 inline" /> <span>Master Spend Ledger</span>
          </Button>
          <Button 
            variant={activeMasterTab === 'renewals' ? 'primary' : 'ghost'} 
            onClick={() => setActiveMasterTab('renewals')} 
            className="text-[11px] md:text-xs py-2 px-3 flex-1 md:flex-none whitespace-nowrap"
          >
            <RefreshCw size={14} className="mr-1.5 inline" /> 
            <span>Active Contracts & Renewals {expiringContracts.length > 0 && <span className="ml-1 bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{expiringContracts.length}</span>}</span>
          </Button>
        </div>
      </div>

      {/* CONDITIONAL RENDERING FOR THE 3 TABS */}
      {activeMasterTab === 'renewals' ? (
        
        /* 🎯 TAB 2: ACTIVE CONTRACTS & RENEWALS DASHBOARD */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl">
            <h2 className="font-black text-indigo-900 flex items-center gap-2"><RefreshCw size={18}/> Contract Expiry Monitor</h2>
            <p className="text-sm text-indigo-700 mt-1">Displays recurring leases (Vehicles, Accommodation, Subscriptions) expiring in the next 45 days.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expiringContracts.length === 0 ? (
              <Card className="p-12 text-center text-slate-400 border-dashed border-2 col-span-full">
                No active contracts are expiring within the next 45 days.
              </Card>
            ) : (
              expiringContracts.map((contract) => {
                const isCritical = contract.days_remaining <= 15;
                return (
                  <Card key={contract.po_number} className={`p-0 overflow-hidden border-2 ${isCritical ? 'border-rose-300' : 'border-amber-200'}`}>
                    <div className={`p-3 text-white flex justify-between items-center ${isCritical ? 'bg-rose-600' : 'bg-amber-500'}`}>
                      <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle size={14}/> {isCritical ? "CRITICAL: Expiring Very Soon" : "Action Required: Expiring Soon"}
                      </span>
                      <span className="font-bold text-sm">{contract.days_remaining} Days Left</span>
                    </div>
                    <div className="p-5 space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-black text-[#2c2a57] font-mono">{contract.po_number}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{contract.category}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800">{contract.project_name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">Vendor: {contract.vendor_name}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[9px] font-bold uppercase text-slate-400 block">Current Expiry Date</span>
                          <span className={`font-black ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>{contract.end_date}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase text-slate-400 block">Monthly Run Rate</span>
                          <span className="font-bold text-slate-800">₹{contract.monthly_rate.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      
                      {/* Renewal Form */}
                      {isManagerOrDirector && (
                        <div className="pt-2 border-t border-slate-100 space-y-3">
                          <p className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Execute Renewal Extension</p>
                          <div className="grid grid-cols-2 gap-2">
                            <Input 
                              type="number" 
                              placeholder="Months to Add (e.g. 6)" 
                              value={renewalForm[contract.po_number]?.months || ''}
                              onChange={(e) => setRenewalForm(prev => ({...prev, [contract.po_number]: {...prev[contract.po_number], months: e.target.value}}))}
                            />
                            <Input 
                              type="date" 
                              label="New End Date"
                              value={renewalForm[contract.po_number]?.endDate || ''}
                              onChange={(e) => setRenewalForm(prev => ({...prev, [contract.po_number]: {...prev[contract.po_number], endDate: e.target.value}}))}
                            />
                          </div>
                          <Input 
                            placeholder="Reason for extension / performance remarks..." 
                            value={renewalForm[contract.po_number]?.remarks || ''}
                            onChange={(e) => setRenewalForm(prev => ({...prev, [contract.po_number]: {...prev[contract.po_number], remarks: e.target.value}}))}
                          />
                          <Button 
                            variant="primary" 
                            className="w-full text-xs py-2 bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => handleRenewSubmit(contract.po_number)}
                          >
                            Confirm Extension & Increase Cap
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      ) : selectedPoForView ? (
        
        /* 🎯 TAB 3: DOCUMENT PREVIEW (Sub-view of Ledger) */
        <div className="space-y-4 animate-in fade-in duration-200 pb-10">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setSelectedPoForView(null)} className="flex items-center space-x-2 text-sm font-bold text-slate-500 hover:text-[#2c2a57] transition-colors">
              <ArrowLeft size={16} /> <span>Return to Ledger</span>
            </button>
            <Button variant="primary" onClick={() => window.print()} className="shadow-sm bg-[#0b9c54] hover:bg-emerald-600">
              <Printer size={16} className="mr-2 hidden sm:inline" /> <span>Print Document</span>
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
        /* 🎯 TAB 1: MASTER SPEND LEDGER */
        <div className="animate-in fade-in duration-300">
          
          {/* 📊 ANALYTICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <Card className="p-4 flex items-center space-x-4 border-l-4 border-emerald-500 bg-white shadow-2xs">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600"><Landmark size={20} /></div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Spent</p>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">₹{analyticsMetrics.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
              </div>
            </Card>
            <Card className="p-4 flex items-center justify-between bg-white shadow-2xs border border-slate-200">
              <div className="space-y-1.5 flex-1 pr-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reimbursable Breakdown</p>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-700 flex justify-between">
                    <span className="text-cyan-600">Reimbursable:</span>
                    <span>₹{analyticsMetrics.reimbursableTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({analyticsMetrics.reimbursablePercentage.toFixed(1)}%)</span>
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex justify-between">
                    <span className="text-amber-600">Company Cost:</span>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><FileCheck size={12} /> Active Orders</p>
                <h4 className="text-base font-black text-slate-800 mt-1">{filteredLedger.length}</h4>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Layers3 size={12} /> Sites Served</p>
                <h4 className="text-base font-black text-slate-800 mt-1">{analyticsMetrics.uniqueSitesCount}</h4>
              </div>
            </Card>
          </div>

          {/* 🔍 SEARCH & FILTERS */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search PO number, vendor, or project..." 
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 outline-none focus:border-[#2c2a57] shadow-3xs"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              
              {canViewAll && (
                <div className="flex items-center space-x-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-3xs">
                  <Filter size={12} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase hidden sm:inline">Manager:</span>
                  <select value={selectedPMFilter} onChange={(e) => setSelectedPMFilter(e.target.value)} className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer max-w-[120px] truncate">
                    {uniquePMOptions.map(pm => <option key={pm} value={pm}>{pm}</option>)}
                  </select>
                </div>
              )}
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
              <button 
                onClick={handleExportToExcel}
                className="bg-[#0b9c54] hover:bg-emerald-600 text-white rounded-lg transition-all flex items-center justify-center space-x-1.5 px-3 py-1.5 text-[11px] font-bold shadow-3xs w-full sm:w-auto"
              >
                <Download size={13} /> <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 📱 MOBILE RESPONSIVE CARDS (Hidden on larger screens) */}
          <div className="md:hidden space-y-4">
            {filteredLedger.length === 0 ? (
               <Card className="p-8 text-center text-slate-400 text-sm border-dashed border-2">No orders match your search.</Card>
            ) : (
              filteredLedger.map((po) => {
                const isExpanded = !!expandedRows[po.po_number];
                const total = po.grand_total || 0;
                const paid = po.disbursed_amount || 0;
                const pending = Math.max(0, total - paid);
                const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                
                const isDiscrepancy = po.status === 'Material Discrepancy Raised';
                const isShortage = po.status === 'Partially Delivered';
                const isDelivered = po.status === 'Delivered - GRN Logged';

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
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Project</span>
                        <span className="font-bold text-slate-800 line-clamp-1">{po.project_code}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Vendor</span>
                        <span className="font-bold text-slate-800 line-clamp-1">{po.vendor_name}</span>
                      </div>
                      
                      <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="font-bold text-slate-600">Total Amount:</span>
                          <span className="font-mono font-black text-slate-900">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 my-2">
                          <div className={`h-1.5 rounded-full ${progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progressPct}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-emerald-600">Paid: ₹{paid.toLocaleString('en-IN')}</span>
                          <span className="text-rose-500">Pending: ₹{pending.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => toggleExpandRow(po.po_number, po.ticket_number)} 
                      className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-[#2c2a57] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                    >
                      {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} 
                      {isExpanded ? "Hide Details & Documents" : "View Details & Documents"}
                    </button>

                    {/* EXPANDED MOBILE VIEW */}
                    {isExpanded && (
                      <div className="pt-2 space-y-4 border-t border-slate-200 animate-in fade-in">
                        
                        {(isDiscrepancy || isShortage || isDelivered) && (
                           <div className={`p-3 rounded-xl border ${isDiscrepancy ? 'bg-rose-50 border-rose-200' : isShortage ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                              <span className={`text-[10px] font-black uppercase ${isDiscrepancy ? 'text-rose-800' : isShortage ? 'text-amber-800' : 'text-emerald-800'}`}>Delivery Status</span>
                              <p className="text-xs font-medium text-slate-800 mt-1">{rowLogs[po.po_number]?.find(l => l.action_taken.includes("Delivered") || l.action_taken.includes("ALERT"))?.remarks.split(' | ')[0]}</p>
                           </div>
                        )}

                        {/* 🎯 RECURRING CONTRACT SUMMARY (Mobile) */}
                        {po.is_recurring && po.status !== 'Contract Terminated & Closed' && (() => {
                          const metrics = getLeaseMetrics(po);
                          return (
                            <div className="bg-purple-50/30 border border-purple-200 p-3 rounded-xl space-y-3 mb-3">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-purple-600 uppercase">Deposit Held</span>
                                <span className="font-mono font-black text-purple-900">₹{(metrics?.deposit || 0).toLocaleString('en-IN')}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs border-t border-purple-100 pt-2">
                                <span className="font-bold text-purple-600 uppercase">Time Remaining</span>
                                <span className="font-black text-purple-900">{metrics?.monthsLeft || 0} Mos</span>
                              </div>
                              <div className="flex justify-between items-center text-xs border-t border-purple-100 pt-2">
                                <span className="font-bold text-emerald-600 uppercase">Paid Till Now</span>
                                <span className="font-mono font-black text-emerald-700">₹{paid.toLocaleString('en-IN')}</span>
                              </div>
                              
                              <div className="border-t border-purple-200 pt-3 flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Billing Cycle</span>
                                  <span className="text-xs font-bold text-[#2c2a57]">
                                    {editingBillingDate[po.po_number] ? 'Edit:' : `Every ${po.billing_trigger_date}th`}
                                  </span>
                                </div>
                                
                                {editingBillingDate[po.po_number] ? (
                                   <div className="flex items-center gap-1.5">
                                     <input 
                                       type="number" min="1" max="28"
                                       value={billingDateForms[po.po_number] || po.billing_trigger_date || ''}
                                       onChange={(e) => setBillingDateForms(prev => ({...prev, [po.po_number]: e.target.value}))}
                                       className="w-12 px-1 py-1 border border-purple-300 rounded text-xs text-center outline-none"
                                     />
                                     <button onClick={() => handleBillingDateSubmit(po.po_number)} className="bg-emerald-500 text-white p-1 rounded hover:bg-emerald-600"><CheckCircle2 size={12} /></button>
                                     <button onClick={() => setEditingBillingDate(prev => ({...prev, [po.po_number]: false}))} className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300"><X size={12} /></button>
                                   </div>
                                 ) : (
                                   canViewAll && ( 
                                     <button 
                                       onClick={() => {
                                         setEditingBillingDate(prev => ({...prev, [po.po_number]: true}));
                                         setBillingDateForms(prev => ({...prev, [po.po_number]: po.billing_trigger_date}));
                                       }} 
                                       className="text-purple-600 bg-white p-1.5 rounded border border-purple-200 shadow-3xs"
                                     >
                                       <Edit size={12} />
                                     </button>
                                   )
                                 )}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                           <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Documents</span>
                           <div className="flex flex-col gap-2">
                              {po.signed_po_url ? (
                                <button type="button" onClick={() => handlePreviewFile(po.signed_po_url, `Signed PO: ${po.po_number}`)} className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-3 py-2 rounded-lg hover:bg-indigo-50 flex justify-between items-center">
                                  <span>✍️ Signed PO</span><ExternalLink size={12}/>
                                </button>
                              ) : (
                                <button type="button" onClick={() => openPoDocumentSection(po)} className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-100 flex justify-between items-center">
                                  <span>📄 View System PO</span><ExternalLink size={12}/>
                                </button>
                              )}
                              {po.proforma_invoice_url && (
                                <button type="button" onClick={() => handlePreviewFile(po.proforma_invoice_url, `Proforma Invoice: ${po.invoice_no || po.po_number}`)} className="text-[10px] font-bold text-amber-700 bg-white border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-50 flex justify-between items-center">
                                  <span>📄 PI {po.invoice_no ? `(${po.invoice_no})` : ''}</span><ExternalLink size={12}/>
                                </button>
                              )}
                              {po.tax_invoice_url && (
                                <button type="button" onClick={() => handlePreviewFile(po.tax_invoice_url, `Tax Invoice: ${po.tax_invoice_no || po.po_number}`)} className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-50 flex justify-between items-center">
                                  <span>🧾 Tax Inv {po.tax_invoice_no ? `(${po.tax_invoice_no})` : ''}</span><ExternalLink size={12}/>
                                </button>
                              )}
                           </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex justify-between items-center">
                            Ordered Items
                            
                            {/* 🎯 EARLY CLOSE BUTTON MOBILE */}
                            {isManagerOrDirector && ['VEHICLE', 'ACCOMMODATION', 'SUBSCRIPTION'].includes(po.category) && po.status !== 'Contract Terminated & Closed' && (
                              <button 
                                onClick={() => handleTruncatePO(po.po_number)}
                                className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded flex items-center gap-1 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                              >
                                <Scissors size={10} /> Truncate Contract
                              </button>
                            )}
                          </span>
                          <div className="flex flex-col gap-2">
                            {(po.items || []).map((item, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-xs shadow-3xs">
                                <span className="font-bold text-slate-700 truncate pr-2">{item.desc}</span>
                                <span className="font-mono font-black text-[#0b9c54] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Qty: {item.qty}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Payment History</span>
                          <div className="flex flex-col gap-2">
                            {(rowLogs[po.po_number] || [])
                              .filter(l => l.action_taken.includes("Disbursement") || l.action_taken.includes("Payment") || l.action_taken.includes("Closure") || l.action_taken.includes("Renewed"))
                              .map((log, idx) => (
                                <div key={idx} className={`p-2.5 border rounded-lg text-[10px] shadow-3xs ${log.action_taken.includes("Closure") ? "bg-rose-50 border-rose-200" : log.action_taken.includes("Renewed") ? "bg-indigo-50 border-indigo-200" : "bg-white border-slate-200"}`}>
                                  <p className={`font-bold ${log.action_taken.includes("Closure") ? "text-rose-900" : log.action_taken.includes("Renewed") ? "text-indigo-900" : "text-slate-800"}`}>{log.remarks.split(' | ')[0]}</p>
                                  <p className="text-[9px] text-slate-400 mt-1 font-mono">{log.timestamp.split(' ')[0]}</p>
                                  {log.remarks.includes('Proof File:') && (
                                    <button type="button" onClick={() => handlePreviewFile(log.remarks.split('Proof File: ')[1], `Bank Receipt: ${po.po_number}`)} className="mt-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded inline-flex items-center gap-1 font-bold transition-colors">
                                      <Paperclip size={10} /> View Bank Receipt
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* 💻 DESKTOP RESPONSIVE TABLE (Hidden on Mobile) */}
          <Card className="hidden md:block overflow-hidden border-slate-200 shadow-sm bg-white">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="text-[10px] uppercase font-black tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                    <th className="p-4 w-12 text-center"></th>
                    <th className="p-4 w-44">Order Info</th>
                    <th className="p-4 w-48">Project</th>
                    <th className="p-4 w-52">Vendor</th>
                    <th className="p-4 w-56">Financials</th>
                    <th className="p-4 w-[380px]">Documents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {filteredLedger.length === 0 ? (
                     <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 text-sm">No orders match your search.</td>
                     </tr>
                  ) : (
                    filteredLedger.map((po) => {
                      const isExpanded = !!expandedRows[po.po_number];
                      const isEditingPI = !!editingInvoices[po.po_number];
                      const isEditingTax = !!editingTaxInvoices[po.po_number];
                      const isEditingPO = !!editingPOs[po.po_number];
                      
                      const piForm = invoiceForms[po.po_number] || {};
                      const taxForm = taxInvoiceForms[po.po_number] || {};
                      const poFileForm = poFileForms[po.po_number] || {};
                      
                      // Check GRN Status
                      const isDiscrepancy = po.status === 'Material Discrepancy Raised';
                      const isShortage = po.status === 'Partially Delivered';
                      const isDelivered = po.status === 'Delivered - GRN Logged';
                      const hasGrn = isDiscrepancy || isShortage || isDelivered;
                      
                      const poLogs = rowLogs[po.po_number] || [];
                      const grnLogEntry = poLogs.find(l => 
                        l.action_taken.includes("Material Delivered") || 
                        l.action_taken.includes("Partial Delivery") || 
                        l.action_taken.includes("CRITICAL ALERT")
                      );

                      // Financial Progress Math
                      const total = po.grand_total || 0;
                      const paid = po.disbursed_amount || 0;
                      const pending = Math.max(0, total - paid);
                      const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                      return (
                        <React.Fragment key={po.po_number}>
                          <tr className={`transition-colors ${isExpanded ? 'bg-indigo-50/10' : 'hover:bg-slate-50/60'}`}>
                            
                            {/* Expand Button */}
                            <td className="p-4 text-center align-top">
                              <button onClick={() => toggleExpandRow(po.po_number, po.ticket_number)} className={`p-1.5 border rounded-lg shadow-3xs transition-colors ${isExpanded ? 'bg-[#2c2a57] text-white border-[#2c2a57]' : 'text-slate-400 bg-white hover:text-[#2c2a57]'}`}>
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </td>
                            
                            {/* Order Info */}
                            <td className="p-4 space-y-1 align-top">
                              <div className={`font-mono font-black text-sm ${isDiscrepancy ? 'text-rose-700' : 'text-[#2c2a57]'}`}>{po.po_number}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{po.ticket_number}</div>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono mt-1.5">
                                <Calendar size={10} className="text-[#0b9c54]" /> <span>{po.generated_at.split(' ')[0]}</span>
                              </div>
                            </td>
                            
                            {/* Project Scope */}
                            <td className="p-4 space-y-1 align-top">
                              <div><strong className="text-slate-900">{po.project_code}</strong></div>
                              <div className="text-[10px] text-slate-500 truncate w-40" title={po.project_name}>{po.project_name}</div>
                              <div className="text-[9px] font-bold text-indigo-500 uppercase mt-1">PM: {po.project_manager}</div>
                              <div className={`mt-2 text-[9px] font-bold px-2 py-0.5 rounded w-max uppercase tracking-wider ${
                                isDiscrepancy ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' : 
                                isShortage ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                                isDelivered ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {po.status}
                              </div>
                            </td>

                            {/* Vendor */}
                            <td className="p-4 space-y-0.5 leading-tight align-top">
                              <div className="font-extrabold text-slate-800 uppercase line-clamp-2 pr-2" title={po.vendor_name}>{po.vendor_name}</div>
                              <div className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[150px]">{po.vendor_email}</div>
                            </td>
                            
                            {/* Financials with Mini-Tracker */}
                            <td className="p-4 align-top pr-6">
                               <div className="flex justify-between items-center text-xs mb-1">
                                  <span className="font-black text-slate-900">₹{total.toLocaleString('en-IN')}</span>
                               </div>
                               {/* Progress Bar */}
                               <div className="w-full bg-slate-200 rounded-full h-1.5 my-1.5 overflow-hidden">
                                  <div className={`h-1.5 rounded-full transition-all duration-500 ${progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progressPct}%` }}></div>
                               </div>
                               <div className="flex justify-between text-[9px] font-bold mt-1">
                                  <span className="text-emerald-600">Paid: ₹{paid.toLocaleString('en-IN')}</span>
                                  <span className="text-rose-500">Pending: ₹{pending.toLocaleString('en-IN')}</span>
                               </div>
                            </td>
                            
                            {/* Documents (Vault & Uploaders) */}
                            <td className="p-3 bg-slate-50/50 border-l border-slate-200 align-top">
                              <div className="flex flex-col gap-2 relative">
                                
                                {/* 1. Signed PO */}
                                {isEditingPO && isPurchaseExecutive ? (
                                  <div className="border border-indigo-300 bg-white p-2.5 rounded-xl shadow-md space-y-2 z-10">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] font-black uppercase text-indigo-700">Upload Signed PO</span>
                                      <button onClick={() => toggleEditPO(po.po_number)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                                      <label className="cursor-pointer text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 flex items-center">
                                        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => handlePoFileChange(po.po_number, e)} className="hidden" />
                                        <UploadCloud size={10} className="mr-1"/> {poFileForm.file ? "Change File" : "Attach File"}
                                      </label>
                                      <button onClick={() => handleSaveSignedPo(po.po_number)} className="bg-[#2c2a57] hover:bg-indigo-900 text-white font-bold text-[9px] px-3 py-1 rounded">Submit</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs group">
                                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><FileText size={12} className="text-[#2c2a57]"/> Order Document</span>
                                    <div className="flex items-center gap-1.5">
                                      <button type="button" onClick={() => openPoDocumentSection(po)} className="text-[10px] font-black text-[#2c2a57] hover:underline px-1.5 py-0.5 bg-slate-100 rounded">View PO</button>
                                      {po.signed_po_url ? (
                                        <button type="button" onClick={() => handlePreviewFile(po.signed_po_url, `Signed PO: ${po.po_number}`)} className="text-[10px] font-black text-emerald-700 hover:underline px-1.5 py-0.5 bg-emerald-50 rounded flex items-center gap-1">Signed</button>
                                      ) : (
                                        isPurchaseExecutive && <button onClick={() => toggleEditPO(po.po_number)} className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 border border-dashed border-slate-300 rounded px-1.5 py-0.5 hover:border-indigo-400 bg-slate-50">+ Add Signed</button>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* 2. Proforma Invoice (PI) */}
                                {isEditingPI && isPurchaseExecutive ? (
                                  <div className="border border-amber-300 bg-white p-2.5 rounded-xl shadow-md space-y-2 z-10">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] font-black uppercase text-amber-600">Upload Proforma (PI)</span>
                                      <button onClick={() => toggleEditInvoice(po.po_number)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
                                    </div>
                                    <div className="flex gap-2">
                                      <input type="text" value={piForm.invoice_no} onChange={(e) => handleInputChange(po.po_number, 'invoice_no', e.target.value)} placeholder="Inv No." className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-1/2 outline-none" />
                                      <input type="text" value={piForm.invoice_date} onChange={(e) => handleInputChange(po.po_number, 'invoice_date', e.target.value)} placeholder="DD-MM-YYYY" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-1/2 outline-none" />
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                      <input type="text" value={piForm.payment_terms} onChange={(e) => handleInputChange(po.po_number, 'payment_terms', e.target.value)} placeholder="Payment Terms" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] outline-none" />
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-100">
                                      <label className="cursor-pointer text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 flex items-center">
                                        <input type="file" accept=".pdf,.png,.jpg" onChange={(e) => handleFileChange(po.po_number, e)} className="hidden" />
                                        <UploadCloud size={10} className="mr-1"/> Attach PI
                                      </label>
                                      <button onClick={() => handleSaveInvoiceDetails(po.po_number)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] px-4 py-1.5 rounded">Submit</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs group">
                                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><FileText size={12} className="text-amber-500"/> Proforma Invoice</span>
                                    {po.proforma_invoice_url ? (
                                      <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => handlePreviewFile(po.proforma_invoice_url, `Proforma Invoice: ${po.invoice_no || po.po_number}`)} className="text-[10px] font-black text-amber-600 hover:underline px-2 py-0.5 bg-amber-50 rounded">View PI</button>
                                        {isPurchaseExecutive && (
                                          <button type="button" onClick={() => handleDeleteInvoiceFile(po.po_number)} className="text-slate-300 hover:text-rose-500 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                        )}
                                      </div>
                                    ) : (
                                      isPurchaseExecutive ? (
                                        <button type="button" onClick={() => toggleEditInvoice(po.po_number)} className="text-[9px] font-bold text-slate-400 hover:text-amber-600 border border-dashed border-slate-300 rounded px-1.5 py-0.5 bg-slate-50">+ Add PI</button>
                                      ) : <span className="text-[9px] text-slate-400 italic">Not Uploaded</span>
                                    )}
                                  </div>
                                )}

                                {/* 3. Final Tax Invoice */}
                                {isEditingTax && isPurchaseExecutive ? (
                                  <div className="border border-emerald-300 bg-white p-2.5 rounded-xl shadow-md space-y-2 z-10">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[9px] font-black uppercase text-emerald-600">Upload Final Tax Invoice</span>
                                      <button type="button" onClick={() => toggleEditTaxInvoice(po.po_number)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>
                                    </div>
                                    <div className="flex gap-2">
                                      <input type="text" value={taxForm.tax_invoice_no} onChange={(e) => handleTaxInputChange(po.po_number, 'tax_invoice_no', e.target.value)} placeholder="Tax Inv No." className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-1/2 outline-none" />
                                      <input type="text" value={taxForm.tax_invoice_date} onChange={(e) => handleTaxInputChange(po.po_number, 'tax_invoice_date', e.target.value)} placeholder="DD-MM-YYYY" className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-1/2 outline-none" />
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
                                      <label className="cursor-pointer text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 flex items-center">
                                        <input type="file" accept=".pdf,.png,.jpg" onChange={(e) => handleTaxFileChange(po.po_number, e)} className="hidden" />
                                        <UploadCloud size={10} className="mr-1"/> Attach Tax Inv
                                      </label>
                                      <button type="button" onClick={() => handleSaveTaxInvoiceDetails(po.po_number)} className="bg-[#0b9c54] text-white font-bold text-[9px] px-4 py-1.5 rounded">Submit</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-between items-center bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-3xs group">
                                    <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5"><FileText size={12} className="text-[#0b9c54]"/> Final Tax Invoice</span>
                                    {po.tax_invoice_url ? (
                                      <button type="button" onClick={() => handlePreviewFile(po.tax_invoice_url, `Tax Invoice: ${po.tax_invoice_no || po.po_number}`)} className="text-[10px] font-black text-emerald-700 hover:underline px-2 py-0.5 bg-emerald-50 rounded flex items-center gap-1">
                                        View
                                      </button>
                                    ) : (
                                      isPurchaseExecutive ? (
                                        <button type="button" onClick={() => toggleEditTaxInvoice(po.po_number)} className="text-[9px] font-bold text-slate-400 hover:text-emerald-600 border border-dashed border-slate-300 rounded px-1.5 py-0.5 bg-slate-50">+ Add Tax Inv</button>
                                      ) : <span className="text-[9px] text-slate-400 italic">Not Uploaded</span>
                                    )}
                                  </div>
                                )}
                                
                              </div>
                            </td>
                          </tr>

                          {/* 🎯 EXPANDED SPLIT-PANE ROW (Desktop) */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 border-b-2 border-slate-200">
                              <td colSpan="6" className="p-6 pl-20">
                                
                                {/* Top Banner: GRN Status */}
                                {hasGrn && grnLogEntry && (
                                  <div className={`mb-6 p-4 rounded-xl border flex items-start gap-4 shadow-3xs ${isDiscrepancy ? 'bg-rose-50 border-rose-200' : isShortage ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <div className={`p-2 rounded-full mt-1 ${isDiscrepancy ? 'bg-rose-100 text-rose-600' : isShortage ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                      {isDiscrepancy ? <ShieldAlert size={24} /> : isShortage ? <AlertOctagon size={24} /> : <CheckCircle2 size={24} />}
                                    </div>
                                    <div className="flex-1">
                                      <h4 className={`text-sm font-black uppercase tracking-wider ${isDiscrepancy ? 'text-rose-800' : isShortage ? 'text-amber-800' : 'text-emerald-800'}`}>
                                        {grnLogEntry.action_taken}
                                      </h4>
                                      <p className="text-xs text-slate-700 mt-1 font-medium">{grnLogEntry.remarks.split(' | Proof')[0]}</p>
                                      <div className="flex items-center gap-4 mt-3">
                                        <span className="text-[10px] text-slate-500 font-mono bg-white px-2 py-1 rounded border border-slate-200">Inspector: {grnLogEntry.user_name} ({grnLogEntry.timestamp.split(' ')[0]})</span>
                                        {grnLogEntry.remarks.includes('Proof File:') && (
                                          <button type="button" onClick={() => handlePreviewFile(grnLogEntry.remarks.split('Proof File: ')[1], `GRN Proof: ${po.po_number}`)} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded flex items-center gap-1 transition-colors">
                                            <Paperclip size={12} /> View Inspector's Photo Proof
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* 🎯 RECURRING CONTRACT: LIVE FINANCIAL SUMMARY & BILLING CONTROLS */}
                                {po.is_recurring && po.status !== 'Contract Terminated & Closed' && (() => {
                                  const metrics = getLeaseMetrics(po);
                                  return (
                                    <div className="mb-6 bg-purple-50/30 border border-purple-200 rounded-xl p-4 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                      <div className="flex gap-6 items-center flex-wrap">
                                        <div className="flex flex-col">
                                          <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">Deposit Held</span>
                                          <span className="font-mono font-black text-purple-900 text-lg">₹{(metrics?.deposit || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex flex-col border-l border-purple-200 pl-6">
                                          <span className="text-[10px] font-bold uppercase text-purple-600 tracking-wider">Time Remaining</span>
                                          <span className="font-black text-purple-900 text-lg">{metrics?.monthsLeft || 0} Mos</span>
                                        </div>
                                        <div className="flex flex-col border-l border-purple-200 pl-6">
                                          <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Total Paid Till Now</span>
                                          <span className="font-mono font-black text-emerald-700 text-lg">₹{paid.toLocaleString('en-IN')}</span>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-white p-2.5 rounded-lg border border-purple-100 flex items-center gap-3 shadow-3xs">
                                         <div className="flex flex-col">
                                            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Billing Cycle</span>
                                            <span className="font-bold text-[#2c2a57] text-xs mt-0.5">
                                              {editingBillingDate[po.po_number] ? 'Edit Day:' : `Every ${po.billing_trigger_date}th of month`}
                                            </span>
                                         </div>
                                         
                                         {editingBillingDate[po.po_number] ? (
                                           <div className="flex items-center gap-1.5 ml-2 border-l border-slate-100 pl-3">
                                             <input 
                                               type="number" 
                                               min="1" max="28"
                                               value={billingDateForms[po.po_number] || po.billing_trigger_date || ''}
                                               onChange={(e) => setBillingDateForms(prev => ({...prev, [po.po_number]: e.target.value}))}
                                               className="w-14 px-2 py-1 border border-purple-300 rounded text-xs text-center outline-none focus:border-purple-500"
                                             />
                                             <button onClick={() => handleBillingDateSubmit(po.po_number)} className="bg-emerald-500 text-white p-1 rounded hover:bg-emerald-600 transition-colors">
                                               <CheckCircle2 size={14} />
                                             </button>
                                             <button onClick={() => setEditingBillingDate(prev => ({...prev, [po.po_number]: false}))} className="bg-slate-200 text-slate-600 p-1 rounded hover:bg-slate-300 transition-colors">
                                               <X size={14} />
                                             </button>
                                           </div>
                                         ) : (
                                           canViewAll && ( 
                                             <button 
                                               onClick={() => {
                                                 setEditingBillingDate(prev => ({...prev, [po.po_number]: true}));
                                                 setBillingDateForms(prev => ({...prev, [po.po_number]: po.billing_trigger_date}));
                                               }} 
                                               className="text-purple-600 bg-purple-50 hover:bg-purple-100 p-1.5 rounded border border-purple-200 ml-2 transition-colors"
                                               title="Edit Billing Date"
                                             >
                                               <Edit size={14} />
                                             </button>
                                           )
                                         )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* 50/50 Split Grid: Items & Payments */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  
                                  {/* Left Pane: Ordered Items */}
                                  <div className="space-y-3">
                                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2 flex justify-between items-center">
                                      <span>Contract Scope & Items</span>
                                      
                                      {/* 🎯 EARLY CLOSE BUTTON FOR PM/DIRECTORS */}
                                      {isManagerOrDirector && ['VEHICLE', 'ACCOMMODATION', 'SUBSCRIPTION'].includes(po.category) && po.status !== 'Contract Terminated & Closed' && (
                                        <button 
                                          onClick={() => handleTruncatePO(po.po_number)}
                                          className="text-[9px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-1 rounded flex items-center gap-1 hover:bg-rose-600 hover:text-white transition-colors cursor-pointer"
                                        >
                                          <Scissors size={10} /> Truncate & Close Contract
                                        </button>
                                      )}
                                    </h4>
                                    <div className="flex flex-col gap-2">
                                      {(po.items || []).map((item, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl flex justify-between items-center shadow-3xs transition-colors hover:border-[#2c2a57]/30">
                                          <div className="truncate pr-4 flex flex-col">
                                            <span className="font-bold text-slate-700 truncate" title={item.desc}>{item.desc}</span>
                                            {item.is_reimbursable && (
                                              <span className="text-[9px] text-cyan-600 font-extrabold uppercase mt-0.5">✓ Reimbursable</span>
                                            )}
                                          </div>
                                          <span className="font-mono font-black text-[#0b9c54] bg-emerald-50 px-3 py-1 rounded-lg text-xs border border-emerald-100">Qty: {item.qty}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Right Pane: Payment History */}
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                                      <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Payment Ledger</h4>
                                      <span className="text-[10px] font-bold text-slate-500">Balance: <span className="text-rose-500 font-mono">₹{pending.toLocaleString('en-IN')}</span></span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      {(rowLogs[po.po_number] || [])
                                        .filter(l => l.action_taken.includes("Disbursement") || l.action_taken.includes("Payment") || l.action_taken.includes("Closure") || l.action_taken.includes("Renewed") || l.action_taken.includes("Billing Trigger Date"))
                                        .map((log, idx) => {
                                          const logText = log.remarks.split(' | Proof')[0];
                                          const isFinal = logText.toLowerCase().includes("final") || logText.toLowerCase().includes("100%") || logText.toLowerCase().includes("closure");
                                          const isConfig = log.action_taken.includes("Billing");
                                          
                                          return (
                                            <div key={idx} className={`p-3 border rounded-xl shadow-3xs flex flex-col gap-2 ${log.action_taken.includes("Closure") ? "bg-rose-50 border-rose-200" : log.action_taken.includes("Renewed") ? "bg-indigo-50 border-indigo-200" : isConfig ? "bg-purple-50 border-purple-100" : "bg-white border-slate-200"}`}>
                                              <div className="flex justify-between items-start">
                                                <div className="flex gap-2">
                                                  <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isFinal ? (log.action_taken.includes("Closure") ? 'bg-rose-500' : 'bg-emerald-500') : log.action_taken.includes("Renewed") ? 'bg-indigo-500' : isConfig ? 'bg-purple-400' : 'bg-amber-400'}`}></span>
                                                  <div>
                                                    <p className={`font-bold text-xs leading-snug ${log.action_taken.includes("Closure") ? "text-rose-900" : log.action_taken.includes("Renewed") ? "text-indigo-900" : isConfig ? "text-purple-800" : "text-slate-800"}`}>{logText}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-1">Date: {log.timestamp.split(' ')[0]} • Exec: {log.user_name}</p>
                                                  </div>
                                                </div>
                                              </div>
                                              {log.remarks.includes('Proof File:') && (
                                                <div className="flex justify-end pt-2 border-t border-slate-50">
                                                  <button type="button" onClick={() => handlePreviewFile(log.remarks.split('Proof File: ')[1], `Bank Receipt: ${po.po_number}`)} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded flex items-center gap-1.5 transition-colors">
                                                    <Wallet size={12} /> View Bank Transfer Receipt
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                      })}
                                      {(rowLogs[po.po_number] || []).filter(l => l.action_taken.includes("Disbursement") || l.action_taken.includes("Payment") || l.action_taken.includes("Closure")).length === 0 && (
                                         <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[11px] font-bold">
                                            No payments have been recorded yet.
                                         </div>
                                      )}
                                    </div>
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
        </div>
      )}
    </div>
  );
}
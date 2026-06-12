// src/components/PurchaseExecutiveDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, FileCheck, CheckCircle2, Clock, Wallet, AlertTriangle, Plus, Trash2, Send, ThumbsUp, Award } from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function PurchaseExecutiveDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('sourcing'); 
  
  // Sourcing State
  const [sourcingTickets, setSourcingTickets] = useState([]);
  const [quotes, setQuotes] = useState({}); // Editable grid for inputting
  
  // Approval State (Petty Cash <= 50k)
  const [approvalTickets, setApprovalTickets] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]); // Read-only from DB
  const [selectedBids, setSelectedBids] = useState({});
  const [remarks, setRemarks] = useState('');
  
  // Shared State
  const [history, setHistory] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // --- DATA FETCHING ---
  const fetchPendingSourcing = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/pending-sourcing`);
      setSourcingTickets(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchPendingApproval = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/pending-purchase-approval`);
      setApprovalTickets(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/purchase-history`);
      setHistory(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'sourcing') setTimeout(() => { if (isMounted) fetchPendingSourcing(); }, 0);
    if (activeTab === 'direct-approval') setTimeout(() => { if (isMounted) fetchPendingApproval(); }, 0);
    if (activeTab === 'history') setTimeout(() => { if (isMounted) fetchHistory(); }, 0);
    return () => { isMounted = false; };
  }, [activeTab]);

  // --- TAB NAVIGATION HANDLERS ---
  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedTicket(null);
    setAlert(null);
  };

  // --- TICKET OPENING LOGIC ---
  const openSourcingTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setQuotes({});
    setAlert(null);
    try {
      const itemRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setItems(itemRes.data);
      const initialQuotes = {};
      
      // Initialize quotation boxes with contextual time-of-delivery values based on ticket category
      itemRes.data.forEach(item => {
        initialQuotes[item.item_index] = [{ 
          vendor_name: '', 
          vendor_address: '',
          vendor_contact: '',
          vendor_email: '',
          base_total_value: '',
          gst_percentage: 18,
          total_amount: 0,
          net_amount_payable: 0,
          time_of_delivery: ticket.category === 'GOODS' ? '7 Days' : ticket.category === 'VEHICLE' ? '12 Months' : '30 Days Notice',
          delivery_address: '',
          site_contact_person: '',
          site_contact_phone: '',
          special_terms: '' 
        }];
      });
      setQuotes(initialQuotes);
    } catch (err) { console.error(err); }
  };

  const openApprovalTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setSelectedBids({});
    setRemarks('');
    setAlert(null);
    try {
      const itemsRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setItems(itemsRes.data);
      const quotesRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/quotations`);
      setVendorQuotes(quotesRes.data);
    } catch (err) { console.error(err); }
  };

  // --- SOURCING LOGIC (VIEW A) ---
  const handleQuoteChange = (itemIndex, quoteIndex, field, value) => {
    setQuotes(prev => {
      const updatedItemQuotes = [...prev[itemIndex]];
      updatedItemQuotes[quoteIndex][field] = value;
      return { ...prev, [itemIndex]: updatedItemQuotes };
    });
  };

  const addQuoteBox = (itemIndex) => {
    setQuotes(prev => ({
      ...prev, [itemIndex]: [...(prev[itemIndex] || []), { 
        vendor_name: '', 
        vendor_address: '',
        vendor_contact: '',
        vendor_email: '',
        base_total_value: '',
        gst_percentage: 18,
        total_amount: 0,
        net_amount_payable: 0,
        time_of_delivery: selectedTicket?.category === 'GOODS' ? '7 Days' : selectedTicket?.category === 'VEHICLE' ? '12 Months' : '30 Days Notice',
        delivery_address: '',
        site_contact_person: '',
        site_contact_phone: '',
        special_terms: '' 
      }]
    }));
  };

  const removeQuoteBox = (itemIndex, quoteIndex) => {
    setQuotes(prev => {
      const updated = prev[itemIndex].filter((_, i) => i !== quoteIndex);
      return { ...prev, [itemIndex]: updated };
    });
  };

  const handlePushToManagement = async () => {
    const flatQuotations = [];
    for (const [itemIndex, itemQuotes] of Object.entries(quotes)) {
      const matchingLineItem = items.find(i => i.item_index === parseInt(itemIndex)) || {};

      itemQuotes.forEach(q => {
        if (q.vendor_name && q.base_total_value) {
          flatQuotations.push({
            item_index: parseInt(itemIndex),
            vendor_name: q.vendor_name,
            vendor_address: q.vendor_address || "",
            vendor_contact: q.vendor_contact || "",
            vendor_email: q.vendor_email || "",
            base_total_value: parseFloat(q.base_total_value) || 0,
            gst_percentage: parseFloat(q.gst_percentage) || 18,
            total_amount: parseFloat(q.net_amount_payable) || 0,
            net_amount_payable: parseFloat(q.net_amount_payable) || 0,
            time_of_delivery: q.time_of_delivery || "Standard",
            delivery_address: q.delivery_address || "",
            site_contact_person: q.site_contact_person || "",
            site_contact_phone: q.site_contact_phone || "",
            special_terms: q.special_terms || "",
            
            // Requisition specifications injection to secure 100% downstream data integrity
            product_description: matchingLineItem.product_description || "",
            make_brand: matchingLineItem.make_brand || "",
            quantity: parseInt(matchingLineItem.quantity) || 1
          });
        }
      });
    }

    if (flatQuotations.length === 0) {
      setAlert({ type: 'error', message: "Enter at least one valid vendor quote (Name & Base Amount) before submitting." });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/quotations`, { quotations: flatQuotations });
      setAlert({ type: 'success', message: `Matrix Submitted! System routing triggered: ${res.data.status}.` });
      setSelectedTicket(null);
      fetchPendingSourcing();
    } catch (err) { setAlert({ type: 'error', message: "Failed to dispatch quotations data." }); } 
    finally { setLoading(false); }
  };

  // --- DIRECT APPROVAL LOGIC (VIEW B) ---
  const toggleBidSelection = (itemIndex, vendorName) => {
    setSelectedBids(prev => ({ ...prev, [itemIndex]: vendorName }));
  };

  const handleDirectAuthorization = async (actionType) => {
    if (actionType === "Approve" && Object.keys(selectedBids).length !== items.length) {
      setAlert({ type: 'error', message: "You must select a winning vendor bid for every item!" });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/action`, {
        user_name: currentUser?.name || "Purchase Executive",
        action: actionType,
        remarks: remarks || "Direct Petty Cash Authorization Approved (< ₹50k limit).",
        selected_bids: selectedBids
      });
      
      setAlert({ type: 'success', message: "Winners locked! PO staged for final signature." });
      setSelectedTicket(null);
      fetchPendingApproval();
    } catch (err) { setAlert({ type: 'error', message: "Authorization failed." }); } 
    finally { setLoading(false); }
  };

  // 🎯 NEW: Strategic Configuration Resolver for Adaptive Field Properties
  const getContextualUiSettings = () => {
    const category = selectedTicket?.category || 'GOODS';
    switch (category) {
      case 'VEHICLE':
        return {
          amountLabel: "Monthly Rental Rate (Excl. GST)",
          addressLabel: "Vehicle Deployment Base / Site Location",
          addressPlaceholder: "e.g. Joda Mining Site Yard, Odisha...",
          contactLabel: "Site Reporting Authority / Supervisor Name",
          timeLabel: "Contract Tenure / Lock-In Duration",
          timePlaceholder: "e.g. 12 Months",
          remarksPlaceholder: "e.g. 24 hours shift, Diesel paid at actuals, Maintenance under contractor scope..."
        };
      case 'ACCOMMODATION':
        return {
          amountLabel: "Monthly Rent Pricing (Excl. GST)",
          addressLabel: "Guest House Physical Location Address",
          addressPlaceholder: "Full flat/building location coordinates...",
          contactLabel: "Aarvi Warden / Property Coordinator Person",
          timeLabel: "Vacation Notice Period Liability",
          timePlaceholder: "e.g. 30 Days Notice",
          remarksPlaceholder: "e.g. Water bills in owner scope, Electricity paid by Aarvi at actuals, Maintenance under owner..."
        };
      default: // GOODS
        return {
          amountLabel: "Base Total (Excl. GST)",
          addressLabel: "Exact Delivery Address",
          addressPlaceholder: "Destination store/warehouse location details...",
          contactLabel: "Site Storekeeper / Contact Name",
          timeLabel: "Lead Time / Delivery Deadline",
          timePlaceholder: "e.g. 7 Days",
          remarksPlaceholder: "e.g. F.O.R Site delivery, Staggered delivery required, Test reports required..."
        };
    }
  };

  const ui = getContextualUiSettings();

  return (
    <div className="space-y-6">
      
      {/* HEADER TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Procurement Sourcing Hub</h1>
          <p className="text-sm text-slate-500 font-medium">Attach competitive bids and clear minor orders directly <strong className="text-[#2c2a57]">(≤ ₹50,000)</strong></p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button variant={activeTab === 'sourcing' ? 'primary' : 'ghost'} onClick={() => switchTab('sourcing')} className="text-xs py-1.5 flex-1 md:flex-none">
            <ShoppingCart size={14} /> <span>Sourcing Inbox ({sourcingTickets.length})</span>
          </Button>
          <Button variant={activeTab === 'direct-approval' ? 'primary' : 'ghost'} onClick={() => switchTab('direct-approval')} className="text-xs py-1.5 flex-1 md:flex-none text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200">
            <Wallet size={14} /> <span>Direct Approvals ({approvalTickets.length})</span>
          </Button>
          <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} onClick={() => switchTab('history')} className="text-xs py-1.5 flex-1 md:flex-none">
            <FileCheck size={14} /> <span>Ledger</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckCircle2 size={18} className="flex-shrink-0" /> <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {/* VIEW A: ACTIVE SOURCING INBOX */}
      {activeTab === 'sourcing' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Awaiting Vendor Bids</h2>
            {sourcingTickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 text-sm bg-white">Queue cleared.</Card>
            ) : (
              sourcingTickets.map((t) => (
                <div key={t.ticket_number} onClick={() => openSourcingTicket(t)} className={`p-4 rounded-xl border transition-all cursor-pointer block ${selectedTicket?.ticket_number === t.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[#2c2a57] font-black text-sm">{t.ticket_number}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${t.category === 'GOODS' ? 'bg-blue-100 text-blue-700' : t.category === 'VEHICLE' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>{t.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 truncate mb-2">{t.project_name}</p>
                  <StatusBadge status={t.status} />
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedTicket ? (
              <div className="space-y-6">
                <Card className="p-4 bg-slate-50 border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-900/10 p-2 rounded-lg text-[#2c2a57]"><ShoppingCart size={18} /></div>
                    <div>
                      <h2 className="font-bold text-[#2c2a57] text-sm uppercase tracking-wider">{selectedTicket.category} Sourcing Specification Terminal</h2>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTicket.ticket_number} • {selectedTicket.project_name}</p>
                    </div>
                  </div>
                  <Button variant="success" onClick={handlePushToManagement} disabled={loading} className="text-xs py-2 shadow-sm w-full sm:w-auto">
                    <Send size={14} /> <span>Submit Matrix</span>
                  </Button>
                </Card>

                <div className="space-y-5">
                  {items.map((item) => (
                    <Card key={item.item_index} className="overflow-hidden border-slate-200 shadow-xs">
                      <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="bg-[#2c2a57] text-white text-[10px] font-black px-2 py-0.5 rounded font-mono">Row {item.item_index}</span>
                            <span className="text-xs text-[#0b9c54] font-bold uppercase tracking-wider bg-[#0b9c54]/10 px-2 py-0.5 rounded border border-[#0b9c54]/10">Units Requested: {item.quantity}</span>
                          </div>
                          <h3 className="text-sm font-bold text-[#2c2a57] leading-tight mt-1">{item.product_description}</h3>
                        </div>
                      </div>

                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 gap-4">
                          {(quotes[item.item_index] || []).map((quote, qIdx) => (
                            <div key={qIdx} className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 relative group hover:border-slate-400 transition-all">
                              <button onClick={() => removeQuoteBox(item.item_index, qIdx)} className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={15} /></button>
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Option {qIdx + 1}</h4>
                              
                              <div className="space-y-3">
                                {/* Vendor Core Details Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Company Name</label>
                                    <input type="text" value={quote.vendor_name} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'vendor_name', e.target.value)} placeholder="e.g. SHREEJI ENTERPRISE" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Office Address</label>
                                    <input type="text" value={quote.vendor_address} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'vendor_address', e.target.value)} placeholder="Full operating address..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                </div>

                                {/* Financial Split Row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Phone/Cell</label>
                                    <input type="text" value={quote.vendor_contact} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'vendor_contact', e.target.value)} placeholder="+91-987..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Email ID</label>
                                    <input type="text" value={quote.vendor_email} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'vendor_email', e.target.value)} placeholder="sales@vendor.com" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">{ui.amountLabel}</label>
                                    <input type="number" value={quote.base_total_value} onChange={(e) => {
                                      const base = parseFloat(e.target.value) || 0;
                                      const gst = parseFloat(quote.gst_percentage) || 18;
                                      const net = base + (base * (gst / 100));
                                      handleQuoteChange(item.item_index, qIdx, 'base_total_value', base);
                                      handleQuoteChange(item.item_index, qIdx, 'net_amount_payable', net);
                                    }} placeholder="0.00" className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">GST Percentage (%)</label>
                                    <input type="number" value={quote.gst_percentage} onChange={(e) => {
                                      const gst = parseFloat(e.target.value) || 0;
                                      const base = parseFloat(quote.base_total_value) || 0;
                                      const net = base + (base * (gst / 100));
                                      handleQuoteChange(item.item_index, qIdx, 'gst_percentage', gst);
                                      handleQuoteChange(item.item_index, qIdx, 'net_amount_payable', net);
                                    }} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                </div>

                                {/* Logistics Coordination Row (🎯 DYNAMIC MAPPING APPLIED) */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-dashed border-slate-200">
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#0b9c54] uppercase mb-1">{ui.addressLabel}</label>
                                    <input type="text" value={quote.delivery_address} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'delivery_address', e.target.value)} placeholder={ui.addressPlaceholder} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#0b9c54] uppercase mb-1">{ui.contactLabel}</label>
                                    <input type="text" value={quote.site_contact_person} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'site_contact_person', e.target.value)} placeholder="Personnel reference name..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-[#0b9c54] uppercase mb-1">Contact Phone Number</label>
                                    <input type="text" value={quote.site_contact_phone} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'site_contact_phone', e.target.value)} placeholder="+91-886..." className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{ui.timeLabel}</label>
                                    <input type="text" value={quote.time_of_delivery} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'time_of_delivery', e.target.value)} placeholder={ui.timePlaceholder} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calculated Net Value (Incl. GST)</label>
                                    <div className="w-full bg-slate-100 text-slate-800 rounded-lg px-3 py-2 text-xs font-black border border-slate-200">
                                      ₹{(quote.net_amount_payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contract / Service Custom Clauses</label>
                                  <input type="text" value={quote.special_terms} onChange={(e) => handleQuoteChange(item.item_index, qIdx, 'special_terms', e.target.value)} placeholder={ui.remarksPlaceholder} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none" />
                                </div>
                              </div>
                            </div>
                          ))}
                          <div onClick={() => addQuoteBox(item.item_index)} className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/20 flex flex-col items-center justify-center text-slate-400 hover:text-[#0b9c54] hover:border-[#0b9c54]/40 hover:bg-[#0b9c54]/5 transition-all cursor-pointer min-h-[100px]">
                            <Plus size={20} className="mb-1" />
                            <span className="text-xs font-bold uppercase tracking-wider">Add Alternative Quote Option</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
                <span className="text-3xl mb-2">🛒</span>
                <p>Select a worksheet folder from the pipeline stack to append sourcing bids.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW B: DIRECT APPROVALS (≤ ₹50k) */}
      {activeTab === 'direct-approval' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Petty Cash Approvals</h2>
            {approvalTickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 bg-white text-sm">No small orders pending direct authorization.</Card>
            ) : (
              approvalTickets.map(t => (
                <div key={t.ticket_number} onClick={() => openApprovalTicket(t)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.ticket_number === t.ticket_number ? 'bg-emerald-50/50 border-[#0b9c54] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-center mb-1"><span className="font-mono text-[#2c2a57] font-black text-sm">{t.ticket_number}</span><StatusBadge status={t.status} /></div>
                  <p className="text-xs font-semibold text-slate-600 truncate">{t.project_name}</p>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedTicket ? (
              <div className="space-y-6">
                <Card>
                  <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#2c2a57] uppercase tracking-wider flex justify-between items-center">
                    <span>Select Winning Vendor (Direct Sign-Off)</span>
                    <span className="text-[10px] text-rose-500 bg-rose-50 border border-rose-200 px-2 py-1 rounded animate-pulse">Select 1 winning bid per item</span>
                  </div>
                  <div className="p-4 space-y-6 divide-y divide-slate-100">
                    {items.map(item => {
                      const itemBids = vendorQuotes.filter(q => q.item_index === item.item_index);
                      return (
                        <div key={item.item_index} className="pt-4 first:pt-0 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-1">
                            <h4 className="text-sm font-bold text-[#2c2a57]">{item.item_index}. {item.product_description}</h4>
                            <span className="text-xs text-slate-400 font-medium">Qty: <strong className="text-slate-700">{item.quantity}</strong></span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {itemBids.map((bid, bIdx) => {
                              const isSelected = selectedBids[item.item_index] === bid.vendor_name;
                              return (
                                <div key={bIdx} onClick={() => toggleBidSelection(item.item_index, bid.vendor_name)} className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${isSelected ? 'border-[#0b9c54] bg-emerald-50/50 ring-1 ring-[#0b9c54] shadow-md transform scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
                                  {isSelected && <div className="absolute top-0 right-0 bg-[#0b9c54] text-white p-1 rounded-bl-lg"><Award size={12} /></div>}
                                  <div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${isSelected ? 'text-[#0b9c54]' : 'text-slate-400'}`}>Bid {bIdx + 1} {isSelected && '- WINNER'}</span>
                                    <span className="text-xs font-bold text-slate-800 truncate block">{bid.vendor_name}</span>
                                    {bid.special_terms && <span className="text-[9px] font-medium text-slate-500 italic block mt-1">Clauses: {bid.special_terms}</span>}
                                  </div>
                                  <div className="mt-3 flex justify-between items-baseline border-t border-slate-100 pt-2">
                                    <span className={`text-xs font-black ${isSelected ? 'text-[#0b9c54]' : 'text-slate-600'}`}>₹{bid.total_amount.toLocaleString('en-IN')}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
                    <Input label="Approval Justification" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Direct clearance authorized..." />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button variant="success" onClick={() => handleDirectAuthorization("Approve")} disabled={loading} className="text-xs py-2 shadow-sm">
                        <ThumbsUp size={14} /> <span>Lock Winners & Stage PO</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
                <Wallet size={30} className="mb-2 text-slate-300" />
                <p>Select a small order to clear it immediately.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW C: PURCHASE HISTORY LEDGER */}
      {activeTab === 'history' && (
        <Card className="p-5 max-w-5xl">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="text-[#0b9c54]" size={18} />
            <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Quotation Processing Ledger</h2>
          </div>
          {history.length === 0 ? (
            <div className="h-48 flex flex-col justify-center items-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white text-sm"><p>No processed procurement runs located.</p></div>
          ) : (
            <div className="space-y-3">
              {history.map((ticket, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl gap-3">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-mono text-[#2c2a57] font-black text-sm">{ticket.ticket_number}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">Cost Center: {ticket.project_code}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-600">{ticket.project_name}</p>
                    <div className="flex items-center space-x-1.5 mt-2 text-[10px] font-mono text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded w-max border border-slate-100">
                      <Clock size={10} className="text-[#0b9c54]" />
                      <span>Processed On: <strong className="text-slate-700">{ticket.action_date || "Date Unavailable"}</strong></span>
                    </div>
                  </div>
                  <div className="flex sm:justify-end">
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
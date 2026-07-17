// src/components/ProjectManagerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  CheckSquare, ShieldCheck, ThumbsUp, Inbox, Archive, Clock, 
  Award, MessageSquare, AlertTriangle 
} from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function ProjectManagerDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [tickets, setTickets] = useState([]);
  const [historyTickets, setHistoryTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [items, setItems] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  
  // Interactive States
  const [selectedBids, setSelectedBids] = useState({});
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const currentUserId = currentUser?.id || 5;

  const fetchPMQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/pending-management-approval/${currentUserId}`);
      // Filter out 'Pending PM Vetting' because that is handled in the /vetting tab now
      const commercialTickets = res.data.filter(t => t.status !== 'Pending PM Vetting');
      setTickets(commercialTickets);
    } catch (err) { console.error("Error loading PM queue", err); } 
    finally { setLoading(false); }
  }, [currentUserId]);

  const fetchPMHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/pm-history/${currentUserId}`);
      setHistoryTickets(res.data);
    } catch (err) { console.error("Error loading PM history", err); } 
    finally { setLoading(false); }
  }, [currentUserId]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'queue') {
      setTimeout(() => { if (isMounted) fetchPMQueue(); }, 0);
    } else if (activeTab === 'history') {
      setTimeout(() => { if (isMounted) fetchPMHistory(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab, fetchPMQueue, fetchPMHistory]);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setSelectedBids({}); 
    setRemarks('');
    setAlert(null);
    try {
      const itemsRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      // 🎯 FIXED: Mapped item_type so the PM can see and edit the Asset/Consumable flag
      setItems(itemsRes.data.map(item => ({ 
        ...item, 
        is_reimbursable: item.is_reimbursable || false,
        item_type: item.item_type || 'Consumable'
      })));
      
      const quotesRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/quotations`);
      setVendorQuotes(quotesRes.data);

      const histRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/history`);
      setHistoryLogs(histRes.data);
    } catch (err) { console.error("Error loading ticket specifications", err); }
  };

  const toggleBidSelection = (itemIndex, vendorName) => {
    setSelectedBids(prev => ({ ...prev, [itemIndex]: vendorName }));
  };

  const handleReimbursableToggle = (itemIndex, newValue) => {
    setItems(prevItems => prevItems.map(item => 
      item.item_index === itemIndex ? { ...item, is_reimbursable: newValue } : item
    ));
  };

  // 🎯 NEW: Handler to update the item classification (Asset vs Consumable)
  const handleItemTypeChange = (itemIndex, newValue) => {
    setItems(prevItems => prevItems.map(item => 
      item.item_index === itemIndex ? { ...item, item_type: newValue } : item
    ));
  };

  const handleCommercialAuthorization = async (actionType) => {
    if (actionType === "Raise Query" && !remarks) {
      setAlert({ type: 'error', message: "Operational remarks are mandatory before raising technical deviations." });
      return;
    }

    if (actionType === "Approve" && Object.keys(selectedBids).length !== items.length) {
      setAlert({ type: 'error', message: "You must explicitly select exactly 1 winning vendor option for every line item." });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/action`, {
        user_name: currentUser?.name || "Project Manager",
        action: actionType,
        remarks: remarks || "Authorized under PM site budget allowances.",
        selected_bids: actionType === "Approve" ? selectedBids : null,
        items: items 
      });
      
      setAlert({
        type: 'success',
        message: actionType === "Approve" 
          ? "Site budget authorized. Winning supplier bids locked and pushed for final contract printing." 
          : "Query successfully routed down to site coordinators."
      });
      setSelectedTicket(null);
      fetchPMQueue();
    } catch (err) {
      setAlert({ type: 'error', message: "Failed to broadcast authorization response." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">PM Commercial Clearance</h1>
          <p className="text-sm text-slate-500 font-medium">Evaluate supplier matrices, verify client-billing flags, and authorize budgets</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button variant={activeTab === 'queue' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('queue'); setSelectedTicket(null); }} className="text-xs py-1.5 flex-1 md:flex-none flex items-center justify-center gap-1.5">
            <Inbox size={14} /> <span>Approval Queue ({tickets.length})</span>
          </Button>
          <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('history'); setSelectedTicket(null); }} className="text-xs py-1.5 flex-1 md:flex-none flex items-center justify-center gap-1.5">
            <Archive size={14} /> <span>PM Authorization Ledger</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckSquare size={18} className="flex-shrink-0" /> <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          
          {/* QUEUE LIST */}
          <div className="xl:col-span-3 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pending Budget Clearance</h2>
            {tickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 bg-white text-sm">Clear queue. No sites waiting for PM operational sign-off.</Card>
            ) : (
              tickets.map(t => (
                <div key={t.ticket_number} onClick={() => openTicket(t)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.ticket_number === t.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[#2c2a57] font-black text-sm">{t.ticket_number}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 truncate">{t.project_name}</p>
                  <p className="text-[9px] text-slate-400 font-mono mt-1">Project Code: {t.project_code}</p>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-9">
            {selectedTicket ? (
              <div className="space-y-6">
                <Card className="p-4 bg-slate-50 border-slate-200 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#2c2a57]/10 p-2 rounded-lg text-[#2c2a57]">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2c2a57] text-sm uppercase tracking-wider">
                        PM Commercial Valuation & Billing Checks
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTicket.ticket_number} • {selectedTicket.project_name}</p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4 bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-[#2c2a57] uppercase tracking-wider flex justify-between items-center">
                    <span>Line Material Quantities & Quotation Framework</span>
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold animate-pulse">Click card option below to choose winner</span>
                  </div>
                  <div className="p-4 space-y-6 divide-y divide-slate-100">
                    {items.map(item => {
                      const itemBids = vendorQuotes.filter(q => q.item_index === item.item_index);
                      return (
                        <div key={item.item_index} className="pt-4 first:pt-0 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <h4 className="text-sm font-bold text-[#2c2a57]">{item.item_index}. {item.product_description}</h4>
                              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Site Justification: <span className="italic text-slate-600 font-semibold">{item.purpose}</span></span>
                            </div>
                            
                            {/* 🎯 MANDATORY PM Financial Toggle Switch for each item */}
                            <div className="flex flex-wrap items-center bg-slate-50 border border-slate-200 p-1.5 rounded-lg gap-2">
                              {/* 🎯 NEW: Asset vs Consumable Dropdown */}
                              <div className="flex items-center border-r border-slate-200 pr-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase mr-2 ml-1">Type:</span>
                                <select
                                  value={item.item_type || 'Consumable'}
                                  onChange={(e) => handleItemTypeChange(item.item_index, e.target.value)}
                                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border outline-none cursor-pointer bg-white text-slate-700 border-slate-300 focus:border-[#2c2a57] transition-colors"
                                >
                                  <option value="Consumable">📦 Consumable</option>
                                  <option value="Asset">🖥️ Asset</option>
                                </select>
                              </div>

                              <div className="flex items-center">
                                <span className="text-[10px] font-bold text-slate-500 uppercase mr-3 ml-1">Client Billed Expense?</span>
                                <label className="flex items-center justify-center cursor-pointer mr-1">
                                  <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${item.is_reimbursable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${item.is_reimbursable ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </div>
                                  <input 
                                    type="checkbox" 
                                    className="hidden" 
                                    checked={item.is_reimbursable || false} 
                                    onChange={(e) => handleReimbursableToggle(item.item_index, e.target.checked)} 
                                  />
                                </label>
                              </div>
                            </div>

                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {itemBids.map((bid, bIdx) => {
                              const isChosen = selectedBids[item.item_index] === bid.vendor_name;
                              
                              return (
                                <div 
                                  key={bIdx} 
                                  onClick={() => toggleBidSelection(item.item_index, bid.vendor_name)}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                                    isChosen 
                                      ? 'border-[#0b9c54] bg-emerald-50/40 ring-1 ring-[#0b9c54] shadow-md transform scale-[1.01]' 
                                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                                  }`}
                                >
                                  {isChosen && (
                                    <div className="absolute top-0 right-0 bg-[#0b9c54] text-white p-1 rounded-bl-lg">
                                      <Award size={12} />
                                    </div>
                                  )}
                                  <div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${isChosen ? 'text-[#0b9c54]' : 'text-slate-400'}`}>
                                      Bid {bIdx + 1} {isChosen && '• SELECTED'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 truncate block">{bid.vendor_name}</span>
                                    {bid.special_terms && <span className="text-[9px] font-medium text-slate-500 italic block mt-1 line-clamp-2">Clauses: {bid.special_terms}</span>}
                                    
                                    {bid.quality_remarks && (
                                      <div className="mt-2 bg-amber-50/50 border border-amber-100 p-1.5 rounded-md">
                                        <span className="text-[9px] font-bold text-amber-700 block uppercase mb-0.5">Tech Specs / QA:</span>
                                        <span className="text-[10px] font-medium text-slate-700 italic line-clamp-2 leading-tight">{bid.quality_remarks}</span>
                                      </div>
                                    )}
                                    
                                  </div>
                                  <div className="mt-3 flex justify-between items-baseline border-t border-slate-100 pt-2">
                                    <span className={`text-xs font-black ${isChosen ? 'text-[#0b9c54]' : 'text-[#0b9c54]'}`}>₹{bid.total_amount.toLocaleString('en-IN')}</span>
                                    <span className="text-[9px] font-bold text-slate-400">{bid.time_of_delivery}</span>
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
                    <Input label="PM Directives & Comments" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add any site instructions for Sagar's purchase department..." />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button variant="danger" onClick={() => handleCommercialAuthorization("Raise Query")} disabled={loading} className="text-xs py-2">
                        <span>Flag Technical Query</span>
                      </Button>
                      <Button variant="success" onClick={() => handleCommercialAuthorization("Approve")} disabled={loading} className="text-xs py-2 shadow-sm">
                        <ThumbsUp size={14} /> <span>Approve Budget Allocation</span>
                      </Button>
                    </div>
                  </div>
                </Card>

                {historyLogs.length > 0 && (
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center space-x-2 text-slate-500 font-bold text-xs uppercase tracking-wider"><MessageSquare size={14} /><span>Negotiation Audit Log</span></div>
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {historyLogs.map((log, lIdx) => (
                        <div key={lIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-[#2c2a57]">{log.user_name}</span><span className="text-slate-400 font-mono">{log.timestamp}</span></div>
                          <p className="text-[11px] text-slate-400 font-mono italic">Action: {log.action_taken}</p>
                          {log.remarks && <p className="text-xs text-slate-700 font-medium bg-white p-2 rounded-md border border-slate-200 mt-1">{log.remarks}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
                <span className="text-3xl mb-2">🏢</span>
                <h3 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">PM Review Stream Idle</h3>
                <p className="max-w-xs mt-1 text-xs text-slate-500">Select a project's materials folder to evaluate associated supplier cost matrices.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: PM HISTORY LEDGER */}
      {activeTab === 'history' && (
        <Card className="p-5 max-w-5xl">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="text-[#0b9c54]" size={18} />
            <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">PM Authorization Ledger</h2>
          </div>
          {historyTickets.length === 0 ? (
            <div className="h-48 flex flex-col justify-center items-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white text-sm">
              <p>No processed PM clearances found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyTickets.map((ticket, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl gap-3">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-mono text-[#2c2a57] font-black text-sm">{ticket.ticket_number}</span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">Cost Center: {ticket.project_code}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-600">{ticket.project_name}</p>
                    <div className="flex items-center space-x-1.5 mt-2 text-[10px] font-mono text-slate-500 bg-slate-50  px-2 py-1 rounded w-max border border-slate-100">
                      <Clock size={10} className="text-[#0b9c54]" />
                      <span>Approved On: <strong className="text-slate-700">{ticket.approval_date || "Date Unavailable"}</strong></span>
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
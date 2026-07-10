// src/components/DirectorDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { CheckSquare, ShieldCheck, ThumbsUp, DollarSign, Inbox, Archive, Clock, Award, AlertCircle } from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function DirectorDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('queue');
  const [tickets, setTickets] = useState([]);
  const [historyTickets, setHistoryTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [items, setItems] = useState([]);
  const [vendorQuotes, setVendorQuotes] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const currentUserId = currentUser?.id || 6;

  // 🎯 FIXED: Passed the currentUserId parameter to synchronize with the main SCM engine
  const fetchDirectorQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/requisitions/pending-management-approval/${currentUserId}`);
      // Filter strictly for high-value tickets routed to the director tier
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

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) {
        if (activeTab === 'queue') fetchDirectorQueue();
        if (activeTab === 'history') fetchDirectorHistory();
      }
    }, 0);

    return () => { 
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab, fetchDirectorQueue, fetchDirectorHistory]);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setRemarks('');
    setAlert(null);
    try {
      const itemsRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setItems(itemsRes.data);
      const quotesRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/quotations`);
      setVendorQuotes(quotesRes.data);
    } catch (err) { 
      console.error("Error loading financial data", err); 
    }
  };

  const handleDirectorSignOff = async (actionType) => {
    if (actionType === "Raise Query" && !remarks) {
      setAlert({ type: 'error', message: "Corporate audit notes are required before issuing technical holds." });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/action`, {
        user_name: currentUser?.name || "Director",
        action: actionType,
        remarks: remarks || "Grand-scale budget authorization approved via executive director board."
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
      setAlert({ type: 'error', message: "Failed to apply executive board authorization." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER WITH TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Director Executive Board</h1>
          <p className="text-sm text-slate-500 font-medium">High-value capital procurement authorization and board-level clearances</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button 
            variant={activeTab === 'queue' ? 'primary' : 'ghost'} 
            onClick={() => { setActiveTab('queue'); setSelectedTicket(null); }} 
            className="text-xs py-1.5 flex-1 md:flex-none flex items-center justify-center gap-1.5"
          >
            <Inbox size={14} /> <span>CAPEX Backlog ({tickets.length})</span>
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'primary' : 'ghost'} 
            onClick={() => { setActiveTab('history'); setSelectedTicket(null); }} 
            className="text-xs py-1.5 flex-1 md:flex-none flex items-center justify-center gap-1.5"
          >
            <Archive size={14} /> <span>Executive Ledger</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckSquare size={18} className="flex-shrink-0" /> <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {/* VIEW 1: ACTIVE CAPEX QUEUE */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Board CAPEX Backlog</h2>
            {tickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 bg-white text-sm">No high-value expenditures awaiting director clearance loops.</Card>
            ) : (
              tickets.map(t => (
                <div key={t.ticket_number} onClick={() => openTicket(t)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?.ticket_number === t.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono text-[#2c2a57] font-black text-sm">{t.ticket_number}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-xs font-semibold text-slate-600 truncate">{t.project_name}</p>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>Site: {t.project_code}</span>
                    <span className="text-amber-600 font-black flex items-center"><DollarSign size={10}/>CAPEX Run</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedTicket ? (
              <div className="space-y-6">
                <Card className="p-4 bg-slate-50 border-slate-200 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#2c2a57]/10 p-2 rounded-lg text-[#2c2a57]"><ShieldCheck size={18} /></div>
                    <div>
                      <h3 className="font-bold text-[#2c2a57] text-sm uppercase tracking-wider">Executive Board Fiscal Review</h3>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTicket.ticket_number} • {selectedTicket.project_name}</p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-4 bg-slate-50/50 border-b border-slate-200 text-xs font-bold text-[#2c2a57] uppercase tracking-wider">
                    Attached Supplier Quotation Grid Ledger
                  </div>
                  <div className="p-4 space-y-6 divide-y divide-slate-100">
                    {items.map(item => {
                      const itemBids = vendorQuotes.filter(q => q.item_index === item.item_index);
                      return (
                        <div key={item.item_index} className="pt-4 first:pt-0 space-y-3">
                          <div className="flex flex-col sm:flex-row justify-between sm:items-baseline gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-[#2c2a57]">{item.item_index}. {item.product_description}</h4>
                              <span className="text-xs text-slate-400 font-medium block mt-0.5">Justification Statement: <span className="italic text-slate-600 font-semibold">{item.purpose}</span></span>
                            </div>
                            
                            {/* 🎯 NEW: Dynamic Client-Reimbursable Audit Asset Badge */}
                            {item.is_reimbursable && (
                              <div className="flex items-center space-x-1 bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight h-max flex-shrink-0">
                                <AlertCircle size={10} />
                                <span>Client Billed Expense</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {itemBids.map((bid, bIdx) => {
                              // 🎯 NEW: Highlighting chosen vendor options locked down by Sourcing/PM
                              const isWinner = bid.is_selected === true;
                              return (
                                <div 
                                  key={bIdx} 
                                  className={`p-3 rounded-xl border flex flex-col justify-between relative overflow-hidden transition-all ${
                                    isWinner 
                                      ? 'border-[#0b9c54] bg-emerald-50/30 ring-1 ring-[#0b9c54] shadow-xs' 
                                      : 'border-slate-200 bg-white opacity-85'
                                  }`}
                                >
                                  {isWinner && (
                                    <div className="absolute top-0 right-0 bg-[#0b9c54] text-white p-1 rounded-bl-lg flex items-center" title="Locked Winner option">
                                      <Award size={11} />
                                    </div>
                                  )}
                                  <div>
                                    <span className={`text-[9px] font-black uppercase tracking-wider block mb-1 ${isWinner ? 'text-[#0b9c54]' : 'text-slate-400'}`}>
                                      Supplier Bid {bIdx + 1} {isWinner && "• LOCKED CHOICE"}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 truncate block">{bid.vendor_name}</span>
                                    {bid.special_terms && <span className="text-[9px] font-medium text-slate-400 italic block mt-1 line-clamp-1">Clauses: {bid.special_terms}</span>}
                                  </div>
                                  <div className="mt-3 flex justify-between items-baseline border-t border-slate-100 pt-2">
                                    <span className={`text-xs font-black ${isWinner ? 'text-[#0b9c54]' : 'text-slate-700'}`}>
                                      ₹{bid.total_amount.toLocaleString('en-IN')}
                                    </span>
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
                    <Input label="Board Audit Stipulations / Remarks" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter directive board parameters to append onto this order run..." />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button variant="danger" onClick={() => handleDirectorSignOff("Raise Query")} disabled={loading} className="text-xs py-2">
                        <span>Reject & Force Renegotiation</span>
                      </Button>
                      <Button variant="success" onClick={() => handleDirectorSignOff("Approve")} disabled={loading} className="text-xs py-2 shadow-sm">
                        <ThumbsUp size={14} /> <span>Grant Executive Sanction</span>
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

      {/* VIEW 2: EXECUTIVE HISTORY LEDGER */}
      {activeTab === 'history' && (
        <Card className="p-5 max-w-5xl">
          <div className="flex items-center space-x-2 mb-6">
            <Clock className="text-[#0b9c54]" size={18} />
            <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Executive Authorization Ledger</h2>
          </div>
          {historyTickets.length === 0 ? (
            <div className="h-48 flex flex-col justify-center items-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white text-sm">
              <p>No processed Director clearances found.</p>
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
// src/components/SiteManagerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, Trash2, MessageSquare, Check, AlertTriangle, 
  Clock, Inbox, Plus, Archive, FileText, CheckCircle, Info, 
  ChevronDown, ChevronUp, Layers 
} from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function SiteManagerDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('inbox');
  const [tickets, setTickets] = useState([]);
  const [archiveTickets, setArchiveTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [gridItems, setGridItems] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [managerRemarks, setManagerRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [showSignOffModal, setShowSignOffModal] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState({});
  const [archiveItemsCache, setArchiveItemsCache] = useState({});

  const currentUserId = currentUser?.id || 2;

  const fetchInbox = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requisitions/pending-vetting/${currentUserId}`);
      setTickets(response.data);
    } catch (err) { 
      console.error("Error fetching manager inbox", err); 
    } finally { 
      setLoading(false); 
    }
  }, [currentUserId]); 

  const fetchArchiveHistory = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requisitions/manager-history/${currentUserId}`);
      setArchiveTickets(response.data);
    } catch (err) { 
      console.error("Error fetching manager history logs", err); 
    } finally { 
      setLoading(false); 
    }
  }, [currentUserId]);

  useEffect(() => { 
    let isMounted = true;
    if (activeTab === 'inbox') {
      setTimeout(() => { if (isMounted) fetchInbox(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab, fetchInbox]);

  useEffect(() => { 
    let isMounted = true;
    if (activeTab === 'archive') {
      setTimeout(() => { if (isMounted) fetchArchiveHistory(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab, fetchArchiveHistory]);

  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setManagerRemarks('');
    setShowSignOffModal(false);
    setAlert(null);
    try {
      const itemRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setGridItems(itemRes.data.map(item => ({ ...item, is_reimbursable: item.is_reimbursable || false })));
      
      const histRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/history`);
      setHistoryLogs(histRes.data);
    } catch (err) { console.error(err); }
  };

  const toggleTicketDetails = async (ticketNumber) => {
    if (expandedTickets[ticketNumber]) {
      setExpandedTickets(prev => ({ ...prev, [ticketNumber]: false }));
      return;
    }

    if (!archiveItemsCache[ticketNumber]) {
      try {
        const itemRes = await axios.get(`${API_BASE_URL}/requisitions/${ticketNumber}/items`);
        setArchiveItemsCache(prev => ({ ...prev, [ticketNumber]: itemRes.data }));
      } catch (err) {
        console.error("Error fetching archived line items", err);
        return;
      }
    }
    setExpandedTickets(prev => ({ ...prev, [ticketNumber]: true }));
  };

  const handleCellChange = (index, field, value) => {
    const updated = [...gridItems];
    updated[index][field] = value;
    setGridItems(updated);
  };

  const addNewRow = () => {
    setGridItems([
      ...gridItems, 
      { item_index: gridItems.length + 1, product_description: '', make_brand: '', quantity: 1, purpose: '', is_reimbursable: false }
    ]);
  };

  const deleteRow = (index) => {
    setGridItems(gridItems.filter((_, i) => i !== index).map((item, idx) => ({ ...item, item_index: idx + 1 })));
  };

  const handleCounterPush = async () => {
    if (!managerRemarks) {
      setAlert({ type: 'error', message: "You must provide notes before sending counter-edits back to the field." });
      return;
    }
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/propose-edits`, {
        user_name: currentUser?.name || "Site Manager", 
        user_role: currentUser?.role || "Site Manager", 
        remarks: managerRemarks, 
        items: gridItems
      });
      setAlert({ type: 'success', message: "Counter-edits dispatched. Returned to Coordinator's dashboard." });
      setSelectedTicket(null);
      fetchInbox();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const executeFinalSignOff = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/approve`, {
        user_name: currentUser?.name || "Site Manager", 
        user_role: currentUser?.role || "Site Manager",
        items: gridItems
      });
      
      setAlert({ type: 'success', message: res.data.status === "Pending Sourcing" ? "Technical Audit Locked! Dispatched to Procurement." : "Your signature applied successfully! Waiting on Coordinator." });
      setShowSignOffModal(false);
      setSelectedTicket(null);
      fetchInbox();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // 🎯 4-STEP STATUS MAP
  const getStepStatus = (currentStatus, stepIndex) => {
    const statusMap = {
      'Vetting Active': 1, 
      'Awaiting Coordinator Sign-Off': 1, 
      'Approved by Manager': 1, 
      'Approved by Coordinator': 1,
      'Pending PM Vetting': 1,
      'Pending Sourcing': 2,
      'Pending Purchase Approval': 3,
      'Pending Project Manager': 3, 
      'Pending Director': 3, 
      'Query Raised': 3,
      'Awaiting Digital Signature': 4, // 🟡 Step 4 Active (Draft generated, waiting for seal)
      'Approved': 5                    // 🟢 Step 4 Completed (End of digital tracking)
    };
    const currentStep = statusMap[currentStatus] || 1;
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="space-y-6 relative pb-12">
      
      {showSignOffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#2c2a57] p-4 text-white flex justify-between items-center">
              <h3 className="font-bold">Confirm Technical Vetting</h3>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 flex items-start space-x-2">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>By signing off, you verify that these materials are required for site operations, the quantities are correct, and optional billing flags have been reviewed.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setShowSignOffModal(false)}>Cancel</Button>
                <Button variant="success" className="flex-1" onClick={executeFinalSignOff} disabled={loading}>
                  {loading ? 'Processing...' : 'Sign-Off & Dispatch'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Site Manager Workspace</h1>
          <p className="text-sm text-slate-500 font-medium">Review, clean, and optionally flag client-billable items</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
          <Button variant={activeTab === 'inbox' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('inbox'); setSelectedTicket(null); }} className="text-xs py-1.5 flex-1 md:flex-none">
            <Inbox size={14} /> <span>Vetting Inbox ({tickets.length})</span>
          </Button>
          <Button variant={activeTab === 'archive' ? 'primary' : 'ghost'} onClick={() => { setActiveTab('archive'); setSelectedTicket(null); }} className="text-xs py-1.5 flex-1 md:flex-none">
            <Archive size={14} /> <span>Vetted History Archive ({archiveTickets.length})</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckCircle2 size={18} className="flex-shrink-0" /> <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          <div className="xl:col-span-3 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Action Required</h2>
            {tickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 text-sm bg-white">Your action vetting queue is completely clear.</Card>
            ) : (
              tickets.map((t) => (
  <div key={t.ticket_number} onClick={() => openTicket(t)} className={`p-4 rounded-xl border transition-all cursor-pointer block ${selectedTicket?.ticket_number === t.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
    <div className="flex justify-between items-center mb-2">
      <span className="font-mono text-[#2c2a57] font-black text-sm">{t.ticket_number}</span>
      <StatusBadge status={t.status} />
    </div>
    <p className="text-xs font-semibold text-slate-600 truncate">{t.project_name}</p>
    
    {/* 🎯 NEW: Added Raised By badge next to the Cost Center */}
    <div className="flex justify-between items-center mt-2.5">
      <div className="text-[10px] font-bold text-slate-400 font-mono">CC: {t.project_code}</div>
      <div className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 uppercase tracking-wider truncate max-w-[120px]" title={t.raised_by}>
        By: {t.raised_by || 'Unknown'}
      </div>
    </div>
  </div>
))

            )}
          </div>

          <div className="xl:col-span-9">
            {selectedTicket ? (
              <div className="space-y-6">
                <Card>
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="text-indigo-600" size={16} />
                      <span className="font-bold text-[#2c2a57] text-sm uppercase tracking-wider">Review & Edit Workbook Counter</span>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto p-2">
                    <table className="w-full text-left min-w-[900px]">
                      <thead>
                        <tr className="text-[11px] text-slate-400 border-b border-slate-100 uppercase font-bold tracking-wider bg-slate-50/50">
                          <th className="py-2.5 w-12 text-center">Row</th>
                          <th className="py-2.5 px-2">Description</th>
                          <th className="py-2.5 px-2 w-28">Brand / Make</th>
                          <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                          <th className="py-2.5 px-2 w-48">Purpose Justification</th>
                          <th className="py-2.5 px-2 w-28 text-center text-indigo-500">Client Billed? <br/><span className="text-[9px] font-normal text-slate-400">(Optional)</span></th>
                          <th className="py-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {gridItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            <td className="py-2 text-center font-mono text-xs text-slate-400 font-bold">{item.item_index}</td>
                            <td className="py-1 px-1"><input type="text" value={item.product_description} onChange={(e) => handleCellChange(idx, 'product_description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-800 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.make_brand || ''} onChange={(e) => handleCellChange(idx, 'make_brand', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="number" min="1" value={item.quantity} onChange={(e) => handleCellChange(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold text-indigo-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.purpose || ''} onChange={(e) => handleCellChange(idx, 'purpose', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-600 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            
                            <td className="py-1 px-1 text-center">
                              <label className="flex items-center justify-center cursor-pointer">
                                <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${item.is_reimbursable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${item.is_reimbursable ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input type="checkbox" className="hidden" checked={item.is_reimbursable || false} onChange={(e) => handleCellChange(idx, 'is_reimbursable', e.target.checked)} />
                              </label>
                            </td>

                            <td className="py-1 text-center"><button type="button" onClick={() => deleteRow(idx)} className="text-slate-400 hover:text-rose-600 transition-colors"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pt-3 px-2 pb-2">
                      <button type="button" onClick={addNewRow} className="flex items-center text-xs text-cyan-600 hover:text-cyan-700 font-bold uppercase tracking-wider"><Plus size={14} className="mr-1" /> Add Material</button>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                    <Input label="Your Counter Remarks (Required for Counter-Edits)" value={managerRemarks} onChange={e => setManagerRemarks(e.target.value)} placeholder="Type notes here if you are adding/rejecting items..." />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button variant="danger" onClick={handleCounterPush} disabled={loading} className="text-xs py-2"><MessageSquare size={14} /> <span>Propose Counter-Edits</span></Button>
                      <Button variant="success" onClick={() => setShowSignOffModal(true)} disabled={loading} className="text-xs py-2 shadow-sm"><Check size={14} /> <span>Approve & Sign-Off</span></Button>
                    </div>
                  </div>
                </Card>
                
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
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm"><span className="text-2xl mb-2">📥</span><p>Select an active requisition ticket from the queue to start vetting.</p></div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VETTED PIPELINE RECORD TRACKER */}
      {activeTab === 'archive' && (
        <div className="space-y-4 max-w-5xl">
          <div className="flex items-center space-x-2"><Clock className="text-[#0b9c54]" size={18} /><h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Live Material Pipeline Tracker</h2></div>
          
          {archiveTickets.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 bg-white rounded-xl">
              <p>No historically processed sheets found in backend logs.</p>
            </Card>
          ) : (
            archiveTickets.map((ticket) => (
              <Card key={ticket.ticket_number} className="p-5 bg-white border border-slate-200 flex flex-col space-y-5 shadow-sm hover:shadow-md transition-shadow">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-100 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-[#2c2a57] font-black text-sm">{ticket.ticket_number}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">Cost Center: {ticket.project_code}</span>
                    </div>
                    <h3 className="text-[#2c2a57] text-sm font-bold">{ticket.project_name}</h3>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-400 pt-1">
                      <div>🗓️ <span className="font-semibold text-slate-500">Raised Date:</span> {ticket.created_at || 'Date Pending'}</div>
                      <div>⚡ <span className="font-semibold text-slate-500">Your Vetting Date:</span> {ticket.action_date}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2">
                    <StatusBadge status={ticket.status} />
                    
                    <button 
                      onClick={() => toggleTicketDetails(ticket.ticket_number)}
                      className="flex items-center space-x-1 text-xs font-bold text-[#2c2a57] hover:text-indigo-600 transition-colors bg-white hover:bg-slate-100 border px-3 py-1.5 rounded-lg shadow-2xs"
                    >
                      <Layers size={13} />
                      <span>{expandedTickets[ticket.ticket_number] ? "Hide Materials" : "Get More Details"}</span>
                      {expandedTickets[ticket.ticket_number] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {expandedTickets[ticket.ticket_number] && (
                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 p-2 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">Authorized Resource Array</div>
                    <table className="w-full text-left border-collapse bg-white rounded-lg overflow-hidden shadow-xs">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border-b border-slate-100">
                          <th className="p-2 w-12 text-center">Row</th>
                          <th className="p-2">Material Description</th>
                          <th className="p-2 w-32">Brand / Make</th>
                          <th className="p-2 w-16 text-center">Qty</th>
                          <th className="p-2">Technical Justification</th>
                          <th className="p-2 w-28 text-center text-indigo-500">Reimbursable?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {archiveItemsCache[ticket.ticket_number]?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 text-center font-mono font-bold text-slate-400 bg-slate-50/30">{item.item_index}</td>
                            <td className="p-2 text-slate-800 font-medium">{item.product_description}</td>
                            <td className="p-2 text-slate-600 font-semibold">{item.make_brand || '—'}</td>
                            <td className="p-2 text-center font-bold text-indigo-900 bg-indigo-50/10">{item.quantity}</td>
                            <td className="p-2 text-slate-500 italic">{item.purpose}</td>
                            <td className="p-2 text-center font-bold">
                              {item.is_reimbursable ? (
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px]">YES</span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">NO</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PROGRESS STEPPER HORIZONTAL BAR (Responsive & 4 Steps) */}
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="grid grid-cols-4 min-w-[500px] sm:min-w-full gap-2 relative pt-2">
                    
                    {/* Step 1: Site Alignment */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 1) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 1) === 'active' ? 'bg-indigo-50 border-indigo-400 text-indigo-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 1) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 1) === 'completed' ? <CheckCircle size={15} /> : "1"}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 1) === 'active' ? 'text-indigo-600' : 'text-slate-600'}`}>Site Handshake</span>
                      <p className="text-[8px] text-slate-400 font-medium">Vetting Sealed</p>
                    </div>

                    {/* Step 2: Sourcing Hub */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 2) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 2) === 'active' ? 'bg-cyan-50 border-cyan-400 text-cyan-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 2) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 2) === 'completed' ? <CheckCircle size={15} /> : "2"}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 2) === 'active' ? 'text-cyan-600' : 'text-slate-500'}`}>Sourcing Hub</span>
                      <p className="text-[8px] text-slate-400 font-medium">Vendor Selection</p>
                    </div>

                    {/* Step 3: Mgmt Approval */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 3) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 3) === 'active' ? 'bg-amber-50 border-amber-400 text-amber-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 3) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 3) === 'completed' ? <CheckCircle size={15} /> : "3"}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 3) === 'active' ? 'text-amber-500' : 'text-slate-500'}`}>Mgmt Approval</span>
                      <p className="text-[8px] text-slate-400 font-medium">Corporate Clearing</p>
                    </div>

                    {/* Step 4: PO Generation */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 4) === 'completed' ? 'bg-[#0b9c54] border-[#0b9c54] text-white' :
                        getStepStatus(ticket.status, 4) === 'active' ? 'bg-emerald-50 border-[#0b9c54] text-[#0b9c54]' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 4) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0b9c54]"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 4) === 'completed' ? <CheckCircle size={15} /> : <FileText size={13} />}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 4) === 'completed' ? 'text-[#0b9c54]' : getStepStatus(ticket.status, 4) === 'active' ? 'text-[#2c2a57]' : 'text-slate-500'}`}>PO Generation</span>
                      <p className="text-[8px] text-slate-400 font-medium">Contract Sealing</p>
                    </div>

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
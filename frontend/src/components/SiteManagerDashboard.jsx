// src/components/SiteManagerDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileEdit, CheckCircle2, Trash2, RefreshCw, MessageSquare, Check, AlertTriangle, Clock, Inbox, Plus, Archive, FileText, CheckCircle } from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI';

const API_BASE_URL = "http://127.0.0.1:8000/api";
const MOCK_USER_NAME = "Vikram Rathore";
const MOCK_USER_ROLE = "Site Manager";

export default function SiteManagerDashboard() {
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox' or 'archive'
  const [tickets, setTickets] = useState([]);
  const [archiveTickets, setArchiveTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [gridItems, setGridItems] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [managerRemarks, setManagerRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // 1. FETCH TICKETS WAITING FOR VETTING (INBOX)
  const fetchInbox = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requisitions/pending-vetting`);
      setTickets(response.data);
    } catch (err) { 
      console.error("Error fetching manager inbox", err); 
    } finally { 
      setLoading(false); 
    }
  };

  // 2. FETCH TICKETS SIGNED OFF BY MANAGER (DATABASE ARCHIVE Ledger)
  const fetchArchiveHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requisitions/manager-history`);
      setArchiveTickets(response.data);
    } catch (err) {
      console.error("Error fetching manager history logs", err);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 ESLint-safe Timeout Synchronizer for Inbox Tab
  useEffect(() => { 
    let isMounted = true;
    if (activeTab === 'inbox') {
      setTimeout(() => { if (isMounted) fetchInbox(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab]);

  // 🎯 ESLint-safe Timeout Synchronizer for History Archive Tab
  useEffect(() => { 
    let isMounted = true;
    if (activeTab === 'archive') {
      setTimeout(() => { if (isMounted) fetchArchiveHistory(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab]);

  // 3. OPEN A SHEET INTO EDITABLE GRID
  const openTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setManagerRemarks('');
    setAlert(null);
    try {
      const itemRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setGridItems(itemRes.data);
      const histRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/history`);
      setHistoryLogs(histRes.data);
    } catch (err) { console.error(err); }
  };

  const handleCellChange = (index, field, value) => {
    const updated = [...gridItems];
    updated[index][field] = value;
    setGridItems(updated);
  };

  const addNewRow = () => {
    setGridItems([
      ...gridItems,
      { item_index: gridItems.length + 1, product_description: '', make_brand: '', quantity: 1, purpose: '' }
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
        user_name: MOCK_USER_NAME, user_role: MOCK_USER_ROLE, remarks: managerRemarks, items: gridItems
      });
      setAlert({ type: 'success', message: "Counter-edits dispatched. Returned to Coordinator's dashboard." });
      setSelectedTicket(null);
      fetchInbox();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFinalSignOff = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/requisitions/${selectedTicket.ticket_number}/approve`, {
        user_name: MOCK_USER_NAME, user_role: MOCK_USER_ROLE
      });
      setAlert({ type: 'success', message: res.data.status === "Pending Sourcing" ? "Dual-Agreement Locked! Dispatched to Procurement." : "Your signature applied successfully! Waiting on Coordinator." });
      setSelectedTicket(null);
      fetchInbox();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getStepStatus = (currentStatus, stepIndex) => {
    const statusMap = {
      'Vetting Active': 1, 'Awaiting Coordinator Sign-Off': 1, 'Approved by Manager': 1, 'Approved by Coordinator': 1,
      'Pending Sourcing': 2,
      'Pending Project Manager': 3, 'Pending Director': 3, 'Query Raised': 3,
      'Approved': 4,
      'Dispatched': 5
    };
    const currentStep = statusMap[currentStatus] || 1;
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER TABS LAYOUT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Site Manager Workspace</h1>
          <p className="text-sm text-slate-500 font-medium">Review, clean, and authorize field resource arrays</p>
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

      {/* TAB 1: ACTIVE VETTING WORKSPACE */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Action Required</h2>
            {tickets.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 text-sm bg-white">Your action vetting queue is completely clear.</Card>
            ) : (
              tickets.map((t) => (
                <div key={t.ticket_number} onClick={() => openTicket(t)} className={`p-4 rounded-xl border transition-all cursor-pointer block ${selectedTicket?.ticket_number === t.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-center mb-2"><span className="font-mono text-[#2c2a57] font-black text-sm">{t.ticket_number}</span><StatusBadge status={t.status} /></div>
                  <p className="text-xs font-semibold text-slate-600 truncate">{t.project_name}</p>
                  <div className="text-[10px] font-bold text-slate-400 mt-2 font-mono">Cost Center: {t.project_code}</div>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedTicket ? (
              <div className="space-y-6">
                <Card>
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
                    <AlertTriangle className="text-indigo-600" size={16} />
                    <span className="font-bold text-[#2c2a57] text-sm uppercase tracking-wider">Review & Edit Workbook Counter</span>
                  </div>
                  
                  <div className="overflow-x-auto p-2">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="text-[11px] text-slate-400 border-b border-slate-100 uppercase font-bold tracking-wider bg-slate-50/50">
                          <th className="py-2.5 w-12 text-center">Row</th>
                          <th className="py-2.5 px-2">Description</th>
                          <th className="py-2.5 px-2 w-32">Brand / Make</th>
                          <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-2">Purpose Justification</th>
                          <th className="py-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {gridItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            <td className="py-2 text-center font-mono text-xs text-slate-400 font-bold">{item.item_index}</td>
                            <td className="py-1 px-1"><input type="text" value={item.product_description} onChange={(e) => handleCellChange(idx, 'product_description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.make_brand || ''} onChange={(e) => handleCellChange(idx, 'make_brand', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="number" min="1" value={item.quantity} onChange={(e) => handleCellChange(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold text-indigo-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.purpose || ''} onChange={(e) => handleCellChange(idx, 'purpose', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-600 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
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
                      <Button variant="success" onClick={handleFinalSignOff} disabled={loading} className="text-xs py-2 shadow-sm"><Check size={14} /> <span>Approve & Sign-Off</span></Button>
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
              <Card key={ticket.ticket_number} className="p-4 bg-white border border-slate-200 flex flex-col space-y-5">
                
                {/* Meta Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 p-3 rounded-xl border border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-[#2c2a57] font-black text-sm">{ticket.ticket_number}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">Cost Center: {ticket.project_code}</span>
                    </div>
                    <h3 className="text-[#2c2a57] text-sm font-bold mt-1">{ticket.project_name}</h3>
                  </div>
                  <div className="flex sm:justify-end">
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>

                {/* PROGRESS STEPPER HORIZONTAL BAR */}
                <div className="grid grid-cols-5 gap-1.5 relative pt-1">
                  
                  <div className="text-center flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                      getStepStatus(ticket.status, 1) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-indigo-50 border-indigo-400 text-indigo-600'
                    }`}>
                      <CheckCircle size={14} />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-600 tracking-tight">Site Handshake</span>
                    <p className="text-[8px] text-slate-400 font-medium">Vetting Sealed</p>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                      getStepStatus(ticket.status, 2) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                      getStepStatus(ticket.status, 2) === 'active' ? 'bg-cyan-50 border-cyan-400 text-cyan-600 animate-pulse' :
                      'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {getStepStatus(ticket.status, 2) === 'completed' ? <CheckCircle size={14} /> : "2"}
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 tracking-tight ${getStepStatus(ticket.status, 2) === 'active' ? 'text-cyan-600' : 'text-slate-500'}`}>Sourcing Hub</span>
                    <p className="text-[8px] text-slate-400 font-medium">Vendor Selection</p>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                      getStepStatus(ticket.status, 3) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                      getStepStatus(ticket.status, 3) === 'active' ? 'bg-amber-50 border-amber-400 text-amber-600' :
                      'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {getStepStatus(ticket.status, 3) === 'completed' ? <CheckCircle size={14} /> : "3"}
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 tracking-tight ${getStepStatus(ticket.status, 3) === 'active' ? 'text-amber-400' : 'text-slate-500'}`}>Mgmt Approval</span>
                    <p className="text-[8px] text-slate-400 font-medium">Corporate Clearing</p>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                      getStepStatus(ticket.status, 4) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                      getStepStatus(ticket.status, 4) === 'active' ? 'bg-emerald-50 border-emerald-400 text-emerald-400' :
                      'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {getStepStatus(ticket.status, 4) === 'completed' ? <CheckCircle size={14} /> : <FileText size={12} />}
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 tracking-tight ${getStepStatus(ticket.status, 4) === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>PO Generation</span>
                    <p className="text-[8px] text-slate-400 font-medium">Contract Sealing</p>
                  </div>

                  <div className="text-center flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-bold text-xs transition-all ${
                      getStepStatus(ticket.status, 5) === 'completed' ? 'bg-[#0b9c54] border-[#0b9c54] text-white' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      <CheckCircle size={14} />
                    </div>
                    <span className="text-[10px] font-bold mt-1.5 text-slate-500 tracking-tight">Logistics Release</span>
                    <p className="text-[8px] text-slate-400 font-medium">En Route to Site</p>
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
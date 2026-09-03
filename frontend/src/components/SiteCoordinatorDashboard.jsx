// src/components/SiteCoordinatorDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios'; 
import { 
  Plus, Trash2, Send, Clock, FileSpreadsheet, CheckCircle2, 
  MessageSquare, Check, AlertTriangle, FileText, CheckCircle, 
  Truck, UploadCloud, X, AlertOctagon, ShieldAlert
} from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI'; 

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function SiteCoordinatorDashboard() {
  // 🎯 Dynamically grab the REAL logged-in user
  const storedSession = localStorage.getItem('aarvi_session') || sessionStorage.getItem('aarvi_session');
  const activeUser = storedSession ? JSON.parse(storedSession) : {};
  const currentUserId = activeUser.id;
  const currentUserName = activeUser.name;
  const currentUserRole = activeUser.role;

  const [activeTab, setActiveTab] = useState('new_request'); 
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('GOODS'); 
  
  // Dynamic API States
  const [siteManagers, setSiteManagers] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);

  // Routing States
  const [siteManagerId, setSiteManagerId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [items, setItems] = useState([{ product_description: '', make_brand: '', quantity: 1, purpose: '', item_type: 'Consumable' }]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // History & Negotiation
  const [history, setHistory] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalItems, setProposalItems] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [coordinatorRemarks, setCoordinatorRemarks] = useState('');

  // 🎯 GRN & DISCREPANCY STATES
  const [grnModalTicket, setGrnModalTicket] = useState(null);
  const [receiptType, setReceiptType] = useState('CLEAN'); // 'CLEAN' | 'PARTIAL' | 'DISCREPANCY'
  const [discrepancyCategory, setDiscrepancyCategory] = useState('Damaged Goods'); 
  const [grnFile, setGrnFile] = useState(null);
  const [grnRemarks, setGrnRemarks] = useState('');

  // Initial Fetches
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const smRes = await axios.get(`${API_BASE_URL}/users/by-role?role=Site Manager`);
        setSiteManagers(smRes.data);
        const pmRes = await axios.get(`${API_BASE_URL}/users/by-role?role=Project Manager`);
        setProjectManagers(pmRes.data);
      } catch (err) { console.error("Failed to load managers", err); }
    };
    fetchManagers();
  }, []);

  const fetchProposals = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requisitions/pending-handshake/${currentUserId}`);
      setProposals(response.data);
    } catch (err) { console.error("Error fetching proposals", err); } 
    finally { setLoading(false); }
  }, [currentUserId]);

  const fetchPipelineHistory = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/requisitions/coordinator-history/${currentUserId}`);
      setHistory(response.data);
    } catch (err) { console.error("Error loading history", err); } 
    finally { setLoading(false); }
  }, [currentUserId]);

  useEffect(() => { 
    let isMounted = true;
    if (activeTab === 'proposals') setTimeout(() => { if (isMounted) fetchProposals(); }, 0);
    return () => { isMounted = false; };
  }, [activeTab, fetchProposals]); 

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'history') setTimeout(() => { if (isMounted) fetchPipelineHistory(); }, 0);
    return () => { isMounted = false; };
  }, [activeTab, fetchPipelineHistory]); 

  // Proposal Handlers
  const openProposal = async (ticket) => {
    setSelectedProposal(ticket);
    setCoordinatorRemarks('');
    setAlert(null);
    try {
      const itemRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setProposalItems(itemRes.data);
      const histRes = await axios.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/history`);
      setHistoryLogs(histRes.data);
    } catch (err) { console.error(err); }
  };

  const handleProposalCellChange = (index, field, value) => {
    const updated = [...proposalItems];
    updated[index][field] = value;
    setProposalItems(updated);
  };
  const addProposalRow = () => setProposalItems([...proposalItems, { item_index: proposalItems.length + 1, product_description: '', make_brand: '', quantity: 1, purpose: '', item_type: 'Consumable' }]);
  const removeProposalRow = (index) => setProposalItems(proposalItems.filter((_, i) => i !== index).map((item, idx) => ({ ...item, item_index: idx + 1 })));

  const handleCounterPush = async () => {
    if (!coordinatorRemarks) return setAlert({ type: 'error', message: "Provide notes before sending counter-edits." });
    setLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/requisitions/${selectedProposal.ticket_number}/propose-edits`, {
        user_name: currentUserName, user_role: currentUserRole, remarks: coordinatorRemarks, items: proposalItems
      });
      setAlert({ type: 'success', message: "Counter-edits dispatched. Returned to Manager's inbox." });
      setSelectedProposal(null);
      fetchProposals();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFinalSignOff = async () => {
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/requisitions/${selectedProposal.ticket_number}/approve`, {
        user_name: currentUserName, user_role: currentUserRole, items: proposalItems
      });
      setAlert({ type: 'success', message: res.data.status === "Pending Sourcing" ? "Dual-Agreement Locked! Dispatched to Procurement." : "Signature applied successfully!" });
      setSelectedProposal(null);
      fetchProposals();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // New Request Handlers
  const addRow = () => setItems([...items, { product_description: '', make_brand: '', quantity: 1, purpose: '', item_type: 'Consumable' }]);
  const removeRow = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectManagerId) return setAlert({ type: 'error', message: 'You must assign a Project Manager.' });
    setLoading(true); setAlert(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/requisitions`, {
        project_code: projectCode, 
        project_name: projectName, 
        coordinator_id: currentUserId,
        category: category,
        assigned_site_manager_id: siteManagerId ? siteManagerId : null,
        assigned_project_manager_id: projectManagerId ? projectManagerId : null,
        items: items.map(item => ({ ...item, quantity: parseInt(item.quantity) || 1 }))
      });
      setAlert({ type: 'success', message: `Ticket ${response.data.ticket_number} launched into routing matrix.` });
      setProjectCode(''); setProjectName(''); setCategory('GOODS'); setSiteManagerId(''); setProjectManagerId('');
      setItems([{ product_description: '', make_brand: '', quantity: 1, purpose: '', item_type: 'Consumable' }]);
    } catch (error) { setAlert({ type: 'error', message: 'Failed to submit requisition.' }); } 
    finally { setLoading(false); }
  };

  // 🎯 GRN SUBMIT HANDLER
  const submitGrn = async () => {
    if (receiptType === 'DISCREPANCY' && !grnRemarks.trim()) {
      setAlert({ type: 'error', message: "Please describe the defect/issue in the remarks box before raising a ticket." });
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('receipt_type', receiptType);
    formData.append('discrepancy_category', discrepancyCategory);
    formData.append('remarks', grnRemarks);
    formData.append('user_name', currentUserName);
    if (grnFile) formData.append('file', grnFile);

    try {
      await axios.put(`${API_BASE_URL}/requisitions/${grnModalTicket.ticket_number}/grn`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const successMsg = receiptType === 'CLEAN' 
        ? `GRN logged successfully! Order ${grnModalTicket.ticket_number} officially closed.` 
        : receiptType === 'PARTIAL'
        ? `Partial Delivery recorded for ${grnModalTicket.ticket_number}. Ticket remains active.`
        : `CRITICAL ALERT: Discrepancy ticket raised for ${grnModalTicket.ticket_number}. Routed to Sourcing Team.`;

      setAlert({ type: receiptType === 'DISCREPANCY' ? 'error' : 'success', message: successMsg });
      setGrnModalTicket(null); setGrnFile(null); setGrnRemarks(''); setReceiptType('CLEAN');
      fetchPipelineHistory(); 
    } catch (err) { setAlert({ type: 'error', message: 'Failed to submit GRN/Discrepancy report.' }); } 
    finally { setLoading(false); }
  };

 // 🎯 5-STEP STATUS MAP
  const getStepStatus = (currentStatus, stepIndex) => {
    const statusMap = {
      'Vetting Active': 1, 'Awaiting Coordinator Sign-Off': 1, 'Approved by Manager': 1, 'Approved by Coordinator': 1, 'Pending PM Vetting': 1, 
      'Pending Sourcing': 2,
      'Pending Purchase Approval': 3, 'Pending Project Manager': 3, 'Pending Director': 3, 'Query Raised': 3,
      'Awaiting Digital Signature': 4, 'Approved': 4, 'PI Pending PM Approval': 4, 'PI Approved - Sent to Accounts': 4, 
      'Partially Disbursed': 5, 'Dispatched': 5, 'Partially Delivered': 5, 'Material Discrepancy Raised': 5, // 🎯 Added 'Partially Disbursed' here
      'Delivered - GRN Logged': 6 
    };
    const currentStep = statusMap[currentStatus] || 1;
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="space-y-6 relative pb-10 sm:px-2 md:px-4">
      
      {/* HEADER ACTIONS BAR (Responsive) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#2c2a57] tracking-tight">Site Coordinator Workspace</h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Raise, evaluate, and coordinate project material pipelines</p>
        </div>
        <div className="w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
          <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-max min-w-full">
            <Button variant={activeTab === 'new_request' ? 'primary' : 'ghost'} onClick={() => setActiveTab('new_request')} className="text-[11px] md:text-xs py-2 px-3 whitespace-nowrap flex-1">New Request</Button>
            <Button variant={activeTab === 'proposals' ? 'primary' : 'ghost'} onClick={() => setActiveTab('proposals')} className="text-[11px] md:text-xs py-2 px-3 whitespace-nowrap flex-1">Needs Review ({proposals.length})</Button>
            <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} onClick={() => setActiveTab('history')} className="text-[11px] md:text-xs py-2 px-3 whitespace-nowrap flex-1">Pipeline Tracker</Button>
          </div>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border shadow-sm ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckCircle2 size={18} className="flex-shrink-0" /> <span className="font-semibold text-xs md:text-sm">{alert.message}</span>
        </div>
      )}

      {/* VIEW A: NEW REQUEST FORM SUBMISSION CONTAINER */}
      {activeTab === 'new_request' && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl animate-in fade-in duration-300">
          <Card className="p-4 md:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Project Code" required value={projectCode} onChange={e => setProjectCode(e.target.value)} placeholder="e.g. REL-JAM-04" />
              <Input label="Project Name " required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Jamnagar Plant Block C" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Procurement Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-[#2c2a57] focus:bg-white focus:border-[#2c2a57] outline-none transition-all">
                  <option value="GOODS">Standard Goods & Materials</option>
                  <option value="VEHICLE">Vehicle & Transport Rental</option>
                  <option value="ACCOMMODATION">Guest House & Accommodation</option>
                  <option value="FOOD">Food & Canteen Services</option>
                </select>
              </div>
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Site Manager</label>
                <select value={siteManagerId} onChange={e => setSiteManagerId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all">
                  <option value="">-- None (Route Direct to PM) --</option>
                  {siteManagers.map(sm => <option key={sm.id} value={sm.id}>{sm.name} ({sm.empcode})</option>)}
                </select>
              </div>
              <div className="flex flex-col space-y-1.5 sm:col-span-2 md:col-span-1">
                <label className="text-[10px] md:text-[11px] font-bold text-slate-700 uppercase tracking-wider">Project Manager</label>
                <select required value={projectManagerId} onChange={e => setProjectManagerId(e.target.value)} className="w-full bg-rose-50/30 border border-rose-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 focus:bg-white focus:border-rose-400 outline-none transition-all">
                  <option value="">-- Select Project Manager --</option>
                  {projectManagers.map(pm => <option key={pm.id} value={pm.id}>{pm.name} ({pm.empcode})</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
              <FileSpreadsheet className="text-[#0b9c54]" size={18} />
              <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Material Requirements</h2>
            </div>
            
            {/* 🎯 Horizontal Scroll wrapper for mobile data entry */}
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="text-[10px] md:text-xs uppercase tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-100">
                    <th className="py-3 w-10 text-center font-bold">#</th>
                    <th className="py-3 px-3 font-bold w-[25%]">Requirement Description</th>
                    <th className="py-3 px-3 font-bold w-[20%]">Specification/Brand</th>
                    <th className="py-3 px-3 font-bold text-center w-[12%]">Quantity</th>
                    <th className="py-3 px-3 font-bold w-[18%]">Material Type</th>
                    <th className="py-3 px-3 font-bold w-[20%]">Technical Justification (Optional)</th>
                    <th className="py-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/40">
                      <td className="py-3 text-center text-xs font-mono font-bold text-slate-400">{index + 1}</td>
                      <td className="py-2 px-2"><input required value={item.product_description} onChange={e => handleItemChange(index, 'product_description', e.target.value)} placeholder="Description..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                      <td className="py-2 px-2"><input value={item.make_brand} onChange={e => handleItemChange(index, 'make_brand', e.target.value)} placeholder="Tata, Finolex..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                      <td className="py-2 px-2"><input type="number" min="1" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs md:text-sm font-bold text-center text-slate-800 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                      <td className="py-2 px-2">
                        <select value={item.item_type || 'Consumable'} onChange={e => handleItemChange(index, 'item_type', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs md:text-sm font-semibold text-slate-700 focus:bg-white focus:border-[#2c2a57] outline-none cursor-pointer">
                          <option value="Consumable">📦 Consumable</option>
                          <option value="Asset">🖥️ Asset</option>
                        </select>
                      </td>
                      <td className="py-2 px-2"><input value={item.purpose} onChange={e => handleItemChange(index, 'purpose', e.target.value)} placeholder="Site use case..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                      <td className="py-2 text-center">
                        <button type="button" onClick={() => removeRow(index)} disabled={items.length === 1} className="text-slate-400 hover:text-rose-600 disabled:opacity-20 p-2"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <Button type="button" variant="secondary" onClick={addRow} className="w-full sm:w-auto text-xs py-2.5"><Plus size={14} /> <span>Add Row Item</span></Button>
              <Button type="submit" variant="success" disabled={loading} className="w-full sm:w-auto text-xs py-2.5 shadow-sm"><Send size={14} /> <span>Submit Matrix</span></Button>
            </div>
          </Card>
        </form>
      )}

      {/* VIEW B: MANAGER PROPOSALS & INTERACTIVE CELL NEGOTIATIONS */}
      {activeTab === 'proposals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1500px] animate-in fade-in duration-300">
          
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">
            <h2 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pending Field Sign-Off</h2>
            {proposals.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 text-sm bg-white">No adjustments requiring site handshake reconciliation.</Card>
            ) : (
              <div className="flex flex-col gap-3">
                {proposals.map(p => (
                  <div key={p.ticket_number} onClick={() => openProposal(p)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProposal?.ticket_number === p.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[#2c2a57] font-black text-xs md:text-sm">{p.ticket_number}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-[11px] md:text-xs font-semibold text-slate-600 line-clamp-2">{p.project_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="lg:col-span-8 xl:col-span-9">
            {selectedProposal ? (
              <div className="space-y-6">
                <Card className="overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
                    <AlertTriangle className="text-amber-500 shrink-0" size={16} />
                    <span className="font-bold text-[#2c2a57] text-xs md:text-sm uppercase tracking-wider line-clamp-1">Active Worksheet Modification Counter</span>
                  </div>
                  
                  {/* 🎯 Horizontal Scroll for Proposal Editor */}
                  <div className="overflow-x-auto p-2 custom-scrollbar">
                    <table className="w-full text-left min-w-[850px]">
                      <thead>
                        <tr className="text-[10px] md:text-[11px] text-slate-400 border-b border-slate-100 uppercase font-bold tracking-wider bg-slate-50/50">
                          <th className="py-2.5 w-10 text-center">Row</th>
                          <th className="py-2.5 px-2">Material Specification</th>
                          <th className="py-2.5 px-2 w-[15%]">Brand</th>
                          <th className="py-2.5 px-2 w-[10%] text-center">Quantity</th>
                          <th className="py-2.5 px-2 w-[15%] text-center">Type</th>
                          <th className="py-2.5 px-2 w-[25%]">Purpose Justification</th>
                          <th className="py-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {proposalItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            <td className="py-2 text-center font-mono text-[10px] md:text-xs text-slate-400 font-bold">{item.item_index}</td>
                            <td className="py-1 px-1"><input type="text" value={item.product_description} onChange={(e) => handleProposalCellChange(idx, 'product_description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px] md:text-xs text-slate-800 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.make_brand || ''} onChange={(e) => handleProposalCellChange(idx, 'make_brand', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px] md:text-xs text-slate-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="number" value={item.quantity} onChange={(e) => handleProposalCellChange(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-[11px] md:text-xs font-bold text-amber-700 focus:bg-white focus:border-[#2c2a57] outline-none py-1.5" /></td>
                            <td className="py-1 px-1">
                              <select value={item.item_type || 'Consumable'} onChange={(e) => handleProposalCellChange(idx, 'item_type', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1.5 text-[10px] md:text-[11px] font-semibold text-slate-700 focus:bg-white focus:border-[#2c2a57] outline-none cursor-pointer">
                                <option value="Consumable">📦 Consumable</option>
                                <option value="Asset">🖥️ Asset</option>
                              </select>
                            </td>
                            <td className="py-1 px-1"><input type="text" value={item.purpose || ''} onChange={(e) => handleProposalCellChange(idx, 'purpose', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px] md:text-xs text-slate-600 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 text-center"><button type="button" onClick={() => removeProposalRow(idx)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pt-3 px-2 pb-2">
                      <button type="button" onClick={addProposalRow} className="flex items-center text-[11px] md:text-xs text-[#0b9c54] hover:text-[#098246] font-bold uppercase tracking-wider"><Plus size={14} className="mr-1" /> Append Row</button>
                    </div>
                  </div>
                  
                  <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                    <Input label="Your Counter Remarks (Required for adjustments)" value={coordinatorRemarks} onChange={e => setCoordinatorRemarks(e.target.value)} placeholder="Provide reasoning if adjustments or re-additions were made..." />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button variant="danger" onClick={handleCounterPush} disabled={loading} className="w-full sm:w-auto text-xs py-2.5"><MessageSquare size={14} /> <span>Propose Counter-Edits</span></Button>
                      <Button variant="success" onClick={handleFinalSignOff} disabled={loading} className="w-full sm:w-auto text-xs py-2.5"><Check size={14} /> <span>Approve & Sign-Off</span></Button>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-4 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-500 font-bold text-[10px] md:text-xs uppercase tracking-wider"><MessageSquare size={14} /><span>Negotiation Audit Ledger</span></div>
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {historyLogs.map((log, lIdx) => (
                      <div key={lIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex flex-col space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold"><span className="text-[#2c2a57]">{log.user_name}</span><span className="text-slate-400 font-mono">{log.timestamp}</span></div>
                        <p className="text-[10px] md:text-[11px] text-slate-400 font-mono italic">Action: {log.action_taken}</p>
                        {log.remarks && <p className="text-[11px] md:text-xs text-slate-700 font-medium bg-white p-2 rounded-md border border-slate-200 mt-1">{log.remarks}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center"><p>Select a worksheet item from the profile stack to initialize cell modifications.</p></div>
            )}
          </div>
        </div>
      )}

      {/* VIEW C: LIVE PIPELINE PROGRESS STEPPER TRACKER */}
      {activeTab === 'history' && (
        <div className="space-y-4 max-w-5xl animate-in fade-in duration-300">
          <div className="flex items-center space-x-2"><Clock className="text-[#0b9c54]" size={18} /><h2 className="text-xs md:text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Live Material Pipeline Tracker</h2></div>
          
          {history.length === 0 ? (
            <Card className="p-8 md:p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 bg-white rounded-xl text-xs md:text-sm">
              <p>No active downstream material requisitions found in history logs.</p>
            </Card>
          ) : (
            history.map((ticket) => (
              <Card key={ticket.ticket_number} className="p-3 md:p-4 bg-white border border-slate-200 flex flex-col space-y-4 md:space-y-5">
                
                {/* Master Info Strip */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start md:items-center bg-slate-50 p-3 rounded-xl border border-slate-100 gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[#2c2a57] font-black text-xs md:text-sm">{ticket.ticket_number}</span>
                      <span className="text-[9px] md:text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">Cost Center: {ticket.project_code}</span>
                    </div>
                    <h3 className="text-[#2c2a57] text-xs md:text-sm font-bold mt-1 line-clamp-1">{ticket.project_name}</h3>
                  </div>
                  <div className="flex sm:justify-end shrink-0">
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>

                {/* 🎯 EXPANDED 5-STEP VISUAL TRACK MATRIX (Horizontal Scroll on Mobile) */}
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="grid grid-cols-5 min-w-[550px] md:min-w-full gap-2 relative pt-2">
                    
                    {/* Step 1: Site Alignment */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 font-bold text-[10px] md:text-xs transition-all relative ${
                        getStepStatus(ticket.status, 1) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 1) === 'active' ? 'bg-indigo-50 border-indigo-400 text-indigo-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 1) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 md:h-3 md:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-indigo-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 1) === 'completed' ? <CheckCircle size={14} /> : "1"}
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 1) === 'active' ? 'text-indigo-600' : 'text-slate-600'}`}>Site Handshake</span>
                    </div>

                    {/* Step 2: Sourcing Desk */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 font-bold text-[10px] md:text-xs transition-all relative ${
                        getStepStatus(ticket.status, 2) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 2) === 'active' ? 'bg-cyan-50 border-cyan-400 text-cyan-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 2) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 md:h-3 md:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-cyan-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 2) === 'completed' ? <CheckCircle size={14} /> : "2"}
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 2) === 'active' ? 'text-cyan-600' : 'text-slate-400'}`}>Sourcing Hub</span>
                    </div>

                    {/* Step 3: Management Clearance */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 font-bold text-[10px] md:text-xs transition-all relative ${
                        getStepStatus(ticket.status, 3) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 3) === 'active' ? 'bg-amber-50 border-amber-400 text-amber-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 3) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 md:h-3 md:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-amber-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 3) === 'completed' ? <CheckCircle size={14} /> : "3"}
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 3) === 'active' ? 'text-amber-600' : 'text-slate-400'}`}>Mgmt Approval</span>
                    </div>

                    {/* Step 4: PO Compilation & Payment */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 font-bold text-[10px] md:text-xs transition-all relative ${
                        getStepStatus(ticket.status, 4) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 4) === 'active' ? 'bg-purple-50 border-purple-400 text-purple-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 4) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 md:h-3 md:w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-purple-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 4) === 'completed' ? <CheckCircle size={14} /> : <FileText size={12} />}
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 4) === 'active' ? 'text-purple-600' : 'text-slate-400'}`}>Finance & PO</span>
                    </div>

                    {/* Step 5: Material Delivery & GRN Upload */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 font-bold text-[10px] md:text-xs transition-all relative ${
                        getStepStatus(ticket.status, 5) === 'completed' ? 'bg-[#0b9c54] border-[#0b9c54] text-white' :
                        getStepStatus(ticket.status, 5) === 'active' ? (ticket.status === 'Material Discrepancy Raised' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-emerald-50 border-[#0b9c54] text-[#0b9c54]') :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {getStepStatus(ticket.status, 5) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2 md:h-3 md:w-3">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${ticket.status === 'Material Discrepancy Raised' ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 ${ticket.status === 'Material Discrepancy Raised' ? 'bg-rose-600' : 'bg-[#0b9c54]'}`}></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 5) === 'completed' ? <CheckCircle size={14} /> : ticket.status === 'Material Discrepancy Raised' ? <AlertOctagon size={12} /> : <Truck size={12} />}
                      </div>
                      <span className={`text-[9px] md:text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 5) === 'completed' ? 'text-[#0b9c54]' : ticket.status === 'Material Discrepancy Raised' ? 'text-rose-600 font-black' : getStepStatus(ticket.status, 5) === 'active' ? 'text-[#0b9c54]' : 'text-slate-400'}`}>
                        {ticket.status === 'Material Discrepancy Raised' ? 'Discrepancy' : 'GRN Logging'}
                      </span>
                    </div>

                  </div>
                </div>

                {/* 🎯 ACTION ZONE: Show Inspection & GRN Button when Dispatched or Partially Delivered */}
                {(ticket.status === 'Dispatched' || ticket.status === 'Partially Delivered') && (
                  <div className="bg-slate-50 p-3 md:p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-slate-800 font-extrabold text-xs md:text-sm flex items-center gap-1.5"><Truck size={14} className="text-indigo-600"/> Freight Arrived!</h4>
                      <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Inspect physical goods. Log GRN or Raise Defect Issue.</p>
                    </div>
                    <Button 
                      variant="primary" 
                      onClick={() => setGrnModalTicket(ticket)}
                      className="w-full sm:w-auto bg-[#0b9c54] hover:bg-emerald-600 shadow-sm text-[11px] md:text-xs py-2 md:py-2.5"
                    >
                      <UploadCloud size={14} className="mr-1.5" /> Process GRN
                    </Button>
                  </div>
                )}

                {/* 🎯 WARNING ZONE: Shown if an issue was raised */}
                {ticket.status === 'Material Discrepancy Raised' && (
                  <div className="bg-rose-50 p-3 md:p-3.5 border border-rose-200 rounded-xl flex items-start gap-3">
                    <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-[11px] md:text-xs text-rose-900">Material Defect / Shortage Flagged</h5>
                      <p className="text-[9px] md:text-[10px] text-rose-700 mt-0.5 leading-tight">An alert has been dispatched to the Purchase Executive & PM to initiate vendor replacement or credit note.</p>
                    </div>
                  </div>
                )}
                
              </Card>
            ))
          )}
        </div>
      )}

      {/* 🎯 MULTI-MODE GRN & DISCREPANCY INSPECTION MODAL */}
      {grnModalTicket && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            
            <div className="bg-[#2c2a57] p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="bg-white/20 p-1.5 rounded-lg"><Truck size={16} className="text-emerald-400" /></div>
                <h3 className="font-extrabold text-[11px] md:text-sm uppercase tracking-wider">Site Inspection & Goods Receipt</h3>
              </div>
              <button onClick={() => setGrnModalTicket(null)} className="text-slate-300 hover:text-white bg-white/10 p-1 rounded-full transition-colors"><X size={16} /></button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5 mb-1.5">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px]">Ticket:</span> 
                  <span className="font-mono text-[#2c2a57] text-[11px]">{grnModalTicket.ticket_number}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px]">Project:</span> 
                  <span className="font-bold truncate max-w-[200px] sm:max-w-[250px] text-[11px]">{grnModalTicket.project_name}</span>
                </div>
              </div>

              {/* Inspection Condition Selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Select Delivery Inspection Outcome *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  
                  <button 
                    type="button" 
                    onClick={() => setReceiptType('CLEAN')}
                    className={`p-3 rounded-xl border text-center transition-all flex sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 ${receiptType === 'CLEAN' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-3xs font-extrabold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <CheckCircle2 size={16} className={receiptType === 'CLEAN' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span className="text-[11px]">100% Perfect</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setReceiptType('PARTIAL')}
                    className={`p-3 rounded-xl border text-center transition-all flex sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 ${receiptType === 'PARTIAL' ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-3xs font-extrabold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Clock size={16} className={receiptType === 'PARTIAL' ? 'text-amber-600' : 'text-slate-400'} />
                    <span className="text-[11px]">Short Delivery</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setReceiptType('DISCREPANCY')}
                    className={`p-3 rounded-xl border text-center transition-all flex sm:flex-col items-center justify-start sm:justify-center gap-3 sm:gap-1.5 ${receiptType === 'DISCREPANCY' ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-3xs font-extrabold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    <AlertOctagon size={16} className={receiptType === 'DISCREPANCY' ? 'text-rose-600' : 'text-slate-400'} />
                    <span className="text-[11px]">Damage / Issue</span>
                  </button>

                </div>
              </div>

              {/* Dynamic Fields for Discrepancy */}
              {receiptType === 'DISCREPANCY' && (
                <div className="bg-rose-50/60 border border-rose-200 p-3 sm:p-4 rounded-xl space-y-2 animate-in fade-in duration-200">
                  <div className="space-y-1">
                    <label className="text-[9px] sm:text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block">Discrepancy Category *</label>
                    <select 
                      value={discrepancyCategory} 
                      onChange={e => setDiscrepancyCategory(e.target.value)}
                      className="w-full bg-white border border-rose-300 rounded-lg p-2 text-[11px] font-bold text-rose-900 outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="Damaged Goods">💥 Physical Goods Damaged in Transit</option>
                      <option value="Quantity Shortage">📉 Major Quantity Shortage / Missing Items</option>
                      <option value="Wrong Brand/Spec">🏷️ Wrong Brand / Non-Compliant Material</option>
                      <option value="Quality Defect">🧪 Failed Site Quality Inspection Test</option>
                    </select>
                  </div>
                  <p className="text-[9px] text-rose-700 font-medium leading-tight">Submitting this will flag the ticket in red and alert Sourcing Exec & PM to pause payment release.</p>
                </div>
              )}

              {/* Form Fields */}
              <div className="space-y-3 sm:space-y-4">
                <Input 
                  label={receiptType === 'DISCREPANCY' ? "Detailed Defect Description & Remarks *" : "Delivery Notes & Inspector Remarks"} 
                  value={grnRemarks} 
                  onChange={e => setGrnRemarks(e.target.value)} 
                  placeholder={receiptType === 'DISCREPANCY' ? "Describe exactly what is broken/missing..." : "e.g. All items verified against packing slip..."} 
                />

                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-extrabold text-indigo-800 uppercase tracking-widest flex items-center gap-1.5">
                    <UploadCloud size={14} /> {receiptType === 'DISCREPANCY' ? 'Attach Photo Proof *' : 'Attach GRN PDF/Word *'}
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={e => setGrnFile(e.target.files[0])}
                    className="w-full text-[10px] sm:text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:sm:text-[10px] file:font-bold file:uppercase file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 bg-white border border-slate-200 rounded-lg p-1 text-slate-500 cursor-pointer"
                  />
                  {grnFile && <p className="text-[9px] font-bold text-emerald-600 pt-1 flex items-center gap-1"><CheckCircle2 size={12} /> {grnFile.name} attached.</p>}
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
              <Button variant="ghost" onClick={() => setGrnModalTicket(null)} disabled={loading} className="w-full sm:w-auto px-5 text-[11px] sm:text-xs font-bold py-2.5 sm:py-2">Cancel</Button>
              <Button 
                variant="primary" 
                onClick={submitGrn} 
                disabled={loading} 
                className={`w-full sm:w-auto px-6 text-[11px] sm:text-xs font-bold shadow-sm py-2.5 sm:py-2 ${receiptType === 'DISCREPANCY' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0b9c54] hover:bg-emerald-600'}`}
              >
                {loading ? "Processing..." : receiptType === 'DISCREPANCY' ? "Raise Alert" : "Log GRN"}
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
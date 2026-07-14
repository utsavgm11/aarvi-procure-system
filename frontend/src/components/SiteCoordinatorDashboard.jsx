// src/components/SiteCoordinatorDashboard.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from 'axios'; 
import { Plus, Trash2, Send, Clock, FileSpreadsheet, CheckCircle2, MessageSquare, Check, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { Card, Input, Button, StatusBadge } from './ui/SharedUI'; 

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";
const MOCK_USER_ID = 1;
const MOCK_USER_NAME = "Amit Sharma";
const MOCK_USER_ROLE = "Site Coordinator";

// 🎯 STATIC MOCK DIRECTORY (Will be replaced by a live /users API later)
const MOCK_SITE_MANAGERS = [
  { id: '', name: '-- None (Route Direct to PM) --' },
  { id: 2, name: 'Vikram Rathore' },
  { id: 7, name: 'Rahul Desai' }
];

const MOCK_PROJECT_MANAGERS = [
  { id: '', name: '-- Select Project Manager --' },
  { id: 5, name: 'Rohan Kapoor' },
  { id: 8, name: 'Priya Singh' }
];

export default function SiteCoordinatorDashboard() {
  const [activeTab, setActiveTab] = useState('new_request'); 
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('GOODS'); 
  
  // 🎯 Routing Assignment States
  const [siteManagerId, setSiteManagerId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');

  const [items, setItems] = useState([{ product_description: '', make_brand: '', quantity: 1, purpose: '' }]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // Pipeline History
  const [history, setHistory] = useState([]);

  // Negotiation Loop States
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposalItems, setProposalItems] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [coordinatorRemarks, setCoordinatorRemarks] = useState('');

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/requisitions/pending-handshake/${MOCK_USER_ID}`);
      setProposals(response.data);
    } catch (err) { console.error("Error fetching proposals", err); } 
    finally { setLoading(false); }
  };

  const fetchPipelineHistory = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`${API_BASE_URL}/requisitions/coordinator-history/${MOCK_USER_ID}`);
      setHistory(response.data);
    } catch (err) {
      console.error("Error loading history tracker from database", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    let isMounted = true;
    if (activeTab === 'proposals') {
      setTimeout(() => { if (isMounted) fetchProposals(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === 'history') {
      setTimeout(() => { if (isMounted) fetchPipelineHistory(); }, 0);
    }
    return () => { isMounted = false; };
  }, [activeTab]);

  const openProposal = async (ticket) => {
    setSelectedProposal(ticket);
    setCoordinatorRemarks('');
    setAlert(null);
    try {
      const itemRes = await axiosInstance.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/items`);
      setProposalItems(itemRes.data);
      const histRes = await axiosInstance.get(`${API_BASE_URL}/requisitions/${ticket.ticket_number}/history`);
      setHistoryLogs(histRes.data);
    } catch (err) { console.error(err); }
  };

  const handleProposalCellChange = (index, field, value) => {
    const updated = [...proposalItems];
    updated[index][field] = value;
    setProposalItems(updated);
  };

  const addProposalRow = () => {
    setProposalItems([
      ...proposalItems, 
      { item_index: proposalItems.length + 1, product_description: '', make_brand: '', quantity: 1, purpose: '' }
    ]);
  };

  const removeProposalRow = (index) => {
    setProposalItems(proposalItems.filter((_, i) => i !== index).map((item, idx) => ({ ...item, item_index: idx + 1 })));
  };

  const handleCounterPush = async () => {
    if (!coordinatorRemarks) {
      setAlert({ type: 'error', message: "You must provide notes before sending counter-edits back to the manager." });
      return;
    }
    setLoading(true);
    try {
      await axiosInstance.put(`${API_BASE_URL}/requisitions/${selectedProposal.ticket_number}/propose-edits`, {
        user_name: MOCK_USER_NAME, user_role: MOCK_USER_ROLE, remarks: coordinatorRemarks, items: proposalItems
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
      const res = await axiosInstance.put(`${API_BASE_URL}/requisitions/${selectedProposal.ticket_number}/approve`, {
        user_name: MOCK_USER_NAME, user_role: MOCK_USER_ROLE
      });
      setAlert({ type: 'success', message: res.data.status === "Pending Sourcing" ? "Dual-Agreement Locked! Dispatched to Procurement." : "Your signature applied successfully! Waiting on Manager." });
      setSelectedProposal(null);
      fetchProposals();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addRow = () => setItems([...items, { product_description: '', make_brand: '', quantity: 1, purpose: '' }]);
  const removeRow = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectManagerId) {
      setAlert({ type: 'error', message: 'You must assign a Project Manager for this pipeline.' });
      return;
    }

    setLoading(true); setAlert(null);
    try {
      const response = await axiosInstance.post(`${API_BASE_URL}/requisitions`, {
        project_code: projectCode, 
        project_name: projectName, 
        coordinator_id: MOCK_USER_ID,
        category: category,
        assigned_site_manager_id: siteManagerId ? parseInt(siteManagerId) : null,
        assigned_project_manager_id: parseInt(projectManagerId),
        items: items.map(item => ({ ...item, quantity: parseInt(item.quantity) || 1 }))
      });
      
      setAlert({ type: 'success', message: `Ticket ${response.data.ticket_number} launched into routing matrix.` });
      
      setProjectCode(''); 
      setProjectName(''); 
      setCategory('GOODS');
      setSiteManagerId('');
      setProjectManagerId('');
      setItems([{ product_description: '', make_brand: '', quantity: 1, purpose: '' }]);
    } catch (error) { setAlert({ type: 'error', message: 'Failed to submit requisition.' }); } 
    finally { setLoading(false); }
  };

  // 🎯 FIXED & STREAMLINED STATUS MAP
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
      'Approved': 5                    // 🟢 Step 4 Completed (Fully complete!)
    };

    const currentStep = statusMap[currentStatus] || 1;
    if (currentStep > stepIndex) return 'completed';
    if (currentStep === stepIndex) return 'active';
    return 'upcoming';
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ACTIONS BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight">Site Coordinator Workspace</h1>
          <p className="text-sm text-slate-500 font-medium">Raise, evaluate, and coordinate project material pipelines</p>
        </div>
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto overflow-x-auto">
          <Button variant={activeTab === 'new_request' ? 'primary' : 'ghost'} onClick={() => setActiveTab('new_request')} className="text-xs py-1.5 flex-1 md:flex-none whitespace-nowrap">New Request</Button>
          <Button variant={activeTab === 'proposals' ? 'primary' : 'ghost'} onClick={() => setActiveTab('proposals')} className="text-xs py-1.5 flex-1 md:flex-none whitespace-nowrap">Needs Review ({proposals.length})</Button>
          <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} onClick={() => setActiveTab('history')} className="text-xs py-1.5 flex-1 md:flex-none whitespace-nowrap">Pipeline Tracker</Button>
        </div>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          <CheckCircle2 size={18} className="flex-shrink-0" /> <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {/* VIEW A: NEW REQUEST FORM SUBMISSION CONTAINER */}
      {activeTab === 'new_request' && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-6xl">
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Project Cost Center Code" required value={projectCode} onChange={e => setProjectCode(e.target.value)} placeholder="e.g. REL-JAM-04" />
              <Input label="Project / Site Name Description" required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Jamnagar Plant Block C" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Procurement Category</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-[#2c2a57] focus:bg-white focus:border-[#2c2a57] outline-none transition-all"
                >
                  <option value="GOODS">Standard Goods & Materials</option>
                  <option value="VEHICLE">Vehicle & Transport Rental</option>
                  <option value="ACCOMMODATION">Guest House & Accommodation</option>
                  <option value="FOOD">Food & Canteen Services</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Site Manager (Vetting)</label>
                <select 
                  value={siteManagerId} 
                  onChange={e => setSiteManagerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all"
                >
                  {MOCK_SITE_MANAGERS.map(sm => (
                    <option key={sm.id} value={sm.id}>{sm.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Project Manager (Required)</label>
                <select 
                  required
                  value={projectManagerId} 
                  onChange={e => setProjectManagerId(e.target.value)}
                  className="w-full bg-rose-50/30 border border-rose-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:bg-white focus:border-rose-400 outline-none transition-all"
                >
                  {MOCK_PROJECT_MANAGERS.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
              <FileSpreadsheet className="text-[#0b9c54]" size={18} />
              <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Requirement Allocation Grid</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-100">
                    <th className="py-3 w-12 text-center font-bold">#</th>
                    <th className="py-3 px-3 font-bold">Requirement Description</th>
                    <th className="py-3 px-3 w-48 font-bold">Preferred Specification</th>
                    <th className="py-3 px-3 w-24 font-bold text-center">Quantity</th>
                    <th className="py-3 px-3 font-bold">Technical Justification</th>
                    <th className="py-3 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/40">
                      <td className="py-3 text-center text-sm font-mono font-bold text-slate-400">{index + 1}</td>
                      <td className="py-2 px-2"><input required value={item.product_description} onChange={e => handleItemChange(index, 'product_description', e.target.value)} placeholder="Enter details..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] outline-none transition-all" /></td>
                      <td className="py-2 px-2"><input value={item.make_brand} onChange={e => handleItemChange(index, 'make_brand', e.target.value)} placeholder="e.g. Tata, Finolex" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] outline-none transition-all" /></td>
                      <td className="py-2 px-2"><input type="number" min="1" required value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-center text-slate-800 focus:bg-white focus:border-[#2c2a57] outline-none transition-all" /></td>
                      <td className="py-2 px-2"><input required value={item.purpose} onChange={e => handleItemChange(index, 'purpose', e.target.value)} placeholder="Specify use case details..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] outline-none transition-all" /></td>
                      <td className="py-2 text-center">
                        <button type="button" onClick={() => removeRow(index)} disabled={items.length === 1} className="text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <Button type="button" variant="secondary" onClick={addRow} className="w-full sm:w-auto text-xs py-2"><Plus size={14} /> <span>Add Row Item</span></Button>
              <Button type="submit" variant="success" disabled={loading} className="w-full sm:w-auto text-xs py-2 shadow-sm"><Send size={14} /> <span>Submit to Routing Engine</span></Button>
            </div>
          </Card>
        </form>
      )}

      {/* VIEW B: MANAGER PROPOSALS & INTERACTIVE CELL NEGOTIATIONS */}
      {activeTab === 'proposals' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1500px]">
          <div className="xl:col-span-4 space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pending Field Sign-Off</h2>
            {proposals.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 border-dashed border-2 text-sm bg-white">No adjustments requiring site handshake reconciliation.</Card>
            ) : (
              proposals.map(p => (
                <div key={p.ticket_number} onClick={() => openProposal(p)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProposal?.ticket_number === p.ticket_number ? 'bg-indigo-50/40 border-[#2c2a57] shadow-xs' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex justify-between items-center mb-2"><span className="font-mono text-[#2c2a57] font-black text-sm">{p.ticket_number}</span><StatusBadge status={p.status} /></div>
                  <p className="text-xs font-semibold text-slate-600 truncate">{p.project_name}</p>
                </div>
              ))
            )}
          </div>

          <div className="xl:col-span-8">
            {selectedProposal ? (
              <div className="space-y-6">
                <Card>
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-2">
                    <AlertTriangle className="text-amber-500" size={16} />
                    <span className="font-bold text-[#2c2a57] text-sm uppercase tracking-wider">Active Worksheet Modification Counter</span>
                  </div>

                  <div className="overflow-x-auto p-2">
                    <table className="w-full text-left min-w-[700px]">
                      <thead>
                        <tr className="text-[11px] text-slate-400 border-b border-slate-100 uppercase font-bold tracking-wider bg-slate-50/50">
                          <th className="py-2.5 w-12 text-center">Row</th>
                          <th className="py-2.5 px-2">Material Specification</th>
                          <th className="py-2.5 px-2 w-32">Brand</th>
                          <th className="py-2.5 px-2 w-24 text-center">Quantity</th>
                          <th className="py-2.5 px-2">Purpose Justification</th>
                          <th className="py-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {proposalItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/30">
                            <td className="py-2 text-center font-mono text-xs text-slate-400 font-bold">{item.item_index}</td>
                            <td className="py-1 px-1"><input type="text" value={item.product_description} onChange={(e) => handleProposalCellChange(idx, 'product_description', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-800 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.make_brand || ''} onChange={(e) => handleProposalCellChange(idx, 'make_brand', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="number" value={item.quantity} onChange={(e) => handleProposalCellChange(idx, 'quantity', parseInt(e.target.value) || 1)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold text-amber-700 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 px-1"><input type="text" value={item.purpose || ''} onChange={(e) => handleProposalCellChange(idx, 'purpose', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-sm text-slate-600 focus:bg-white focus:border-[#2c2a57] outline-none" /></td>
                            <td className="py-1 text-center"><button type="button" onClick={() => removeProposalRow(idx)} className="text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pt-3 px-2 pb-2">
                      <button type="button" onClick={addProposalRow} className="flex items-center text-xs text-[#0b9c54] hover:text-[#098246] font-bold uppercase tracking-wider"><Plus size={14} className="mr-1" /> Append Row</button>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
                    <Input label="Your Counter Remarks (Required to push adjustments)" value={coordinatorRemarks} onChange={e => setCoordinatorRemarks(e.target.value)} placeholder="Provide reasoning if adjustments or re-additions were made..." />
                    <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
                      <Button variant="danger" onClick={handleCounterPush} disabled={loading} className="w-full sm:w-auto text-xs py-2"><MessageSquare size={14} /> <span>Propose Counter-Edits</span></Button>
                      <Button variant="success" onClick={handleFinalSignOff} disabled={loading} className="w-full sm:w-auto text-xs py-2"><Check size={14} /> <span>Approve & Sign-Off</span></Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 space-y-4">
                  <div className="flex items-center space-x-2 text-slate-500 font-bold text-xs uppercase tracking-wider"><MessageSquare size={14} /><span>Negotiation Audit Ledger</span></div>
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
              <div className="h-64 border border-dashed border-slate-300 rounded-xl bg-white flex flex-col items-center justify-center text-slate-400 text-sm"><p>Select a worksheet item from the profile stack to initialize cell modifications.</p></div>
            )}
          </div>
        </div>
      )}

      {/* VIEW C: LIVE PIPELINE PROGRESS STEPPER TRACKER */}
      {activeTab === 'history' && (
        <div className="space-y-4 max-w-5xl">
          <div className="flex items-center space-x-2"><Clock className="text-[#0b9c54]" size={18} /><h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Live Material Pipeline Tracker</h2></div>
          
          {history.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 bg-white rounded-xl">
              <p>No active downstream material requisitions found in history logs.</p>
            </Card>
          ) : (
            history.map((ticket) => (
              <Card key={ticket.ticket_number} className="p-4 bg-white border border-slate-200 flex flex-col space-y-5">
                
                {/* Master Info Strip */}
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

                {/* VISUAL STEPPER TRACK MATRIX (Now Responsive & 4 Steps) */}
                <div className="overflow-x-auto custom-scrollbar pb-2">
                  <div className="grid grid-cols-4 min-w-[500px] sm:min-w-full gap-2 relative pt-2">
                    
                    {/* Step 1: Site Alignment */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 1) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 1) === 'active' ? 'bg-indigo-50 border-indigo-400 text-indigo-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {/* PING ANIMATION DOT */}
                        {getStepStatus(ticket.status, 1) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 1) === 'completed' ? <CheckCircle size={15} /> : "1"}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 1) === 'active' ? 'text-indigo-600' : 'text-slate-600'}`}>Site Handshake</span>
                      <p className="text-[8px] text-slate-400 font-medium">Dual-Vetting</p>
                    </div>

                    {/* Step 2: Sourcing Desk */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 2) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 2) === 'active' ? 'bg-cyan-50 border-cyan-400 text-cyan-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {/* PING ANIMATION DOT */}
                        {getStepStatus(ticket.status, 2) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 2) === 'completed' ? <CheckCircle size={15} /> : "2"}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 2) === 'active' ? 'text-cyan-600' : 'text-slate-400'}`}>Sourcing Hub</span>
                      <p className="text-[8px] text-slate-400 font-medium">Sagar Bidding</p>
                    </div>

                    {/* Step 3: Management Clearance */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 3) === 'completed' ? 'bg-emerald-50 border-emerald-400 text-emerald-600' :
                        getStepStatus(ticket.status, 3) === 'active' ? 'bg-amber-50 border-amber-400 text-amber-600' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {/* PING ANIMATION DOT */}
                        {getStepStatus(ticket.status, 3) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 3) === 'completed' ? <CheckCircle size={15} /> : "3"}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 3) === 'active' ? 'text-amber-600' : 'text-slate-400'}`}>Mgmt Approval</span>
                      <p className="text-[8px] text-slate-400 font-medium">Director Signature</p>
                    </div>

                    {/* Step 4: PO Compilation (Final Step) */}
                    <div className="text-center flex flex-col items-center relative group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-all relative ${
                        getStepStatus(ticket.status, 4) === 'completed' ? 'bg-[#0b9c54] border-[#0b9c54] text-white' :
                        getStepStatus(ticket.status, 4) === 'active' ? 'bg-emerald-50 border-[#0b9c54] text-[#0b9c54]' :
                        'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        {/* PING ANIMATION DOT */}
                        {getStepStatus(ticket.status, 4) === 'active' && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0b9c54]"></span>
                          </span>
                        )}
                        {getStepStatus(ticket.status, 4) === 'completed' ? <CheckCircle size={15} /> : <FileText size={13} />}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 tracking-tight ${getStepStatus(ticket.status, 4) === 'completed' ? 'text-[#0b9c54]' : getStepStatus(ticket.status, 4) === 'active' ? 'text-[#0b9c54]' : 'text-slate-400'}`}>PO Generation</span>
                      <p className="text-[8px] text-slate-400 font-medium">Document Sealing</p>
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
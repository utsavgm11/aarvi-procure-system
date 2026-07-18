// src/components/ManagerRequestPortal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, Trash2, Send, FileSpreadsheet, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, ShoppingCart, UserCheck, Users } from 'lucide-react';
import { Card, Input, Button } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function ManagerRequestPortal({ currentUser }) {
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [category, setCategory] = useState('GOODS');
  
  // 🎯 ROUTING TOGGLES
  const [isSelfSourced, setIsSelfSourced] = useState(false); // THE DUAL-TRACK TOGGLE SWITCH
  const [approvalNeeded, setApprovalNeeded] = useState(false); // 🎯 NEW: Self-Approved vs Needs PM Approval

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // 🎯 DATA FETCHING STATES
  const [vendors, setVendors] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]); // 🎯 NEW: State to hold PMs
  const [selectedPM, setSelectedPM] = useState(''); // 🎯 NEW: State for selected PM

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        // Fetch both Vendors and Project Managers simultaneously
        const [vendorsRes, pmsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/vendors`),
          axios.get(`${API_BASE_URL}/users/by-role?role=Project Manager`)
        ]);

        if (isMounted) {
          setVendors(vendorsRes.data);
          setProjectManagers(pmsRes.data);
          // Auto-select the first PM in the list if available
          if (pmsRes.data.length > 0) {
            setSelectedPM(pmsRes.data[0].id);
          }
        }
      } catch (err) { 
        console.error("Failed to load initial setup data", err); 
      }
    };

    fetchInitialData();

    // Cleanup function prevents state updates if the component unmounts early
    return () => {
      isMounted = false;
    };
  }, []);

  // Core row item structure (Includes all fields from PurchaseExecutiveDashboard)
  const emptyRow = { 
    product_description: '', make_brand: '', quantity: 1, purpose: '', item_type: 'Consumable',
    vendor_name: '', base_total_value: '', gst_percentage: 18, net_amount_payable: 0,
    vendor_address: '', vendor_contact: '', vendor_email: '', time_of_delivery: '7 Days',
    delivery_address: '', site_contact_person: '', site_contact_phone: '', special_terms: '', 
    quality_remarks: '', file_url: ''
  };

  const [rows, setRows] = useState([{ ...emptyRow }]);

  const addRow = () => {
    setRows([...rows, { ...emptyRow }]);
  };

  const removeRow = (index) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  const handleCellChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;

    // Live auto-calculation engine for commercial values
    if (field === 'base_total_value' || field === 'gst_percentage') {
      const base = parseFloat(updatedRows[index].base_total_value) || 0;
      const gst = parseFloat(updatedRows[index].gst_percentage) || 0;
      updatedRows[index].net_amount_payable = base + (base * (gst / 100));
    }
    setRows(updatedRows);
  };

  // 🎯 STRATEGIC CONFIGURATION RESOLVER (Mapped from PurchaseExecutiveDashboard)
  const getContextualUiSettings = () => {
    switch (category) {
      case 'VEHICLE':
        return {
          amountLabel: "Monthly Rental Rate (Excl. GST)",
          addressLabel: "Vehicle Deployment Base / Site Location",
          addressPlaceholder: "e.g. Joda Mining Site Yard, Odisha...",
          contactLabel: "Site Reporting Authority / Supervisor Name",
          timeLabel: "Contract Tenure / Lock-In Duration",
          timePlaceholder: "e.g. 12 Months",
          remarksPlaceholder: "e.g. 24 hours shift, Diesel paid at actuals..."
        };
      case 'ACCOMMODATION':
        return {
          amountLabel: "Monthly Rent Pricing (Excl. GST)",
          addressLabel: "Guest House Physical Location Address",
          addressPlaceholder: "Full flat/building location coordinates...",
          contactLabel: "Aarvi Warden / Property Coordinator Person",
          timeLabel: "Vacation Notice Period Liability",
          timePlaceholder: "e.g. 30 Days Notice",
          remarksPlaceholder: "e.g. Water bills in owner scope, Electricity paid by Aarvi at actuals..."
        };
      default:
        return {
          amountLabel: "Base Total (Excl. GST)",
          addressLabel: "Exact Delivery Address",
          addressPlaceholder: "Destination store/warehouse location details...",
          contactLabel: "Site Storekeeper / Contact Name",
          timeLabel: "Lead Time / Delivery Deadline",
          timePlaceholder: "e.g. 7 Days",
          remarksPlaceholder: "e.g. F.O.R Site delivery, Staggered delivery required..."
        };
    }
  };

  const ui = getContextualUiSettings();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    // 🎯 VALIDATION: Ensure a PM is selected if Approval is needed
    if (approvalNeeded && !selectedPM) {
      setAlert({ type: 'error', message: 'You must select a Project Manager from the dropdown to route for approval.' });
      setLoading(false);
      return;
    }

    // Determine the active PM ID to send to the backend
    const activeAssignedPMId = approvalNeeded ? parseInt(selectedPM) : (currentUser?.id || 5);

    try {
      if (isSelfSourced) {
        // ⚡ PATH A: Fast-track Direct PO Pipeline execution
        // Validate that if self-sourced, vendor name and base values are filled
        for (let i = 0; i < rows.length; i++) {
          if (!rows[i].vendor_name || !rows[i].base_total_value) {
            setAlert({ type: 'error', message: `Row ${i + 1} is missing mandatory Vendor Name or Base Value.` });
            setLoading(false);
            return;
          }
        }

        const formattedItems = rows.map(r => ({
          ...r,
          quantity: parseInt(r.quantity) || 1,
          base_total_value: parseFloat(r.base_total_value) || 0,
          gst_percentage: parseFloat(r.gst_percentage) || 0,
          net_amount_payable: parseFloat(r.net_amount_payable) || 0
        }));

        const response = await axios.post(`${API_BASE_URL}/requisitions/direct-fast-track`, {
          project_code: projectCode,
          project_name: projectName,
          creator_id: currentUser?.id || 5,
          creator_name: currentUser?.name || "Manager",
          category: category,
          items: formattedItems
        });

        setAlert({ 
          type: 'success', 
          message: `Direct PO Triggered! Ticket ${response.data.ticket_number} launched. Draft contract ${response.data.po_number} is locked in the signature bin.` 
        });
      } else {
        // 🔍 PATH B: Default Sourcing Pipeline (Bypasses site coordinator, goes straight to Purchase)
        const formattedItems = rows.map(r => ({
          product_description: r.product_description,
          make_brand: r.make_brand,
          quantity: parseInt(r.quantity) || 1,
          purpose: r.purpose,
          item_type: r.item_type
        }));

        const response = await axios.post(`${API_BASE_URL}/requisitions`, {
          project_code: projectCode,
          project_name: projectName,
          coordinator_id: currentUser?.id || 5,
          category: category,
          assigned_site_manager_id: null,
          assigned_project_manager_id: activeAssignedPMId, // 🎯 Routed to chosen PM or Self
          items: formattedItems,
          is_manager_direct_route: true 
        });

        setAlert({ 
          type: 'success', 
          message: `Sourcing Request Dispatched! Sheet ${response.data.ticket_number} sent directly to the Purchasing Desk for alternative quote gathering.` 
        });
      }

      // Reset Matrix Fields on successful completion
      setProjectCode('');
      setProjectName('');
      setCategory('GOODS');
      setRows([{ ...emptyRow }]);
    } catch (error) {
      setAlert({ type: 'error', message: 'SCM Routing gateway error. Failed to record management request transaction.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl animate-in fade-in duration-200 pb-12">
      
      {/* METADATA CONTROLLER PANEL */}
      <Card className="p-5 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-100 pb-3 gap-3">
          <div>
            <h2 className="text-sm font-black text-[#2c2a57] uppercase tracking-wider">Manager Direct Procurement Hub</h2>
            <p className="text-xs text-slate-400">Launch direct requisitions or attach pre-negotiated quotes to instantly clear budgets.</p>
          </div>
          
          {/* 🎯 THE INTERACTIVE STRATEGIC SWITCH STEP TRACKER */}
          <div 
            onClick={() => setIsSelfSourced(!isSelfSourced)}
            className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border cursor-pointer select-none transition-all shadow-sm ${
              isSelfSourced ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            {isSelfSourced ? <ToggleRight size={24} className="text-indigo-600" /> : <ToggleLeft size={24} />}
            <span className="text-xs font-bold uppercase tracking-wider">
              {isSelfSourced ? "⚡ Self-Quotation Upload (Fast-Track)" : "🔍 Let Purchase Source Bids"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Project Cost Center Code" required value={projectCode} onChange={e => setProjectCode(e.target.value)} placeholder="e.g. REL-JAM-04" />
          <Input label="Project / Site Name Description" required value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Jamnagar Plant Block C" />
        </div>
        
        {/* 🎯 3-COLUMN ROUTING CONFIGURATION ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4 mt-2">
          
          <div className="flex flex-col space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Procurement Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#2c2a57] outline-none">
              <option value="GOODS">Standard Goods & Materials</option>
              <option value="VEHICLE">Vehicle & Transport Rental</option>
              <option value="ACCOMMODATION">Guest House & Accommodation</option>
              <option value="FOOD">Food & Canteen Services</option>
            </select>
          </div>

          {/* 🎯 APPROVAL NEEDED TOGGLE */}
          <div className="flex flex-col space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approval Routing</label>
            <div 
              onClick={() => setApprovalNeeded(!approvalNeeded)}
              className={`flex items-center justify-center space-x-2.5 px-4 py-2 rounded-xl border cursor-pointer select-none transition-all shadow-sm h-[42px] ${
                approvalNeeded ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              {approvalNeeded ? <Users size={18} className="text-amber-600" /> : <UserCheck size={18} className="text-emerald-600" />}
              <span className="text-xs font-bold uppercase tracking-wider">
                {approvalNeeded ? "Needs PM Approval" : "Self-Approved"}
              </span>
            </div>
          </div>

          {/* 🎯 DYNAMIC PROJECT MANAGER DROPDOWN */}
          {approvalNeeded && (
            <div className="flex flex-col space-y-1.5 pt-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <label className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Assign to Project Manager <span className="text-rose-500">*</span></label>
              <select 
                value={selectedPM} 
                onChange={e => setSelectedPM(e.target.value)} 
                className="w-full bg-amber-50/30 border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-amber-900 outline-none focus:border-amber-400"
                required={approvalNeeded}
              >
                {projectManagers.length === 0 && <option value="">Loading PMs...</option>}
                {projectManagers.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name} ({pm.empcode})</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </Card>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 🔍 PATH B: DEFAULT SOURCING (SIMPLE TABLE) */}
      {/* ========================================================= */}
      {!isSelfSourced && (
        <Card>
          <div className="p-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
            <FileSpreadsheet className="text-[#0b9c54]" size={18} />
            <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider">Requirement Stream Matrix</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-100 font-bold">
                  <th className="py-3 w-10 text-center">#</th>
                  <th className="py-3 px-2 w-48">Description</th>
                  <th className="py-3 px-2 w-28">Brand / Make</th>
                  <th className="py-3 px-2 w-16 text-center">Qty</th>
                  <th className="py-3 px-2 w-28 text-center text-indigo-600">Material Type</th>
                  <th className="py-3 px-2">Purpose / Justification</th>
                  <th className="py-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50/40 text-xs">
                    <td className="py-3 text-center font-mono font-bold text-slate-400">{index + 1}</td>
                    <td className="py-1 px-1"><input required value={row.product_description} onChange={e => handleCellChange(index, 'product_description', e.target.value)} placeholder="Item details..." className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:bg-white" /></td>
                    <td className="py-1 px-1"><input value={row.make_brand} onChange={e => handleCellChange(index, 'make_brand', e.target.value)} placeholder="e.g. Finolex" className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none focus:bg-white" /></td>
                    <td className="py-1 px-1"><input type="number" min="1" required value={row.quantity} onChange={e => handleCellChange(index, 'quantity', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded text-center py-1.5 font-bold outline-none focus:bg-white" /></td>
                    <td className="py-1 px-1">
                      <select value={row.item_type} onChange={e => handleCellChange(index, 'item_type', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-1.5 font-semibold text-slate-700 outline-none cursor-pointer focus:bg-white">
                        <option value="Consumable">📦 Consumable</option>
                        <option value="Asset">🖥️ Asset</option>
                      </select>
                    </td>
                    <td className="py-1 px-1"><input required value={row.purpose} onChange={e => handleCellChange(index, 'purpose', e.target.value)} placeholder="Specify justification..." className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 outline-none italic focus:bg-white" /></td>
                    <td className="py-1 text-center">
                      <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1} className="text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <Button type="button" variant="secondary" onClick={addRow} className="w-full sm:w-auto text-xs py-2"><Plus size={14} /> <span>Add Row Item</span></Button>
            <Button type="submit" variant="success" disabled={loading} className="w-full sm:w-auto text-xs py-2 shadow-sm">
              <Send size={14} /> <span>Dispatch for Bid Collection</span>
            </Button>
          </div>
        </Card>
      )}

      {/* ========================================================= */}
      {/* ⚡ PATH A: SELF-SOURCED DIRECT PO (ADVANCED CARDS) */}
      {/* ========================================================= */}
      {isSelfSourced && (
        <div className="space-y-6">
          <Card className="p-4 bg-indigo-50/50 border-indigo-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-900/10 p-2 rounded-lg text-indigo-700"><ShoppingCart size={18} /></div>
              <div>
                <h2 className="font-bold text-indigo-900 text-sm uppercase tracking-wider">Fast-Track Pricing & Quotation Matrix</h2>
                <p className="text-xs text-indigo-600/70 font-medium mt-0.5">Attach final negotiated vendor rates to skip standard routing</p>
              </div>
            </div>
            <Button type="submit" variant="success" disabled={loading} className="text-xs py-2 shadow-sm w-full sm:w-auto">
              <Send size={14} /> <span>Instantly Generate & Issue PO</span>
            </Button>
          </Card>

          {rows.map((row, index) => (
            <Card key={index} className="overflow-hidden border-slate-200 shadow-xs relative">
              <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors"><Trash2 size={16} /></button>
              
              {/* UPPER SECTION: MATERIAL DETAILS */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 pr-12">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="bg-[#2c2a57] text-white text-[10px] font-black px-2 py-0.5 rounded font-mono">Row {index + 1}</span>
                  
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-2 bg-slate-100 border-r border-slate-200 py-1">Qty</span>
                    <input type="number" min="1" required value={row.quantity} onChange={e => handleCellChange(index, 'quantity', e.target.value)} className="w-16 text-center text-xs font-bold text-[#0b9c54] py-1 outline-none" />
                  </div>

                  <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase px-2 bg-slate-100 border-r border-slate-200 py-1">Type</span>
                    <select value={row.item_type} onChange={e => handleCellChange(index, 'item_type', e.target.value)} className="text-xs font-bold text-slate-700 px-2 py-1 outline-none cursor-pointer w-32">
                      <option value="Consumable">📦 Consumable</option>
                      <option value="Asset">🖥️ Asset</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="col-span-1 md:col-span-2">
                    <input required value={row.product_description} onChange={e => handleCellChange(index, 'product_description', e.target.value)} placeholder="Detailed Material/Service Specification..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-400" />
                  </div>
                  <div className="col-span-1">
                    <input value={row.make_brand} onChange={e => handleCellChange(index, 'make_brand', e.target.value)} placeholder="Brand / Make (Optional)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400" />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <input required value={row.purpose} onChange={e => handleCellChange(index, 'purpose', e.target.value)} placeholder="Technical Justification / Purpose..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 italic outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>

              {/* LOWER SECTION: VENDOR & COMMERCIAL DETAILS */}
              <div className="p-4 bg-white space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Final Negotiated Quotation Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Company Name <span className="text-rose-500">*</span></label>
                    <input 
                      list={`direct-vendor-list-${index}`}
                      type="text" 
                      required
                      value={row.vendor_name} 
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        handleCellChange(index, 'vendor_name', selectedName);
                        
                        // 🎯 THE AUTO-FILL ENGINE
                        const matchedVendor = vendors.find(v => v.name === selectedName);
                        if (matchedVendor) {
                          handleCellChange(index, 'vendor_address', matchedVendor.address || '');
                          handleCellChange(index, 'vendor_contact', matchedVendor.contact_number || '');
                          handleCellChange(index, 'vendor_email', matchedVendor.email || '');
                        }
                      }} 
                      placeholder="Type to search or enter new..." 
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold" 
                    />
                    <datalist id={`direct-vendor-list-${index}`}>
                      {vendors.map(v => (
                        <option key={v.id} value={v.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Office Address</label>
                    <input type="text" value={row.vendor_address} onChange={(e) => handleCellChange(index, 'vendor_address', e.target.value)} placeholder="Full operating address..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Phone/Cell</label>
                    <input type="text" value={row.vendor_contact} onChange={(e) => handleCellChange(index, 'vendor_contact', e.target.value)} placeholder="+91-987..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">Vendor Email ID</label>
                    <input type="text" value={row.vendor_email} onChange={(e) => handleCellChange(index, 'vendor_email', e.target.value)} placeholder="sales@vendor.com" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">{ui.amountLabel} <span className="text-rose-500">*</span></label>
                    <input type="number" required value={row.base_total_value} onChange={(e) => handleCellChange(index, 'base_total_value', e.target.value)} placeholder="0.00" className="w-full bg-amber-50/50 border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:bg-white text-amber-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#2c2a57] uppercase mb-1">GST Percentage (%)</label>
                    <input type="number" value={row.gst_percentage} onChange={(e) => handleCellChange(index, 'gst_percentage', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-dashed border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-[#0b9c54] uppercase mb-1">{ui.addressLabel}</label>
                    <input type="text" value={row.delivery_address} onChange={(e) => handleCellChange(index, 'delivery_address', e.target.value)} placeholder={ui.addressPlaceholder} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#0b9c54] uppercase mb-1">{ui.contactLabel}</label>
                    <input type="text" value={row.site_contact_person} onChange={(e) => handleCellChange(index, 'site_contact_person', e.target.value)} placeholder="Personnel reference name..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#0b9c54] uppercase mb-1">Contact Phone Number</label>
                    <input type="text" value={row.site_contact_phone} onChange={(e) => handleCellChange(index, 'site_contact_phone', e.target.value)} placeholder="+91-886..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{ui.timeLabel}</label>
                    <input type="text" value={row.time_of_delivery} onChange={(e) => handleCellChange(index, 'time_of_delivery', e.target.value)} placeholder={ui.timePlaceholder} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Calculated Net Value (Incl. GST)</label>
                    <div className="w-full bg-slate-100 text-slate-800 rounded-lg px-3 py-2 text-xs font-black border border-slate-200">
                      ₹{(row.net_amount_payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Contract / Service Custom Clauses</label>
                    <input type="text" value={row.special_terms} onChange={(e) => handleCellChange(index, 'special_terms', e.target.value)} placeholder={ui.remarksPlaceholder} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-amber-600 uppercase mb-1">Quality / Technical Remarks</label>
                    <input type="text" value={row.quality_remarks || ''} onChange={(e) => handleCellChange(index, 'quality_remarks', e.target.value)} placeholder="e.g. OEM 1-yr warranty active..." className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:bg-white" />
                  </div>
                </div>

                {/* 🎯 EXACT PDF UPLOADER REPLICATED FROM PURCHASE DASHBOARD */}
                <div className="grid grid-cols-1 gap-3 pt-3 border-t border-dashed border-slate-200 mt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">
                      Attach Pre-Negotiated Quotation Document (Optional)
                    </label>
                    <div className="flex items-center space-x-3 bg-slate-50 p-2 border border-slate-300 rounded-lg">
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx"
                        className="text-xs font-medium text-slate-600 outline-none file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-800 hover:file:bg-indigo-200 cursor-pointer w-full"
                        onChange={async (e) => {
                          const selectedFile = e.target.files[0];
                          if (!selectedFile) return;

                          const formData = new FormData();
                          formData.append("file", selectedFile);

                          try {
                            setAlert({ type: 'success', message: `Uploading document...` });
                            // Passing projectCode or 'DIRECT' as fallback since ticket_number isn't generated yet
                            const safeCode = projectCode || "DIRECT";
                            const res = await axios.post(
                              `${API_BASE_URL}/upload/quotation?ticket_number=${safeCode}&item_index=${index + 1}&option_index=1`, 
                              formData, 
                              { headers: { 'Content-Type': 'multipart/form-data' } }
                            );
                            
                            handleCellChange(index, 'file_url', res.data.file_url);
                            setAlert({ type: 'success', message: `Document verified and attached successfully: ${selectedFile.name}` });
                          } catch (err) {
                            setAlert({ type: 'error', message: err.response?.data?.detail || "Document upload execution failure." });
                          }
                        }}
                      />
                      {row.file_url && (
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0 animate-pulse">
                          ✓ ATTACHED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
              </div>
            </Card>
          ))}
          
          <div className="flex justify-center mt-4">
            <Button type="button" variant="secondary" onClick={addRow} className="text-xs py-2 px-6 shadow-sm">
              <Plus size={14} className="mr-2" /> <span>Add Another Material/Service Card</span>
            </Button>
          </div>
        </div>
      )}
      
    </form>
  );
}
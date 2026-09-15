// src/components/VendorMasterDesk.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Building2, PlusCircle, CheckCircle2, AlertCircle, Edit, Save, X, UploadCloud, FileText, ExternalLink, Paperclip } from 'lucide-react';
import { Card, Input, Button } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function VendorMasterDesk() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // Registration Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  // 🎯 NEW: Edit Mode State
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [uploadLoading, setUploadLoading] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/vendors`);
      setVendors(res.data);
    } catch (err) { 
      console.error(err); 
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      if (isMounted) await fetchVendors();
    };
    initializeData();
    return () => { isMounted = false; };
  }, [fetchVendors]);

  // --- 1. ADD NEW VENDOR ---
  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!name) {
      setAlert({ type: 'error', message: 'Vendor Company Name is mandatory.' });
      return;
    }
    setLoading(true); setAlert(null);
    try {
      await axios.post(`${API_BASE_URL}/vendors`, { name, address, contact_number: contact, email });
      setAlert({ type: 'success', message: `${name} successfully added.` });
      setName(''); setAddress(''); setContact(''); setEmail('');
      fetchVendors(); 
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Failed to add vendor.' });
    } finally { setLoading(false); }
  };

  // --- 2. START EDITING VENDOR ---
  const startEditing = (vendor) => {
    setEditingId(vendor.id);
    setEditForm({ ...vendor });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  // --- 3. SAVE VENDOR EDITS (TEXT FIELDS) ---
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      await axios.put(`${API_BASE_URL}/vendors/${editingId}`, editForm);
      setAlert({ type: 'success', message: 'Vendor profile updated successfully.' });
      setEditingId(null);
      fetchVendors();
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update vendor.' });
    } finally {
      setLoading(false);
    }
  };

  // --- 4. UPLOAD DOCUMENT TO VAULT ---
  const handleFileUpload = async (vendorId, docType, file) => {
    if (!file) return;
    
    const formData = new FormData();
    formData.append(`${docType}_file`, file);

    setUploadLoading(true);
    try {
      await axios.put(`${API_BASE_URL}/vendors/${vendorId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAlert({ type: 'success', message: 'Document uploaded securely to Vault.' });
      fetchVendors(); // Refresh to get the new URL
    } catch (err) {
      setAlert({ type: 'error', message: `Failed to upload ${docType}.` });
    } finally {
      setUploadLoading(false);
    }
  };

  // 🎯 HELPER: Document Slot UI Component
  const DocSlot = ({ title, docKey, currentUrl, vendorId }) => {
    return (
      <div className="flex items-center justify-between bg-white p-2.5 rounded border border-slate-200 shadow-3xs">
        <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 w-1/3">
          <FileText size={12} className="text-[#2c2a57]" /> {title}
        </span>
        
        <div className="flex items-center gap-2">
          {currentUrl ? (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-emerald-700 hover:underline px-2 py-1 bg-emerald-50 rounded flex items-center gap-1">
              View Doc <ExternalLink size={10} />
            </a>
          ) : (
            <span className="text-[9px] text-slate-400 italic">Not Uploaded</span>
          )}
          
          <label className={`cursor-pointer text-[9px] font-bold px-2 py-1 rounded transition-colors flex items-center gap-1 ${uploadLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
              className="hidden" 
              disabled={uploadLoading}
              onChange={(e) => handleFileUpload(vendorId, docKey, e.target.files[0])} 
            />
            <UploadCloud size={10} /> {currentUrl ? "Replace" : "Upload"}
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight flex items-center gap-2">
          <Building2 className="text-[#0b9c54]" size={26} /> Vendor Master Directory & Document Vault
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage supplier records, tax configurations, and compliance documents.</p>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0" /> : <AlertCircle size={18} className="flex-shrink-0" />}
          <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ADD VENDOR FORM (Left Column) */}
        <div className="lg:col-span-4">
          <Card className="p-5 sticky top-6">
            <h2 className="text-sm font-bold text-[#2c2a57] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <PlusCircle size={16} className="text-[#0b9c54]" /> Register New Vendor
            </h2>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <Input label="Company Name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tata Steel Ltd" />
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Registered Office Address</label>
                <textarea 
                  value={address} onChange={e => setAddress(e.target.value)} placeholder="Full operating address..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-[#2c2a57] focus:bg-white focus:border-[#2c2a57] outline-none transition-all resize-none h-24"
                />
              </div>
              <Input label="Contact Number" value={contact} onChange={e => setContact(e.target.value)} placeholder="+91 98765..." />
              <Input label="Official Email ID" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="sales@vendor.com" />
              
              <Button type="submit" variant="success" disabled={loading} className="w-full py-2.5 shadow-sm mt-2 text-sm">
                Save to Master Directory
              </Button>
            </form>
          </Card>
        </div>

        {/* VENDOR LIST & EDIT GRID (Right Column) */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Suppliers ({vendors.length})</span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {vendors.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">Directory is empty. Register your first vendor.</div>
              ) : (
                vendors.map(v => (
                  <div key={v.id} className={`p-4 transition-colors ${editingId === v.id ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                    
                    {/* 🎯 EDIT MODE VIEW */}
                    {editingId === v.id ? (
                      <div className="space-y-5 animate-in fade-in">
                        
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <h3 className="font-extrabold text-[#2c2a57] flex items-center gap-2">
                            <Edit size={16} className="text-indigo-500"/> Edit Vendor Profile
                          </h3>
                          <div className="flex items-center gap-2">
                            <button onClick={cancelEditing} className="p-1.5 text-slate-400 hover:text-rose-500 rounded"><X size={16}/></button>
                            <button onClick={handleSaveEdit} disabled={loading} className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm">
                              <Save size={12}/> Save Text Edits
                            </button>
                          </div>
                        </div>

                        {/* Basic Info Edits */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Company Name</label>
                            <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Contact Number</label>
                            <input type="text" value={editForm.contact_number} onChange={e => setEditForm({...editForm, contact_number: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                            <input type="text" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Operating Address</label>
                            <input type="text" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-indigo-400" />
                          </div>
                        </div>

                        {/* Tax & Banking Edits */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">GSTIN Number</label>
                            <input type="text" value={editForm.gst_number || ''} onChange={e => setEditForm({...editForm, gst_number: e.target.value.toUpperCase()})} placeholder="27XXXXX..." className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-emerald-400" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">PAN Number</label>
                            <input type="text" value={editForm.pan_number || ''} onChange={e => setEditForm({...editForm, pan_number: e.target.value.toUpperCase()})} placeholder="ABCDE1234F" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-emerald-400" />
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Bank Details (A/C No & IFSC)</label>
                            <input type="text" value={editForm.bank_details || ''} onChange={e => setEditForm({...editForm, bank_details: e.target.value})} placeholder="Bank Name, A/C: XXXXX, IFSC: XXXXX" className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs outline-none focus:border-emerald-400" />
                          </div>
                        </div>

                        {/* 🎯 7-SLOT DOCUMENT VAULT */}
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Compliance Document Vault</h4>
                          <p className="text-[9px] text-slate-400 mb-2">Upload PDFs, Word Docs, or Images. Saves immediately upon selection.</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <DocSlot title="Aadhar Card" docKey="aadhar" currentUrl={v.aadhar_url} vendorId={v.id} />
                            <DocSlot title="PAN Card" docKey="pan" currentUrl={v.pan_url} vendorId={v.id} />
                            <DocSlot title="Registration / MSME" docKey="reg_cert" currentUrl={v.reg_cert_url} vendorId={v.id} />
                            <DocSlot title="GST Certificate" docKey="gst_cert" currentUrl={v.gst_cert_url} vendorId={v.id} />
                            <DocSlot title="Electricity Bill" docKey="electricity_bill" currentUrl={v.electricity_bill_url} vendorId={v.id} />
                            <DocSlot title="Cancelled Cheque" docKey="cancelled_cheque" currentUrl={v.cancelled_cheque_url} vendorId={v.id} />
                            <DocSlot title="ISO Certificate" docKey="iso_cert" currentUrl={v.iso_cert_url} vendorId={v.id} />
                          </div>
                        </div>

                      </div>
                    ) : (

                      /* 🎯 STANDARD VIEW MODE WITH EDIT BUTTON */
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-[#2c2a57] text-sm">{v.name}</h3>
                            <button onClick={() => startEditing(v)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Edit Vendor Profile & Documents">
                              <Edit size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 max-w-md line-clamp-1">{v.address || 'No address registered'}</p>
                          
                          {/* Mini Document/Tax Badges */}
                          <div className="flex items-center gap-2 mt-2 pt-2">
                            {v.gst_number ? (
                              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">GST: {v.gst_number}</span>
                            ) : (
                              <span className="text-[9px] font-mono text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">No GST</span>
                            )}
                            {v.pan_number && <span className="text-[9px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">PAN: {v.pan_number}</span>}
                            
                            {/* Doc Count Badge */}
                            {[v.aadhar_url, v.pan_url, v.reg_cert_url, v.gst_cert_url, v.electricity_bill_url, v.cancelled_cheque_url, v.iso_cert_url].filter(Boolean).length > 0 && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                                <Paperclip size={10}/> {[v.aadhar_url, v.pan_url, v.reg_cert_url, v.gst_cert_url, v.electricity_bill_url, v.cancelled_cheque_url, v.iso_cert_url].filter(Boolean).length} Docs
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-mono text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-100 shrink-0 h-min min-w-[200px]">
                          <div><span className="font-bold text-slate-400">TEL:</span> {v.contact_number || 'N/A'}</div>
                          <div><span className="font-bold text-slate-400">EML:</span> {v.email || 'N/A'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
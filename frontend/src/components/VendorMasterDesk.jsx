// src/components/VendorMasterDesk.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Building2, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Input, Button } from './ui/SharedUI';

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function VendorMasterDesk() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  // 🎯 FIX: Wrapped in useCallback to stabilize the function reference
  const fetchVendors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/vendors`);
      setVendors(res.data);
    } catch (err) { 
      console.error(err); 
    }
  }, []);

  // 🎯 FIX: Added async boundary and mounting check to satisfy ESLint
  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      if (isMounted) {
        await fetchVendors();
      }
    };
    initializeData();
    return () => { isMounted = false; };
  }, [fetchVendors]);

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!name) {
      setAlert({ type: 'error', message: 'Vendor Company Name is mandatory.' });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      await axios.post(`${API_BASE_URL}/vendors`, { name, address, contact_number: contact, email });
      setAlert({ type: 'success', message: `${name} successfully added to the Master Directory.` });
      setName(''); setAddress(''); setContact(''); setEmail('');
      fetchVendors(); // Refresh the list
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Failed to add vendor.' });
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight flex items-center gap-2">
          <Building2 className="text-[#0b9c54]" size={26} /> Vendor Master Directory
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">Manage global supplier contact records for Sourcing Hub autofill.</p>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="flex-shrink-0" /> : <AlertCircle size={18} className="flex-shrink-0" />}
          <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ADD VENDOR FORM */}
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

        {/* VENDOR LIST GRID */}
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
                  <div key={v.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-[#2c2a57]">{v.name}</h3>
                      <p className="text-xs text-slate-500 max-w-md">{v.address || 'No address registered'}</p>
                    </div>
                    <div className="text-xs font-mono text-slate-600 space-y-1 bg-white p-2 rounded-lg border border-slate-100 shrink-0 h-min">
                      <div><span className="font-bold text-slate-400">TEL:</span> {v.contact_number || 'N/A'}</div>
                      <div><span className="font-bold text-slate-400">EML:</span> {v.email || 'N/A'}</div>
                    </div>
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
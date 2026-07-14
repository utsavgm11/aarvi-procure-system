// src/components/ITAdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ShieldCheck, UserPlus, Key, Users, CheckCircle2, AlertCircle, Edit3, Trash2, X, Lock } from 'lucide-react';
import { Card, Input, Button } from './ui/SharedUI';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function ITAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Create User States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Site Coordinator');

  // Password Override Control Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(res.data);
    } catch (err) { 
      console.error("Error fetching users", err); 
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initializeData = async () => {
      if (isMounted) {
        await fetchUsers();
      }
    };
    initializeData();
    return () => { isMounted = false; };
  }, [fetchUsers]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true); setAlert(null);
    try {
      await axios.post(`${API_BASE_URL}/admin/users`, { name, email, password, role });
      setAlert({ type: 'success', message: `User ${name} provisioned as ${role}.` });
      setName(''); setEmail(''); setPassword('');
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Creation failed.' });
    } finally { setLoading(false); }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!selectedEmail) return setAlert({ type: 'error', message: 'Select a valid user email account.' });
    setLoading(true); setAlert(null);
    try {
      await axios.put(`${API_BASE_URL}/admin/users/password`, { email: selectedEmail, new_password: newPassword });
      setAlert({ type: 'success', message: `Credentials successfully updated for ${selectedEmail}.` });
      setIsModalOpen(false);
      setSelectedEmail(''); setNewPassword('');
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.detail || 'Reset operation failed.' });
    } finally { setLoading(false); }
  };

  // Visual placeholder for Delete action mapping
 // 🎯 FIXED: Fully wired to call the new backend delete routing engine
  const handleDeleteTrigger = async (userEmail, userName) => {
    if (window.confirm(`Are you completely sure you want to revoke system privileges for ${userName}?`)) {
      setLoading(true);
      setAlert(null);
      try {
        const res = await axios.delete(`${API_BASE_URL}/admin/users/${userEmail}`);
        setAlert({ type: 'success', message: res.data.message });
        fetchUsers(); // Refresh the list automatically
      } catch (err) {
        setAlert({ type: 'error', message: err.response?.data?.detail || 'Failed to delete user.' });
      } finally {
        setLoading(false);
      }
    }
  };

  const triggerEditModal = (user) => {
    setSelectedEmail(user.email);
    setNewPassword('');
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300 relative">
      
      {/* HEADER BAR */}
      <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#2c2a57] tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={26} /> IT Control Center
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Provision core operational parameters and system access levels.</p>
        </div>
      </div>

      {/* SYSTEM ALERTS */}
      {alert && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 border shadow-xs animate-in slide-in-from-top-2 duration-200 ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
          <span className="font-semibold text-sm">{alert.message}</span>
        </div>
      )}

      {/* TOP SECTION: ROW-WISE REGISTRATION WORKSPACE */}
      <Card className="p-6 border-slate-200 shadow-sm bg-white">
        <h2 className="text-xs font-bold text-[#2c2a57] uppercase tracking-widest flex items-center gap-2 mb-5 border-b border-slate-100 pb-3">
          <UserPlus size={15} className="text-[#0b9c54]" /> Register & Provision System Operator
        </h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-3">
            <Input label="Full Name" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rahul Verma" />
          </div>
          <div className="lg:col-span-3">
            <Input label="Company Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@aarviencon.com" />
          </div>
          <div className="lg:col-span-3">
            <Input label="Access Passcode" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">System Designation</label>
            <select 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-[#2c2a57] outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 h-[38px] transition-all cursor-pointer"
            >
              <option value="Site Coordinator">Site Coordinator</option>
              <option value="Site Manager">Site Manager</option>
              <option value="Purchase Executive">Purchase Executive</option>
              <option value="Project Manager">Project Manager</option>
              <option value="Director">Director</option>
              <option value="Admin">IT Admin</option>
            </select>
          </div>
          <div className="lg:col-span-1">
            <Button type="submit" variant="success" disabled={loading} className="w-full h-[38px] flex items-center justify-center font-bold text-xs uppercase tracking-wide shadow-xs">
              Save
            </Button>
          </div>
        </form>
      </Card>

      {/* BOTTOM SECTION: RESPONSIVE PERSONNEL MATRIX */}
      <Card className="overflow-hidden border-slate-200 shadow-sm bg-white">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
          <Users size={16} className="text-indigo-600" />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Identity & Access Directory ({users.length})</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50/50 border-b border-slate-200 select-none">
                <th className="py-3 px-6">Assigned System Operator</th>
                <th className="py-3 px-6">Communication Endpoint</th>
                <th className="py-3 px-6">Role Assignment</th>
                <th className="py-3 px-6 text-center w-36">Management Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-3.5 px-6 font-extrabold text-[#2c2a57]">
                    {u.name}
                  </td>
                  <td className="py-3.5 px-6 font-mono text-xs text-slate-600">
                    {u.email}
                  </td>
                  <td className="py-3.5 px-6">
                    <span className="bg-indigo-50/60 border border-indigo-100/80 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => triggerEditModal(u)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Override Target Credentials"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTrigger(u.email, u.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Revoke System Privileges"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL WINDOW: OVERRIDE PASSCODE ENGINE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200 m-4">
            <div className="bg-[#2c2a57] text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Key size={16} className="text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wider">Credential Modification Tool</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-indigo-200 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handlePasswordReset} className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selected Target Profile</p>
                <p className="text-xs font-mono font-bold text-slate-700 mt-0.5 truncate">{selectedEmail}</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">New Target Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-semibold py-2 px-4"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="danger" 
                  disabled={loading}
                  className="text-xs font-bold py-2 px-5 shadow-xs"
                >
                  Override Passcode
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
// src/components/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import aarviLogo from '../assets/logo.png'; // Ensure your logo is linked correctly

const API_BASE_URL = "http://127.0.0.1:8000/api";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const userProfile = res.data;
      
      // 🎯 "REMEMBER ME" LOGIC: Save to local storage if checked
      if (rememberMe) {
        localStorage.setItem('aarvi_session', JSON.stringify(userProfile));
      } else {
        sessionStorage.setItem('aarvi_session', JSON.stringify(userProfile));
      }

      // Pass the profile up to App.jsx to unlock the dashboard
      onLoginSuccess(userProfile);
    } catch (err) {
      setError(err.response?.data?.detail || "System connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-64 bg-[#2c2a57] rounded-b-[100px] shadow-lg"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center bg-white p-4 rounded-2xl shadow-sm w-max mx-auto mb-6">
          <img src={aarviLogo} alt="Aarvi Encon Logo" className="h-10 object-contain" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white mb-2 tracking-tight">
          Procurement Portal
        </h2>
        <p className="text-center text-indigo-100 text-sm font-medium mb-8">
          Enterprise Workflow & Supply Chain Management
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100">
          
          <div className="flex items-center space-x-2 text-[#2c2a57] font-bold border-b border-slate-100 pb-4 mb-6">
            <ShieldCheck size={20} className="text-[#0b9c54]" />
            <span>Secure System Access</span>
          </div>

          {error && (
            <div className="mb-4 bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-lg text-sm font-semibold flex items-center gap-2 animate-in fade-in zoom-in duration-200">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Company Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-[#2c2a57] focus:border-[#2c2a57] bg-slate-50 focus:bg-white transition-all outline-none"
                  placeholder="name@aarviencon.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Passcode</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-medium focus:ring-[#2c2a57] focus:border-[#2c2a57] bg-slate-50 focus:bg-white transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#0b9c54] focus:ring-[#0b9c54] border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-bold text-slate-600 cursor-pointer">
                  Remember my device
                </label>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#2c2a57] hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2c2a57] transition-all"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <span>Authorize Terminal</span>}
            </button>
          </form>

        </div>
        <p className="text-center text-xs text-slate-400 mt-6 font-medium">
          Aarvi Encon Limited © {new Date().getFullYear()}. Secure Internal Network.
        </p>
      </div>
    </div>
  );
}
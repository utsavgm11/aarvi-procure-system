// src/components/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Lock, Mail, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import aarviLogo from '../assets/logo.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

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
      
      if (rememberMe) {
        localStorage.setItem('aarvi_session', JSON.stringify(userProfile));
      } else {
        sessionStorage.setItem('aarvi_session', JSON.stringify(userProfile));
      }

      onLoginSuccess(userProfile);
    } catch (err) {
      setError(err.response?.data?.detail || "System connection failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
      
      {/* LEFT SIDE: PREMIUM VISUAL PANE (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#2c2a57] relative overflow-hidden flex-col justify-between p-12 shadow-2xl z-10">
        
        {/* Abstract Background Mesh Blurs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        {/* Top Floating Logo Group */}
        <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 w-max select-none">
          {/* 🎯 FIXED: Removed brightness-0 invert filter block so core assets render flawlessly */}
          <img src={aarviLogo} alt="Aarvi Logo" className="h-7 w-auto object-contain" />
          <div className="flex items-baseline space-x-1 border-l border-white/20 pl-3">
            <span className="text-base font-extrabold text-white tracking-tight">aarvi</span>
            <span className="text-sm font-medium text-slate-300 tracking-tight">Procure</span>
          </div>
        </div>

        {/* Core Value Proposition Copy */}
        <div className="max-w-xl space-y-4 my-auto relative z-20">
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full">
            <ShieldCheck size={12} /> <span>Military-Grade Internal Node</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.1] text-balance">
            Streamline Corporate <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Procurement Infrastructure.
            </span>
          </h1>
          <p className="text-slate-300 text-sm font-medium leading-relaxed max-w-md">
            Execute high-fidelity commercial matrices, authorize smart logistics triggers, and distribute purchase frameworks from an unified ecosystem interface.
          </p>
        </div>

        {/* Footer Technical Metadata */}
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 select-none relative z-20">
          <span>SYSTEM VER: v3.2.0-PROD</span>
          <span>GATEWAY: SSL_SECURE</span>
        </div>
      </div>

      {/* RIGHT SIDE: AUTHENTICATION INTERFACE TERMINAL */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-20 bg-white relative">
        
        {/* Subtle top banner visible only on mobile viewports */}
        <div className="lg:hidden flex items-center justify-between border-b border-slate-100 pb-4 mb-6 select-none">
          <div className="flex items-center space-x-2">
            <img src={aarviLogo} alt="Aarvi Logo" className="h-8 w-auto object-contain" />
            <span className="text-base font-black text-[#2c2a57] tracking-tight">
              aarvi<span className="font-normal text-slate-400">Procure</span>
            </span>
          </div>
          <span className="text-[9px] font-mono font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">v3.2.0</span>
        </div>

        <div className="my-auto max-w-md w-full mx-auto space-y-8">
          
          {/* Section Typography Intro */}
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Authorize Device Connection
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Provide corporate system credentials to unlock dashboard clearance.
            </p>
          </div>

          {/* Dynamic Error Boundary Card Alert */}
          {error && (
            <div className="bg-rose-50/50 border border-rose-200/60 text-rose-700 p-3.5 rounded-xl text-xs font-bold flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Interactive Credentials Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Company Endpoint Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#2c2a57] transition-colors">
                  <Mail size={16} />
                </div>
                <input
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold text-[#2c2a57] placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-[#2c2a57] focus:ring-4 focus:ring-[#2c2a57]/5 outline-none transition-all duration-150"
                  placeholder="name@aarviencon.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                System Passcode Key
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#2c2a57] transition-colors">
                  <Lock size={16} />
                </div>
                <input
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-xs font-semibold text-[#2c2a57] placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-[#2c2a57] focus:ring-4 focus:ring-[#2c2a57]/5 outline-none transition-all duration-150"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Custom Styled Tactile Switch for Remember Me Option */}
            <div className="flex items-center justify-between pt-1 select-none">
              <label className="flex items-center cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox" 
                    id="remember-me" 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${rememberMe ? 'bg-[#0b9c54]' : 'bg-slate-200'}`}></div>
                  <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full shadow-sm transition-transform duration-200 ${rememberMe ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-2.5 text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                  Remember my access status
                </span>
              </label>
            </div>

            {/* Action Dispatch Execution Button */}
            <button
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 rounded-xl shadow-md shadow-[#2c2a57]/10 text-xs font-black text-white bg-[#2c2a57] hover:bg-indigo-950 focus:outline-none focus:ring-4 focus:ring-[#2c2a57]/10 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Unlock Workspace Terminal</span>
                  <ArrowRight size={14} className="ml-1" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Universal Footer Corporate Markings */}
        <p className="text-center text-[11px] text-slate-400 font-bold tracking-tight select-none mt-12 lg:mt-0">
          Aarvi Encon Limited © {new Date().getFullYear()}. Protected Corporate Intranet Data.
        </p>
      </div>
    </div>
  );
}
// src/components/ui/SharedUI.jsx
import React from 'react';

// 1. Standardized Container Box (Sleek Corporate Light Mode)
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// 2. Standardized Smart Status Badge (Light Mode Corporate Variant)
export const StatusBadge = ({ status }) => {
  let colorClass = 'bg-slate-100 text-slate-600 border-slate-200'; // Default Gray
  let displayLabel = status;
  
  // Handshake Routing Colors
  if (status === 'Vetting Active') {
    colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200'; 
    displayLabel = 'Action: Manager Review';
  } 
  else if (status === 'Awaiting Coordinator Sign-Off') {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200'; 
    displayLabel = 'Action: Coordinator Review';
  } 
  else if (status === 'Approved by Manager') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    displayLabel = 'Manager Signed (Waiting on Coord)';
  }
  else if (status === 'Approved by Coordinator') {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    displayLabel = 'Coord Signed (Waiting on Manager)';
  }
  // Standard Routing Colors (Using Aarvi Corporate Emerald Green from logo)
  else if (status === 'Pending Sourcing' || status.includes('Dispatched') || status === 'Approved') {
    colorClass = 'bg-[#0b9c54]/10 text-[#0b9c54] border-[#0b9c54]/20';
  } 
  else if (status.includes('Query') || status.includes('Rejected')) {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${colorClass} whitespace-nowrap`}>
      {displayLabel}
    </span>
  );
};

// 3. Standardized Input Field (Clean White Backdrop & Rich Indigo Focus Ring)
export const Input = ({ label, ...props }) => (
  <div className="w-full">
    {label && (
      <label className="block text-xs font-bold text-[#2c2a57] uppercase tracking-wider mb-1.5">
        {label}
      </label>
    )}
    <input 
      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#2c2a57] focus:ring-1 focus:ring-[#2c2a57] outline-none transition-all disabled:opacity-50"
      {...props} 
    />
  </div>
);

// 4. Standardized Button (Branded around Corporate Deep Indigo)
export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#2c2a57] hover:bg-[#39376e] text-white shadow-sm", // Aarvi Deep Indigo
    secondary: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
    success: "bg-[#0b9c54] hover:bg-[#098246] text-white shadow-sm", // Aarvi Emerald Green
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
    ghost: "text-[#2c2a57] hover:bg-slate-100"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
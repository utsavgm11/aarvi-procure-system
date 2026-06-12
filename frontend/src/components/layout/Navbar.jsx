// src/components/layout/Navbar.jsx
import React from 'react';
import { Menu, Bell } from 'lucide-react';

// 🎯 IMPORTING THE LOGO ENGINES FROM YOUR NEW COMPACT ASSETS FOLDER
import aarviLogo from '../../assets/logo.png';

export default function Navbar({ toggleSidebar, userSession }) {
  return (
    <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-6 shadow-xs select-none">
      
      {/* LEFT AREA: RESPONSIVE HAMBURGER & REFINED BRANDING */}
      <div className="flex items-center space-x-3.5">
        
        {/* 📱 Hamburger Menu: Active on Mobile/Tablet, Hidden on Desktop */}
        <button 
          onClick={toggleSidebar} 
          className="text-slate-500 hover:text-[#2c2a57] hover:bg-slate-100 p-2 rounded-lg transition-colors lg:hidden focus:outline-none"
          title="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>
        
        {/* Branded Identity Core Asset Group */}
        <div className="flex items-center space-x-3">
          <img 
            src={aarviLogo} 
            alt="Aarvi Logo" 
            className="h-9 w-auto object-contain flex-shrink-0"
          />
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-extrabold tracking-tight text-[#2c2a57]">aarvi</span>
            <span className="text-lg font-medium text-slate-500 tracking-tight">Procure</span>
          </div>
        </div>
      </div>

      {/* RIGHT AREA: BADGE ALERTS & DYNAMIC PROFILE INDICATORS */}
      <div className="flex items-center space-x-4">
        
        {/* Sleek Notification Indicator Trigger Box */}
        <button className="relative text-slate-400 hover:text-[#2c2a57] p-2 rounded-lg hover:bg-slate-50 transition-all focus:outline-none">
          <Bell size={19} />
          {/* Notification Counter using Branded Aarvi Emerald Green */}
          <span className="absolute top-1.5 right-1.5 bg-[#0b9c54] text-[9px] text-white font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs">
            3
          </span>
        </button>
        
        {/* Vertical Separator Divider Line (Hidden on tiny displays) */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
        
        {/* User Workspace Status Profile Block */}
        <div className="flex items-center space-x-3">
          
          {/* 👥 Dynamic Profile Avatar Circle: Displays First 2 Initials */}
          <div className="w-9 h-9 rounded-full bg-[#2c2a57] flex items-center justify-center text-white font-bold text-xs shadow-xs uppercase tracking-wider select-none">
            {userSession?.name 
              ? userSession.name.split(' ').map(word => word[0]).join('').substring(0, 2) 
              : 'US'
            }
          </div>
          
          {/* Text Descriptions (Safely hides on small screens to fit mobile constraints) */}
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#2c2a57] leading-tight">
              {userSession?.name || 'Loading Account...'}
            </p>
            <p className="text-[10px] text-[#0b9c54] font-bold mt-0.5 uppercase tracking-wider">
              {userSession?.role || 'Guest'}
            </p>
          </div>
          
        </div>

      </div>
    </header>
  );
}
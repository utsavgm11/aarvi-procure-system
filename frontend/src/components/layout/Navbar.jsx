// src/components/layout/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 🎯 NEW: Import React Router navigation
import { Menu, Bell, CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';

// 🎯 IMPORTING THE LOGO ENGINES FROM YOUR NEW COMPACT ASSETS FOLDER
import aarviLogo from '../../assets/logo.png';

const API_BASE_URL = "https://aarvi-procure-system.onrender.com/api";

export default function Navbar({ toggleSidebar, userSession }) {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const navigate = useNavigate(); // 🎯 NEW: Initialize the navigation engine

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🎯 Computed Polling Engine (Checks every 60 seconds)
  useEffect(() => {
    if (!userSession?.id) return;

    const fetchNotifications = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/users/${userSession.id}/notifications`);
        setNotifications(res.data);
      } catch (err) {
        console.error("Silently failing notification check", err);
      }
    };

    fetchNotifications(); // Initial fetch on load
    const intervalId = setInterval(fetchNotifications, 60000); // Check every 60 seconds

    return () => clearInterval(intervalId);
  }, [userSession?.id]);

  const unreadCount = notifications.length;

  const handleNotificationClick = (link) => {
    setIsDropdownOpen(false);
    // 🎯 FIXED: Use React Router to navigate smoothly without a hard page reload!
    if (link) {
      navigate(link); 
    }
  };

  // Maps the backend notification types to the correct UI icons and colors
  const getIconForType = (type) => {
    switch (type) {
      case 'critical': return <AlertTriangle size={16} className="text-rose-500" />;
      case 'action': return <Clock size={16} className="text-amber-500" />;
      case 'alert': return <AlertCircle size={16} className="text-indigo-500" />;
      case 'info': return <CheckCircle size={16} className="text-emerald-500" />;
      default: return <Bell size={16} className="text-slate-500" />;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-6 shadow-xs select-none">
      
      {/* LEFT AREA: RESPONSIVE HAMBURGER & REFINED BRANDING */}
      <div className="flex items-center space-x-3.5">
        <button 
          onClick={toggleSidebar} 
          className="text-slate-500 hover:text-[#2c2a57] hover:bg-slate-100 p-2 rounded-lg transition-colors lg:hidden focus:outline-none"
        >
          <Menu size={22} />
        </button>
        
        <div className="flex items-center space-x-3">
          <img src={aarviLogo} alt="Aarvi Logo" className="h-9 w-auto object-contain flex-shrink-0" />
          <div className="flex items-baseline space-x-1">
            <span className="text-xl font-extrabold tracking-tight text-[#2c2a57]">aarvi</span>
            <span className="text-lg font-medium text-slate-500 tracking-tight">Procure</span>
          </div>
        </div>
      </div>

      {/* RIGHT AREA: BADGE ALERTS & DYNAMIC PROFILE INDICATORS */}
      <div className="flex items-center space-x-4">
        
        {/* Interactive Notification Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`relative p-2 rounded-lg transition-all focus:outline-none ${isDropdownOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-[#2c2a57] hover:bg-slate-50'}`}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-[#0b9c54] text-[9px] text-white font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-xs animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-[#2c2a57]">Action Items</span>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">{unreadCount} Pending</span>
              </div>
              
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    <CheckCircle size={24} className="mx-auto mb-2 text-slate-300" />
                    Queue is completely clear!
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => handleNotificationClick(notif.link)}
                      className="p-3 transition-colors cursor-pointer hover:bg-slate-50 bg-indigo-50/20"
                    >
                      <div className="flex space-x-3">
                        <div className="mt-0.5">
                          {getIconForType(notif.type)}
                        </div>
                        <div>
                          <p className="text-xs text-[#2c2a57] font-bold leading-tight">
                            {notif.message}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-wider">
                            Requires Action
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
        
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-[#2c2a57] flex items-center justify-center text-white font-bold text-xs shadow-xs uppercase tracking-wider select-none">
            {userSession?.name 
              ? userSession.name.split(' ').map(word => word[0]).join('').substring(0, 2) 
              : 'US'
            }
          </div>
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
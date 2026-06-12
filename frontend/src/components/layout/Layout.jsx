// src/components/layout/Layout.jsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';

export default function Layout({ userSession, setUserSession }) {
  // Mobile/Tablet overlay control state (Desktop pins sidebar permanently via layout spacing)
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-[#0b9c54] selection:text-white">
      {/* Top Navbar Header Section */}
      <Navbar 
        toggleSidebar={() => setIsMobileOpen(!isMobileOpen)} 
        userSession={userSession} 
      />
      
      {/* Sidebar Component with Mobile Layout Toggle Overrides */}
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        setIsMobileOpen={setIsMobileOpen} 
        userSession={userSession} 
        setUserSession={setUserSession} 
      />

      {/* 
        RESPONSIVE LAYOUT FRAMING CONTAINER BLOCK 
        - permanently leaves room for the 64w (pl-64) sidebar on desktop/laptop viewports (lg:)
        - eliminates collapsible shifts on larger screens for an unwavering, corporate layout structure
      */}
      <div className="pt-16 pb-14 min-h-screen transition-all duration-300 lg:pl-64">
        <main className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {/* Inject userSession details down through child panels safely */}
          <Outlet context={{ userSession }} />
        </main>
      </div>

      {/* Corporate Platform Footer */}
      <Footer />

      {/* Dark tint backdrop overlay for mobile/tablet slideouts */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </div>
  );
}
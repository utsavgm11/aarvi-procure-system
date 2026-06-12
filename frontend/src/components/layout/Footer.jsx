// src/components/layout/Footer.jsx
import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-[#0b9c54] h-10 fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 lg:px-6 text-xs text-white font-semibold select-none shadow-md transition-all duration-300 lg:pl-[272px]">
      
      {/* LEFT: Dynamic Copyright Line matching your website footer asset */}
      <div className="tracking-wide">
        © 2026 Aarvi Encon Limited. All rights reserved.
      </div>

      {/* RIGHT: System Status Node Indicators */}
      <div className="flex items-center space-x-4">
        <span className="flex items-center text-white/90">
          {/* Faux heartbeat indicator tracking cloud synchronizations */}
          <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse shadow-xs"></span>
          Neon Cloud Node Connected
        </span>
        <span className="hidden sm:inline border-l border-white/20 pl-4 h-4 flex items-center text-white/70">
          Version 1.1.0
        </span>
      </div>

    </footer>
  );
}
// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import SiteCoordinatorDashboard from './components/SiteCoordinatorDashboard';
import SiteManagerDashboard from './components/SiteManagerDashboard';
import PurchaseExecutiveDashboard from './components/PurchaseExecutiveDashboard';
import ProjectManagerDashboard from './components/ProjectManagerDashboard';
import DirectorDashboard from './components/DirectorDashboard';
import VendorMasterDesk from './components/VendorMasterDesk';
import Login from './components/Login'; // 🎯 Import the new Login component
import ITAdminDashboard from './components/ITAdminDashboard';

// 🎯 COMPONENTS IMPORT UPGRADES
import PODistributionDashboard from './components/PODistributionDashboard'; 
import MasterPOLedgerDesk from './components/MasterPOLedgerDesk'; // 🎯 NEW: Linked missing Master Ledger component

// Role Dashboard Router Component
function DashboardViewSelector({ userSession, defaultTab = "commercial" }) {
  if (!userSession) {
    return <div className="text-center py-20 text-slate-500 font-medium mt-10">Initializing session profile context...</div>;
  }

  switch (userSession.role) {
    case 'Site Coordinator':
      return <SiteCoordinatorDashboard currentUser={userSession} />;
    case 'Site Manager':
      return <SiteManagerDashboard currentUser={userSession} />;
    case 'Purchase Executive':
      return <PurchaseExecutiveDashboard currentUser={userSession} />;
    case 'Project Manager':
      // 🎯 SPLIT-APP PASSING: Feeds an initial perspective filter to the Project Manager's dual workspace
      return <ProjectManagerDashboard currentUser={userSession} defaultTab={defaultTab} />;
    case 'Director':
      return <DirectorDashboard currentUser={userSession} />;
    case 'Admin':
      return <ITAdminDashboard />;  
    default:
      return <div className="text-center py-20 text-slate-500 font-medium mt-10">Aarvi Core ERP Section Initializing...</div>;
  }
}

function App() {
  // 🎯 NEW: Smart Initializer checks browser memory on refresh
  const [userSession, setUserSession] = useState(() => {
    const saved = localStorage.getItem('aarvi_session') || sessionStorage.getItem('aarvi_session');
    return saved ? JSON.parse(saved) : null;
  });

  // 🎯 GATEKEEPER: If no user is logged in, show the Login Screen
  if (!userSession) {
    return <Login onLoginSuccess={(profile) => setUserSession(profile)} />;
  }

  // Otherwise, load the full app Router
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout userSession={userSession} setUserSession={setUserSession} />}>
          
          {/* Base Layout Main Entry View */}
          <Route index element={<DashboardViewSelector userSession={userSession} />} />
          
          {/* 🎯 FIXED: PO Distribution Workspace Catch Route */}
          <Route path="pos" element={<PODistributionDashboard currentUser={userSession} />} />
          
          {/* 🎯 FIXED: Missing Master PO Ledger Analytics Catch Route */}
          <Route path="po-ledger" element={<MasterPOLedgerDesk currentUser={userSession} />} />

          {/* 🎯 NEW: Vendor Master Directory Route */}
          <Route path="vendors" element={<VendorMasterDesk />} />

          {/* 🎯 FIXED: Project Manager Technical Vetting Sub-Route Mapping */}
          <Route path="vetting" element={<DashboardViewSelector userSession={userSession} defaultTab="vetting" />} />
          
          {/* Future workflow placeholders */}
          <Route path="inbox" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Manager Inbox Grid Gateway Coming Soon...</div>} />
          <Route path="dashboard" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Management Control Dashboard Coming Soon...</div>} />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
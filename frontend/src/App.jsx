// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/layout/Layout';
import SiteCoordinatorDashboard from './components/SiteCoordinatorDashboard';
import SiteManagerDashboard from './components/SiteManagerDashboard';
import PurchaseExecutiveDashboard from './components/PurchaseExecutiveDashboard';
import ProjectManagerDashboard from './components/ProjectManagerDashboard';
import DirectorDashboard from './components/DirectorDashboard';
import VendorMasterDesk from './components/VendorMasterDesk';
import Login from './components/Login'; 
import ITAdminDashboard from './components/ITAdminDashboard'; 
import PODistributionDashboard from './components/PODistributionDashboard'; 
import MasterPOLedgerDesk from './components/MasterPOLedgerDesk'; 

// 🎯 NEW: Import the Direct Procurement / Fast-Track Portal
import ManagerRequestPortal from './components/ManagerRequestPortal';

// 🎯 Smart Root Router Landing Check Wrapper
// Instantly calculates where a user should land based on their active role
const getRoleHomePath = (role) => {
  switch (role) {
    case 'Site Coordinator':   return '/field-workspace';
    case 'Site Manager':       return '/vetting-gateway';
    case 'Purchase Executive': return '/sourcing-hub';
    case 'Project Manager':    return '/commercial-approvals';
    case 'IT Manager':         return '/direct-procurement';
    case 'Director':           return '/corporate-approvals';
    case 'Admin':              return '/admin';
    default:                   return '/dashboard'; // Fallback
  }
};

function App() {
  // 🎯 Smart Initializer checks browser memory on refresh
  const [userSession, setUserSession] = useState(() => {
    const saved = localStorage.getItem('aarvi_session') || sessionStorage.getItem('aarvi_session');
    return saved ? JSON.parse(saved) : null;
  });

  // 🎯 GATEKEEPER: If no user is logged in, show the Login Screen
  if (!userSession) {
    return <Login onLoginSuccess={(profile) => setUserSession(profile)} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout userSession={userSession} setUserSession={setUserSession} />}>
          
          {/* ⚡ BASE REDIRECTOR: Automatically pushes the user to their unique dashboard path */}
          <Route index element={<Navigate to={getRoleHomePath(userSession.role)} replace />} />
          
          {/* ========================================== */}
          {/* 🎯 EXPLICIT NAMED ROLE DASHBOARD ROUTES */}
          {/* ========================================== */}
          <Route path="field-workspace" element={<SiteCoordinatorDashboard currentUser={userSession} />} />
          <Route path="vetting-gateway" element={<SiteManagerDashboard currentUser={userSession} />} />
          <Route path="sourcing-hub" element={<PurchaseExecutiveDashboard currentUser={userSession} />} />
          <Route path="commercial-approvals" element={<ProjectManagerDashboard currentUser={userSession} />} />
          <Route path="corporate-approvals" element={<DirectorDashboard currentUser={userSession} />} />
          
          {/* ⚡ FAST-TRACK ROUTES (Accessible by Project Managers & IT Managers) */}
          <Route path="direct-procurement" element={<ManagerRequestPortal currentUser={userSession} />} />
          <Route path="direct-request" element={<ManagerRequestPortal currentUser={userSession} />} />

          {/* ========================================== */}
          {/* 🛠️ GLOBAL SHARED / UTILITY ROUTES */}
          {/* ========================================== */}
          
          {/* Project Manager Technical Vetting Sub-Route Mapping */}
          {/* Maps to the SiteManager interface so PMs can conduct technical validations */}
          <Route path="vetting" element={<SiteManagerDashboard currentUser={userSession} />} />

          {/* PO Distribution Workspace Catch Route */}
          <Route path="pos" element={<PODistributionDashboard currentUser={userSession} />} />
          
          {/* Master PO Ledger Analytics Catch Route */}
          <Route path="po-ledger" element={<MasterPOLedgerDesk currentUser={userSession} />} />

          {/* Vendor Master Directory Route */}
          <Route path="vendors" element={<VendorMasterDesk />} />

          {/* IT Admin Control Center Path Mapping */}
          <Route path="admin" element={<ITAdminDashboard />} />

          {/* Fallback Paths */}
          <Route path="inbox" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Manager Inbox Grid Gateway Coming Soon...</div>} />
          <Route path="dashboard" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Management Control Dashboard Coming Soon...</div>} />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
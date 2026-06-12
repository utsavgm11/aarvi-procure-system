// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import React, { useState } from 'react';
import Layout from './components/layout/Layout';
import SiteCoordinatorDashboard from './components/SiteCoordinatorDashboard';
import SiteManagerDashboard from './components/SiteManagerDashboard';
import PurchaseExecutiveDashboard from './components/PurchaseExecutiveDashboard';
import ProjectManagerDashboard from './components/ProjectManagerDashboard';
import DirectorDashboard from './components/DirectorDashboard';

// 🎯 NEW: Import the PODistributionDashboard!
import PODistributionDashboard from './components/PODistributionDashboard'; 

// Role Dashboard Router Component
function DashboardViewSelector({ userSession }) {
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
      return <ProjectManagerDashboard currentUser={userSession} />;
    case 'Director':
      return <DirectorDashboard currentUser={userSession} />;
    default:
      return <div className="text-center py-20 text-slate-500 font-medium mt-10">Aarvi Core ERP Section Initializing...</div>;
  }
}

function App() {
  const [userSession, setUserSession] = useState({
    id: 1,
    name: 'Amit Sharma',
    email: 'coordinator@aarviencon.com',
    role: 'Site Coordinator'
  });

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout userSession={userSession} setUserSession={setUserSession} />}>
          
          <Route index element={<DashboardViewSelector userSession={userSession} />} />
          
          {/* 🎯 FIXED: Replaced the "Coming Soon" text with the actual PO Dashboard component */}
          <Route path="pos" element={<PODistributionDashboard currentUser={userSession} />} />
          
          {/* Future workflow placeholders */}
          <Route path="inbox" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Manager Inbox Grid Gateway Coming Soon...</div>} />
          <Route path="dashboard" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Management Control Dashboard Coming Soon...</div>} />
          
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
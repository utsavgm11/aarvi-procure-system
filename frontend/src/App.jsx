// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import SiteCoordinatorDashboard from './components/SiteCoordinatorDashboard';
import SiteManagerDashboard from './components/SiteManagerDashboard';
import PurchaseExecutiveDashboard from './components/PurchaseExecutiveDashboard';
import ProjectManagerDashboard from './components/ProjectManagerDashboard';
import DirectorDashboard from './components/DirectorDashboard';
import DirectorAnalyticsDashboard from './components/DirectorAnalyticsDashboard'; // 🎯 NEW IMPORT
import VendorMasterDesk from './components/VendorMasterDesk';
import Login from './components/Login'; 
import ITAdminDashboard from './components/ITAdminDashboard'; 
import PODistributionDashboard from './components/PODistributionDashboard'; 
import MasterPOLedgerDesk from './components/MasterPOLedgerDesk'; 
import AccountsDesk from './components/AccountsDesk';
import ManagerRequestPortal from './components/ManagerRequestPortal';

// 🎯 Smart Root Router Landing Check Wrapper
const getRoleHomePath = (role) => {
  switch (role) {
    case 'Site Coordinator':   return '/field-workspace';
    case 'Site Manager':       return '/vetting-gateway';
    case 'Purchase Executive': return '/sourcing-hub';
    case 'Project Manager':    return '/commercial-approvals';
    case 'Accounts':           return '/accounts-desk'; 
    case 'Accounts Executive': return '/accounts-desk'; 
    case 'Finance Manager':    return '/accounts-desk'; 
    case 'IT Manager':         return '/direct-procurement';
    case 'Director':           return '/director-analytics'; // 🎯 UPDATED TO ANALYTICS HOME
    case 'Admin':              return '/admin';
    default:                   return '/dashboard'; 
  }
};

// 🛡️ STRICT ROLE-BASED ROUTE GUARD
const RoleRoute = ({ allowedRoles, userRole, children }) => {
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={getRoleHomePath(userRole)} replace />;
  }
  return children;
};

// 🎯 INNER ROUTE COMPONENT (Allows us to use React Router hooks like useNavigate)
function AppRoutes({ userSession, setUserSession }) {
  const currentRole = userSession.role;
  const navigate = useNavigate();

  // Callbacks for Director Analytics Dashboard Routing
  const handleDirectorLedgerNavigation = (projectCode) => {
    // 🎯 Note: We can pass state to pre-filter the ledger if desired in the future, 
    // but right now it just reliably routes the director to the ledger.
    navigate('/po-ledger');
  };

  const handleDirectorApprovalsNavigation = () => {
    navigate('/corporate-approvals');
  };

  return (
    <Routes>
      <Route path="/" element={<Layout userSession={userSession} setUserSession={setUserSession} />}>
        
        {/* ⚡ BASE REDIRECTOR */}
        <Route index element={<Navigate to={getRoleHomePath(currentRole)} replace />} />
        
        {/* ========================================== */}
        {/* 🎯 EXPLICIT NAMED ROLE DASHBOARD ROUTES */}
        {/* ========================================== */}
        
        <Route path="field-workspace" element={
          <RoleRoute allowedRoles={['Site Coordinator']} userRole={currentRole}>
            <SiteCoordinatorDashboard currentUser={userSession} />
          </RoleRoute>
        } />
        
        <Route path="vetting-gateway" element={
          <RoleRoute allowedRoles={['Site Manager', 'Project Manager']} userRole={currentRole}>
            <SiteManagerDashboard currentUser={userSession} />
          </RoleRoute>
        } />
        
        <Route path="sourcing-hub" element={
          <RoleRoute allowedRoles={['Purchase Executive']} userRole={currentRole}>
            <PurchaseExecutiveDashboard currentUser={userSession} />
          </RoleRoute>
        } />
        
        <Route path="commercial-approvals" element={
          <RoleRoute allowedRoles={['Project Manager']} userRole={currentRole}>
            <ProjectManagerDashboard currentUser={userSession} />
          </RoleRoute>
        } />

        {/* 🎯 NEW: DIRECTOR ANALYTICS HOME */}
        <Route path="director-analytics" element={
          <RoleRoute allowedRoles={['Director']} userRole={currentRole}>
            <DirectorAnalyticsDashboard 
              onNavigateToLedger={handleDirectorLedgerNavigation}
              onNavigateToApprovals={handleDirectorApprovalsNavigation}
            />
          </RoleRoute>
        } />
        
        {/* 🎯 DIRECTOR CAPEX APPROVALS QUEUE */}
        <Route path="corporate-approvals" element={
          <RoleRoute allowedRoles={['Director']} userRole={currentRole}>
            <DirectorDashboard currentUser={userSession} />
          </RoleRoute>
        } />
        
        {/* 🎯 ACCOUNTS DEPARTMENT WORKSPACE */}
        <Route path="accounts-desk" element={
          <RoleRoute allowedRoles={['Accounts', 'Accounts Executive', 'Finance Manager']} userRole={currentRole}>
            <AccountsDesk currentUser={userSession} />
          </RoleRoute>
        } />

        {/* ⚡ FAST-TRACK ROUTES */}
        <Route path="direct-procurement" element={
          <RoleRoute allowedRoles={['Project Manager', 'IT Manager', 'Director']} userRole={currentRole}>
            <ManagerRequestPortal currentUser={userSession} />
          </RoleRoute>
        } />
        
        <Route path="direct-request" element={
          <RoleRoute allowedRoles={['Project Manager', 'IT Manager', 'Director']} userRole={currentRole}>
            <ManagerRequestPortal currentUser={userSession} />
          </RoleRoute>
        } />

        {/* ========================================== */}
        {/* 🛠️ GLOBAL SHARED / UTILITY ROUTES */}
        {/* ========================================== */}
        
        <Route path="vetting" element={
          <RoleRoute allowedRoles={['Project Manager']} userRole={currentRole}>
            <SiteManagerDashboard currentUser={userSession} />
          </RoleRoute>
        } />

        <Route path="pos" element={
          <RoleRoute allowedRoles={['Purchase Executive', 'Project Manager', 'Director']} userRole={currentRole}>
            <PODistributionDashboard currentUser={userSession} />
          </RoleRoute>
        } />
        
        <Route path="po-ledger" element={
          <MasterPOLedgerDesk currentUser={userSession} />
        } />

        <Route path="vendors" element={
          <RoleRoute allowedRoles={['Purchase Executive', 'Project Manager', 'Director', 'Admin']} userRole={currentRole}>
            <VendorMasterDesk />
          </RoleRoute>
        } />

        <Route path="admin" element={
          <RoleRoute allowedRoles={['Admin']} userRole={currentRole}>
            <ITAdminDashboard />
          </RoleRoute>
        } />

        {/* Fallback Paths */}
        <Route path="inbox" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Manager Inbox Grid Gateway Coming Soon...</div>} />
        <Route path="dashboard" element={<div className="text-center py-20 text-slate-500 font-medium mt-10">Management Control Dashboard Coming Soon...</div>} />
        
      </Route>
    </Routes>
  );
}

// 🎯 MAIN WRAPPER
export default function App() {
  const [userSession, setUserSession] = useState(() => {
    const saved = localStorage.getItem('aarvi_session') || sessionStorage.getItem('aarvi_session');
    return saved ? JSON.parse(saved) : null;
  });

  if (!userSession) {
    return <Login onLoginSuccess={(profile) => setUserSession(profile)} />;
  }

  return (
    <Router>
      <AppRoutes userSession={userSession} setUserSession={setUserSession} />
    </Router>
  );
}
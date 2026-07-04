import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stores from './pages/Stores';
import Shelves from './pages/Shelves';
import Cameras from './pages/Cameras';
import Products from './pages/Products';
import UserControls from './pages/Users';

// Dashboard Layout Wrapper
function DashboardLayout() {
  const [activeStoreId, setActiveStoreId] = useState(null);

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar />
      
      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with store context */}
        <Header onStoreChange={(id) => setActiveStoreId(id)} />
        
        {/* Scrollable Sub-Page Outlet */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Secure Dashboard Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="stores" element={<Stores />} />
          <Route path="shelves" element={<Shelves />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="products" element={<Products />} />
          
          {/* Admin-only user control list */}
          <Route 
            path="users" 
            element={
              <ProtectedRoute allowedRoles={['Administrator']}>
                <UserControls />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Vehicles } from './components/Vehicles';
import { FuelManagement } from './components/FuelManagement';
import { Drivers } from './components/Drivers';
import { RouteManagement } from './components/RouteManagement';
import { News } from './components/News';
import { Settings } from './components/Settings';

import { Login } from './components/Login';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  const isBackofficeDomain = typeof window !== 'undefined' && window.location.hostname.includes('backoffice.');
  const baseName = isBackofficeDomain ? "/" : "/backoffice";

  const checkAuth = async () => {
    try {
      const resp = await fetch('/api/auth/me');
      if (resp.ok) {
        const data = await resp.json();
        setUser(data);
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        setIsAuthenticated(false);
        localStorage.removeItem('isAuthenticated');
      }
    } catch (e) {
      console.error('Error checking auth:', e);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-slate-900 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={baseName}>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login onLoginSuccess={() => setIsAuthenticated(true)} />
          } 
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Layout user={user} /> : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="fuel" element={<FuelManagement />} />
          <Route path="routes" element={<RouteManagement />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="news" element={<News />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

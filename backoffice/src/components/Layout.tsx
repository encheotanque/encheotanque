import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Search, User } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export const Layout: React.FC<{ user: any }> = ({ user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <main className="flex flex-1 flex-col overflow-hidden bg-slate-50">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden items-center gap-2 text-slate-400 lg:flex">
              <Search className="size-4" />
              <input 
                type="text" 
                placeholder="Buscar veículo, motorista..."
                className="bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user?.name || "Admin Central"}</p>
                <p className="text-xs text-slate-500">{user?.companyName || "Gestor de Frota"}</p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <User className="size-5" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  );
};

import React from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  Fuel, 
  Users, 
  Settings, 
  Bell, 
  LogOut,
  Menu,
  X,
  Newspaper,
  MapPin,
  Route as RouteIcon
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Motoristas', path: '/drivers' },
  { icon: Truck, label: 'Veículos', path: '/vehicles' },
  { icon: Fuel, label: 'Abastecimentos', path: '/fuel' },
  { icon: RouteIcon, label: 'Rotas', path: '/routes' },
  { icon: Newspaper, label: 'Notícias', path: '/news' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-slate-600 text-slate-100 transition-all duration-300 ease-in-out",
          isOpen ? "w-64" : "w-20",
          "lg:static lg:block border-r border-slate-500/30"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-8 flex items-center justify-between">
            <div className={cn("flex items-center gap-3 overflow-hidden transition-all duration-300", !isOpen && "w-0 opacity-0")}>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 relative overflow-hidden">
                <img 
                  src="/Logo_maker_project.png" 
                  alt="Logo Enche o Tanque" 
                  className="size-8 object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="whitespace-nowrap font-black text-white text-xl tracking-tighter">
                ENCHE O <span className="text-primary">TANQUE</span>
              </span>
            </div>
            
            {/* Logo when closed */}
            {!isOpen && (
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-500/10 transition-all hover:scale-110 relative overflow-hidden">
                <img 
                  src="/Logo_maker_project.png" 
                  alt="Logo Enche o Tanque" 
                  className="size-10 object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
                  "hover:bg-slate-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(250,204,21,0.2)] hover:border-primary/20 border border-transparent",
                  isActive ? "bg-slate-500/60 text-white border-primary/30 shadow-[inset_0_0_10px_rgba(250,204,21,0.1)]" : "text-slate-300"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn(
                      "size-5 shrink-0 transition-colors",
                      isActive ? "text-primary" : "group-hover:text-primary"
                    )} />
                    <span className={cn("transition-all duration-300 font-medium", !isOpen && "hidden opacity-0")}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-2 border-t border-slate-500/30 pt-4">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-300 transition-all hover:bg-slate-500/40 hover:text-white hover:shadow-[0_0_12px_rgba(250,204,21,0.2)]">
              <Bell className="size-5 shrink-0" />
              <span className={cn("transition-all duration-300 font-medium", !isOpen && "hidden opacity-0")}>
                Notificações
              </span>
            </button>
            <button 
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout');
                } catch (e) {
                  console.error("Logout request failed:", e);
                }
                localStorage.removeItem('isAuthenticated');
                window.location.reload();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-red-200 transition-all hover:bg-red-500/20 hover:text-red-300"
            >
              <LogOut className="size-5 shrink-0" />
              <span className={cn("transition-all duration-300 font-medium", !isOpen && "hidden opacity-0")}>
                Sair
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

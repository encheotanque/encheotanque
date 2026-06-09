import React, { useState, useEffect } from 'react';
import { LogIn, ShieldCheck, UserCircle, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const resp = await fetch("/api/auth/google/url");
      if (!resp.ok) {
        throw new Error("Erro ao obter URL de autenticação do Google.");
      }
      const { url } = await resp.json();
      
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        "google_auth_backoffice",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        setErrorMsg('Pop-up bloqueado pelo navegador. Por favor, autorize pop-ups para fazer login.');
        setIsLoading(false);
        return;
      }

      // Poll as a backup in case the postMessage is lost
      const checkSession = async () => {
        try {
          const checkResp = await fetch('/api/auth/me');
          if (checkResp.ok) {
            localStorage.setItem('isAuthenticated', 'true');
            clearInterval(pollTimer);
            onLoginSuccess();
            navigate('/', { replace: true });
            return true;
          }
        } catch (e) {
          console.error("Session check backup failed:", e);
        }
        return false;
      };

      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          setTimeout(checkSession, 1000);
        } else {
          checkSession().then(loggedIn => {
            if (loggedIn) {
              clearInterval(pollTimer);
            }
          });
        }
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro inesperado ao conectar com o Google.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Basic security origin filter
      if (event.origin && !event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        localStorage.setItem('isAuthenticated', 'true');
        onLoginSuccess();
        navigate('/', { replace: true });
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setErrorMsg(event.data.error || 'Erro na autenticação.');
        setIsLoading(false);
      }
    };
    
    window.addEventListener('message', handleOAuthMessage);
    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [onLoginSuccess, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans relative overflow-hidden">
      {/* Background Gas Station Contours (Stylized SVG) */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-end justify-center">
        <svg viewBox="0 0 1000 400" className="w-[120%] h-auto text-slate-900">
          <path d="M0,400 L1000,400 L1000,350 L850,350 L850,150 L150,150 L150,350 L0,350 Z" fill="currentColor" />
          <rect x="250" y="250" width="60" height="150" fill="currentColor" />
          <rect x="470" y="250" width="60" height="150" fill="currentColor" />
          <rect x="690" y="250" width="60" height="150" fill="currentColor" />
          <path d="M100,150 L900,150 L950,100 L50,100 Z" fill="currentColor" />
        </svg>
      </div>

      <motion.div 
         initial={{ opacity: 0, scale: 0.98 }}
         animate={{ opacity: 1, scale: 1 }}
         className="relative w-full max-w-md"
      >
        <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white/70 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(15,23,42,0.1)]">
          <div className="p-8 md:p-12">
            {/* Logo Header */}
            <div className="flex flex-col items-center mb-8 text-center bg-slate-900 p-6 rounded-3xl border border-slate-800/80 shadow-md">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-3xl bg-slate-805 border border-slate-700/50 shadow-inner relative overflow-hidden mb-6">
                <img 
                  src="/Logo_maker_project.png" 
                  alt="Logo Enche o Tanque" 
                  className="size-16 object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                ENCHE O <span className="text-primary tracking-normal">TANQUE</span>
              </h1>
              <p className="mt-2 text-slate-400 font-medium tracking-wide flex items-center justify-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" /> Backoffice Intelligence
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 rounded-2xl bg-red-50 border border-red-100 p-4 text-xs font-semibold text-red-600 animate-fade-in text-center">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center font-medium leading-relaxed mb-6">
                Acesse o painel gerencial utilizando sua conta do Google associada com privilégios administrativos.
              </p>

              <button 
                type="button" 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 font-semibold py-4 px-6 rounded-2xl border border-slate-200 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 relative overflow-hidden cursor-pointer"
              >
                {isLoading ? (
                  <div className="size-5 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="size-5" viewBox="0 0 24 24" width="24" height="24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Entrar com o Google</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-10 flex flex-col items-center gap-4">
              <div className="w-full h-px bg-slate-100" />
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                Desenvolvido por <span className="text-slate-600 font-bold">Fleet Intelligence Systems</span>
              </p>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-8 flex justify-center gap-6">
          <button className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
            <UserCircle className="size-4" /> Sem permissão?
          </button>
          <button className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
            <HelpCircle className="size-4" /> Suporte Técnico
          </button>
        </div>
      </motion.div>
    </div>
  );
};

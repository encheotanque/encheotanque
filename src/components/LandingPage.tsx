import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fuel, Smartphone, ShieldCheck, Zap, Navigation, ArrowRight, ChevronRight, MapPin, Search } from 'lucide-react';
import { Logo } from './Logo';

interface LandingPageProps {
  onLogin: () => void;
  onDevLogin?: (email: string, tab?: string) => void;
  isLoading: boolean;
  onShowPrivacy: () => void;
  onShowTerms: () => void;
}

export function LandingPage({ onLogin, onDevLogin, isLoading, onShowPrivacy, onShowTerms }: LandingPageProps) {
  const [step, setStep] = useState(0);
  const isDev = window.location.hostname.includes('ais-dev') || window.location.hostname.includes('localhost');
  const [debugInfo, setDebugInfo] = useState<{
    derivedRedirectUri?: string;
    APP_URL?: string;
    googleClientIdConfigured?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/debug/auth')
      .then(r => r.json())
      .then(data => setDebugInfo(data))
      .catch(err => console.error("Could not fetch debug credentials:", err));
  }, []);

  const steps = [
    {
      title: "Economize em cada litro",
      description: "Encontre os postos mais baratos perto de você em tempo real. Ideal para frotas, motoristas de app e uso pessoal.",
      color: "primary",
      icon: <Fuel className="w-12 h-12 text-primary neon-text-gold" />,
      image: "https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=600"
    },
    {
      title: "Inteligência Geográfica",
      description: "Navegação otimizada para os postos com melhor custo-benefício na sua rota.",
      color: "secondary",
      icon: <Navigation className="w-12 h-12 text-secondary neon-text-gold" />,
      image: "https://images.unsplash.com/photo-1563906267088-b02440053e90?auto=format&fit=crop&q=80&w=600"
    },
    {
      title: "Tudo em um só lugar",
      description: "Gestão inteligente de veículos e histórico de abastecimento com segurança total.",
      color: "primary",
      icon: <ShieldCheck className="w-12 h-12 text-primary neon-text-gold" />,
      image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=600"
    }
  ];

  return (
    <div className="fixed inset-0 bg-background text-white flex flex-col font-sans overflow-hidden select-none">
      {/* Persistent Map Shading (Google Maps Vibe) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
         <img 
           id="landing-base-map"
           src="https://images.unsplash.com/photo-1569336415962-a4bd9f69cd81?auto=format&fit=crop&q=80&w=1200" 
           className="w-full h-full object-cover grayscale brightness-[2] contrast-150 opacity-60 scale-110 rotate-1 mix-blend-screen" 
           alt="" 
           referrerPolicy="no-referrer"
         />
         <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,var(--color-background)_90%)]" />
      </div>

      {/* Dynamic Background Texture (Subtler overlay) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-[1] mix-blend-overlay"
        >
          <img src={steps[step].image} className="w-full h-full object-cover grayscale brightness-50" alt="" />
          <div className="absolute inset-0 bg-background/40" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(218,165,32,0.08),transparent_70%)] pointer-events-none z-[1]" />

      {/* Header */}
      <header className="relative z-20 px-8 py-10 flex flex-col items-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative mb-6"
        >
          {/* New Golden Logo */}
          <Logo size="lg" />
        </motion.div>
        
        <div className="text-center">
          <h1 className="font-black text-4xl tracking-tighter uppercase leading-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.4)] whitespace-nowrap">
            <span className="text-white">Enche o </span>
            <span className="text-amber-400">Tanque</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mt-3">
            Abasteça com inteligência,<br /> rode com economia
          </p>
        </div>
      </header>

      {/* Content Slider */}
      <main className="relative z-20 flex-1 flex flex-col justify-center px-8 pb-12">
        <div className="h-48 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="max-w-md"
            >
              <div className="mb-6">{steps[step].icon}</div>
              <h2 className="text-3xl font-black leading-tight mb-3 tracking-tight text-white">
                {steps[step].title}
              </h2>
              <p className="text-base text-white/50 leading-relaxed font-medium">
                {steps[step].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Area */}
        <div className="mt-8 space-y-6">
          <div className="flex gap-2 mb-8">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-10 bg-primary neon-glow-gold' : 'w-2 bg-white/10'}`}
              />
            ))}
          </div>

          <div className="min-h-[5rem] flex items-center w-full">
            <AnimatePresence mode="wait">
              {step < steps.length - 1 ? (
                <motion.button
                  key="next-btn"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setStep(step + 1)}
                  className="w-full py-5 bg-surface-container-high border border-outline-variant text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-surface-container-highest transition-all uppercase tracking-widest text-xs active:scale-95 animate-pulse"
                >
                  Continuar <ChevronRight size={18} className="text-primary neon-text-gold" />
                </motion.button>
              ) : (
                <motion.div 
                  key="login-area"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full space-y-4"
                >
                  <button
                    onClick={onLogin}
                    disabled={isLoading}
                    className="w-full py-5 bg-primary text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-xs shadow-[0_0_40px_rgba(74,222,128,0.25)] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-green-400/20 border-t-green-400 rounded-full animate-spin shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
                    ) : (
                      <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center p-1">
                        <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
                      </div>
                    )}
                    Entrar com Google
                  </button>
                  <p className="text-center text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    Acesso restrito para motoristas particulares e profissionais
                  </p>


                  
                  {isDev && onDevLogin && (
                    <div className="pt-4 border-t border-white/5 space-y-2">
                       <p className="text-center text-[9px] text-primary/40 font-black uppercase tracking-widest mb-2">
                        Ambiente de Desenvolvimento
                       </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => onDevLogin('marcio.vasconcellos@gmail.com', 'home')}
                          className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10"
                        >
                          Dev Marcio
                        </button>
                        <button
                          onClick={() => onDevLogin('giovana.vasconcellos@gmail.com', 'home')}
                          className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10"
                        >
                          Dev Giovana
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Decorative Effects & Footer */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center gap-6 z-30 opacity-40 hover:opacity-100 transition-opacity">
        <button onClick={onShowPrivacy} className="text-[9px] font-black uppercase tracking-[0.2em] text-white hover:text-primary transition-colors">Privacidade</button>
        <button onClick={onShowTerms} className="text-[9px] font-black uppercase tracking-[0.2em] text-white hover:text-primary transition-colors">Termos</button>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 neon-glow-gold" />
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent opacity-30 neon-glow-gold" />
    </div>
  );
}


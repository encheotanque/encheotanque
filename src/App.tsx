/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Flashlight, 
  Info, 
  Image as ImageIcon, 
  Keyboard, 
  History, 
  QrCode, 
  Settings,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ExternalLink,
  Trash2,
  Clock,
  Menu,
  User as UserIcon,
  Home as HomeIcon,
  Navigation,
  Share2,
  Share,
  Map as MapIcon,
  Fuel,
  Star,
  Zap,
  Upload,
  Link,
  MapPin,
  Rocket,
  Leaf,
  CarFront,
  Camera,
  Pencil,
  Target,
  Maximize,
  Minimize,
  ShieldCheck,
  Calendar,
  Edit2,
  Plus,
  MessageSquare,
  Megaphone,
  LayoutList,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Building2,
  AlertCircle,
  FileText,
  BarChart2,
  Flag,
  Coins,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import React, { useState, ReactNode, useEffect, useRef, useCallback, useMemo } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { LandingPage } from './components/LandingPage';
import { Logo } from './components/Logo';

const MySwal = withReactContent(Swal);

// Provisional Auth Types
import { RankingsView } from "./components/RankingsView";
import { InsightsView } from "./components/InsightsView";
import { AnalisesView } from "./components/AnalisesView";

interface User {
  email: string;
  name: string;
  photoURL?: string;
  googlePhotoURL?: string;
  status?: 'PENDING_VERIFICATION' | 'WAITING_APPROVAL' | 'AUTHORIZED' | 'REJECTED' | 'SUSPENDED';
  verified?: boolean;
  isAdmin?: boolean;
  registerRequired?: boolean;
  phone?: string;
  cpf?: string;
  cnh?: string;
  cnhExpiration?: string;
  createdAt?: string;
  preferredFuel?: number;
  searchRadius?: number;
}

interface Vehicle {
  id_veiculo: number;
  id_placa: string;
  nm_marca: string;
  nm_modelo: string;
  nu_renavam?: string;
  fl_ativo?: number;
  id_comb_pref?: number;
  ds_combs_permitidos?: string;
}

const formatCPF = (cpf: string) => {
  if (!cpf) return "Não informado";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatNumber = (val: number | string | undefined | null, decimals: number = 2) => {
  if (val === undefined || val === null) return "—";
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

const getFriendlyName = (ds: string): string => {
  if (!ds) return "";
  const dsUpper = ds.toUpperCase();
  if (dsUpper.includes("GASOLINA C COMUM ADITIVADA")) return "Gasolina Adit.";
  if (dsUpper.includes("GASOLINA C COMUM")) return "Gasolina";
  if (dsUpper.includes("GASOLINA C PREMIUM ADITIVADA")) return "Gas. Prem. Adit.";
  if (dsUpper.includes("GASOLINA C PREMIUM")) return "Gas. Premium";
  if (dsUpper.includes("GÁS NATURAL VEICULAR")) return "GNV";
  if (dsUpper.includes("ETANOL HIDRATADO ADITIVADO")) return "Etanol Adit.";
  if (dsUpper.includes("ETANOL HIDRATADO COMUM")) return "Etanol";
  if (dsUpper.includes("ÓLEO DIESEL B S10 - ADITIVADO")) return "Diesel S10 Adit.";
  if (dsUpper.includes("ÓLEO DIESEL B S10 - COMUM")) return "Diesel S10";
  if (dsUpper.includes("ÓLEO DIESEL B S500 - ADITIVADO")) return "Diesel S500 Adit.";
  if (dsUpper.includes("ÓLEO DIESEL B S500 - COMUM")) return "Diesel S500";
  return ds;
};

export default function App() {
  // PWA / APK Smartphone Simulator State
  const [bypassSimulator, setBypassSimulator] = useState(false);
  const isOfficialDomain = window.location.hostname === "app.encheotanque.net.br";
  const shouldShowSimulator = !isOfficialDomain && !bypassSimulator;

  const [activeTab, setActiveTab] = useState<'home' | 'scanner' | 'history' | 'profile' | 'search' | 'admin' | 'feedback' | 'rankings' | 'insights' | 'analises'>('home');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [canInstallPWA, setCanInstallPWA] = useState(false);
  const [isIosUser, setIsIosUser] = useState(false);
  const [showIosInstallGuide, setShowIosInstallGuide] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [isUpdatingPWA, setIsUpdatingPWA] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Auth & Vehicles State
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expirationWarningSeen, setExpirationWarningSeen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [stats, setStats] = useState<{ totalEconomy: number, totalLiters: number, totalSpent: number, canSearch: boolean, totalScans: number, daysRemaining: number, lastPurchase: any } | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [pendingScan, setPendingScan] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [minSplashComplete, setMinSplashComplete] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [locationName, setLocationName] = useState<string>("Buscando localização...");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mustUpdateVehicles, setMustUpdateVehicles] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [brands, setBrands] = useState<{codigo: string, nome: string}[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [fuelTypes, setFuelTypes] = useState<{ id_produto: number; nm_produto: string; ds_produto: string; friendlyName: string }[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRegionId = "reader";

  useEffect(() => {
    const initialize = async () => {
      // 1. PWA Update Detection (Immediate)
      if ('serviceWorker' in navigator) {
        // Força verificação de atualização ao iniciar para garantir que o PWA receba a v2.2.0
        const hadController = !!navigator.serviceWorker.controller;
        
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg) reg.update().catch(err => console.error("SW update check failed", err));
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          if (hadController) {
            refreshing = true;
            setIsUpdatingPWA(true);
            // Pequeno delay para mostrar a tela de atualização antes do reload
            setTimeout(() => window.location.reload(), 2000);
          }
        });
      }

      // 2. Initial Session Check (Wait for health)
      await checkSession(0, true);

      // 3. Navigation & Dev Login
      const path = window.location.pathname.toLowerCase().replace(/^\/+/, '');
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const tab = params.get('tab');

      if (email) {
        try {
          const resp = await fetch(`/api/auth/dev-login?email=${email}`);
          if (resp.ok) {
            await checkSession(0, true);
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, '', newUrl);
          }
        } catch (e) {
          console.error("Dev login failed", e);
        }
      }

      setIsLoadingSession(false);

      const tabToSet = tab || path;
      const tabMap: Record<string, any> = {
        'dashboard': 'home',
        'historico': 'history',
        'history': 'history',
        'perfil': 'profile',
        'profile': 'profile',
        'scanner': 'scanner',
        'busca': 'search',
        'analises': 'analises',
        'ranking': 'analises',
        'insights': 'analises',
        'feedback': 'feedback',
        'admin': 'admin'
      };

      if (tabMap[tabToSet]) {
        setActiveTab(tabMap[tabToSet]);
      }
    };

    initialize();

    const minSplashTimer = setTimeout(() => {
      setMinSplashComplete(true);
    }, 3500); // Reduced slightly for better feel
    
    // Progress bar simulation for splash
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    // PWA Install Event Listener
    const handlePwaAvailable = () => setCanInstallPWA(true);
    window.addEventListener('pwa-installavailable', handlePwaAvailable);
    if ((window as any).deferredPrompt) setCanInstallPWA(true);

    // Check for iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isStandalone = (window.navigator as any).standalone === true;
    setIsIosUser(isIos && !isStandalone);
    if (isIos && !isStandalone && localStorage.getItem('dismissed_ios_banner') !== 'true') {
      setShowIosBanner(true);
    }

    return () => {
      clearInterval(progressInterval);
      clearTimeout(minSplashTimer);
      window.removeEventListener('pwa-installavailable', handlePwaAvailable);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const requestLocation = () => {
      if (!navigator.geolocation) {
        if (mounted) {
          setLocationError("Navegador não suporta geolocalização");
          setLocationName("Rio de Janeiro - RJ"); 
          setUserLocation({ lat: -22.9068, lng: -43.1729 });
        }
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            if (!mounted) return;
            try {
              const { latitude, longitude } = position.coords;
              setUserLocation({ lat: latitude, lng: longitude });
              
              const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`);
              const data = await response.json();
              
              const city = data.city || data.locality || "Desconhecido";
              let state = "";
              if (data.principalSubdivisionCode) {
                state = data.principalSubdivisionCode.split('-').pop() || "";
              } else if (data.principalSubdivision) {
                state = data.principalSubdivision;
              }
              
              if (mounted) {
                setLocationName(`${city}${state ? ` - ${state}` : ''}`);
                setLocationError(null);
              }
            } catch (err) {
              console.error("Erro ao buscar nome da localização:", err);
              if (mounted) {
                setLocationError("Erro ao identificar local");
                setLocationName("Localização Desconhecida");
              }
            }
          },
          (error) => {
            console.error("Erro de geolocalização:", error);
            if (!mounted) return;
            
            let errorMessage = "Erro ao obter localização";
            if (error.code === error.PERMISSION_DENIED) {
              errorMessage = "Permissão negada (use nova aba)";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMessage = "Sinal de GPS indisponível";
            } else if (error.code === error.TIMEOUT) {
              errorMessage = "Tempo esgotado";
            }
            
            setLocationError(errorMessage);
            setLocationName("Petrópolis - RJ (Modo Busca)");
            setUserLocation({ lat: -22.5112, lng: -43.1779 });
          },
          options
        );
      } catch (e) {
        console.error("Geolocation API error:", e);
        if (mounted) {
          setLocationError("Erro de acesso. Tente em nova aba.");
          setLocationName("Petrópolis - RJ");
          setUserLocation({ lat: -22.5112, lng: -43.1779 });
        }
      }
    };

    requestLocation();

    return () => {
      mounted = false;
    };
  }, []);

  // Effect to handle splash removal and steady-state actions (like Changelog)
  useEffect(() => {
    if (!isLoadingSession && !isUpdatingPWA && minSplashComplete) {
      // 1. Remove static splash
      const splash = document.getElementById('splash-overlay');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
      }

      // 2. Changelog Automático (Apenas 1x após tudo estar estável e usuário logado e NÃO estiver atualizando PWA)
      if (user && !isUpdatingPWA) {
        const CURRENT_VERSION = '2.2.0';
        const lastSeenVersion = localStorage.getItem('last_seen_version');
        const isDev = import.meta.env.DEV;
        
        if (isDev || lastSeenVersion !== CURRENT_VERSION) {
          // Pequeno delay após o splash sumir para não sobrecarregar visualmente
          const changelogTimer = setTimeout(() => {
            setShowChangelog(true);
            localStorage.setItem('last_seen_version', CURRENT_VERSION);
          }, 800);
          return () => clearTimeout(changelogTimer);
        }
      }
    }
  }, [isLoadingSession, isUpdatingPWA, minSplashComplete, user]);

  const handlePWAInstall = async () => {
    const deferredPrompt = (window as any).deferredPrompt;
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User response to install: ${outcome}`);
    
    if (outcome === 'accepted') {
      (window as any).deferredPrompt = null;
      setCanInstallPWA(false);
    }
  };

  const openModelPicker = async (vehicleType: string, brandCode: string, onSelect: (model: {codigo: string, nome: string}) => void) => {
    setLoadingModels(true);
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${vehicleType}/marcas/${brandCode}/modelos`);
      const data = await res.json();
      const currentModels = data.modelos || [];
      setLoadingModels(false);

      const { value: selectedNome } = await MySwal.fire({
        title: 'SELECIONE O MODELO',
        input: 'select',
        inputOptions: currentModels.reduce((acc: any, curr: any) => ({ ...acc, [curr.nome]: curr.nome }), {}),
        inputPlaceholder: 'Pesquisar modelo...',
        showCancelButton: true,
        background: '#151515',
        color: '#fff',
        confirmButtonColor: '#CCFF00',
        confirmButtonText: 'SELECIONAR',
        cancelButtonText: 'VOLTAR',
        customClass: {
          confirmButton: 'text-black font-black uppercase'
        },
        inputAttributes: {
          style: 'background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 12px; padding: 12px; margin-top: 20px;'
        },
        didOpen: () => {
          const select = Swal.getInput();
          if (select) select.size = 10;
        }
      });

      if (selectedNome) {
        const m = currentModels.find((x: any) => x.nome === selectedNome);
        if (m) {
          onSelect(m);
          return m;
        }
      }
    } catch (err) {
      console.error(err);
      setLoadingModels(false);
    }
    return null;
  };

  const openBrandPicker = async (vehicleType: string, onSelect: (brand: {codigo: string, nome: string}) => void) => {
    let currentBrands: any[] = [];
    setLoadingBrands(true);
    try {
      const res = await fetch(`https://parallelum.com.br/fipe/api/v1/${vehicleType}/marcas`);
      const data = await res.json();
      
      let commonBrands: string[] = [];
      if (vehicleType === 'carros') {
        commonBrands = [
          'Fiat', 'VW - VolksWagen', 'GM - Chevrolet', 'Ford', 'Toyota', 'Honda', 
          'Hyundai', 'Renault', 'Peugeot', 'Citroën', 'Mitsubishi', 'Nissan', 
          'Jeep', 'Caoa Chery', 'Chery', 'BYD', 'GWM', 'Mercedes-Benz', 'BMW', 
          'Dodge', 'RAM', 'Porsche', 'Mini', 'Iveco', 'Subaru'
        ].map(b => b.toUpperCase());
      } else if (vehicleType === 'motos') {
        commonBrands = [
            'Honda', 'Yamaha', 'Suzuki', 'BMW', 'Kawasaki', 'Triumph', 'Harley-Davidson',
            'Ducati', 'Royal Enfield', 'KTM', 'Shineray', 'Dafra', 'Vespa'
        ].map(b => b.toUpperCase());
      } else if (vehicleType === 'caminhoes') {
        commonBrands = [
            'Mercedes-Benz', 'Scania', 'Volvo', 'Iveco', 'Volkswagen', 'DAF', 'MAN', 'Ford'
        ].map(b => b.toUpperCase());
      }

      if (Array.isArray(data)) {
        currentBrands = data.filter(brand => 
          commonBrands.length === 0 || commonBrands.some(cb => brand.nome.toUpperCase().includes(cb))
        );
        currentBrands.sort((a, b) => a.nome.localeCompare(b.nome));
        setBrands(currentBrands);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingBrands(false); }

    const { value: selectedCode } = await MySwal.fire({
      title: 'SELECIONE A MARCA',
      input: 'select',
      inputOptions: currentBrands.reduce((acc, curr) => ({ ...acc, [curr.codigo]: curr.nome }), {}),
      inputPlaceholder: 'Pesquisar marca...',
      showCancelButton: true,
      background: '#151515',
      color: '#fff',
      confirmButtonColor: '#CCFF00',
      confirmButtonText: 'SELECIONAR',
      cancelButtonText: 'VOLTAR',
      customClass: {
        confirmButton: 'text-black font-black uppercase'
      },
      inputAttributes: {
        style: 'background: #1a1a1a; color: white; border: 1px solid #333; border-radius: 12px; padding: 12px; margin-top: 20px;'
      },
      didOpen: (popup) => {
        const select = Swal.getInput();
        if (select) select.size = 10;
        const confirmBtn = popup.querySelector('.swal2-confirm') as HTMLElement;
        if (confirmBtn) confirmBtn.style.color = '#000';
      }
    });

    if (selectedCode) {
      const b = currentBrands.find(x => x.codigo === selectedCode);
      if (b) {
        onSelect(b);
        return b;
      }
    }
    return null;
  };

  const handleEditVehicleSwal = async (v: Vehicle, state?: any) => {
    let currentBrand = state?.brand || v.nm_marca || "";
    let currentModel = state?.model || v.nm_modelo || "";
    let currentPlate = state?.plate || v.id_placa || "";
    let currentType = state?.type || 'carros';
    let currentRenavam = state?.renavam || v.nu_renavam || "";
    let currentBrandCode = state?.brandCode || (brands.find(b => b.nome === currentBrand)?.codigo);

    const { value: formValues, isConfirmed } = await MySwal.fire({
      title: 'EDITAR VEÍCULO',
      html: `
        <div class="space-y-4 text-left p-2">
          <div class="space-y-1">
            <label class="text-[10px] font-black text-primary uppercase">Placa</label>
            <input id="edit-plate" class="w-full bg-[#1a1a1a] border border-white/10 p-4 rounded-xl text-white font-bold uppercase" value="${currentPlate}">
            <input id="edit-renavam" type="hidden" value="${currentRenavam}">
          </div>
          <div class="space-y-1">
            <label class="text-[10px] font-black text-primary uppercase">Tipo de Veículo</label>
            <select id="edit-type" class="w-full bg-[#1a1a1a] border border-white/10 p-4 rounded-xl text-white font-bold">
              <option value="carros" ${currentType === 'carros' ? 'selected' : ''}>Carro de Passeio / Utilitário</option>
              <option value="motos" ${currentType === 'motos' ? 'selected' : ''}>Moto / Motociclo</option>
              <option value="caminhoes" ${currentType === 'caminhoes' ? 'selected' : ''}>Caminhão / Ônibus</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1">
              <label class="text-[10px] font-black text-primary uppercase">Marca</label>
              <button id="modal-brand-btn" type="button" class="w-full bg-[#1a1a1a] border border-white/10 p-4 rounded-xl text-white font-bold text-left overflow-hidden whitespace-nowrap text-ellipsis">${currentBrand || 'Selecionar'}</button>
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-black text-primary uppercase">Modelo</label>
              <button id="modal-model-btn" type="button" class="w-full bg-[#1a1a1a] border border-white/10 p-4 rounded-xl text-white font-bold text-left overflow-hidden whitespace-nowrap text-ellipsis" ${!currentBrand ? 'disabled style="opacity: 0.3"' : ''}>${currentModel || 'Selecionar'}</button>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'SALVAR',
      cancelButtonText: 'CANCELAR',
      background: '#151515',
      color: '#fff',
      confirmButtonColor: '#CCFF00',
      didOpen: (popup) => {
        const bBtn = popup.querySelector('#modal-brand-btn') as HTMLButtonElement;
        const mBtn = popup.querySelector('#modal-model-btn') as HTMLButtonElement;
        const pInput = popup.querySelector('#edit-plate') as HTMLInputElement;
        const rInput = popup.querySelector('#edit-renavam') as HTMLInputElement;
        const tSelect = popup.querySelector('#edit-type') as HTMLSelectElement;
        const confirmBtn = popup.querySelector('.swal2-confirm') as HTMLElement;
        if (confirmBtn) confirmBtn.style.color = '#000';

        bBtn.onclick = async () => {
          const res = await openBrandPicker(tSelect.value, () => {});
          if (res) {
            handleEditVehicleSwal(v, {
              plate: pInput.value,
              renavam: rInput.value,
              type: tSelect.value,
              brand: res.nome,
              brandCode: res.codigo,
              model: ""
            });
          } else {
            handleEditVehicleSwal(v, {
                plate: pInput.value,
                renavam: rInput.value,
                type: tSelect.value,
                brand: currentBrand,
                brandCode: currentBrandCode,
                model: currentModel
              });
          }
        };

        mBtn.onclick = async () => {
          if (!currentBrandCode) return;
          const res = await openModelPicker(tSelect.value, currentBrandCode, () => {});
          if (res) {
            handleEditVehicleSwal(v, {
              plate: pInput.value,
              renavam: rInput.value,
              type: tSelect.value,
              brand: currentBrand,
              brandCode: currentBrandCode,
              model: res.nome
            });
          } else {
            handleEditVehicleSwal(v, {
                plate: pInput.value,
                renavam: rInput.value,
                type: tSelect.value,
                brand: currentBrand,
                brandCode: currentBrandCode,
                model: currentModel
              });
          }
        };
      },
      preConfirm: () => {
        const plate = (document.getElementById('edit-plate') as HTMLInputElement).value;
        const renavam = (document.getElementById('edit-renavam') as HTMLInputElement).value;
        
        if (!plate || !currentBrand || !currentModel) {
          Swal.showValidationMessage('Preencha os campos obrigatórios');
          return false;
        }

        // Validação de conformidade antes de permitir o salvamento
        if (!isVehicleFipeCompliant({ nm_marca: currentBrand, nm_modelo: currentModel })) {
          Swal.showValidationMessage('Marca ou Modelo inválidos. Por favor, use o seletor para buscar dados reais.');
          return false;
        }

        return {
          id_veiculo: v.id_veiculo,
          plate,
          renavam,
          brand: currentBrand,
          model: currentModel
        };
      }
    });

    if (isConfirmed && formValues) {
      setEditLoading(true);
      try {
        const resp = await fetch("/api/vehicle/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formValues)
        });
        if (resp.ok) {
          MySwal.fire({ icon: 'success', title: 'Veículo Atualizado', background: '#151515', color: '#fff', timer: 1500, showConfirmButton: false });
          // Força atualização com delay para garantir persistência no banco
          setTimeout(() => {
            if (user?.email) fetchVehicles(user.email);
          }, 500);
        }
      } catch (err) { console.error(err); }
      finally { setEditLoading(false); }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const resp = await fetch("/api/auth/google/url");
      const { url } = await resp.json();
      
      const width = 500;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        "google_auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Backup: poll checkSession periodically while the window is open
      const pollTimer = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(pollTimer);
          // Give it a final check after window closed
          setTimeout(checkSession, 1000);
        } else {
          // If the user authenticated in the popup, /api/auth/me will eventually return the user
          checkSession().then(loggedIn => {
            if (loggedIn) clearInterval(pollTimer);
          });
        }
      }, 2000);

      // Safety timeout
      setTimeout(() => {
        clearInterval(pollTimer);
        setIsLoggingIn(false);
      }, 120000);

    } catch (err) {
      console.error("Auth fetch failed:", err);
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    fetch("/api/fuel-types")
      .then(r => r.json())
      .then(data => {
        const processed = data.map((ft: any) => ({
          ...ft,
          friendlyName: getFriendlyName(ft.ds_produto)
        }));
        setFuelTypes(processed);
      })
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "GET" });
      setUser(null);
      setVehicles([]);
      setSelectedVehicle(null);
      setActiveTab('home');
      setShowProfileMenu(false);
      setMustUpdateVehicles(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const checkSession = async (retryCount = 0, silent = false) => {
    try {
      if (!silent && retryCount === 0) setIsLoadingSession(true);
      
      // Wait for health check in first attempt
      if (retryCount === 0) {
        try {
          const health = await fetch("/api/health");
          if (!health.ok) throw new Error("Health check failed");
        } catch (e) {
          console.warn("Server not ready yet, retrying...", e);
          if (retryCount < 8) { // Increased retries
            return new Promise(resolve => {
              setTimeout(async () => {
                const res = await checkSession(retryCount + 1, silent);
                resolve(res);
              }, 1500);
            });
          }
        }
      }

      const resp = await fetch("/api/auth/me");
      if (resp.ok) {
        const userData = await resp.json();
        setUser(userData);
        if (userData.email) await fetchVehicles(userData.email);
        setIsLoggingIn(false);
        if (!silent) setIsLoadingSession(false); // Success
        return true;
      } else if (resp.status === 401) {
        setUser(null);
        if (!silent) setIsLoadingSession(false); // Not authenticated but check completed
        return false;
      } else {
        throw new Error(`Server error: ${resp.status}`);
      }
    } catch (err) {
      console.error("Session check failed:", err);
      // Only stop loading if we're not retrying or if it's a non-retryable error
      if (retryCount >= 8) {
        if (!silent) setIsLoadingSession(false);
      } else {
        return new Promise(resolve => {
          setTimeout(async () => {
            const res = await checkSession(retryCount + 1, silent);
            resolve(res);
          }, 1500);
        });
      }
    }
    return false;
  };

  const isVehicleFipeCompliant = (v: Vehicle | { nm_marca?: string, nm_modelo?: string }) => {
    const brand = v.nm_marca?.trim() || "";
    const model = v.nm_modelo?.trim() || "";
    
    // Heurística de conformidade FIPE rigorosa:
    if (brand.length < 2 || model.length < 2) return false;
    
    const lowerBrand = brand.toLowerCase();
    const lowerModel = model.toLowerCase();
    
    // 1. Termos de placeholder, legado ou óbvios testes
    const forbidden = [
      "não informado", "nao informado", "n/a", "selecionar", "indefinido", 
      "unknown", "teste", "test", "xxx", "yyy", "zzz", "abc", "123", "placeholder",
      "marca", "modelo", "veiculo", "placa"
    ];
    if (forbidden.some(term => lowerBrand.includes(term) || lowerModel.includes(term))) return false;
    
    // 2. Sequências repetitivas (gibberish). Ex: xxx, 111, aaa.
    // Marcas reais raramente têm 3 letras iguais seguidas.
    const hasRepeatingChars = (str: string) => /(.)\1{2,}/.test(str);
    if (hasRepeatingChars(lowerBrand) || hasRepeatingChars(lowerModel)) return false;

    // 3. Padrão antigo de mesclagem (Marca/Modelo no mesmo campo de marca)
    if (brand.includes("/")) return false;
    
    // 4. Se a marca for igual ao modelo também é suspeito de dado legado/placeholder (exceto se for nome longo)
    if (lowerBrand === lowerModel && brand.length < 8) return false;

    // 5. Somente consoantes (exceto marcas curtas como VW)
    const hasVowels = (str: string) => /[aeiouy]/i.test(str);
    if (lowerBrand.length > 3 && !hasVowels(brand)) return false;

    return true;
  };

  const fetchVehicles = async (email: string) => {
    try {
      // Adicionado timestamp para evitar cache agressivo de navegadores que causa o bloqueio persistente
      const resp = await fetch(`/api/my-vehicles?email=${email}&t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setVehicles(data);
        
        // Verifica conformidade estrita com o padrão FIPE usando a nova heurística
        const nonCompliant = data.filter((v: Vehicle) => !isVehicleFipeCompliant(v));

        if (nonCompliant.length > 0) {
          console.log("[COMPLIANCE] Non-compliant vehicles found:", nonCompliant.map(v => `${v.id_placa}: ${v.nm_marca} / ${v.nm_modelo}`));
          setMustUpdateVehicles(true);
          
          // Alerta de Integridade (Daily Logic)
          const today = new Date().toISOString().split('T')[0];
          const lastIntegrityAlert = localStorage.getItem('last_integrity_alert');
          const isDev = import.meta.env.DEV;

          if (isDev || lastIntegrityAlert !== today) {
            MySwal.fire({
              title: 'ATUALIZAÇÃO NECESSÁRIA',
              html: `
                <div class="text-left space-y-3">
                  <p class="text-sm text-white/70">Identificamos que alguns de seus veículos ainda utilizam o padrão antigo de marcas e modelos.</p>
                  <p class="text-[10px] text-white/50">Sua experiência será limitada até que os dados sejam validados.</p>
                  <div class="bg-primary/10 p-3 rounded-xl border border-primary/20">
                    <p class="text-[10px] text-primary font-black uppercase tracking-widest mb-1">Impacto:</p>
                    <p class="text-[9px] text-white/60">• Precisão nos cálculos de autonomia<br/>• Filtros de combustíveis compatíveis</p>
                  </div>
                </div>
              `,
              icon: 'warning',
              background: '#151515',
              color: '#fff',
              confirmButtonColor: '#CCFF00',
              confirmButtonText: 'ENTENDER',
              customClass: {
                confirmButton: 'text-black font-black uppercase'
              }
            });
            localStorage.setItem('last_integrity_alert', today);
          }
        } else {
          setMustUpdateVehicles(false);
        }

        // Update currently selected vehicle if it exists to pick up new preference data
        if (selectedVehicle) {
          const updated = data.find((v: Vehicle) => v.id_veiculo === selectedVehicle.id_veiculo);
          if (updated) setSelectedVehicle(updated);
        } else if (data.length === 1) {
          setSelectedVehicle(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  const handleDeactivateVehicle = async (vehicleId: number) => {
    const result = await MySwal.fire({
      title: 'Desativar Veículo?',
      text: "Este veículo não aparecerá mais na sua lista.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff5252',
      cancelButtonColor: '#333',
      confirmButtonText: 'SIM, DESATIVAR',
      cancelButtonText: 'CANCELAR',
      background: '#151515',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const resp = await fetch("/api/vehicle/deactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleId })
        });

        if (resp.ok) {
          MySwal.fire({
            title: 'Desativado!',
            text: 'O veículo foi removido da sua lista.',
            icon: 'success',
            background: '#151515',
            color: '#fff',
            timer: 2000,
            showConfirmButton: false
          });
          if (user?.email) await fetchVehicles(user.email);
          if (selectedVehicle?.id_veiculo === vehicleId) {
            setSelectedVehicle(null);
          }
        } else {
          const errData = await resp.json();
          MySwal.fire({
            title: 'Erro',
            text: errData.error || 'Erro ao desativar veículo',
            icon: 'error',
            background: '#151515',
            color: '#fff'
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const fetchStats = async (vehicleId?: number) => {
    try {
      setIsLoadingStats(true);
      const url = vehicleId ? `/api/user/stats?id_veiculo=${vehicleId}` : "/api/user/stats";
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleRegisterSubmit = async (formData: { phone: string }) => {
    console.log("[DEBUG] handleRegisterSubmit started", formData);
    try {
      setIsLoggingIn(true);
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      
      console.log("[DEBUG] Register response status:", resp.status);
      const data = await resp.json();
      
      if (resp.ok) {
        console.log("[DEBUG] Register success", data);
        if (data.verifyLink) {
           console.log("SIMULATED EMAIL LINK:", data.verifyLink);
        }
        if (data.message) {
          MySwal.fire({
            icon: 'info',
            title: 'Cadastro',
            text: data.message,
            background: '#151515',
            color: '#fff',
            confirmButtonColor: '#ccff00'
          });
        }
        await checkSession();
      } else {
        console.error("[DEBUG] Register error data:", data);
        MySwal.fire({
          icon: 'error',
          title: 'Erro no Cadastro',
          text: data.error || "Erro ao processar cadastro.",
          background: '#151515',
          color: '#fff',
          confirmButtonColor: '#ccff00'
        });
      }
    } catch (err) {
      console.error("[DEBUG] Registration exception:", err);
      MySwal.fire({
        icon: 'error',
        title: 'Erro de Conexão',
        text: "Erro de conexão ao enviar cadastro.",
        background: '#151515',
        color: '#fff',
        confirmButtonColor: '#ccff00'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleVehicleSetup = async (vehicleData: { plate: string, renavam: string, brand: string, model: string }) => {
    console.log("[DEBUG] Starting handleVehicleSetup with:", vehicleData);
    try {
      setIsLoggingIn(true);
      const resp = await fetch("/api/my-vehicle/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vehicleData)
      });
      
      console.log("[DEBUG] Vehicle setup response status:", resp.status);
      const data = await resp.json();
      console.log("[DEBUG] Vehicle setup response data:", data);
      
      if (resp.ok) {
        MySwal.fire({
          icon: 'success',
          title: 'Veículo Cadastrado!',
          text: 'Seu acesso foi liberado com sucesso.',
          background: '#151515',
          color: '#fff',
          confirmButtonColor: '#ccff00',
          timer: 2000
        });
        
        if (user) await fetchVehicles(user.email);
        await checkSession();
      } else {
        const errorMsg = data.error || 'Não foi possível salvar os dados do veículo.';
        alert("Erro no Servidor: " + errorMsg); // User requested alert
        MySwal.fire({
          icon: 'error',
          title: 'Erro ao cadastrar',
          text: errorMsg,
          background: '#151515',
          color: '#fff',
          confirmButtonColor: '#ccff00'
        });
      }
    } catch (err) {
      console.error("[DEBUG] Vehicle setup exception:", err);
      alert("Erro de Conexão: " + (err instanceof Error ? err.message : String(err))); // User requested alert
      MySwal.fire({
        icon: 'error',
        title: 'Erro de Conexão',
        text: 'Não foi possível se comunicar com o servidor.',
        background: '#151515',
        color: '#fff'
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    // Listen for OAuth messages
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const userData = event.data.user;
        setUser(userData);
        if (userData.email) await fetchVehicles(userData.email);
        setActiveTab('home');
        setIsLoggingIn(false);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        alert(event.data.error);
        setIsLoggingIn(false);
      }
    };
    
    window.addEventListener('message', handleOAuthMessage);
    
    // Manage scanner state
    if (activeTab === 'scanner' && !scanResult) {
      // Small delay to ensure DOM is ready and any transitions finished
      const timer = setTimeout(() => {
        startScanner();
      }, 500); 
      return () => {
        clearTimeout(timer);
        window.removeEventListener('message', handleOAuthMessage);
      };
    } else if (activeTab !== 'scanner' || scanResult) {
      stopScanner();
    }

    return () => {
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, [activeTab, scanResult]);

  useEffect(() => {
    if (user && !user.registerRequired) {
      fetchStats(selectedVehicle?.id_veiculo);
    }
    // Close profile menu on user change (login/logout/identity shift)
    setShowProfileMenu(false);
  }, [user, selectedVehicle]);

  const startScanner = async () => {
    if (isScanning) return;
    
    try {
      setPermissionError(false);

      // Ensure any previous instance is fully cleared
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {}
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      // Wait for the 'reader' element with a retry loop
      let container = document.getElementById(videoRegionId);
      let retries = 10;
      while (!container && retries > 0) {
        await new Promise(r => setTimeout(r, 100));
        container = document.getElementById(videoRegionId);
        retries--;
      }

      if (!container) {
        console.error(`[SCANNER] Element #${videoRegionId} not found in DOM`);
        setPermissionError(true);
        return;
      }

      // Start fresh
      scannerRef.current = new Html5Qrcode(videoRegionId);
      setIsScanning(true);
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        { 
          fps: 10, 
          aspectRatio: 1.0
        },
        async (decodedText) => {
          console.log("QR Code detected:", decodedText);
          await stopScanner();
          
          if (user && vehicles.length > 1 && !selectedVehicle) {
            setPendingScan(decodedText);
            setShowVehiclePicker(true);
            return;
          }

          if (user && vehicles.length === 1) {
            setScanMessage(`CADASTRADO NO VEÍCULO: ${vehicles[0].id_placa}`);
            setTimeout(() => setScanMessage(null), 5000);
          }

          saveScan(decodedText, selectedVehicle?.id_veiculo || (vehicles.length === 1 ? vehicles[0].id_veiculo : undefined));
        },
        () => {}
      );
    } catch (err) {
      setIsScanning(false);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (
        (err instanceof Error && err.name === "NotAllowedError") || 
        errorMessage.includes("Permission denied") || 
        errorMessage.includes("NotAllowedError")
      ) {
        console.warn("Camera permission denied (expected in iframe). Showing fallback UI.");
        setPermissionError(true);
      } else {
        console.error("Error starting scanner:", err);
      }
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) {
      setIsScanning(false);
      return;
    }

    try {
      if (scannerRef.current.isScanning) {
        console.log("[SCANNER] Stopping scanner...");
        await scannerRef.current.stop();
      }
      scannerRef.current.clear();
      scannerRef.current = null;
    } catch (err) {
      console.error("Error stopping scanner:", err);
    } finally {
      setIsScanning(false);
      setIsTorchOn(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setIsTorchOn(false);
    setPermissionError(false);
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !isScanning) return;
    
    try {
      const newState = !isTorchOn;
      let success = false;

      // Method 1: Try to get the track directly from the video element (most reliable across devices)
      const videoEl = document.querySelector(`#${videoRegionId} video`) as HTMLVideoElement;
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        
        if (track) {
          try {
            // Check capabilities if possible
            const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
            
            // Try standard advanced constraint
            // @ts-ignore - torch is not in standard TS types yet
            await track.applyConstraints({ 
              advanced: [{ torch: newState }] 
            } as any);
            success = true;
          } catch (e1) {
            try {
              // Try direct constraint (works on some specific Samsung models)
              await track.applyConstraints({ torch: newState } as any);
              success = true;
            } catch (e2) {
              console.warn("Direct track constraints failed", e2);
            }
          }
        }
      }

      // Method 2: Fallback to html5-qrcode's built-in method if Method 1 didn't work
      if (!success && scannerRef.current) {
        try {
          // @ts-ignore
          await scannerRef.current.applyVideoConstraints({
            advanced: [{ torch: newState }]
          });
          success = true;
        } catch (e) {
          console.warn("Scanner applyVideoConstraints failed", e);
        }
      }

      if (success) {
        setIsTorchOn(newState);
      } else {
        // Silent fail or minimal log to avoid disrupting the user if it's genuinely not supported
        console.warn("Torch not supported on this device/browser combination.");
      }
    } catch (err) {
      console.error("Error toggling torch:", err);
    }
  };

  const saveScan = async (url: string, vehicleId?: number) => {
    try {
      const response = await fetch("/api/save-qrcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, vehicleId }),
      });

      if (response.ok) {
        setScanResult(url);
        fetchStats(selectedVehicle?.id_veiculo);
      } else {
        alert("Erro ao salvar no banco de dados.");
        startScanner();
      }
    } catch (err) {
      console.error("Error saving QR code:", err);
      alert("Erro de conexão com o servidor.");
      startScanner();
    }
  };

  const handleVehicleSelect = (v: Vehicle) => {
    setSelectedVehicle(v);
    setShowVehiclePicker(false);
    if (pendingScan) {
      saveScan(pendingScan, v.id_veiculo);
      setPendingScan(null);
    }
  };

  const renderWithSimulator = (content: ReactNode) => {
    if (!shouldShowSimulator) {
      return (
        <div className="w-full min-h-screen bg-background text-foreground">
          {content}
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-[#030603] text-white flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 p-3 md:p-6 overflow-y-auto selection:bg-primary selection:text-black">
        {/* Left Side: Desktop Control / Info Panel */}
        <div className="max-w-md w-full flex flex-col space-y-4 text-left shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 border border-primary/20 rounded-2xl flex items-center justify-center p-2 shadow-[0_0_20px_rgba(204,255,0,0.2)]">
              <img src="/Logo_maker_project.png" className="w-full h-full object-contain" alt="" />
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <h1 className="text-lg font-black uppercase leading-none">
                  <span className="text-white">Enche o </span>
                  <span className="text-amber-400">Tanque</span>
                </h1>
                <span className="text-[8px] font-black text-primary/50 uppercase">PWA v2.2.0</span>
              </div>
              <p className="text-[8px] text-white/50 uppercase font-bold tracking-widest mt-1">Ambiente de Testes / Homologação</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/25 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black tracking-widest text-primary uppercase">Simulador APK Instalado</span>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-white">Domínio Oficial Exclusivo</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Este aplicativo está configurado para operar como um PWA instalado mobile <strong className="text-white">APENAS</strong> sob a URL oficial: <a href="http://app.encheotanque.net.br" className="text-primary hover:underline font-bold">app.encheotanque.net.br</a>.
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                Neste ambiente de homologação, apresentamos o sistema em nosso simulador de APK. Interaja diretamente com a tela do smartphone ao lado!
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5 text-[10px] text-white/70 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-primary shrink-0" />
                <span>Simulação fiel da tela inicial mobile</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-primary shrink-0" />
                <span>Compatibilidade de layout responsivo PWA</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-primary shrink-0" />
                <span>Scanner de NF-e e Georreferenciamento ativos</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a 
              href="http://app.encheotanque.net.br" 
              className="flex-1 px-4 py-3 bg-primary hover:bg-primary/95 text-black font-black text-[10px] tracking-widest uppercase rounded-2xl text-center active:scale-95 transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)]"
            >
              Acessar URL Oficial
            </a>
            <button 
              onClick={() => setBypassSimulator(true)}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white font-black text-[10px] tracking-widest uppercase rounded-2xl active:scale-95 transition-all"
            >
              Tela Cheia
            </button>
          </div>
        </div>

        {/* Right Side: Virtual Smartphone Mockup */}
        <div className="relative shrink-0 my-2">
          {/* Bezel */}
          <div className="relative w-[340px] h-[720px] bg-[#0c0e0c] border-[6px] border-[#222421] rounded-[50px] p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col select-none ring-1 ring-white/10">
            {/* Inner viewport */}
            <div className="flex-1 w-full h-full bg-background rounded-[38px] overflow-hidden border border-[#222421] relative flex flex-col select-text simulator-viewport">
              {/* Top notch */}
              <div className="absolute top-0 inset-x-0 h-8 bg-black flex justify-between items-center px-6 z-[100] text-[8px] font-mono text-white/50 select-none pointer-events-none">
                <span className="font-bold">
                  {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                <div className="w-14 h-3.5 bg-neutral-900 rounded-full flex items-center justify-center border border-white/5">
                  <div className="w-4 h-1 bg-black rounded-full" />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[7px]">LTE</span>
                  <div className="w-5 h-2.5 border border-white/30 rounded-sm p-0.5 flex items-center">
                    <div className="h-full w-full bg-primary rounded-2xs" />
                  </div>
                </div>
              </div>

              {/* Viewport contents */}
              <div className="flex-1 w-full h-full pt-8 pb-3 relative overflow-hidden flex flex-col">
                {content}
              </div>

              {/* Virtual Home Bar */}
              <div className="absolute bottom-1 inset-x-0 h-1.5 flex justify-center items-center z-[100] pointer-events-none">
                <div className="w-20 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoadingSession || isUpdatingPWA || !minSplashComplete) {
    return renderWithSimulator(
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
        {/* Background Map Shading */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           <img 
             id="loading-bg-map"
             src="/different-colours-gas-station-pumps-reduzido.jpg" 
             className="w-full h-full object-cover grayscale brightness-[2] contrast-150 opacity-60 scale-110 rotate-1 mix-blend-screen" 
             alt="" 
             referrerPolicy="no-referrer"
           />
           <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background opacity-50" />
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_40%,var(--color-background)_90%)]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-col items-center gap-6 w-full max-w-xs"
        >
          <div className="relative group">
            <div className="w-32 h-32 bg-surface-container/30 border border-white/5 rounded-[40px] flex items-center justify-center p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden">
                <img src="/Logo_maker_project.png" className="w-full h-full object-contain" alt="Enche o Tanque" />
                <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   className="absolute -inset-2 border-t-2 border-primary rounded-[45px] opacity-20"
                />
            </div>
            {/* Pulsing light effect */}
            <div className="absolute -inset-4 bg-primary/10 rounded-[50px] blur-2xl animate-pulse -z-10" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-white font-black uppercase tracking-widest text-sm drop-shadow-md">
              {isUpdatingPWA ? "Atualizando o app" : "Inicializando o app"}
            </h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
              {isUpdatingPWA ? "Instalando nova versão..." : "Sincronizando dados..."}
            </p>
            <div className="pt-2">
              <span className="text-[9px] font-black text-primary/50 uppercase tracking-[0.2em] border border-primary/20 px-3 py-1 rounded-full bg-primary/5 backdrop-blur-sm">
                v2.2.0
              </span>
            </div>
          </div>

          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: isUpdatingPWA ? "100%" : `${loadingProgress}%` }}
              className="h-full bg-primary shadow-[0_0_10px_#CCFF00]"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return renderWithSimulator(
      <LandingPage 
        onLogin={handleGoogleLogin} 
        isLoading={isLoggingIn} 
        onShowPrivacy={() => setShowPrivacy(true)}
        onShowTerms={() => setShowTerms(true)}
        onDevLogin={async (email, tab) => {
          setIsLoadingSession(true);
          try {
            const resp = await fetch(`/api/auth/dev-login?email=${email}`);
            if (resp.ok) {
              await checkSession();
              if (tab) {
                const tabMap: Record<string, any> = {
                  'home': 'home',
                  'history': 'history',
                  'profile': 'profile',
                  'scanner': 'scanner',
                  'search': 'search'
                };
                if (tabMap[tab]) setActiveTab(tabMap[tab]);
              }
            }
          } catch (e) {
            console.error("Dev login failed", e);
          } finally {
            setIsLoadingSession(false);
          }
        }}
      />
    );
  }

  // Handle Registration State
  if (user.registerRequired) {
    return renderWithSimulator(<RegistrationView user={user} onSubmit={handleRegisterSubmit} isLoading={isLoggingIn} onLogout={handleLogout} />);
  }

  // Handle Verification State
  if (user.status === 'PENDING_VERIFICATION') {
    return renderWithSimulator(
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(circle_at_50%_-20%,rgba(255,215,0,0.1),transparent_70%)]">
        <div className="w-20 h-20 bg-green-400/20 rounded-[2rem] flex items-center justify-center mb-6 neon-glow-green border border-green-400/20">
          <Clock className="w-10 h-10 text-green-400 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase mb-2 tracking-tight">Verifique seu E-mail</h2>
        <p className="text-white/40 mb-10 max-w-xs text-sm font-medium leading-relaxed">
          Enviamos um link de confirmação para <span className="text-white font-bold">{user.email}</span>.<br />
          <b>Confira também na caixa de Spam.</b>
        </p>
        
        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={checkSession} 
            disabled={isLoadingSession}
            className="w-full py-5 bg-primary text-black font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,215,0,0.2)] disabled:opacity-50"
          >
            {isLoadingSession ? <Loader2 className="animate-spin text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> : <RefreshCw size={18} />}
            {isLoadingSession ? "Verificando..." : "Já Verifiquei"}
          </button>
          
          <button 
            onClick={async () => {
              try {
                const resp = await fetch("/api/auth/resend-verification", { method: "POST" });
                const data = await resp.json();
                alert(data.message || data.error);
              } catch (e) {
                alert("Erro ao tentar reenviar.");
              }
            }}
            className="w-full py-4 text-white/40 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors"
          >
            Reenviar e-mail de confirmação
          </button>
        </div>

        <button 
          onClick={handleLogout} 
          className="mt-12 text-white/20 font-bold uppercase text-[10px] tracking-widest hover:text-red-400 transition-colors"
        >
          Sair do App
        </button>
      </div>
    );
  }

  // Handle Approval State
  if (user.status === 'WAITING_APPROVAL') {
    return renderWithSimulator(
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(circle_at_50%_-20%,rgba(0,210,100,0.1),transparent_70%)]">
        <div className="w-20 h-20 bg-green-400/20 rounded-[2rem] flex items-center justify-center mb-6 neon-glow-green border border-green-400/20">
          <ShieldCheck className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase mb-2 tracking-tight">Em Análise</h2>
        <p className="text-white/40 mb-10 max-w-xs text-sm font-medium leading-relaxed">
          Seu e-mail foi verificado com sucesso! Agora, o time de administração precisa aprovar seu perfil.
        </p>
        
        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={checkSession} 
            disabled={isLoadingSession}
            className="w-full py-5 bg-surface-container border border-white/10 text-white font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoadingSession ? <Loader2 className="animate-spin text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> : <RefreshCw size={18} />}
            {isLoadingSession ? "Verificando..." : "Atualizar Status"}
          </button>
          <p className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em] animate-pulse">Aguardando aprovação manual</p>
        </div>

        <button 
          onClick={handleLogout} 
          className="mt-12 text-white/20 font-bold uppercase text-[10px] tracking-widest hover:text-red-400 transition-colors"
        >
          Sair do App
        </button>
      </div>
    );
  }

  // Handle Suspended/Rejected States
  if (user.status === 'SUSPENDED' || user.status === 'REJECTED') {
    const isRejected = user.status === 'REJECTED';
    return renderWithSimulator(
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <Trash2 className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase mb-4">
          {isRejected ? 'Acesso Negado' : 'Conta Suspensa'}
        </h2>
        <p className="text-white/40 mb-8 max-w-xs">
          {isRejected 
            ? 'Seu cadastro não foi aprovado pela administração no momento.' 
            : 'Sua conta foi temporariamente suspensa. Entre em contato com Marcio ou Giovana.'}
        </p>
        <button onClick={handleLogout} className="w-full max-w-xs py-4 bg-surface-container border border-red-500/20 text-red-500 font-black rounded-2xl uppercase tracking-widest text-xs">
          Sair do App
        </button>
      </div>
    );
  }

  // Handle Vehicle Requirement
  if (user.status === 'AUTHORIZED' && vehicles.length === 0) {
    return renderWithSimulator(
      <VehicleSetupView 
        onSubmit={handleVehicleSetup} 
        isLoading={isLoggingIn} 
        onLogout={handleLogout} 
        openBrandPicker={openBrandPicker}
        openModelPicker={openModelPicker}
        loadingBrands={loadingBrands}
        loadingModels={loadingModels}
      />
    );
  }

  const handleStartSearch = () => {
    if (stats && !stats.canSearch && !expirationWarningSeen) {
      MySwal.fire({
        title: '<span style="color: #fff; font-family: \'Inter\', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">Aviso de Acesso</span>',
        html: `
          <div style="color: #ccc; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; padding: 10px; text-align: center;">
            <p style="margin-bottom: 12px;">Para buscar postos e ver os melhores preços, é necessário ter <b>contribuído com uma Nota Fiscal</b> nos últimos 7 dias.</p>
            <p style="margin-bottom: 12px; color: #ccff00; font-weight: 700;">No momento, o acesso não será bloqueado, mas em breve o envio da nota será obrigatório para o funcionamento do app.</p>
            <p style="margin-bottom: 12px;">Colabore com a comunidade para manter os preços atualizados para todos!</p>
            <p style="font-size: 11px; opacity: 0.6; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">Mantenha seus abastecimentos atualizados para evitar futuros bloqueios.</p>
          </div>
        `,
        icon: 'info',
        iconColor: '#ccff00',
        background: '#151515',
        showCancelButton: true,
        confirmButtonText: 'ESCANEAR AGORA',
        cancelButtonText: 'MAIS TARDE (ACESSAR)',
        confirmButtonColor: '#ccff00',
        cancelButtonColor: 'transparent',
        customClass: {
          popup: 'rounded-3xl border border-white/10',
          confirmButton: 'rounded-xl font-black py-4 px-6 text-black',
          cancelButton: 'text-xs opacity-50 uppercase font-bold tracking-widest'
        }
      }).then((result) => {
        setExpirationWarningSeen(true);
        if (result.isConfirmed) {
          setActiveTab('scanner');
        } else {
          setActiveTab('search');
        }
      });
      return;
    }
    setActiveTab('search');
  };

  return renderWithSimulator(
    <div className="flex flex-col h-screen bg-background overflow-hidden relative" onClick={() => setShowProfileMenu(false)}>
      {/* Changelog Modal */}
      <AnimatePresence>
        {showChangelog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-container-highest w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-white/5 bg-primary/5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="text-primary" size={24} />
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase">Changelog</h2>
                  </div>
                  <p className="text-on-surface-variant text-sm opacity-70">
                    Confira as novidades do Enche o Tanque
                  </p>
                </div>
                <button 
                  onClick={() => setShowChangelog(false)}
                  className="p-2 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* 11/06/2026 - Item 2.2.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(204,255,0,0.8)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v2.2.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">11/06/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE: ESTRUTURA DE TANCAGEM & AUDITORIA</span>
                    <p className="text-sm font-bold text-white">Sincronização Avançada da Tancagem ANP</p>
                    <ul className="text-xs text-on-surface-variant opacity-70 leading-relaxed list-disc pl-4 space-y-1">
                      <li>⚙️ Sincronizador de Tancagem: Sincronização diária estrutural da matriz de tancagem e bicos oficiais das distribuidoras direto da ANP API.</li>
                      <li>🔔 Decomissionamento de Combustíveis: Remoção/ativação inteligente de combustíveis com base no andamento operacional da ANP.</li>
                      <li>📑 Logs de Auditoria & Notificações: Logs permanentes de transações de sincronização com disparos informativos aos admins.</li>
                    </ul>
                  </div>
                </div>

                {/* 11/06/2026 - Item 2.1.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary/60 uppercase tracking-widest">v2.1.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">11/06/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE: FALE CONOSCO IA & ACESSIBILIDADE</span>
                    <p className="text-sm font-bold text-white/80">IA e Confirmações Personalizadas</p>
                    <ul className="text-xs text-on-surface-variant opacity-60 leading-relaxed list-disc pl-4 space-y-1">
                     <li>📬 Confirmação Recebimento: Usuários agora recebem notificações automáticas legíveis, elegantes e bem estruturadas.</li>
                      <li>👁️ Acessibilidade & Contraste: Layout de e-mail redesenhado com tons esmeralda de excelente contraste e legibilidade.</li>
                    </ul>
                  </div>
                </div>

                {/* 11/06/2026 - Item 2.0.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary/60 uppercase tracking-widest">v2.0.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">11/06/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE: MAPAS & ESTIMATIVAS</span>
                    <p className="text-sm font-bold text-white/80">Filtros Inteligentes de Bandeiras</p>
                    <ul className="text-xs text-on-surface-variant opacity-60 leading-relaxed list-disc pl-4 space-y-1">
                      <li>🏷️ Preços Direto no Mapa: Assista aos valores de preços de combustíveis de cada posto direto na marcação do mapa de cobertura.</li>
                      <li>🗂️ Identificação por Bandeiras: Filtre instantaneamente as localizações no mapa pelas bandeiras de sua preferência.</li>
                      <li>📈 Economia Personalizada & Média Municipal: Novo indicador de potencial de economia, além do preço médio local em destaque.</li>
                      <li>📸 Instagram Integrado: Perfil no Instagram ativado.</li>
                    </ul>
                  </div>
                </div>

                {/* 30/05/2026 - Item 1.9.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary/60 uppercase tracking-widest">v1.9.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">30/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE EXTRA: MINAS GERAIS & RADAR DISTÂNCIA</span>
                    <p className="text-sm font-bold text-white">Juiz de Fora Habilitada & Radar de Distâncias</p>
                    <ul className="text-xs text-on-surface-variant opacity-70 leading-relaxed list-disc pl-4 space-y-1">
                      <li>🔺 Minas Gerais Ativo: Base de 84 postos integrados em Juiz de Fora-MG mapeados com geolocalização exata em banco de dados.</li>
                      <li>🎯 Radar Concentrico: Medidores dinâmicos de distância real (anéis concêntricos) adicionados ao mapa para visualização espacial intuitiva.</li>
                    </ul>
                  </div>
                </div>

                {/* 29/05/2026 - Item 1.8.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary/60 uppercase tracking-widest">v1.8.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">29/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE: PREÇOS ANP E FONTES HÍBRIDAS</span>
                    <p className="text-sm font-bold text-white/80">Sincronização Diária Integrada</p>
                    <ul className="text-xs text-on-surface-variant opacity-60 leading-relaxed list-disc pl-4 space-y-1">
                      <li>🔄 Sincronização Diária ANP: O aplicativo agora coleta e atualiza preços diariamente direto da pesquisa semanal oficial da ANP.</li>
                      <li>📑 Multifontes de Dados: Os dados de preços agora são compostos de modo híbrido combinando cupons fiscais (NFes) e pesquisas ANP.</li>
                      <li>🚫 Ajuste Territorial: Desativação do município de Teresópolis da nossa base devido a não cobertura pelas pesquisas da ANP.</li>
                    </ul>
                  </div>
                </div>

                {/* 18/05/2026 - Item 1.7.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary/60 uppercase tracking-widest">v1.7.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">18/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE: ANÁLISES & INSIGHTS</span>
                    <p className="text-sm font-bold text-white/80">Painel de Métricas e Performance</p>
                    <ul className="text-xs text-on-surface-variant opacity-60 leading-relaxed list-disc pl-4 space-y-1">
                      <li>📊 Central de Análises: Novo botão consolidado no menu inferior.</li>
                      <li>📉 Insights do Tanque: Acompanhamento de economia mensal e tendências de preço.</li>
                      <li>🍰 Gráficos de Consumo: Gasto por combustível e histórico de postos.</li>
                    </ul>
                  </div>
                </div>

                {/* 18/05/2026 - Item 1.6.0 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 border border-primary" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.6.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">18/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE: RANKING</span>
                    <p className="text-sm font-bold text-white">Lançamento de Rankings de Preços</p>
                    <ul className="text-xs text-on-surface-variant opacity-70 leading-relaxed list-disc pl-4 space-y-1">
                      <li>🏆 Rankings de Postos, Bairros e Bandeiras: Visualize os preços mais baixos e altos da região.</li>
                      <li>🥇 Top 3 em Destaque: Foco nos melhores e piores preços por categoria e combustível.</li>
                      <li>🍱 Menu Reorganizado: Feedback no topo e Rankings com lugar de destaque no menu inferior.</li>
                      <li>⚡ Filtros Rápidos: Alternância instantânea entre tipos de combustível.</li>
                    </ul>
                  </div>
                </div>

                {/* 17/05/2026 - Item 1 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/40">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40 shadow-[0_0_10px_rgba(204,255,0,0.3)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary/60 uppercase tracking-widest">v1.5.1</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">17/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-tighter mb-1">CORREÇÃO</span>
                    <p className="text-sm font-bold text-white/80">Recadastro de Veículos</p>
                    <ul className="text-xs text-on-surface-variant opacity-60 leading-relaxed list-disc pl-4 space-y-1">
                      <li>Bug Fix: Corrigido travamento na tela de atualização obrigatória de veículos após o salvamento.</li>
                    </ul>
                  </div>
                </div>

                {/* 15/05/2026 - Item 1 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(204,255,0,0.5)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.5.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">15/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-tighter mb-1">NOVIDADE</span>
                    <p className="text-sm font-bold text-white">Expansão de Cobertura de Postos</p>
                    <ul className="text-xs text-on-surface-variant opacity-70 leading-relaxed list-disc pl-4 space-y-1">
                      <li>Novos Municípios: Habilitada base de dados oficial da ANP para <b>Rio de Janeiro</b>, <b>Niterói</b> e <b>Teresópolis</b>.</li>
                      <li>Sincronização: Vinculação automática de produtos e tancagem via cruzamento de CNPJ.</li>
                    </ul>
                  </div>
                </div>

                {/* 03/05/2026 - Item 1 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(204,255,0,0.5)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.4.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">03/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-tighter mb-1">INTEGRIDADE & CORE</span>
                    <p className="text-sm font-bold text-white">Sistema de Integridade de Dados (Data Lock)</p>
                    <ul className="text-xs text-on-surface-variant opacity-70 leading-relaxed list-disc pl-4 space-y-1">
                      <li>Bloqueio de Conformidade: Acesso restrito a usuários com veículos em formato legado (fora do padrão FIPE).</li>
                      <li>Alertas Proativos: Notificações inteligentes sobre a saúde dos dados cadastrais ao abrir o App.</li>
                      <li>Busca FIPE Robusta: Integração em tempo real para Carros, Motos e Caminhões via API oficial.</li>
                      <li>UX de Edição: Novo fluxo encadeado de seleção de Marca/Modelo sem fechamento do formulário.</li>
                      <li>Padronização Tech-Dark: Unificação visual de todos os modais do sistema.</li>
                    </ul>
                  </div>
                </div>

                {/* 03/05/2026 - Item PWA */}
                <div className="space-y-3 relative pl-6 border-l-2 border-white/5">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white/20" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white/40 uppercase tracking-widest">v1.3.5</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">03/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-tighter mb-1">LOCALIZAÇÃO & PWA</span>
                    <p className="text-sm font-bold text-white/60">Formatação Brasileira e Suporte PWA</p>
                    <ul className="text-xs text-white/40 leading-relaxed list-disc pl-4 space-y-1">
                      <li>Formatação BR: Valores numéricos com padrão decimal brasileiro (,).</li>
                      <li>App Nativo: Web app agora instalável na tela inicial via modo PWA.</li>
                    </ul>
                  </div>
                </div>

                {/* 02/05/2026 - Item 1 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_rgba(204,255,0,0.5)]" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.3.0</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">02/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-tighter mb-1">MELHORIA UI/UX</span>
                    <p className="text-sm font-bold text-white">Redesign Minimalista & Navegação</p>
                    <ul className="text-xs text-on-surface-variant opacity-70 leading-relaxed list-disc pl-4 space-y-1">
                      <li>Otimização do Rodapé: Altura do menu reduzida para ampliar a área de navegação.</li>
                      <li>Tipografia: Removida estilização em itálico de todo o aplicativo.</li>
                      <li>Filtros do Histórico: Renomeados para PROCESSADAS, PROCESSANDO e REJEITADAS.</li>
                      <li>Detalhamento de Notas: Implementado resumo de Total NFe e Total Economia (por abastecimento e por posto).</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.2.5</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">02/05/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-tighter mb-1">PROCESSAMENTO</span>
                    <p className="text-sm font-bold text-white">Log de Processamento & Automação</p>
                    <p className="text-xs text-on-surface-variant opacity-70 leading-relaxed">
                      Implementado timestamps nos logs de processamento de QR Codes. Adicionada lógica de descarte automático (status 2) para notas de postos não cadastrados ou erros críticos na SEFAZ.
                    </p>
                  </div>
                </div>

                {/* 30/04/2026 - Item 1 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.2.4</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">30/04/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-tighter mb-1">CORRIGIDO</span>
                    <p className="text-sm font-bold text-white">Correção na Lanterna (Torch API)</p>
                    <p className="text-xs text-on-surface-variant opacity-70 leading-relaxed">
                      Corrigido problema intermitente no acionamento da lanterna em dispositivos móveis via Scanner. Implementado fallback de compatibilidade.
                    </p>
                  </div>
                </div>

                {/* 30/04/2026 - Item 2 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.2.3</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">30/04/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-tighter mb-1">ADICIONADO</span>
                    <p className="text-sm font-bold text-white">Suporte Completo a PWA</p>
                    <p className="text-xs text-on-surface-variant opacity-70 leading-relaxed">
                      Agora é possível instalar o web app diretamente na tela inicial do celular. Ícones otimizados e suporte a modo standalone ativado.
                    </p>
                  </div>
                </div>

                {/* 30/04/2026 - Item 3 */}
                <div className="space-y-3 relative pl-6 border-l-2 border-primary/20">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary/40" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-primary uppercase tracking-widest">v1.2.2</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase">30/04/2026</span>
                  </div>
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-tighter mb-1">MELHORADO</span>
                    <p className="text-sm font-bold text-white">Rastreabilidade de Cadastro</p>
                    <p className="text-xs text-on-surface-variant opacity-70 leading-relaxed">
                      Implementado registro automático de data e hora (`dt_cadastro`) para novos motoristas no banco de dados.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-surface-container border-t border-white/5">
                <button 
                  onClick={() => setShowChangelog(false)}
                  className="w-full bg-primary text-black font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(204,255,0,0.2)] active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-container-highest w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-white/5 bg-primary/5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="text-primary" size={24} />
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase">Privacidade</h2>
                  </div>
                  <p className="text-on-surface-variant text-sm opacity-70">
                    Como cuidamos dos seus dados
                  </p>
                </div>
                <button 
                  onClick={() => setShowPrivacy(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-6 text-white/70 text-sm custom-scrollbar leading-relaxed">
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">1. Coleta de Informações</h3>
                  <p>Ao utilizar o login pelo Google, coletamos apenas as informações básicas autorizadas por você: seu nome, endereço de e-mail e foto do perfil.</p>
                </section>
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">2. Uso dos Dados</h3>
                  <p>As informações são usadas exclusivamente para personalizar sua experiência, gerenciar seu histórico de abastecimentos e fornecer relatórios de economia.</p>
                </section>
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">3. Compartilhamento</h3>
                  <p>O Enche o Tanque não vende ou transfere seus dados pessoais para terceiros. Seus dados de frota são privados e vinculados à sua conta.</p>
                </section>
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">4. Segurança</h3>
                  <p>Utilizamos criptografia e autenticação segura via Google OAuth 2.0 para garantir que apenas você acesse suas informações.</p>
                </section>
                <div className="pt-4 border-t border-white/5 text-[9px] uppercase tracking-[0.2em] opacity-40">
                  Última atualização: 16 de maio de 2026
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terms of Service Modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-surface-container-highest w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-white/5 bg-primary/5 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-primary" size={24} />
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase">Termos de Uso</h2>
                  </div>
                  <p className="text-on-surface-variant text-sm opacity-70">
                    Regras e condições de uso
                  </p>
                </div>
                <button 
                  onClick={() => setShowTerms(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-8 space-y-6 text-white/70 text-sm custom-scrollbar leading-relaxed">
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">1. Aceitação</h3>
                  <p>Ao acessar o Enche o Tanque, você concorda com estes termos. O serviço é fornecido "como está" para auxílio na gestão de abastecimentos.</p>
                </section>
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">2. Responsabilidade</h3>
                  <p>Você é responsável pela veracidade dos dados inseridos (KM, valores de bomba, etc). O app não garante preços em postos específicos em tempo real.</p>
                </section>
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">3. Uso Aceitável</h3>
                  <p>É proibido o envio de dados falsos ou tentativas de burlar os sistemas de integridade do aplicativo.</p>
                </section>
                <section>
                  <h3 className="text-white font-bold mb-2 uppercase tracking-widest text-[10px]">4. Modificações</h3>
                  <p>Reservamo-nos o direito de atualizar o serviço e estes termos periodicamente para melhor atender nossos usuários.</p>
                </section>
                <div className="pt-4 border-t border-white/5 text-[9px] uppercase tracking-[0.2em] opacity-40">
                  Última atualização: 16 de maio de 2026
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Guide Modal */}
      <AnimatePresence>
        {showIosInstallGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="bg-surface-container-highest w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col p-6 text-center text-white"
            >
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowIosInstallGuide(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-full transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center mt-2 mb-6">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-4">
                  <img src="/Logo_maker_project.png" className="w-12 h-12 rounded-xl" alt="Logo" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Instalar Enche o Tanque</h3>
                <p className="text-xs text-white/60 max-w-xs leading-relaxed">
                  Adicione o app à sua tela de início para acesso rápido, scanner otimizado e uma experiência fluida sem barras de navegação!
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4 text-left bg-black/20 p-5 rounded-2xl border border-white/5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Abra no Safari</p>
                    <p className="text-[11px] text-white/65">
                      Garantia de conformidade PWA. Se você estiver usando outro navegador (como Google Chrome no iOS), abra o link pelo navegador nativo <span className="text-primary font-bold">Safari</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Toque em Compartilhar</p>
                    <p className="text-[11px] text-white/65 flex items-center gap-1.5 flex-wrap">
                      Toque no ícone de <span className="bg-white/10 relative bottom-0.5 inline-flex items-center justify-center p-1 rounded-md text-white font-bold"><Share size={12} className="text-blue-400 stroke-[2.5]" /></span> (Compartilhar) na barra do seu navegador.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-black flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider mb-1">Adicionar à Tela de Início</p>
                    <p className="text-[11px] text-white/65 flex items-center gap-1.5 flex-wrap">
                      Role o menu para baixo e selecione a opção <span className="text-primary font-bold">Adicionar à Tela de Início</span> <span className="bg-white/10 relative bottom-0.5 inline-flex items-center justify-center p-1 rounded-md text-white font-bold"><Plus size={12} /></span>.
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowIosInstallGuide(false)}
                className="w-full bg-[#ccff00] text-black font-black py-4 rounded-xl uppercase tracking-widest text-[11px] hover:bg-[#d8ff33] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(204,255,0,0.25)]"
              >
                Entendi, vamos lá!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Smart Banner Bottom Pop-up */}
      <AnimatePresence>
        {showIosBanner && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 z-[99] max-w-md mx-auto bg-surface-container-highest border border-white/10 rounded-[2rem] p-4 shadow-2xl backdrop-blur-xl flex items-center gap-4 text-white"
          >
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
              <img src="/Logo_maker_project.png" className="w-10 h-10 rounded-lg" alt="Logo" />
            </div>

            <div className="flex-grow">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Instale no seu iPhone</h4>
              <p className="text-[10px] text-white/60 leading-normal mt-0.5">
                Economize dados e acesse o scanner mais rápido adicionando à tela inicial.
              </p>
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <button 
                onClick={() => {
                  setShowIosInstallGuide(true);
                  setShowIosBanner(false);
                }}
                className="px-3 py-1.5 bg-[#ccff00] text-black font-black uppercase tracking-wider text-[9px] rounded-lg active:scale-95 transition-transform"
              >
                Instalar
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('dismissed_ios_banner', 'true');
                  setShowIosBanner(false);
                }}
                className="px-3 py-1 text-white/40 hover:text-white font-black uppercase tracking-wider text-[8px] rounded-lg transition-colors"
              >
                Ignorar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-association Toast/Message */}
      <AnimatePresence>
        {scanMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] w-[90%] max-w-sm"
          >
            <div className="bg-primary text-black px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
              <CheckCircle2 size={24} className="shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Sucesso</span>
                <span className="text-sm font-black uppercase tracking-tight">{scanMessage}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vehicle Picker Modal */}
      <AnimatePresence>
        {showVehiclePicker && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-surface-container-highest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 pb-12 shadow-2xl border-t border-outline-variant/20"
            >
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-2 bg-outline-variant/30 rounded-full mb-6 sm:hidden" />
                <div className="bg-primary/20 p-4 rounded-full mb-4">
                  <CarFront size={32} className="text-primary" />
                </div>
                <h3 className="text-2xl font-black tracking-tight text-white uppercase">Selecione o Veículo</h3>
                <p className="text-on-surface-variant text-sm mt-1 opacity-70">
                  Qual veículo você está abastecendo agora?
                </p>
              </div>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {vehicles.map((v) => (
                  <button
                    key={v.id_veiculo}
                    onClick={() => handleVehicleSelect(v)}
                    className="w-full bg-surface-container-high hover:bg-primary/10 border border-outline-variant/10 hover:border-primary/30 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-background p-2 rounded-lg">
                        <Fuel size={20} className="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-primary text-lg leading-none mb-1">{v.id_placa}</p>
                        <p className="text-xs text-on-surface-variant font-medium opacity-50 uppercase">{v.nm_marca} {v.nm_modelo}</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-primary/20 flex items-center justify-center group-hover:border-primary">
                      <div className="w-2 h-2 rounded-full bg-primary opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => {
                  setShowVehiclePicker(false);
                  setPendingScan(null);
                  startScanner();
                }}
                className="w-full mt-6 py-4 text-on-surface-variant font-bold uppercase tracking-widest text-xs hover:text-white transition-colors"
              >
                CANCELAR ESCANEAMENTO
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="fixed top-0 w-full z-50 bg-[#050a05] flex justify-between items-center px-6 h-16 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <h1 className="font-black tracking-tighter text-lg uppercase drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                <span className="text-white">Enche o </span>
                <span className="text-amber-400">Tanque</span>
              </h1>
              <span className="text-[8px] font-black text-primary/50 leading-none">v2.2.0</span>
            </div>
            <p className="text-[7px] text-white/60 uppercase font-bold tracking-widest leading-none">
              Abasteça com inteligência
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canInstallPWA && (
            <motion.button 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); handlePWAInstall(); }}
              className="bg-primary text-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] border border-primary/50 group"
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">Instalar App</span>
            </motion.button>
          )}

          {isIosUser && (
            <motion.button 
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); setShowIosInstallGuide(true); }}
              className="bg-primary text-black px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.3)] border border-primary/50 group"
            >
              <Plus size={14} className="group-hover:rotate-90 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">Instalar App</span>
            </motion.button>
          )}

          <button 
            onClick={() => setActiveTab('feedback')}
            className={`p-2 rounded-xl border transition-all active:scale-95 ${
              activeTab === 'feedback' 
                ? "bg-[#ccff00] border-[#ccff00] text-black shadow-[0_0_15px_rgba(204,255,0,0.6)]" 
                : "border-[#ccff00]/40 bg-[#ccff00]/5 text-[#ccff00] hover:bg-[#ccff00]/15 animate-pulse shadow-[0_0_10px_rgba(204,255,0,0.25)]"
            }`}
          >
            <Megaphone size={20} />
          </button>

          {activeTab === 'scanner' && (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleTorch(); }}
              className={`transition-all p-2 rounded-full active:scale-95 ${
                isTorchOn 
                  ? "bg-primary text-black shadow-[0_0_15px_rgba(74,222,128,0.6)]" 
                  : "text-white/40 hover:text-white"
              }`}
            >
              <Flashlight size={20} />
            </button>
          )}

          <div className="relative flex flex-col items-end">
            <button 
              id="profile-toggle"
              onClick={(e) => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }}
              className="w-9 h-9 rounded-xl border border-white/10 bg-surface-container flex items-center justify-center font-black text-primary hover:border-primary/50 transition-all active:scale-95 neon-glow-green"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute right-0 mt-3 w-64 bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl p-2 z-[100] backdrop-blur-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-5 py-4 border-b border-white/5 mb-2">
                    <p className="text-[10px] font-black text-primary/60 uppercase tracking-[0.2em] mb-1">Conta Ativa</p>
                    <p className="text-sm font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-white/30 truncate font-medium">{user.email}</p>
                  </div>
                  
                  <nav className="space-y-1">
                    <button 
                      onClick={() => { setActiveTab('home'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors text-white/70 hover:text-white group"
                    >
                      <HomeIcon size={18} className="text-blue-400/40 group-hover:text-blue-400 transition-colors" />
                      <span className="text-xs font-black uppercase tracking-widest">Início</span>
                    </button>

                    {user.isAdmin && (
                      <button 
                        onClick={() => { setActiveTab('admin'); setShowProfileMenu(false); }}
                        className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors text-white/70 hover:text-white group"
                      >
                        <Settings size={18} className="text-orange-400/40 group-hover:text-orange-400 transition-colors" />
                        <span className="text-xs font-black uppercase tracking-widest">Gestão de Acesso</span>
                      </button>
                    )}

                    {(canInstallPWA || isIosUser) && (
                      <button 
                        onClick={() => { 
                          if (isIosUser) {
                            setShowIosInstallGuide(true);
                          } else {
                            handlePWAInstall();
                          }
                          setShowProfileMenu(false); 
                        }}
                        className="w-full text-left px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center gap-3 transition-all text-primary group border border-primary/20"
                      >
                        <Plus size={18} className="text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest">Instalar App</span>
                      </button>
                    )}

                    <button 
                      onClick={() => { setShowChangelog(true); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors text-white/70 hover:text-white group"
                    >
                      <Zap size={18} className="text-amber-400/40 group-hover:text-amber-400 transition-colors" />
                      <span className="text-xs font-black uppercase tracking-widest">Changelog</span>
                    </button>

                    {isIosUser && (
                      <div className="mx-4 my-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                          <Info size={10} /> Dica iPhone
                        </p>
                        <p className="text-[10px] text-white/50 leading-tight">
                          Toque em <span className="text-white font-bold">Compartilhar</span> e depois em <span className="text-white font-bold">Adicionar à Tela de Início</span> para instalar.
                        </p>
                      </div>
                    )}

                    <button 
                      onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 flex items-center gap-3 transition-colors text-white/70 hover:text-white group"
                    >
                      <UserIcon size={18} className="text-primary/40 group-hover:text-primary transition-colors" />
                      <span className="text-xs font-black uppercase tracking-widest">Meu Perfil</span>
                    </button>

                    <div className="mx-2 my-1 h-px bg-white/5" />
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-500/10 flex items-center gap-3 transition-colors text-red-500/70 hover:text-red-500 group"
                    >
                      <Trash2 size={18} className="text-red-500/40 group-hover:text-red-500 transition-colors" />
                      <span className="text-xs font-black uppercase tracking-widest">Encerrar Sessão</span>
                    </button>
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow relative flex flex-col pt-16 pb-24 overflow-y-auto">
        {mustUpdateVehicles ? (
           <div className="flex-grow flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-400/20 rounded-3xl flex items-center justify-center animate-pulse">
                <AlertCircle size={40} className="text-amber-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white italic">ATUALIZAÇÃO OBRIGATÓRIA</h2>
                <p className="text-on-surface-variant text-sm opacity-80 max-w-xs mx-auto">
                  Detectamos veículos com nomenclatura antiga em sua conta. Para garantir a precisão dos cálculos e filtros, você precisa ajustar os dados agora.
                </p>
              </div>
              
              <div className="w-full space-y-3">
                {vehicles.map(v => {
                   if (isVehicleFipeCompliant(v)) return null;

                   return (
                     <div key={v.id_veiculo} className="bg-surface-container p-4 rounded-2xl border border-amber-400/30 flex items-center justify-between">
                        <div className="text-left">
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">{v.id_placa}</p>
                          <p className="text-sm font-bold text-white/60">{v.nm_marca || 'Não definida'} {v.nm_modelo || ''}</p>
                        </div>
                        <button 
                          onClick={() => handleEditVehicleSwal(v)}
                          className="bg-amber-400 text-black px-4 py-2 rounded-xl text-xs font-black active:scale-95 transition-transform"
                        >
                          AJUSTAR
                        </button>
                     </div>
                   );
                })}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/40 uppercase font-black tracking-widest">
                <ShieldCheck size={12} />
                <span>Proteção de Integridade de Dados</span>
              </div>
           </div>
        ) : activeTab === 'home' ? (
          <HomeView 
            selectedVehicle={selectedVehicle} 
            onStartScan={() => setActiveTab('scanner')} 
            onStartSearch={handleStartSearch} 
            stats={stats}
            isLoadingStats={isLoadingStats}
          />
        ) : activeTab === 'search' ? (
          <SearchFuelView 
            user={user} 
            selectedVehicle={selectedVehicle} 
            fuelTypes={fuelTypes}
            setFuelTypes={setFuelTypes}
            locationName={locationName}
            setLocationName={setLocationName}
            userLocation={userLocation}
            setUserLocation={setUserLocation}
            locationError={locationError}
            setLocationError={setLocationError}
          />
        ) : activeTab === 'analises' || activeTab === 'rankings' || activeTab === 'insights' ? (
          <AnalisesView 
            fuelTypes={fuelTypes} 
            initialCity={locationName ? locationName.split(' - ')[0] : 'Petrópolis'} 
            selectedVehicle={selectedVehicle}
          />
        ) : activeTab === 'scanner' ? (
          <div className="flex-grow relative flex flex-col items-center justify-center">
            {/* Camera Feed Container */}
            <div className="absolute inset-0 z-0 bg-black overflow-hidden">
              <div id={videoRegionId} className="w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover" />
              
              {permissionError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/80 z-20">
                  <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mb-4">
                    <X size={32} className="text-error" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Câmera Bloqueada</h3>
                  <p className="text-on-surface-variant text-sm mb-6 opacity-80">
                    O acesso à câmera foi negado pelo navegador. 
                    <br/><br/>
                    <b>DICA:</b> Clique no botão <b>"Abrir em nova aba"</b> no topo direito do editor para que o navegador peça a permissão corretamente.
                  </p>
                  <button 
                    onClick={() => startScanner()}
                    className="bg-primary text-black font-bold px-6 py-4 rounded-xl active:scale-95 transition-transform pointer-events-auto w-full flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={20} />
                    TENTAR NOVAMENTE
                  </button>
                </div>
              )}

              {!isScanning && !scanResult && !permissionError && (
                 <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant/50">
                    Aguardando câmera...
                 </div>
              )}
            </div>

            {/* Success Overlay */}
            <AnimatePresence>
              {scanResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
                >
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={64} className="text-primary" />
                  </div>
                  <h2 className="text-4xl font-black text-primary mb-8">CAPTURA OK</h2>
                  <button 
                    onClick={resetScanner}
                    className="bg-primary text-black font-bold px-8 py-4 rounded-2xl active:scale-95 transition-transform"
                  >
                    ESCANEAR NOVAMENTE
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanner Overlay (Viewfinder) */}
            {!scanResult && (
              <div className="relative z-10 flex flex-col items-center gap-8 w-full px-6 -mt-24 pointer-events-none">
                {/* Active Vehicle Badge */}
                {user && selectedVehicle && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/90 backdrop-blur-sm text-black px-4 py-2 rounded-full flex items-center gap-2 shadow-lg border border-white/20"
                  >
                    <CarFront size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">{selectedVehicle.id_placa}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  </motion.div>
                )}

                {/* Viewfinder */}
                <div className="relative w-64 h-64 md:w-80 md:h-80">
                  {/* Corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl scanner-glow" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl scanner-glow" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl scanner-glow" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl scanner-glow" />
                  
                  {/* Scanning Line */}
                  <motion.div 
                    className="absolute inset-x-4 h-0.5 bg-primary scanning-line-glow opacity-80 z-20"
                    animate={{ 
                      top: ["20%", "80%"] 
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      repeatType: "reverse",
                      ease: "easeInOut" 
                    }}
                  />

                  {/* Scanning Pulse */}
                  <motion.div 
                    className="absolute inset-0 border-2 border-primary/30 rounded-xl z-10"
                    animate={{ 
                      scale: [1, 1.05, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ 
                      duration: 2, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  />
                  
                  {/* Focus Area */}
                  <div className="absolute inset-0 bg-primary/5 rounded-xl" />
                </div>

                {/* Instructions */}
                <div className="text-center space-y-4 max-w-xs">
                  <p className="font-bold text-lg text-on-background leading-tight drop-shadow-md">
                    Aponte a câmera para o QR Code da sua NF-e
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border border-gray-800">
                    <Info size={14} className="text-primary" />
                    <span className="text-[0.7rem] uppercase tracking-widest font-bold text-on-surface-variant">
                      O código será processado automaticamente
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {/* Removed unrequested features */}
          </div>
        ) : activeTab === 'history' ? (
          <HistoryView selectedVehicle={selectedVehicle} />
        ) : activeTab === 'profile' ? (
          <ProfileView 
            user={user} 
            onLogin={handleGoogleLogin} 
            onLogout={handleLogout}
            vehicles={vehicles} 
            selectedVehicle={selectedVehicle} 
            onSelectVehicle={setSelectedVehicle}
            isLoggingIn={isLoggingIn}
            onRefreshSession={checkSession}
            onDeactivateVehicle={handleDeactivateVehicle}
            onEditVehicle={handleEditVehicleSwal}
            openBrandPicker={openBrandPicker}
            openModelPicker={openModelPicker}
            loadingBrands={loadingBrands}
            loadingModels={loadingModels}
            brands={brands}
            editLoading={editLoading}
            setEditLoading={setEditLoading}
            onShowPrivacy={() => setShowPrivacy(true)}
            onShowTerms={() => setShowTerms(true)}
            fuelTypes={fuelTypes}
            setFuelTypes={setFuelTypes}
          />
        ) : activeTab === 'feedback' ? (
          <FeedbackView />
        ) : activeTab === 'admin' ? (
          <AdminDashboardView />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-on-surface-variant">
            <Settings size={64} className="mb-4 opacity-20" />
            <h2 className="text-xl font-bold mb-2">Perfil do Usuário</h2>
            <p className="opacity-60">Configurações da conta e preferências.</p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full z-50">
        <nav className="flex justify-around items-center px-4 py-1 pb-2 bg-black border-t border-white/10">
          <NavItem 
            icon={<HomeIcon size={22} />} 
            label="Início" 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
          />
          
          {/* Tab 2: Análises (Privileged) or Busca (Others) */}
          {(user?.email === 'marcio.vasconcellos@gmail.com' || user?.email === 'giovana.vasconcellos@gmail.com' || user?.email?.toLowerCase().includes('giovana') || user?.isAdmin) ? (
            <NavItem 
              icon={<BarChart2 size={22} />} 
              label="Análises" 
              active={activeTab === 'analises' || activeTab === 'insights' || activeTab === 'rankings'} 
              onClick={() => setActiveTab('analises')} 
            />
          ) : (
            <NavItem 
              icon={<Fuel size={22} />} 
              label="Busca" 
              active={activeTab === 'search'} 
              onClick={() => setActiveTab('search')} 
            />
          )}
          
          {/* Highlighted Scanner/Já Abasteci Button */}
          <div className="px-1 flex flex-col items-center">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl mb-1 ${
                activeTab === 'scanner'
                  ? "bg-[#ccff00] text-black shadow-[0_0_35px_rgba(204,255,0,0.4)]"
                  : "bg-[#ccff00]/90 text-black shadow-[0_10px_20px_rgba(0,0,0,0.3)]"
              }`}
            >
              <QrCode size={26} strokeWidth={2.5} />
            </button>
            <span className={`text-[0.55rem] uppercase tracking-tighter font-black ${
              activeTab === 'scanner' ? "text-[#ccff00]" : "text-white/80"
            }`}>
              Já Abasteci
            </span>
          </div>

          <NavItem 
            icon={<History size={22} />} 
            label="Histórico" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <NavItem 
            icon={<UserIcon size={22} />} 
            label="Perfil" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </nav>
      </div>
    </div>
  );
}

function FeedbackView() {
  const [feedback, setFeedback] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setIsSending(true);
    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedback })
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Erro ao enviar feedback");
      }

      MySwal.fire({
        icon: 'success',
        title: 'Feedback Enviado!',
        text: 'Obrigado por nos ajudar a melhorar.',
        background: '#151515',
        color: '#fff',
        confirmButtonColor: '#ccff00'
      });
      
      setFeedback("");
    } catch (err: any) {
      MySwal.fire({
        icon: 'error',
        title: 'Erro no Envio',
        text: err.message,
        background: '#151515',
        color: '#fff',
        confirmButtonColor: '#ff4444'
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-16">
      <div className="px-6 py-12 text-center">
        <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">
          Ouvindo a <span className="text-[#ccff00]">Comunidade</span>
        </h2>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Sua sugestão ou crítica ajuda a manter o Enche o Tanque sempre atualizado e justo.
        </p>
      </div>

      <div className="px-6 max-w-md mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Digite aqui o que você pensa, sugere ou se encontrou algum erro..."
              className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 h-48 text-white focus:outline-none focus:border-[#ccff00]/50 transition-all resize-none placeholder:text-white/20"
            />
            <div className="absolute top-4 right-4 text-[#ccff00]/20">
              <MessageSquare size={24} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSending || !feedback.trim()}
            className="w-full py-5 bg-[#ccff00] text-black font-black rounded-2xl uppercase tracking-widest text-sm shadow-[0_0_25px_rgba(204,255,0,0.3)] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center gap-3"
          >
            {isSending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar Feedback
                <Rocket size={18} />
              </>
            )}
          </button>
        </form>
        
        <div className="mt-12 p-8 rounded-3xl bg-white/5 border border-white/5 text-center">
          <Star className="text-[#ccff00] mx-auto mb-4 animate-pulse" />
          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-loose">
            Lemos cada mensagem <br /> de nossa equipe
          </p>
        </div>
      </div>
    </div>
  );
}

function HomeView({ 
  selectedVehicle, 
  onStartScan, 
  onStartSearch, 
  stats,
  isLoadingStats
}: { 
  selectedVehicle: Vehicle | null, 
  onStartScan: () => void, 
  onStartSearch: () => void,
  stats: { totalEconomy: number, totalLiters: number, totalSpent: number, canSearch: boolean, totalScans: number, daysRemaining: number, lastPurchase: any } | null,
  isLoadingStats: boolean
}) {
  const [coverageData, setCoverageData] = useState<any[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(true);

  useEffect(() => {
    fetch('/api/coverage-stats')
      .then(r => r.json())
      .then(data => {
        const order = ['petrópolis', 'rio de janeiro', 'niterói', 'juiz de fora'];
        const normalized = data.reduce((acc: any, item: any) => {
          acc[item.nm_municipio.toLowerCase()] = item;
          return acc;
        }, {});
        
        const ordered = order.map(city => {
          return normalized[city] || { 
            nm_municipio: city.charAt(0).toUpperCase() + city.slice(1), 
            total_postos: 0, 
            postos_com_preco: 0 
          };
        });
        setCoverageData(ordered);
        setLoadingCoverage(false);
      })
      .catch(err => {
        console.error("Error loading coverage:", err);
        setLoadingCoverage(false);
      });
  }, []);

  const showLastPurchaseDetail = () => {
    if (!stats?.lastPurchase) return;

    const lp = stats.lastPurchase;
    const rawDate = lp.dh_emissao_nfe || lp.dh_coleta;
    let date = 'Data não disponível';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        date = d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }

    const economy = lp.vl_economia || 0;
    const economyColor = economy >= 0 ? '#ccff00' : '#ff4444';
    const economyText = economy >= 0 ? `Economia: R$ ${formatNumber(economy, 2)}` : `Prejuízo: R$ ${formatNumber(Math.abs(economy), 2)}`;

    const parseCoord = (c: any) => {
      if (!c) return null;
      const s = String(c).trim();
      if (s.includes(':')) {
        const parts = s.split(':');
        const deg = parseFloat(parts[0]);
        const min = parseFloat(parts[1]) || 0;
        const sec = parseFloat(parts[2]) || 0;
        const sign = deg < 0 ? -1 : 1;
        const decimal = sign * (Math.abs(deg) + (min / 60) + (sec / 3600));
        return isNaN(decimal) ? null : decimal;
      }
      const val = parseFloat(s);
      return isNaN(val) ? null : val;
    };

    const l_lat = parseCoord(lp.station_lat);
    const l_lng = parseCoord(lp.station_lng);

    const mapsUrl = (l_lat !== null && l_lng !== null)
      ? `https://www.google.com/maps/search/?api=1&query=${l_lat},${l_lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lp.nm_posto)}`;

    MySwal.fire({
      title: `<span style="color: #fff; font-family: 'Inter', sans-serif; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">Detalhes do Abastecimento</span>`,
      html: `
        <div style="text-align: left; color: #fff; font-family: 'Inter', sans-serif;">
          <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1);">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; opacity: 0.5; font-weight: 900; letter-spacing: 0.1em;">Posto</p>
            <p style="margin: 0; font-size: 16px; font-weight: 800;">${lp.nm_posto}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; font-size: 8px; text-transform: uppercase; opacity: 0.5; font-weight: 900;">Combustível</p>
              <p style="margin: 0; font-size: 14px; font-weight: 700;">${lp.ds_tipoproduto}</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; font-size: 8px; text-transform: uppercase; opacity: 0.5; font-weight: 900;">Data</p>
              <p style="margin: 0; font-size: 14px; font-weight: 700;">${date}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
             <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; font-size: 8px; text-transform: uppercase; opacity: 0.5; font-weight: 900;">Preço Unit.</p>
              <p style="margin: 0; font-size: 14px; font-weight: 700;">R$ ${formatNumber(lp.vl_preco_unitario, 3)}</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; font-size: 8px; text-transform: uppercase; opacity: 0.5; font-weight: 900;">Litros</p>
              <p style="margin: 0; font-size: 14px; font-weight: 700;">${formatNumber(lp.nu_litros, 3)} L</p>
            </div>
          </div>

          <div style="background: ${economyColor}20; padding: 15px; border-radius: 12px; border: 1px solid ${economyColor}40; text-align: center; margin-bottom: 15px;">
            <p style="margin: 0; font-size: 10px; text-transform: uppercase; color: ${economyColor}; font-weight: 900; letter-spacing: 0.05em; margin-bottom: 4px;">Resultado Financeiro</p>
            <p style="margin: 0; font-size: 20px; font-weight: 900; color: ${economyColor};">${economyText}</p>
          </div>

          <a 
            href="${mapsUrl}" 
            target="_blank" 
            rel="noopener noreferrer"
            style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 90px; border-radius: 12px; border: 1px solid rgba(204,255,0,0.3); background: linear-gradient(135deg, rgba(204,255,0,0.15) 0%, rgba(0,0,0,0.4) 100%); text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 20px rgba(204,255,0,0.05);"
          >
            <span style="font-size: 20px; margin-bottom: 4px;">📍</span>
            <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #ccff00; text-shadow: 0 0 10px rgba(204,255,0,0.2);">Ver Posto no Google Maps</span>
            <span style="font-size: 9px; opacity: 0.6; color: #fff; margin-top: 2px;">
              ${(l_lat !== null && l_lng !== null) ? `${l_lat.toFixed(6)}, ${l_lng.toFixed(6)}` : 'Abrir rota de navegação'}
            </span>
          </a>
        </div>
      `,
      background: '#151515',
      showConfirmButton: true,
      confirmButtonText: 'FECHAR',
      confirmButtonColor: '#ccff00',
      customClass: {
          popup: 'rounded-3xl',
          confirmButton: 'rounded-xl font-black text-black'
      }
    });
  };

  return (
    <div className="flex flex-col pb-20">
      {/* Hero Section */}
      <section className="relative w-full h-[220px] overflow-hidden mb-6">
        <img 
          src="/numero-de-postos-de-combustiveis-deve-dobrar-em-porto-velho.jpg" 
          alt="Posto de Combustível" 
          className="w-full h-[calc(100%+20px)] object-cover opacity-90 brightness-75 -translate-y-5"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/20 to-transparent" />
        <div className="absolute bottom-2 left-0 w-full px-6">
          <h2 className="text-3xl font-black tracking-tighter mb-1 uppercase drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
            <span className="text-white">Enche o </span>
            <span className="text-amber-400">Tanque</span>
          </h2>
          <p className="text-white max-w-xs text-sm font-medium opacity-80 leading-tight">
            Economize em cada gota com inteligência e dados reais.
          </p>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="px-5 space-y-4">
        <button 
          onClick={onStartScan}
          className="w-full bg-[#ccff00] text-black rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-lg active:scale-[0.98] transition-all group hover:shadow-[0_0_25px_rgba(204,255,0,0.5)]"
        >
          <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.3)]">
            <QrCode size={24} className="text-black group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black text-xl tracking-tighter uppercase leading-none">JÁ ABASTECI</span>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-60 mt-0.5">Ler QRCode da Nota Fiscal</span>
          </div>
        </button>

        <button 
          onClick={onStartSearch}
          className="w-full bg-surface-container border border-primary/20 text-white rounded-2xl p-3 flex flex-col items-center justify-center gap-1 shadow-lg active:scale-[0.98] transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Fuel size={24} className="text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="font-black text-xl tracking-tighter uppercase leading-none text-white">QUERO ABASTECER</span>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-40 mt-0.5 text-white">BUSCAR POSTOS MAIS BARATOS</span>
          </div>
        </button>
      </section>

      {/* Stats Grid */}
      <section className="px-5 mt-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-container p-3 rounded-2xl flex flex-col justify-between h-20 border border-outline-variant/10">
            <Zap size={18} className="text-primary drop-shadow-[0_0_5px_rgba(204,255,0,0.5)]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white font-black opacity-80 leading-none mb-1 text-xs">Economia</p>
              <p className={`text-sm font-black tracking-tight ${stats?.totalEconomy && stats.totalEconomy < 0 ? 'text-red-400' : 'text-primary'}`}>
                {isLoadingStats ? '---' : `R$ ${formatNumber(stats?.totalEconomy, 2)}`}
              </p>
            </div>
          </div>

          <div 
            onClick={showLastPurchaseDetail}
            className={`bg-surface-container p-3 rounded-2xl flex flex-col justify-between h-20 border border-outline-variant/10 transition-transform active:scale-95 ${stats?.lastPurchase ? 'cursor-pointer' : ''}`}
          >
            <MapPin size={18} className="text-primary drop-shadow-[0_0_5px_rgba(204,255,0,0.5)]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white font-black opacity-80 leading-none mb-1 text-xs">Último Posto</p>
              <p className="text-xs font-black tracking-tight truncate text-white">
                {isLoadingStats ? '---' : (stats?.lastPurchase ? stats.lastPurchase.nm_posto : 'Nenhum registro')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-container p-3 rounded-2xl flex flex-col justify-between h-20 border border-outline-variant/10">
            <Fuel size={18} className="text-primary drop-shadow-[0_0_5px_rgba(204,255,0,0.5)]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white font-black opacity-80 leading-none mb-1 text-xs">Total Litros</p>
              <p className="text-sm font-black tracking-tight text-white">
                {isLoadingStats ? '---' : `${formatNumber(stats?.totalLiters, 2)} L`}
              </p>
            </div>
          </div>

          <div className="bg-surface-container p-3 rounded-2xl flex flex-col justify-between h-20 border border-outline-variant/10">
            <Rocket size={18} className="text-primary drop-shadow-[0_0_5px_rgba(204,255,0,0.5)]" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white font-black opacity-80 leading-none mb-1 text-xs">Gasto Total</p>
              <p className="text-sm font-black tracking-tight text-white">
                {isLoadingStats ? '---' : `R$ ${formatNumber(stats?.totalSpent, 2)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Cobertura nos Municípios */}
        <div className="bg-surface-container/30 p-2.5 rounded-2xl border border-white/5 space-y-2 mt-2">
          <div className="flex items-center justify-between px-1 animate-fade-in">
            <span className="text-[9px] font-black uppercase tracking-wider text-white">Postos Ativos Cobertos</span>
            <span className="text-[8px] font-bold text-[#ccff00] drop-shadow-[0_0_4px_rgba(204,255,0,0.3)] uppercase">Preços ANP / NFes</span>
          </div>
          <div className="flex flex-col gap-2">
            {loadingCoverage ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-surface-container/80 p-3 rounded-2xl flex flex-col gap-2 border border-white/5 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-40 bg-white/10 rounded" />
                    <div className="h-3 w-6 bg-white/10 rounded" />
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full mt-1.5" />
                </div>
              ))
            ) : (
              coverageData.map((item: any, i: number) => {
                const name = item.nm_municipio;
                const pct = item.total_postos > 0 
                  ? Math.round((item.postos_com_preco / item.total_postos) * 100)
                  : 0;

                return (
                  <div 
                    key={i} 
                    className="bg-surface-container/60 p-3 rounded-xl flex flex-col gap-1.5 border border-outline-variant/10 hover:border-[#ccff00]/20 transition-all hover:bg-surface-container/80"
                  >
                    <div className="flex items-center justify-between card-element-id">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[11px] font-black uppercase text-white tracking-wide truncate">
                          {name}
                        </span>
                        <span className="text-[9px] text-[#888] font-bold">
                          —
                        </span>
                        <span className="text-[10px] font-medium text-white/50 whitespace-nowrap">
                          {item.postos_com_preco} / {item.total_postos} postos
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-[#ccff00] leading-none drop-shadow-[0_0_2px_rgba(204,255,0,0.2)] whitespace-nowrap shrink-0">
                        {pct}%
                      </span>
                    </div>

                    {/* Barra de progresso */}
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-0.5">
                      <div 
                        className="bg-[#ccff00] h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(204,255,0,0.6)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileView({ user, onLogin, onLogout, vehicles, selectedVehicle, onSelectVehicle, isLoggingIn, onRefreshSession, onDeactivateVehicle, onEditVehicle, openBrandPicker, openModelPicker, loadingBrands, loadingModels, brands, editLoading, setEditLoading, onShowPrivacy, onShowTerms, fuelTypes, setFuelTypes }: { 
  user: User | null, 
  onLogin: () => void, 
  onLogout: () => void,
  vehicles: Vehicle[], 
  selectedVehicle: Vehicle | null,
  onSelectVehicle: (v: Vehicle) => void,
  isLoggingIn?: boolean,
  onRefreshSession?: () => void,
  onDeactivateVehicle?: (vehicleId: number) => Promise<void>,
  onEditVehicle: (v: Vehicle) => void,
  openBrandPicker: any,
  openModelPicker: any,
  loadingBrands: boolean,
  loadingModels: boolean,
  brands: any[],
  editLoading: boolean,
  setEditLoading: (v: boolean) => void,
  onShowPrivacy: () => void,
  onShowTerms: () => void,
  fuelTypes: any[],
  setFuelTypes: (v: any[]) => void
}) {
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', renavam: '', brand: '', model: '', type: 'carros' });
  const [prefFuel, setPrefFuel] = useState<number>(user?.preferredFuel || 1);
  const [radius, setRadius] = useState<number>(user?.searchRadius || 10);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [vehicleFuels, setVehicleFuels] = useState<number[]>([]);
  const [vehiclePrefFuel, setVehiclePrefFuel] = useState<number | null>(null);
  const [isConfiguringVehicle, setIsConfiguringVehicle] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setPrefFuel(user.preferredFuel || 1);
      setRadius(user.searchRadius || 10);
    }
  }, [user]);

  const [formData, setFormData] = useState({
    phone: user?.phone || "",
    cpf: user?.cpf || "",
    cnh: user?.cnh || "",
    cnhExpiration: user?.cnhExpiration || ""
  });

  const [models, setModels] = useState<{codigo: string, nome: string}[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || "",
        cpf: user.cpf || "",
        cnh: user.cnh || "",
        cnhExpiration: user.cnhExpiration || ""
      });
      setPrefFuel(user.preferredFuel || 1);
      setRadius(user.searchRadius || 10);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const resp = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (resp.ok) {
        setIsEditing(false);
        MySwal.fire({
          icon: 'success',
          title: 'Perfil Atualizado',
          background: '#151515',
          color: '#fff',
          timer: 2000,
          showConfirmButton: false
        });
        if (onRefreshSession) onRefreshSession();
      } else {
        MySwal.fire({
          icon: 'error',
          title: 'Erro',
          text: 'Erro ao atualizar perfil',
          background: '#151515',
          color: '#fff'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const [isCameraCaptureActive, setIsCameraCaptureActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startPhotoCapture = async () => {
    setIsCameraCaptureActive(true);
    try {
      // Use "user" facingMode for selfie
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraCaptureActive(false);
      MySwal.fire({ icon: 'error', title: 'Erro na Câmera', text: 'Não foi possível acessar a câmera de selfie.', background: '#151515', color: '#fff' });
    }
  };

  const stopPhotoCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraCaptureActive(false);
  };

  const captureAndUpload = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center crop to square
    const vWidth = videoRef.current.videoWidth;
    const vHeight = videoRef.current.videoHeight;
    const size = Math.min(vWidth, vHeight);
    const x = (vWidth - size) / 2;
    const y = (vHeight - size) / 2;

    ctx.drawImage(videoRef.current, x, y, size, size, 0, 0, 600, 600);
    const photo = canvas.toDataURL('image/jpeg', 0.7);

    stopPhotoCapture();
    
    try {
      const resp = await fetch("/api/profile/update-picture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo })
      });
      if (resp.ok && onRefreshSession) onRefreshSession();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoClick = () => {
    MySwal.fire({
      title: 'Atualizar Foto',
      text: 'Escolha como deseja atualizar sua foto de perfil',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'TIRAR FOTO',
      denyButtonText: 'ESCOLHER ARQUIVO',
      cancelButtonText: 'CANCELAR',
      background: '#151515',
      color: '#fff',
      confirmButtonColor: '#CCFF00',
      denyButtonColor: '#333'
    }).then((result) => {
      if (result.isConfirmed) {
        startPhotoCapture();
      } else if (result.isDenied) {
        fileInputRef.current?.click();
      }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const originalBase64 = reader.result as string;
      
      // Auto-compress image
      const compressImage = (base64Str: string, maxWidth = 600, maxHeight = 600): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = base64Str;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); 
          };
        });
      };

      const compressed = await compressImage(originalBase64);

      if (compressed.length > 1.2 * 1024 * 1024) { // Still too big? should not happen with 600x600 0.7
         MySwal.fire({ icon: 'error', title: 'Arquivo muito grande', text: 'Tente uma foto menor.', background: '#151515', color: '#fff' });
         return;
      }

      try {
        const resp = await fetch("/api/profile/update-picture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: compressed })
        });
        if (resp.ok && onRefreshSession) onRefreshSession();
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const savePreferences = async () => {
    setIsSavingPrefs(true);
    try {
      const resp = await fetch("/api/profile/update-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredFuel: prefFuel, searchRadius: radius })
      });
      if (resp.ok) {
        MySwal.fire({ icon: 'success', title: 'Preferências Salvas', background: '#151515', color: '#fff', timer: 1500, showConfirmButton: false });
        if (onRefreshSession) onRefreshSession();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleSelectFuelForVehicle = (id: number) => {
    if (vehicleFuels.includes(id)) {
      setVehicleFuels(prev => prev.filter(x => x !== id));
      if (vehiclePrefFuel === id) setVehiclePrefFuel(null);
    } else {
      setVehicleFuels(prev => [...prev, id]);
      if (!vehiclePrefFuel) setVehiclePrefFuel(id);
    }
  };

  const handleUpdateVehicleFuels = async (vId: number, currentFuels: number[], currentPref: number | null) => {
    // Fetch fuel types if not already loaded
    let types = fuelTypes;
    if (types.length === 0) {
      const resp = await fetch("/api/fuel-types");
      types = await resp.json();
      setFuelTypes(types);
    }

    const { value: formValues } = await MySwal.fire({
      title: 'Configurar Combustíveis',
      html: `
        <div class="text-left space-y-4">
          <p class="text-[10px] font-black text-primary uppercase mb-2">Selecione os combustíveis usados</p>
          <div class="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar" id="swal-fuel-list">
            ${types.map(ft => `
              <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <input type="checkbox" id="fuel-${ft.id_produto}" value="${ft.id_produto}" ${currentFuels.includes(ft.id_produto) ? 'checked' : ''} class="w-5 h-5 accent-primary shrink-0">
                <label for="fuel-${ft.id_produto}" class="text-[11px] font-bold text-white uppercase leading-tight">${ft.ds_produto}</label>
              </div>
            `).join('')}
          </div>
          <div class="mt-4 pt-4 border-t border-white/5">
            <p class="text-[10px] font-black text-primary uppercase mb-2">Qual o preferencial?</p>
            <select id="swal-pref-fuel" class="w-full bg-[#1a1a1a] border border-white/10 p-3 rounded-xl text-white text-xs font-bold outline-none">
              <option value="">Nenhum</option>
              ${types.filter(ft => currentFuels.includes(ft.id_produto)).map(ft => `
                <option value="${ft.id_produto}" ${currentPref === ft.id_produto ? 'selected' : ''}>${ft.ds_produto}</option>
              `).join('')}
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'SALVAR',
      cancelButtonText: 'CANCELAR',
      background: '#151515',
      color: '#fff',
      confirmButtonColor: '#CCFF00',
      customClass: {
        confirmButton: 'text-black font-black uppercase'
      },
      preConfirm: () => {
        const allowed = Array.from(document.querySelectorAll('#swal-fuel-list input:checked')).map(el => (el as HTMLInputElement).value);
        const pref = (document.getElementById('swal-pref-fuel') as HTMLSelectElement).value;
        if (allowed.length === 0) {
          Swal.showValidationMessage('Selecione ao menos um combustível');
          return false;
        }
        return { allowedFuels: allowed.map(Number), preferredFuel: pref ? Number(pref) : null };
      },
      didOpen: () => {
        // Update preference dropdown when checkboxes change
        const checkboxes = document.querySelectorAll('#swal-fuel-list input');
        checkboxes.forEach(cb => {
          cb.addEventListener('change', () => {
            const allowedIds = Array.from(document.querySelectorAll('#swal-fuel-list input:checked')).map(el => (el as HTMLInputElement).value);
            const prefSelect = document.getElementById('swal-pref-fuel') as HTMLSelectElement;
            const currentVal = prefSelect.value;
            prefSelect.innerHTML = '<option value="">Nenhum</option>' + 
              types.filter(ft => allowedIds.includes(ft.id_produto.toString())).map(ft => `
                <option value="${ft.id_produto}" ${currentVal === ft.id_produto.toString() ? 'selected' : ''}>${ft.ds_produto}</option>
              `).join('');
          });
        });
      }
    });

    if (formValues) {
      setEditLoading(true);
      try {
        const resp = await fetch("/api/vehicle/update-fuels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            id_veiculo: vId, 
            preferredFuel: formValues.preferredFuel, 
            allowedFuels: formValues.allowedFuels 
          })
        });
        if (resp.ok) {
          MySwal.fire({ icon: 'success', title: 'Veículo Atualizado', background: '#151515', color: '#fff', timer: 1500, showConfirmButton: false });
          if (onRefreshSession) onRefreshSession();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setEditLoading(false);
      }
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.plate) return;
    
    setEditLoading(true);
    try {
      const resp = await fetch("/api/vehicle/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newVehicle,
          preferredFuel: vehiclePrefFuel,
          allowedFuels: vehicleFuels
        })
      });
      if (resp.ok) {
        setShowVehicleForm(false);
        setNewVehicle({ plate: '', renavam: '', brand: '', model: '', type: 'carros' });
        setVehicleFuels([]);
        setVehiclePrefFuel(null);
        MySwal.fire({ icon: 'success', title: 'Veículo Adicionado', background: '#151515', color: '#fff', timer: 2000, showConfirmButton: false });
        if (onRefreshSession) onRefreshSession();
      } else {
        const data = await resp.json();
        MySwal.fire({ icon: 'error', title: 'Erro', text: data.error || 'Falha ao adicionar', background: '#151515', color: '#fff' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditLoading(false);
    }
  };

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : "Desconhecido";

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24 pt-[30px]">
      <div className="px-6 space-y-8">
        {!user ? (
          <section className="bg-surface-container-high rounded-3xl p-8 text-center border border-green-400/10 shadow-lg">
            <div className="bg-green-400/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(74,222,128,0.1)]">
              <UserIcon size={40} className="text-green-400/60" />
            </div>
            <h3 className="text-xl font-black mb-2 uppercase tracking-tight text-white">Login Necessário</h3>
            <p className="text-on-surface-variant text-sm mb-8 opacity-70">
              Conecte-se com sua conta Google para gerenciar sua frota e associar seus abastecimentos.
            </p>
            <div className="space-y-3">
              <button 
                onClick={onLogin}
                disabled={isLoggingIn}
                className="w-full bg-primary text-black font-extrabold py-5 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 size={20} className="animate-spin text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                ) : (
                  <Rocket size={20} />
                )}
                {isLoggingIn ? 'CONECTANDO...' : 'ENTRAR COM GOOGLE'}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Camera Capture Overlay for Profile Photo */}
            <AnimatePresence>
              {isCameraCaptureActive && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[150] bg-black flex flex-col items-center justify-center p-6"
                >
                  <div className="relative w-full max-w-sm aspect-square bg-surface-container rounded-3xl overflow-hidden shadow-2xl">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    
                    {/* Scanner Frame */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl shadow-[-5px_-5px_15px_rgba(var(--primary-rgb),0.3)]" />
                      <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl shadow-[5px_-5px_15px_rgba(var(--primary-rgb),0.3)]" />
                      <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl shadow-[-5px_5px_15px_rgba(var(--primary-rgb),0.3)]" />
                      <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl shadow-[5px_5px_15px_rgba(var(--primary-rgb),0.3)]" />
                      
                      {/* Scanning Line Animation */}
                      <motion.div 
                        animate={{ top: ["10%", "90%", "10%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-4 right-4 h-0.5 bg-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] z-20"
                      />

                      {/* Grid mask effect */}
                      <div className="absolute inset-0 border-[3rem] border-black/60 backdrop-blur-[2px]" />
                    </div>

                    <div className="absolute top-4 left-0 w-full text-center">
                       <span className="bg-black/60 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/10">Posicione seu rosto no centro</span>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-12 w-full max-w-sm">
                    <button 
                      onClick={stopPhotoCapture}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={captureAndUpload}
                      className="flex-[2] bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] active:scale-95 transition-all"
                    >
                      <Camera size={20} />
                      Capturar Foto
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header with Photo and Member Since */}
            <div className="flex flex-col items-center gap-4 pb-4">
              <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center bg-surface-container transition-transform group-hover:scale-105 active:scale-95">
                  {(user.photoURL || user.googlePhotoURL) ? (
                    <img 
                      referrerPolicy="no-referrer" 
                      src={user.photoURL || user.googlePhotoURL} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <UserIcon size={64} className="text-primary/40" />
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-1">{user.name}</h3>
                <p className="text-sm font-bold text-primary uppercase tracking-widest opacity-80 decoration-primary decoration-2 underline-offset-4">Membro desde {memberSince}</p>
                <button onClick={onLogout} className="mt-4 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/10 px-4 py-1.5 rounded-full transition-all border border-red-500/20">Sair da Conta</button>
              </div>
            </div>

            {/* Preferências Section */}
            <section className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Preferências</h4>
                  <p className="text-[10px] text-white/30 uppercase font-black">Raio de Busca</p>
                </div>
              </div>

              <div className="bg-surface-container p-6 rounded-3xl border border-white/5 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Raio de Busca Padrão</label>
                    <span className="text-xs font-black text-primary">{radius} km</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="100" 
                    value={radius}
                    onChange={e => setRadius(Number(e.target.value))}
                    className="w-full h-2 bg-background rounded-full appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-1 px-1">
                    <span className="text-[8px] font-black text-white/20 uppercase">1km</span>
                    <span className="text-[8px] font-black text-white/20 uppercase">100km</span>
                  </div>
                </div>

                <button 
                  onClick={savePreferences}
                  disabled={isSavingPrefs}
                  className="w-full bg-primary/10 text-primary font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isSavingPrefs ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Salvar Preferências
                </button>
              </div>
            </section>

            {/* Personal Data Section */}
            <section className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Dados Pessoais</h4>
                  <p className="text-[10px] text-white/30 uppercase font-black">Informações do Condutor</p>
                </div>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-1.5 text-xs font-black text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  <Edit2 size={12} />
                  {isEditing ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4 bg-surface-container p-6 rounded-3xl border border-white/5 shadow-inner">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Telefone</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-background border border-white/5 p-4 rounded-xl text-white text-sm font-bold outline-none focus:border-primary/50 transition-all"
                    />
                  </div>
                  <button 
                    disabled={editLoading}
                    className="w-full mt-2 bg-primary text-black font-black py-5 rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.1)]"
                  >
                    {editLoading ? <Loader2 size={16} className="animate-spin text-green-400" /> : <Settings size={16} />}
                    Salvar Alterações
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container p-5 rounded-3xl border border-white/5 col-span-2">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Telefone</p>
                    <p className="text-sm font-bold text-white/80">{user.phone || "Não informado"}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Vehicle Fleet Section */}
            <section className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Sua Frota</h4>
                  <p className="text-[10px] text-on-surface-variant opacity-60 uppercase font-black">Veículos Cadastrados</p>
                </div>
                <button 
                  onClick={() => setShowVehicleForm(!showVehicleForm)}
                  className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase bg-primary/10 px-4 py-2 rounded-full border border-primary/20 active:scale-95 transition-all"
                >
                  <Plus size={14} />
                  NOVO VEÍCULO
                </button>
              </div>

              {showVehicleForm && (
                <motion.form 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleAddVehicle} 
                  className="bg-surface-container p-6 rounded-3xl border border-primary/20 space-y-4 shadow-[0_0_40px_rgba(var(--primary-rgb),0.1)]"
                >
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 text-center">Cadastrar Novo Veículo</p>
                   <div className="space-y-1.5">
                     <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Placa</label>
                     <input 
                       type="text" 
                       required
                       placeholder="ABC1D23"
                       value={newVehicle.plate}
                       onChange={e => setNewVehicle({...newVehicle, plate: e.target.value})}
                       className="w-full bg-background border border-white/5 p-3 rounded-xl text-white text-xs font-black uppercase outline-none focus:border-primary/50"
                     />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                      <select 
                        value={newVehicle.type}
                        onChange={e => setNewVehicle({...newVehicle, type: e.target.value, brand: '', model: ''})}
                        className="w-full bg-background border border-white/5 p-3 rounded-xl text-white text-xs font-bold outline-none focus:border-primary/50"
                      >
                        <option value="carros">Carro de Passeio / Utilitário</option>
                        <option value="motos">Moto / Motociclo</option>
                        <option value="caminhoes">Caminhão / Ônibus</option>
                      </select>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Marca</label>
                      <button 
                        type="button"
                        onClick={() => openBrandPicker(newVehicle.type, (b) => {
                          setNewVehicle(prev => ({ ...prev, brand: b.nome, model: '' }));
                          // Store temporary code for model picker
                          (document.getElementById('brand-trigger') as any).dataset.code = b.codigo;
                        })}
                        id="brand-trigger"
                        className="w-full bg-background border border-white/5 p-3 rounded-xl text-white text-xs font-bold text-left overflow-hidden whitespace-nowrap text-ellipsis min-h-[42px]"
                      >
                        {newVehicle.brand || (loadingBrands ? 'Carregando...' : 'Selecionar')}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Modelo</label>
                      <button 
                        type="button"
                        disabled={!newVehicle.brand || loadingModels}
                        onClick={() => {
                          const code = (document.getElementById('brand-trigger') as any).dataset.code || brands.find(b => b.nome === newVehicle.brand)?.codigo;
                          if (code) openModelPicker(newVehicle.type, code, (m) => setNewVehicle(prev => ({ ...prev, model: m.nome })));
                        }}
                        className="w-full bg-background border border-white/5 p-3 rounded-xl text-white text-xs font-bold text-left overflow-hidden whitespace-nowrap text-ellipsis min-h-[42px] disabled:opacity-30"
                      >
                        {newVehicle.model || (loadingModels ? 'Carregando...' : 'Selecionar')}
                      </button>
                    </div>
                   </div>
                   <div className="space-y-3 p-4 bg-background/50 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Combustíveis do Veículo</p>
                      <div className="flex flex-wrap gap-1.5">
                        {fuelTypes.map(ft => (
                          <button
                            key={ft.id_produto}
                            type="button"
                            onClick={() => handleSelectFuelForVehicle(ft.id_produto)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-white/5 ${
                              vehicleFuels.includes(ft.id_produto)
                                ? "bg-primary text-black border-primary"
                                : "bg-white/5 text-zinc-500 hover:bg-white/10"
                            }`}
                          >
                            {ft.ds_produto}
                          </button>
                        ))}
                      </div>
                      
                      {vehicleFuels.length > 0 && (
                        <div className="space-y-1.5 mt-2 pt-2 border-t border-white/5">
                          <label className="text-[8px] font-black text-white/20 uppercase tracking-widest ml-1">Preferencial</label>
                          <select 
                            value={vehiclePrefFuel || ""}
                            onChange={e => setVehiclePrefFuel(Number(e.target.value))}
                            className="w-full bg-background border border-white/5 p-2 rounded-xl text-white text-[10px] font-bold outline-none focus:border-primary/50"
                          >
                            <option value="">Selecione...</option>
                            {fuelTypes.filter(ft => vehicleFuels.includes(ft.id_produto)).map(ft => (
                              <option key={ft.id_produto} value={ft.id_produto}>{ft.ds_produto}</option>
                            ))}
                          </select>
                        </div>
                      )}
                   </div>

                   <div className="flex gap-2">
                    <button 
                      type="submit" 
                      disabled={editLoading}
                      className="flex-grow bg-primary text-black font-black py-4 rounded-xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      {editLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Adicionar
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowVehicleForm(false)}
                      className="px-6 bg-white/5 text-white/40 font-black rounded-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                    >
                      X
                    </button>
                   </div>
                </motion.form>
              )}

              <div className="grid gap-3">
                {vehicles.map((v) => (
                  <div key={v.id_veiculo} className="relative group">
                    <button
                      onClick={() => onSelectVehicle(v)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                        selectedVehicle?.id_veiculo === v.id_veiculo
                          ? "bg-primary text-black border-primary shadow-[0_5px_15px_rgba(var(--primary-rgb),0.3)]"
                          : "bg-surface-container text-white border-outline-variant/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${selectedVehicle?.id_veiculo === v.id_veiculo ? "bg-black/10" : "bg-background"}`}>
                          <CarFront size={22} className={selectedVehicle?.id_veiculo === v.id_veiculo ? "text-black" : "text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]"} />
                        </div>
                        <div 
                          className="text-left cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditVehicle(v);
                          }}
                        >
                          <p className={`font-black text-lg leading-none ${selectedVehicle?.id_veiculo === v.id_veiculo ? "text-black" : "text-white"}`}>
                            {v.id_placa}
                          </p>
                          <p className={`text-[10px] font-black uppercase opacity-60 ${selectedVehicle?.id_veiculo === v.id_veiculo ? "text-black" : "text-on-surface-variant"}`}>
                            {v.nm_marca} {v.nm_modelo}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateVehicleFuels(
                              v.id_veiculo, 
                              v.ds_combs_permitidos ? v.ds_combs_permitidos.split(',').map(Number) : [],
                              v.id_comb_pref || null
                            );
                          }}
                          className={`p-3 rounded-2xl transition-all shadow-xl border-2 relative overflow-hidden group ${
                            selectedVehicle?.id_veiculo === v.id_veiculo 
                              ? "bg-black text-primary border-primary/20 hover:bg-black/80" 
                              : "bg-primary text-black border-white/40 hover:scale-105 active:scale-95"
                          }`}
                          title="Configurar Combustíveis"
                        >
                          {selectedVehicle?.id_veiculo === v.id_veiculo && (
                            <motion.div 
                              animate={{ opacity: [0.2, 0.5, 0.2] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 bg-primary/10"
                            />
                          )}
                          <Fuel size={20} className="relative z-10 group-hover:rotate-12 transition-transform" />
                        </button>
                        
                        {selectedVehicle?.id_veiculo === v.id_veiculo && (
                          <div className="bg-black/20 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest text-black/60">Ativo</div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeactivateVehicle) {
                              onDeactivateVehicle(v.id_veiculo);
                            }
                          }}
                          className={`p-2 rounded-xl transition-all ${
                            selectedVehicle?.id_veiculo === v.id_veiculo 
                              ? "text-black/80 hover:bg-black/10" 
                              : "text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                          }`}
                          title="Desativar Veículo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              {vehicles.length > 1 && (
                <div className="bg-surface-container p-5 rounded-3xl border border-dashed border-outline-variant/30 flex gap-4 items-center">
                  <div className="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">
                    <Target size={24} />
                  </div>
                  <p className="text-[10px] font-bold text-on-surface-variant leading-relaxed">
                    Você tem múltiplos veículos. O app solicitará qual deles está abastecendo ao escanear sua nota.
                  </p>
                </div>
              )}
            </section>

            <div className="pt-8 pb-4 flex flex-col items-center gap-4">
              <div className="flex gap-6">
                <button 
                  onClick={onShowPrivacy}
                  className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-primary transition-colors"
                >
                  Privacidade
                </button>
                <div className="w-1 h-1 rounded-full bg-white/10 self-center" />
                <button 
                  onClick={onShowTerms}
                  className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-primary transition-colors"
                >
                  Termos de Uso
                </button>
              </div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/10">v2.2.0 • Enche o Tanque</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RegistrationView({ user, onSubmit, isLoading, onLogout }: { user: User, onSubmit: (d: any) => void, isLoading: boolean, onLogout: () => void }) {
  const [formData, setFormData] = useState({
    phone: "",
    cpf: "",
    cnh: "",
    cnhExpiration: ""
  });

  return (
    <div className="h-screen bg-background flex flex-col px-8 pt-12 pb-16 overflow-y-auto">
      <header className="mb-12">
         <Logo size="md" className="mb-6" />
         <h2 className="text-3xl font-black text-white uppercase leading-tight whitespace-nowrap">Quase lá, {user?.name?.split(' ')[0] || 'Motorista'}</h2>
         <p className="text-white/40 text-sm mt-2">Para sua segurança e controle da fase beta, preencha as informações abaixo.</p>
      </header>

      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...formData, cpf: formData.cpf || null, cnh: formData.cnh || null, cnhExpiration: formData.cnhExpiration || null }); }}>
         <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">E-mail</label>
            <div className="w-full bg-surface-container-high border border-white/5 p-4 rounded-xl text-white/50 text-sm font-bold">
               {user.email}
            </div>
         </div>

         <div className="space-y-2">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
            <input 
               type="tel" 
               required
               placeholder="(00) 00000-0000"
               value={formData.phone}
               onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
               className="w-full bg-surface-container hover:bg-surface-container-high border border-white/10 focus:border-primary/50 p-4 rounded-xl text-white font-bold transition-all outline-none"
            />
         </div>

         <div className="pt-8">
            <button 
               type="submit"
               disabled={isLoading || !formData.phone}
               className="w-full py-5 bg-primary text-black font-black rounded-2xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all"
            >
               {isLoading ? <Loader2 className="animate-spin text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" /> : "Solicitar Acesso"}
            </button>
            <button type="button" onClick={onLogout} className="w-full mt-6 text-white/20 font-bold uppercase text-[10px] tracking-widest">
                Cancelar e Sair
            </button>
         </div>
      </form>
    </div>
  );
}

function VehicleSetupView({ 
  onSubmit, 
  isLoading, 
  onLogout,
  openBrandPicker,
  openModelPicker,
  loadingBrands,
  loadingModels
}: { 
  onSubmit: (d: any) => void, 
  isLoading: boolean, 
  onLogout: () => void,
  openBrandPicker: any,
  openModelPicker: any,
  loadingBrands: boolean,
  loadingModels: boolean
}) {
  const [formData, setFormData] = useState({ 
    plate: "", 
    renavam: "", 
    model: "", 
    brand: "", 
    type: "carros" 
  });
  const [brandCode, setBrandCode] = useState("");

  const isFormValid = formData.plate.length >= 7 && formData.brand && formData.model;

  return (
    <div className="h-screen bg-background flex flex-col px-8 pt-12 pb-16 overflow-y-auto">
      <header className="mb-10 text-center">
         <div className="flex justify-center mb-6">
            <Logo size="md" />
         </div>
         <h2 className="text-2xl font-black text-white uppercase leading-tight">Cadastre seu Veículo</h2>
         <p className="text-white/40 text-sm mt-2 max-w-xs mx-auto italic font-medium">Você foi aprovado! Precisamos dos dados do seu veículo principal para liberar o sistema.</p>
      </header>

      <form className="space-y-4 max-w-sm mx-auto w-full" onSubmit={(e) => { 
        e.preventDefault(); 
        if (!isFormValid) return;
        onSubmit(formData); 
      }}>
         <div className="space-y-2">
            <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Placa</label>
            <input 
               type="text" 
               required 
               placeholder="ABC1D23"
               value={formData.plate}
               onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
               className="w-full bg-surface-container border border-white/10 p-4 rounded-2xl text-white font-bold outline-none uppercase text-center tracking-widest"
            />
         </div>

         <div className="space-y-2">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">Tipo de Veículo</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value, brand: '', model: ''})}
              className="w-full bg-surface-container border border-white/10 p-4 rounded-2xl text-white font-bold outline-none"
            >
              <option value="carros">Carro de Passeio / Utilitário</option>
              <option value="motos">Moto / Motociclo</option>
              <option value="caminhoes">Caminhão / Ônibus</option>
            </select>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Marca</label>
               <button 
                  type="button"
                  onClick={() => openBrandPicker(formData.type, (b: any) => {
                    setFormData(prev => ({ ...prev, brand: b.nome, model: '' }));
                    setBrandCode(b.codigo);
                  })}
                  className="w-full bg-surface-container border border-white/10 p-4 rounded-2xl text-white font-bold text-left overflow-hidden whitespace-nowrap text-ellipsis min-h-[56px] text-xs uppercase"
               >
                  {formData.brand || (loadingBrands ? '...' : 'SELECIONAR')}
               </button>
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-primary uppercase tracking-widest ml-1">Modelo</label>
               <button 
                  type="button"
                  disabled={!formData.brand || loadingModels}
                  onClick={() => openModelPicker(formData.type, brandCode, (m: any) => setFormData(prev => ({ ...prev, model: m.nome })))}
                  className="w-full bg-surface-container border border-white/10 p-4 rounded-2xl text-white font-bold text-left overflow-hidden whitespace-nowrap text-ellipsis min-h-[56px] text-xs uppercase disabled:opacity-30"
               >
                  {formData.model || (loadingModels ? '...' : 'SELECIONAR')}
               </button>
            </div>
         </div>

         <div className="pt-8">
            <button 
               type="submit"
               disabled={isLoading || !isFormValid}
               className="w-full py-5 bg-primary text-black font-black rounded-2xl uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(204,255,0,0.2)] disabled:opacity-30 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
               {isLoading ? <Loader2 className="animate-spin text-black" size={20} /> : "Finalizar Cadastro"}
            </button>
            <button type="button" onClick={onLogout} className="w-full mt-6 text-white/20 font-black uppercase text-[10px] tracking-widest hover:text-white transition-colors">
                Sair do App por enquanto
            </button>
         </div>
      </form>
    </div>
  );
}

function AdminDashboardView() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const resp = await fetch("/api/admin/pending-users");
      const data = await resp.json();
      setPending(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: number, approve: boolean) => {
    try {
      const resp = await fetch("/api/admin/approve-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approve })
      });
      if (resp.ok) {
        MySwal.fire({
          icon: 'success',
          title: approve ? 'Aprovado' : 'Negado',
          background: '#151515',
          color: '#fff',
          timer: 1500,
          showConfirmButton: false
        });
        fetchPending();
      }
    } catch (e) {
      alert("Erro ao processar ação.");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  if (loading) return <div className="p-8 text-center text-white/20">Carregando solicitações...</div>;

  return (
    <div className="p-6 h-full overflow-y-auto pb-24">
       <header className="mb-8 flex justify-between items-start">
          <div>
             <h2 className="text-2xl font-black text-white uppercase">Pendentes de Aprovação</h2>
          </div>
          <button 
             onClick={fetchPending}
             className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary hover:bg-primary/20 transition-all active:scale-95"
             title="Atualizar"
          >
             <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
       </header>

       <div className="space-y-4">
          {pending.length === 0 ? (
            <div className="bg-surface-container p-8 rounded-2xl text-center border border-white/5">
               <CheckCircle2 className="w-8 h-8 text-white/10 mx-auto mb-2" />
               <p className="text-white/40 text-sm font-medium">Nenhuma solicitação pendente.</p>
            </div>
          ) : (
            pending.map(p => (
               <div key={p.id_motorista} className="bg-surface-container border border-white/10 p-5 rounded-2xl">
                  <div className="mb-4">
                     <p className="text-white font-black text-lg leading-tight text-primary uppercase">{p.nm_mot}</p>
                     <p className="text-white/40 text-xs font-medium">{p.ds_email}</p>
                     <div className="mt-3 space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                       <p className="text-white/60 text-[10px] font-bold">TELEFONE: {p.ds_telefone}</p>
                       <p className="text-white/60 text-[10px] font-bold">CPF: {formatCPF(p.nu_mot_cpf || '')}</p>
                       <p className="text-white/60 text-[10px] font-bold">CNH: {p.nu_mot_cnh || '---'}</p>
                       <p className="text-white/60 text-[10px] font-bold">VAL. CNH: {p.dt_mot_cnh_val ? new Date(p.dt_mot_cnh_val).toLocaleDateString() : '---'}</p>
                     </div>
                     <p className="text-[10px] text-primary/40 font-black uppercase mt-3 tracking-tighter">Solicitado em {new Date(p.dt_cadastro).toLocaleDateString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => {
                          MySwal.fire({
                            title: 'Sim, aprovar!',
                            text: `Deseja aprovar o cadastro de ${p.nm_mot}?`,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: 'Aprovar',
                            cancelButtonText: 'Cancelar',
                            background: '#151515',
                            color: '#fff',
                            confirmButtonColor: '#ccff00'
                          }).then((result) => {
                            if (result.isConfirmed) handleAction(p.id_motorista, true);
                          });
                        }}
                        className="py-3 bg-primary text-black font-black text-[10px] rounded-xl uppercase tracking-widest active:scale-95 transition-all"
                     >
                        Aprovar
                     </button>
                     <button 
                        onClick={() => {
                          MySwal.fire({
                            title: 'Negar cadastro?',
                            text: `Deseja negar o cadastro de ${p.nm_mot}?`,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonText: 'Negar',
                            cancelButtonText: 'Cancelar',
                            background: '#151515',
                            color: '#fff',
                            confirmButtonColor: '#ef4444'
                          }).then((result) => {
                            if (result.isConfirmed) handleAction(p.id_motorista, false);
                          });
                        }}
                        className="py-3 bg-red-500/10 text-red-500 font-black text-[10px] rounded-xl uppercase tracking-widest border border-red-500/20 active:scale-95 transition-all"
                     >
                        Negar
                     </button>
                  </div>
               </div>
            ))
          )}
       </div>
    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  active, 
  onClick 
}: { 
  icon: ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-1 px-1 transition-all active:scale-95 rounded-full min-w-[60px] ${
        active 
          ? "text-[#ccff00]" 
          : "text-white/50 hover:text-white"
      }`}
    >
      <div className={`p-2 rounded-full transition-all ${
        active ? "bg-[#ccff00]/10" : ""
      }`}>
        {icon}
      </div>
      <span className="text-[0.6rem] uppercase tracking-tighter mt-0.5 font-bold">{label}</span>
    </button>
  );
}

function HistoryView({ selectedVehicle }: { selectedVehicle: any }) {
  const [historyData, setHistoryData] = useState<{
    processed: any[],
    unprocessed: any[],
    unknown_station: any[]
  }>({ processed: [], unprocessed: [], unknown_station: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'processed' | 'unprocessed' | 'unknown_station'>('processed');
  const [processedView, setProcessedView] = useState<'chronological' | 'by_station'>('chronological');

  const ensureAbsoluteUrl = (url: string) => {
    if (!url) return "#";
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const formatDate = (dateStr: string | null, formattedDate: string | null) => {
    if (formattedDate) return formattedDate;
    if (!dateStr) return "Sincronizado";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Sincronizado";
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return "Sincronizado";
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedVehicle 
        ? `/api/history?id_veiculo=${selectedVehicle.id_veiculo}` 
        : "/api/history";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Erro ao carregar histórico");
      const data = await response.json();
      
      const processedNotes: Record<number, any> = {};
      const unknownStationNotes: Record<number, any> = {};
      const unprocessedNotes: Record<number, any> = {};

      data.forEach((row: any) => {
        const id = row.id_qrcode;
        
        // Categorization based on fl_processado flag
        // 0: Pending/Processing
        // 1: Success/Processed
        // 2: Error/Duplicate/Rejected
        
        if (row.fl_processado === 2) {
          // Rejected/Duplicate
          if (!unknownStationNotes[id]) {
            unknownStationNotes[id] = { 
              id_qrcode: row.id_qrcode,
              url_qrcode: row.url_qrcode,
              dt_qrcode: row.dt_qrcode,
              dh_processamento: row.dh_processamento,
              dh_emissao_nfe: row.dh_emissao_nfe,
              iso_date: row.iso_date,
              formatted_date: row.formatted_date,
              items: [],
              total: 0,
              is_rejected: true 
            };
          }
        } else if (row.fl_processado === 0 || row.vl_preco_unitario === null) {
          // Still processing or missing data
          if (!unprocessedNotes[id]) {
            unprocessedNotes[id] = { 
              id_qrcode: row.id_qrcode,
              url_qrcode: row.url_qrcode,
              dt_qrcode: row.dt_qrcode,
              iso_date: row.iso_date,
              formatted_date: row.formatted_date
            };
          }
        } else {
          // Processed (fl_processado = 1 and has price)
          if (row.nm_posto !== null) {
            // Known station (Processed)
            if (!processedNotes[id]) {
              processedNotes[id] = { 
                id_qrcode: row.id_qrcode,
                url_qrcode: row.url_qrcode,
                dt_qrcode: row.dt_qrcode,
                dh_processamento: row.dh_processamento,
                dh_emissao_nfe: row.dh_emissao_nfe,
                iso_date: row.iso_date,
                formatted_date: row.formatted_date,
                nm_posto: row.nm_posto,
                nm_municipio: row.nm_municipio,
                items: [],
                total: 0
              };
            }
            if (row.ds_produto) {
              const liters = parseFloat(row.nu_litros || 0);
              const price = parseFloat(row.vl_preco_unitario || 0);
              const itemTotal = liters * price;
              processedNotes[id].items.push({
                ds_produto: row.ds_produto,
                vl_preco_unitario: row.vl_preco_unitario,
                nu_litros: row.nu_litros,
                vl_economia: row.vl_economia,
                itemTotal
              });
              processedNotes[id].total += itemTotal;
              if (row.dh_emissao_nfe) {
                 processedNotes[id].dt_exibicao = row.dh_emissao_nfe;
              }
            }
          } else {
            // Unknown station or extraction results without station match
            if (!unknownStationNotes[id]) {
              unknownStationNotes[id] = { 
                id_qrcode: row.id_qrcode,
                url_qrcode: row.url_qrcode,
                dt_qrcode: row.dt_qrcode,
                dh_processamento: row.dh_processamento,
                dh_emissao_nfe: row.dh_emissao_nfe,
                iso_date: row.iso_date,
                formatted_date: row.formatted_date,
                items: [],
                total: 0
              };
            }
            if (row.ds_produto) {
              const liters = parseFloat(row.nu_litros || 0);
              const price = parseFloat(row.vl_preco_unitario || 0);
              const itemTotal = liters * price;
              unknownStationNotes[id].items.push({
                ds_produto: row.ds_produto,
                vl_preco_unitario: row.vl_preco_unitario,
                nu_litros: row.nu_litros,
                vl_economia: row.vl_economia,
                itemTotal
              });
              unknownStationNotes[id].total += itemTotal;
              if (row.dh_emissao_nfe) {
                 unknownStationNotes[id].dt_exibicao = row.dh_emissao_nfe;
              }
            }
          }
        }
      });

      setHistoryData({
        processed: Object.values(processedNotes).sort((a: any, b: any) => new Date(b.dt_exibicao || b.iso_date).getTime() - new Date(a.dt_exibicao || a.iso_date).getTime()),
        unprocessed: Object.values(unprocessedNotes).sort((a: any, b: any) => new Date(b.iso_date).getTime() - new Date(a.iso_date).getTime()),
        unknown_station: Object.values(unknownStationNotes).sort((a: any, b: any) => new Date(b.dt_exibicao || b.iso_date).getTime() - new Date(a.dt_exibicao || a.iso_date).getTime())
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const getGroupedByStation = () => {
    const stations: Record<string, any> = {};
    historyData.processed.forEach(note => {
      const stationName = note.nm_posto || "Posto Desconhecido";
      if (!stations[stationName]) {
        stations[stationName] = { 
          name: stationName, 
          last_update: note.dt_exibicao || note.iso_date,
          total_station: 0,
          total_economy_station: 0,
          notes: [] 
        };
      }
      stations[stationName].notes.push(note);
      stations[stationName].total_station += note.total || 0;
      
      const noteEconomy = note.items?.reduce((acc: number, item: any) => acc + (parseFloat(item.vl_economia) || 0), 0) || 0;
      stations[stationName].total_economy_station += noteEconomy;

      if (new Date(note.dt_exibicao || note.iso_date) > new Date(stations[stationName].last_update)) {
        stations[stationName].last_update = note.dt_exibicao || note.iso_date;
      }
    });
    return Object.values(stations).sort((a, b) => new Date(b.last_update).getTime() - new Date(a.last_update).getTime());
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedVehicle]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-on-surface-variant">
        <Loader2 size={48} className="animate-spin text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.6)] mb-4" />
        <p className="font-bold animate-pulse text-sm uppercase tracking-widest opacity-50">Carregando registros...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-black/40">
        <div className="text-red-500 mb-4 bg-red-500/10 p-6 rounded-full border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <Info size={48} />
        </div>
        <h2 className="text-xl font-black mb-2 uppercase tracking-tight text-white">Ops! Erro de Sincronização</h2>
        <p className="text-on-surface-variant mb-6 opacity-60 text-sm font-medium">{error}</p>
        <button 
          onClick={fetchHistory}
          className="flex items-center gap-2 bg-primary text-black font-black uppercase tracking-widest px-8 py-4 rounded-2xl active:scale-95 transition-all shadow-lg"
        >
          <RefreshCw size={20} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  const allNotesCount = historyData.processed.length + historyData.unprocessed.length + historyData.unknown_station.length;

  if (allNotesCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center text-on-surface-variant bg-black/20">
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"></div>
           <Clock size={80} className="relative opacity-10 text-primary" />
        </div>
        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter text-white">Histórico Vazio</h2>
        <p className="opacity-40 text-sm font-bold uppercase tracking-widest leading-relaxed">
          Você ainda não escaneou nenhuma nota fiscal<br/>ou seus dados estão sendo processados.
        </p>
      </div>
    );
  }

  const renderNoteCard = (note: any, index: number) => (
    <div 
      key={note.id_qrcode}
      className="bg-[#111111] p-4 rounded-lg border border-gray-800 flex flex-col gap-3 relative mb-4"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-800">
            <Fuel size={20} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase text-gray-500 tracking-widest">
              {note.nm_posto ? "Estabelecimento" : "QR Code"}
            </span>
            <span className="text-[12px] font-bold text-white/90 uppercase line-clamp-1">
              {note.nm_posto || "Pendente ou Não Localizado"}
            </span>
          </div>
        </div>
        <button 
          onClick={() => window.open(ensureAbsoluteUrl(note.url_qrcode), '_blank')}
          className="p-2 text-primary border border-gray-800 rounded-lg bg-black/40"
        >
          <ExternalLink size={18} />
        </button>
      </div>

      <div className="space-y-3">
        {(note.items && note.items.length > 0) ? note.items.map((item: any, idx: number) => (
          <div key={idx} className={`pt-2 ${idx > 0 ? "border-t border-gray-800" : ""}`}>
            <div className="flex justify-between items-center mb-1">
              <span className="px-2 py-0.5 bg-gray-900 text-primary text-[10px] font-bold uppercase rounded border border-gray-800">
                {item.ds_produto}
              </span>
              <span className="text-[10px] font-bold text-gray-400 uppercase">
                Sub: R$ {formatNumber(item.itemTotal, 2)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-500">Preço</span>
                <span className="text-sm font-bold text-white">
                  {item.vl_preco_unitario ? `R$ ${formatNumber(item.vl_preco_unitario, 3)}` : "—"}
                </span>
              </div>
              <div className="flex flex-col border-x border-gray-800 px-1">
                <span className="text-[10px] uppercase font-bold text-gray-500">Litros</span>
                <span className="text-sm font-bold text-white">
                  {item.nu_litros ? `${formatNumber(item.nu_litros, 3)}L` : "—"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-gray-500">Econ.</span>
                <span className={`text-sm font-bold ${parseFloat(item.vl_economia) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {item.vl_economia ? `R$ ${formatNumber(Math.abs(parseFloat(item.vl_economia)), 2)}` : "—"}
                </span>
              </div>
            </div>
          </div>
        )) : note.is_rejected ? (
          <div className="bg-red-950/20 p-3 rounded-lg border border-red-900/30 flex flex-col items-center">
             <span className="text-[10px] font-bold uppercase text-red-500">Nota Rejeitada</span>
             <span className="text-[10px] text-gray-500 text-center uppercase font-bold">
               QR Code já processado ou erro na SEFAZ.
             </span>
          </div>
        ) : (
          <div className="bg-gray-900/20 p-3 rounded-lg border border-dashed border-gray-800 flex flex-col items-center">
             <span className="text-[10px] font-bold uppercase text-primary/60">Processando...</span>
             <span className="text-[10px] text-gray-500 text-center uppercase font-bold">
               Extraindo dados da nota
             </span>
          </div>
        )}
      </div>

      {note.total > 0 && (
        <div className="flex flex-col gap-1 border-t border-gray-800 pt-2">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-gray-500 uppercase">Total NFe:</span>
            <span className="text-primary">R$ {formatNumber(note.total, 2)}</span>
          </div>
          {(() => {
            const totalEconomy = note.items?.reduce((acc: number, item: any) => acc + (parseFloat(item.vl_economia) || 0), 0) || 0;
            return totalEconomy !== 0 ? (
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-gray-500 uppercase">Total Economia:</span>
                <span className={totalEconomy >= 0 ? "text-green-500" : "text-red-500"}>
                  R$ {formatNumber(Math.abs(totalEconomy), 2)}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      )}
      
      <div className="flex flex-col gap-1 pt-2 border-t border-gray-800 text-[10px] font-bold text-gray-500 uppercase">
        <div className="flex justify-between items-center">
           <div className="flex items-center gap-1">
            <Clock size={10} />
            <span>Nf-e: {formatDate(note.dt_exibicao || note.dt_qrcode, note.formatted_date)}</span>
          </div>
          {note.dh_processamento && (
             <div className="flex items-center gap-1">
              <ShieldCheck size={10} />
              <span>Proc: {formatDate(note.dh_processamento, null)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getActiveList = () => {
    switch(activeSubTab) {
      case 'processed': return historyData.processed;
      case 'unprocessed': return historyData.unprocessed;
      case 'unknown_station': return historyData.unknown_station;
      default: return [];
    }
  };

  return (
    <div className="flex flex-col h-full bg-background no-scrollbar">
      {/* Header */}
      <div className="p-4 bg-background border-b border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold uppercase tracking-tighter text-white">Central de Notas</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
              Gestão de Abastecimentos
            </p>
          </div>
          <button 
            onClick={fetchHistory}
            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-lg"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Categories Tabs - Simple buttons */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'processed', label: 'OK', count: historyData.processed.length, color: 'text-green-400' },
            { id: 'unprocessed', label: 'PROC', count: historyData.unprocessed.length, color: 'text-yellow-400' },
            { id: 'unknown_station', label: 'REJ', count: historyData.unknown_station.length, color: 'text-red-400' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg border ${
                activeSubTab === tab.id 
                ? 'bg-white/10 border-primary text-white' 
                : 'bg-white/5 border-transparent text-white/40'
              }`}
            >
              <span className="text-[8px] font-bold uppercase tracking-widest mb-1">{tab.label}</span>
              <span className={`text-xs font-bold ${tab.color}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* View Switches */}
        {activeSubTab === 'processed' && historyData.processed.length > 0 && (
          <div className="flex gap-2">
            <button
                onClick={() => setProcessedView('chronological')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase border ${
                  processedView === 'chronological' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white/40 border-transparent'
                }`}
              >
                <LayoutList size={14} />
                Lista
              </button>
              <button
                onClick={() => setProcessedView('by_station')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase border ${
                  processedView === 'by_station' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-white/40 border-transparent'
                }`}
              >
                <Building2 size={14} />
                Posto
              </button>
          </div>
        )}
      </div>

      {/* Main List - Scrolling handled by common parent main */}
      <div className="p-4 space-y-4 pb-32">
        {activeSubTab === 'processed' && processedView === 'by_station' ? (
          // Grouped by Station View
          <div className="space-y-6">
            {getGroupedByStation().map((station: any, sIdx: number) => (
              <div key={sIdx} className="space-y-3">
                <div className="flex items-center gap-3 pt-2">
                  <h3 className="text-[13px] font-black uppercase tracking-tight text-white/90">
                    {station.name}
                  </h3>
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-sm font-black text-primary">R$ {formatNumber(station.total_station, 2)}</span>
                </div>
                <div className="space-y-4">
                  {station.notes.map((note: any, nIdx: number) => renderNoteCard(note, nIdx))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Standard List (Chronological)
          <div className="space-y-4">
            {getActiveList().length > 0 ? (
              getActiveList().map((item, index) => renderNoteCard(item, index))
            ) : (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                   <Clock size={24} className="opacity-20" />
                </div>
                <div className="space-y-1">
                   <p className="text-[0.7rem] font-black uppercase tracking-widest text-white/50">Nenhum registro nesta categoria</p>
                   {activeSubTab === 'unprocessed' ? (
                     <p className="text-[0.6rem] font-bold uppercase text-primary/60">Tudo em dia! Nenhuma nota aguardando leitura.</p>
                   ) : activeSubTab === 'unknown_station' ? (
                     <p className="text-[0.6rem] font-bold uppercase text-red-500/40">Todos os postos identificados estão na base.</p>
                   ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const BRAND_OPTIONS = [
  {
    id: 'petrobras',
    label: 'Petrobras',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <defs>
          <clipPath id="br-circle-clip-filter">
            <circle cx="20" cy="16" r="11" />
          </clipPath>
        </defs>
        <g clipPath="url(#br-circle-clip-filter)">
          <rect x="9" y="5" width="22" height="22" fill="#ffffff" />
          <g transform="translate(-1.6, -0.65) scale(0.225)">
            <path fill="#ffffff" d="M56.019 34.929h79.449v79.292H56.019V34.929z"/>
            <path fill="#ffd100" d="M135.859 53.43H56.527V34.073h79.332V53.43z"/>
            <path fill="#008c45" d="M56.68 64.002h79.299v50.387H56.68V64.002z"/>
            <path d="M63.838 93.146l8.361-29.21 14.412-.089c9.731-.164 11.952 8.897 4.471 14.471 6.334 3.904 2.206 15.067-7.958 14.873l-19.286-.045zM96.435 93.295l8.331-29.448 14.933-.089c10.939-.134 10.671 12.742 1.49 16.378 2.087.477 2.803 1.818 2.966 3.502l.492 9.836h-7.974l-.446-8.644c.044-1.55-.835-2.534-3.309-2.608l-4.919-.015-2.965 11.088h-8.599z" fill="#ffffff"/>
            <path d="M77.604 75.124l1.401-5.484h7.064c3.249.7 2.549 5.111-1.117 5.469l-7.348.015zM74.189 87.128l1.891-6.319h7.247c3.275.807 2.192 5.89-1.598 6.302l-7.54.017zM109.487 76.356l1.82-6.56h7.249c3.312.807 2.198 6.13-1.634 6.542l-7.435.018z" fill="#008c45"/>
          </g>
        </g>
        <circle cx="20" cy="16" r="11" fill="none" stroke="#ffffff" strokeWidth={0.3} opacity="0.8" />
      </svg>
    )
  },
  {
    id: 'shell',
    label: 'Shell',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <defs>
          <clipPath id="shell-circle-clip-filter">
            <circle cx="20" cy="16" r="11" />
          </clipPath>
        </defs>
        <g clipPath="url(#shell-circle-clip-filter)">
          <rect x="9" y="5" width="22" height="22" fill="#ffffff" />
          <image 
            href="/shell.png" 
            x="11" 
            y="7" 
            width="18" 
            height="18" 
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
        <circle cx="20" cy="16" r="11" fill="none" stroke="#ffffff" strokeWidth={0.3} opacity="0.8" />
      </svg>
    )
  },
  {
    id: 'ipiranga',
    label: 'Ipiranga',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <defs>
          <clipPath id="ipiranga-circle-clip-filter">
            <circle cx="20" cy="16" r="11" />
          </clipPath>
        </defs>
        <g clipPath="url(#ipiranga-circle-clip-filter)">
          <rect x="9" y="5" width="22" height="22" fill="#F8CD1C" />
          <g transform="translate(10.8, 6.8) scale(0.184)">
            <path d="M76.5,26.5 C76.5,26.5 40,25 25,48 C16.5,61 24,73.5 24,73.5 C24,73.5 40.5,58.5 53.5,49 L55,73 C55,75 57,75 59,74 C69.5,68.5 76.5,55 76.5,41 V26.5 Z" fill="#005CBB" />
            <polygon points="51,32 68.5,32 55.5,46" fill="#F8CD1C" stroke="#F8CD1C" strokeWidth={1.2} strokeLinejoin="round" />
          </g>
        </g>
        <circle cx="20" cy="16" r="11" fill="none" stroke="#ffffff" strokeWidth={0.3} opacity="0.8" />
      </svg>
    )
  },
  {
    id: 'ale',
    label: 'ALE',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <circle cx="20" cy="16" r="11" fill="#00529B" />
        <path d="M 13.5 21 L 17.5 11.2 L 20 11.2 L 16.5 21 Z" fill="#FFFFFF" />
        <path d="M 18.5 11.2 L 21 11.2 L 25 21 L 22 21 Z" fill="#ED1C24" />
        <rect x="15" y="16.5" width="6.5" height="1.8" fill="#FFFFFF" />
      </svg>
    )
  },
  {
    id: 'branca',
    label: 'Branca',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <circle cx="20" cy="16" r="11" fill="#FFFFFF" stroke="#475569" strokeWidth={1} />
        <text x="20" y="15" fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="900" fontSize="5.5px" fill="#1e293b" textAnchor="middle">BAND.</text>
        <text x="20" y="21" fontFamily="'Helvetica Neue', Arial, sans-serif" fontWeight="900" fontSize="5.5px" fill="#1e293b" textAnchor="middle">BRANCA</text>
      </svg>
    )
  },
  {
    id: 'nexta',
    label: 'Nexta',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <path d="M 20 5 A 11 11 0 0 0 20 27 Z" fill="#00A19C" />
        <path d="M 16.5 13 C 14.5 15, 13.5 17, 13.5 18 A 2.5 2.5 0 0 0 18.5 18 C 18.5 17, 18.5 15, 16.5 13 Z" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeLinejoin="round" />
        <circle cx="16.5" cy="18" r="0.8" fill="#FFFFFF" />
        <path d="M 20 5 A 11 11 0 0 1 20 27 Z" fill="#FFFFFF" />
        <path d="M 20.5 14 Q 23.5 11, 26 13 Q 28 15, 25 18 T 20.5 19.5" fill="none" stroke="#ED1C24" strokeWidth={1.2} strokeLinecap="round" />
        <path d="M 23 16 Q 22 19, 21.5 21.5 Q 23.5 23.5, 25 21" fill="none" stroke="#00529B" strokeWidth={1} strokeLinecap="round" />
        <path d="M 21.5 17 Q 24.5 20, 25 23" fill="none" stroke="#FFBF00" strokeWidth={0.8} />
      </svg>
    )
  },
  {
    id: 'petrobrasil',
    label: 'Petrobrasil',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <circle cx="20" cy="16" r="11" fill="#1b5e20" />
        <path d="M 20 9.5 C 17 13.5, 16.2 15.5, 16.2 17.5 A 3.8 3.8 0 0 0 23.8 17.5 C 23.8 15.5, 23 13.5, 20 9.5 Z" fill="#fbc02d" />
        <text x="20" y="19" fontFamily="'Arial Black', sans-serif" fontWeight="950" fontSize="5px" fill="#1b5e20" textAnchor="middle">PB</text>
      </svg>
    )
  },
  {
    id: 'outras',
    label: 'Outras',
    svg: (
      <svg viewBox="9 5 22 22" className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 p-0.5">
        <circle cx="20" cy="16" r="11" fill="#1e293b" />
        <g transform="translate(13.5, 9.5) scale(0.65)">
          <path d="M12,4.5 h2.5 c1.7,0,3.5,1.5,3.5,3.5 v0.5 c0,2,-1.8,3.5,-3.5,3.5 h-2.5" fill="none" stroke="#fbbf24" strokeWidth={2} />
          <path d="M12,10.5 l3,-1.8" fill="none" stroke="#fbbf24" strokeWidth={1.5} strokeLinecap="round" />
          <rect x="4" y="3" width="8" height="9" rx="2" fill="#fbbf24" />
          <rect x="2" y="4.5" width="2" height="5" rx="0.5" fill="#fbbf24" />
          <path d="M3,7 C 0.5,7 -1.5,9 -1.5,12.5" fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinecap="round" />
          <circle cx="-1.5" cy="16" r="1.5" fill="#fbbf24" />
        </g>
      </svg>
    )
  }
];

function getStationBrandSvg(brandName: string) {
  const brand = (brandName || '').toLowerCase().trim();
  if (brand.includes('branca') || brand.includes('sem bandeira') || brand === '' || brand.includes('independente')) {
    return BRAND_OPTIONS.find(b => b.id === 'branca')?.svg;
  }
  if (!brand.includes('petrobrasil') && (brand.includes('petrobras') || brand.includes('vibra') || brand === 'br' || brand.startsWith('br ') || brand.endsWith(' br') || brand.includes(' br '))) {
    return BRAND_OPTIONS.find(b => b.id === 'petrobras')?.svg;
  }
  if (brand.includes('shell') || brand.includes('raizen')) {
    return BRAND_OPTIONS.find(b => b.id === 'shell')?.svg;
  }
  if (brand.includes('ipiranga')) {
    return BRAND_OPTIONS.find(b => b.id === 'ipiranga')?.svg;
  }
  if (brand.includes('ale')) {
    return BRAND_OPTIONS.find(b => b.id === 'ale')?.svg;
  }
  if (brand.includes('nexta')) {
    return BRAND_OPTIONS.find(b => b.id === 'nexta')?.svg;
  }
  if (brand.includes('petrobrasil')) {
    return BRAND_OPTIONS.find(b => b.id === 'petrobrasil')?.svg;
  }
  return BRAND_OPTIONS.find(b => b.id === 'outras')?.svg;
}

function SearchFuelView({ 
  user, 
  selectedVehicle, 
  fuelTypes, 
  setFuelTypes,
  locationName,
  setLocationName,
  userLocation,
  setUserLocation,
  locationError,
  setLocationError
}: { 
  user: User | null, 
  selectedVehicle: Vehicle | null, 
  fuelTypes: any[], 
  setFuelTypes: (v: any[]) => void,
  locationName: string,
  setLocationName: (v: string) => void,
  userLocation: {lat: number, lng: number} | null,
  setUserLocation: (v: {lat: number, lng: number} | null) => void,
  locationError: string | null,
  setLocationError: (v: string | null) => void
}) {
  const [selectedFuel, setSelectedFuel] = useState<number | null>(null);
  const [radius, setRadius] = useState(user?.searchRadius || 10);
  const [openNow, setOpenNow] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loadingFuels, setLoadingFuels] = useState(fuelTypes.length === 0);
  const [gasStations, setGasStations] = useState<any[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);

  const filteredStations = useMemo(() => {
    if (selectedBrands.length === 0) return gasStations;
    return gasStations.filter(station => {
      const brand = (station.nm_bandeira || '').toLowerCase().trim();
      return selectedBrands.some(sel => {
        const s = sel.toLowerCase();
        if (s === 'branca') {
          return brand.includes('branca') || brand.includes('sem bandeira') || brand === '' || brand.includes('independente');
        }
        if (s === 'petrobras') {
          if (brand.includes('petrobrasil')) return false;
          if (brand.includes('branca') || brand.includes('sem bandeira') || brand === '' || brand.includes('independente')) return false;
          return brand.includes('petrobras') || brand.includes('vibra') || brand === 'br' || brand.startsWith('br ') || brand.endsWith(' br') || brand.includes(' br ');
        }
        if (s === 'shell') {
          return brand.includes('shell') || brand.includes('raizen');
        }
        if (s === 'ipiranga') {
          return brand.includes('ipiranga');
        }
        if (s === 'ale') {
          return brand.includes('ale');
        }
        if (s === 'nexta') {
          return brand.includes('nexta');
        }
        if (s === 'petrobrasil') {
          return brand.includes('petrobrasil');
        }
        if (s === 'outras') {
          const isPetrobras = !brand.includes('petrobrasil') && 
                              !(brand.includes('branca') || brand.includes('sem bandeira') || brand === '' || brand.includes('independente')) &&
                              (brand.includes('petrobras') || brand.includes('vibra') || brand === 'br' || brand.startsWith('br ') || brand.endsWith(' br') || brand.includes(' br '));

          const isKnown = brand.includes('branca') || brand.includes('sem bandeira') || brand === '' || brand.includes('independente') ||
                          isPetrobras ||
                          brand.includes('shell') || brand.includes('raizen') ||
                          brand.includes('ipiranga') ||
                          brand.includes('ale') ||
                          brand.includes('nexta') ||
                          brand.includes('petrobrasil');
          return !isKnown;
        }
        return brand.includes(s);
      });
    });
  }, [gasStations, selectedBrands]);

  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mapAuthError, setMapAuthError] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedStation, setSelectedStation] = useState<any>(null);

  useEffect(() => {
    if (selectedStation && !filteredStations.some(s => s.nm_posto === selectedStation.nm_posto)) {
      setSelectedStation(null);
    }
  }, [filteredStations, selectedStation]);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const concentricCirclesRef = useRef<google.maps.Circle[]>([]);
  const concentricLabelsRef = useRef<google.maps.Marker[]>([]);
  const radarSweepPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const radarSweepLineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (selectedVehicle?.id_comb_pref !== undefined && selectedVehicle?.id_comb_pref !== null) {
      setSelectedFuel(selectedVehicle.id_comb_pref);
    } else if (user?.preferredFuel !== undefined && user?.preferredFuel !== null) {
      setSelectedFuel(user.preferredFuel);
    }
  }, [selectedVehicle, user]);

  useEffect(() => {
    if (user?.searchRadius) {
      setRadius(user.searchRadius);
    }
  }, [user]);

  useEffect(() => {
    if (mapInstance && userLocation) {
      mapInstance.panTo(userLocation);
    }
  }, [userLocation, mapInstance]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDLndRDDFSIMib6WXUhgtRq5L8nTwXCrvo",
    libraries: ['places']
  });

  const filteredFuelTypes = useMemo(() => {
    if (!selectedVehicle?.ds_combs_permitidos) return fuelTypes;
    const allowed = selectedVehicle.ds_combs_permitidos.split(',').map(Number);
    return fuelTypes.filter(f => allowed.includes(f.id_produto));
  }, [fuelTypes, selectedVehicle]);

  useEffect(() => {
    // Handle Google Maps auth failures (like RefererNotAllowedMapError)
    (window as any).gm_authFailure = () => {
      setMapAuthError(true);
    };
  }, []);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMapInstance(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMapInstance(null);
  }, []);

  useEffect(() => {
    if (!mapInstance || !userLocation) return;
    
    // 1. Core outer search radius circle (Always visible so user knows the area)
    if (!circleRef.current) {
      circleRef.current = new window.google.maps.Circle({
        map: mapInstance,
        center: userLocation,
        radius: radius * 1000,
        fillColor: "#fbbf24",
        fillOpacity: 0.08,
        strokeColor: "#fbbf24",
        strokeOpacity: 0.4,
        strokeWeight: 1.5,
        clickable: false,
        zIndex: 1
      });
    } else {
      circleRef.current.setRadius(radius * 1000);
      circleRef.current.setCenter(userLocation);
    }

    // Helper functions
    const getOffsetLatLng = (centerPoint: {lat: number, lng: number}, distKm: number, headingDegrees: number) => {
      const theta = (headingDegrees * Math.PI) / 180;
      const latRadian = (centerPoint.lat * Math.PI) / 180;
      const deltaLat = (distKm * Math.cos(theta)) / 111.32;
      const deltaLng = (distKm * Math.sin(theta)) / (111.32 * Math.cos(latRadian));
      return {
        lat: centerPoint.lat + deltaLat,
        lng: centerPoint.lng + deltaLng
      };
    };

    // Helper to generate precise circular sector wedge paths
    const getWedgePath = (centerPoint: {lat: number, lng: number}, radiusKm: number, leadingAngle: number, startOffset: number, endOffset: number) => {
      const path = [centerPoint];
      const steps = 4; // Higher frame rates since we have multiple polygons
      const sectorStart = leadingAngle - startOffset;
      const sectorEnd = leadingAngle - endOffset;
      for (let i = 0; i <= steps; i++) {
        const angle = sectorStart - ((sectorStart - sectorEnd) * i) / steps;
        path.push(getOffsetLatLng(centerPoint, radiusKm, angle));
      }
      path.push(centerPoint);
      return path;
    };

    // Clean up any existing concentric circles and labels
    concentricCirclesRef.current.forEach(c => c.setMap(null));
    concentricCirclesRef.current = [];
    concentricLabelsRef.current.forEach(l => l.setMap(null));
    concentricLabelsRef.current = [];

    // Clean up active radar sweep line and polygons
    if (radarSweepLineRef.current) {
      radarSweepLineRef.current.setMap(null);
      radarSweepLineRef.current = null;
    }
    radarSweepPolygonsRef.current.forEach(p => p.setMap(null));
    radarSweepPolygonsRef.current = [];

    let animationId: number;

    // Create Concentric Grid Circles and custom distance Labels (Always visible for superior context)
    let ringInterval = 1;
    if (radius > 40) ringInterval = 10;
    else if (radius > 15) ringInterval = 5;
    else if (radius > 6) ringInterval = 2;

    const rings: google.maps.Circle[] = [];
    const labels: google.maps.Marker[] = [];
    const labelAngle = 45; // 45 degrees Northeast (diagonal matching reference image)

    // Intermediate rings
    for (let r = ringInterval; r < radius; r += ringInterval) {
      rings.push(new window.google.maps.Circle({
        map: mapInstance,
        center: userLocation,
        radius: r * 1000,
        fillColor: "transparent",
        strokeColor: "#fbbf24",
        strokeOpacity: 0.15, // light grid rings
        strokeWeight: 1.0,
        clickable: false,
        zIndex: 1
      }));

      // Beautiful customized distance label badge
      const labelPos = getOffsetLatLng(userLocation, r, labelAngle);
      labels.push(new window.google.maps.Marker({
        map: mapInstance,
        position: labelPos,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 0, // invisible anchor
        } as any,
        label: {
          text: `${r} km`,
          color: "#ffffff",
          fontSize: "10px",
          fontWeight: "700",
          className: "radar-map-label"
        },
        clickable: false,
        zIndex: 10
      } as any));
    }

    // Outer filter maximum radius label (at radius km limit)
    const outerLabelPos = getOffsetLatLng(userLocation, radius, labelAngle);
    labels.push(new window.google.maps.Marker({
      map: mapInstance,
      position: outerLabelPos,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 0,
      } as any,
      label: {
        text: `${radius} km (Máx)`,
        color: "#ffffff",
        fontSize: "10px",
        fontWeight: "700",
        className: "radar-map-label"
      },
      clickable: false,
      zIndex: 10
    } as any));

    concentricCirclesRef.current = rings;
    concentricLabelsRef.current = labels;

    // ACTIVE RADAR STATE (Triggered after a successful "BUSCAR" filter)
    if (filteredStations.length > 0) {
      // Initialize multiple gradient wedge sectors (Degradê)
      const numSectors = 15;
      const sectorWidth = 2.5; // total spread of 37.5 degrees
      const polygons: google.maps.Polygon[] = [];

      for (let i = 0; i < numSectors; i++) {
        const opacity = 0.26 * Math.pow(1 - i / numSectors, 1.8);
        polygons.push(new window.google.maps.Polygon({
          map: mapInstance,
          paths: getWedgePath(userLocation, radius, 0, i * sectorWidth, (i + 1) * sectorWidth),
          fillColor: "#fbbf24",
          fillOpacity: opacity,
          strokeWeight: 0,
          clickable: false,
          zIndex: 1
        }));
      }
      radarSweepPolygonsRef.current = polygons;

      // Initialize the sharp bright leading sweep edge line
      radarSweepLineRef.current = new window.google.maps.Polyline({
        map: mapInstance,
        path: [userLocation, getOffsetLatLng(userLocation, radius, 0)],
        strokeColor: "#fbbf24",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        clickable: false,
        zIndex: 1
      });

      // Animation ticks
      let currentAngle = 0;
      const sweepSpeed = 1.2; // degrees per frame (ideal smooth sweep)

      const tick = () => {
        currentAngle = (currentAngle + sweepSpeed) % 360;

        // Rotate each gradient slice
        if (radarSweepPolygonsRef.current.length === numSectors) {
          for (let i = 0; i < numSectors; i++) {
            const path = getWedgePath(userLocation, radius, currentAngle, i * sectorWidth, (i + 1) * sectorWidth);
            radarSweepPolygonsRef.current[i].setPath(path);
          }
        }

        // Rotate leading sweep line
        if (radarSweepLineRef.current) {
          const leading = getOffsetLatLng(userLocation, radius, currentAngle);
          radarSweepLineRef.current.setPath([userLocation, leading]);
        }

        animationId = requestAnimationFrame(tick);
      };

      animationId = requestAnimationFrame(tick);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      concentricCirclesRef.current.forEach(c => c.setMap(null));
      concentricCirclesRef.current = [];
      concentricLabelsRef.current.forEach(l => l.setMap(null));
      concentricLabelsRef.current = [];
      if (radarSweepLineRef.current) {
        radarSweepLineRef.current.setMap(null);
        radarSweepLineRef.current = null;
      }
      radarSweepPolygonsRef.current.forEach(p => p.setMap(null));
      radarSweepPolygonsRef.current = [];
    };
  }, [mapInstance, userLocation, radius, filteredStations.length]);

  useEffect(() => {
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      concentricCirclesRef.current.forEach(c => c.setMap(null));
      concentricCirclesRef.current = [];
      concentricLabelsRef.current.forEach(l => l.setMap(null));
      concentricLabelsRef.current = [];
      if (radarSweepLineRef.current) {
        radarSweepLineRef.current.setMap(null);
        radarSweepLineRef.current = null;
      }
      radarSweepPolygonsRef.current.forEach(p => p.setMap(null));
      radarSweepPolygonsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (fuelTypes.length === 0) {
      setLoadingFuels(true);
      fetch("/api/fuel-types")
        .then(r => r.json())
        .then(data => {
          const getFriendlyName = (ds: string) => {
            if (ds.includes("GASOLINA C COMUM ADITIVADA")) return "Gasolina Adit.";
            if (ds.includes("GASOLINA C COMUM")) return "Gasolina";
            if (ds.includes("GASOLINA C PREMIUM ADITIVADA")) return "Gas. Prem. Adit.";
            if (ds.includes("GASOLINA C PREMIUM")) return "Gas. Premium";
            if (ds.includes("GÁS NATURAL VEICULAR")) return "GNV";
            if (ds.includes("ETANOL HIDRATADO ADITIVADO")) return "Etanol Adit.";
            if (ds.includes("ETANOL HIDRATADO COMUM")) return "Etanol";
            if (ds.includes("ÓLEO DIESEL B S10 - ADITIVADO")) return "Diesel S10 Adit.";
            if (ds.includes("ÓLEO DIESEL B S10 - COMUM")) return "Diesel S10";
            if (ds.includes("ÓLEO DIESEL B S500 - ADITIVADO")) return "Diesel S500 Adit.";
            if (ds.includes("ÓLEO DIESEL B S500 - COMUM")) return "Diesel S500";
            return ds;
          };

          const processed = data.map((ft: any) => ({
            ...ft,
            friendlyName: getFriendlyName(ft.ds_produto)
          }));
          setFuelTypes(processed);
          setLoadingFuels(false);
        })
        .catch(err => {
          console.error("Failed to fetch fuel types", err);
          setLoadingFuels(false);
        });
    } else {
      setLoadingFuels(false);
    }
  }, [fuelTypes, setFuelTypes]);

  return (
    <div className="flex flex-col p-4 space-y-6 pb-24">


      {/* Map Card */}
      <div className={isMaximized 
        ? "fixed inset-0 z-[100] bg-background border-none rounded-none" 
        : "relative w-full h-64 rounded-2xl overflow-hidden border border-outline-variant/10"
      }>
        {loadError || mapAuthError ? (
          <div className="w-full h-full bg-surface-container-high flex flex-col items-center justify-center p-4 text-center">
            <MapIcon size={32} className="text-error mb-2 opacity-80" />
            <p className="text-sm font-bold text-error mb-1">Erro de Permissão do Mapa</p>
            <p className="text-[10px] text-on-surface-variant opacity-70">
              A URL atual não está autorizada no Google Cloud Console.
              Adicione <b>*ais-dev-ukzavgnzkmealgrkbow2y4-208739707276.us-west2.run.app/*</b> nas restrições da chave de API.
            </p>
          </div>
        ) : !isLoaded ? (
          <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={userLocation || { lat: -22.5112, lng: -43.1779 }}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              disableDefaultUI: true,
              styles: [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                {
                  featureType: "administrative.locality",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#d59563" }],
                },
                {
                  featureType: "poi",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#d59563" }],
                },
                {
                  featureType: "poi.park",
                  elementType: "geometry",
                  stylers: [{ color: "#263c3f" }],
                },
                {
                  featureType: "poi.park",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#6b9a76" }],
                },
                {
                  featureType: "road",
                  elementType: "geometry",
                  stylers: [{ color: "#38414e" }],
                },
                {
                  featureType: "road",
                  elementType: "geometry.stroke",
                  stylers: [{ color: "#212a37" }],
                },
                {
                  featureType: "road",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#9ca5b3" }],
                },
                {
                  featureType: "road.highway",
                  elementType: "geometry",
                  stylers: [{ color: "#746855" }],
                },
                {
                  featureType: "road.highway",
                  elementType: "geometry.stroke",
                  stylers: [{ color: "#1f2835" }],
                },
                {
                  featureType: "road.highway",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#f3d19c" }],
                },
                {
                  featureType: "transit",
                  elementType: "geometry",
                  stylers: [{ color: "#2f3948" }],
                },
                {
                  featureType: "transit.station",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#d59563" }],
                },
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [{ color: "#17263c" }],
                },
                {
                  featureType: "water",
                  elementType: "labels.text.fill",
                  stylers: [{ color: "#515c6d" }],
                },
                {
                  featureType: "water",
                  elementType: "labels.text.stroke",
                  stylers: [{ color: "#17263c" }],
                },
              ]
            }}
          >
            {userLocation && (
              <Marker 
                position={userLocation} 
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#4285F4",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                }}
                zIndex={2}
              />
            )}
            {(() => {
              const allPrices = filteredStations
                .map(s => parseFloat(s.price))
                .filter(p => !isNaN(p) && p > 0);
              const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
              const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
              const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;

              // Helper for brand-specific styles and vector logos
              const getBrandVisuals = (bandeira: string, pinBg: string) => {
                const brand = (bandeira || '').toLowerCase().trim();

                // 1. BANDEIRA BRANCA
                const isBandeiraBranca = brand.includes('branca') || brand.includes('sem bandeira') || brand === '' || brand.includes('independente');
                if (isBandeiraBranca) {
                  return {
                    pinColor: '#e2e8f0', // Clean slate/grayish white pin boundary
                    logo: `<!-- Bandeira Branca written cleanly inside white circle -->
                      <circle cx="20" cy="16" r="11" fill="#FFFFFF" stroke="#475569" stroke-width="1" />
                      <text x="20" y="15" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="5.5px" fill="#1e293b" text-anchor="middle">BAND.</text>
                      <text x="20" y="21" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="5.5px" fill="#1e293b" text-anchor="middle">BRANCA</text>`
                  };
                }

                // 2. NEXTA (Half Petronas, Half TotalEnergies split pin!)
                if (brand.includes('nexta')) {
                  return {
                    pinColor: '#0f172a', // Sleek dark slate pin frame to hold the split colors
                    logo: `<!-- NEXTA split icon: Left Petronas (Teal), Right TotalEnergies (Split White/Colors) -->
                      <!-- Left side: Petronas -->
                      <path d="M 20 5 A 11 11 0 0 0 20 27 Z" fill="#00A19C" />
                      <!-- Petronas white drop -->
                      <path d="M 16.5 13 C 14.5 15, 13.5 17, 13.5 18 A 2.5 2.5 0 0 0 18.5 18 C 18.5 17, 18.5 15, 16.5 13 Z" fill="none" stroke="#FFFFFF" stroke-width="1.2" stroke-linejoin="round" />
                      <circle cx="16.5" cy="18" r="0.8" fill="#FFFFFF" />

                      <!-- Right side: TotalEnergies background -->
                      <path d="M 20 5 A 11 11 0 0 1 20 27 Z" fill="#FFFFFF" />
                      <!-- TotalEnergies stylized colored curves -->
                      <path d="M 20.5 14 Q 23.5 11, 26 13 Q 28 15, 25 18 T 20.5 19.5" fill="none" stroke="#ED1C24" stroke-width="1.2" stroke-linecap="round" />
                      <path d="M 23 16 Q 22 19, 21.5 21.5 Q 23.5 23.5, 25 21" fill="none" stroke="#00529B" stroke-width="1" stroke-linecap="round" />
                      <path d="M 21.5 17 Q 24.5 20, 25 23" fill="none" stroke="#FFBF00" stroke-width="0.8" />`
                  };
                }

                // 3. PETROBRASIL (Independente, green & yellow, NO official BR logo) - MUST be checked before general petrobras/br
                if (brand.includes('petrobrasil')) {
                  return {
                    pinColor: '#1b5e20', // Green pin
                    logo: `<!-- Petrobrasil Green and Yellow Fuel Drop illustration with 'PB' -->
                      <circle cx="20" cy="16" r="11" fill="#1b5e20" />
                      <path d="M 20 9.5 C 17 13.5, 16.2 15.5, 16.2 17.5 A 3.8 3.8 0 0 0 23.8 17.5 C 23.8 15.5, 23 13.5, 20 9.5 Z" fill="#fbc02d" />
                      <text x="20" y="19" font-family="'Arial Black', sans-serif" font-weight="950" font-size="5px" fill="#1b5e20" text-anchor="middle">PB</text>`
                  };
                }

                // 4. VIBRA / PETROBRAS (Official BR brand distribution)
                if (brand.includes('petrobras') || brand.includes('br') || brand.includes('vibra')) {
                  return {
                    pinColor: '#008c45',
                    logo: `<defs>
                        <clipPath id="br-squircle-clip">
                          <rect x="11" y="7" width="18" height="18" rx="4.5" />
                        </clipPath>
                      </defs>
                      <g clip-path="url(#br-squircle-clip)">
                        <g transform="translate(-1.6, -0.65) scale(0.225)">
                          <!-- White background from original SVG -->
                          <path fill="#ffffff" d="M56.019 34.929h79.449v79.292H56.019V34.929z"/>
                          <!-- Yellow top band from original SVG -->
                          <path fill="#ffd100" d="M135.859 53.43H56.527V34.073h79.332V53.43z"/>
                          <!-- Green bottom band from original SVG -->
                          <path fill="#008c45" d="M56.68 64.002h79.299v50.387H56.68V64.002z"/>
                          <!-- Letters 'BR' from original SVG -->
                          <path d="M63.838 93.146l8.361-29.21 14.412-.089c9.731-.164 11.952 8.897 4.471 14.471 6.334 3.904 2.206 15.067-7.958 14.873l-19.286-.045zM96.435 93.295l8.331-29.448 14.933-.089c10.939-.134 10.671 12.742 1.49 16.378 2.087.477 2.803 1.818 2.966 3.502l.492 9.836h-7.974l-.446-8.644c.044-1.55-.835-2.534-3.309-2.608l-4.919-.015-2.965 11.088h-8.599z" fill="#ffffff"/>
                          <!-- Inside holes of letters 'BR' from original SVG -->
                          <path d="M77.604 75.124l1.401-5.484h7.064c3.249.7 2.549 5.111-1.117 5.469l-7.348.015zM74.189 87.128l1.891-6.319h7.247c3.275.807 2.192 5.89-1.598 6.302l-7.54.017zM109.487 76.356l1.82-6.56h7.249c3.312.807 2.198 6.13-1.634 6.542l-7.435.018z" fill="#008c45"/>
                        </g>
                      </g>
                      <rect x="11" y="7" width="18" height="18" rx="4.5" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.8" />`
                  };
                }

                // 5. RAIZEN / SHELL (Raizen distributes under Shell brand in Brazil)
                if (brand.includes('shell') || brand.includes('raizen')) {
                  return {
                    pinColor: '#ed1c24', // Shell Red
                    logo: `<defs>
                        <clipPath id="shell-squircle-clip">
                          <rect x="11" y="7" width="18" height="18" rx="4.5" />
                        </clipPath>
                      </defs>
                      <g clip-path="url(#shell-squircle-clip)">
                        <!-- White background inside squircle for high-contrast branding -->
                        <rect x="11" y="7" width="18" height="18" fill="#ffffff" />
                        <!-- Exact paths and style matching the newly uploaded shell.svg -->
                        <g transform="translate(12.2, 8.8) scale(0.11)">
                          <g transform="translate(-14.828488,-233.63904)">
                            <g transform="matrix(0.2326949,0,0,0.2326949,0.4836773,190.36074)">
                              <!-- Red Part -->
                              <path d="M 355.02537,715.37104 C 335.03593,715.37104 324.76188,702.33533 324.76188,702.33533 C 308.33331,701.62104 179.94045,701.97818 179.94045,701.97818 L 167.44045,596.46933 C 167.44045,596.46933 88.360125,540.72818 81.931554,534.29961 C 43.972263,362.09404 181.17751,197.92475 355.03065,197.92475 C 528.88379,197.92475 666.08904,362.09404 628.12975,534.29961 C 621.70117,540.72818 542.62085,596.46933 542.62085,596.46933 L 530.12085,701.97818 C 530.12085,701.97818 401.72799,701.62104 385.29942,702.33533 C 385.29942,702.33533 375.02537,715.37104 355.02537,715.37104 z" fill="#ed1c24" />
                              <!-- Yellow Part -->
                              <path d="M 355.2112,554.91135 L 343.07983,250.34962 C 328.44892,247.36372 291.12518,250.94681 271.11966,265.8763 L 329.3447,556.10571 C 329.3447,556.10571 249.91977,277.8199 249.91977,277.8199 C 230.8796,277.58651 192.45851,309.78015 189.60461,319.3239 L 305.4575,566.25777 C 305.4575,566.25777 175.27229,340.52378 175.27229,340.52378 C 162.43292,345.30122 134.36547,396.95728 138.84432,402.95936 C 138.84432,402.95936 283.95903,580.59009 283.95903,580.59009 L 134.66406,428.9064 C 134.66406,428.9064 115.25571,458.46681 127.91248,508.53689 L 212.24117,569.43546 L 222.79862,652.63525 L 326.18883,652.63525 C 326.18883,652.63525 343.1038,668.66855 355.1056,668.66855 C 367.1074,668.66855 384.02237,652.63525 384.02237,652.63525 L 487.41258,652.63525 L 497.97003,569.43546 L 582.29872,508.53689 C 594.95549,458.46681 575.54714,428.9064 575.54714,428.9064 L 426.25217,580.59009 C 426.25217,580.59009 571.36688,402.95936 571.36688,402.95936 C 575.84573,396.95728 547.77828,345.30122 534.93891,340.52378 C 534.93891,340.52378 404.7537,566.25777 404.7537,566.25777 L 520.60659,319.3239 C 517.75269,309.78015 479.3316,277.58651 460.29143,277.8199 C 460.29143,277.8199 380.8665,556.10571 380.8665,556.10571 L 439.09154,265.8763 C 419.08602,250.94681 381.76228,247.36372 367.13137,250.34962 L 355.2112,554.91135 z" fill="#ffd500" />
                            </g>
                          </g>
                        </g>
                      </g>
                      <rect x="11" y="7" width="18" height="18" rx="4.5" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.8" />`
                  };
                }

                // 6. IPIRANGA (New organic blue 'i' shape with yellow triangle on yellow squircle)
                if (brand.includes('ipiranga')) {
                  return {
                    pinColor: '#F8CD1C', // Brand Yellow
                    logo: `<defs>
                        <clipPath id="ipiranga-squircle-clip">
                          <rect x="11" y="7" width="18" height="18" rx="4.5" />
                        </clipPath>
                      </defs>
                      <g clip-path="url(#ipiranga-squircle-clip)">
                        <!-- Solid Yellow background matching brand yellow -->
                        <rect x="11" y="7" width="18" height="18" fill="#F8CD1C" />
                        <!-- Organic brand design in high fidelity matching brand image -->
                        <g transform="translate(10.8, 6.8) scale(0.184)">
                          <!-- Blue Organic Main Shape -->
                          <path d="M76.5,26.5 C76.5,26.5 40,25 25,48 C16.5,61 24,73.5 24,73.5 C24,73.5 40.5,58.5 53.5,49 L55,73 C55,75 57,75 59,74 C69.5,68.5 76.5,55 76.5,41 V26.5 Z" fill="#005CBB" />
                          <!-- Yellow Triangular Dot Cutout -->
                          <polygon points="51,32 68.5,32 55.5,46" fill="#F8CD1C" stroke="#F8CD1C" stroke-width="1.2" stroke-linejoin="round" />
                        </g>
                      </g>
                      <rect x="11" y="7" width="18" height="18" rx="4.5" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.8" />`
                  };
                }

                // 7. ALE (Blue badge, split white and red italic letter A)
                if (brand.includes('ale')) {
                  return {
                    pinColor: '#ED1C24', // ALE Red pin
                    logo: `<!-- Authentic ALE trademark split letter 'A' over blue circle -->
                      <circle cx="20" cy="16" r="11" fill="#00529B" />
                      <!-- Left white side of capital 'A' -->
                      <path d="M 13.5 21 L 17.5 11.2 L 20 11.2 L 16.5 21 Z" fill="#FFFFFF" />
                      <!-- Right red side of capital 'A' -->
                      <path d="M 18.5 11.2 L 21 11.2 L 25 21 L 22 21 Z" fill="#ED1C24" />
                      <rect x="15" y="16.5" width="6.5" height="1.8" fill="#FFFFFF" />`
                  };
                }

                // Default / Outras bandeiras
                return {
                  pinColor: pinBg,
                  logo: `<circle cx="20" cy="16" r="11" fill="#1e293b" /> <g transform="translate(13.5, 9.5) scale(0.65)"> <path d="M12,4.5 h2.5 c1.7,0,3.5,1.5,3.5,3.5 v0.5 c0,2,-1.8,3.5,-3.5,3.5 h-2.5" fill="none" stroke="${pinBg}" stroke-width="2" /> <path d="M12,10.5 l3,-1.8" fill="none" stroke="${pinBg}" stroke-width="1.5" stroke-linecap="round"/> <rect x="4" y="3" width="8" height="9" rx="2" fill="${pinBg}" /> <rect x="2" y="4.5" width="2" height="5" rx="0.5" fill="${pinBg}" /> <path d="M3,7 C 0.5,7 -1.5,9 -1.5,12.5" fill="none" stroke="${pinBg}" stroke-width="2" stroke-linecap="round" /> <circle cx="-1.5" cy="16" r="1.5" fill="${pinBg}" /> </g>`
                };
              };

              return filteredStations.map((station, i) => {
                const interpolateColor = (c1: number[], c2: number[], factor: number) => {
                  const result = c1.slice();
                  for (let i = 0; i < 3; i++) {
                    result[i] = Math.round(result[i] + factor * (c2[i] - c1[i]));
                  }
                  return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
                };

                const GREEN = [34, 197, 94]; // rgb(34, 197, 94)
                const ORANGE = [249, 115, 22]; // rgb(249, 115, 22)
                const RED = [239, 68, 68]; // rgb(239, 68, 68)

                const priceNum = parseFloat(station.price);
                const isCheapest = !isNaN(priceNum) && priceNum === minPrice && allPrices.length > 1;

                const getPinColor = (price: number) => {
                  if (isNaN(price) || price <= 0) return '#94a3b8'; // Fallback neutral slate
                  if (isCheapest) return '#ccff00'; // Dourado/Verde Neon absoluto para o(s) mais barato(s)
                  if (minPrice === maxPrice) return '#fbbf24'; // fallback yellow if no variance
                  if (price <= avgPrice) {
                    const factor = avgPrice === minPrice ? 0 : (price - minPrice) / (avgPrice - minPrice);
                    return interpolateColor(GREEN, ORANGE, factor);
                  } else {
                    const factor = maxPrice === avgPrice ? 0 : (price - avgPrice) / (maxPrice - avgPrice);
                    return interpolateColor(ORANGE, RED, Math.min(factor, 1));
                  }
                };

                const pinBgColor = getPinColor(priceNum);
                const brandVisuals = getBrandVisuals(station.nm_bandeira, pinBgColor);
                
                // Only format price if it exists
                const priceStr = station.price ? `R$ ${formatNumber(priceNum, 3)}` : '';
                const priceStrLabel = station.price ? `R$ ${formatNumber(priceNum, 2)}` : '';
                const stationTitle = `${station.nm_posto}\n${priceStr}${isCheapest ? ' 🏆' : ''}`;
                const showBalloon = !isNaN(priceNum) && priceNum > 0;

                // Render dynamic SVG consisting of custom brand PIN and connected pricing balloon
                const svgContent = `<svg width="${showBalloon ? 130 : 44}" height="44" viewBox="0 0 ${showBalloon ? 130 : 44} 44" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="150%" height="150%">
                      <feDropShadow dx="1.5" dy="2.5" stdDeviation="2" flood-color="#000000" flood-opacity="0.35" />
                    </filter>
                    <style>
                      @keyframes pulse-cheap {
                        0% { stroke-width: 1.8px; stroke-opacity: 0.6; }
                        50% { stroke-width: 3.5px; stroke-opacity: 1.0; }
                        100% { stroke-width: 1.8px; stroke-opacity: 0.6; }
                      }
                      .blink-cheap {
                        animation: pulse-cheap 1.4s infinite ease-in-out;
                      }
                    </style>
                  </defs>
                  
                  <g filter="url(#shadow)">
                    ${showBalloon ? `
                      <!-- Pricing Balloon (White container with dynamic color borders matching price) -->
                      <rect class="${isCheapest ? 'blink-cheap' : ''}" x="35" y="5" width="86" height="24" rx="12" fill="#ffffff" stroke="${pinBgColor}" stroke-width="${isCheapest ? '3' : '1.8'}" />
                      <text x="78" y="21" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="950" font-size="11px" fill="#111111" text-anchor="middle">
                        ${priceStrLabel} ${isCheapest ? '🏆' : ''}
                      </text>
                    ` : ''}
                    
                    <!-- Branded Map Pin with outer border coloring based on price colorimetry -->
                    <g transform="translate(2, 0)">
                      <path d="M20 0C11.16 0 4 7.16 4 16c0 10.33 16 24 16 24s16-13.67 16-24C36 7.16 28.84 0 20 0z" fill="${pinBgColor}"/>
                      <path d="M20 2C12.27 2 6 8.27 6 16c0 8.01 11.23 19.38 14 21.93C22.77 35.38 34 24.01 34 16 34 8.27 27.73 2 20 2z" fill="#1e1e1e"/>
                      <!-- Brand Logo / pump insert -->
                      ${brandVisuals.logo}
                    </g>
                  </g>
                </svg>`;

                return (
                  <Marker 
                    key={i} 
                    position={{ lat: parseFloat(station.lat), lng: parseFloat(station.lng) }} 
                    title={stationTitle}
                    onClick={() => setSelectedStation(station)}
                    icon={{
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgContent)}`,
                      scaledSize: new window.google.maps.Size(showBalloon ? 130 : 44, 44),
                      anchor: new window.google.maps.Point(22, 40),
                    }}
                  />
                );
              });
            })()}
          </GoogleMap>
        )}
        
        {/* Gradients and Status Overlays */}
        {!selectedStation && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent pointer-events-none" />
            <div className={`absolute bottom-0 left-0 p-4 pointer-events-none ${isMaximized ? 'pb-8' : ''}`}>
              <div className="inline-block px-3 py-1 rounded-full border border-primary text-primary text-[10px] font-bold tracking-widest uppercase mb-2 bg-[#111111]">
                Localização Atual
              </div>
              <h3 className="text-xl font-bold text-white">{locationName}</h3>
              {locationError && <p className="text-xs text-error mt-1">{locationError}</p>}
            </div>
          </>
        )}

        {/* Selected Station Mobile Card (Floating) */}
        {selectedStation && (() => {
          const prices = filteredStations
            .map(s => parseFloat(s.price))
            .filter(p => !isNaN(p) && p > 0);
          const maxP = prices.length > 0 ? Math.max(...prices) : 0;
          const minP = prices.length > 0 ? Math.min(...prices) : 0;
          const avgP = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
          const priceNum = parseFloat(selectedStation.price);
          
          const isCheapest = !isNaN(priceNum) && priceNum === minP && prices.length > 1;
          const isExpensive = !isNaN(priceNum) && priceNum > avgP;
          const stationEconomy = !isNaN(priceNum) && maxP > priceNum ? maxP - priceNum : 0;
          
          // Calculate textColor based on identical interpolation to be perfectly consistent
          let dynColor = '';
          let alertText = '';
          let alertClasses = '';
          
          if (isCheapest) {
            dynColor = '#ccff00'; // Dourado/Verde Neon
            alertText = "🏆 MAIS BARATO, VALE A PENA! TOCA PRA LÁ?";
            alertClasses = "bg-[#ccff00]/10 text-[#ccff00] border-[#ccff00]/20";
          } else if (isExpensive) {
            const factor = maxP === avgP ? 0 : (priceNum - avgP) / (maxP - avgP);
            const r = Math.round(249 + factor * (239 - 249));
            const g = Math.round(115 + factor * (68 - 115));
            const b = Math.round(22 + factor * (68 - 22));
            dynColor = `rgb(${r},${g},${b})`;
            alertText = "⚠️ FUJA DESSE, TÁ MUITO CARO!";
            alertClasses = "bg-red-500/10 text-red-400 border-red-500/20";
          } else {
            const factor = avgP === minP ? 0 : (priceNum - minP) / (avgP - minP);
            const r = Math.round(34 + factor * (249 - 34));
            const g = Math.round(197 + factor * (115 - 197));
            const b = Math.round(94 + factor * (22 - 94));
            dynColor = `rgb(${r},${g},${b})`;
            alertText = "✅ TÁ NA MÉDIA DA REGIÃO. VOCÊ DECIDE.";
            alertClasses = "bg-primary/10 text-primary border-primary/20";
          }

          return (
            <div 
              className={`absolute left-2 right-2 p-3 bg-[#111111] rounded-2xl border border-primary/20 shadow-2xl z-20 ${isMaximized ? 'bottom-8' : 'bottom-2'}`}
            >
              <button 
                onClick={() => setSelectedStation(null)} 
                className="absolute top-2 right-2 text-on-surface-variant hover:text-white p-1"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-start gap-2.5 pr-6 mb-2.5">
                <div className="flex-shrink-0">
                  {getStationBrandSvg(selectedStation.nm_bandeira)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white leading-tight uppercase flex items-start gap-1.5">
                    {isCheapest && (
                      <span className="text-base shadow-amber-500/50 drop-shadow-md flex-shrink-0 mt-[1px]" title="Posto Mais Barato encontrado!">🏆</span>
                    )}
                    <span className="line-clamp-2">{selectedStation.nm_posto}</span>
                  </h4>
                  <p className="text-[9px] text-primary tracking-widest uppercase font-bold mt-1">
                    {selectedStation.nm_bandeira || 'Bandeira Branca'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl border border-outline-variant/10">
                <div className="flex flex-col gap-1.5 justify-center">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant leading-none">Preço</span>
                  <p className="text-xl font-black text-white leading-none" style={{ color: dynColor }}>
                    R$ {formatNumber(priceNum, 3)}
                  </p>
                  {stationEconomy > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] uppercase font-black tracking-widest text-[#ccff00]/80">ECONOMIZE ATÉ:</span>
                      <span className="text-[11px] sm:text-xs font-black text-[#ccff00] leading-none drop-shadow-[0_0_6px_rgba(204,255,0,0.3)]">
                        R$ {formatNumber(stationEconomy, 2)}/L
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1.5 opacity-95">
                  {/* Badge de Origem do Preço */}
                  {selectedStation.source === 'CSV_TANKAGE_SYNC' || (selectedStation.source && selectedStation.source.includes('SYNC')) ? (
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/80 shadow-sm text-white px-2 py-0.5 rounded-md inline-flex flex-shrink-0" title="Preço obtido via Pesquisa ANP">
                      <svg className="w-4 h-4 rounded-sm flex-shrink-0" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="40" height="40" rx="4" fill="#006A38" />
                        <path d="M 20 6 C 20 6 12 17 12 21 C 12 25.4 15.6 29 20 29 C 24.4 29 28 25.4 28 21 C 28 17 20 6 20 6 Z" fill="#FFA500" />
                        <circle cx="20" cy="21" r="5" fill="#004A8F" stroke="#FFE600" strokeWidth="0.8" />
                      </svg>
                      <span className="font-serif font-black tracking-tighter text-[11px] text-zinc-100 leading-none">anp</span>
                      <span className="text-[8px] font-black uppercase text-zinc-300 border-l border-zinc-700/70 pl-1.5 leading-none">Pesquisa</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 bg-[#0284c7]/10 text-sky-300 border border-sky-500/20 text-[8px] font-black uppercase px-2 py-1 rounded-md inline-flex flex-shrink-0" title="Preço obtido via cupom fiscal/abastecimento de usuário">
                      <FileText size={11} className="text-sky-300 flex-shrink-0" />
                      <span>Nota Fiscal</span>
                    </div>
                  )}

                  <div className={`flex items-center gap-1.5 text-[10px] font-medium ${(() => {
                    const collectDate = new Date(selectedStation.date_collected);
                    const now = new Date();
                    const diffTime = Math.abs(now.getTime() - collectDate.getTime());
                    const diffHours = diffTime / (1000 * 60 * 60);
                    const diffDays = Math.floor(diffHours / 24);
                    
                    if (diffDays > 30) return "text-red-400";
                    if (diffDays > 7) return "text-green-400";
                    return "text-[#ccff00]";
                  })()}`}>
                    {(() => {
                      const collectDate = new Date(selectedStation.date_collected);
                      const now = new Date();
                      const diffTime = Math.abs(now.getTime() - collectDate.getTime());
                      const diffHours = diffTime / (1000 * 60 * 60);
                      const diffDays = Math.floor(diffHours / 24);
                      
                      const hasTrophy = diffHours < 72;
                      const dateStr = collectDate.toLocaleDateString('pt-BR');
                      const daysStr = diffDays === 0 ? "Hoje" : `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
                      
                      return (
                        <>
                          {hasTrophy ? <span title="Atualizado recentemente!">🏆</span> : <Clock size={12} className="opacity-70" />}
                          <span>{dateStr} ({daysStr})</span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-medium">
                    <MapPin size={12} className="text-primary/70" />
                    {formatNumber(selectedStation.distance, 1)} km
                  </div>
                </div>
              </div>

              <div className={`mt-2 p-1.5 rounded-lg border text-[8px] sm:text-[9px] font-bold text-center tracking-widest uppercase flex items-center justify-center gap-1.5 ${alertClasses}`}>
                {alertText}
              </div>

              <button 
                onClick={() => {
                  const lat = selectedStation.lat;
                  const lng = selectedStation.lng;
                  window.open(`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${lat},${lng}&travelmode=driving`, '_blank');
                }}
                className="mt-2 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all tracking-widest text-[10px] uppercase"
              >
                <Navigation size={16} />
                Como Chegar
              </button>
            </div>
          );
        })()}

        {/* Action Buttons always visible */}
        <>
          <div className={`absolute z-30 transition-all ${isMaximized ? 'left-4 top-8' : 'left-3 top-3'}`}>
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className={`bg-[#111111] border border-primary/40 text-primary flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-primary/10 ${isMaximized ? 'w-12 h-12 rounded-full' : 'p-2 rounded-xl'}`}
              title={isMaximized ? "Minimizar" : "Maximizar"}
            >
              {isMaximized ? <Minimize size={24} /> : <Maximize size={16} />}
            </button>
          </div>
          
          <div className={`absolute z-30 transition-all ${isMaximized ? 'right-4 top-8' : 'right-3 top-3'}`}>
            <button 
              onClick={() => {
                const zoom = Math.max(10, Math.round(15 - Math.log2(radius || 5)));
                const lat = userLocation?.lat || -22.5112;
                const lng = userLocation?.lng || -43.1779;
                window.open(`https://www.google.com/maps/search/postos+de+combustivel/@${lat},${lng},${zoom}z`, '_blank');
              }}
              className={`bg-[#111111] border border-primary/40 text-primary font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all hover:bg-primary/10 ${isMaximized ? 'w-12 h-12 rounded-full p-0 flex-shrink-0' : 'px-3 py-2 rounded-xl text-[10px]'}`}
              title="Abrir no Google Maps"
            >
              <MapIcon size={isMaximized ? 20 : 14} />
              {!isMaximized && (
                <>
                  <span className="hidden sm:inline">Google Maps</span>
                  <span className="sm:hidden">Maps</span>
                </>
              )}
              {!isMaximized && <ExternalLink size={12} className="opacity-70" />}
            </button>
          </div>
        </>
      </div>

      {/* Price Reference Card (Subtle & Elegant Statistical Summary) inline */}
      {gasStations.length > 0 && selectedFuel && (
        <PriceReferenceCard 
          gasStations={gasStations} 
          fuelName={fuelTypes.find(f => f.id_produto === selectedFuel)?.friendlyName || fuelTypes.find(f => f.id_produto === selectedFuel)?.ds_produto || "Combustível"} 
          radius={radius}
          locationName={locationName}
        />
      )}

      {/* Fuel Types */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Fuel size={18} className="text-primary" />
          <h3 className="text-xs font-bold tracking-widest text-white uppercase">Tipo de Combustível</h3>
        </div>
        {loadingFuels ? (
          <div className="flex justify-center p-4">
            <Loader2 size={24} className="animate-spin text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredFuelTypes.length > 0 ? (
              filteredFuelTypes.map((fuel) => {
                return (
                  <FuelOption 
                    key={fuel.id_produto}
                    id={fuel.id_produto.toString()} 
                    label={fuel.friendlyName || getFriendlyName(fuel.ds_produto)} 
                    selected={selectedFuel === fuel.id_produto} 
                    onClick={() => setSelectedFuel(fuel.id_produto)} 
                  />
                );
              })
            ) : (
              <div className="col-span-3 py-6 px-4 bg-surface-container rounded-2xl border border-white/5 text-center">
                <AlertCircle size={24} className="mx-auto text-amber-500/40 mb-2" />
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Nenhum combustível compatível</p>
                <p className="text-[8px] text-white/20 mt-1 uppercase">Ajuste os combustíveis do seu veículo no perfil</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Filtro por Bandeira */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]" />
            <h3 className="text-xs font-bold tracking-widest text-white uppercase">Bandeiras</h3>
          </div>
          {selectedBrands.length > 0 && (
            <button
              id="btn-clear-brands"
              type="button"
              onClick={() => setSelectedBrands([])}
              className="text-[9px] font-black text-amber-400/80 hover:text-amber-400 hover:scale-105 active:scale-95 transition-all uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-full border border-amber-400/20"
            >
              Limpar Filtros ({selectedBrands.length})
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {BRAND_OPTIONS.map((brand) => {
            const isSelected = selectedBrands.includes(brand.id);
            return (
              <button
                id={`brand-filter-${brand.id}`}
                key={brand.id}
                type="button"
                onClick={() => {
                  setSelectedBrands((prev) =>
                    prev.includes(brand.id)
                      ? prev.filter((id) => id !== brand.id)
                      : [...prev, brand.id]
                  );
                }}
                className={`relative group flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-300 ${
                  isSelected
                    ? "bg-amber-400/10 border-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.15)] scale-[1.02]"
                    : "bg-surface-container border-white/5 hover:border-white/15 hover:bg-surface-container/80"
                }`}
              >
                {/* SVG Logo container */}
                <div className={`transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'scale-105' : ''}`}>
                  {brand.svg}
                </div>

                {/* Brand label */}
                <span className={`text-[9px] font-black tracking-wider uppercase mt-2 text-center transition-colors duration-200 truncate w-full ${
                  isSelected ? 'text-amber-400' : 'text-white/60 group-hover:text-white/80'
                }`}>
                  {brand.label}
                </span>

                {/* Selection Micro indicator dot */}
                <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  isSelected ? 'bg-amber-400 scale-100 shadow-[0_0_6px_#fbbf24]' : 'bg-transparent scale-0'
                }`} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Search Radius */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            <h3 className="text-xs font-bold tracking-widest text-white uppercase">Raio de Busca</h3>
          </div>
          <div className="text-primary font-black text-xl">
            {radius} <span className="text-sm font-medium text-primary/70">km</span>
          </div>
        </div>
        <div className="bg-surface-container p-5 rounded-2xl border border-outline-variant/10">
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={radius} 
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/50 mt-4 tracking-widest">
            <span>1 KM</span>
            <span>50 KM</span>
            <span>100 KM</span>
          </div>
        </div>
      </section>



      {/* Search Button */}
      <button 
        onClick={async () => {
          if (!selectedFuel || !userLocation || !mapInstance) return;
          setIsSearching(true);
          setSelectedStation(null);
          
          try {
            const response = await fetch(`/api/search-stations?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}&id_combustivel=${selectedFuel}`);
            if (response.ok) {
              const results = await response.json();
              setGasStations(results);

              if (results && results.length > 0) {
                // Fit bounds to show all markers
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(userLocation);
                results.forEach((place: any) => {
                   if (place.lat && place.lng) {
                     bounds.extend({ lat: parseFloat(place.lat), lng: parseFloat(place.lng) });
                   }
                });
                mapInstance.fitBounds(bounds);
              } else {
                MySwal.fire({
                  title: '<span style="color: #fff; font-family: \'Inter\', sans-serif; font-weight: 900; text-transform: uppercase;">Sem resultados</span>',
                  html: '<p style="color: #ccc; font-size: 14px;">Nenhum preço registrado para este combustível nesta região.</p>',
                  icon: 'info',
                  iconColor: '#ccff00',
                  background: '#151515',
                  confirmButtonText: 'ENTENDI',
                  confirmButtonColor: '#ccff00',
                  customClass: {
                    popup: 'rounded-3xl border border-white/10',
                    confirmButton: 'rounded-xl font-black py-3 px-8 text-black'
                  }
                });
                setGasStations([]);
              }
            } else {
              const errData = await response.json().catch(() => ({}));
              MySwal.fire({
                title: '<span style="color: #fff; font-family: \'Inter\', sans-serif; font-weight: 900; text-transform: uppercase;">Erro na Busca</span>',
                html: `<p style="color: #ccc; font-size: 14px;">${errData.error || 'Não foi possível processar os preços no momento.'}</p>`,
                icon: 'error',
                iconColor: '#ff4444',
                background: '#151515',
                confirmButtonText: 'OK',
                confirmButtonColor: '#ff4444',
                customClass: {
                  popup: 'rounded-3xl border border-white/10',
                  confirmButton: 'rounded-xl font-black py-3 px-8 text-white'
                }
              });
              setGasStations([]);
            }
          } catch (err) {
            console.error(err);
            MySwal.fire({
              title: '<span style="color: #fff; font-family: \'Inter\', sans-serif; font-weight: 900; text-transform: uppercase;">Falha de Conexão</span>',
              html: '<p style="color: #ccc; font-size: 14px;">Verifique sua internet e tente novamente.</p>',
              icon: 'warning',
              iconColor: '#ffcc00',
              background: '#151515',
              confirmButtonText: 'OK',
              confirmButtonColor: '#ffcc00',
              customClass: {
                popup: 'rounded-3xl border border-white/10',
                confirmButton: 'rounded-xl font-black py-3 px-8 text-black'
              }
            });
            setGasStations([]);
          } finally {
            setIsSearching(false);
          }
        }}
        disabled={selectedFuel === null || isSearching}
        className={`w-full font-black text-xl tracking-widest uppercase p-5 rounded-2xl flex items-center justify-center gap-3 transition-all mt-2 ${
          selectedFuel === null 
            ? "bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed" 
            : "bg-primary text-black active:scale-95 shadow-[0_0_20px_rgba(19,236,19,0.3)]"
        }`}
      >
        {isSearching ? "Buscando..." : "Buscar"}
        {!isSearching && <Fuel size={24} />}
      </button>
    </div>
  );
}

function FuelOption({ id, label, selected, onClick }: { id: string, label: string, selected: boolean, onClick: () => void, key?: any }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`py-3 px-1 rounded-xl flex items-center justify-center transition-all active:scale-[0.97] border text-center text-[10px] sm:text-xs font-black uppercase tracking-wider ${
        selected 
          ? "bg-[#ccff00] text-black border-[#ccff00] shadow-[0_0_12px_rgba(204,255,0,0.35)]" 
          : "bg-surface-container border-outline-variant/10 text-white/60 hover:text-white hover:bg-surface-container-high"
      }`}
    >
      {label}
    </button>
  );
}

function PriceReferenceCard({ 
  gasStations, 
  fuelName, 
  radius, 
  locationName 
}: { 
  gasStations: any[], 
  fuelName: string, 
  radius: number, 
  locationName: string 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const stats = useMemo(() => {
    if (!gasStations || gasStations.length === 0) return null;
    
    // Normalization helper for Brazilian cities / accents
    const normalizeText = (text: string): string => {
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
    };

    // Extract current GPS / search center city
    const userCityNormalized = locationName ? normalizeText(locationName.split(' - ')[0]) : "PETROPOLIS";
    const activeCity = userCityNormalized.includes("BUSCANDO") ? "PETROPOLIS" : userCityNormalized;

    // Filter gas stations belonging to the active city to calculate average price ("Preço Médio no município")
    const cityStations = gasStations.filter(s => s.nm_municipio && normalizeText(s.nm_municipio) === activeCity);
    
    // Fallback if no stations in the current city are present in the list
    const stationsForMuniAvg = cityStations.length > 0 ? cityStations : gasStations;
    const muniPrices = stationsForMuniAvg.map(s => parseFloat(s.price)).filter(p => !isNaN(p) && p > 0);
    const avgPrice = muniPrices.length > 0 ? muniPrices.reduce((a, b) => a + b, 0) / muniPrices.length : 0;

    // All prices inside the search radius
    const radiusPrices = gasStations.map(s => parseFloat(s.price)).filter(p => !isNaN(p) && p > 0);
    if (radiusPrices.length === 0) return null;

    const minPrice = Math.min(...radiusPrices);
    const maxPrice = Math.max(...radiusPrices);
    
    // Economy is always absolute lowest price in radius compared with absolute highest price in radius
    const economy = Math.max(0, maxPrice - minPrice);
    
    const cheaperPrices = radiusPrices.filter(p => p <= avgPrice);
    const expensivePrices = radiusPrices.filter(p => p > avgPrice);
    
    const countCheaper = cheaperPrices.length;
    const countExpensive = expensivePrices.length;
    
    const avgCheaper = countCheaper > 0 ? cheaperPrices.reduce((a, b) => a + b, 0) / countCheaper : 0;
    const avgExpensive = countExpensive > 0 ? expensivePrices.reduce((a, b) => a + b, 0) / countExpensive : 0;
    
    // Determine the unique municipalities present among stations in radius
    const uniqueMunicipiosInRadius = Array.from(
      new Set(
        gasStations
          .map(s => s.nm_municipio)
          .filter(m => m && m.trim().length > 0)
          .map(m => m.trim().toUpperCase())
      )
    );

    let titleLabel = "";
    if (uniqueMunicipiosInRadius.length === 1) {
      const rawMuni = gasStations.find(s => s.nm_municipio && s.nm_municipio.trim().toUpperCase() === uniqueMunicipiosInRadius[0])?.nm_municipio || uniqueMunicipiosInRadius[0];
      const formattedMuni = rawMuni.trim().toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase());
      titleLabel = `Economize em ${formattedMuni}`;
    } else if (uniqueMunicipiosInRadius.length > 1) {
      titleLabel = "Economize nessa região";
    } else {
      titleLabel = "Economize";
    }

    return {
      minPrice,
      maxPrice,
      avgPrice,
      countCheaper,
      countExpensive,
      avgCheaper,
      avgExpensive,
      economy,
      titleLabel,
      totalPostos: radiusPrices.length
    };
  }, [gasStations, locationName]);

  if (!stats) return null;

  return (
    <div className="bg-surface-container border border-outline-variant/10 rounded-3xl overflow-hidden shadow-xl transition-all duration-300">
      {/* Header Toggle */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between bg-surface-container-high hover:bg-surface-container-highest transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Coins size={18} className="text-[#ccff00] drop-shadow-[0_0_6px_rgba(204,255,0,0.5)]" />
          <span className="text-[11px] font-black tracking-widest text-[#ccff00] uppercase">
            {stats.titleLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stats.economy > 0 && (
            <span className="text-xs sm:text-sm font-black px-3 py-1 bg-[#ccff00]/10 text-[#ccff00] rounded-full border border-[#ccff00]/20 uppercase tracking-wider whitespace-nowrap">
              R$ {formatNumber(stats.economy, 2)}/L
            </span>
          )}
          <div className="text-white/60 bg-white/5 p-1.5 rounded-full border border-white/5 hover:bg-white/10 transition-all duration-200 flex items-center justify-center">
            {isOpen ? <ChevronUp size={16} className="text-[#ccff00]" /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Expandable Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-[#111111]/40"
          >
            <div className="p-5 flex flex-col items-center">
              {/* Semi-circular concentric Gauge */}
              <div className="relative w-full max-w-[240px] h-[175px] flex flex-col items-center justify-between mb-4">
                
                {/* Preço Médio no Município raised entirely above the arc */}
                <div className="text-center z-10 pt-1 flex flex-col items-center">
                  <span className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none mb-1.5">
                    Preço Médio no município
                  </span>
                  
                  <div className="flex items-start justify-center text-white font-sans">
                    <span className="text-sm font-black text-white/50 mr-0.5 mt-0.5">R$</span>
                    <span className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white">
                      {formatNumber(stats.avgPrice, 3)}
                    </span>
                  </div>
                </div>

                {/* Semicircular Gauge: Shifted cleanly to bottom */}
                <svg width="240" height="150" viewBox="0 0 240 150" className="absolute bottom-0">
                  {/* Outer secondary track */}
                  <path
                    d="M 40 140 A 80 80 0 1 1 200 140"
                    fill="none"
                    stroke="#889955"
                    strokeWidth="11"
                    strokeLinecap="round"
                    className="opacity-25"
                  />
                  {/* Outer active level */}
                  <path
                    d="M 40 140 A 80 80 0 1 1 200 140"
                    fill="none"
                    stroke="#ccff00"
                    strokeWidth="11"
                    strokeLinecap="round"
                    strokeDasharray="335"
                    strokeDashoffset={stats.economy > 0 ? (335 - Math.min(320, (stats.economy / Math.max(1, stats.avgPrice)) * 1400)) : 335}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Inner Overlay Content positioned inside the arc */}
                <div className="absolute inset-x-0 bottom-1.5 flex flex-col items-center text-center z-10">
                  <span className="text-white/60 text-[9px] font-black tracking-widest uppercase leading-none mt-1">
                    Economia de Até:
                  </span>
                  <span className="text-[#ccff00] text-xl sm:text-2xl font-black tracking-tighter leading-none mt-1.5 drop-shadow-[0_0_8px_rgba(204,255,0,0.5)]">
                    R$ {formatNumber(stats.economy, 2)}/litro
                  </span>
                  
                  <span className="text-white/40 text-[9px] font-black tracking-widest uppercase mt-3 leading-none">
                    {fuelName}
                  </span>
                </div>
              </div>

              {/* Data Table */}
              <div className="w-full bg-[#111111]/90 rounded-2xl overflow-hidden divide-y divide-white/5 border border-white/5 shadow-inner">
                {/* Header of Table */}
                <div className="grid grid-cols-12 gap-1 p-3 bg-white/5 text-[9px] font-black uppercase tracking-widest text-[#ccff00]">
                  <div className="col-span-6 flex items-center">
                    Alcance do Radar: <span className="text-white ml-1 font-black">{radius} km</span>
                  </div>
                  <div className="col-span-3 text-center">Postos</div>
                  <div className="col-span-3 text-right">Média</div>
                </div>

                {/* Region Average Row */}
                <div className="grid grid-cols-12 gap-1 px-3 py-2.5 text-xs text-white/90">
                  <div className="col-span-6 font-medium text-white/60 text-[11px] uppercase tracking-wider">Média de preço na região:</div>
                  <div className="col-span-3 text-center font-bold text-white/70">{stats.totalPostos}</div>
                  <div className="col-span-3 text-right font-black text-white">R$ {formatNumber(stats.avgPrice, 3)}</div>
                </div>

                {/* Cheaper Row */}
                <div className="grid grid-cols-12 gap-1 px-3 py-2.5 text-xs text-white/90">
                  <div className="col-span-6 font-medium text-[#ccff00]/80 text-[11px] uppercase tracking-wider">Mais baratos que a média:</div>
                  <div className="col-span-3 text-center font-bold text-[#ccff00]/60">{stats.countCheaper}</div>
                  <div className="col-span-3 text-right font-black text-[#ccff00] drop-shadow-[0_0_4px_rgba(204,255,0,0.15)]">R$ {formatNumber(stats.avgCheaper, 3)}</div>
                </div>

                {/* Expensive Row */}
                <div className="grid grid-cols-12 gap-1 px-3 py-2.5 text-xs text-white/90">
                  <div className="col-span-6 font-medium text-red-400/80 text-[11px] uppercase tracking-wider">Mais caros que a média:</div>
                  <div className="col-span-3 text-center font-bold text-red-400/60">{stats.countExpensive}</div>
                  <div className="col-span-3 text-right font-black text-red-400">R$ {formatNumber(stats.avgExpensive, 3)}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Fuel, 
  History, 
  DollarSign, 
  Droplets, 
  RotateCcw, 
  Filter, 
  ChevronRight, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  Info, 
  MapPin, 
  Search, 
  Calendar, 
  Loader2,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';

const parseLatLong = (coord: string | number | null | undefined): number | null => {
  if (coord === null || coord === undefined) return null;
  const coordStr = String(coord).trim();
  if (!coordStr) return null;
  if (coordStr.includes(':')) {
    const parts = coordStr.split(':');
    const degrees = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]) || 0;
    const seconds = parseFloat(parts[2] || '0');
    const sign = degrees < 0 ? -1 : 1;
    const decimal = sign * (Math.abs(degrees) + (minutes / 60) + (seconds / 3600));
    return isNaN(decimal) ? null : decimal;
  }
  const cleanStr = coordStr.replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
};

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  brand: string;
  driverName?: string;
}

interface FuelLog {
  id: string;
  date: string | null;
  vehicleId: string;
  model: string;
  plate: string;
  liters: number;
  cost: number;
  price: number;
  economy: number;
  gasStation: string;
  city: string;
  state: string;
  brand?: string;
  acceptsFuelCard?: boolean;
  latitude?: string | null;
  longitude?: string | null;
}

type DatePeriod = 'all' | 'current_week' | 'current_month' | 'last_month' | 'last_quarter' | 'last_semester' | 'last_year';

const isDateInPeriod = (dateStr: string | null, period: DatePeriod, referenceDate: Date): boolean => {
  if (!dateStr) return false;
  
  // Converter as datas para o fuso horário de São Paulo de forma robusta e independente do fuso do navegador
  const getSaoPauloDate = (dInput: Date | string): Date => {
    const d = new Date(dInput);
    try {
      const spStr = d.toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" });
      return new Date(spStr.replace(' ', 'T'));
    } catch (e) {
      return d;
    }
  };

  const d = getSaoPauloDate(dateStr);
  const now = getSaoPauloDate(referenceDate);
  
  // Normalizar horário do referencial para final do dia
  const endOfRef = new Date(now);
  endOfRef.setHours(23, 59, 59, 999);

  switch (period) {
    case 'all':
      return true;
      
    case 'current_week': {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay(); // 0 é domingo, 1 é segunda, etc.
      startOfWeek.setDate(startOfWeek.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return d >= startOfWeek && d <= endOfWeek;
    }
    
    case 'current_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return d >= startOfMonth && d <= endOfMonth;
    }
    
    case 'last_month': {
      // Ajuste ultra resiliente para o mês anterior baseado no fuso horário de Brasília
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    }
    
    case 'last_quarter': {
      const startOfLastQuarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      startOfLastQuarter.setHours(0, 0, 0, 0);
      return d >= startOfLastQuarter && d <= endOfRef;
    }
    
    case 'last_semester': {
      const startOfLastSemester = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      startOfLastSemester.setHours(0, 0, 0, 0);
      return d >= startOfLastSemester && d <= endOfRef;
    }
    
    case 'last_year': {
      const startOfLastYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      startOfLastYear.setHours(0, 0, 0, 0);
      return d >= startOfLastYear && d <= endOfRef;
    }
    
    default:
      return true;
  }
};

export const FuelManagement: React.FC = () => {
  const { user } = useOutletContext<{ user: any }>();
  
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('all');
  const [vehicleSearch, setVehicleSearch] = useState<string>('');
  const [isOpenVehicles, setIsOpenVehicles] = useState<boolean>(false);

  // Limpar ID do veículo caso limpe o texto do buscador por completo
  useEffect(() => {
    if (vehicleSearch === '') {
      setSelectedVehicleId(null);
    }
  }, [vehicleSearch]);


  // Carregar dados reais da empresa
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [logsResp, vehsResp] = await Promise.all([
          fetch('/api/empresa/abastecimentos'),
          fetch('/api/empresa/vehicles')
        ]);
        
        if (!logsResp.ok || !vehsResp.ok) {
          throw new Error('Falha ao receber os dados de abastecimento e veículos.');
        }
        
        const logsData = await logsResp.json();
        const vehsData = await vehsResp.json();
        
        setFuelLogs(logsData);
        setVehicles(vehsData);
      } catch (err: any) {
        console.error("Error loading fuel data:", err);
        setError(err.message || 'Erro ao carregar dados de abastecimento.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filtrar os veículos que aparecem no buscador de autocompletar
  const filteredVehiclesForSelector = useMemo(() => {
    if (!vehicleSearch) return vehicles;
    const q = vehicleSearch.toLowerCase().trim();
    const selectedVeh = vehicles.find(v => v.id === selectedVehicleId);
    if (selectedVeh && `${selectedVeh.model} (${selectedVeh.plate})`.toLowerCase() === q) {
      return vehicles;
    }
    return vehicles.filter(v => 
      v.model.toLowerCase().includes(q) || 
      v.plate.toLowerCase().includes(q) ||
      (v.brand && v.brand.toLowerCase().includes(q))
    );
  }, [vehicles, vehicleSearch, selectedVehicleId]);

  // Determinar a data de referência baseada na data atual local do frotista (ou mais recente dos registros para resiliência de simulação)
  const referenceDate = useMemo(() => {
    if (fuelLogs.length === 0) return new Date();
    let maxDate = new Date(0);
    fuelLogs.forEach(log => {
      if (log.date) {
        const d = new Date(log.date);
        if (d > maxDate) {
          maxDate = d;
        }
      }
    });
    if (maxDate.getTime() === 0) return new Date();
    return maxDate;
  }, [fuelLogs]);

  // Aplicar filtros finais nos registros
  const filteredLogs = useMemo(() => {
    let logs = fuelLogs;
    
    if (selectedVehicleId) {
      logs = logs.filter(log => log.vehicleId === selectedVehicleId);
    }
    
    if (selectedPeriod !== 'all') {
      logs = logs.filter(log => isDateInPeriod(log.date, selectedPeriod, referenceDate));
    }
    
    return logs;
  }, [selectedVehicleId, fuelLogs, selectedPeriod, referenceDate]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const totalLiters = filteredLogs.reduce((acc, log) => acc + log.liters, 0);
    const totalCost = filteredLogs.reduce((acc, log) => acc + log.cost, 0);
    const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;
    const totalEconomy = filteredLogs.reduce((acc, log) => acc + (log.economy || 0), 0);

    return {
      totalLiters,
      totalCost,
      avgPrice,
      totalEconomy
    };
  }, [filteredLogs]);

  // Rede de abastecedores com soma de litros, gastos e contagem (calculado sobre os logs filtrados)
  const uniqueStations = useMemo(() => {
    const stations = new Map<string, {
      name: string;
      city: string;
      state: string;
      brand?: string;
      acceptsFuelCard?: boolean;
      totalFuelings: number;
      totalLiters: number;
      totalCost: number;
      latitude?: string | null;
      longitude?: string | null;
    }>();
    
    filteredLogs.forEach(log => {
      const key = `${log.gasStation}-${log.city}`;
      if (!stations.has(key)) {
        stations.set(key, {
          name: log.gasStation,
          city: log.city,
          state: log.state,
          brand: log.brand,
          acceptsFuelCard: log.acceptsFuelCard,
          totalFuelings: 1,
          totalLiters: log.liters,
          totalCost: log.cost,
          latitude: log.latitude,
          longitude: log.longitude
        });
      } else {
        const station = stations.get(key)!;
        station.totalFuelings += 1;
        station.totalLiters += log.liters;
        station.totalCost += log.cost;
        if (!station.latitude && log.latitude) {
          station.latitude = log.latitude;
          station.longitude = log.longitude;
        }
      }
    });
    return Array.from(stations.values());
  }, [filteredLogs]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId);
  }, [selectedVehicleId, vehicles]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-slate-50 rounded-2xl border border-slate-100">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-slate-500 font-medium text-sm">Carregando controle de abastecimento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 flex flex-col items-center gap-3 max-w-md mx-auto my-10">
        <XCircle className="size-12 text-red-500" />
        <h3 className="font-bold text-red-900">Erro ao carregar</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Abastecimento</h1>
          <p className="text-slate-500 text-sm">
            {selectedVehicleId 
              ? `Visualizando dados de: ${selectedVehicle?.model} (${selectedVehicle?.plate})` 
              : "Monitore o consumo e custos de combustível da frota."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {(selectedVehicleId || selectedPeriod !== 'all') && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onClick={() => {
                  setSelectedVehicleId(null);
                  setSelectedPeriod('all');
                  setVehicleSearch('');
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 active:scale-95 shadow-sm cursor-pointer"
              >
                <RotateCcw className="size-4" />
                Limpar Filtros
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Advanced Filter Panel Setup - Searchable & Date Select */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative z-30">
        {/* Vehicle Selection with Autocomplete */}
        <div className="space-y-2 relative">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Filter className="size-3" /> Filtrar Veículo ({vehicles.length} veículos frotistas)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="size-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Digite modelo, placa ou marca para buscar..."
              value={vehicleSearch}
              onChange={(e) => {
                setVehicleSearch(e.target.value);
                setIsOpenVehicles(true);
              }}
              onFocus={() => setIsOpenVehicles(true)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-medium"
            />
            {vehicleSearch && (
              <button 
                onClick={() => {
                  setVehicleSearch('');
                  setSelectedVehicleId(null);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="size-4" />
              </button>
            )}
          </div>
          
          {isOpenVehicles && (
            <div className="absolute z-40 w-full mt-1 max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xl divide-y divide-slate-100 scrollbar-thin">
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicleId(null);
                  setVehicleSearch('');
                  setIsOpenVehicles(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 text-sm font-semibold flex items-center justify-between transition-colors hover:bg-slate-50 cursor-pointer",
                  !selectedVehicleId ? "text-primary bg-primary/5" : "text-slate-700"
                )}
              >
                <span>Todos os Veículos</span>
                {!selectedVehicleId && <CheckCircle2 className="size-4 text-primary" />}
              </button>
              {filteredVehiclesForSelector.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-400 italic">
                  Nenhum veículo encontrado para "{vehicleSearch}"
                </div>
              ) : (
                filteredVehiclesForSelector.map((veh) => (
                  <button
                    key={veh.id}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId(veh.id);
                      setVehicleSearch(`${veh.model} (${veh.plate})`);
                      setIsOpenVehicles(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors hover:bg-slate-50 cursor-pointer",
                      selectedVehicleId === veh.id ? "text-primary bg-primary/5 font-semibold" : "text-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Truck className={cn("size-4 shrink-0", selectedVehicleId === veh.id ? "text-primary" : "text-slate-400")} />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 leading-tight">{veh.model}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{veh.brand} • {veh.plate}</span>
                      </div>
                    </div>
                    {selectedVehicleId === veh.id && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Date period selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="size-3.5 text-slate-400" /> Período Temporal (pré-definido)
          </label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as DatePeriod)}
            className="w-full px-3 py-2.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-semibold cursor-pointer"
          >
            <option value="all">Sempre (Todos os períodos)</option>
            <option value="current_week">Semana Atual</option>
            <option value="current_month">Mês Atual</option>
            <option value="last_month">Mês Anterior</option>
            <option value="last_quarter">Trimestre Anterior</option>
            <option value="last_semester">Semestre Anterior</option>
            <option value="last_year">Último Ano</option>
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-6 md:grid-cols-3 relative z-10">
        <motion.div 
          layout
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-600">
              <Droplets className="size-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Total Litros</p>
              <h3 className="text-2xl font-bold text-slate-900 font-mono">
                {stats.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
              </h3>
            </div>
          </div>
        </motion.div>

        <motion.div 
          layout
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-600">
              <DollarSign className="size-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Gasto Total</p>
              <h3 className="text-2xl font-semibold text-slate-900 font-mono">
                R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </motion.div>

        {/* Economia Total Box */}
        <motion.div 
          layout
          className={cn(
            "rounded-2xl p-6 shadow-sm border transition-all",
            stats.totalEconomy >= 0 
              ? "bg-blue-50/60 border-blue-200" 
              : "bg-red-50/60 border-red-200"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex size-14 items-center justify-center rounded-2xl border shadow-sm",
              stats.totalEconomy >= 0 
                ? "bg-blue-100 border-blue-200 text-blue-600" 
                : "bg-red-100 border-red-200 text-red-600"
            )}>
              {stats.totalEconomy >= 0 ? <TrendingUp className="size-6" /> : <TrendingDown className="size-6" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[10px] font-black uppercase tracking-wider leading-none mb-1",
                stats.totalEconomy >= 0 ? "text-blue-500" : "text-red-500"
              )}>
                {stats.totalEconomy >= 0 ? "ECONOMIA REAL" : "PREJUÍZO ESTIMADO"}
              </p>
              <h3 className={cn(
                "text-2xl font-black font-mono leading-none tracking-tight mb-1",
                stats.totalEconomy >= 0 ? "text-blue-700" : "text-red-700"
              )}>
                R$ {Math.abs(stats.totalEconomy).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className={cn(
                "text-[10px] font-medium leading-tight truncate",
                stats.totalEconomy >= 0 ? "text-blue-600/80" : "text-red-600/80"
              )}>
                {stats.totalEconomy >= 0 
                  ? "Economizou nos postos indicados" 
                  : "Abasteceu acima do preço sugerido"}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Used Gas Stations Network */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="size-4" /> Rede de Abastecimento Utilizada
            <span className="ml-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200/50">
              {uniqueStations.length} postos
            </span>
          </h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tight">
            {uniqueStations.length} Postos Visitados
          </span>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uniqueStations.map((station, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 hover:border-primary/30 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Fuel className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{station.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{station.city}, {station.state}</p>
                  </div>
                </div>
                {station.acceptsFuelCard ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm shadow-emerald-600/5">
                    <CheckCircle2 className="size-3" />
                    <span className="text-[10px] font-black uppercase tracking-tight">CARTÃO ACEITO</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-50 text-slate-400 px-2.5 py-1 rounded-lg border border-slate-100 italic">
                    <Info className="size-3" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Consultar</span>
                  </div>
                )}
              </div>

              {/* Totalizadores por Posto */}
              <div className="grid grid-cols-2 gap-2 my-4 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Litros Total</p>
                  <p className="text-xs font-bold text-slate-700 font-mono">
                    {station.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L
                  </p>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">Gasto Total</p>
                  <p className="text-xs font-bold text-amber-600 font-mono">
                    R$ {station.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <RotateCcw className="size-3 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-500">{station.totalFuelings} Abastecimentos</span>
                </div>
                {(() => {
                  const parsedLat = parseLatLong(station.latitude);
                  const parsedLng = parseLatLong(station.longitude);
                  const googleMapsUrl = (parsedLat !== null && parsedLng !== null)
                    ? `https://www.google.com/maps/search/?api=1&query=${parsedLat},${parsedLng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.name + ', ' + station.city + ' ' + (station.state || ''))}`;
                  
                  return (
                    <a 
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[#0284c7] hover:text-[#14318c] transition-all hover:scale-110 flex items-center justify-center p-2 rounded-xl border border-[#0284c7]/10 bg-[#0284c7]/5 hover:bg-[#0284c7]/10 cursor-pointer"
                      title="Localizar no mapa"
                    >
                      <MapPin className="size-5 text-[#0284c7]" />
                    </a>
                  );
                })()}
              </div>
            </motion.div>
          ))}
          {uniqueStations.length === 0 && (
            <div className="col-span-full py-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 text-sm bg-white">
              Nenhum posto de abastecimento encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </section>

      {/* History Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50/30 font-semibold text-slate-900">
          <h3 className="font-bold flex items-center gap-2">
            <History className="size-5 text-slate-400" />
            Histórico {selectedVehicleId ? `de ${selectedVehicle?.model} (${selectedVehicle?.plate})` : "Recente"}
            <span className="ml-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-slate-200/50">
              {filteredLogs.length} abastecimentos
            </span>
          </h3>
          {selectedVehicleId && (
            <span className="text-xs font-semibold text-slate-700 bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/30">
              Filtrado por veículo
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Data</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Veículo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Litragem</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Preço Unitário</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Valor Total</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Local</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const isSelected = selectedVehicleId === log.vehicleId;

                return (
                  <tr 
                    key={log.id} 
                    onClick={() => {
                      setSelectedVehicleId(log.vehicleId);
                      setVehicleSearch(`${log.model} (${log.plate})`);
                    }}
                    className={cn(
                      "transition-all cursor-pointer group",
                      isSelected ? "bg-emerald-50/50" : "hover:bg-slate-50/80"
                    )}
                  >
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {log.date ? new Date(log.date).toLocaleDateString('pt-BR') : "S/ Data"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          isSelected ? "text-primary font-boldScale" : "text-slate-900 group-hover:text-primary"
                        )}>
                          {log.model}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">{log.plate}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 font-mono">{log.liters.toLocaleString('pt-BR')} L</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      R$ {log.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-600 font-mono">
                      R$ {log.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{log.gasStation}</span>
                        <span className="text-[10px] text-slate-500 uppercase tracking-tight">
                          {log.city}{log.state ? `, ${log.state}` : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isOpenVehicles && (
        <div 
          className="fixed inset-0 z-20 bg-transparent" 
          onClick={() => setIsOpenVehicles(false)} 
        />
      )}
    </div>
  );
};

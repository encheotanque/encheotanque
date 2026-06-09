import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Filter, MoreVertical, Gauge, Image as ImageIcon, X, Calendar, Wrench, Clock, ClipboardList, Fuel, Droplets, TrendingDown, Info } from 'lucide-react';
import { mockVehicles, Vehicle } from '../data/mockData';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';

export interface VehicleWithDB extends Vehicle {
  renavam?: string;
  active?: boolean;
  preferredFuelId?: number;
  preferredFuelName?: string;
  allowedFuels?: string;
  totalLitersConsumed?: number;
  refuelingCount?: number;
  totalSaved?: number;
  fuelsBreakdown?: string;
}

export const Vehicles: React.FC = () => {
  const [selectedOdometerImg, setSelectedOdometerImg] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithDB | null>(null);
  const { user } = useOutletContext<{ user: any }>();
  const userCompanyId = user?.companyId || 1;

  const [vehicles, setVehicles] = useState<VehicleWithDB[]>([]);
  const [fuelTypes, setFuelTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [plateFilter, setPlateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'model' | 'consumption-desc' | 'consumption-asc' | 'saved-desc' | 'saved-asc'>('saved-desc');

  const fetchVehiclesAndFuelTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [vehResp, fuelResp] = await Promise.all([
        fetch('/api/empresa/vehicles'),
        fetch('/api/fuel-types')
      ]);

      let dataVeh: any[] = [];
      let dataFuel: any[] = [];

      if (vehResp.ok) {
        dataVeh = await vehResp.json();
      } else {
        throw new Error("Erro ao carregar veículos.");
      }

      if (fuelResp.ok) {
        dataFuel = await fuelResp.json();
        setFuelTypes(dataFuel);
      }

      // Merge real database vehicles with mock details (like fuel levels, images, etc.)
      const merged = dataVeh.map((dbVeh: any) => {
        const normalizedDbPlate = dbVeh.plate ? dbVeh.plate.replace(/[^A-Z0-9]/ig, '').toUpperCase() : '';
        const matchingMock = mockVehicles.find(mockVeh => {
          const normalizedMockPlate = mockVeh.plate ? mockVeh.plate.replace(/[^A-Z0-9]/ig, '').toUpperCase() : '';
          return normalizedMockPlate === normalizedDbPlate || mockVeh.id === dbVeh.id;
        });

        return {
          id: dbVeh.id,
          plate: dbVeh.plate,
          model: dbVeh.model,
          brand: dbVeh.brand,
          driver: dbVeh.driverName || 'Sem motorista',
          renavam: dbVeh.renavam,
          active: dbVeh.active,
          preferredFuelId: dbVeh.id_comb_pref,
          preferredFuelName: dbVeh.preferredFuelName,
          allowedFuels: dbVeh.ds_combs_permitidos,
          totalLitersConsumed: dbVeh.totalLitersConsumed || 0,
          refuelingCount: dbVeh.refuelingCount || 0,
          totalSaved: dbVeh.totalSaved || 0,
          fuelsBreakdown: dbVeh.fuelsBreakdown || "",
          
          // Operational statistics from mock or fallback values
          year: matchingMock?.year || 2023,
          status: dbVeh.active ? (matchingMock?.status || 'active') : 'idle',
          fuelLevel: matchingMock?.fuelLevel ?? 75,
          lastFueling: matchingMock?.lastFueling || new Date().toISOString(),
          consumption: matchingMock?.consumption ?? 3.0,
          odometerKm: matchingMock?.odometerKm ?? 120000,
          odometerImage: matchingMock?.odometerImage,
          vehicleImage: matchingMock?.vehicleImage,
          maintenances: matchingMock?.maintenances || [],
          daysInUse: matchingMock?.daysInUse || 365,
          dailyOdometer: matchingMock?.dailyOdometer || [],
          fuelTypes: matchingMock?.fuelTypes || [],
          lastFuelingType: matchingMock?.lastFuelingType || 'Diesel',
          observations: matchingMock?.observations || 'Nenhuma observação relevante reportada.',
          acquisitionDate: matchingMock?.acquisitionDate || '2023-01-01',
          depreciationTermMonths: matchingMock?.depreciationTermMonths || 60,
          companyId: matchingMock?.companyId || userCompanyId
        };
      });

      setVehicles(merged);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao obter dados do banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehiclesAndFuelTypes();
  }, [userCompanyId]);

  const calculateDepreciation = (vehicle: VehicleWithDB) => {
    if (!vehicle.acquisitionDate || !vehicle.depreciationTermMonths) return null;
    const start = new Date(vehicle.acquisitionDate);
    const now = new Date();
    const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const progress = Math.min(100, Math.max(0, (diffMonths / vehicle.depreciationTermMonths) * 100));
    const remaining = Math.max(0, vehicle.depreciationTermMonths - diffMonths);
    return { progress, remaining };
  };

  const getAllowedFuelsNames = (allowedStr?: string) => {
    if (!allowedStr) return 'Não informado';
    const ids = allowedStr.split(',').map(id => id.trim()).filter(Boolean);
    if (!ids.length) return 'Não informado';
    return ids.map(id => {
      const found = fuelTypes.find(f => String(f.id_produto) === id);
      return found ? found.ds_produto : `Combustível ${id}`;
    }).join(' / ');
  };

  const renderFuels = (fuelsStr?: string) => {
    if (!fuelsStr) return <span className="text-xs text-slate-400 font-medium font-sans">—</span>;
    const list = fuelsStr.split(' | ').map(item => item.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1.5 max-w-[260px]">
        {list.map((f, i) => {
          const parts = f.split(': ');
          const fuelName = parts[0] || '';
          const lit = parts[1] || '0L';
          return (
            <span key={i} className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 text-stone-700 font-mono text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap">
              {fuelName}: <span className="text-indigo-700 ml-1 font-bold">{lit}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    // 1. Filter by company ID
    if ((vehicle.companyId || 1) !== userCompanyId) return false;

    // 2. Filter by plate (placas dos veículos)
    if (plateFilter.trim()) {
      const normPlate = vehicle.plate ? vehicle.plate.replace(/[^A-Z0-9]/ig, '').toUpperCase() : '';
      const filterTgt = plateFilter.replace(/[^A-Z0-9]/ig, '').toUpperCase();
      if (!normPlate.includes(filterTgt)) return false;
    }

    // 3. Filter by general search string
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPlate = vehicle.plate?.toLowerCase().includes(q);
      const matchModel = vehicle.model?.toLowerCase().includes(q);
      const matchBrand = vehicle.brand?.toLowerCase().includes(q);
      const matchDriver = vehicle.driver?.toLowerCase().includes(q);
      const matchRenavam = vehicle.renavam?.toLowerCase().includes(q);
      if (!matchPlate && !matchModel && !matchBrand && !matchDriver && !matchRenavam) return false;
    }

    return true;
  });

  const sortedVehicles = [...filteredVehicles].sort((a, b) => {
    if (sortBy === 'saved-desc') {
      return (b.totalSaved || 0) - (a.totalSaved || 0);
    }
    if (sortBy === 'saved-asc') {
      return (a.totalSaved || 0) - (b.totalSaved || 0);
    }
    if (sortBy === 'consumption-desc') {
      return (b.totalLitersConsumed || 0) - (a.totalLitersConsumed || 0);
    }
    if (sortBy === 'consumption-asc') {
      return (a.totalLitersConsumed || 0) - (b.totalLitersConsumed || 0);
    }
    return a.model.localeCompare(b.model);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Veículos</h1>
          <p className="text-slate-500 font-medium font-sans">Visualize e gerencie todos os ativos da sua frota.</p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95">
          <Plus className="size-4" />
          Novo Veículo
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-500">
          <Search className="size-4" />
          <input 
            type="text" 
            placeholder="Buscar por placa, modelo, renavam ou motorista..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-indigo-600 min-w-[180px] flex-1 sm:flex-initial">
          <Filter className="size-4 text-indigo-500" />
          <input 
            type="text" 
            placeholder="Filtrar por placa..."
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none font-mono uppercase font-bold placeholder:text-indigo-300 placeholder:font-normal"
          />
          {plateFilter && (
            <button onClick={() => setPlateFilter('')} className="text-indigo-400 hover:text-indigo-600">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-amber-800 min-w-[220px] flex-1 sm:flex-initial">
          <TrendingDown className="size-4 text-amber-600" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 bg-transparent text-sm outline-none font-sans font-semibold text-amber-900"
          >
            <option value="saved-desc">Economia: Maior p/ Menor</option>
            <option value="saved-asc">Economia: Menor p/ Maior</option>
            <option value="consumption-desc">Consumo DB: Maior p/ Menor</option>
            <option value="consumption-asc">Consumo DB: Menor p/ Maior</option>
            <option value="model">Ordenar por: Modelo</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-3">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-slate-500 font-sans">Conectando ao banco de dados e sincronizando frotas...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-red-200 bg-red-50 text-center space-y-2 font-sans">
          <Info className="size-8 text-red-500 animate-pulse" />
          <p className="text-sm font-bold text-red-700">Ocorreu um erro:</p>
          <p className="text-xs text-red-600 font-mono">{error}</p>
          <button 
            onClick={() => fetchVehiclesAndFuelTypes()} 
            className="mt-2 text-xs font-bold text-slate-900 border border-slate-900 px-3 py-1.5 rounded-lg bg-white shadow-sm hover:bg-slate-50 active:scale-95 transition-all"
          >
            Tentar novamente
          </button>
        </div>
      ) : sortedVehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 font-sans">
          <Truck className="size-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-700">Nenhum veículo encontrado</p>
          <p className="text-xs text-slate-400">Verifique os filtros inseridos ou cadastre novos veículos para o motorista.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Veículo</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Litros por combustível</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Motorista</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Consumo Total (Real DB)</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Consumo Médio</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-emerald-600 font-bold">Total economizado</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedVehicles.map((vehicle) => (
                <tr 
                  key={vehicle.id} 
                  onClick={() => setSelectedVehicle(vehicle)}
                  className="group transition-colors hover:bg-slate-50/50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Truck className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{vehicle.model}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-bold">{vehicle.plate}</span>
                          {vehicle.renavam && <span className="ml-1.5 text-slate-400 font-mono text-[11px]">RENAVAM: {vehicle.renavam}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {renderFuels(vehicle.fuelsBreakdown)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">{vehicle.driver}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold text-indigo-700">
                        {vehicle.totalLitersConsumed?.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {vehicle.refuelingCount || 0} abastecimentos
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold text-slate-900">{vehicle.consumption} km/L</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-emerald-600">
                      R$ {Number(vehicle.totalSaved || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Specification Modal */}
      <AnimatePresence>
        {selectedVehicle && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVehicle(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col font-sans"
            >
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="size-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center transition-all border border-white/20"
                >
                  <X className="size-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {/* Header / Image Area */}
                <div className="relative h-64 md:h-80 bg-slate-900">
                  <img 
                    src={selectedVehicle.vehicleImage || "https://images.unsplash.com/photo-1591768793355-74d74b260bb4?auto=format&fit=crop&q=80&w=1200"} 
                    alt={selectedVehicle.model}
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                  <div className="absolute bottom-8 left-8">
                    <div className="flex items-center gap-3 mb-2">
                       <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-widest">
                         {selectedVehicle.year}
                       </span>
                       <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border",
                          !selectedVehicle.active ? "bg-red-500 border-red-600 text-white" :
                          selectedVehicle.status === 'active' ? "bg-emerald-500 border-emerald-600 text-white" :
                          selectedVehicle.status === 'maintenance' ? "bg-amber-500 border-amber-600 text-white" : 
                          "bg-slate-500 border-slate-600 text-white"
                       )}>
                          {!selectedVehicle.active ? 'Inativo' : selectedVehicle.status === 'active' ? 'Operacional' : selectedVehicle.status === 'maintenance' ? 'Em Manutenção' : 'Ocioso'}
                       </span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">{selectedVehicle.model}</h2>
                    <p className="text-slate-300 font-mono text-lg font-semibold">{selectedVehicle.plate}</p>
                  </div>
                </div>

                <div className="p-8 grid gap-8 lg:grid-cols-12">
                  <div className="lg:col-span-12 grid gap-6 md:grid-cols-3 xl:grid-cols-6 text-left">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                         <Clock className="size-3" /> Dias em Operação
                       </p>
                       <p className="text-xl font-bold text-slate-900">{selectedVehicle.daysInUse || 0} dias</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                         <Fuel className="size-3" /> Comb. Permitidos
                       </p>
                       <p className="text-xs font-semibold text-slate-900 leading-tight">
                         {getAllowedFuelsNames(selectedVehicle.allowedFuels)}
                       </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                         <Droplets className="size-3 text-indigo-500" /> Comb. Preferencial
                       </p>
                       <p className="text-xs font-bold text-indigo-700 leading-tight">
                         {selectedVehicle.preferredFuelName || 'Não informado'}
                       </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                         <ClipboardList className="size-3" /> RENAVAM
                       </p>
                       <p className="text-xs font-bold text-slate-950 font-mono tracking-wider">{selectedVehicle.renavam || 'Não cadastrado'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                         <Droplets className="size-3" /> Último Abastecimento
                       </p>
                       <p className="text-xs font-bold text-slate-900">
                         {selectedVehicle.lastFuelingType || 'N/A'} 
                         <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                           {new Date(selectedVehicle.lastFueling).toLocaleDateString('pt-BR')}
                         </span>
                       </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                       <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 flex items-center gap-1.5">
                         <TrendingDown className="size-3" /> Consumo Médio
                       </p>
                       <p className="text-xl font-bold text-amber-700">{selectedVehicle.consumption} km/L</p>
                    </div>
                  </div>

                  {/* Left Column: Maintenance & Odometer */}
                  <div className="lg:col-span-7 space-y-6 text-left">
                    <section className="space-y-4">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Wrench className="size-4 text-slate-400" /> Últimas Manutenções
                      </h3>
                      <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden bg-white">
                        {selectedVehicle.maintenances?.length ? selectedVehicle.maintenances.map((m, i) => (
                           <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div>
                                <p className="text-sm font-bold text-slate-900">{m.purpose}</p>
                                <p className="text-xs text-slate-500">{new Date(m.date).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <span className="text-sm font-bold text-slate-700 font-mono">
                                R$ {m.cost.toLocaleString('pt-BR')}
                              </span>
                           </div>
                        )) : (
                          <div className="p-8 text-center text-slate-400 text-sm">Nenhuma manutenção registrada.</div>
                        )}
                      </div>
                    </section>

                    <section className="space-y-4 font-sans">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Gauge className="size-4 text-slate-400" /> Registro Diário de Odômetro (Trabalho)
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedVehicle.dailyOdometer?.map((o, i) => (
                           <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-500">{new Date(o.date).toLocaleDateString('pt-BR')}</span>
                              <span className="text-sm font-bold text-slate-900 font-mono">{o.km.toLocaleString('pt-BR')} km</span>
                           </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                        <Info className="size-3 text-amber-500" /> Conferência visual obrigatória via App Mobile.
                      </p>
                    </section>
                  </div>

                  {/* Right Column: Life cycle & Obs */}
                  <div className="lg:col-span-5 space-y-6 text-left">
                    <section className="p-6 rounded-2xl border border-slate-200 bg-slate-50">
                       <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                         <TrendingDown className="size-4 text-slate-400" /> Ciclo de Vida do Ativo
                       </h3>
                       {(() => {
                         const dep = calculateDepreciation(selectedVehicle);
                         if (!dep) return <p className="text-xs text-slate-500">Dados de depreciação indisponíveis.</p>;
                         return (
                           <div className="space-y-4">
                             <div>
                               <div className="flex justify-between text-xs font-bold mb-1.5 uppercase tracking-wide">
                                 <span className="text-slate-500">Depreciação Total</span>
                                 <span className="text-indigo-600">{Math.round(dep.progress)}%</span>
                               </div>
                               <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                 <div 
                                   className="h-full bg-indigo-600" 
                                   style={{ width: `${dep.progress}%` }} 
                                 />
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="flex-1 p-3 bg-white rounded-xl border border-slate-100">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">Tempo Restante</p>
                                   <p className="text-lg font-bold text-slate-900">{dep.remaining} meses</p>
                                </div>
                                <div className="flex-1 p-3 bg-white rounded-xl border border-slate-100">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase">Adquirido em</p>
                                   <p className="text-sm font-bold text-slate-900">
                                     {selectedVehicle.acquisitionDate ? new Date(selectedVehicle.acquisitionDate).toLocaleDateString('pt-BR') : 'N/A'}
                                   </p>
                                </div>
                             </div>
                           </div>
                         );
                       })()}
                    </section>

                    <section className="p-6 rounded-2xl border border-blue-100 bg-blue-50/30">
                       <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-3">
                         <ClipboardList className="size-4 text-blue-400" /> Observações do Motorista
                       </h3>
                       <div className="text-sm text-slate-600 leading-relaxed italic">
                         "{selectedVehicle.observations || 'Nenhuma observação relevante reportada pelo motorista responsável.'}"
                       </div>
                       <p className="mt-4 text-[10px] font-bold text-indigo-600 uppercase">Responsável: {selectedVehicle.driver}</p>
                    </section>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 flex justify-end border-t border-slate-100">
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Fechar Especificações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Modal Preview */}
      {selectedOdometerImg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => setSelectedOdometerImg(null)}
                className="size-10 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 flex items-center justify-center transition-all"
              >
                <X className="size-6" />
              </button>
            </div>
            <div className="p-8 pb-4">
              <h3 className="text-xl font-bold text-slate-900">Comprovação de Odômetro</h3>
              <p className="text-sm text-slate-500 font-medium">Registro fotográfico do painel do veículo.</p>
            </div>
            <div className="p-4 pt-0">
               <img 
                 src={selectedOdometerImg} 
                 alt="Odômetro" 
                 referrerPolicy="no-referrer"
                 className="w-full h-auto rounded-2xl border border-slate-100"
               />
            </div>
            <div className="bg-slate-50 p-6 flex justify-end font-sans">
              <button 
                onClick={() => setSelectedOdometerImg(null)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all font-semibold"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

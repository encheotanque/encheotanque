import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Award, 
  AlertCircle, 
  ClipboardList, 
  Stethoscope, 
  Navigation, 
  Heart,
  ShieldCheck,
  TrendingUp,
  Info,
  Edit,
  Trash2,
  Save,
  Loader2,
  FileText,
  Truck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';

export interface Driver {
  id: string;
  name: string;
  avatar?: string;
  license: string;
  licenseStatus: 'valid' | 'expired' | 'warning';
  licenseExpiry: string;
  status: 'active' | 'off' | 'on-break';
  performance: number;
  phone: string;
  email?: string;
  hiringDate?: string;
  lastMedicalExam?: string;
  totalRoutes?: number;
  totalKm?: number;
  recentIncidents?: number;
  observations?: string;
  cpf?: string;
  companyId?: number;
}

export const Drivers: React.FC = () => {
  const { user } = useOutletContext<{ user: any }>();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal actions state
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  
  // Form submission state
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Vehicles list & management inside driver details popup
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState<boolean>(false);
  const [vehicleFormOpen, setVehicleFormOpen] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<any | null>(null);
  const [vehFormData, setVehFormData] = useState({
    plate: '',
    renavam: '',
    model: '',
    brand: ''
  });
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [vehicleSaving, setVehicleSaving] = useState<boolean>(false);

  const fetchDriverVehicles = async (driverId: string) => {
    try {
      setVehiclesLoading(true);
      const resp = await fetch(`/api/empresa/drivers/${driverId}/vehicles`);
      if (resp.ok) {
        const data = await resp.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error("Error fetching vehicles for driver:", err);
    } finally {
      setVehiclesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDriver) {
      fetchDriverVehicles(selectedDriver.id);
      setVehicleFormOpen(false);
      setEditingVehicle(null);
    }
  }, [selectedDriver]);

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    if (!vehFormData.plate.trim() || !vehFormData.model.trim() || !vehFormData.brand.trim()) {
      setVehicleError("Placa, modelo e marca são obrigatórios.");
      return;
    }

    try {
      setVehicleSaving(true);
      setVehicleError(null);

      const url = editingVehicle 
        ? `/api/empresa/vehicles/${editingVehicle.id}` 
        : `/api/empresa/drivers/${selectedDriver.id}/vehicles`;
      const method = editingVehicle ? 'PUT' : 'POST';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehFormData)
      });

      if (resp.ok) {
        await fetchDriverVehicles(selectedDriver.id);
        setVehicleFormOpen(false);
        setEditingVehicle(null);
        setVehFormData({ plate: '', renavam: '', model: '', brand: '' });
      } else {
        const errObj = await resp.json();
        setVehicleError(errObj.error || "Erro ao salvar veículo.");
      }
    } catch (err) {
      console.error(err);
      setVehicleError("Erro de comunicação.");
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleToggleVehicleStatus = async (vehicleId: string, currentActive: boolean) => {
    if (!selectedDriver) return;
    try {
      const resp = await fetch(`/api/empresa/vehicles/${vehicleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive })
      });
      if (resp.ok) {
        await fetchDriverVehicles(selectedDriver.id);
      }
    } catch (err) {
      console.error("Error toggling vehicle status:", err);
    }
  };

  const handleStartEditVehicle = (veh: any) => {
    setEditingVehicle(veh);
    setVehFormData({
      plate: veh.plate,
      renavam: veh.renavam,
      model: veh.model,
      brand: veh.brand
    });
    setVehicleFormOpen(true);
    setVehicleError(null);
  };

  const handleStartAddVehicle = () => {
    setEditingVehicle(null);
    setVehFormData({
      plate: '',
      renavam: '',
      model: '',
      brand: ''
    });
    setVehicleFormOpen(true);
    setVehicleError(null);
  };

  // Inputs state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    license: '',
    licenseExpiry: '',
    status: 'off' as 'active' | 'off' | 'on-break',
    performance: 90,
    hiringDate: '',
    lastMedicalExam: '',
    totalRoutes: 0,
    totalKm: 0,
    recentIncidents: 0,
    observations: '',
    avatar: ''
  });

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch('/api/empresa/drivers');
      if (resp.ok) {
        const data = await resp.json();
        setDrivers(data);
      } else {
        const errObj = await resp.json();
        setError(errObj.error || "Erro ao carregar os motoristas.");
      }
    } catch (e: any) {
      console.error("[FETCH_DRIVERS_FRONT] Error:", e);
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleStartCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpf: '',
      license: '',
      licenseExpiry: '',
      status: 'off',
      performance: 90,
      hiringDate: new Date().toISOString().split('T')[0],
      lastMedicalExam: '',
      totalRoutes: 0,
      totalKm: 0,
      recentIncidents: 0,
      observations: '',
      avatar: ''
    });
    setFormError(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleStartEdit = (driver: Driver) => {
    setFormData({
      name: driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      cpf: driver.cpf || '',
      license: driver.license || '',
      licenseExpiry: driver.licenseExpiry || '',
      status: driver.status || 'off',
      performance: driver.performance ?? 90,
      hiringDate: driver.hiringDate || '',
      lastMedicalExam: driver.lastMedicalExam || '',
      totalRoutes: driver.totalRoutes ?? 0,
      totalKm: driver.totalKm ?? 0,
      recentIncidents: driver.recentIncidents ?? 0,
      observations: driver.observations || '',
      avatar: driver.avatar || ''
    });
    setFormError(null);
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("O nome é obrigatório.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const url = isCreating ? '/api/empresa/drivers' : `/api/empresa/drivers/${selectedDriver?.id}`;
      const method = isCreating ? 'POST' : 'PUT';

      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (resp.ok) {
        await fetchDrivers();
        setIsEditing(false);
        setIsCreating(false);
        setSelectedDriver(null);
      } else {
        const errObj = await resp.json();
        setFormError(errObj.error || "Ocorreu um erro ao salvar o registro.");
      }
    } catch (err: any) {
      console.error(err);
      setFormError("Erro de comunicação com o servidor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;

    try {
      setSaving(true);
      setFormError(null);
      const resp = await fetch(`/api/empresa/drivers/${selectedDriver.id}`, {
        method: 'DELETE'
      });

      if (resp.ok) {
        await fetchDrivers();
        setSelectedDriver(null);
        setShowDeleteConfirm(false);
        setIsEditing(false);
      } else {
        const errObj = await resp.json();
        setFormError(errObj.error || "Erro ao excluir o motorista.");
        setShowDeleteConfirm(false);
      }
    } catch (err: any) {
      console.error(err);
      setFormError("Falha na conexão com o servidor.");
      setShowDeleteConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Motoristas</h1>
            <p className="text-slate-500">Acompanhe a documentação e performance da sua equipe.</p>
          </div>
          <button 
            onClick={handleStartCreate}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-slate-800 active:scale-95 cursor-pointer shadow-sm hover:shadow-md"
          >
            <Plus className="size-4 text-primary" />
            Novo Motorista
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Acessando registros seguros...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6 flex flex-col items-center text-center gap-3">
            <AlertCircle className="size-8 text-red-500" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button 
              onClick={fetchDrivers}
              className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
            >
              Tentar Novamente
            </button>
          </div>
        ) : drivers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center flex flex-col items-center justify-center gap-4">
            <Users className="size-12 text-slate-300" />
            <div>
              <p className="text-sm font-bold text-slate-700">Nenhum motorista cadastrado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Cadastre o primeiro motorista para começar a gerenciar sua escala de frotas e consumos.</p>
            </div>
            <button 
              onClick={handleStartCreate}
              className="px-4 py-2 bg-primary text-slate-900 text-xs font-bold rounded-xl hover:brightness-110 shadow-sm"
            >
              Adicionar Motorista
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {drivers.map((driver) => (
              <div 
                key={driver.id} 
                onClick={() => {
                  setSelectedDriver(driver);
                  setIsEditing(false);
                  setIsCreating(false);
                  setShowDeleteConfirm(false);
                }}
                className="card-hover relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 cursor-pointer flex flex-col justify-between group min-h-[200px]"
              >
                {/* License Status Strip */}
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-1.5 w-full",
                  driver.licenseStatus === 'valid' ? "bg-emerald-500" :
                  driver.licenseStatus === 'warning' ? "bg-amber-500" : "bg-red-500"
                )} />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="size-11 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-slate-500 ring-2 ring-slate-100 group-hover:ring-primary/40 transition-all">
                      {driver.avatar ? (
                        <img src={driver.avatar} alt={driver.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="size-5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        driver.status === 'active' ? "bg-emerald-50 text-emerald-600" :
                        driver.status === 'on-break' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {driver.status === 'active' ? 'Em Viagem' : driver.status === 'on-break' ? 'Intervalo' : 'Folga'}
                      </span>
                      <span className={cn(
                        "text-[8px] font-bold uppercase py-0.5 px-1.5 rounded border",
                        driver.licenseStatus === 'valid' ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                        driver.licenseStatus === 'warning' ? "border-amber-200 text-amber-700 bg-amber-50" : "border-red-200 text-red-700 bg-red-50"
                      )}>
                        CNH: {driver.licenseStatus === 'valid' ? 'Regular' : driver.licenseStatus === 'warning' ? 'Vencendo' : 'Vencida'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="font-bold text-slate-900 line-clamp-1 text-sm">{driver.name}</h3>
                    <p className="text-xs text-slate-500">{driver.license} • Expira: {driver.licenseExpiry ? new Date(driver.licenseExpiry + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada'}</p>
                    <p className="mt-1 text-xs text-slate-400 font-mono">{driver.phone}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Performance</span>
                    <span className="text-xs font-bold text-slate-800">{driver.performance}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "size-1.5 rounded-full",
                          i < Math.floor(driver.performance / 20) ? "bg-emerald-500" : "bg-slate-200"
                        )} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Detail or Form Modal */}
      <AnimatePresence>
        {(selectedDriver || isCreating) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!saving) {
                  setSelectedDriver(null);
                  setIsCreating(false);
                  setIsEditing(false);
                  setShowDeleteConfirm(false);
                }
              }}
              className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Close Button Trigger */}
              <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => {
                    setSelectedDriver(null);
                    setIsCreating(false);
                    setIsEditing(false);
                    setShowDeleteConfirm(false);
                  }}
                  disabled={saving}
                  className="size-9 rounded-full bg-slate-900/40 backdrop-blur-md text-white hover:bg-slate-900/60 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {((selectedDriver && !isEditing) && (
                <div className="flex-1 overflow-y-auto">
                  {/* Profile Header */}
                  <div className="relative h-44 md:h-48 bg-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/10">
                    <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
                    <div className="absolute -bottom-14 left-8 flex items-end gap-5">
                      <div className="size-24 rounded-3xl border-4 border-white bg-slate-100 shadow-xl overflow-hidden flex items-center justify-center">
                        {selectedDriver.avatar ? (
                          <img src={selectedDriver.avatar} alt={selectedDriver.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="size-10 text-slate-400" />
                        )}
                      </div>
                      <div className="mb-[56px]">
                        <h2 className="text-2xl font-bold text-white tracking-tight border-b-2 border-primary/40 inline-flex pb-1">{selectedDriver.name}</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white",
                            selectedDriver.status === 'active' ? "bg-emerald-500" :
                            selectedDriver.status === 'on-break' ? "bg-amber-500" : "bg-slate-500"
                          )}>
                            {selectedDriver.status === 'active' ? 'Em Viagem' : selectedDriver.status === 'on-break' ? 'Intervalo' : 'Folga'}
                          </span>
                          <span className="text-slate-300 font-semibold text-[11px] flex items-center gap-1">
                            <MapPin className="size-3 text-primary" /> Base Operacional
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-8 pt-16 pb-8 grid gap-6 mt-4">
                    {/* Performance Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
                          <Award className="size-3.5 text-primary" /> Performance
                        </p>
                        <p className="text-xl font-black text-slate-900">{selectedDriver.performance}%</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
                          <Navigation className="size-3.5 text-primary" /> Km Rodado
                        </p>
                        <p className="text-lg font-bold text-slate-900 font-mono">
                          {(selectedDriver.totalKm || 0).toLocaleString('pt-BR')} <span className="text-[10px] font-medium text-slate-500">km</span>
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1 flex items-center gap-1.5">
                          <ClipboardList className="size-3.5 text-primary" /> Rotas Concluídas
                        </p>
                        <p className="text-xl font-bold text-slate-900">{selectedDriver.totalRoutes || 0}</p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl border",
                        (selectedDriver.recentIncidents || 0) > 0 ? "bg-red-50/50 border-red-100" : "bg-emerald-50/50 border-emerald-100"
                      )}>
                        <p className={cn(
                          "text-[10px] font-bold tracking-wider uppercase mb-1 flex items-center gap-1.5",
                          (selectedDriver.recentIncidents || 0) > 0 ? "text-red-600" : "text-emerald-700"
                        )}>
                          <AlertCircle className="size-3.5" /> Incidentes
                        </p>
                        <p className={cn(
                          "text-xl font-black-total",
                          (selectedDriver.recentIncidents || 0) > 0 ? "text-red-700 font-bold" : "text-emerald-700 font-bold"
                        )}>{selectedDriver.recentIncidents || 0}</p>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-12">
                      {/* Left Column: Legal and Contact docs */}
                      <div className="md:col-span-7 space-y-6">
                        <section className="space-y-3">
                          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="size-4 text-primary" /> Documentos & CNH
                          </h3>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
                              <div>
                                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">CNH (Habilitação)</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-md font-bold text-slate-900 font-mono">{selectedDriver.license}</span>
                                  <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-bold",
                                    selectedDriver.licenseStatus === 'valid' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                                  )}>
                                    {selectedDriver.licenseStatus === 'valid' ? 'VÁLIDA' : selectedDriver.licenseStatus === 'warning' ? 'VENCENDO' : 'EXPIRADA'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-50 pt-2 font-medium">Expira em: <span className="font-bold font-mono">{selectedDriver.licenseExpiry ? new Date(selectedDriver.licenseExpiry + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não informada'}</span></p>
                            </div>

                            {/* CPF DATABASE FIELD DISPLAY */}
                            <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between">
                              <div>
                                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">CPF (Documento Federal)</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-md font-bold text-slate-950 font-mono">{selectedDriver.cpf || 'Não informado'}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-600">
                                    ATIVO
                                  </span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-50 pt-2 italic">Vinculado a tb_motorista</p>
                            </div>
                          </div>

                          <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Stethoscope className="size-3 text-slate-400" /> Saúde Ocupacional (ASO)
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-800">
                                Último Exame Clínico:
                              </span>
                              <span className="text-sm text-slate-900 font-semibold font-mono">
                                {selectedDriver.lastMedicalExam ? new Date(selectedDriver.lastMedicalExam + 'T12:00:00').toLocaleDateString('pt-BR') : 'Nenhum ASO cadastrado'}
                              </span>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Phone className="size-4 text-primary" /> Contato Direto
                          </h3>
                          <div className="grid gap-3">
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <div className="size-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                <Phone className="size-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">WhatsApp / Celular</p>
                                <p className="text-sm font-bold text-slate-900 font-mono">{selectedDriver.phone}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100 font-mono">
                              <div className="size-9 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400">
                                <Mail className="size-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase font-sans">E-mail Corporativo</p>
                                <p className="text-sm font-bold text-slate-900">{selectedDriver.email || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </section>

                        {/* Drivers Vehicles Section */}
                        <section className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Truck className="size-4 text-primary" /> Veículos Associados
                            </h3>
                            <button
                              type="button"
                              onClick={handleStartAddVehicle}
                              className="px-2.5 py-1 text-[10px] font-bold text-slate-900 bg-primary hover:brightness-110 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                            >
                              <Plus className="size-3" /> Adicionar Veículo
                            </button>
                          </div>

                          {vehicleFormOpen && (
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                                  {editingVehicle ? "Editar Veículo" : "Novo Veículo"}
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => setVehicleFormOpen(false)}
                                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <X className="size-4" />
                                </button>
                              </div>

                              {vehicleError && (
                                <p className="text-[10px] text-red-600 font-bold">{vehicleError}</p>
                              )}

                              <div className="grid gap-3 grid-cols-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase">Marca *</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Ford"
                                    required
                                    value={vehFormData.brand}
                                    onChange={(e) => setVehFormData({...vehFormData, brand: e.target.value})}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase">Modelo *</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: Cargo 2428"
                                    required
                                    value={vehFormData.model}
                                    onChange={(e) => setVehFormData({...vehFormData, model: e.target.value})}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase">Placa *</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: ABC1D23"
                                    required
                                    value={vehFormData.plate}
                                    onChange={(e) => setVehFormData({...vehFormData, plate: e.target.value})}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-slate-500 uppercase">Renavam</label>
                                  <input
                                    type="text"
                                    placeholder="Opcional"
                                    value={vehFormData.renavam}
                                    onChange={(e) => setVehFormData({...vehFormData, renavam: e.target.value})}
                                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setVehicleFormOpen(false)}
                                  className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 text-slate-600 rounded-lg font-bold"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={vehicleSaving}
                                  onClick={handleSaveVehicle}
                                  className="px-3 py-1 text-[10px] bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50"
                                >
                                  {vehicleSaving ? "Salvando..." : "Salvar"}
                                </button>
                              </div>
                            </div>
                          )}

                          {vehiclesLoading ? (
                            <div className="flex justify-center p-4">
                              <Loader2 className="size-5 animate-spin text-primary" />
                            </div>
                          ) : vehicles.length === 0 ? (
                            <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                              <p className="text-[11px] text-slate-400 font-bold">Nenhum veículo associado a este motorista</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {vehicles.map((veh) => (
                                <div
                                  key={veh.id}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                                    veh.active 
                                      ? "bg-white border-slate-150 shadow-sm" 
                                      : "bg-slate-50/50 border-slate-200/50 opacity-60"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "size-8 rounded-lg flex items-center justify-center",
                                      veh.active ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-400"
                                    )}>
                                      <Truck className="size-4" />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-bold text-slate-900 leading-tight">
                                          {veh.brand} {veh.model}
                                        </p>
                                        <span className={cn(
                                          "text-[8px] font-bold px-1 py-0.5 rounded",
                                          veh.active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                                        )}>
                                          {veh.active ? "Ativo" : "Inativo"}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        Placa: {veh.plate} {veh.renavam ? `• Renavam: ${veh.renavam}` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditVehicle(veh)}
                                      className="p-1 px-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded text-[9px] font-bold cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleVehicleStatus(veh.id, veh.active)}
                                      className={cn(
                                        "p-1 px-1.5 border rounded text-[9px] font-bold cursor-pointer",
                                        veh.active 
                                          ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600" 
                                          : "bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700"
                                      )}
                                    >
                                      {veh.active ? "Desativar" : "Ativar"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </div>

                      {/* Right Column: Corporate information and logs */}
                      <div className="md:col-span-5 space-y-6">
                        <section className="p-6 rounded-2xl bg-slate-950 text-white shadow-xl relative overflow-hidden">
                          <TrendingUp className="absolute -bottom-4 -right-4 size-32 text-primary/5 pointer-events-none" />
                          <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                            <Heart className="size-4 text-primary" /> Experiência & Corporativo
                          </h3>
                          <div className="space-y-3 relative z-10 text-xs shadow-sm">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contratado em</p>
                              <p className="text-md font-bold mt-0.5">{selectedDriver.hiringDate ? new Date(selectedDriver.hiringDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data registrada'}</p>
                            </div>
                            <div className="h-px bg-white/10" />
                            <div className="grid grid-cols-2 gap-3 pt-1">
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Controle Frota</p>
                                <p className="text-xs font-bold text-primary">Ativo Integrado</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Base Geral</p>
                                <p className="text-xs font-bold text-slate-100">São Paulo, SP</p>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wider">
                            <FileText className="size-4 text-slate-400" /> Observações Operacionais
                          </h3>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{selectedDriver.observations || 'Nenhuma observação relevante registrada para este motorista.'}"
                          </p>
                        </section>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Form editing / creation modal frame */}
              {((isEditing || isCreating) && (
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
                  <div className="px-8 py-6 bg-slate-950 text-white border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        {isCreating ? <Users className="size-5 text-primary" /> : <Edit className="size-5 text-primary" />}
                        {isCreating ? 'Cadastrar Novo Motorista' : `Editar Registro: ${selectedDriver?.name}`}
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Preencha os campos para persistir na tabela tb_motorista.</p>
                    </div>
                  </div>

                  <div className="px-8 py-6 space-y-6 flex-1">
                    {formError && (
                      <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="size-4" />
                        {formError}
                      </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo *</label>
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Informe o nome completo do condutor"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail de Cadastro</label>
                        <input 
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="exemplo@gmail.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Telefone com DDD</label>
                        <input 
                          type="text" 
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="(11) 99999-9999"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      {/* PHYSICAL CPF FIELD */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CPF (tb_motorista) *</label>
                        <input 
                          type="text" 
                          value={formData.cpf}
                          onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                          placeholder="000.000.000-00"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CNH (Habilitação)</label>
                        <input 
                          type="text" 
                          value={formData.license}
                          onChange={(e) => setFormData({...formData, license: e.target.value})}
                          placeholder="Cat AE"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Validade CNH</label>
                        <input 
                          type="date" 
                          value={formData.licenseExpiry}
                          onChange={(e) => setFormData({...formData, licenseExpiry: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data de Admissão / Contratação</label>
                        <input 
                          type="date" 
                          value={formData.hiringDate}
                          onChange={(e) => setFormData({...formData, hiringDate: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data Clínico ASO</label>
                        <input 
                          type="date" 
                          value={formData.lastMedicalExam}
                          onChange={(e) => setFormData({...formData, lastMedicalExam: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold font-mono focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Operacional</label>
                        <select 
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        >
                          <option value="active">Em Viagem (active)</option>
                          <option value="off">Folga (off)</option>
                          <option value="on-break">Intervalo (on-break)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Performance (0 - 100)%</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="100"
                          value={formData.performance}
                          onChange={(e) => setFormData({...formData, performance: parseInt(e.target.value, 10) || 90})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Rodado (Km)</label>
                        <input 
                          type="number" 
                          value={formData.totalKm}
                          onChange={(e) => setFormData({...formData, totalKm: parseInt(e.target.value, 10) || 0})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rotas Concluídas</label>
                        <input 
                          type="number" 
                          value={formData.totalRoutes}
                          onChange={(e) => setFormData({...formData, totalRoutes: parseInt(e.target.value, 10) || 0})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Incidentes</label>
                        <input 
                          type="number" 
                          value={formData.recentIncidents}
                          onChange={(e) => setFormData({...formData, recentIncidents: parseInt(e.target.value, 10) || 0})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Link da Foto (Avatar)</label>
                        <input 
                          type="text" 
                          value={formData.avatar}
                          onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                          placeholder="https://exemplo.com/avatar.jpg"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações Operacionais</label>
                      <textarea 
                        rows={3}
                        value={formData.observations}
                        onChange={(e) => setFormData({...formData, observations: e.target.value})}
                        placeholder="Adicione observações sobre a performance, exames médicos obrigatórios ou restrições."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 resize-none"
                      />
                    </div>
                  </div>

                  {/* Form Footer Action Buttons */}
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 rounded-b-3xl">
                    <button 
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (isCreating) {
                          setIsCreating(false);
                        } else {
                          setIsEditing(false);
                        }
                        setFormError(null);
                      }}
                      className="px-5 py-2.5 border border-slate-200 font-bold text-xs rounded-xl bg-white text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 font-bold text-xs rounded-xl bg-primary hover:brightness-110 text-slate-900 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-primary/20 transition-all"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 text-slate-900" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ))}

              {/* Main Footer under display details (Not editing form) */}
              {(selectedDriver && !isEditing && (
                <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-150 rounded-b-3xl mt-auto">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStartEdit(selectedDriver)}
                      className="px-4 py-2.5 cursor-pointer rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Edit className="size-3.5 text-primary" />
                      Editar Motorista
                    </button>
                    
                    {!showDeleteConfirm ? (
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2.5 cursor-pointer rounded-xl bg-white border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50/50 transition-all flex items-center gap-1 shadow-sm"
                      >
                        <Trash2 className="size-3.5" />
                        Remover
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 border border-red-200 bg-red-50 py-1.5 px-3 rounded-xl">
                        <span className="text-[10px] font-bold text-red-700 uppercase">Confirmar exclusão?</span>
                        <button 
                          onClick={handleDelete}
                          disabled={saving}
                          className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-extrabold cursor-pointer hover:bg-red-700 active:scale-95 transition-all"
                        >
                          Sim
                        </button>
                        <button 
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={saving}
                          className="px-2 py-1 bg-white text-slate-500 border border-slate-200 rounded text-[9px] font-extrabold cursor-pointer hover:bg-slate-100"
                        >
                          Não
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setSelectedDriver(null)}
                    className="px-7 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-md shadow-slate-900/15 cursor-pointer"
                  >
                    Fechar Perfil
                  </button>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

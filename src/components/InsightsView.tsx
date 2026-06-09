import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart as PieChartIcon, 
  BarChart2, 
  Loader2, 
  MapPin,
  ChevronDown,
  AlertCircle,
  TrendingDown,
  Info
} from 'lucide-react';

const FUEL_COLORS: Record<string, string> = {
  'Gasolina Comum': '#ccff00',
  'Gasolina Aditivada': '#ff9100',
  'Etanol': '#ff007b',
  'Diesel S10': '#00e5ff',
  'Diesel S500': '#00e5ff',
  'Outros': '#9d00ff'
};

const getFuelColor = (name: string) => {
  return FUEL_COLORS[name] || '#9d00ff';
};

interface InsightsViewProps {
  initialCity?: string;
  selectedVehicle?: any;
}

export function InsightsView({ initialCity, selectedVehicle }: InsightsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'Petrópolis');
  const [cities, setCities] = useState<string[]>([]);

  const getFriendlyName = (name: string) => {
    if (!name) return name;
    const upName = name.toUpperCase();
    if (upName.includes('GASOLINA') && upName.includes('ADITIVADA')) return 'Gasolina Aditivada';
    if (upName.includes('GASOLINA')) return 'Gasolina Comum';
    if (upName.includes('ETANOL')) return 'Etanol';
    if (upName.includes('DIESEL') && upName.includes('S10')) return 'Diesel S10';
    if (upName.includes('DIESEL')) return 'Diesel S500';
    return name;
  };

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities');
      const result = await response.json();
      setCities(result);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[DEBUG] Fetching insights for city:', selectedCity);
      let url = selectedCity && selectedCity !== 'Desconhecido' && selectedCity !== 'Buscando localização...'
        ? `/api/user/insights?municipio=${encodeURIComponent(selectedCity)}`
        : '/api/user/insights';
      
      if (selectedVehicle?.id_veiculo) {
        url += (url.includes('?') ? '&' : '?') + `id_veiculo=${selectedVehicle.id_veiculo}`;
      }
      
      const resp = await fetch(url);
      const json = await resp.json();
      console.log('[DEBUG] Insights response:', json);
      if (!resp.ok) throw new Error(json.error || 'Erro ao carregar análises');
      setData(json);
    } catch (err: any) {
      console.error('[DEBUG] Insights fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    const validCity = initialCity && 
                    initialCity !== 'Desconhecido' && 
                    initialCity !== 'Buscando localização...' &&
                    initialCity !== 'Localização Desconhecida';
    if (validCity) {
      setSelectedCity(initialCity as string);
    }
  }, [initialCity]);

  useEffect(() => {
    fetchInsights();
  }, [selectedCity, selectedVehicle]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-white/40 font-black uppercase text-[10px] tracking-widest">Calculando análises...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-500/10 rounded-3xl border border-red-500/20 m-6">
        <AlertCircle className="text-red-500 mx-auto mb-4" size={40} />
        <p className="text-red-400 font-bold mb-4">{error || 'Sem dados para exibir'}</p>
        <button onClick={fetchInsights} className="bg-red-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase">Tentar Novamente</button>
      </div>
    );
  }

  const hasMonthlyData = Array.isArray(data?.monthlySpend) && data.monthlySpend.length > 0;
  const hasFuelData = Array.isArray(data?.fuelSpend) && data.fuelSpend.length > 0;
  const hasTrendData = Array.isArray(data?.priceTrend) && data.priceTrend.length > 0;
  const hasStationData = Array.isArray(data?.stationSpend) && data.stationSpend.length > 0;

  // Pre-process trend data for multi-line support
  const trendByDate = hasTrendData ? data.priceTrend.reduce((acc: any, curr: any) => {
    if (!curr || !curr.date) return acc;
    
    // curr.date is YYYY-MM-DD from DATE_FORMAT on server
    const parts = String(curr.date).split('-');
    const date = parts.length === 3 ? `${parts[2]}/${parts[1]}` : String(curr.date);
    
    if (!acc[date]) acc[date] = { date };
    const label = getFriendlyName(curr.fuel) || 'Outros';
    acc[date][label] = Number(curr.avg_price) || 0;
    return acc;
  }, {}) : {};
  const trendData = hasTrendData ? Object.values(trendByDate) : [];

  const fuelsRaw = hasTrendData ? Array.from(new Set(data.priceTrend.map((item: any) => item?.fuel ? getFriendlyName(item.fuel) : 'Outros'))) : [];
  const fuels = fuelsRaw.filter((f): f is string => typeof f === 'string' && f.length > 0);

  const fuelChartDataMap = hasFuelData ? data.fuelSpend.reduce((acc: any, f: any) => {
    const name = getFriendlyName(f?.name) || 'Outros';
    const val = Number(f?.value) || 0;
    acc[name] = (acc[name] || 0) + val;
    return acc;
  }, {}) : {};

  const fuelChartData = hasFuelData ? Object.entries(fuelChartDataMap).map(([name, value]) => ({ 
    name,
    value: value as number 
  })) : [];

  const processedMonthlySpend = hasMonthlyData ? data.monthlySpend.map((m: any) => ({
    ...m,
    total_spent: Number(m.total_spent) || 0,
    total_economy: Number(m.total_economy) || 0
  })) : [];

  const processedStationSpend = hasStationData ? data.stationSpend.map((s: any) => ({
    ...s,
    value: Number(s.value) || 0
  })) : [];

  if (!hasMonthlyData && !hasFuelData && !hasTrendData && !hasStationData) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
           <BarChart2 className="text-white/20" size={40} />
        </div>
        <h2 className="text-xl font-black text-white uppercase mb-2">Sem Dados Suficientes</h2>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest max-w-[250px] mx-auto leading-relaxed">
          Você ainda não possui abastecimentos registrados para gerar análises. Comece escaneando suas notas!
        </p>
        <div className="mt-8 p-4 bg-primary/10 rounded-2xl border border-primary/20 max-w-[300px]">
           <p className="text-[10px] text-primary font-black uppercase leading-tight">
             Dica: As análises de mercado (tendência) também dependem de abastecimentos recentes na sua região.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-10">
      <header className="px-6 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-2xl">
            <TrendingUp className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Insights do Tanque</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="relative group">
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 hover:bg-white/10 transition-colors">
                  <MapPin size={10} className="text-primary/60" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="bg-transparent text-white/80 text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer appearance-none pr-3"
                  >
                    {!cities.includes(selectedCity) && selectedCity !== 'Desconhecido' && selectedCity !== 'Buscando localização...' && (
                      <option value={selectedCity}>{selectedCity}</option>
                    )}
                    {cities.map(city => (
                      <option key={city} value={city} className="bg-[#1a1a1a] text-white">{city}</option>
                    ))}
                  </select>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={10} className="text-white/40" />
                  </div>
                </div>
              </div>
              <span className="text-white/20">•</span> 
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Análises</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-8 mt-4">

      {/* 1. Evolução do Preço Médio (Mercado) */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-container-high p-6 rounded-[2rem] border border-white/5"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase mb-1 flex items-center gap-2">
              <TrendingDown size={14} className="text-primary" />
              Tendência de Mercado
            </h3>
            <p className="text-[10px] text-white/40 uppercase font-black">Preço Médio nos Últimos 30 Dias</p>
          </div>
          <div className="p-2 bg-primary/10 rounded-lg">
             <Info size={14} className="text-primary" />
          </div>
        </div>

        {hasTrendData ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#ffffff40', fontWeight: 900 }}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tick={{ fill: '#ffffff40', fontWeight: 900 }}
                  tickFormatter={(val) => {
                    const num = Number(val);
                    return isNaN(num) ? "" : `R$${num.toFixed(2)}`;
                  }}
                />
                <Tooltip 
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Preço"]}
                />
                <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                {fuels.map((fuel) => (
                  <Line 
                    key={fuel as string}
                    type="monotone" 
                    dataKey={fuel as string} 
                    stroke={getFuelColor(fuel as string)} 
                    strokeWidth={3} 
                    dot={false}
                    activeDot={{ r: 6, stroke: '#000', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-white/20">Sem dados de mercado (30 dias)</p>
          </div>
        )}
      </motion.section>

      {/* 2. Gasto Mensal e Economia */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface-container-high p-6 rounded-[2rem] border border-white/5"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase mb-1 flex items-center gap-2">
              <BarChart2 size={14} className="text-primary" />
              Seu Gasto Mensal
            </h3>
            <p className="text-[10px] text-white/40 uppercase font-black">Histórico dos últimos 6 meses</p>
          </div>
        </div>

        {hasMonthlyData ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedMonthlySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#ffffff40', fontWeight: 900 }}
                  tickFormatter={(val) => {
                    const sVal = String(val || "");
                    const parts = sVal.split('-');
                    if (parts.length < 2) return sVal;
                    const m = parts[1];
                    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const idx = parseInt(m) - 1;
                    return months[idx] || sVal;
                  }}
                />
                <YAxis 
                  stroke="#ffffff20" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fill: '#ffffff40', fontWeight: 900 }}
                  tickFormatter={(val) => `R$${Number(val).toFixed(2)}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Valor"]}
                />
                <Bar dataKey="total_spent" name="Gasto Total" fill="#ccff00" radius={[10, 10, 0, 0]} barSize={25} />
                <Bar dataKey="total_economy" name="Economia" fill="#00e5ff" radius={[10, 10, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
            <p className="text-[10px] font-black uppercase text-white/20">Sem histórico mensal</p>
          </div>
        )}
      </motion.section>

      {/* 3. Distribuição por Combustível e Posto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-surface-container-high p-6 rounded-[2rem] border border-white/5"
        >
          <h3 className="text-sm font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2">
            <PieChartIcon size={14} className="text-primary" />
            Por Combustível
          </h3>
          {hasFuelData ? (
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fuelChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {fuelChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getFuelColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, "Gasto Total"]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-white/20">Sem dados</p>
            </div>
          )}
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-surface-container-high p-6 rounded-[2rem] border border-white/5"
        >
          <h3 className="text-sm font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2">
            <DollarSign size={14} className="text-primary" />
            Top 5 Postos
          </h3>
          <div className="space-y-4">
            {hasStationData ? processedStationSpend.map((station: any, idx: number) => (
              <div key={station.name} className="flex flex-col gap-1">
                <div className="flex justify-between items-end text-[10px] font-black uppercase mb-1">
                  <span className="text-white/60 truncate max-w-[150px]">{station.name}</span>
                  <span className="text-primary">R$ {station.value.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(processedStationSpend[0]?.value > 0) ? (station.value / processedStationSpend[0].value) * 100 : 0}%` }}
                    className="h-full bg-primary rounded-full shadow-[0_0_10px_rgba(204,255,0,0.5)]"
                    transition={{ delay: 0.5 + idx * 0.1, duration: 1 }}
                  />
                </div>
              </div>
            )) : (
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-[10px] font-black uppercase text-white/20">Sem dados</p>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  </div>
  );
}

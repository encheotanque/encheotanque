import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Tag, 
  Fuel, 
  ChevronUp, 
  ChevronDown, 
  RefreshCw, 
  Trophy, 
  AlertTriangle,
  Search,
  MapPin
} from 'lucide-react';

interface RankingItem {
  name: string;
  price: number;
  variation?: number;
  description?: string;
  stationCount?: number;
  brand?: string;
  neighborhood?: string;
  distance?: string;
  isBestPrice?: boolean;
  isMostExpensive?: boolean;
}

interface RankingsData {
  neighborhoods: any[];
  brands: any[];
  stations: any[];
  cityAverage: number;
}

interface RankingsViewProps {
  fuelTypes: { id_produto: number; nm_produto?: string; ds_produto?: string; friendlyName?: string }[];
  initialCity?: string;
}

export const RankingsView: React.FC<RankingsViewProps> = ({ fuelTypes, initialCity }) => {
  const [activeTab, setActiveTab] = useState<'bairros' | 'bandeiras' | 'postos'>('bairros');
  const [selectedFuel, setSelectedFuel] = useState<number>(fuelTypes[0]?.id_produto || 1);
  const [selectedCity, setSelectedCity] = useState<string>(initialCity || 'Petrópolis');
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RankingsData>({
    neighborhoods: [],
    brands: [],
    stations: [],
    cityAverage: 0
  });

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities');
      const result = await response.json();
      setCities(result);
    } catch (error) {
      console.error("Error fetching cities:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rankings?id_combustivel=${selectedFuel}&municipio=${encodeURIComponent(selectedCity)}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setTimeout(() => setLoading(false), 500); // Smooth transition
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
    if (selectedFuel && selectedCity) {
      fetchData();
    }
  }, [selectedFuel, selectedCity]);

  useEffect(() => {
    if (!selectedFuel && fuelTypes.length > 0) {
      setSelectedFuel(fuelTypes[0].id_produto);
    }
  }, [fuelTypes]);

  const getTopItems = (type: 'bairros' | 'bandeiras' | 'postos', direction: 'caros' | 'baratos') => {
    let items: any[] = [];
    if (type === 'bairros') {
      items = [...data.neighborhoods].sort((a, b) => b.averagePrice - a.averagePrice);
    } else if (type === 'bandeiras') {
      items = [...data.brands].sort((a, b) => b.averagePrice - a.averagePrice);
    } else {
      items = [...data.stations].sort((a, b) => b.price - a.price);
    }

    if (direction === 'baratos') {
      items = items.reverse();
    }

    return items.slice(0, 3);
  };

  const formatPrice = (p: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(p);

  const formatVariation = (v: number) => {
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return 'text-[#ccff00] border-[#ccff00]'; // Ouro / Verde Neon
    if (index === 1) return 'text-[#C0C0C0] border-[#C0C0C0]'; // Prata
    if (index === 2) return 'text-[#CD7F32] border-[#CD7F32]'; // Bronze
    return 'text-white/40 border-white/10';
  };

  const renderRankingList = (items: any[], title: string, colorClass: string) => {
    return (
      <div className="flex-1 min-w-[320px] bg-white/5 rounded-3xl p-4 border border-white/10 backdrop-blur-md">
        <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${colorClass}`}>
          <div className={`w-2 h-2 rounded-full ${colorClass.includes('red') ? 'bg-red-500' : 'bg-green-500'} shadow-[0_0_10px_rgba(255,0,0,0.5)]`} />
          {title}
        </h3>
        
        <div className="space-y-3">
          {items.map((item, index) => {
            const isTop3 = index < 3;
            // Handle different object shapes based on tab
            const name = item.name || item.nm_posto;
            const price = item.averagePrice || item.price;
            const variation = item.variation;
            const subtext = item.stationCount ? `${item.stationCount} postos` : item.neighborhood;

            return (
              <motion.div
                key={`${title}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`group relative flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                  isTop3 ? 'bg-white/10 border-white/20' : 'bg-transparent border-white/5'
                }`}
              >
                {/* Position Indicator */}
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${getRankColor(index)}`}>
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-white truncate text-sm md:text-base">{name}</h4>
                    <span className="font-bold text-lg md:text-xl text-white tracking-tight">
                      {formatPrice(price).replace('R$', '')}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                      {activeTab === 'bandeiras' && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center text-[10px] text-white/60 border border-white/10">
                            {name.charAt(0)}
                          </div>
                          {subtext}
                        </div>
                      )}
                      {activeTab !== 'bandeiras' && subtext}
                    </span>
                    
                    {variation !== undefined && (
                      <div className={`flex items-center gap-0.5 text-[10px] font-bold ${variation > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {variation > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                        {formatVariation(Math.abs(variation))}
                      </div>
                    )}

                    {activeTab === 'postos' && (
                      <div className="flex items-center gap-2">
                         {index === 0 && title.includes('Baratos') && (
                           <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 font-bold">
                             🏆 Melhor preço
                           </span>
                         )}
                         {index === 0 && title.includes('Caros') && (
                           <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 font-bold">
                             ⚠️ Mais caro
                           </span>
                         )}
                      </div>
                    )}
                  </div>

                  {/* Heat Bar for Bairros */}
                  {activeTab === 'bairros' && (
                    <div className="relative mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`absolute inset-y-0 left-0 transition-all duration-1000 ${variation > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(100, Math.max(10, 50 + (variation * 100)))}%` }}
                      />
                      {/* Municipal Average Line */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px border-l border-dashed border-white/60" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full pb-10">
      {/* Header */}
      <header className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <Trophy className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Ranking de Preços</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="relative group">
                  <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 hover:bg-white/10 transition-colors">
                    <MapPin size={10} className="text-primary/60" />
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="bg-transparent text-white/80 text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer appearance-none pr-3"
                    >
                      {!cities.includes(selectedCity) && selectedCity !== 'Desconhecido' && (
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
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Atualizado</p>
              </div>
            </div>
          </div>
          <button 
            onClick={fetchData}
            disabled={loading}
            className={`p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={20} className="text-[#CCFF00]" />
          </button>
        </div>
      </header>

      {/* Global Filters */}
      <div className="px-6 mb-6">
        <div className="bg-white/5 p-1.5 rounded-2xl flex gap-1 border border-white/10 no-scrollbar overflow-x-auto">
          {fuelTypes.map((fuel) => (
            <button
              key={fuel.id_produto}
              onClick={() => setSelectedFuel(fuel.id_produto)}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedFuel === fuel.id_produto
                  ? 'bg-[#CCFF00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)]'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {fuel.friendlyName || fuel.nm_produto || fuel.ds_produto}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-8">
        <div className="flex border-b border-white/10">
          {(['bairros', 'bandeiras', 'postos'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-4 relative group transition-all`}
            >
              <div className={`p-2 rounded-xl transition-all ${activeTab === tab ? 'bg-[#CCFF00]/10 text-[#CCFF00]' : 'text-white/40 group-hover:text-white/60'}`}>
                {tab === 'bairros' && <Building2 size={18} />}
                {tab === 'bandeiras' && <Tag size={18} />}
                {tab === 'postos' && <Fuel size={18} />}
              </div>
              <span className={`text-sm font-bold uppercase tracking-widest ${activeTab === tab ? 'text-white' : 'text-white/40'}`}>
                {tab}
              </span>
              {activeTab === tab && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-[#CCFF00]" 
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 no-scrollbar pb-10">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-64 flex flex-col items-center justify-center gap-4"
            >
              <div className="w-12 h-12 border-4 border-[#CCFF00]/20 border-t-[#CCFF00] rounded-full animate-spin" />
              <p className="text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">
                Processando dados de {data.neighborhoods.length || '...'} bairros
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col lg:flex-row gap-6 pb-20"
            >
              {renderRankingList(getTopItems(activeTab, 'baratos'), '🟢 Mais Baratos', 'text-green-400')}
              {renderRankingList(getTopItems(activeTab, 'caros'), '🔴 Mais Caros', 'text-red-400')}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Insight Area (Optional/Polished Accent) */}
      {!loading && data.cityAverage > 0 && (
        <div className="fixed bottom-24 left-6 right-6 lg:bottom-12 lg:left-auto lg:right-12 lg:w-96 z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center justify-between"
          >
            <div>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Média Municipal</p>
              <h4 className="text-xl font-bold text-[#CCFF00] tracking-tight">
                {formatPrice(data.cityAverage)}
              </h4>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Melhor Oportunidade</p>
              <p className="text-white font-bold text-xs">
                Economia de até <span className="text-green-400">R$ 0,45/L</span>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

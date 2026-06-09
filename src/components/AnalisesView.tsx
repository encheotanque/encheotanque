import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Trophy,
  ChartBarIcon,
  Map,
} from 'lucide-react';
import { InsightsView } from './InsightsView';
import { RankingsView } from './RankingsView';
import { CoverageMapView } from './CoverageMapView';

interface AnalisesViewProps {
  fuelTypes: { id_produto: number; nm_produto?: string; ds_produto?: string; friendlyName?: string }[];
  initialCity?: string;
  selectedVehicle?: any;
}

export const AnalisesView: React.FC<AnalisesViewProps> = ({ fuelTypes, initialCity, selectedVehicle }) => {
  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'rankings' | 'mapa'>('insights');

  return (
    <div className="flex flex-col h-full bg-background font-sans">
      {/* Sub-navigation Tabs */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveSubTab('insights')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeSubTab === 'insights'
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'text-white/40 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <TrendingUp size={16} />
            <span>Métricas</span>
          </button>
          <button
            onClick={() => setActiveSubTab('rankings')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeSubTab === 'rankings'
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'text-white/40 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <Trophy size={16} />
            <span>Rankings</span>
          </button>
          <button
            onClick={() => setActiveSubTab('mapa')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
              activeSubTab === 'mapa'
                ? 'bg-primary text-black shadow-lg shadow-primary/20'
                : 'text-white/40 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <Map size={16} />
            <span>Mapa</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeSubTab === 'insights' ? (
            <motion.div
              key="insights"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full overflow-y-auto no-scrollbar"
            >
              <InsightsView initialCity={initialCity} selectedVehicle={selectedVehicle} />
            </motion.div>
          ) : activeSubTab === 'rankings' ? (
            <motion.div
              key="rankings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full overflow-y-auto no-scrollbar"
            >
              <RankingsView fuelTypes={fuelTypes} initialCity={initialCity} />
            </motion.div>
          ) : (
            <motion.div
              key="mapa"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full overflow-y-auto no-scrollbar"
            >
              <CoverageMapView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Map, 
  TrendingUp, 
  Compass, 
  ShieldCheck, 
  Activity, 
  Building2, 
  CheckCircle, 
  Info, 
  ChevronRight, 
  Award,
  Vote,
  TrendingDown,
  Loader2
} from 'lucide-react';
import Swal from 'sweetalert2';

interface StatePath {
  id: string;
  title: string;
  d: string;
}

interface StateData {
  id: string;
  name: string;
  uf: string;
  status: 'active' | 'expansion' | 'planned';
  cities: string[];
  totalStations: number;
  integratedStations: number;
  avgPrice: string;
  economyPercentage: string;
  votes?: number;
}

const INITIAL_STATES_INFO: Record<string, StateData> = {
  'BR-RJ': {
    id: 'BR-RJ',
    name: 'Rio de Janeiro',
    uf: 'RJ',
    status: 'active',
    cities: ['Petrópolis', 'Rio de Janeiro', 'Niterói'],
    totalStations: 206,
    integratedStations: 147,
    avgPrice: 'R$ 5,84',
    economyPercentage: '14%'
  },
  'BR-MG': {
    id: 'BR-MG',
    name: 'Minas Gerais',
    uf: 'MG',
    status: 'active',
    cities: ['Juiz de Fora'],
    totalStations: 84,
    integratedStations: 84,
    avgPrice: 'R$ 5,72',
    economyPercentage: '11%'
  },
  'BR-SP': {
    id: 'BR-SP',
    name: 'São Paulo',
    uf: 'SP',
    status: 'expansion',
    cities: ['Campinas (Fase II)', 'São José dos Campos (Fase II)'],
    totalStations: 42,
    integratedStations: 0,
    avgPrice: '---',
    economyPercentage: '---'
  },
  'BR-ES': {
    id: 'BR-ES',
    name: 'Espírito Santo',
    uf: 'ES',
    status: 'expansion',
    cities: ['Vitória (Fase II)'],
    totalStations: 18,
    integratedStations: 0,
    avgPrice: '---',
    economyPercentage: '---'
  }
};

export function CoverageMapView() {
  const [paths, setPaths] = useState<StatePath[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedStateId, setSelectedStateId] = useState<string>('BR-RJ');
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
  
  // Local state for expansion votes
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('enche_tanque_map_votes');
    return saved ? JSON.parse(saved) : {
      'BR-SP': 412,
      'BR-ES': 184,
      'BR-DF': 98,
      'BR-SC': 76,
      'BR-PR': 114,
      'BR-RS': 142,
      'BR-BA': 213,
      'BR-PE': 129,
      'BR-CE': 111,
      'BR-GO': 85
    };
  });

  const [votedStates, setVotedStates] = useState<string[]>(() => {
    const saved = localStorage.getItem('enche_tanque_user_votes');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch and parse the brazil.svg file dynamically
  useEffect(() => {
    setLoading(true);
    fetch('/documentos/brazil.svg')
      .then(response => {
        if (!response.ok) {
          throw new Error('Não foi possível carregar o mapa do Brasil.');
        }
        return response.text();
      })
      .then(svgText => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, "image/svg+xml");
          const pathElements = doc.querySelectorAll("path");
          
          if (pathElements.length === 0) {
            throw new Error('Nenhum caminho de estado encontrado no SVG.');
          }

          const parsedPaths: StatePath[] = Array.from(pathElements).map(path => ({
            id: path.getAttribute("id") || "",
            title: path.getAttribute("title") || "",
            d: path.getAttribute("d") || ""
          }));

          setPaths(parsedPaths);
          setLoading(false);
        } catch (err: any) {
          console.error("Error parsing SVG Map:", err);
          setError("Erro ao ler dados estruturais do mapa de estados.");
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Error loading map of Brazil:", err);
        setError("Não foi possível carregar o mapa base do Brasil (.svg).");
        setLoading(false);
      });
  }, []);

  // Update localStorage when votes change
  const handleVote = (stateId: string, stateName: string) => {
    if (votedStates.includes(stateId)) {
      Swal.fire({
        title: 'Voto já registrado!',
        text: `Você já votou para trazer o Enche o Tanque para o estado de ${stateName}.`,
        icon: 'info',
        confirmButtonColor: '#ccff00',
        background: '#1a1a1a',
        color: '#ffffff'
      });
      return;
    }

    const newVotes = {
      ...votes,
      [stateId]: (votes[stateId] || 0) + 1
    };
    const newVoted = [...votedStates, stateId];

    setVotes(newVotes);
    setVotedStates(newVoted);

    localStorage.setItem('enche_tanque_map_votes', JSON.stringify(newVotes));
    localStorage.setItem('enche_tanque_user_votes', JSON.stringify(newVoted));

    Swal.fire({
      title: 'Voto Computado! 🚀',
      html: `Obrigado! Seu voto para expandir a inteligência tarifária para <b>${stateName}</b> foi registrado com sucesso.`,
      icon: 'success',
      confirmButtonText: 'Sensacional',
      confirmButtonColor: '#ccff00',
      background: '#1a1a1a',
      color: '#ffffff'
    });
  };

  // Compile information for active/expansion/planned state
  const selectedStateData = useMemo<StateData>(() => {
    const defaultData = INITIAL_STATES_INFO[selectedStateId];
    if (defaultData) {
      return {
        ...defaultData,
        votes: votes[selectedStateId] || 0
      };
    }

    // Default state structure for planned states
    const foundPath = paths.find(p => p.id === selectedStateId);
    return {
      id: selectedStateId,
      name: foundPath ? foundPath.title : 'Estado Selecionado',
      uf: selectedStateId.replace('BR-', ''),
      status: 'planned',
      cities: ['Sob consulta populacional'],
      totalStations: 0,
      integratedStations: 0,
      avgPrice: '---',
      economyPercentage: '---',
      votes: votes[selectedStateId] || 0
    };
  }, [selectedStateId, paths, votes]);

  // Overall statistics for summary labels
  const statsSummary = useMemo(() => {
    const activeCount = Object.values(INITIAL_STATES_INFO).filter(s => s.status === 'active').length;
    const expansionCount = Object.values(INITIAL_STATES_INFO).filter(s => s.status === 'expansion').length;
    const totalIntegrated = Object.values(INITIAL_STATES_INFO).reduce((acc, curr) => acc + curr.integratedStations, 0);

    return {
      activeCount,
      expansionCount,
      totalIntegrated
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-white/40 font-black uppercase text-[10px] tracking-widest">Carregando Georadar de Estados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-red-500/10 rounded-3xl border border-red-500/20 m-6 flex flex-col items-center justify-center">
        <Info className="text-red-500 mb-4 animate-pulse" size={40} />
        <p className="text-red-400 font-bold mb-4">{error}</p>
        <p className="text-white/40 text-[10px] uppercase font-black tracking-widest max-w-xs">
          Certifique-se de que o arquivo brazil.svg esteja na sua pasta de documentos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-10">
      {/* Header section with radar stats */}
      <header className="px-6 pt-4 pb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#ccff00]/10 rounded-2xl border border-[#ccff00]/20">
              <Compass className="text-[#ccff00] animate-[spin_20s_linear_infinite]" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Georadar de Atividade</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                Cobertura Nacional & Planejamento Geográfico de Frota
              </p>
            </div>
          </div>

          {/* Quick Counter Badges */}
          <div className="flex flex-wrap gap-2">
            <div className="bg-surface-container/60 border border-white/5 py-1.5 px-3 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#ccff00] animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white">
                {statsSummary.activeCount} Estados Ativos
              </span>
            </div>
            <div className="bg-surface-container/60 border border-white/5 py-1.5 px-3 rounded-xl flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-wider text-white">
                {statsSummary.expansionCount} Em Expansão
              </span>
            </div>
            <div className="bg-surface-container/60 border border-white/5 py-1.5 px-3 rounded-xl flex items-center gap-2">
              <Building2 className="text-primary/60" size={10} />
              <span className="text-[9px] font-black uppercase tracking-wider text-white">
                {statsSummary.totalIntegrated} Postos Integrados
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Interactive Brazil Map Container - Takes 7 Cols */}
        <div className="lg:col-span-7 bg-surface-container-high/40 p-5 rounded-3xl border border-white/5 flex flex-col items-center justify-center relative min-h-[380px] md:min-h-[460px]">
          
          <div className="absolute top-4 left-4 z-10">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/20 py-1 px-2.5 rounded-full">
              Toque nos estados para explorar
            </span>
          </div>

          {/* Render SVG dynamically parsed path values */}
          <div className="w-full h-full max-w-[480px] max-h-[480px] relative mt-4">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 613 639" 
              className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.6)]"
            >
              <g id="states_group">
                {paths.map((path) => {
                  const info = INITIAL_STATES_INFO[path.id];
                  const isActive = info?.status === 'active';
                  const isExpanding = info?.status === 'expansion';
                  const isSelected = selectedStateId === path.id;
                  const isHovered = hoveredStateId === path.id;

                  // Define aesthetic fill/stroke based on state health integration
                  let fill = '#1e1e24'; // default planned
                  let stroke = '#2d2d38';
                  let strokeWidth = '1';
                  let cursor = 'pointer';

                  if (isActive) {
                    fill = isSelected 
                      ? 'rgba(204, 255, 0, 0.25)' 
                      : (isHovered ? 'rgba(204, 255, 0, 0.18)' : 'rgba(204, 255, 0, 0.08)');
                    stroke = '#ccff00';
                    strokeWidth = isSelected ? '2.5' : '1.5';
                  } else if (isExpanding) {
                    fill = isSelected 
                      ? 'rgba(251, 191, 36, 0.25)' 
                      : (isHovered ? 'rgba(251, 191, 36, 0.18)' : 'rgba(251, 191, 36, 0.08)');
                    stroke = '#fbbf24';
                    strokeWidth = isSelected ? '2.2' : '1.2';
                  } else {
                    if (isSelected) {
                      fill = 'rgba(255, 255, 255, 0.15)';
                      stroke = '#ffffff';
                      strokeWidth = '1.8';
                    } else if (isHovered) {
                      fill = 'rgba(255, 255, 255, 0.08)';
                      stroke = 'rgba(255, 255, 255, 0.4)';
                    }
                  }

                  return (
                    <motion.path
                      key={path.id}
                      d={path.d}
                      id={path.id}
                      title={path.title}
                      onClick={() => setSelectedStateId(path.id)}
                      onMouseEnter={() => setHoveredStateId(path.id)}
                      onMouseLeave={() => setHoveredStateId(null)}
                      style={{ cursor }}
                      animate={{
                        fill,
                        stroke,
                        strokeWidth
                      }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="transition-shadow duration-300"
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Dynamic Map Hover Tooltip inside Map Container */}
          <div className="absolute bottom-4 right-4 bg-black/85 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl pointer-events-none min-w-[120px] transition-all">
            <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Apontamento</p>
            <p className="text-xs font-black uppercase text-white mt-0.5">
              {hoveredStateId 
                ? (paths.find(p => p.id === hoveredStateId)?.title || 'Brasil')
                : (paths.find(p => p.id === selectedStateId)?.title || 'Brasil')
              }
            </p>
            <p className="text-[9px] font-bold text-[#ccff00] mt-0.5 uppercase tracking-wide">
              {hoveredStateId 
                ? (INITIAL_STATES_INFO[hoveredStateId]?.status === 'active' ? '● Ativo' : INITIAL_STATES_INFO[hoveredStateId]?.status === 'expansion' ? '▲ Expansão' : '○ Planejado')
                : (INITIAL_STATES_INFO[selectedStateId]?.status === 'active' ? '● Ativo' : INITIAL_STATES_INFO[selectedStateId]?.status === 'expansion' ? '▲ Expansão' : '○ Planejado')
              }
            </p>
          </div>
        </div>

        {/* Selected State Insight Panel - Takes 5 Cols */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedStateId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-surface-container-high p-6 rounded-[2rem] border border-white/5 flex-1 flex flex-col justify-between"
            >
              <div>
                {/* State identity header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 tracking-wider">
                      Estado Federativo
                    </span>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-2 flex items-center gap-2">
                      {selectedStateData.name} 
                      <span className="text-primary font-bold text-lg">({selectedStateData.uf})</span>
                    </h3>
                  </div>

                  {/* Icon badge depending on status */}
                  {selectedStateData.status === 'active' ? (
                    <div className="p-3.5 bg-[#ccff00]/10 border border-[#ccff00]/20 rounded-2xl">
                      <ShieldCheck className="text-[#ccff00] animate-pulse" size={24} />
                    </div>
                  ) : selectedStateData.status === 'expansion' ? (
                    <div className="p-3.5 bg-amber-400/10 border border-amber-400/20 rounded-2xl">
                      <Activity className="text-amber-400 animate-pulse" size={24} />
                    </div>
                  ) : (
                    <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                      <Vote className="text-white/40" size={24} />
                    </div>
                  )}
                </div>

                {/* Main stats counters */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-surface-container/80 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Preço Médio Estimado</p>
                    <p className="text-lg font-black text-white mt-1">
                      {selectedStateData.avgPrice}
                    </p>
                  </div>
                  <div className="bg-surface-container/80 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Economia Média Mapeada</p>
                    <p className="text-lg font-black text-primary mt-1">
                      {selectedStateData.economyPercentage}
                    </p>
                  </div>
                </div>

                {/* Cities Integrated List / Future updates */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/40">
                      Cidades Integradas à Rede
                    </span>
                    <span className="text-[9px] font-bold text-white/80">
                      {selectedStateData.status === 'active' ? `${selectedStateData.cities.length} Cidade(s) Ativa(s)` : '---'}
                    </span>
                  </div>

                  <div className="bg-surface-container/40 p-2.5 rounded-2xl border border-white/5 max-h-[140px] overflow-y-auto no-scrollbar space-y-1.5">
                    {selectedStateData.cities.map((city, idx) => (
                      <div 
                        key={idx}
                        className="bg-surface-container/80 py-2 px-3 rounded-xl border border-outline-variant/10 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={10} className={selectedStateData.status === 'active' ? 'text-primary' : 'text-amber-400'} />
                          <span className="text-[11px] font-black uppercase text-white tracking-wide">{city}</span>
                        </div>
                        {selectedStateData.status === 'active' ? (
                          <span className="text-[9px] font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-0.5 rounded-md">Ativo</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">Planejado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Area (State Vote Expansion or Integrated Dashboard) */}
              <div className="mt-6 pt-4 border-t border-white/5">
                {selectedStateData.status === 'active' ? (
                  <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 flex items-center gap-3">
                    <CheckCircle className="text-primary shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] text-primary font-black uppercase leading-tight">Estado 100% Homologado</p>
                      <p className="text-[9px] text-white/50 font-medium leading-normal mt-0.5">
                        Integração ativa com feeds SEFAZ via leitura automática de QRCodes de Notas Fiscais (NFe/NFCe).
                      </p>
                    </div>
                  </div>
                ) : selectedStateData.status === 'expansion' ? (
                  <div className="p-4 bg-amber-400/5 rounded-2xl border border-amber-400/20 flex items-center gap-3">
                    <Info className="text-amber-400 shrink-0" size={20} />
                    <div>
                      <p className="text-[10px] text-amber-400 font-black uppercase leading-tight">Fase de Homologação de Dados</p>
                      <p className="text-[9px] text-white/50 font-medium leading-normal mt-0.5">
                        Importações da ANP estão ativas. Mapeamento de postos locais em andamento pela equipe de expansão.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-surface-container/60 p-4 rounded-2xl border border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Votos da Comunidade</span>
                        <span className="text-sm font-black text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]">
                          {selectedStateData.votes} Votos
                        </span>
                      </div>
                      
                      {/* Voting progress fill visualizer */}
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                          style={{ width: `${Math.min(100, ((selectedStateData.votes || 0) / 500) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleVote(selectedStateData.id, selectedStateData.name)}
                      className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 border transition-all ${
                        votedStates.includes(selectedStateData.id)
                          ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                          : 'bg-primary hover:bg-[#b0dc00] text-black border-transparent shadow-lg shadow-primary/20 active:scale-[0.98]'
                      }`}
                    >
                      <Vote size={14} />
                      <span>{votedStates.includes(selectedStateData.id) ? 'Voto Registrado ✓' : 'Votar por Expansão'}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

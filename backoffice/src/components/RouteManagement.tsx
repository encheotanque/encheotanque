import React, { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { 
  Route as RouteIcon, 
  Navigation, 
  Calendar, 
  Hash, 
  Fuel, 
  MapPin,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Info
} from 'lucide-react';
import { mockRoutes, mockDrivers, mockVehicles, popularGasStations, LatLng } from '../data/mockData';
import { cn } from '../lib/utils';
import { useOutletContext } from 'react-router-dom';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// --- Map Helper Components ---

function RoutePolylines({ path, color = '#facc15' }: { path: LatLng[], color?: string }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib || !path.length) return;

    if (polylineRef.current) polylineRef.current.setMap(null);

    polylineRef.current = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    polylineRef.current.setMap(map);

    return () => {
      if (polylineRef.current) polylineRef.current.setMap(null);
    };
  }, [map, mapsLib, path, color]);

  return null;
}

function MarkerWithInfo({ position, title, subtitle, icon: Icon, color }: any) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={() => setInfoOpen(true)}
      >
        <div className={cn(
          "flex size-8 items-center justify-center rounded-full border-2 border-white shadow-lg",
          color || "bg-primary"
        )}>
          <Icon className="size-4 text-slate-900" />
        </div>
      </AdvancedMarker>
      {infoOpen && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setInfoOpen(false)}
        >
          <div className="p-1">
            <h3 className="font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export const RouteManagement: React.FC = () => {
  const [showMap, setShowMap] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const { user } = useOutletContext<{ user: any }>();
  const userCompanyId = user?.companyId || 1;
  const filteredRoutes = mockRoutes.filter(route => (route.companyId || 1) === userCompanyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Rotas</h1>
          <p className="text-slate-500">Histórico de viagens, abastecimentos e quilometragem controlada.</p>
        </div>
        <button 
          onClick={() => setShowMap(!showMap)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          {showMap ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          {showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}
        </button>
      </div>

      {/* Integrated Map Area */}
      {showMap && (
        <div className="relative h-[400px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100 mb-8">
          {!hasValidKey ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
               <div className="size-16 bg-white rounded-2xl flex items-center justify-center mb-4 text-slate-300 shadow-sm">
                 <MapPin className="size-8" />
               </div>
               <h3 className="text-lg font-bold text-slate-900">Google Maps API Necessária</h3>
               <p className="text-sm text-slate-500 mt-2 max-w-md">Para visualizar as rotas no mapa, configure sua chave de API nos Segredos do projeto (Settings → Secrets).</p>
            </div>
          ) : (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: -21.5, lng: -44.5 }}
                defaultZoom={6}
                mapId="ROUTE_MANAGEMENT_MAP"
                gestureHandling={'greedy'}
                disableDefaultUI={false}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Show Routes */}
                {filteredRoutes.map((route) => (
                  <React.Fragment key={route.id}>
                    {route.path && (
                      <RoutePolylines 
                        path={route.path} 
                        color={selectedRouteId === route.id ? '#facc15' : selectedRouteId ? '#cbd5e1' : '#facc15'} 
                      />
                    )}
                    
                    {/* Only show markers for selected route OR if no route selected */}
                    {(!selectedRouteId || selectedRouteId === route.id) && route.path && (
                      <>
                        <MarkerWithInfo 
                          position={route.path[0]} 
                          title={`Partida: ${route.startLocation}`} 
                          icon={Navigation}
                          color="bg-slate-900" 
                        />
                        <MarkerWithInfo 
                          position={route.path[route.path.length - 1]} 
                          title={`Destino: ${route.endLocation}`} 
                          icon={MapPin} 
                          color="bg-red-500"
                        />
                        {/* Fuel Stops */}
                        {route.stops.map((stop, i) => (
                          <MarkerWithInfo 
                            key={`${route.id}-stop-${i}`}
                            position={{ lat: stop.lat, lng: stop.lng }}
                            title={stop.gasStation}
                            subtitle={`${stop.city}, ${stop.state} • ${stop.liters}L • R$ ${stop.cost.toFixed(2)}`}
                            icon={Fuel}
                            color="bg-amber-400"
                          />
                        ))}
                      </>
                    )}
                  </React.Fragment>
                ))}

                {/* Popular Gas Stations */}
                {!selectedRouteId && popularGasStations.map(station => (
                  <MarkerWithInfo 
                    key={station.id}
                    position={{ lat: station.lat, lng: station.lng }}
                    title={station.name}
                    subtitle={`Popularidade: ${station.popularity}% • Preço Médio: R$ ${station.averagePrice.toFixed(2)}`}
                    icon={Navigation}
                    color="bg-sky-500"
                  />
                ))}
              </Map>

              {/* Legend overlay */}
              <div className="absolute top-4 left-4 z-10 flex gap-2">
                 <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <div className="size-2 rounded-full bg-slate-900" /> Partida
                 </div>
                 <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <div className="size-2 rounded-full bg-red-500" /> Destino
                 </div>
                 <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-lg text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                    <div className="size-2 rounded-full bg-amber-400" /> Posto
                 </div>
              </div>
            </APIProvider>
          )}

          {/* Quick Stats Overlay */}
          <div className="absolute bottom-4 right-4 z-10">
             <div className="bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-white shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                   <Maximize2 className="size-3 text-primary" />
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Visão Geral</span>
                </div>
                <p className="text-xs font-medium">Monitoramento de {filteredRoutes.length} rotas ativas</p>
             </div>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {filteredRoutes.map((route) => {
          const driver = mockDrivers.find(d => d.id === route.driverId);
          const vehicle = mockVehicles.find(v => v.id === route.vehicleId);
          const isSelected = selectedRouteId === route.id;
          
          return (
            <div 
              key={route.id} 
              onMouseEnter={() => setSelectedRouteId(route.id)}
              onMouseLeave={() => setSelectedRouteId(null)}
              className={cn(
                "overflow-hidden rounded-2xl border transition-all duration-300 bg-white shadow-sm",
                isSelected ? "border-primary ring-1 ring-primary/20 scale-[1.01]" : "border-slate-200"
              )}
            >
              <div className={cn(
                "px-6 py-4 border-b flex items-center justify-between transition-colors",
                isSelected ? "bg-primary/5 border-primary/20" : "bg-slate-50/80 border-slate-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white shadow-sm text-primary">
                    <RouteIcon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{route.startLocation}</span>
                      <Navigation className="size-3 text-slate-400 rotate-90" />
                      <span className="text-sm font-bold text-slate-900">{route.endLocation}</span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="size-3" />
                      {new Date(route.date).toLocaleDateString('pt-BR')} • {driver?.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Litragem Total</p>
                  <p className="text-lg font-mono font-bold text-amber-600">{route.fuelSpent} L</p>
                </div>
              </div>

              <div className="grid divide-y md:grid-cols-3 md:divide-y-0 md:divide-x border-b border-slate-100">
                <div className="p-6">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                    <Hash className="size-3" /> Veículo Utilizado
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <Navigation className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{vehicle?.model}</p>
                      <p className="text-xs font-mono text-slate-500">{vehicle?.plate}</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                    <Navigation className="size-3" /> Distância Percorrida
                  </p>
                  <p className="text-2xl font-mono font-bold text-slate-900">{route.distance} <span className="text-sm font-sans font-normal text-slate-500">km</span></p>
                  <p className="text-xs text-slate-400 mt-1">Estimativa de consumo: {(route.distance / route.fuelSpent).toFixed(2)} km/L</p>
                </div>
                <div className="p-6 bg-amber-50/10">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center gap-2">
                    <Fuel className="size-3" /> Custos de Abastecimento
                  </p>
                  <p className="text-2xl font-mono font-bold text-amber-600">R$ {route.fuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-slate-400 mt-1">{route.stops.length} paradas registradas</p>
                </div>
              </div>

              {/* Stops Details */}
              <div className="p-4 bg-slate-50/20">
                <p className="px-5 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="size-3" /> Detalhamento de Paradas (Postos)
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {route.stops.map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                        <MapPin className="size-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{stop.gasStation}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{stop.city}, {stop.state}</p>
                        <p className="text-[10px] text-amber-600 font-bold mt-0.5">{stop.liters}L • R$ {stop.cost.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

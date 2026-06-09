export interface LatLng {
  lat: number;
  lng: number;
}

export interface MaintenanceRecord {
  date: string;
  purpose: string;
  cost: number;
}

export interface OdometerRecord {
  date: string;
  km: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: string;
  year: number;
  status: 'active' | 'maintenance' | 'idle';
  fuelLevel: number;
  lastFueling: string;
  driver: string;
  consumption: number; // km/L
  odometerKm: number;
  odometerImage?: string;
  currentLocation?: LatLng;
  // Detailed specs
  vehicleImage?: string;
  maintenances?: MaintenanceRecord[];
  daysInUse?: number;
  dailyOdometer?: OdometerRecord[];
  fuelTypes?: string[];
  lastFuelingType?: string;
  observations?: string;
  acquisitionDate?: string;
  depreciationTermMonths?: number;
  companyId?: number;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  cost: number;
  state: string;
  city: string;
  gasStation: string;
  lat?: number;
  lng?: number;
  acceptsFuelCard?: boolean;
  observations?: string;
  companyId?: number;
}

export interface Driver {
  id: string;
  name: string;
  avatar?: string;
  license: string;
  licenseStatus: 'valid' | 'expired' | 'warning';
  licenseExpiry: string;
  status: 'active' | 'off' | 'on-break';
  performance: number; // 0-100
  phone: string;
  email?: string;
  // Detailed info
  hiringDate?: string;
  lastMedicalExam?: string;
  totalRoutes?: number;
  totalKm?: number;
  recentIncidents?: number;
  observations?: string;
  companyId?: number;
}

export const mockDrivers: Driver[] = [
  { 
    id: '1', 
    name: 'João Silva', 
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=facepad&focus=top&q=80&w=256&h=256',
    license: 'Cat AE', 
    licenseStatus: 'valid', 
    licenseExpiry: '2025-12-10', 
    status: 'active', 
    performance: 95, 
    phone: '(11) 98765-4321',
    email: 'joao.silva@fleet.com',
    hiringDate: '2020-05-15',
    lastMedicalExam: '2024-01-10',
    totalRoutes: 1450,
    totalKm: 125400,
    recentIncidents: 0,
    observations: 'Motorista exemplar, mantém o veículo sempre limpo e reporta manutenções preventivas.',
    companyId: 1,
  },
  { 
    id: '2', 
    name: 'Maria Santos', 
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facepad&focus=top&q=80&w=256&h=256',
    license: 'Cat E', 
    licenseStatus: 'warning', 
    licenseExpiry: '2024-06-15', 
    status: 'active', 
    performance: 88, 
    phone: '(11) 98765-4322',
    email: 'maria.santos@fleet.com',
    hiringDate: '2021-08-22',
    lastMedicalExam: '2023-11-15',
    totalRoutes: 820,
    totalKm: 78500,
    recentIncidents: 1,
    observations: 'Boa conduta, mas precisa melhorar o consumo médio em rotas de serra.',
    companyId: 2,
  },
  { 
    id: '3', 
    name: 'Carlos Oliveira', 
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=facepad&focus=top&q=80&w=256&h=256',
    license: 'Cat AD', 
    licenseStatus: 'valid', 
    licenseExpiry: '2026-01-20', 
    status: 'on-break', 
    performance: 72, 
    phone: '(11) 98765-4323',
    email: 'carlos.oliveira@fleet.com',
    hiringDate: '2019-11-30',
    lastMedicalExam: '2023-01-05',
    totalRoutes: 2100,
    totalKm: 280000,
    recentIncidents: 2,
    observations: 'Afastado temporariamente para regularização de exames complementares.',
    companyId: 1,
  },
  { 
    id: '4', 
    name: 'Ana Costa', 
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facepad&focus=top&q=80&w=256&h=256',
    license: 'Cat E', 
    licenseStatus: 'expired', 
    licenseExpiry: '2024-02-10', 
    status: 'off', 
    performance: 91, 
    phone: '(11) 98765-4324',
    email: 'ana.costa@fleet.com',
    hiringDate: '2022-03-10',
    lastMedicalExam: '2023-09-20',
    totalRoutes: 340,
    totalKm: 42000,
    recentIncidents: 0,
    observations: 'Motorista nova na frota, demonstrando alto comprometimento com prazos.',
    companyId: 3,
  },
];

export interface Route {
  id: string;
  driverId: string;
  vehicleId: string;
  startLocation: string;
  endLocation: string;
  date: string;
  distance: number;
  fuelSpent: number;
  fuelCost: number;
  stops: RouteStop[];
  path?: LatLng[];
  companyId?: number;
}

export interface RouteStop {
  state: string;
  city: string;
  gasStation: string;
  liters: number;
  cost: number;
  lat: number;
  lng: number;
}

export interface GasStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  popularity: number;
  averagePrice: number;
}

export const mockRoutes: Route[] = [
  {
    id: 'r1',
    driverId: '1',
    vehicleId: '1',
    startLocation: 'São Paulo, SP',
    endLocation: 'Rio de Janeiro, RJ',
    date: '2024-03-15',
    distance: 430,
    fuelSpent: 153.5,
    fuelCost: 844.25,
    companyId: 1,
    path: [
      { lat: -23.5505, lng: -46.6333 },
      { lat: -23.2237, lng: -45.9009 },
      { lat: -22.9068, lng: -43.1729 },
    ],
    stops: [
      { state: 'SP', city: 'Roseira', gasStation: 'Posto Graal', liters: 80, cost: 440, lat: -22.8988, lng: -45.3051 },
      { state: 'RJ', city: 'Resende', gasStation: 'Posto Arco-Íris', liters: 73.5, cost: 404.25, lat: -22.4709, lng: -44.4514 },
    ]
  },
  {
    id: 'r2',
    driverId: '2',
    vehicleId: '2',
    startLocation: 'Belo Horizonte, MG',
    endLocation: 'Vitória, ES',
    date: '2024-03-16',
    distance: 520,
    fuelSpent: 167.7,
    fuelCost: 922.35,
    companyId: 2,
    path: [
      { lat: -19.9167, lng: -43.9345 },
      { lat: -20.1953, lng: -40.2458 },
      { lat: -20.3155, lng: -40.3128 },
    ],
    stops: [
      { state: 'MG', city: 'Ibatiba', gasStation: 'Posto Tigrão', liters: 100, cost: 550, lat: -20.2333, lng: -41.5167 },
      { state: 'ES', city: 'Cariacica', gasStation: 'Sete Estrelas', liters: 67.7, cost: 372.35, lat: -20.3371, lng: -40.3831 },
    ]
  }
];

export const popularGasStations: GasStation[] = [
  { id: 'gs1', name: 'Posto Ipiranga Central', lat: -23.5615, lng: -46.6553, popularity: 92, averagePrice: 5.45 },
  { id: 'gs2', name: 'Shell Premium Express', lat: -22.9714, lng: -43.1825, popularity: 88, averagePrice: 5.60 },
  { id: 'gs3', name: 'Petrobras Conveniência', lat: -19.9245, lng: -43.9456, popularity: 85, averagePrice: 5.38 },
];

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  category: 'price' | 'regulation' | 'market';
  source: string;
  url: string;
}

export const mockNews: NewsItem[] = [
  {
    id: 'n1',
    title: 'ANP anuncia novos preços de referência para combustíveis',
    summary: 'A Agência Nacional do Petróleo (ANP) publicou hoje no Diário Oficial a atualização dos preços médios ponderados ao consumidor final.',
    date: '2024-03-20T10:00:00Z',
    category: 'regulation',
    source: 'ANP Portal',
    url: '#'
  },
  {
    id: 'n2',
    title: 'Preço médio da gasolina cai pela 2ª semana consecutiva',
    summary: 'Levantamento realizado em postos de todo o país indica uma leve queda no preço médio do litro da gasolina comum.',
    date: '2024-03-18T14:30:00Z',
    category: 'price',
    source: 'Folha de SP',
    url: '#'
  },
  {
    id: 'n3',
    title: 'Nova regulamentação para transporte de cargas perigosas entra em vigor',
    summary: 'As novas regras visam aumentar a segurança nas rodovias e exigem novas certificações para motoristas e veículos.',
    date: '2024-03-15T09:15:00Z',
    category: 'market',
    source: 'G1 Economia',
    url: '#'
  }
];

export const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plate: 'ABC-1234',
    model: 'Volvo FH 540',
    year: 2023,
    status: 'active',
    fuelLevel: 82,
    lastFueling: '2024-03-15T10:30:00Z',
    driver: 'João Silva',
    consumption: 2.8,
    odometerKm: 154200,
    odometerImage: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=400',
    vehicleImage: 'https://images.unsplash.com/photo-1586191128578-297457ef6acc?auto=format&fit=crop&q=80&w=800',
    maintenances: [
      { date: '2024-01-10', purpose: 'Troca de Óleo e Filtros', cost: 1200 },
      { date: '2023-11-15', purpose: 'Revisão de Freios', cost: 2500 }
    ],
    daysInUse: 450,
    dailyOdometer: [
      { date: '2024-03-15', km: 154200 },
      { date: '2024-03-14', km: 153800 },
      { date: '2024-03-13', km: 153350 }
    ],
    fuelTypes: ['Diesel S10', 'Diesel S500'],
    lastFuelingType: 'Diesel S10',
    observations: 'Veículo em excelentes condições. Motorista reporta boa estabilidade.',
    acquisitionDate: '2023-01-01',
    depreciationTermMonths: 60,
    companyId: 1,
  },
  {
    id: '2',
    plate: 'XYZ-5678',
    model: 'Scania R 450',
    year: 2022,
    status: 'active',
    fuelLevel: 45,
    lastFueling: '2024-03-16T08:15:00Z',
    driver: 'Maria Santos',
    consumption: 3.1,
    odometerKm: 89300,
    odometerImage: 'https://images.unsplash.com/photo-1562141989-c301f7f2b189?auto=format&fit=crop&q=80&w=400',
    vehicleImage: 'https://images.unsplash.com/photo-1591768793355-74d74b260bb4?auto=format&fit=crop&q=80&w=800',
    maintenances: [
      { date: '2024-02-05', purpose: 'Alinhamento e Balanceamento', cost: 800 }
    ],
    daysInUse: 620,
    dailyOdometer: [
      { date: '2024-03-16', km: 89300 },
      { date: '2024-03-15', km: 88900 }
    ],
    fuelTypes: ['Diesel S10'],
    lastFuelingType: 'Diesel S10',
    observations: 'Necessário verificar ruído na suspensão dianteira em breve.',
    acquisitionDate: '2022-05-15',
    depreciationTermMonths: 60,
    companyId: 2,
  },
  {
    id: '3',
    plate: 'DEF-9012',
    model: 'Mercedes-Benz Actros',
    year: 2021,
    status: 'maintenance',
    fuelLevel: 10,
    lastFueling: '2024-03-10T14:45:00Z',
    driver: 'Carlos Oliveira',
    consumption: 2.5,
    odometerKm: 210500,
    odometerImage: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&q=80&w=400',
    vehicleImage: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=800',
    maintenances: [
      { date: '2024-03-10', purpose: 'Retífica de Motor', cost: 15000 }
    ],
    daysInUse: 1050,
    dailyOdometer: [
      { date: '2024-03-10', km: 210500 },
      { date: '2024-03-09', km: 210100 }
    ],
    fuelTypes: ['Diesel S10', 'Diesel S500'],
    lastFuelingType: 'Diesel S500',
    observations: 'Veículo em manutenção pesada. Previsão de retorno em 5 dias.',
    acquisitionDate: '2021-02-10',
    depreciationTermMonths: 72,
    companyId: 1,
  },
  {
    id: '4',
    plate: 'GHI-3456',
    model: 'Volkswagen Constellation',
    year: 2024,
    status: 'idle',
    fuelLevel: 95,
    lastFueling: '2024-03-17T09:00:00Z',
    driver: 'Ana Costa',
    consumption: 3.5,
    odometerKm: 12500,
    odometerImage: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400',
    vehicleImage: 'https://images.unsplash.com/photo-1501700493717-9c98a0ea491f?auto=format&fit=crop&q=80&w=800',
    maintenances: [],
    daysInUse: 60,
    dailyOdometer: [
      { date: '2024-03-17', km: 12500 }
    ],
    fuelTypes: ['Diesel S10'],
    lastFuelingType: 'Diesel S10',
    observations: 'Veículo novo, operando conforme esperado.',
    acquisitionDate: '2024-01-20',
    depreciationTermMonths: 84,
    companyId: 3,
  },
];

export const mockFuelLogs: FuelLog[] = [
  { id: '101', vehicleId: '1', date: '2024-03-15', liters: 450, cost: 2475.00, state: 'SP', city: 'São Paulo', gasStation: 'Posto Estrela', acceptsFuelCard: true, companyId: 1 },
  { id: '102', vehicleId: '2', date: '2024-03-16', liters: 380, cost: 2090.00, state: 'RJ', city: 'Rio de Janeiro', gasStation: 'Auto Posto Via', acceptsFuelCard: false, observations: 'Aceita apenas dinheiro ou PIX para frotas.', companyId: 2 },
  { id: '103', vehicleId: '1', date: '2024-03-12', liters: 400, cost: 2200.00, state: 'MG', city: 'Belo Horizonte', gasStation: 'Shell Trans', acceptsFuelCard: true, companyId: 1 },
];

export const consumptionChartData = [
  { name: 'Seg', cons: 2.8 },
  { name: 'Ter', cons: 3.1 },
  { name: 'Qua', cons: 2.9 },
  { name: 'Qui', cons: 3.2 },
  { name: 'Sex', cons: 3.0 },
  { name: 'Sáb', cons: 2.7 },
  { name: 'Dom', cons: 2.8 },
];

export type RoomType = 'salon' | 'kuchnia' | 'lazienka' | 'sypialnia' | 'przedpokoj' | 'balkon';

export interface RoomOpening {
  id: string;
  type: 'window' | 'door';
  name: string;
  width: number; // in meters
  height: number;
}

export interface RoomFurniture {
  id: string;
  name: string;
  x: number; // grid coordinates (percentage 0-100)
  y: number;
  width: number;
  height: number;
  rotation: number;
  iconType: string;
  model3DUrl?: string; // Optional 3D model URL or identifier (e.g. #sofa, #table, #bed, #cabinet, #shelf, or external url)
  color?: string; // Optional custom color for the 3D mesh
}

export interface RoomOutlet {
  id: string;
  type: 'socket' | 'light_switch' | 'water_in' | 'water_out' | 'hvac';
  label: string;
  x: number;
  y: number;
}

export interface RoomDetectedEntity {
  id: string;
  name: string;
  category: 'wall' | 'floor' | 'ceiling' | 'window' | 'door' | 'furniture' | 'installation';
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number }; // percentages
  details: string;
}

export interface RoomDesignPreset {
  style?: string;
  floorType: string;
  floorColor: string;
  floorTexture?: 'herringbone' | 'plank' | 'tiles' | 'marble' | 'microcement' | 'terrazzo' | 'hexagonal';
  floorRoughness?: number; // 0.1 to 0.95
  floorScale?: number; // repetition scale
  wallType: string;
  wallColor: string;
  wallTexture?: 'matte' | 'brick' | 'slats' | 'concrete_panels' | 'subway_tiles' | 'marble' | 'stucco';
  wallRoughness?: number;
  wallScale?: number;
  tileType?: string;
  tileColor?: string;
  ceilingColor: string;
  accentWallColor?: string;
  lightingTempK: number; // 2700 (warm), 4000 (neutral), 6000 (cool)
}

export interface RoomWorkStage {
  id: string;
  name: string;
  category: StageCategory;
  completed: boolean;
  status: StageStatus;
  completedAt?: string;
  notes?: string;
  order: number;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  width: number; // meters
  length: number; // meters
  height: number; // meters
  area: number; // calculated m2
  wallArea: number; // calculated m2 (minus openings)
  perimeter: number; // meters
  openings: RoomOpening[];
  furniture: RoomFurniture[];
  outlets: RoomOutlet[];
  design: RoomDesignPreset;
  photoUrl: string;
  detectedEntities?: RoomDetectedEntity[];
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  notes: string;
  workStages?: RoomWorkStage[];
  isCompleted?: boolean;
}

export type StageCategory = 
  | 'demolition' 
  | 'installation' 
  | 'masonry' 
  | 'insulation' 
  | 'finishing' 
  | 'flooring' 
  | 'carpentry' 
  | 'cleanup';

export type StageStatus = 'planned' | 'in_progress' | 'waiting_cure' | 'done';

export interface RenovationStage {
  id: string;
  name: string;
  category: StageCategory;
  roomId?: string;
  status: StageStatus;
  progressPercent: number; // 0 - 100
  startDate: string;
  endDate: string;
  isDiy: boolean;
  contractorCostEstimate: number; // PLN
  diyCostEstimate: number; // PLN
  curingTimeHours?: number;
  curingHoursRemaining?: number;
  requiredTools: string[];
  safetyGear: string[];
  tasks: { id: string; title: string; completed: boolean }[];
  description: string;
}

export interface MaterialCalculation {
  id: string;
  roomId: string;
  name: string;
  category: 'podłogi' | 'ściany' | 'chemia_budowlana' | 'płytki' | 'elektryka' | 'hydraulika' | 'stolarka';
  formulaExplanation: string;
  baseQuantity: number;
  wasteMarginPercent: number; // e.g. 10%
  finalQuantity: number;
  unit: 'm²' | 'l' | 'kg' | 'mb' | 'szt.' | 'opak.';
  estimatedUnitPrice: number; // PLN
  totalPrice: number;
  purchased: boolean;
  storeUrl?: string;
  brandProduct?: string;
  storeName?: string;
  packageSize?: number;
  packagesCount?: number;
  priority?: 'must_have' | 'standard' | 'optional';
}

export type ExpenseCategory = 
  | 'Materiały budowlane' 
  | 'Robocizna / Ekipa' 
  | 'Narzędzia i sprzęt' 
  | 'Wykończenie i dekoracje' 
  | 'Transport i wniesienie' 
  | 'Wywóz gruzu i utylizacja' 
  | 'Projekt i formalności';

export interface Expense {
  id: string;
  title: string;
  amount: number; // in PLN
  date: string;
  category: ExpenseCategory;
  roomId?: string;
  paid: boolean;
  paymentMethod: 'Karta / Przelew' | 'Gotówka' | 'BLIK' | 'Faktura terminowa';
  receiptNote?: string;
  receiptPhotoId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'schedule' | 'cure_time' | 'budget' | 'material' | 'qa';
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  stageId?: string;
}

export interface QAChecklistItem {
  id: string;
  roomId?: string;
  stageCategory: StageCategory;
  title: string;
  standardNorm: string; // e.g. "PN-B-10110:2005"
  severity: 'critical' | 'important' | 'recommended';
  status: 'passed' | 'failed' | 'pending';
  measuredValue?: string;
  toleranceGuide: string;
  inspectionTips: string;
}

export type RenovationPipelineStep =
  | 'measure'
  | 'design'
  | 'cost'
  | 'plan'
  | 'progress'
  | 'qa';

export interface WorkLogEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  roomId?: string;
  stageCategory?: StageCategory;
  photoId?: string; // photo stored in IndexedDB
  author?: string;
  createdAt: string;
}

export type ContractorTrade = 
  | 'general'
  | 'electrician'
  | 'plumber'
  | 'tiler'
  | 'painter'
  | 'carpenter'
  | 'plasterer'
  | 'hvac'
  | 'doors_floors';

export type ContractorStatus = 
  | 'contact'
  | 'quote_received'
  | 'contract_signed'
  | 'in_progress'
  | 'completed';

export interface ContractorPayment {
  id: string;
  date: string;
  amount: number; // PLN
  type: 'advance' | 'stage_settlement' | 'final';
  note: string;
  receiptPhotoId?: string;
  linkedExpenseId?: string;
}

export interface Contractor {
  id: string;
  name: string;
  companyName?: string;
  nip?: string;
  phone: string;
  email?: string;
  trade: ContractorTrade;
  agreedTotalCost: number; // PLN
  status: ContractorStatus;
  scopeNotes: string;
  startDate?: string;
  endDate?: string;
  payments: ContractorPayment[];
  rating?: number; // 1 - 5
}

export interface RenovationProject {
  id: string;
  title: string;
  address: string;
  totalPlannedBudget: number; // PLN
  contingencyReservePercent: number; // usually 15-20%
  startDate: string;
  targetEndDate: string;
  rooms: Room[];
  selectedRoomId: string;
  stages: RenovationStage[];
  materials: MaterialCalculation[];
  expenses: Expense[];
  workLogs?: WorkLogEntry[];
  contractors?: Contractor[];
  notifications: NotificationItem[];
  qaChecklist: QAChecklistItem[];
  activeStep: RenovationPipelineStep;
  isOfflineMode: boolean;
  lastSyncedAt?: string;
}

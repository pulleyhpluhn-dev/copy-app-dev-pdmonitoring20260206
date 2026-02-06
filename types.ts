
export enum AlarmLevel {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  DANGER = 'DANGER',
  CRITICAL = 'CRITICAL',
  NO_DATA = 'NO_DATA',
}

export type ViewMode = 'dashboard' | 'diagnosis' | 'config' | 'export' | 'settings' | 'diagnosis-detail';

export interface Project {
  id: string;
  name: string;
  type: string;
  description: string;
  createdAt: string;
}

export interface IPC {
  id: string;
  sn: string;
  name: string;
  description: string;
  ip: string;
}

export interface ConfigDevice {
  id: string;
  projectId: string;
  name: string;
  deviceType: string; // "开关柜", "箱变", "油变", "GIS组合开关", "配网电缆", "高架电缆"
  description: string;
  image?: string; // Base64 local image
}

export interface SensorChannel {
  type: string;
  location: string;
}

export interface ConfigSensor {
  id: string;
  projectId: string;
  deviceId: string;
  ipcId: string;
  sn: string;
  name: string;
  type: string; // 传感型号
  channels: SensorChannel[]; // Updated: Supports multiple channels
  description: string;
  status?: 'Normal' | 'Abnormal' | 'Unknown';
}

export interface DeviceSummary {
  id: string;
  projectId: string; // Added for filtering
  name: string;
  station: string;
  status: AlarmLevel;
  lastUpdated: string;
  uhf_amp: number;
  uhf_freq: number;
  tev_amp: number;
  tev_freq: number;
  hfct_amp: number;
  hfct_freq: number;
  ae_amp: number;
  ae_freq: number;
  temp: number;
  humidity: number;
  trend: number[]; 
  customImage?: string;
}

export interface PDSource {
  position3d: [number, number, number];
  locationName: string;
  intensity: number;
}

export interface SensorData {
  id: string;
  name: string;
  sn: string;
  type: 'UHF' | 'TEV' | 'HFCT' | 'AE' | string;
  location: string;
  status: AlarmLevel;
  value: number;
  unit: string;
  freqValue: number;
  freqUnit: string;
  timestamp: string;
  x: number;
  y: number;
  position3d: [number, number, number];
  faceOrientation?: string;
  isOnline: boolean; // New field for connectivity status
}

export interface ChartDataPoint {
  time: string;
  uhf_amp: number;
  tev_amp: number;
  hfct_amp: number;
  ae_amp: number;
  uhf_freq: number;
  tev_freq: number;
  hfct_freq: number;
  ae_freq: number;
  temperature: number;
  humidity: number;
  isAlarm: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  image?: {
    data: string;
    mimeType: string;
    preview: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string; // ISO string
  messages: ChatMessage[];
}

export interface PrdMarker {
  id: string;
  contextId: string; // ViewMode (e.g. 'dashboard', 'diagnosis')
  x: number; // Percentage relative to window width
  y: number; // Percentage relative to window height
  title: string;
  userStory: string;
  acceptanceCriteria: string;
  priority: 'High' | 'Medium' | 'Low';
}

export type Theme = 'light' | 'dark';
export type AIMode = 'collapsed' | 'normal' | 'expanded';

// --- System Settings Types ---

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer';

export interface UserPermission {
  key: string;
  label: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  email?: string;
  phone?: string;
  permissions: string[]; // List of ViewModes allowed: 'dashboard', 'diagnosis', etc.
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
}

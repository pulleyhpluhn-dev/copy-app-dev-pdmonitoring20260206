
import { AlarmLevel, SensorData, ChartDataPoint, DeviceSummary, PDSource, Project } from './types';

// Helper to get a recent timestamp string
const getNowStr = () => {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}`;
};

const NOW_STR = getNowStr();

// Static IDs for simulation projects
const PROJECT_IDS = ['proj-01', 'proj-02', 'proj-03'];

export const MOCK_PROJECTS: Project[] = [
  { id: 'proj-01', name: '台区1环网柜局放监测项目', type: '配电房', description: '10kV配电房在线监测系统', createdAt: NOW_STR },
  { id: 'proj-02', name: '台区2环网柜局放监测项目', type: '配电房', description: '10kV配电房在线监测系统', createdAt: NOW_STR },
  { id: 'proj-03', name: '台区3环网柜局放监测项目', type: '配电房', description: '10kV配电房在线监测系统', createdAt: NOW_STR }
];

// --- MOCK DEVICES FOR DASHBOARD ---
export const MOCK_DEVICES: DeviceSummary[] = Array.from({ length: 13 }, (_, i) => {
  // Distribute statuses: 1 Critical, 2 Danger, 3 Warning, Rest Normal, Last one NO_DATA
  let status = AlarmLevel.NORMAL;
  if (i === 0) status = AlarmLevel.CRITICAL;
  else if (i < 3) status = AlarmLevel.DANGER;
  else if (i < 6) status = AlarmLevel.WARNING;
  else if (i === 12) status = AlarmLevel.NO_DATA; // Add No Data example

  // Generate random trend data (Moving Average simulation)
  const trend = Array.from({ length: 30 }, () => 20 + Math.random() * (status === AlarmLevel.NORMAL ? 10 : 50));

  return {
    id: `dev-${i}`,
    projectId: PROJECT_IDS[i % 3], // Assign to one of the 3 simulated projects
    name: `环网柜间隔 ${i + 1}`,
    station: ['台区1', '台区2', '台区3'][i % 3], // Matches the project area
    status: status,
    lastUpdated: NOW_STR,
    uhf_amp: Math.floor(20 + Math.random() * 20),
    uhf_freq: Math.floor(50 + Math.random() * 100),
    tev_amp: Math.floor(15 + Math.random() * 30),
    tev_freq: Math.floor(40 + Math.random() * 80),
    hfct_amp: Math.floor(30 + Math.random() * 15),
    hfct_freq: Math.floor(10 + Math.random() * 20),
    ae_amp: Math.floor(5 + Math.random() * 10),
    ae_freq: Math.floor(2 + Math.random() * 5),
    temp: Number((20 + Math.random() * 5).toFixed(1)),
    humidity: Math.floor(45 + Math.random() * 15),
    trend: trend
  };
});

// Template Sensors Locations (Fixed physical positions)
const SENSOR_TEMPLATE: Partial<SensorData>[] = [
  // S-202 (TEV)
  { 
    id: 's2', 
    name: 'A相局部放电-TEV',
    sn: 'SF-TEV-202', 
    type: 'TEV', 
    location: '电缆室外部', 
    status: AlarmLevel.NORMAL, 
    value: 35, 
    unit: 'dBmV',
    freqValue: 320,
    freqUnit: '次/秒',
    timestamp: NOW_STR,
    x: 0, y: 0, 
    position3d: [-160, 10, 20], 
    faceOrientation: 'none',
    isOnline: true
  },
  // S-203 (UHF)
  { 
    id: 's3', 
    name: '气室在线监测-UHF',
    sn: 'SF-UHF-203', 
    type: 'UHF', 
    location: '电缆室外部', 
    status: AlarmLevel.NORMAL, 
    value: -45, 
    unit: 'dBmV', 
    freqValue: 120,
    freqUnit: '次/秒',
    timestamp: NOW_STR,
    x: 0, y: 0, 
    position3d: [-40, -40, 20], 
    faceOrientation: 'none',
    isOnline: true
  },
  // S-204 (AE)
  { 
    id: 's4', 
    name: '超声波诊断-AE',
    sn: 'SF-AE-204', 
    type: 'AE', 
    location: '电缆室外部', 
    status: AlarmLevel.NORMAL, 
    value: 12, 
    unit: 'dBmV', 
    freqValue: 5,
    freqUnit: '次/秒',
    timestamp: NOW_STR,
    x: 0, y: 0, 
    position3d: [50, 70, 20], 
    faceOrientation: 'none',
    isOnline: true 
  },
  // S-205 (HFCT)
  { 
    id: 's5', 
    name: '电缆终端监测-HFCT',
    sn: 'SF-HFCT-205', 
    type: 'HFCT', 
    location: '电缆室外部', 
    status: AlarmLevel.NORMAL, 
    value: 15, 
    unit: 'dBmV', 
    freqValue: 50,
    freqUnit: '次/秒',
    timestamp: NOW_STR,
    x: 0, y: 0, 
    position3d: [180, 20, 20], 
    faceOrientation: 'none',
    isOnline: true 
  },
];

// Potential Internal Locations for PD Source Spawning
const PD_ZONES = [
  { name: 'U1 隔离刀闸 (故障多发区)', minX: -220, maxX: -140, minY: 0, maxY: 80, z: 10 },
  { name: 'CB 断路器气室 (异常热点)', minX: -50, maxX: 50, minY: 0, maxY: 80, z: 10 },
  { name: 'T 终端出线套管 (绝缘缺陷)', minX: 140, maxX: 220, minY: 0, maxY: 80, z: 10 }
];

// Helper to calculate 3D distance
const getDistance = (p1: [number, number, number], p2: [number, number, number]) => {
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) + 
    Math.pow(p1[1] - p2[1], 2) + 
    Math.pow(p1[2] - p2[2], 2)
  );
};

// Main Simulation Function
export const getDeviceSimulation = (deviceId: string, forceFault: boolean = false): { sensors: SensorData[], pdSource: PDSource | null } => {
  // 1. Seed based on Device ID
  const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // 2. Decide if this device has a fault (PD Source)
  const mockDevice = MOCK_DEVICES.find(d => d.id === deviceId);
  const hasFault = forceFault || (mockDevice && mockDevice.status !== AlarmLevel.NORMAL && mockDevice.status !== AlarmLevel.NO_DATA);

  // 2.1 Decide on a random offline node (Location-based consistency)
  // ~20% chance that one of the sensors goes offline (Using '电缆室外部' as key since all sensors are there now)
  let offlineLocation: string | null = null;
  if (seed % 5 === 0) {
      offlineLocation = '电缆室外部'; 
  }

  let pdSource: PDSource | null = null;
  let sensors: SensorData[] = [];

  if (hasFault) {
    // Pick a zone based on seed
    const zoneIndex = seed % PD_ZONES.length;
    const zone = PD_ZONES[zoneIndex];
    
    // Generate random position within zone
    const x = zone.minX + (seed * 17 % (zone.maxX - zone.minX));
    const y = zone.minY + (seed * 13 % (zone.maxY - zone.minY));
    
    pdSource = {
      position3d: [x, y, zone.z],
      locationName: zone.name,
      intensity: 80 + (seed % 20)
    };
  }

  // 3. Generate Sensors & Correlate Status
  sensors = SENSOR_TEMPLATE.map((sensor, index) => {
    // Determine online status based on location consistency
    // Note: Since all sensors are '电缆室外部', if offlineLocation is set, all might go offline if we check equality.
    // To simulate partial offline status in a single location scenario, we mix in index check.
    const isOnline = !(offlineLocation && (seed + index) % 3 === 0);

    // Base variance
    let status = AlarmLevel.NORMAL;
    let value = (sensor.value || 0) + (seed % 10);
    let freq = (sensor.freqValue || 0) + (seed % 20);

    // If there is a PD source, check proximity (Only if Online)
    if (isOnline && pdSource) {
      const dist = getDistance(sensor.position3d as [number, number, number], pdSource.position3d);
      
      // Correlation Logic: Closer sensors get higher alarms
      if (dist < 120) {
        // CLOSE PROXIMITY -> DANGER or CRITICAL
        status = (dist < 80 || seed % 2 === 0) ? AlarmLevel.CRITICAL : AlarmLevel.DANGER;
        
        // Boost values significantly
        value += 40 + Math.random() * 20;
        freq += 200 + Math.random() * 300;
      } else if (dist < 200) {
        // MEDIUM PROXIMITY -> WARNING
        status = AlarmLevel.WARNING;
        value += 15 + Math.random() * 10;
        freq += 50 + Math.random() * 50;
      }
    } else if (isOnline) {
        // No PD Source, maybe random localized noise (Level 1)
        if ((seed + index) % 10 === 0) {
            status = AlarmLevel.WARNING;
            value += 10;
        }
    }

    // Reset values if offline
    if (!isOnline) {
        status = AlarmLevel.NORMAL;
        value = 0;
        freq = 0;
    }

    return {
      ...sensor,
      id: `${deviceId}-${sensor.id}`,
      name: sensor.name || `S-${200 + index}`,
      sn: sensor.sn || `SN-${1000 + index}`,
      status,
      value: Math.floor(value),
      freqValue: Math.floor(freq),
      timestamp: getNowStr(),
      isOnline
    } as SensorData;
  });

  return { sensors, pdSource };
};

// Default export for initial load
export const INITIAL_SIMULATION = getDeviceSimulation(MOCK_DEVICES[0].id);

export const MOCK_CHART_DATA: ChartDataPoint[] = Array.from({ length: 96 }, (_, i) => {
  const isSpike = i >= 70 && i <= 75;
  
  // Base noise + random variation + spike if alarm
  const genVal = (base: number, variance: number, spike: boolean) => 
    base + Math.random() * variance + (spike ? Math.random() * 40 + 20 : 0);

  const date = new Date();
  date.setMinutes(date.getMinutes() - (96 - i) * 15);

  return {
    time: date.toISOString(),
    
    // UHF
    uhf_amp: genVal(20, 5, false),
    uhf_freq: genVal(50, 20, false),

    // TEV (Has spike)
    tev_amp: genVal(30, 10, isSpike),
    tev_freq: genVal(100, 50, isSpike),

    // HFCT
    hfct_amp: genVal(40, 5, false),
    hfct_freq: genVal(20, 10, false),

    // AE
    ae_amp: genVal(10, 2, false),
    ae_freq: genVal(5, 5, false),

    // Environment (Diurnal cycle simulation)
    temperature: 20 + Math.sin((i - 20) / 96 * Math.PI * 2) * 5 + Math.random(),
    humidity: 50 + Math.cos((i - 20) / 96 * Math.PI * 2) * 10 + Math.random(),

    isAlarm: isSpike,
  };
});

export const SYSTEM_PROMPT = `
You are an expert AI assistant for a 10kV Ring Main Unit (RMU) Partial Discharge Diagnosis System.
Your role is to analyze sensor data, explain alarm causes, and suggest maintenance actions.
The system monitors UHF, TEV, HFCT, and Acoustic Emission (AE) signals on cable terminations and busbars.
When asked about specific sensors, analyze the provided context.
If a sensor is in DANGER state, interpret it as a likely insulation defect or loose contact.
Keep responses professional, concise, and technical but accessible to power grid operators.
Use markdown for formatting.
`;

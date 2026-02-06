
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SensorData, AlarmLevel, DeviceSummary, PDSource, Project } from '../types';
import { Rotate3d, MousePointer2, X, AlertCircle, Clock, ChevronDown, ChevronRight, Crosshair, Target, Zap, MapPin, Hash, Move, LayoutTemplate, Save, RotateCcw, Layers, Cpu, Radio, Activity, Waves, PanelLeftClose, PanelLeftOpen, Network, Box, Upload, Image as ImageIcon, AlertTriangle, AlertOctagon, CheckCircle2, HelpCircle } from 'lucide-react';

interface DigitalTwinProps {
  sensors: SensorData[];
  pdSource: PDSource | null;
  isDark: boolean;
  activeSensorId: string;
  onSensorSelect: (id: string, name?: string) => void;
  devices: DeviceSummary[];
  projects: Project[];
  currentDeviceId: string;
  onDeviceChange: (id: string) => void;
}

type ViewMode = 'twin' | 'topology';

// --- Weighted Status Calculation Logic ---
const calculateNodeWeightedStatus = (channels: SensorData[]): { label: string; level: AlarmLevel } => {
    // 0. Pre-check: No Data / Offline
    // If all channels are offline or no data, return No Data
    const allNoData = channels.every(c => !c.isOnline || c.status === AlarmLevel.NO_DATA);
    if (allNoData) return { label: '无数据', level: AlarmLevel.NO_DATA };

    // 1. Constants & Mapping
    const WEIGHTS: Record<string, number> = {
        'UHF': 0.2,
        'TEV': 0.45,
        'AE': 0.35,
        'HFCT': 0.3, // Fallback for other types
        'HFCT1': 0.3,
        'HFCT2': 0.3
    };

    const LEVEL_VAL: Record<AlarmLevel, number> = {
        [AlarmLevel.NORMAL]: 0,
        [AlarmLevel.NO_DATA]: 0,
        [AlarmLevel.WARNING]: 1,
        [AlarmLevel.DANGER]: 2,
        [AlarmLevel.CRITICAL]: 3
    };

    let weightedSum = 0;
    let alarmCount = 0;
    let maxLevelVal = 0;

    // 2. Calculate Weighted Sum
    channels.forEach(ch => {
        // Skip offline channels in calculation (treat as 0)
        if (!ch.isOnline || ch.status === AlarmLevel.NO_DATA) return;

        const val = LEVEL_VAL[ch.status] || 0;
        // Default to 0.3 if type not found, or match partial keys could be added here
        const w = WEIGHTS[ch.type] || 0.3; 
        
        if (val > 0) {
            alarmCount++;
            if (val > maxLevelVal) maxLevelVal = val;
        }
        weightedSum += (val * w);
    });

    let finalLevelVal = 0;

    // 3. Apply Rules
    // Rule A: Weighted Sum < 0.5 -> Normal
    if (weightedSum < 0.5) {
        finalLevelVal = 0;
    } else {
        // Rule B: Weighted Sum >= 0.5
        if (alarmCount >= 2) {
            // Rule B1: Count >= 2 -> Max Level
            finalLevelVal = maxLevelVal;
        } else {
            // Rule B2: Count < 2 (Implies 1) -> Level - 1
            finalLevelVal = Math.max(0, maxLevelVal - 1);
        }
    }

    // 4. Map back to Output
    switch (finalLevelVal) {
        case 3: return { label: '三级', level: AlarmLevel.CRITICAL };
        case 2: return { label: '二级', level: AlarmLevel.DANGER };
        case 1: return { label: '一级', level: AlarmLevel.WARNING };
        default: return { label: '正常', level: AlarmLevel.NORMAL };
    }
};

const DigitalTwin: React.FC<DigitalTwinProps> = ({ 
  sensors, pdSource, isDark, activeSensorId, onSensorSelect,
  devices, projects, currentDeviceId, onDeviceChange
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('twin');
  const [selectedSensor, setSelectedSensor] = useState<SensorData | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLayoutMode, setIsLayoutMode] = useState(false);
  const [draggedSensorId, setDraggedSensorId] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Topology State
  const [topologyImage, setTopologyImage] = useState<string | null>(() => localStorage.getItem('pd_topology_image'));
  const topologyInputRef = useRef<HTMLInputElement>(null);

  // Store position overrides: { [sensorId]: [x, y, z] }
  const [sensorPosOverrides, setSensorPosOverrides] = useState<Record<string, [number, number, number]>>(() => {
      const saved = localStorage.getItem('pd_sensor_positions');
      return saved ? JSON.parse(saved) : {};
  });

  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle outside click for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  useEffect(() => {
      localStorage.setItem('pd_sensor_positions', JSON.stringify(sensorPosOverrides));
  }, [sensorPosOverrides]);

  const handleTopologyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              setTopologyImage(result);
              localStorage.setItem('pd_topology_image', result);
          };
          reader.readAsDataURL(file);
      }
  };

  // Find Current Context
  const currentDevice = devices.find(d => d.id === currentDeviceId);
  const currentProject = projects.find(p => p.id === currentDevice?.projectId);

  // Project Name Display Logic
  const projectNameFull = currentProject?.name || '未知项目';
  const projectNameDisplay = projectNameFull.length > 10 
      ? `项目：${projectNameFull.substring(0, 10)}......`
      : `项目：${projectNameFull}`;

  // Group devices by Project for the dropdown list
  const groupedDevices = useMemo(() => {
      const groups: Record<string, DeviceSummary[]> = {};
      projects.forEach(p => groups[p.id] = []);
      groups['other'] = []; 

      devices.forEach(d => {
          if (groups[d.projectId]) {
              groups[d.projectId].push(d);
          } else {
              groups['other'].push(d);
          }
      });
      return groups;
  }, [devices, projects]);

  const getDeviceStatusIcon = (status: AlarmLevel) => {
      switch(status) {
          case AlarmLevel.NORMAL: return '🟢'; 
          case AlarmLevel.WARNING: return '🟡';
          case AlarmLevel.DANGER: return '🟠';
          case AlarmLevel.CRITICAL: return '🔴';
          case AlarmLevel.NO_DATA: return '⚪';
          default: return '⚪';
      }
  };

  // --- Data Grouping Logic (Simulating Sensor Nodes) ---
  const { sensorNodes, sensorNodeMap } = useMemo(() => {
    const nodes = [];
    const map: Record<string, { id: string; name: string; sn: string }> = {};
    const chunkSize = 2; // 2-4 channels per node
    
    for (let i = 0; i < sensors.length; i += chunkSize) {
        const originalChunk = sensors.slice(i, i + chunkSize);
        
        // Use the new Weighted Calculation Logic
        const computedStatus = calculateNodeWeightedStatus(originalChunk);

        const nodeId = `node-${i}`;
        const nodeName = i === 0 ? 'GIS本体综合监测终端' : '电缆终端监测节点';
        const nodeIndex = Math.floor(i / chunkSize) + 1;
        const nodeSn = `S-${nodeIndex < 10 ? '0' + nodeIndex : nodeIndex}`;

        originalChunk.forEach(s => {
            map[s.id] = { id: nodeId, name: nodeName, sn: nodeSn };
        });

        nodes.push({
            id: nodeId,
            name: nodeName,
            sn: nodeSn,
            computedStatus: computedStatus, // Store the computed status object
            channels: originalChunk
        });
    }
    return { sensorNodes: nodes, sensorNodeMap: map };
  }, [sensors]);

  useEffect(() => {
      const initialExpanded: Record<string, boolean> = {};
      sensorNodes.forEach(node => {
          initialExpanded[node.id] = false; // Default collapsed
      });
      setExpandedNodes(initialExpanded);
  }, [sensorNodes.length]); 

  const toggleNode = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation(); 
      setExpandedNodes(prev => ({
          ...prev,
          [nodeId]: !prev[nodeId]
      }));
  };

  const handleNodeSelect = (nodeId: string, nodeName: string) => {
      onSensorSelect(nodeId, nodeName);
  };

  const aggregateStatus = useMemo(() => {
    // Prioritize the status from the device summary list to ensure consistency with the Dashboard
    if (currentDevice) {
        return currentDevice.status;
    }

    // Fallback logic if currentDevice is not found
    if (sensors.some(s => s.status === AlarmLevel.CRITICAL)) return AlarmLevel.CRITICAL;
    if (sensors.some(s => s.status === AlarmLevel.DANGER)) return AlarmLevel.DANGER;
    if (sensors.some(s => s.status === AlarmLevel.WARNING)) return AlarmLevel.WARNING;
    return AlarmLevel.NORMAL;
  }, [sensors, currentDevice]);

  // Updated Status Styles with "Jump out" effect for High Levels
  const currentStatusStyle = useMemo(() => {
      switch (aggregateStatus) {
        case AlarmLevel.NORMAL: 
            return { 
                label: '正常', 
                description: '绝缘状态良好', 
                color: 'text-green-500', 
                bg: 'bg-green-500',
                descColor: 'text-green-500',
                isHighAlert: false 
            };
        case AlarmLevel.WARNING: 
            return { 
                label: '一级', 
                description: '检测到轻度局放信号，无需动作', 
                color: 'text-yellow-400', 
                bg: 'bg-yellow-400',
                descColor: 'text-yellow-400',
                isHighAlert: false
            };
        case AlarmLevel.DANGER: 
            return { 
                label: '二级', 
                description: '局放信号持续增强，建议关注并计划消缺', 
                color: 'text-white', 
                bg: 'bg-orange-500',
                descColor: 'text-orange-500',
                containerClass: 'bg-gradient-to-r from-orange-500 to-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.5)] border-orange-400',
                isHighAlert: true,
                icon: AlertTriangle
            };
        case AlarmLevel.CRITICAL: 
            return { 
                label: '三级', 
                description: '局放信号增强加速，建议尽快检修', 
                color: 'text-white', 
                bg: 'bg-red-600',
                descColor: 'text-red-500',
                containerClass: 'bg-gradient-to-r from-red-600 to-red-700 shadow-[0_0_25px_rgba(220,38,38,0.6)] border-red-500',
                isHighAlert: true,
                icon: AlertOctagon
            };
        case AlarmLevel.NO_DATA: 
            return { 
                label: '无数据', 
                description: '暂无实时监测数据', 
                color: 'text-slate-400', 
                bg: 'bg-slate-400',
                descColor: 'text-slate-400',
                isHighAlert: false,
                icon: HelpCircle
            };
        default: 
            return { 
                label: '无数据', 
                description: '无数据', 
                color: 'text-slate-400', 
                bg: 'bg-slate-400',
                descColor: 'text-slate-400',
                isHighAlert: false,
                icon: HelpCircle
            };
      }
  }, [aggregateStatus]);

  const getStatusColor = (status: AlarmLevel, isOnline: boolean) => {
    if (isOnline === false) return 'bg-slate-500 border-slate-400 shadow-none opacity-50';
    switch (status) {
      case AlarmLevel.NORMAL: return 'bg-green-500 border-green-300 shadow-[0_0_10px_2px_rgba(34,197,94,0.6)]';
      case AlarmLevel.WARNING: return 'bg-yellow-400 border-yellow-200 shadow-[0_0_10px_2px_rgba(250,204,21,0.6)]';
      case AlarmLevel.DANGER: return 'bg-orange-500 border-orange-300 shadow-[0_0_12px_3px_rgba(249,115,22,0.7)]';
      case AlarmLevel.CRITICAL: return 'bg-red-600 border-red-400 shadow-[0_0_15px_4px_rgba(220,38,38,0.8)]';
      case AlarmLevel.NO_DATA: return 'bg-slate-400 border-slate-300';
      default: return 'bg-slate-400 border-slate-300';
    }
  };

  const getStatusLabel = (status: AlarmLevel, isOnline: boolean) => {
      if (isOnline === false) return '无数据';
      switch (status) {
        case AlarmLevel.NORMAL: return '正常';
        case AlarmLevel.WARNING: return '一级';
        case AlarmLevel.DANGER: return '二级';
        case AlarmLevel.CRITICAL: return '三级';
        case AlarmLevel.NO_DATA: return '无数据';
        default: return '未知';
      }
  };

  const getStatusBadgeColor = (status: AlarmLevel, isOnline: boolean) => {
      if (isOnline === false) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      switch (status) {
        case AlarmLevel.NORMAL: return 'bg-green-500/10 text-green-500 border-green-500/20';
        case AlarmLevel.WARNING: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case AlarmLevel.DANGER: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case AlarmLevel.CRITICAL: return 'bg-red-500/10 text-red-500 border-red-500/20';
        case AlarmLevel.NO_DATA: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        default: return 'bg-slate-500/10 text-slate-400';
      }
  };

  const getBadgeStyle = (level: AlarmLevel) => {
      switch(level) {
          case AlarmLevel.CRITICAL: return 'bg-red-500/10 text-red-500 border-red-500/20';
          case AlarmLevel.DANGER: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
          case AlarmLevel.WARNING: return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
          case AlarmLevel.NORMAL: return 'bg-green-500/10 text-green-500 border-green-500/20';
          default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.sensor-interactive') || viewMode !== 'twin') {
        return;
    }
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleSensorMouseDown = (e: React.MouseEvent, sensorId: string) => {
      if (!isLayoutMode || viewMode !== 'twin') return;
      e.stopPropagation();
      e.preventDefault();
      setDraggedSensorId(sensorId);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (viewMode !== 'twin') return;

    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    if (draggedSensorId && isLayoutMode) {
        setSensorPosOverrides(prev => {
            const currentPos = prev[draggedSensorId] || 
                               sensors.find(s => s.id === draggedSensorId)?.position3d || 
                               [0, 0, 20];
            const scaleFactor = 1.2; 
            return {
                ...prev,
                [draggedSensorId]: [
                    currentPos[0] + deltaX * scaleFactor,
                    currentPos[1] + deltaY * scaleFactor,
                    currentPos[2]
                ]
            };
        });
        return;
    }

    if (isDragging) {
        setRotation(prev => ({
            x: Math.max(-45, Math.min(45, prev.x - deltaY * 0.5)),
            y: Math.max(-180, Math.min(180, prev.y + deltaX * 0.5))
        }));
    }
  };

  const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedSensorId(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
        setIsDragging(false);
        setDraggedSensorId(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleResetPositions = () => {
      if (window.confirm('确定要重置所有传感器位置到默认状态吗？')) {
          setSensorPosOverrides({});
      }
  };

  const handleSensorClick = (e: React.MouseEvent, sensor: SensorData) => {
      e.stopPropagation();
      if (!isLayoutMode) {
          setSelectedSensor(sensor);
      }
  };

  const Box3D = ({ w, h, d, x, y, z, colorClass, borderClass, label }: any) => {
    const halfW = w / 2; const halfH = h / 2; const halfD = d / 2;
    const Face = ({ tx, ty, tz, rx, ry, rz, width, height, opacity = 1 }: any) => (
        <div 
            className={`absolute border ${colorClass} ${borderClass}`}
            style={{
                width, height,
                transform: `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
                opacity
            }}
        >
             {label && rz === 0 && rx === 0 && ry === 0 && (
                 <div className="w-full h-full flex items-center justify-center font-bold text-white/20 text-4xl select-none">{label}</div>
             )}
        </div>
    );
    return (
      <div className="absolute transform-3d pointer-events-none" style={{ width: 0, height: 0, transform: `translate3d(${x}px, ${y}px, ${z}px)` }}>
        <Face tx={-halfW} ty={-halfH} tz={halfD} rx={0} ry={0} rz={0} width={w} height={h} opacity={1} />
        <Face tx={-halfW} ty={-halfH} tz={-halfD} rx={0} ry={180} rz={0} width={w} height={h} opacity={1} />
        <Face tx={halfW - halfD} ty={-halfH} tz={0} rx={0} ry={90} rz={0} width={d} height={h} opacity={0.8} />
        <Face tx={-halfW - halfD} ty={-halfH} tz={0} rx={0} ry={-90} rz={0} width={d} height={h} opacity={0.8} />
        <Face tx={-halfW} ty={-halfH - halfD} tz={0} rx={90} ry={0} rz={0} width={w} height={d} opacity={0.9} />
        <Face tx={-halfW} ty={halfH - halfD} tz={0} rx={-90} ry={0} rz={0} width={w} height={d} opacity={0.6} />
      </div>
    );
  };

  const pipeColor = isDark ? 'bg-slate-800' : 'bg-slate-300';
  const pipeBorder = isDark ? 'border-slate-600' : 'border-slate-400';
  const unitColor = isDark ? 'bg-slate-700/80' : 'bg-slate-200/90';
  const unitBorder = isDark ? 'border-slate-500' : 'border-slate-300';
  const busColor = isDark ? 'bg-slate-800' : 'bg-slate-400';

  return (
    <div className={`relative w-full h-full flex flex-col rounded-xl overflow-hidden transition-colors duration-300 select-none
      ${isDark ? 'bg-tech-card border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
      
      {/* Header */}
      <div className={`px-4 py-3 flex justify-between items-center z-10 ${isDark ? 'bg-slate-900/30' : 'bg-gray-50/70 border-b border-gray-100'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Activity size={24} />
          </div>
          <div>
              <h2 className={`text-xl font-bold tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>
                设备状态诊断
              </h2>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  设备整体状态可视化管理和故障深入诊断
              </p>
          </div>
          <div className="h-8 w-px bg-slate-500/20 mx-2"></div>
          
          {/* Custom Project Dropdown */}
          <div className="relative" ref={dropdownRef}>
             <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold border transition-all min-w-[160px] justify-between
                  ${isDark 
                    ? 'bg-slate-800/40 border-slate-700 text-blue-400 hover:border-blue-500 hover:bg-slate-800/60' 
                    : 'bg-white border-gray-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50'}
                `}
                title={projectNameFull}
             >
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="truncate">{projectNameDisplay}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
             </button>

             {/* Dropdown Menu */}
             {isDropdownOpen && (
                 <div className={`absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto rounded-xl border shadow-2xl z-50 animate-fadeIn
                     ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}
                 `}>
                    {projects.map(p => {
                        const projectDevs = groupedDevices[p.id] || [];
                        if (projectDevs.length === 0) return null;
                        return (
                            <div key={p.id} className="py-2">
                                <div className={`px-4 py-1 text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {p.name}
                                </div>
                                {projectDevs.map(d => (
                                    <button
                                        key={d.id}
                                        onClick={() => { onDeviceChange(d.id); setIsDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium flex items-center gap-2 transition-colors
                                            ${currentDeviceId === d.id 
                                                ? (isDark ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500' : 'bg-blue-50 text-blue-600 border-l-2 border-blue-500')
                                                : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-50')
                                            }
                                        `}
                                    >
                                        <span className="text-xs">{getDeviceStatusIcon(d.status)}</span>
                                        <span className="truncate">{d.name}</span>
                                    </button>
                                ))}
                            </div>
                        )
                    })}
                 </div>
             )}
          </div>

          <div className={`flex rounded-lg p-1 gap-1 border transition-colors ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
            <button 
              onClick={() => setViewMode('twin')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                  ${viewMode === 'twin' 
                    ? (isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700') 
                    : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100')}`}
            >
                <Box size={14} /> 3D 孪生
            </button>
            <button 
              onClick={() => setViewMode('topology')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all
                  ${viewMode === 'topology' 
                    ? (isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700') 
                    : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100')}`}
            >
                <Network size={14} /> 网络拓扑
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end pr-2">
                {currentStatusStyle.isHighAlert ? (
                    // HIGH ALERT STYLE (Critical/Danger)
                    <div className={`flex items-center gap-3 px-4 py-1.5 rounded-lg border animate-pulse ${currentStatusStyle.containerClass} transform hover:scale-105 transition-transform duration-300 cursor-default`}>
                        {currentStatusStyle.icon && React.createElement(currentStatusStyle.icon, { size: 22, className: "text-white animate-bounce" })}
                        <span className={`text-2xl font-black ${currentStatusStyle.color} uppercase tracking-widest drop-shadow-md`}>
                            {currentStatusStyle.label}
                        </span>
                    </div>
                ) : (
                    // NORMAL/WARNING/NO_DATA STYLE
                    <div className="flex items-center gap-3 mb-0.5">
                        <span className={`text-xl font-black ${currentStatusStyle.color} uppercase tracking-widest`}>
                            {currentStatusStyle.label}
                        </span>
                        <div className="relative flex items-center justify-center w-5 h-5">
                            <div className={`absolute w-full h-full rounded-full ${currentStatusStyle.bg} opacity-20 ${aggregateStatus !== AlarmLevel.NORMAL && aggregateStatus !== AlarmLevel.NO_DATA ? 'animate-ping' : ''}`}></div>
                            <div className={`relative w-3.5 h-3.5 rounded-full ${currentStatusStyle.bg} shadow-md`}></div>
                        </div>
                    </div>
                )}
                
                <div className={`text-[10px] font-bold mt-1 opacity-80 ${currentStatusStyle.descColor}`}>
                    {currentStatusStyle.description}
                </div>
            </div>
        </div>
      </div>

      {/* Sensor List Panel (Collapsible) */}
      <div className={`absolute left-0 top-[76px] bottom-0 z-20 flex flex-col border-r backdrop-blur-sm transition-all duration-300 ease-in-out
          ${isDark ? 'bg-slate-900/60 border-slate-700' : 'bg-white/60 border-gray-200'}
          ${isSidebarOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-full border-none opacity-0 pointer-events-none'}
      `}>
          <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 flex-shrink-0 ${isDark ? 'border-slate-700 text-slate-300' : 'border-gray-200 text-slate-700'}`}>
              <div className="flex items-center gap-2">
                  <Layers size={16} />
                  <span className="text-xs font-black uppercase">传感节点列表</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}
                title="折叠列表"
              >
                  <PanelLeftClose size={16} />
              </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 w-80">
              {sensorNodes.map(node => {
                  const isExpanded = expandedNodes[node.id];
                  const isNodeActive = activeSensorId === node.id;
                  
                  return (
                      <div key={node.id} className={`rounded-lg border overflow-hidden transition-all ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white/80 border-gray-200 shadow-sm'} ${isNodeActive ? (isDark ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-blue-500 shadow-md') : ''}`}>
                          {/* Node Header (Level 1) - Node Selection */}
                          <div 
                             className={`px-3 py-3 flex items-center gap-2 cursor-pointer transition-colors 
                                ${isDark 
                                    ? (isNodeActive ? 'bg-blue-600/20' : 'hover:bg-slate-700') 
                                    : (isNodeActive ? 'bg-blue-50' : 'hover:bg-gray-50')
                                }`}
                             onClick={() => handleNodeSelect(node.id, node.name)}
                          >
                              {/* Expand toggle - Separate trigger */}
                              <div onClick={(e) => toggleNode(e, node.id)} className="p-1 hover:opacity-100 opacity-60">
                                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                      <div className={`text-xs font-bold truncate flex items-center gap-2 ${isNodeActive ? 'text-blue-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                                          {node.name}
                                      </div>
                                      {/* Status Badge */}
                                      <div className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${getBadgeStyle(node.computedStatus.level)}`}>
                                          {node.computedStatus.label}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] font-black opacity-40">SN:</span>
                                    <span className="text-[9px] font-mono opacity-60">{node.sn}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Channels List (Level 2) */}
                          {isExpanded && (
                              <div className={`border-t ${isDark ? 'border-slate-700/50 bg-black/10' : 'border-gray-100 bg-gray-50/50'}`}>
                                  {node.channels.map(sensor => {
                                      // Only visual highlight, clicking does NOT update trend (per requirement)
                                      return (
                                          <div 
                                            key={sensor.id}
                                            className={`flex items-center gap-3 px-3 py-2 pl-8 border-l-2 border-transparent transition-all select-none
                                                ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-200/50'}
                                            `}
                                            onClick={(e) => handleSensorClick(e, sensor)} // Only opens detail modal
                                          >
                                               {/* Type Icon - Unified Tag */}
                                               <span className={`p-1.5 rounded-md flex-shrink-0 border ${isDark ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-white border-gray-200 text-indigo-600'}`}>
                                                   <Waves size={12} strokeWidth={2.5} />
                                               </span>

                                               <div className="flex-1 min-w-0">
                                                   <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                       {sensor.type} 
                                                   </div>
                                                   <div className="flex items-center gap-1 opacity-60 mt-0.5">
                                                       <MapPin size={8} />
                                                       <span className="text-[9px] truncate">{sensor.location}</span>
                                                   </div>
                                               </div>
                                               
                                               {/* Status Light Indicator */}
                                               <div className={`w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0 transition-colors ${
                                                   sensor.isOnline === false ? 'bg-slate-400' : 
                                                   (sensor.status === AlarmLevel.NORMAL ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' :
                                                   sensor.status === AlarmLevel.WARNING ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.5)]' :
                                                   sensor.status === AlarmLevel.DANGER ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)] animate-pulse' : 
                                                   sensor.status === AlarmLevel.CRITICAL ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse' :
                                                   'bg-slate-400 border-slate-300') // NO_DATA case
                                               }`} title={getStatusLabel(sensor.status, sensor.isOnline)} />
                                          </div>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Floating Expand Button - Updated to match Layers Icon */}
      {!isSidebarOpen && (
          <button
              onClick={() => setIsSidebarOpen(true)}
              className={`absolute left-4 top-[88px] z-30 p-2.5 rounded-lg shadow-lg border backdrop-blur-md transition-all animate-fadeIn
                  ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white' : 'bg-white/80 border-gray-200 text-slate-600 hover:text-blue-600'}`}
              title="展开传感节点列表"
          >
              <Layers size={20} />
          </button>
      )}

      {/* Toolbar */}
      <div className={`absolute top-24 right-4 z-20 flex flex-col gap-2 items-end`}>
          
          {viewMode === 'twin' && (
              <>
                <button 
                    onClick={() => setIsLayoutMode(!isLayoutMode)}
                    className={`p-2.5 rounded-lg shadow-lg backdrop-blur-md border transition-all
                        ${isLayoutMode 
                            ? 'bg-blue-600 text-white border-blue-500' 
                            : (isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white' : 'bg-white/80 border-gray-200 text-slate-600 hover:text-blue-600')
                        }`}
                    title={isLayoutMode ? "退出布局模式" : "调整传感器位置"}
                >
                    <LayoutTemplate size={20} />
                </button>
                
                {isLayoutMode && (
                    <button 
                        onClick={handleResetPositions}
                        className={`p-2.5 rounded-lg shadow-lg backdrop-blur-md border transition-all ${isDark ? 'bg-slate-800/80 border-slate-700 text-red-400 hover:bg-red-500/20' : 'bg-white/80 border-gray-200 text-red-500 hover:bg-red-50'}`}
                        title="重置所有位置"
                    >
                        <RotateCcw size={20} />
                    </button>
                )}
              </>
          )}
      </div>

      <div 
        ref={containerRef}
        className={`flex-1 relative overflow-hidden flex items-center justify-center transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-80' : 'ml-0'} ${isLayoutMode && viewMode === 'twin' ? 'cursor-default' : (viewMode === 'twin' ? 'cursor-move' : '')}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ perspective: viewMode === 'twin' ? '2000px' : 'none' }}
      >
        <div className={`absolute inset-0 pointer-events-none ${isDark ? 'bg-gradient-to-b from-[#0f172a] to-[#1e293b]' : 'bg-slate-50'}`} />
        
        {viewMode === 'twin' ? (
            <>
                <div className="absolute inset-0 pointer-events-none opacity-10"
                    style={{ 
                        backgroundImage: `linear-gradient(${isDark ? '#334155' : '#cbd5e1'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#334155' : '#cbd5e1'} 1px, transparent 1px)`,
                        backgroundSize: '32px 32px',
                        transform: `perspective(1000px) rotateX(60deg) translateY(200px) scale(2)`
                    }}
                />

                {isLayoutMode && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-20">
                        <div className="border-2 border-dashed border-blue-500 w-[80%] h-[80%] rounded-xl"></div>
                    </div>
                )}

                <div className="transform-3d transition-transform duration-100 ease-out" style={{ transformStyle: 'preserve-3d', transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(0.85)` }}>
                    <Box3D w={600} h={40} d={40} x={0} y={-120} z={0} colorClass={busColor} borderClass={pipeBorder} />
                    <Box3D w={20} h={80} d={20} x={-180} y={-60} z={0} colorClass={pipeColor} borderClass={pipeBorder} />
                    <Box3D w={100} h={140} d={80} x={-180} y={40} z={0} colorClass={unitColor} borderClass={unitBorder} label="U1" />
                    <Box3D w={30} h={80} d={30} x={0} y={-60} z={0} colorClass={pipeColor} borderClass={pipeBorder} />
                    <Box3D w={140} h={140} d={100} x={0} y={40} z={0} colorClass={unitColor} borderClass={unitBorder} label="CB" />
                    <Box3D w={20} h={80} d={20} x={180} y={-60} z={0} colorClass={pipeColor} borderClass={pipeBorder} />
                    <Box3D w={100} h={120} d={80} x={180} y={40} z={0} colorClass={unitColor} borderClass={unitBorder} label="T" />

                    {pdSource && (
                        <div className="absolute transform-3d flex items-center justify-center pointer-events-none" style={{ width: 0, height: 0, transform: `translate3d(${pdSource.position3d[0]}px, ${pdSource.position3d[1]}px, ${pdSource.position3d[2]}px)` }}>
                            <div style={{ transform: `rotateY(${-rotation.y}deg) rotateX(${-rotation.x}deg)` }}>
                                <div className="relative flex items-center justify-center">
                                    <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_15px_white] animate-pulse z-20 relative"></div>
                                    <div className="absolute w-8 h-8 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full blur-sm opacity-90 animate-ping"></div>
                                    <div className="absolute w-16 h-16 bg-red-600 rounded-full blur-xl opacity-40 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {sensors.map((sensor) => {
                    const position = sensorPosOverrides[sensor.id] || sensor.position3d;
                    const isBeingDragged = draggedSensorId === sensor.id;
                    // Highlight if this specific sensor is selected for details modal
                    const isSelectedForModal = selectedSensor?.id === sensor.id;

                    return (
                        <div 
                            key={sensor.id} 
                            className={`absolute flex items-center justify-center transform-3d group sensor-interactive ${isLayoutMode ? 'cursor-move' : ''}`} 
                            style={{ 
                                width: '0px', height: '0px', 
                                transform: `translate3d(${position[0]}px, ${position[1]}px, ${position[2]}px)`,
                                zIndex: isBeingDragged ? 100 : 10
                            }}
                            onMouseDown={(e) => handleSensorMouseDown(e, sensor.id)}
                        >
                            <div style={{ transform: `rotateY(${-rotation.y}deg) rotateX(${-rotation.x}deg)` }}>
                                <div 
                                    className={`
                                        relative w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                                        ${getStatusColor(sensor.status, sensor.isOnline)}
                                        ${isSelectedForModal ? 'scale-150 ring-2 ring-white z-20' : ''}
                                        ${isLayoutMode ? 'hover:scale-125 hover:ring-2 hover:ring-white' : 'cursor-pointer hover:scale-150'}
                                        ${isBeingDragged ? 'scale-150 ring-4 ring-white shadow-2xl' : ''}
                                    `} 
                                    onClick={(e) => handleSensorClick(e, sensor)}
                                >
                                    {/* Alert Ping Ring (Only if Online) */}
                                    {sensor.isOnline !== false && sensor.status !== AlarmLevel.NORMAL && sensor.status !== AlarmLevel.NO_DATA && (
                                        <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${sensor.status === AlarmLevel.DANGER ? 'bg-orange-500' : 'bg-red-600'}`}></span>
                                    )}
                                    
                                    {/* Simplified Dot Representation (No Text) */}
                                    {isLayoutMode && <Move size={8} className="text-white opacity-80" />}
                                    
                                    {/* Drag Label */}
                                    {isBeingDragged && (
                                        <div className="absolute top-6 bg-black/80 text-white text-[10px] font-mono px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm pointer-events-none">
                                            X:{Math.round(position[0])} Y:{Math.round(position[1])}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                    })}
                </div>
            </>
        ) : (
            // Topology View
            <div className="w-full h-full p-8 flex items-center justify-center relative z-10 animate-fadeIn">
                 {topologyImage ? (
                     <div className="relative w-full h-full flex items-center justify-center">
                         <img src={topologyImage} alt="Network Topology" className="max-w-full max-h-full object-contain shadow-2xl rounded-xl border border-gray-500/10" />
                         
                         {/* Moved button to Top-Right to avoid conflict with floating assistant and removed opacity fade-in logic for better UX */}
                         <div className="absolute top-4 right-4 z-20">
                             <button 
                                onClick={() => topologyInputRef.current?.click()}
                                className="bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg opacity-60 hover:opacity-100 hover:scale-105 active:scale-95"
                             >
                                 <Upload size={14} /> 替换拓扑图
                             </button>
                         </div>
                     </div>
                 ) : (
                     <div className={`w-full max-w-2xl aspect-video rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all
                         ${isDark ? 'border-slate-700 bg-slate-800/30 hover:border-blue-500/50 hover:bg-slate-800/50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'}`}
                     >
                         <div className={`p-6 rounded-full ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm'}`}>
                             <Network size={48} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                         </div>
                         <div className="text-center">
                             <h3 className={`text-lg font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-700'}`}>暂无网络拓扑结构图</h3>
                             <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>请上传本地拓扑图文件以展示网络连接结构</p>
                         </div>
                         <button 
                            onClick={() => topologyInputRef.current?.click()}
                            className="mt-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                         >
                             <Upload size={16} /> 上传本地图片
                         </button>
                     </div>
                 )}
            </div>
        )}
      </div>

      {isLayoutMode && viewMode === 'twin' && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-full shadow-xl z-20 animate-slideInUp pointer-events-none flex items-center gap-2">
              <LayoutTemplate size={14} />
              布局编辑模式：拖拽传感器调整位置
          </div>
      )}

        {/* Detailed Info Modal (Click Triggered - Floating) */}
        {selectedSensor && (
            <div className={`absolute top-24 right-4 w-80 p-0 rounded-xl overflow-hidden shadow-2xl z-[100] animate-fadeIn border backdrop-blur-md ${isDark ? 'bg-[#0f172a]/95 border-slate-700 text-slate-200' : 'bg-white/95 border-gray-200 text-slate-800'}`}>
                {/* Header: Sensor Node Info */}
                <div className={`p-4 pb-3 border-b flex justify-between items-start ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                    <div className="flex-1 min-w-0">
                        {/* Parent Node Name */}
                        <h3 className={`font-black text-sm truncate mb-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                           {sensorNodeMap[selectedSensor.id]?.name || '未知节点'}
                        </h3>
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black opacity-40">SN:</span>
                            <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">{sensorNodeMap[selectedSensor.id]?.sn || 'UNKNOWN'}</span>
                        </div>
                    </div>
                    <button onClick={() => setSelectedSensor(null)} className={`p-1 -mr-2 -mt-2 rounded-full hover:bg-black/10`}>
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    
                    {/* Channel Info */}
                    <div className="space-y-3">
                         <div className="flex items-center justify-between">
                             <div className="text-[10px] font-black uppercase opacity-40">模态通道</div>
                             <div className={`flex items-center gap-1.5 font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                 <Waves size={12} className="text-indigo-500" />
                                 {selectedSensor.type}
                             </div>
                         </div>
                         
                         <div className="flex items-center justify-between">
                             <div className="text-[10px] font-black uppercase opacity-40">安装位置</div>
                             <div className={`flex items-center gap-1.5 font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                 <MapPin size={12} className="text-blue-500" />
                                 {selectedSensor.location}
                             </div>
                         </div>

                         <div className="flex items-center justify-between border-t border-dashed border-gray-500/10 pt-3">
                            <div className="text-[10px] font-black uppercase opacity-40">当前状态</div>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-black border ${getStatusBadgeColor(selectedSensor.status, selectedSensor.isOnline)}`}>
                                {getStatusLabel(selectedSensor.status, selectedSensor.isOnline)}
                            </div>
                        </div>
                    </div>

                    {selectedSensor.isOnline !== false && selectedSensor.status !== AlarmLevel.NO_DATA ? (
                        <div className={`grid grid-cols-2 gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                                 <div className="text-[9px] opacity-40 font-black mb-1">放电幅值</div>
                                 <div className="font-mono text-sm font-bold">{selectedSensor.value} <span className="text-[9px] opacity-50">{selectedSensor.unit}</span></div>
                                 <div className="flex items-center gap-1 mt-1 opacity-40">
                                    <Clock size={8} />
                                    <span className="text-[8px] font-mono tracking-tight">{selectedSensor.timestamp.split(' ')[1]}</span>
                                 </div>
                             </div>
                             <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                                 <div className="text-[9px] opacity-40 font-black mb-1">放电频次</div>
                                 <div className="font-mono text-sm font-bold">{selectedSensor.freqValue} <span className="text-[9px] opacity-50">{selectedSensor.freqUnit}</span></div>
                                 <div className="flex items-center gap-1 mt-1 opacity-40">
                                    <Clock size={8} />
                                    <span className="text-[8px] font-mono tracking-tight">{selectedSensor.timestamp.split(' ')[1]}</span>
                                 </div>
                             </div>
                        </div>
                    ) : (
                        <div className="pt-2">
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-500/10 text-slate-500 text-xs border border-slate-500/10">
                                <AlertCircle size={14} />
                                <span>{selectedSensor.status === AlarmLevel.NO_DATA ? '暂无实时监测数据' : '设备离线，暂无实时数据'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      {/* Hidden Input for Topology Upload - Moved outside conditional rendering to ensure Ref stability */}
      <input 
        type="file" 
        ref={topologyInputRef}
        onChange={handleTopologyUpload}
        accept="image/*"
        className="hidden" 
      />
    </div>
  );
};

export default DigitalTwin;


import React, { useMemo } from 'react';
import { DeviceSummary, AlarmLevel, Project } from '../types';
import { 
  Search, ArrowUpRight, SortAsc, SortDesc, 
  ChevronRight, AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle,
  LayoutGrid, PieChart, Layers, ArrowLeft, Filter,
  Waves, Zap, Thermometer, Droplets
} from 'lucide-react';

interface DashboardProps {
  devices: DeviceSummary[];
  projects: Project[];
  isDark: boolean;
  onDeviceSelect: (id: string) => void;
  // New props for state control
  viewMode: 'projects' | 'devices';
  selectedProjectId: string | null;
  onViewChange: (mode: 'projects' | 'devices', projectId: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  devices, projects, isDark, onDeviceSelect,
  viewMode, selectedProjectId, onViewChange
}) => {
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = React.useState('');

  // --- Statistics Logic (Pie Chart) ---
  const stats = useMemo(() => {
    const counts = {
      [AlarmLevel.NORMAL]: 0,
      [AlarmLevel.WARNING]: 0,
      [AlarmLevel.DANGER]: 0,
      [AlarmLevel.CRITICAL]: 0,
      [AlarmLevel.NO_DATA]: 0,
    };
    devices.forEach(d => {
      if (counts[d.status] !== undefined) counts[d.status]++;
    });
    return counts;
  }, [devices]);

  const totalDevices = devices.length;
  
  // Pie Chart Data
  const chartData = [
    { key: AlarmLevel.NORMAL, count: stats[AlarmLevel.NORMAL], color: '#22c55e', label: '正常' },
    { key: AlarmLevel.WARNING, count: stats[AlarmLevel.WARNING], color: '#facc15', label: '一级' },
    { key: AlarmLevel.DANGER, count: stats[AlarmLevel.DANGER], color: '#f97316', label: '二级' },
    { key: AlarmLevel.CRITICAL, count: stats[AlarmLevel.CRITICAL], color: '#ef4444', label: '三级' },
    { key: AlarmLevel.NO_DATA, count: stats[AlarmLevel.NO_DATA], color: '#94a3b8', label: '无数据' },
  ];

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedLength = 0;
  const segments = chartData.map(item => {
    const segmentLength = totalDevices > 0 ? (item.count / totalDevices) * circumference : 0;
    const offset = accumulatedLength;
    accumulatedLength += segmentLength;
    return { ...item, dashArray: `${segmentLength} ${circumference}`, dashOffset: -offset };
  });

  // --- Project List Logic ---
  const projectStats = useMemo(() => {
      let projs = projects.map(project => {
          const associatedDevices = devices.filter(d => d.projectId === project.id);
          const counts = {
              [AlarmLevel.NORMAL]: 0,
              [AlarmLevel.WARNING]: 0,
              [AlarmLevel.DANGER]: 0,
              [AlarmLevel.CRITICAL]: 0,
              [AlarmLevel.NO_DATA]: 0,
          };
          let maxSeverity = 0;
          let overallStatus = AlarmLevel.NORMAL;
          const severityMap = { [AlarmLevel.NO_DATA]: 0, [AlarmLevel.NORMAL]: 1, [AlarmLevel.WARNING]: 2, [AlarmLevel.DANGER]: 3, [AlarmLevel.CRITICAL]: 4 };

          if (associatedDevices.length === 0) overallStatus = AlarmLevel.NO_DATA;
          else {
              associatedDevices.forEach(d => {
                  if (counts[d.status] !== undefined) counts[d.status]++;
                  const sev = severityMap[d.status];
                  if (sev > maxSeverity) { maxSeverity = sev; overallStatus = d.status; }
              });
              if (maxSeverity === 0 && associatedDevices.length > 0) overallStatus = AlarmLevel.NO_DATA;
          }
          // Include counts in return object
          return { ...project, deviceCount: associatedDevices.length, overallStatus, counts };
      });

      if (searchTerm) {
          projs = projs.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return projs.sort((a, b) => {
          const severityMap = { [AlarmLevel.CRITICAL]: 4, [AlarmLevel.DANGER]: 3, [AlarmLevel.WARNING]: 2, [AlarmLevel.NORMAL]: 1, [AlarmLevel.NO_DATA]: 0 };
          const order = sortOrder === 'asc' ? 1 : -1;
          return (severityMap[a.overallStatus] - severityMap[b.overallStatus]) * order;
      });
  }, [devices, projects, searchTerm, sortOrder]);

  // --- Device List Logic ---
  const deviceList = useMemo(() => {
      if (!selectedProjectId) return [];
      let devs = devices.filter(d => d.projectId === selectedProjectId);
      if (searchTerm) {
          devs = devs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return devs.sort((a, b) => {
          const severityMap = { [AlarmLevel.CRITICAL]: 4, [AlarmLevel.DANGER]: 3, [AlarmLevel.WARNING]: 2, [AlarmLevel.NORMAL]: 1, [AlarmLevel.NO_DATA]: 0 };
          const order = sortOrder === 'asc' ? 1 : -1;
          return (severityMap[a.status] - severityMap[b.status]) * order;
      });
  }, [devices, selectedProjectId, searchTerm, sortOrder]);

  const getStatusConfig = (status: AlarmLevel) => {
    switch (status) {
      case AlarmLevel.CRITICAL: return { 
          className: 'bg-red-500 text-white border-red-600 shadow-md shadow-red-500/20', 
          icon: AlertOctagon, 
          label: '三级报警' 
      };
      case AlarmLevel.DANGER: return { 
          className: 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20', 
          icon: AlertOctagon, 
          label: '二级报警' 
      };
      case AlarmLevel.WARNING: return { 
          className: 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md shadow-yellow-500/20', 
          icon: AlertOctagon, 
          label: '一级报警' 
      };
      case AlarmLevel.NO_DATA: return { 
          className: 'bg-slate-100 text-slate-500 border-slate-200', 
          icon: HelpCircle, 
          label: '暂无数据' 
      };
      default: return { 
          className: 'bg-green-500 text-white border-green-600 shadow-md shadow-green-500/20', 
          icon: CheckCircle2, 
          label: '正常运行' 
      };
    }
  };

  const selectedProjectName = projects.find(p => p.id === selectedProjectId)?.name;

  const handleBackToProjects = () => {
      onViewChange('projects', null);
      setSearchTerm('');
  };

  const handleProjectClick = (projectId: string) => {
      onViewChange('devices', projectId);
      setSearchTerm('');
  };

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden text-slate-800`}>
      
      {/* Top Section: Overview Card */}
      <div className="flex-shrink-0 p-4 pb-2">
          <div className={`rounded-2xl p-5 flex items-center justify-between shadow-lg border relative overflow-hidden bg-white border-gray-100`}>
              
              {/* Left Side: Legend */}
              <div className="flex-1 z-10 flex flex-col h-full justify-between pr-4">
                  <h2 className="text-xs font-bold opacity-60 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <PieChart size={14} /> 全部设备状态概览
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                      {chartData.filter(d => d.count > 0).map(d => (
                          <div key={d.key} className={`flex items-center justify-between px-3 py-2 rounded-lg border bg-slate-50 border-gray-100`}>
                              <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: d.color, color: d.color }}></div>
                                  <span className={`text-xs font-bold opacity-80 text-slate-600`}>{d.label}</span>
                              </div>
                              <span className={`text-sm font-black text-slate-900`}>{d.count}</span>
                          </div>
                      ))}
                  </div>
              </div>
              
              {/* Right Side: Pie Chart with Center Text */}
              <div className="relative w-32 h-32 flex-shrink-0 z-10">
                  <div className={`absolute inset-0 rounded-full border-[10px] opacity-10 border-black`}></div>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90 relative">
                      <circle cx="50" cy="50" r={radius} fill="transparent" stroke={'#f1f5f9'} strokeWidth="12" strokeLinecap="round" />
                      {segments.map((seg, i) => (
                          seg.count > 0 && <circle key={i} cx="50" cy="50" r={radius} fill="transparent" stroke={seg.color} strokeWidth="12" strokeDasharray={seg.dashArray} strokeDashoffset={seg.dashOffset} strokeLinecap="round" />
                      ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className={`text-3xl font-black tracking-tight leading-none text-slate-900`}>
                          {totalDevices}
                      </span>
                      <span className="text-[9px] font-bold opacity-50 uppercase tracking-widest mt-0.5">台设备</span>
                  </div>
              </div>
              
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>
      </div>

      {/* Control Bar */}
      <div className="px-4 py-2 flex items-center gap-3 flex-shrink-0">
          {viewMode === 'devices' && (
              <button 
                onClick={handleBackToProjects}
                className={`p-3 rounded-xl border transition-all bg-white border-gray-200 text-slate-600 hover:bg-gray-50`}
              >
                  <ArrowLeft size={18} />
              </button>
          )}
          
          <div className={`flex-1 flex items-center px-4 py-3 rounded-xl border bg-white border-gray-200`}>
              <Search size={16} className="opacity-40 mr-2" />
              <input 
                  type="text" 
                  placeholder={viewMode === 'projects' ? "搜索项目..." : "搜索设备..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`bg-transparent outline-none text-xs w-full font-medium placeholder-slate-400 text-slate-900`}
              />
          </div>

          <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className={`p-3 rounded-xl border transition-all bg-white border-gray-200 text-slate-600 hover:bg-gray-50`}
          >
              {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
          </button>
      </div>

      {/* List Header */}
      <div className="px-5 py-2 text-xs font-bold opacity-50 uppercase flex justify-between items-center text-slate-600">
          <span>{viewMode === 'projects' ? '项目列表' : selectedProjectName}</span>
          <span>{viewMode === 'projects' ? projectStats.length : deviceList.length} 项</span>
      </div>

      {/* Scrollable List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-20 space-y-3">
          {viewMode === 'projects' ? (
              // Project List - New Design
              projectStats.map(project => {
                  const total = project.deviceCount;
                  const getPercent = (count: number) => total > 0 ? (count / total) * 100 : 0;
                  
                  return (
                      <div 
                          key={project.id}
                          onClick={() => handleProjectClick(project.id)}
                          className="p-5 rounded-2xl border bg-white border-gray-100 shadow-sm active:bg-gray-50 transition-all active:scale-[0.99]"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-black text-base text-slate-900 truncate">{project.name}</div>
                                  <div className="text-xs text-slate-400 mt-1 truncate">{project.description}</div>
                              </div>
                              <div className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                  <Layers size={12} className="opacity-50" />
                                  <span className="text-xs font-bold">{total} <span className="text-[10px] opacity-60 font-normal">台</span></span>
                              </div>
                          </div>

                          {/* Status Statistics Bar */}
                          {total > 0 ? (
                            <>
                              <div className="h-2.5 w-full rounded-full flex overflow-hidden mb-3 bg-slate-100">
                                  {project.counts[AlarmLevel.CRITICAL] > 0 && <div style={{width: `${getPercent(project.counts[AlarmLevel.CRITICAL])}%`}} className="bg-red-500 h-full"/>}
                                  {project.counts[AlarmLevel.DANGER] > 0 && <div style={{width: `${getPercent(project.counts[AlarmLevel.DANGER])}%`}} className="bg-orange-500 h-full"/>}
                                  {project.counts[AlarmLevel.WARNING] > 0 && <div style={{width: `${getPercent(project.counts[AlarmLevel.WARNING])}%`}} className="bg-yellow-400 h-full"/>}
                                  {project.counts[AlarmLevel.NORMAL] > 0 && <div style={{width: `${getPercent(project.counts[AlarmLevel.NORMAL])}%`}} className="bg-green-500 h-full"/>}
                                  {project.counts[AlarmLevel.NO_DATA] > 0 && <div style={{width: `${getPercent(project.counts[AlarmLevel.NO_DATA])}%`}} className="bg-slate-300 h-full"/>}
                              </div>

                              {/* Detailed Statistics Row */}
                              <div className="flex items-center gap-4 text-xs overflow-x-auto no-scrollbar">
                                   {project.counts[AlarmLevel.CRITICAL] > 0 && (
                                       <div className="flex items-center gap-1.5 font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                                           <div className="w-1.5 h-1.5 rounded-full bg-red-500"/> 三级 {project.counts[AlarmLevel.CRITICAL]}
                                       </div>
                                   )}
                                   {project.counts[AlarmLevel.DANGER] > 0 && (
                                       <div className="flex items-center gap-1.5 font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                                           <div className="w-1.5 h-1.5 rounded-full bg-orange-500"/> 二级 {project.counts[AlarmLevel.DANGER]}
                                       </div>
                                   )}
                                   {project.counts[AlarmLevel.WARNING] > 0 && (
                                       <div className="flex items-center gap-1.5 font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                                           <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"/> 一级 {project.counts[AlarmLevel.WARNING]}
                                       </div>
                                   )}
                                   {project.counts[AlarmLevel.NORMAL] > 0 && (
                                       <div className="flex items-center gap-1.5 font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                                           <div className="w-1.5 h-1.5 rounded-full bg-green-500"/> 正常 {project.counts[AlarmLevel.NORMAL]}
                                       </div>
                                   )}
                                   {project.counts[AlarmLevel.NO_DATA] > 0 && (
                                       <div className="flex items-center gap-1.5 font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                                           <div className="w-1.5 h-1.5 rounded-full bg-slate-400"/> 无数据 {project.counts[AlarmLevel.NO_DATA]}
                                       </div>
                                   )}
                              </div>
                            </>
                          ) : (
                              <div className="flex items-center gap-2 text-xs opacity-40 bg-slate-50 p-2 rounded-lg justify-center">
                                  <HelpCircle size={14} /> 暂无关联设备
                              </div>
                          )}
                      </div>
                  );
              })
          ) : (
              // Device List - Enhanced with Signal Values (Font size reduced as requested)
              deviceList.map(device => {
                  const statusConfig = getStatusConfig(device.status);
                  return (
                      <div 
                          key={device.id}
                          onClick={() => onDeviceSelect(device.id)}
                          className={`p-4 rounded-xl border flex flex-col gap-4 transition-all active:scale-[0.98] bg-white border-gray-100 shadow-sm active:bg-gray-50`}
                      >
                          {/* Header: Icon, Name, Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100`}>
                                    {device.customImage ? (
                                        <img src={device.customImage} className="w-full h-full object-cover" alt="dev" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><LayoutGrid size={18} className="opacity-20" /></div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className={`font-bold text-sm truncate text-slate-900`}>{device.name}</div>
                                    <div className="text-xs opacity-50 mt-0.5 truncate">{device.station}</div>
                                </div>
                            </div>
                            
                            {/* Prominent Status Badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${statusConfig.className}`}>
                                {React.createElement(statusConfig.icon, { size: 14, strokeWidth: 2.5 })}
                                <span>{statusConfig.label}</span>
                            </div>
                          </div>
                          
                          {/* Data Grid: UHF, TEV, Temp, Humidity - Smaller Fonts */}
                          <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold mb-0">UHF 局放</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <Waves size={12} className="text-blue-500 self-center" strokeWidth={2.5}/>
                                        <span className="text-sm font-black text-slate-800">{device.uhf_amp}</span>
                                        <span className="text-[10px] text-slate-400 font-bold scale-90 origin-left">dBmV</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold mb-0">TEV 局放</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <Zap size={12} className="text-purple-500 self-center" strokeWidth={2.5}/>
                                        <span className="text-sm font-black text-slate-800">{device.tev_amp}</span>
                                        <span className="text-[10px] text-slate-400 font-bold scale-90 origin-left">dBmV</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold mb-0">环境温度</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <Thermometer size={12} className="text-orange-500 self-center" strokeWidth={2.5}/>
                                        <span className="text-sm font-black text-slate-800">{device.temp}</span>
                                        <span className="text-[10px] text-slate-400 font-bold scale-90 origin-left">°C</span>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-400 font-bold mb-0">环境湿度</span>
                                    <div className="flex items-baseline gap-1.5">
                                        <Droplets size={12} className="text-cyan-500 self-center" strokeWidth={2.5}/>
                                        <span className="text-sm font-black text-slate-800">{device.humidity}</span>
                                        <span className="text-[10px] text-slate-400 font-bold scale-90 origin-left">%</span>
                                    </div>
                                </div>
                          </div>
                      </div>
                  )
              })
          )}
          
          {((viewMode === 'projects' && projectStats.length === 0) || (viewMode === 'devices' && deviceList.length === 0)) && (
              <div className="py-20 text-center opacity-30 flex flex-col items-center">
                  <Filter size={32} className="mb-2" />
                  <span className="text-sm font-bold">暂无数据</span>
              </div>
          )}
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useState, useMemo, useEffect } from 'react';
import { Project, ConfigDevice, ConfigSensor, AlarmLevel } from '../types';
import { 
  FileOutput, Calendar, Check, ChevronRight, Search, 
  Database, HardDrive, Radio, Waves, Clock, Download, 
  Filter, AlertCircle, Info, ChevronDown, ShieldCheck, Activity, HardDriveDownload
} from 'lucide-react';

interface DataExportProps {
  isDark: boolean;
  projects: Project[];
  devices: ConfigDevice[];
  sensors: ConfigSensor[];
}

// 定义状态选项及其显示配置
const STATUS_OPTIONS = [
  { level: AlarmLevel.NORMAL, label: '正常', color: '#22c55e' },
  { level: AlarmLevel.WARNING, label: '一级', color: '#facc15' },
  { level: AlarmLevel.DANGER, label: '二级', color: '#f97316' },
  { level: AlarmLevel.CRITICAL, label: '三级', color: '#ef4444' },
  { level: AlarmLevel.NO_DATA, label: '无数据', color: '#94a3b8' },
];

const DataExport: React.FC<DataExportProps> = ({ isDark, projects, devices, sensors }) => {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
  
  // 修改：原本的 selectedModalities 替换为 selectedStatuses
  const [selectedStatuses, setSelectedStatuses] = useState<AlarmLevel[]>(STATUS_OPTIONS.map(o => o.level));
  
  const [timeRange, setTimeRange] = useState({ start: '', end: '' });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [estimatedSize, setEstimatedSize] = useState<string>('0 B');

  // 级联选择逻辑：选择项目时自动选择其下所有设备和测点
  const handleProjectToggle = (pid: string) => {
    const isSelected = selectedProjectIds.includes(pid);
    const pDevices = devices.filter(d => d.projectId === pid).map(d => d.id);
    const pSensors = sensors.filter(s => s.projectId === pid).map(s => s.id);

    if (isSelected) {
      setSelectedProjectIds(prev => prev.filter(id => id !== pid));
      setSelectedDeviceIds(prev => prev.filter(id => !pDevices.includes(id)));
      setSelectedSensorIds(prev => prev.filter(id => !pSensors.includes(id)));
    } else {
      setSelectedProjectIds(prev => [...prev, pid]);
      setSelectedDeviceIds(prev => Array.from(new Set([...prev, ...pDevices])));
      setSelectedSensorIds(prev => Array.from(new Set([...prev, ...pSensors])));
    }
  };

  const handleDeviceToggle = (did: string) => {
    const isSelected = selectedDeviceIds.includes(did);
    const dSensors = sensors.filter(s => s.deviceId === did).map(s => s.id);

    if (isSelected) {
      setSelectedDeviceIds(prev => prev.filter(id => id !== did));
      setSelectedSensorIds(prev => prev.filter(id => !dSensors.includes(id)));
    } else {
      setSelectedDeviceIds(prev => [...prev, did]);
      setSelectedSensorIds(prev => Array.from(new Set([...prev, ...dSensors])));
    }
  };

  const handleSensorToggle = (sid: string) => {
    setSelectedSensorIds(prev => 
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  // 状态多选切换逻辑
  const handleStatusToggle = (level: AlarmLevel) => {
    setSelectedStatuses(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  // 快捷时间段选择
  const handlePresetTime = (days: number) => {
      const end = new Date();
      const start = new Date();
      if (days === 1) {
          // 过去24h (今天)
          // start.setDate(end.getDate() - 1); // 如果定义为昨天到今天，解开此注释
      } else {
          start.setDate(end.getDate() - (days - 1));
      }
      
      const formatDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
      };

      setTimeRange({
          start: formatDate(start),
          end: formatDate(end)
      });
  };

  // 计算预估数据量
  useEffect(() => {
      if (selectedSensorIds.length === 0 || !timeRange.start || !timeRange.end) {
          setEstimatedSize('0 B');
          return;
      }

      const start = new Date(timeRange.start).getTime();
      const end = new Date(timeRange.end).getTime();
      
      if (isNaN(start) || isNaN(end) || start > end) {
          setEstimatedSize('0 B');
          return;
      }

      // 计算天数 (包含首尾)
      const diffDays = Math.floor((end - start) / (1000 * 3600 * 24)) + 1;
      
      // 假设模型：
      // 1个测点 1天产生约 2MB 数据 (原始波形+特征值)
      // 如果只选了特定状态，假设数据分布：正常(90%), 异常(10%)
      const basePerSensorDay = 2 * 1024 * 1024; // 2MB
      
      // 简单的状态比例因子
      let statusFactor = 0;
      if (selectedStatuses.includes(AlarmLevel.NORMAL)) statusFactor += 0.9;
      // 其他所有异常状态加起来算 0.1 (粗略估计)
      const abnormalStatuses = [AlarmLevel.WARNING, AlarmLevel.DANGER, AlarmLevel.CRITICAL];
      const hasAbnormal = abnormalStatuses.some(s => selectedStatuses.includes(s));
      if (hasAbnormal) statusFactor += 0.1;
      
      // 修正：如果只选了异常没选正常，且无异常数据，可能为0，这里给个最小值避免显示0
      statusFactor = Math.max(statusFactor, 0.01); 

      // 总大小 = 测点数 * 天数 * 单日基准 * 状态因子
      const totalBytes = selectedSensorIds.length * diffDays * basePerSensorDay * statusFactor;

      // 格式化
      if (totalBytes < 1024) setEstimatedSize(`${totalBytes.toFixed(0)} B`);
      else if (totalBytes < 1024 * 1024) setEstimatedSize(`${(totalBytes / 1024).toFixed(1)} KB`);
      else if (totalBytes < 1024 * 1024 * 1024) setEstimatedSize(`${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
      else setEstimatedSize(`${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`);

  }, [selectedSensorIds.length, timeRange, selectedStatuses]);

  const triggerExport = () => {
    if (selectedSensorIds.length === 0 || selectedStatuses.length === 0) return;
    setIsExporting(true);
    setExportProgress(0);
    
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            alert(`导出任务已完成！\n包含 ${selectedSensorIds.length} 个测点，共 ${estimatedSize} 数据。`);
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  return (
    <div className={`w-full flex flex-col p-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className={`text-2xl font-black mb-1 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FileOutput className="text-blue-500" /> 数据导出中心
          </h1>
          <p className="text-sm opacity-60 font-medium">按需定制原始监测数据包，支持根据设备健康状态进行多级筛选</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 items-start">
        
        {/* 左侧：树形结构选择区域 - Allow natural expansion */}
        <div className={`w-1/2 flex flex-col rounded-xl border overflow-hidden ${isDark ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className={`px-4 py-3 border-b flex justify-between items-center ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <Database size={16} className="text-blue-500" />
              <span className="text-xs font-black uppercase tracking-widest">组织机构与资产选择</span>
            </div>
            <span className="text-[10px] opacity-50 font-bold">已选 {selectedSensorIds.length} 个测点</span>
          </div>

          <div className="p-4">
            {projects.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center opacity-30 italic text-sm">
                <Info size={40} className="mb-2" />
                请先在接入配置中添加项目
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map(project => (
                  <div key={project.id} className="space-y-1">
                    <div className="flex items-center gap-2 group">
                      <button 
                        onClick={() => handleProjectToggle(project.id)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${selectedProjectIds.includes(project.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-500/50'}`}
                      >
                        {selectedProjectIds.includes(project.id) && <Check size={12} />}
                      </button>
                      <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleProjectToggle(project.id)}>
                        <ChevronDown size={14} className="opacity-30" />
                        <span className="text-sm font-black">{project.name}</span>
                      </div>
                    </div>

                    {/* Devices */}
                    <div className="ml-7 space-y-2 pt-1">
                      {devices.filter(d => d.projectId === project.id).map(device => (
                        <div key={device.id} className="space-y-1">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDeviceToggle(device.id)}
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedDeviceIds.includes(device.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-500/50'}`}
                            >
                              {selectedDeviceIds.includes(device.id) && <Check size={10} />}
                            </button>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleDeviceToggle(device.id)}>
                              <HardDrive size={14} className="text-slate-500" />
                              <span className="text-xs font-bold opacity-80">{device.name}</span>
                            </div>
                          </div>

                          {/* Sensors */}
                          <div className="ml-6 space-y-1 border-l border-dashed border-slate-500/20 pl-4">
                            {sensors.filter(s => s.deviceId === device.id).map(sensor => (
                              <div key={sensor.id} className="flex items-center gap-2 py-0.5">
                                <button 
                                  onClick={() => handleSensorToggle(sensor.id)}
                                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${selectedSensorIds.includes(sensor.id) ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-500/50'}`}
                                >
                                  {selectedSensorIds.includes(sensor.id) && <Check size={8} />}
                                </button>
                                <span className={`text-[11px] font-medium cursor-pointer ${selectedSensorIds.includes(sensor.id) ? 'text-cyan-400 font-bold' : 'opacity-60'}`} onClick={() => handleSensorToggle(sensor.id)}>
                                  {sensor.name} <span className="text-[9px] opacity-40">({sensor.sn})</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：筛选参数与时段配置 - Sticky or just flow */}
        <div className="w-1/2 flex flex-col gap-6 sticky top-0">
          
          {/* 设备状态筛选 */}
          <div className={`p-5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-500" /> 设备状态筛选
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {STATUS_OPTIONS.map(opt => {
                const isSelected = selectedStatuses.includes(opt.level);
                return (
                  <button
                    key={opt.level}
                    onClick={() => handleStatusToggle(opt.level)}
                    className={`px-4 py-3 rounded-lg text-xs font-bold transition-all border flex items-center gap-3
                      ${isSelected 
                        ? (isDark ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-700') 
                        : (isDark ? 'bg-slate-900 border-slate-700 opacity-40 hover:opacity-100' : 'bg-white border-gray-200 opacity-60 hover:opacity-100')
                      }`}
                  >
                    <div className="relative flex items-center justify-center w-3 h-3">
                         <div className={`absolute w-full h-full rounded-full opacity-30 ${isSelected && opt.level !== AlarmLevel.NO_DATA ? 'animate-pulse' : ''}`} style={{ backgroundColor: opt.color }}></div>
                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }}></div>
                    </div>
                    <span className="flex-1 text-left">{opt.label}</span>
                    {isSelected && <Check size={14} className="opacity-70" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 时间范围配置 */}
          <div className={`p-5 rounded-xl border flex-1 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> 数据时段配置
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] opacity-40 font-black uppercase tracking-tighter">开始日期</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-3 opacity-30" />
                    <input 
                      type="date" 
                      value={timeRange.start}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg text-xs border outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800'}`} 
                      onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] opacity-40 font-black uppercase tracking-tighter">结束日期</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-3 opacity-30" />
                    <input 
                      type="date" 
                      value={timeRange.end}
                      className={`w-full pl-10 pr-4 py-2 rounded-lg text-xs border outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800'}`} 
                      onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {[
                    { label: '过去24h', days: 1 }, 
                    { label: '最近7天', days: 7 }, 
                    { label: '最近30天', days: 30 }
                ].map(btn => (
                  <button 
                    key={btn.label} 
                    onClick={() => handlePresetTime(btn.days)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-slate-600 hover:text-black'}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              
              {/* 数据量统计提示 */}
              <div className={`mt-4 p-3 rounded-lg flex items-center justify-between border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                  <div className="flex items-center gap-2">
                      <HardDriveDownload size={14} className="text-blue-500" />
                      <span className="text-xs font-bold opacity-80">预估数据量</span>
                  </div>
                  <span className={`text-sm font-black font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                      {estimatedSize}
                  </span>
              </div>

            </div>
          </div>

          <button 
            onClick={triggerExport}
            disabled={isExporting || selectedSensorIds.length === 0 || selectedStatuses.length === 0 || !timeRange.start || !timeRange.end}
            className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-3 transition-all relative overflow-hidden shadow-xl
              ${isExporting ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/20'}
              ${(selectedSensorIds.length === 0 || selectedStatuses.length === 0 || !timeRange.start) ? 'opacity-50 grayscale cursor-not-allowed' : ''}
            `}
          >
            {isExporting && (
              <div className="absolute inset-0 bg-blue-400/20 h-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
            )}
            <div className="relative z-10 flex items-center gap-3">
              {isExporting ? <Clock size={20} className="animate-spin" /> : <Download size={20} />}
              {isExporting ? `正在生成导出包 (${exportProgress}%)` : '开始数据导出'}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataExport;

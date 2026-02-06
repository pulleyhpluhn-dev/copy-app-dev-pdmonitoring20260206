
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { ChartDataPoint, AlarmLevel, SensorData } from '../types';
import { 
  Thermometer, Zap, Activity, ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle, Calendar, ChevronDown, Waves, Droplets, AudioWaveform, Layers, Radio
} from 'lucide-react';

interface TrendAnalysisProps {
  isDark: boolean;
  sensorName: string;
  sensorId: string;
  sensorSn?: string;
  deviceName?: string;
  projectName?: string;
  onBack: () => void;
  deviceStatus?: AlarmLevel;
  uhfValue?: number;
  tevValue?: number;
  tempValue?: number;
  humidityValue?: number;
  onChartClick?: (point: ChartDataPoint, sensorInfo?: { name: string, sn: string }) => void;
  sensors?: SensorData[];
}

type TimeRange = '24h' | '7d' | '1m' | 'custom';
type TabType = 'electrical' | 'environmental';

const generateData = (range: TimeRange): ChartDataPoint[] => {
  const points = range === '24h' ? 24 : (range === '7d' ? 7 : 30); 
  const data: ChartDataPoint[] = [];
  const now = new Date();
  const interval = range === '24h' ? 3600 * 1000 : 24 * 3600 * 1000;

  for (let i = 0; i < points; i++) {
      const time = new Date(now.getTime() - (points - i) * interval);
      data.push({
          time: time.toISOString(),
          uhf_amp: Math.random() * 40 + 20,
          tev_amp: Math.random() * 30 + 10,
          hfct_amp: Math.random() * 50 + 10,
          ae_amp: Math.random() * 20 + 5,
          uhf_freq: Math.random() * 100,
          tev_freq: Math.random() * 100,
          hfct_freq: Math.random() * 50,
          ae_freq: Math.random() * 20,
          temperature: 25 + Math.random() * 5,
          humidity: 60 + Math.random() * 10,
          isAlarm: Math.random() > 0.9 // Random alarm for demo
      });
  }
  return data;
};

// Modified: Unified icon for all sensors
const SensorIcon = () => {
    return (
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-400 flex items-center justify-center shadow-md border border-gray-300 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center border-2 border-gray-600 shadow-inner">
                <Radio size={14} className="text-white" strokeWidth={2.5} />
            </div>
        </div>
    );
};

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ 
    isDark, sensorName, sensorId, sensorSn, deviceName, projectName, onBack, deviceStatus = AlarmLevel.NORMAL,
    uhfValue = 0, tevValue = 0, tempValue = 0, humidityValue = 0,
    onChartClick, sensors = []
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [activeTab, setActiveTab] = useState<TabType>('electrical');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  // Sort sensors by status severity: Critical > Danger > Warning > Normal > No Data
  const sortedSensors = useMemo(() => {
    const severityMap: Record<AlarmLevel, number> = {
      [AlarmLevel.CRITICAL]: 4,
      [AlarmLevel.DANGER]: 3,
      [AlarmLevel.WARNING]: 2,
      [AlarmLevel.NORMAL]: 1,
      [AlarmLevel.NO_DATA]: 0,
    };
    return [...sensors].sort((a, b) => severityMap[b.status] - severityMap[a.status]);
  }, [sensors]);

  // Default selection: Select the first sensor when list loads
  useEffect(() => {
      if (sortedSensors.length > 0 && !selectedSensorId) {
          setSelectedSensorId(sortedSensors[0].id);
      }
  }, [sortedSensors, selectedSensorId]);

  // Generate data when TimeRange OR SelectedSensor changes (Simulation of refresh)
  useEffect(() => {
    setChartData(generateData(timeRange));
  }, [timeRange, selectedSensorId]);

  // Robust click handler that can deal with both Chart state and direct payload
  const handleChartClick = (data: any, event?: any) => {
      if (!onChartClick) return;

      const currentSensor = sensors.find(s => s.id === selectedSensorId);
      const info = currentSensor ? { name: currentSensor.name, sn: currentSensor.sn } : undefined;

      // Case 1: Click from AreaChart wrapper (provides state with activePayload)
      if (data && data.activePayload && data.activePayload.length > 0) {
          onChartClick(data.activePayload[0].payload as ChartDataPoint, info);
          return;
      }
      
      // Case 2: Click directly on a dot (payload is passed directly)
      if (data && data.payload && (data.payload.uhf_amp !== undefined || data.payload.time !== undefined)) {
           // It's a payload object directly
           onChartClick(data.payload as ChartDataPoint, info);
           return;
      }

      // Case 3: Fallback for some Recharts versions where payload is data directly
      if (data && (data.uhf_amp !== undefined || data.time !== undefined)) {
          onChartClick(data as ChartDataPoint, info);
      }
  };

  return (
    <div className={`w-full h-full flex flex-col bg-gray-50 dark:bg-[#000000] ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
      
      {/* Mobile Page Header */}
      <div className={`px-4 py-3 flex items-center gap-3 flex-shrink-0 z-10 border-b transition-colors ${isDark ? 'bg-[#000000] border-white/10' : 'bg-white border-gray-100'}`}>
          <button 
            onClick={onBack}
            className={`p-1.5 rounded-xl border transition-all ${isDark ? 'bg-[#151515] border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-slate-600'}`}
          >
              <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
              <h2 className={`font-black text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{sensorName}</h2>
              <p className="text-[10px] opacity-50 truncate">{projectName}</p>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 pb-20">
          
          {/* Controls: Tab Switcher & Time Range */}
          <div className="flex flex-col gap-2">
             <div className="flex justify-between items-center px-1">
                 
                 {/* Type Tabs */}
                 <div className={`flex p-0.5 rounded-lg border ${isDark ? 'bg-[#151515] border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                     <button
                        onClick={() => setActiveTab('electrical')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'electrical' ? (isDark ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') : 'opacity-60 hover:opacity-100'}`}
                     >
                         <Zap size={12} /> 电磁和声学
                     </button>
                     <button
                        onClick={() => setActiveTab('environmental')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'environmental' ? (isDark ? 'bg-orange-600 text-white shadow-sm' : 'bg-white text-orange-600 shadow-sm') : 'opacity-60 hover:opacity-100'}`}
                     >
                         <Thermometer size={12} /> 温湿度
                     </button>
                 </div>

                 {/* Time Range */}
                 <div className={`flex p-0.5 rounded-lg border ${isDark ? 'bg-[#151515] border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                      {['24h', '7d', 'custom'].map(t => (
                          <button 
                             key={t}
                             onClick={() => setTimeRange(t as TimeRange)}
                             className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${timeRange === t ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                          >
                              {t === 'custom' ? '自定义' : t}
                              {t === 'custom' && <ChevronDown size={10} />}
                          </button>
                      ))}
                  </div>
             </div>
             
             {/* Custom Date Inputs */}
             {timeRange === 'custom' && (
                 <div className={`flex items-center gap-2 p-2 rounded-xl border animate-fadeIn ${isDark ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'}`}>
                     <div className="flex items-center gap-2 flex-1 relative">
                        <Calendar size={14} className="absolute left-2 text-slate-400" />
                        <input 
                            type="date" 
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className={`w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border bg-transparent outline-none ${isDark ? 'border-white/10 text-white' : 'border-gray-200 text-slate-700'}`}
                        />
                     </div>
                     <span className="text-xs opacity-40">-</span>
                     <div className="flex items-center gap-2 flex-1 relative">
                        <Calendar size={14} className="absolute left-2 text-slate-400" />
                        <input 
                            type="date" 
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className={`w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border bg-transparent outline-none ${isDark ? 'border-white/10 text-white' : 'border-gray-200 text-slate-700'}`}
                        />
                     </div>
                 </div>
             )}
          </div>

          {/* --- Electrical & Acoustic Charts --- */}
          {activeTab === 'electrical' && (
            <>
                {/* Chart 1: Discharge Amplitude */}
                <div 
                    className={`p-3 rounded-2xl border shadow-sm transition-colors ${isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'} hover:border-blue-400 cursor-pointer group`}
                >
                    <div className="flex items-center gap-2 mb-2 pointer-events-none">
                        <div className={`p-1 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            <Zap size={14} />
                        </div>
                        <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>局放幅值趋势 (dBmV)</span>
                        <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full ml-auto opacity-0 group-hover:opacity-100 transition-opacity">点击详情</span>
                    </div>
                    {/* Reduced height to h-32 (128px) to save space */}
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} onClick={handleChartClick}>
                                <defs>
                                    <linearGradient id="colorUHF" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3}/><stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorTEV" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C084FC" stopOpacity={0.3}/><stop offset="95%" stopColor="#C084FC" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e2e8f0'} opacity={0.5} />
                                <XAxis dataKey="time" hide />
                                <YAxis tick={{fontSize: 9, fill: isDark ? '#666' : '#64748b'}} axisLine={false} tickLine={false} width={25} />
                                <Tooltip cursor={{stroke: '#38BDF8', strokeWidth: 1}} contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e2e8f0', fontSize: '12px', color: isDark ? '#f3f4f6' : '#1e293b' }} labelFormatter={() => ''} />
                                <Area 
                                    type="monotone" 
                                    dataKey="uhf_amp" 
                                    stroke="#38BDF8" 
                                    fill="url(#colorUHF)" 
                                    strokeWidth={2} 
                                    name="UHF" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#38BDF8', onClick: (e: any, payload: any) => handleChartClick(payload) }} 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="tev_amp" 
                                    stroke="#C084FC" 
                                    fill="url(#colorTEV)" 
                                    strokeWidth={2} 
                                    name="TEV" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#C084FC', onClick: (e: any, payload: any) => handleChartClick(payload) }} 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 mt-1 pointer-events-none">
                        <div className="flex items-center gap-1 text-[9px] font-bold opacity-70"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>UHF</div>
                        <div className="flex items-center gap-1 text-[9px] font-bold opacity-70"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>TEV</div>
                    </div>
                </div>

                {/* Chart 2: Discharge Frequency */}
                <div className={`p-3 rounded-2xl border shadow-sm transition-colors ${isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'} hover:border-blue-400 cursor-pointer group`}>
                    <div className="flex items-center gap-2 mb-2 pointer-events-none">
                        <div className={`p-1 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                            <Activity size={14} />
                        </div>
                        <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>局放频次趋势 (次/秒)</span>
                        <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded-full ml-auto opacity-0 group-hover:opacity-100 transition-opacity">点击详情</span>
                    </div>
                    {/* Reduced height to h-32 (128px) to save space */}
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} onClick={handleChartClick}>
                                <defs>
                                    <linearGradient id="colorUHFFreq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3}/><stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/></linearGradient>
                                    <linearGradient id="colorTEVFreq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C084FC" stopOpacity={0.3}/><stop offset="95%" stopColor="#C084FC" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e2e8f0'} opacity={0.5} />
                                <XAxis dataKey="time" hide />
                                <YAxis tick={{fontSize: 9, fill: isDark ? '#666' : '#64748b'}} axisLine={false} tickLine={false} width={25} />
                                <Tooltip cursor={{stroke: '#38BDF8', strokeWidth: 1}} contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e2e8f0', fontSize: '12px', color: isDark ? '#f3f4f6' : '#1e293b' }} labelFormatter={() => ''} />
                                <Area 
                                    type="monotone" 
                                    dataKey="uhf_freq" 
                                    stroke="#38BDF8" 
                                    fill="url(#colorUHFFreq)" 
                                    strokeWidth={2} 
                                    name="UHF" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#38BDF8', onClick: (e: any, payload: any) => handleChartClick(payload) }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="tev_freq" 
                                    stroke="#C084FC" 
                                    fill="url(#colorTEVFreq)" 
                                    strokeWidth={2} 
                                    name="TEV" 
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#C084FC', onClick: (e: any, payload: any) => handleChartClick(payload) }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 mt-1 pointer-events-none">
                        <div className="flex items-center gap-1 text-[9px] font-bold opacity-70"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div>UHF</div>
                        <div className="flex items-center gap-1 text-[9px] font-bold opacity-70"><div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>TEV</div>
                    </div>
                </div>
            </>
          )}

          {/* --- Environmental Charts --- */}
          {activeTab === 'environmental' && (
             <div className={`p-3 rounded-2xl border shadow-sm transition-colors ${isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2 pointer-events-none">
                    <div className={`p-1 rounded-lg ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                        <Thermometer size={14} />
                    </div>
                    <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>环境温湿度趋势</span>
                </div>
                {/* Reduced height to h-32 for consistency */}
                <div className="h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FB923C" stopOpacity={0.3}/><stop offset="95%" stopColor="#FB923C" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e2e8f0'} opacity={0.5} />
                            <XAxis dataKey="time" hide />
                            <YAxis tick={{fontSize: 9, fill: isDark ? '#666' : '#64748b'}} axisLine={false} tickLine={false} width={25} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e2e8f0', fontSize: '12px', color: isDark ? '#f3f4f6' : '#1e293b' }} labelFormatter={() => ''} />
                            <Area type="monotone" dataKey="temperature" stroke="#FB923C" fill="url(#colorTemp)" strokeWidth={2} name="温度 (°C)" />
                            <Area type="monotone" dataKey="humidity" stroke="#22D3EE" fillOpacity={0} strokeDasharray="3 3" strokeWidth={2} name="湿度 (%)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-3 mt-1 pointer-events-none">
                    <div className="flex items-center gap-1 text-[9px] font-bold opacity-70"><div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>温度</div>
                    <div className="flex items-center gap-1 text-[9px] font-bold opacity-70"><div className="w-1.5 h-0.5 border-t border-dashed border-cyan-400"></div>湿度</div>
                </div>
            </div>
          )}

          {/* --- Associated Sensors List (New Section) --- */}
          {/* Reduced margin top to mt-2 and padding top to pt-2 to make it visible immediately */}
          <div className="mt-2 border-t pt-2 border-gray-200/50">
              <h3 className={`text-sm font-black mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Layers size={14} className="opacity-60" /> 设备关联传感器
              </h3>
              
              <div className="space-y-2">
                  {sortedSensors.length === 0 ? (
                      <div className="text-center py-6 opacity-30 text-xs">暂无关联传感器</div>
                  ) : (
                      sortedSensors.map(sensor => (
                          <div 
                            key={sensor.id} 
                            onClick={() => setSelectedSensorId(sensor.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl shadow-sm border transition-all cursor-pointer ${
                                selectedSensorId === sensor.id 
                                ? (isDark ? 'bg-blue-600/20 border-blue-500' : 'bg-blue-50 border-blue-400') 
                                : (isDark ? 'bg-[#151515] border-slate-700 hover:border-slate-500' : 'bg-white border-gray-100 hover:border-blue-200')
                            }`}
                          >
                              <SensorIcon />
                              <div className="flex flex-col gap-1 flex-1 min-w-0">
                                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      传感器S/N: <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{sensor.sn}</span>
                                  </div>
                                  <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                      安装位置: <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{sensor.location}</span>
                                  </div>
                              </div>
                              
                              {/* Optional Status Indicator */}
                              <div className={`w-2 h-2 rounded-full ${sensor.status === AlarmLevel.NORMAL ? 'bg-green-500' : (sensor.status === AlarmLevel.NO_DATA ? 'bg-slate-300' : 'bg-red-500')}`} />
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;

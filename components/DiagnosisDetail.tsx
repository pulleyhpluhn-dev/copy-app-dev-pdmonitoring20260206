
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area, ReferenceLine, ZAxis
} from 'recharts';
import { 
  ArrowLeft, Activity, Zap, Waves, AlertCircle, Maximize2, Rotate3d, Sparkles, SlidersHorizontal, MousePointer2, Loader2,
  CheckCircle2, AlertTriangle, AlertOctagon, AudioWaveform
} from 'lucide-react';
import { ChartDataPoint } from '../types';

interface DiagnosisDetailProps {
  isDark: boolean;
  dataPoint: ChartDataPoint | null;
  sensorName: string;
  sensorSn?: string;
  onBack: () => void;
}

type ChannelType = 'UHF' | 'TEV' | 'AE' | 'HFCT';

// --- Mock Data Generators (Same as before) ---
const generatePRPDData = (seed: number, channel: ChannelType) => {
  const data = [];
  const intensity = channel === 'UHF' ? 1.5 : (channel === 'TEV' ? 1.0 : 0.8);
  const noise = channel === 'AE' ? 5 : 2;
  for (let i = 0; i < 150; i++) {
    const phase = 45 + Math.random() * 90;
    const amp = 10 + Math.random() * 40 * intensity;
    data.push({ phase, amplitude: amp, count: 1 });
  }
  for (let i = 0; i < 150; i++) {
    const phase = 225 + Math.random() * 90;
    const amp = 10 + Math.random() * 40 * intensity;
    data.push({ phase, amplitude: amp, count: 1 });
  }
  for (let i = 0; i < 50; i++) {
    data.push({ phase: Math.random() * 360, amplitude: Math.random() * 10 + noise, count: 1 });
  }
  return data;
};

const generatePulseData = (channel: ChannelType) => {
  const data = [];
  const decay = channel === 'UHF' ? 0.2 : 0.05;
  const freq = channel === 'UHF' ? 0.8 : 0.3;
  for (let t = 0; t < 200; t++) {
    const val = 100 * Math.exp(-decay * t) * Math.sin(freq * t);
    data.push({ time: t, value: val + (Math.random() - 0.5) * 5 });
  }
  return data;
};

const generateCorrelationData = (channel: ChannelType) => {
  const data = [];
  for (let i = 0; i <= 360; i += 5) {
    const sine = 50 * Math.sin((i * Math.PI) / 180);
    let discharge = null;
    if ((i > 60 && i < 120) || (i > 240 && i < 300)) {
       if (Math.random() > 0.7) discharge = Math.abs(sine) * (0.5 + Math.random() * 0.5) * (channel === 'UHF' ? 1.2 : 0.8);
    }
    data.push({ phase: i, voltage: sine, discharge });
  }
  return data;
};

// --- Sub-components ---
const PRPS3DView: React.FC<{ isDark: boolean, channel: ChannelType }> = ({ isDark, channel }) => {
    const cycles = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
        id: i, offset: i * 25, points: generatePRPDData(i, channel)
    })), [channel]);
    const colorMap = channel === 'UHF' ? '#3b82f6' : (channel === 'TEV' ? '#a855f7' : '#f97316');
    return (
        <div className="w-full h-full relative overflow-hidden perspective-1000 flex items-center justify-center bg-gradient-to-br from-transparent to-black/5">
            <div className="relative transform-3d rotate-x-60 rotate-z-20 scale-[0.6] w-64 h-64 transition-transform duration-700 hover:rotate-z-45 hover:scale-[0.65]" style={{ transformStyle: 'preserve-3d' }}>
                 <div className={`absolute inset-0 border-2 ${isDark ? 'border-slate-600 bg-slate-800/30' : 'border-slate-300 bg-slate-100/30'}`} style={{ transform: 'translateZ(-10px)' }}></div>
                 {cycles.map((cycle, idx) => (
                     <div key={cycle.id} className="absolute bottom-0 left-0 right-0 border-b pointer-events-none" style={{ height: '100%', transform: `translateZ(${cycle.offset}px)`, opacity: 0.2 + (idx / 20), borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', transformStyle: 'preserve-3d' }}>
                         {cycle.points.filter((_, i) => i % 8 === 0).map((p, i) => (
                             <div key={i} className="absolute rounded-full" style={{ left: `${(p.phase / 360) * 100}%`, bottom: `${(p.amplitude / 80) * 100}%`, width: '6px', height: '6px', backgroundColor: p.amplitude > 40 ? '#ef4444' : colorMap, boxShadow: `0 0 4px ${p.amplitude > 40 ? '#ef4444' : colorMap}`, transform: 'rotateX(-60deg)' }} />
                         ))}
                     </div>
                 ))}
                 <div className={`absolute -bottom-10 left-0 text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>0°</div>
                 <div className={`absolute -bottom-10 right-0 text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>360°</div>
            </div>
        </div>
    );
};

// --- Main Component ---
const DiagnosisDetail: React.FC<DiagnosisDetailProps> = ({ isDark, dataPoint, sensorName, sensorSn, onBack }) => {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('TEV');
  const [prpdData, setPrpdData] = useState<any[]>([]);
  const [pulseData, setPulseData] = useState<any[]>([]);
  const [corrData, setCorrData] = useState<any[]>([]);

  useEffect(() => {
    setPrpdData(generatePRPDData(Date.now(), activeChannel));
    setPulseData(generatePulseData(activeChannel));
    setCorrData(generateCorrelationData(activeChannel));
  }, [activeChannel, dataPoint]);

  // Handle null dataPoint gracefully to avoid white screen
  const safeDataPoint = dataPoint || { time: new Date().toISOString(), isAlarm: false };

  const cardClass = `rounded-2xl border flex flex-col overflow-hidden relative transition-colors duration-300 ${isDark ? 'bg-[#151e32] border-slate-700 shadow-xl' : 'bg-white border-gray-200 shadow-md'}`;
  const titleClass = `px-4 py-3 border-b flex justify-between items-center text-xs font-bold uppercase tracking-widest ${isDark ? 'border-slate-700 bg-slate-800/50 text-slate-300' : 'border-gray-100 bg-gray-50/50 text-slate-600'}`;
  
  // Stats Calculation
  const maxAmp = prpdData.length > 0 ? Math.max(...prpdData.map(d => d.amplitude)).toFixed(1) : '0.0';
  const minAmp = prpdData.length > 0 ? Math.min(...prpdData.map(d => d.amplitude)).toFixed(1) : '0.0';
  const avgAmp = prpdData.length > 0 ? (prpdData.reduce((a, b) => a + b.amplitude, 0) / prpdData.length).toFixed(1) : '0.0';

  if (!dataPoint) {
      // Show loading state if just transitioned
      return (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-4 ${isDark ? 'bg-[#0b1120] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <span className="text-sm font-bold">正在加载诊断数据...</span>
            <button onClick={onBack} className="mt-4 text-xs underline">返回趋势图</button>
        </div>
      );
  }

  return (
    <div className={`w-full h-full flex flex-col ${isDark ? 'bg-[#0b1120]' : 'bg-slate-50'}`}>
      
      {/* 1. Header with SN and Dot-style Status */}
      <div className={`px-4 py-4 flex items-center gap-3 flex-shrink-0 z-10 border-b transition-colors ${isDark ? 'bg-[#000000] border-white/10' : 'bg-white border-gray-100'}`}>
          <button 
            onClick={onBack}
            className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-[#151515] border-white/10 text-gray-300 hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-slate-600'}`}
          >
              <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
              <h2 className={`font-black text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{sensorSn || sensorName}</h2>
              <p className="text-xs opacity-50 truncate font-mono">{new Date(safeDataPoint.time).toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${safeDataPoint.isAlarm ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className={`text-xs font-bold ${safeDataPoint.isAlarm ? 'text-red-500' : 'text-green-500'}`}>
                {safeDataPoint.isAlarm ? '异常' : '正常'}
              </span>
          </div>
      </div>

      {/* 2. Compact Channel Selection (Icon + Small Text) */}
      <div className={`px-4 py-2 border-b flex-shrink-0 ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className="grid grid-cols-4 gap-2">
             {(['UHF', 'TEV', 'AE', 'HFCT'] as ChannelType[]).map(ch => {
                 const isActive = activeChannel === ch;
                 let Icon = Activity;
                 if (ch === 'UHF') Icon = Waves;
                 if (ch === 'TEV') Icon = Zap;
                 if (ch === 'AE') Icon = AudioWaveform;
                 // Colors mapping
                 const activeColorClass = ch === 'UHF' ? 'text-blue-500' : (ch === 'TEV' ? 'text-purple-500' : (ch === 'AE' ? 'text-orange-500' : 'text-cyan-500'));
                 
                 return (
                     <button
                        key={ch}
                        onClick={() => setActiveChannel(ch)}
                        className={`
                            flex flex-col items-center justify-center py-1.5 rounded-xl border transition-all duration-200
                            ${isActive 
                                ? (isDark ? 'bg-slate-800 border-slate-700 shadow-inner' : 'bg-white border-gray-200 shadow-sm') 
                                : 'border-transparent opacity-60 hover:opacity-100 hover:bg-black/5'
                            }
                        `}
                     >
                         <Icon 
                            size={18} 
                            className={`mb-0.5 transition-colors ${isActive ? activeColorClass : (isDark ? 'text-slate-400' : 'text-slate-500')}`} 
                            strokeWidth={isActive ? 2.5 : 2}
                         />
                         <span className={`text-[10px] font-bold ${isActive ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-slate-500' : 'text-slate-500')}`}>
                             {ch}
                         </span>
                     </button>
                 );
             })}
          </div>
      </div>

      {/* 3. Stats Row */}
      <div className={`px-4 py-2 border-b flex items-center justify-center gap-4 text-xs flex-shrink-0 ${isDark ? 'bg-[#0b1120] border-slate-800 text-slate-400' : 'bg-slate-50 border-gray-100 text-slate-500'}`}>
           <div className="flex items-center gap-1">最大值: <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{maxAmp}</span></div>
           <div className={`w-px h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
           <div className="flex items-center gap-1">平均值: <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{avgAmp}</span></div>
           <div className={`w-px h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
           <div className="flex items-center gap-1">最小值: <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{minAmp}</span></div>
           <div className={`w-px h-3 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
           <div className="opacity-50">单位：dBmV</div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
              
              {/* 1. PRPD Pattern */}
              <div className={cardClass}>
                  <div className={titleClass}>
                      <div className="flex items-center gap-2"><Activity size={14} className="text-blue-500"/> PRPD 相位分布图</div>
                      <div className="flex gap-2">
                          <Maximize2 size={14} className="opacity-40 cursor-pointer hover:opacity-100" />
                      </div>
                  </div>
                  <div className="flex-1 min-h-[300px] p-2 relative">
                      <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
                              <XAxis type="number" dataKey="phase" name="相位" unit="°" domain={[0, 360]} tick={{fontSize: 10}} />
                              <YAxis type="number" dataKey="amplitude" name="幅值" unit="dBmV" tick={{fontSize: 10}} />
                              <ZAxis type="number" dataKey="count" range={[20, 100]} name="频次" />
                              <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderRadius: '8px', border: '1px solid #333' }} />
                              <ReferenceLine x={180} stroke={isDark ? '#444' : '#ddd'} strokeDasharray="3 3" />
                              <ReferenceLine y={0} stroke={isDark ? '#444' : '#ddd'} />
                              <Scatter name="Discharges" data={prpdData} fill={activeChannel === 'TEV' ? '#a855f7' : '#3b82f6'} shape="circle" />
                          </ScatterChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* 2. PRPS 3D Pattern */}
              <div className={cardClass}>
                  <div className={titleClass}>
                      <div className="flex items-center gap-2"><Rotate3d size={14} className="text-purple-500"/> PRPS 三维图谱分析</div>
                  </div>
                  <div className="flex-1 min-h-[300px]">
                      <PRPS3DView isDark={isDark} channel={activeChannel} />
                  </div>
              </div>

              {/* 3. Pulse Waveform */}
              <div className={cardClass}>
                  <div className={titleClass}>
                      <div className="flex items-center gap-2"><Zap size={14} className="text-yellow-500"/> 放电脉冲波形分析</div>
                  </div>
                  <div className="flex-1 min-h-[250px] p-2">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pulseData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
                              <XAxis dataKey="time" type="number" domain={[0, 200]} tick={{fontSize: 10}} label={{ value: 'Time (ns)', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                              <YAxis tick={{fontSize: 10}} label={{ value: 'mV', position: 'insideLeft', angle: -90, offset: 10, fontSize: 10 }} />
                              <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#000' : '#fff' }} />
                              <Line type="monotone" dataKey="value" stroke="#eab308" strokeWidth={2} dot={false} animationDuration={500} />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* 4. Power Frequency Correlation */}
              <div className={cardClass}>
                  <div className={titleClass}>
                      <div className="flex items-center gap-2"><Waves size={14} className="text-cyan-500"/> 相位相关性分析</div>
                  </div>
                  <div className="flex-1 min-h-[250px] p-2">
                      <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={corrData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e5e7eb'} />
                              <XAxis dataKey="phase" unit="°" type="number" domain={[0, 360]} tick={{fontSize: 10}} />
                              <YAxis yAxisId="left" orientation="left" stroke={isDark ? '#888' : '#666'} tick={{fontSize: 10}} label={{ value: 'kV', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                              <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" tick={{fontSize: 10}} label={{ value: 'dBmV', angle: 90, position: 'insideRight', fontSize: 10 }} />
                              <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#000' : '#fff' }} />
                              <Line yAxisId="left" type="basis" dataKey="voltage" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth={1} dot={false} name="工频电压" />
                              <Scatter yAxisId="right" dataKey="discharge" fill="#0ea5e9" name="放电点" />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </div>

          </div>
          
          <div className="text-center text-[10px] opacity-30 font-mono py-8">
              -- Diagnosis End --
          </div>

      </div>
    </div>
  );
};

export default DiagnosisDetail;

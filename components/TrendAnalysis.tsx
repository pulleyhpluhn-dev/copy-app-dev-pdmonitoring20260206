
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  ComposedChart, Line, ReferenceArea
} from 'recharts';
import { ChartDataPoint, AlarmLevel, SensorData } from '../types';
import { 
  Thermometer, Zap, Activity, ArrowLeft, Calendar, Layers, Radio, Check, BarChart2, Waves, RotateCw, TrendingUp
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

type TimeRange = '24h' | '7d' | '3m' | '6m';
type TabType = 'electrical' | 'environmental';

const FREQ_COLOR = '#a855f7'; // Purple for Frequency charts

const generateData = (range: TimeRange): ChartDataPoint[] => {
  let points = 30; // Increased points for better step visualization
  let interval = 3600 * 1000; // default 1h

  switch (range) {
      case '24h': points = 24; interval = 3600 * 1000; break;
      case '7d': points = 28; interval = 6 * 3600 * 1000; break;
      case '3m': points = 90; interval = 24 * 3600 * 1000; break;
      case '6m': points = 90; interval = 48 * 3600 * 1000; break;
  }

  const data: ChartDataPoint[] = [];
  const now = new Date();

  // Create stepped data to simulate distinct "platforms" for detection
  for (let i = 0; i < points; i++) {
      const time = new Date(now.getTime() - (points - i) * interval);
      
      // Simulation Logic:
      // 1. Base noise: 15-18 dB
      // 2. First Step (Minor): At 40% timeline, jump +3dB
      // 3. Second Step (Major - Inflection): At 70% timeline, jump +8dB (Total jump > 6dB from previous plateau)
      
      let baseAmp = 15;
      let baseFreq = 50;

      if (i > points * 0.7) {
          // Major Jump (The Inflection)
          baseAmp = 26; // 18 -> 26 is an 8dB jump
          baseFreq = 120;
      } else if (i > points * 0.4) {
          // Minor Warmup
          baseAmp = 18; 
          baseFreq = 70;
      }

      // Add Random Noise (+/- 2)
      const noise = () => (Math.random() * 4) - 2;

      data.push({
          time: time.toISOString(),
          uhf_amp: Math.max(0, baseAmp + noise() + 5), // UHF slightly higher offset
          tev_amp: Math.max(0, baseAmp + noise()),
          hfct_amp: Math.random() * 50 + 10,
          ae_amp: Math.random() * 20 + 5,
          uhf_freq: Math.max(0, baseFreq + noise() * 5),
          tev_freq: Math.max(0, baseFreq * 0.8 + noise() * 5),
          hfct_freq: Math.random() * 50,
          ae_freq: Math.random() * 20,
          temperature: 25 + Math.random() * 2,
          humidity: 60 + Math.random() * 5,
          isAlarm: baseAmp > 20 
      });
  }
  return data;
};

// --- Analysis Algorithms ---

// 1. Calculate Simple Moving Average (SMA)
const calculateSMA = (data: any[], key: string, windowSize: number) => {
  return data.map((point, index) => {
    if (index < windowSize - 1) return { ...point, sma: undefined };
    const subset = data.slice(index - windowSize + 1, index + 1);
    const sum = subset.reduce((acc, curr) => acc + (curr[key] || 0), 0);
    return { ...point, sma: sum / windowSize };
  });
};

// 2. Find Inflection Point (Rule: Growth > 6dB from previous platform average)
const findInflectionPoint = (data: any[]) => {
    const validData = data.filter(d => d.sma !== undefined);
    if (validData.length < 5) return null;

    // Use a sliding check. 
    // We compare the current SMA with a "Baseline" established a few points back (simulating a previous platform).
    // If current SMA - Baseline > 6, we have a trigger.
    
    // Initialize baseline with the first valid SMA
    let baseline = validData[0].sma; 
    let inflectionTime = null;

    // We start checking a bit into the data to allow baseline to stabilize visually
    for(let i = 1; i < validData.length; i++) {
        const currentSMA = validData[i].sma;
        
        // Dynamic Baseline Update:
        // If the value is relatively stable (change < 2dB), update the baseline to follow slow drifts.
        // This ensures we catch *sudden* jumps relative to the *recent* past, not just the absolute start.
        if (Math.abs(currentSMA - baseline) < 2) {
            // Smoothly update baseline
            baseline = (baseline * 0.8) + (currentSMA * 0.2);
        }

        // CHECK RULE: Growth > 6dB
        if (currentSMA - baseline > 6) {
            inflectionTime = validData[i].time;
            break; // Stop at first major inflection for this demo
        }
    }
    return inflectionTime;
};

// 3. Generate Forecast (Linear Regression on recent trend)
const generateForecast = (data: any[], key: string, pointsToForecast = 6) => {
    const validData = data.filter(d => d.sma !== undefined);
    if (validData.length < 5) return [];

    // Use last 5 points to capture the *immediate* trend after the step
    const n = Math.min(validData.length, 5); 
    const subset = validData.slice(validData.length - n);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    subset.forEach((p, i) => {
        sumX += i;
        sumY += p.sma;
        sumXY += i * p.sma;
        sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const lastPoint = validData[validData.length - 1];
    const lastTime = new Date(lastPoint.time).getTime();
    
    // Estimate interval from last 2 points
    const prevTime = new Date(validData[validData.length - 2].time).getTime();
    const interval = lastTime - prevTime;

    const forecast = [];
    
    // Anchor point
    forecast.push({
        time: lastPoint.time,
        forecast: lastPoint.sma
    });

    for(let i = 1; i <= pointsToForecast; i++) {
        // Damping factor: reduce slope slightly over time to simulate saturation
        const damping = Math.max(0.5, 1 - (i * 0.1)); 
        const val = (slope * damping) * (n - 1 + i) + intercept;
        
        forecast.push({
            time: new Date(lastTime + interval * i).toISOString(),
            forecast: Math.max(0, val), 
            isForecast: true
        });
    }
    return forecast;
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

// --- Chart Component for Analysis Back Face ---
const AnalysisChart = ({ data, inflectionTime, forecastStartTime, color, isDark }: any) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={color} stopOpacity={0.05}/>
                        <stop offset="100%" stopColor={color} stopOpacity={0.15}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e2e8f0'} opacity={0.5} />
                <XAxis dataKey="time" hide />
                <YAxis tick={{fontSize: 9, fill: isDark ? '#666' : '#64748b'}} axisLine={false} tickLine={false} width={25} />
                <Tooltip 
                    cursor={{stroke: color, strokeWidth: 1, strokeDasharray: '3 3'}}
                    contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e2e8f0', fontSize: '12px', color: isDark ? '#f3f4f6' : '#1e293b' }}
                    labelFormatter={() => '智能分析'}
                    formatter={(val: number, name: string) => [val.toFixed(2), name === 'original' ? '原始值' : (name === 'sma' ? '移动平均' : '趋势预测')]}
                />
                
                {/* Visual Zones */}
                {forecastStartTime && (
                    <ReferenceArea x1={forecastStartTime} strokeOpacity={0} fill="url(#forecastGradient)" label={{ value: '趋势预测', position: 'insideTopRight', fill: color, fontSize: 10, opacity: 0.8 }} />
                )}
                
                {/* Inflection Point - Showing the >6dB Jump */}
                {inflectionTime && (
                     <ReferenceLine x={inflectionTime} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '突变 >6dB', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                )}

                {/* Lines */}
                {/* Original Data (Faint) */}
                <Line type="monotone" dataKey="original" stroke={isDark ? '#555' : '#ccc'} dot={false} strokeWidth={1} strokeOpacity={0.4} activeDot={false} isAnimationActive={false} />
                {/* SMA (Bold) */}
                <Line type="monotone" dataKey="sma" stroke={color} dot={false} strokeWidth={2.5} name="移动平均" animationDuration={1000} />
                {/* Forecast (Dashed) */}
                <Line type="monotone" dataKey="forecast" stroke={color} strokeDasharray="4 4" dot={false} strokeWidth={2.5} name="趋势预测" animationDuration={1000} />
                
            </ComposedChart>
        </ResponsiveContainer>
    )
};

// --- Helper Component for 3D Flip Card ---
const FlippableCard = ({ 
    isDark, 
    isFlipped, 
    onFlip, 
    title, 
    backTitle, // Added prop for back title
    icon: Icon, 
    iconColorClass,
    children,
    backContent 
}: { 
    isDark: boolean;
    isFlipped: boolean; 
    onFlip: () => void; 
    title: string; 
    backTitle?: string;
    icon: any; 
    iconColorClass: string;
    children?: React.ReactNode; 
    backContent?: React.ReactNode;
}) => {
    return (
        <div className="relative w-full h-[170px]" style={{ perspective: '1000px' }}>
            <div 
                className="w-full h-full relative transition-transform duration-700" 
                style={{ 
                    transformStyle: 'preserve-3d', 
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' 
                }}
            >
                {/* Front Face */}
                <div 
                    className={`absolute inset-0 rounded-2xl border shadow-sm transition-colors overflow-hidden
                        ${isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'}
                    `}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div className="p-3 h-full flex flex-col group relative">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 px-1 pointer-events-none">
                            <Icon size={16} className={iconColorClass} fillOpacity={0.2} />
                            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</span>
                        </div>
                        
                        {/* Flip Button */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onFlip(); }}
                            className={`absolute top-2 right-2 p-1.5 rounded-full z-20 transition-all
                                ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}
                            `}
                            title="智能分析"
                        >
                            <TrendingUp size={14} />
                        </button>

                        {/* Content */}
                        <div className="flex-1 w-full min-h-0">
                            {children}
                        </div>
                    </div>
                </div>

                {/* Back Face */}
                <div 
                    className={`absolute inset-0 rounded-2xl border shadow-sm transition-colors overflow-hidden
                        ${isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'}
                    `}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <div className="p-3 h-full flex flex-col group relative">
                        {/* Header Back */}
                        <div className="flex items-center gap-2 mb-2 px-1 pointer-events-none">
                            <TrendingUp size={16} className={iconColorClass} />
                            <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>{backTitle || '智能趋势分析'}</span>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); onFlip(); }}
                            className={`absolute top-2 right-2 p-1.5 rounded-full z-20 transition-colors
                                ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}
                            `}
                            title="返回图表"
                        >
                            <RotateCw size={14} />
                        </button>
                        
                        {/* Back Content */}
                        <div className="flex-1 w-full min-h-0">
                            {backContent || <span className={`text-sm font-bold opacity-30 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>无分析数据</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ 
    isDark, sensorName, sensorId, sensorSn, deviceName, projectName, onBack, deviceStatus = AlarmLevel.NORMAL,
    uhfValue = 0, tevValue = 0, tempValue = 0, humidityValue = 0,
    onChartClick, sensors = []
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('3m');
  const [activeTab, setActiveTab] = useState<TabType>('electrical');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  // Flip State
  const [flippedCards, setFlippedCards] = useState({ amp: false, freq: false });

  // Single select channel
  const [selectedChannel, setSelectedChannel] = useState<string>('UHF');

  // Channel Configuration
  const CHANNEL_CONFIG: Record<string, { label: string, color: string, bg: string }> = {
      UHF: { label: 'UHF', color: '#60a5fa', bg: 'bg-blue-500' },    // Blue
      TEV: { label: 'TEV', color: '#c084fc', bg: 'bg-purple-500' },  // Purple
      AE:  { label: 'AE',  color: '#818cf8', bg: 'bg-indigo-500' },  // Indigo
  };

  // Threshold Configuration
  const THRESHOLDS: Record<string, { amp: { l1: number, l2: number, l3: number }, freq: { l1: number, l2: number, l3: number } }> = {
      UHF: { amp: { l1: 35, l2: 45, l3: 55 }, freq: { l1: 50, l2: 75, l3: 90 } },
      TEV: { amp: { l1: 20, l2: 30, l3: 38 }, freq: { l1: 50, l2: 75, l3: 90 } },
      AE:  { amp: { l1: 10, l2: 15, l3: 20 }, freq: { l1: 10, l2: 15, l3: 18 } },
  };

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

  // Generate data when TimeRange changes
  useEffect(() => {
    setChartData(generateData(timeRange));
  }, [timeRange, selectedSensorId]);

  // Calculate Analysis Data Memoized
  const getAnalysisData = (dataKey: keyof ChartDataPoint) => {
      const smaData = calculateSMA(chartData, dataKey as string, 5); // Window size 5
      const inflectionTime = findInflectionPoint(smaData);
      const forecastPoints = generateForecast(smaData, 'sma');
      
      const history = smaData.map(d => ({
          time: d.time,
          original: d[dataKey],
          sma: d.sma
      }));
      
      const forecast = forecastPoints.slice(1).map(d => ({
          time: d.time,
          forecast: d.forecast
      }));

      // Merge forecast anchor point for visual continuity
      if (history.length > 0 && forecastPoints.length > 0) {
          history[history.length - 1] = {
              ...history[history.length - 1],
              forecast: history[history.length - 1].sma // Connect forecast line start to SMA end
          } as any;
      }

      return {
          fullData: [...history, ...forecast],
          inflectionTime,
          forecastStartTime: forecastPoints[0]?.time
      };
  };

  const ampAnalysis = useMemo(() => {
      const key = selectedChannel === 'UHF' ? 'uhf_amp' : (selectedChannel === 'TEV' ? 'tev_amp' : 'ae_amp');
      return getAnalysisData(key);
  }, [chartData, selectedChannel]);

  const freqAnalysis = useMemo(() => {
      const key = selectedChannel === 'UHF' ? 'uhf_freq' : (selectedChannel === 'TEV' ? 'tev_freq' : 'ae_freq');
      return getAnalysisData(key);
  }, [chartData, selectedChannel]);


  // Robust click handler that can deal with both Chart state and direct payload
  const handleChartClick = (data: any, event?: any) => {
      if (!onChartClick) return;

      const currentSensor = sensors.find(s => s.id === selectedSensorId);
      const info = currentSensor ? { name: currentSensor.name, sn: currentSensor.sn } : undefined;

      if (data && data.activePayload && data.activePayload.length > 0) {
          onChartClick(data.activePayload[0].payload as ChartDataPoint, info);
          return;
      }
      if (data && data.payload && (data.payload.uhf_amp !== undefined || data.payload.time !== undefined)) {
           onChartClick(data.payload as ChartDataPoint, info);
           return;
      }
      if (data && (data.uhf_amp !== undefined || data.time !== undefined)) {
          onChartClick(data as ChartDataPoint, info);
      }
  };

  const toggleFlip = (key: 'amp' | 'freq') => {
      setFlippedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const currentChannelConfig = CHANNEL_CONFIG[selectedChannel] || CHANNEL_CONFIG.UHF;
  const currentThresholds = THRESHOLDS[selectedChannel] || THRESHOLDS.UHF;
  
  const currentSensorStatus = useMemo(() => {
      return sensors.find(s => s.type === selectedChannel)?.status || AlarmLevel.NORMAL;
  }, [sensors, selectedChannel]);

  const visibleLevels = useMemo(() => {
      if (currentSensorStatus === AlarmLevel.CRITICAL) return ['l3'];
      if (currentSensorStatus === AlarmLevel.DANGER) return ['l2', 'l3'];
      return ['l1', 'l2', 'l3'];
  }, [currentSensorStatus]);

  // Custom Dot Renderer to show Alarm Levels
  const renderCustomDot = (props: any, isFreq: boolean) => {
      const { cx, cy, payload } = props;
      
      // Handler for direct dot click
      const handleDotClick = (e: any) => {
          e.stopPropagation();
          handleChartClick({ payload });
      };

      // Determine color: Fixed Purple for Frequency, otherwise Channel color
      const dotColor = isFreq ? FREQ_COLOR : currentChannelConfig.color;

      return (
          <circle 
            cx={cx} cy={cy} r={3} fill={isDark ? '#111' : '#fff'} 
            stroke={dotColor} strokeWidth={1.5}
            onClick={handleDotClick}
            style={{ cursor: 'pointer' }}
          />
      );
  };

  const getStatusConfig = (status: AlarmLevel) => {
      switch (status) {
          case AlarmLevel.CRITICAL: return { label: '三级', color: 'text-red-500', bg: 'bg-red-500' };
          case AlarmLevel.DANGER: return { label: '二级', color: 'text-orange-500', bg: 'bg-orange-500' };
          case AlarmLevel.WARNING: return { label: '一级', color: 'text-yellow-500', bg: 'bg-yellow-500' };
          case AlarmLevel.NORMAL: return { label: '正常', color: 'text-green-500', bg: 'bg-green-500' };
          default: return { label: '无数据', color: 'text-slate-400', bg: 'bg-slate-300' };
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
                      {['6m', '3m', '7d', '24h'].map(t => (
                          <button 
                             key={t}
                             onClick={() => setTimeRange(t as TimeRange)}
                             className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${timeRange === t ? (isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm') : 'opacity-50 hover:opacity-100'}`}
                          >
                              {t}
                          </button>
                      ))}
                  </div>
             </div>
          </div>

          {/* --- Electrical & Acoustic Charts --- */}
          {activeTab === 'electrical' && (
            <>
                {/* Channel Selector - Compact Segmented Style */}
                <div className="px-1 mt-1 mb-2">
                     <div className={`inline-flex p-0.5 rounded-lg border ${isDark ? 'bg-[#151515] border-white/10' : 'bg-gray-100 border-gray-200'}`}>
                         {Object.values(CHANNEL_CONFIG).map(ch => (
                             <button
                                key={ch.label}
                                onClick={(e) => { e.stopPropagation(); setSelectedChannel(ch.label); }}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold transition-all
                                    ${selectedChannel === ch.label
                                        ? `${ch.bg} text-white shadow-sm` 
                                        : `opacity-60 hover:opacity-100 ${isDark ? 'text-slate-400' : 'text-slate-600'}`
                                    }
                                `}
                             >
                                 {ch.label}
                             </button>
                         ))}
                     </div>
                </div>

                {/* Chart 1: Amplitude (Flippable) */}
                <FlippableCard 
                    isDark={isDark}
                    isFlipped={flippedCards.amp}
                    onFlip={() => toggleFlip('amp')}
                    title="局放幅值趋势 (dBmV)"
                    backTitle="局放幅值智能分析"
                    icon={BarChart2}
                    iconColorClass={selectedChannel === 'AE' ? 'text-indigo-500' : (selectedChannel === 'TEV' ? 'text-purple-500' : 'text-blue-500')}
                    backContent={
                        <AnalysisChart 
                            data={ampAnalysis.fullData} 
                            inflectionTime={ampAnalysis.inflectionTime}
                            forecastStartTime={ampAnalysis.forecastStartTime}
                            color={currentChannelConfig.color}
                            isDark={isDark}
                        />
                    }
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 35, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorAmp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={currentChannelConfig.color} stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor={currentChannelConfig.color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e2e8f0'} opacity={0.5} />
                            <XAxis dataKey="time" hide />
                            <YAxis tick={{fontSize: 9, fill: isDark ? '#666' : '#64748b'}} axisLine={false} tickLine={false} width={25} />
                            <Tooltip cursor={{stroke: '#38BDF8', strokeWidth: 1}} contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e2e8f0', fontSize: '12px', color: isDark ? '#f3f4f6' : '#1e293b' }} labelFormatter={() => ''} />
                            
                            {visibleLevels.includes('l1') && <ReferenceLine y={currentThresholds.amp.l1} stroke="#eab308" strokeDasharray="3 3" label={{ position: 'right', value: '一级', fill: '#eab308', fontSize: 10 }} />}
                            {visibleLevels.includes('l2') && <ReferenceLine y={currentThresholds.amp.l2} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'right', value: '二级', fill: '#f97316', fontSize: 10 }} />}
                            {visibleLevels.includes('l3') && <ReferenceLine y={currentThresholds.amp.l3} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '三级', fill: '#ef4444', fontSize: 10 }} />}
                            
                            <Area 
                                type="monotone" 
                                dataKey={selectedChannel === 'UHF' ? 'uhf_amp' : (selectedChannel === 'TEV' ? 'tev_amp' : 'ae_amp')}
                                stroke={currentChannelConfig.color}
                                strokeWidth={2} 
                                fill="url(#colorAmp)"
                                dot={(props) => renderCustomDot(props, false)}
                                activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer', onClick: (_: any, p: any) => handleChartClick({ payload: p.payload }) }}
                                animationDuration={500}
                                name="幅值"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </FlippableCard>

                {/* Chart 2: Frequency (Flippable) */}
                <div className="mt-4">
                    <FlippableCard 
                        isDark={isDark}
                        isFlipped={flippedCards.freq}
                        onFlip={() => toggleFlip('freq')}
                        title="局放频次趋势 (次/秒)"
                        backTitle="局放频次智能分析"
                        icon={Waves}
                        iconColorClass="text-purple-500" // Fixed Purple
                        backContent={
                            <AnalysisChart 
                                data={freqAnalysis.fullData} 
                                inflectionTime={null} 
                                forecastStartTime={freqAnalysis.forecastStartTime}
                                color={FREQ_COLOR} // Fixed Purple
                                isDark={isDark}
                            />
                        }
                    >
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} onClick={handleChartClick} margin={{ top: 5, right: 35, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={FREQ_COLOR} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={FREQ_COLOR} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#333' : '#e2e8f0'} opacity={0.5} />
                                <XAxis dataKey="time" hide />
                                <YAxis tick={{fontSize: 9, fill: isDark ? '#666' : '#64748b'}} axisLine={false} tickLine={false} width={25} />
                                <Tooltip cursor={{stroke: '#38BDF8', strokeWidth: 1}} contentStyle={{ backgroundColor: isDark ? '#000' : '#fff', borderColor: isDark ? '#333' : '#e2e8f0', fontSize: '12px', color: isDark ? '#f3f4f6' : '#1e293b' }} labelFormatter={() => ''} />
                                
                                {visibleLevels.includes('l1') && <ReferenceLine y={currentThresholds.freq.l1} stroke="#eab308" strokeDasharray="3 3" label={{ position: 'right', value: '一级', fill: '#eab308', fontSize: 10 }} />}
                                {visibleLevels.includes('l2') && <ReferenceLine y={currentThresholds.freq.l2} stroke="#f97316" strokeDasharray="3 3" label={{ position: 'right', value: '二级', fill: '#f97316', fontSize: 10 }} />}
                                {visibleLevels.includes('l3') && <ReferenceLine y={currentThresholds.freq.l3} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: '三级', fill: '#ef4444', fontSize: 10 }} />}

                                <Area 
                                    type="monotone" 
                                    dataKey={selectedChannel === 'UHF' ? 'uhf_freq' : (selectedChannel === 'TEV' ? 'tev_freq' : 'ae_freq')}
                                    stroke={FREQ_COLOR} // Fixed Purple
                                    strokeWidth={2} 
                                    fill="url(#colorFreq)"
                                    dot={(props) => renderCustomDot(props, true)}
                                    activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer', onClick: (_: any, p: any) => handleChartClick({ payload: p.payload }) }}
                                    animationDuration={500}
                                    name="频次"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </FlippableCard>
                </div>
            </>
          )}

          {/* --- Environmental Charts --- */}
          {activeTab === 'environmental' && (
             <div className={`p-3 rounded-2xl border shadow-sm transition-colors ${isDark ? 'bg-[#111111] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2 pointer-events-none px-1">
                    <Thermometer size={16} className="text-orange-500" />
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
                      sortedSensors.map(sensor => {
                          const statusConfig = getStatusConfig(sensor.status);
                          return (
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
                              
                              {/* Status Indicator with Text */}
                              <div className="flex items-center gap-1.5 pl-2">
                                  <div className={`w-2 h-2 rounded-full ${statusConfig.bg}`} />
                                  <span className={`text-[10px] font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                              </div>
                          </div>
                      )})
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;

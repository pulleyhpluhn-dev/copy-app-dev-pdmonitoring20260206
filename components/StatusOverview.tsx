
import React, { useMemo } from 'react';
import { DeviceSummary, AlarmLevel } from '../types';
import { Activity, AlertTriangle, CheckCircle2, AlertOctagon, HelpCircle, PieChart, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface StatusOverviewProps {
  isDark: boolean;
  devices: DeviceSummary[];
  collapsed: boolean;
  toggleCollapse: () => void;
}

const StatusOverview: React.FC<StatusOverviewProps> = ({ isDark, devices, collapsed, toggleCollapse }) => {
  const stats = useMemo(() => {
    const counts = {
      [AlarmLevel.NORMAL]: 0,
      [AlarmLevel.WARNING]: 0,
      [AlarmLevel.DANGER]: 0,
      [AlarmLevel.CRITICAL]: 0,
      [AlarmLevel.NO_DATA]: 0,
      unknown: 0
    };

    devices.forEach(d => {
      if (counts[d.status] !== undefined) {
        counts[d.status]++;
      } else {
        counts.unknown++;
      }
    });

    return counts;
  }, [devices]);

  // Determine worst status for the collapsed indicator
  const worstStatus = useMemo(() => {
     if (stats[AlarmLevel.CRITICAL] > 0) return AlarmLevel.CRITICAL;
     if (stats[AlarmLevel.DANGER] > 0) return AlarmLevel.DANGER;
     if (stats[AlarmLevel.WARNING] > 0) return AlarmLevel.WARNING;
     return AlarmLevel.NORMAL;
  }, [stats]);

  const total = devices.length;

  // Chart configuration
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  
  const chartData = [
    { key: AlarmLevel.NORMAL, count: stats[AlarmLevel.NORMAL], color: '#22c55e', label: '正常' },
    { key: AlarmLevel.WARNING, count: stats[AlarmLevel.WARNING], color: '#facc15', label: '一级' },
    { key: AlarmLevel.DANGER, count: stats[AlarmLevel.DANGER], color: '#f97316', label: '二级' },
    { key: AlarmLevel.CRITICAL, count: stats[AlarmLevel.CRITICAL], color: '#ef4444', label: '三级' },
    { key: AlarmLevel.NO_DATA, count: stats[AlarmLevel.NO_DATA], color: '#94a3b8', label: '无数据' },
  ];

  let accumulatedLength = 0;
  const segments = chartData.map(item => {
    const segmentLength = total > 0 ? (item.count / total) * circumference : 0;
    const offset = accumulatedLength;
    accumulatedLength += segmentLength;
    return {
      ...item,
      dashArray: `${segmentLength} ${circumference}`,
      dashOffset: -offset
    };
  });

  const getIcon = (key: string) => {
      switch(key) {
          case AlarmLevel.NORMAL: return <CheckCircle2 size={16} className="text-green-500" />;
          case AlarmLevel.WARNING: return <Activity size={16} className="text-yellow-500" />;
          case AlarmLevel.DANGER: return <AlertTriangle size={16} className="text-orange-500" />;
          case AlarmLevel.CRITICAL: return <AlertOctagon size={16} className="text-red-500" />;
          case AlarmLevel.NO_DATA: return <HelpCircle size={16} className="text-slate-400" />;
          default: return <HelpCircle size={16} className="text-slate-400" />;
      }
  };

  const getCollapsedIndicatorClass = (status: AlarmLevel) => {
      switch(status) {
          case AlarmLevel.CRITICAL: return 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse';
          case AlarmLevel.DANGER: return 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)] animate-pulse';
          case AlarmLevel.WARNING: return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]';
          default: return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]';
      }
  };

  return (
    <div className={`h-full flex flex-col border-l transition-all duration-300 ease-in-out ${collapsed ? 'w-12' : 'w-72'} ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
      {/* Header */}
      <div className={`p-3 border-b flex items-center ${collapsed ? 'justify-center' : 'justify-between'} ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
        {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap animate-fadeIn">
                <PieChart size={18} className="text-blue-500 flex-shrink-0" />
                <h3 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>所有项目设备状态总览</h3>
            </div>
        )}
        <button 
            onClick={toggleCollapse}
            className={`p-1 rounded-md transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-slate-500'}`}
            title={collapsed ? "展开面板" : "折叠面板"}
        >
            {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        
        {collapsed ? (
            // Collapsed View
            <div className="h-full flex flex-col items-center pt-8 gap-4 animate-fadeIn">
                {/* Vertical Text */}
                <div 
                    className={`writing-vertical text-xs font-bold tracking-widest opacity-60 select-none flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`} 
                    style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
                >
                    设备状态
                </div>
                
                {/* Worst Status Indicator */}
                <div 
                    className={`w-3 h-3 rounded-full mt-auto mb-6 ${getCollapsedIndicatorClass(worstStatus)}`}
                    title={`全站状态: ${worstStatus === AlarmLevel.NORMAL ? '正常' : '异常'}`}
                ></div>
            </div>
        ) : (
            // Expanded View (Full Content)
            <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-6 animate-fadeIn">
                {/* Chart Section */}
                <div className="flex flex-col items-center justify-center py-2">
                    <div className="relative w-32 h-32">
                        <svg width="100%" height="100%" viewBox="0 0 80 80" className="transform -rotate-90">
                            <circle cx="40" cy="40" r={radius} fill="transparent" stroke={isDark ? '#1e293b' : '#f1f5f9'} strokeWidth="8" />
                            {segments.map((seg, i) => (
                                seg.count > 0 && (
                                    <circle 
                                        key={i} 
                                        cx="40" cy="40" r={radius} 
                                        fill="transparent" 
                                        stroke={seg.color} 
                                        strokeWidth="8" 
                                        strokeDasharray={seg.dashArray} 
                                        strokeDashoffset={seg.dashOffset} 
                                        strokeLinecap="round" 
                                        className="transition-all duration-1000 ease-out"
                                    />
                                )
                            ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{total}</span>
                            <span className="text-[9px] opacity-50 uppercase font-bold tracking-widest">设备总数</span>
                        </div>
                    </div>
                </div>

                {/* Legend / List */}
                <div className="space-y-3">
                    {chartData.map((item) => (
                        <div key={item.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-opacity-10`} style={{ backgroundColor: item.color }}>
                                    {getIcon(item.key)}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{item.label}</span>
                                    <span className="text-[10px] opacity-50">占比 {total > 0 ? Math.round((item.count / total) * 100) : 0}%</span>
                                </div>
                            </div>
                            <span className="font-mono font-bold text-lg" style={{ color: item.color }}>{item.count}</span>
                        </div>
                    ))}
                </div>

                {/* Critical Devices Preview */}
                {stats[AlarmLevel.CRITICAL] > 0 || stats[AlarmLevel.DANGER] > 0 ? (
                    <div className="pt-4 border-t border-dashed border-gray-500/20 animate-fadeIn">
                        <h4 className={`text-xs font-bold mb-3 flex items-center gap-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            <AlertTriangle size={12} /> 重点关注设备
                        </h4>
                        <div className="space-y-2">
                            {devices
                                .filter(d => d.status === AlarmLevel.CRITICAL || d.status === AlarmLevel.DANGER)
                                .slice(0, 3)
                                .map(d => (
                                    <div key={d.id} className={`p-2 rounded-lg border text-xs flex justify-between items-center ${isDark ? 'bg-red-500/5 border-red-500/20 text-slate-300' : 'bg-red-50 border-red-100 text-slate-700'}`}>
                                        <span className="truncate max-w-[140px]">{d.name}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${d.status === AlarmLevel.CRITICAL ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                                            {d.status === AlarmLevel.CRITICAL ? '三级' : '二级'}
                                        </span>
                                    </div>
                                ))
                            }
                            {(stats[AlarmLevel.CRITICAL] + stats[AlarmLevel.DANGER]) > 3 && (
                                <div className="text-center text-[10px] opacity-50 pt-1">
                                    ... 还有 {(stats[AlarmLevel.CRITICAL] + stats[AlarmLevel.DANGER]) - 3} 台异常设备
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className={`p-4 rounded-xl border text-center ${isDark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-100'}`}>
                        <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
                        <p className={`text-xs font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>全站设备运行平稳</p>
                        <p className="text-[10px] opacity-60 mt-1">未发现明显局放异常信号</p>
                    </div>
                )}
            </div>
        )}

      </div>

      {/* Footer Info */}
      {!collapsed && (
        <div className={`p-3 border-t text-[10px] text-center opacity-40 whitespace-nowrap overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            System Status: Online
        </div>
      )}
    </div>
  );
};

export default StatusOverview;

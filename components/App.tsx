
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DigitalTwin from './components/DigitalTwin';
import TrendAnalysis from './components/TrendAnalysis';
import Dashboard from './components/Dashboard';
import FloatingAssistant from './components/FloatingAssistant';
import StatusOverview from './components/StatusOverview';
import AccessConfig from './components/AccessConfig';
import DataExport from './components/DataExport';
import SystemSettings from './components/SystemSettings';
import Login from './components/Login';
import DiagnosisDetail from './components/DiagnosisDetail';
import { Theme, ViewMode, PDSource, SensorData, DeviceSummary, Project, ConfigDevice, ConfigSensor, IPC, User, ChartDataPoint } from './types';
import { MOCK_DEVICES, MOCK_PROJECTS, getDeviceSimulation } from './constants';
import { GripHorizontal } from 'lucide-react';

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusCollapsed, setStatusCollapsed] = useState(false); // Default expanded (false = open)
  
  // -- Auth State --
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard'); 
  
  // -- Diagnosis Drill-down State --
  const [selectedDiagnosisPoint, setSelectedDiagnosisPoint] = useState<ChartDataPoint | null>(null);

  // -- AI Chat State --
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // -- Device State with Persistence --
  const [devices, setDevices] = useState<DeviceSummary[]>(() => {
    const saved = localStorage.getItem('pd_dashboard_devices');
    return saved ? JSON.parse(saved) : MOCK_DEVICES;
  });

  const [currentDeviceId, setCurrentDeviceId] = useState(devices[0]?.id || MOCK_DEVICES[0].id);

  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('pd_dashboard_devices', JSON.stringify(devices));
  }, [devices]);

  // -- Config Persistence --
  const [configProjects, setConfigProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_projects');
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });
  const [configDevices, setConfigDevices] = useState<ConfigDevice[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_devices');
    return saved ? JSON.parse(saved) : [];
  });
  const [configIpcs, setConfigIpcs] = useState<IPC[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_ipcs');
    return saved ? JSON.parse(saved) : [];
  });
  const [configSensors, setConfigSensors] = useState<ConfigSensor[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_sensors');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('pd_config_v5_projects', JSON.stringify(configProjects)); }, [configProjects]);
  useEffect(() => { localStorage.setItem('pd_config_v5_devices', JSON.stringify(configDevices)); }, [configDevices]);
  useEffect(() => { localStorage.setItem('pd_config_v5_ipcs', JSON.stringify(configIpcs)); }, [configIpcs]);
  useEffect(() => { localStorage.setItem('pd_config_v5_sensors', JSON.stringify(configSensors)); }, [configSensors]);

  const [simulationState, setSimulationState] = useState<{ sensors: SensorData[], pdSource: PDSource | null }>({
    sensors: [],
    pdSource: null
  });

  const handleUpdateDeviceImage = (deviceId: string, imageData: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, customImage: imageData } : d));
  };

  useEffect(() => {
    const simData = getDeviceSimulation(currentDeviceId);
    setSimulationState(simData);
  }, [currentDeviceId]);

  const [activeSensorId, setActiveSensorId] = useState<string>('node-0');
  const [activeSensorName, setActiveSensorName] = useState<string>('GIS本体综合监测终端');
  const [activeSensorSn, setActiveSensorSn] = useState<string>('S-01');

  const [splitRatio, setSplitRatio] = useState(50); 
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const middleColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only auto-collapse the left navigation sidebar on small screens, 
    // keep StatusOverview (right sidebar) expanded by default as requested.
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarCollapsed(true);
      }
    };
    if (window.innerWidth < 1280) {
        setSidebarCollapsed(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizingSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
  };

  const stopResizing = () => {
    setIsResizingSplit(false);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSplit && middleColumnRef.current) {
        const rect = middleColumnRef.current.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const rawPercentage = (relativeY / rect.height) * 100;
        setSplitRatio(Math.min(Math.max(rawPercentage, 20), 80));
    }
  };

  useEffect(() => {
    if (isResizingSplit) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingSplit]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  const handleSensorSelect = (id: string, name?: string, sn?: string) => {
      setActiveSensorId(id);
      if (name) {
          setActiveSensorName(name);
      }
      if (sn) {
          setActiveSensorSn(sn);
      }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.permissions.length > 0 && !user.permissions.includes('dashboard')) {
        setCurrentView(user.permissions[0] as ViewMode);
    } else {
        setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleChartPointClick = (point: ChartDataPoint) => {
      setSelectedDiagnosisPoint(point);
      setCurrentView('diagnosis-detail');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  // Get current device and project info
  const currentDeviceObj = devices.find(d => d.id === currentDeviceId);
  const currentProjectObj = configProjects.find(p => p.id === currentDeviceObj?.projectId);

  return (
    <div className={`${isDark ? 'dark' : ''} h-screen w-screen overflow-hidden flex flex-col`}>
      <div className={`flex flex-1 overflow-hidden transition-colors duration-300 ${isDark ? 'bg-tech-dark text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
        {/* Left Sidebar (Navigation) */}
        <div className="flex-shrink-0 z-20">
          <Sidebar 
            theme={theme} 
            toggleTheme={toggleTheme} 
            collapsed={sidebarCollapsed}
            toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentView={currentView} 
            onNavigate={(view) => setCurrentView(view)}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAiChat={() => setIsAiChatOpen(true)}
          />
        </div>

        {/* Middle Content Area */}
        <div ref={middleColumnRef} className="flex-1 flex flex-col p-4 min-w-0 overflow-hidden relative">
          {currentView === 'dashboard' ? (
             <div className={`w-full h-full rounded-xl overflow-hidden shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
                <Dashboard 
                  devices={devices} 
                  projects={configProjects}
                  isDark={isDark} 
                  onDeviceSelect={(id) => { setCurrentDeviceId(id); setCurrentView('diagnosis'); }} 
                  onUpdateDeviceImage={handleUpdateDeviceImage} 
                />
             </div>
          ) : currentView === 'config' ? (
            <div className={`w-full h-full rounded-xl overflow-hidden shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
               <AccessConfig 
                  isDark={isDark} 
                  projects={configProjects} setProjects={setConfigProjects}
                  devices={configDevices} setDevices={setConfigDevices}
                  ipcs={configIpcs} setIpcs={setConfigIpcs}
                  sensors={configSensors} setSensors={setConfigSensors}
               />
            </div>
          ) : currentView === 'export' ? (
            <div className={`w-full h-full rounded-xl overflow-hidden shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
               <DataExport 
                  isDark={isDark} 
                  projects={configProjects} 
                  devices={configDevices} 
                  sensors={configSensors} 
               />
            </div>
          ) : currentView === 'settings' ? (
            <div className={`w-full h-full rounded-xl overflow-hidden shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
               <SystemSettings isDark={isDark} />
            </div>
          ) : currentView === 'diagnosis-detail' ? (
            <div className={`w-full h-full rounded-xl overflow-hidden shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
              <DiagnosisDetail 
                 isDark={isDark} 
                 dataPoint={selectedDiagnosisPoint} 
                 sensorName={activeSensorName}
                 onBack={() => setCurrentView('diagnosis')}
              />
            </div>
          ) : (
            // Default Diagnosis/Twin View
            <>
              <div className="w-full min-h-0 transition-[height] duration-75 ease-linear" style={{ height: `${splitRatio}%` }}>
                <DigitalTwin 
                  sensors={simulationState.sensors} 
                  pdSource={simulationState.pdSource} 
                  isDark={isDark} 
                  activeSensorId={activeSensorId} 
                  onSensorSelect={handleSensorSelect} 
                  devices={devices} 
                  projects={configProjects}
                  currentDeviceId={currentDeviceId} 
                  onDeviceChange={setCurrentDeviceId}
                />
              </div>
              <div className={`w-full h-3 cursor-row-resize flex items-center justify-center z-30 flex-shrink-0 group hover:scale-y-110 transition-transform my-1 ${isResizingSplit ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} onMouseDown={startResizingSplit}>
                  <div className={`w-32 h-1.5 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-700 group-hover:bg-blue-500' : 'bg-gray-300 group-hover:bg-blue-400'}`}>
                      <GripHorizontal size={12} className={`opacity-50 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                  </div>
              </div>
              <div className="flex-1 min-h-0 w-full overflow-hidden">
                <TrendAnalysis 
                  isDark={isDark} 
                  sensorName={activeSensorName} 
                  sensorId={activeSensorId} 
                  sensorSn={activeSensorSn}
                  deviceName={currentDeviceObj?.name}
                  projectName={currentProjectObj?.name}
                  onChartClick={handleChartPointClick}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar (Status Overview) */}
        <div className="flex-shrink-0 z-20">
            <StatusOverview 
                isDark={isDark} 
                devices={devices} 
                collapsed={statusCollapsed}
                toggleCollapse={() => setStatusCollapsed(!statusCollapsed)}
            />
        </div>
      </div>

      {/* Central Draggable AI Assistant Window */}
      <FloatingAssistant 
        isDark={isDark} 
        isOpen={isAiChatOpen} 
        onClose={() => setIsAiChatOpen(false)} 
      />
    </div>
  );
}

export default App;

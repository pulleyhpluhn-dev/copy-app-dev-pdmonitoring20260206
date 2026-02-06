
import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import TrendAnalysis from './components/TrendAnalysis';
import DiagnosisDetail from './components/DiagnosisDetail';
import Login from './components/Login';
import { User, DeviceSummary, Project, ChartDataPoint } from './types';
import { MOCK_DEVICES, MOCK_PROJECTS, getDeviceSimulation } from './constants';
import { LogOut } from 'lucide-react';

const DEFAULT_USER: User = {
  id: 'mobile-user',
  username: 'mobile',
  displayName: '移动端用户',
  role: 'operator',
  permissions: ['dashboard', 'diagnosis'],
  status: 'active',
  createdAt: new Date().toISOString()
};

function App() {
  // Enforce Light Mode
  const isDark = false; 
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_USER);
  
  // Mobile View State: 'home' | 'detail' | 'diagnosis-detail'
  const [currentView, setCurrentView] = useState<'home' | 'detail' | 'diagnosis-detail'>('home');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDiagnosisPoint, setSelectedDiagnosisPoint] = useState<ChartDataPoint | null>(null);
  const [diagnosisSensorInfo, setDiagnosisSensorInfo] = useState<{name: string, sn: string} | null>(null);

  // -- Dashboard Navigation State --
  // Lifted from Dashboard to App to persist state when switching between Home/Detail views
  const [dashboardViewMode, setDashboardViewMode] = useState<'projects' | 'devices'>('projects');
  const [dashboardProjectId, setDashboardProjectId] = useState<string | null>(null);

  // -- Device State --
  const [devices, setDevices] = useState<DeviceSummary[]>(() => {
    const saved = localStorage.getItem('pd_dashboard_devices');
    return saved ? JSON.parse(saved) : MOCK_DEVICES;
  });

  const [projects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_projects');
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });

  useEffect(() => {
    localStorage.setItem('pd_dashboard_devices', JSON.stringify(devices));
  }, [devices]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView('home');
  };

  const handleLogout = () => {
    // Reset to Home/Login state
    setCurrentView('home');
    setSelectedDeviceId(null);
    setDashboardViewMode('projects');
    setDashboardProjectId(null);
    // Uncomment below if real logout is needed
    // setCurrentUser(null);
  };

  const handleDeviceSelect = (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      setCurrentView('detail');
  };

  const handleBackToHome = () => {
      setCurrentView('home');
      setSelectedDeviceId(null);
      // We do NOT reset dashboardViewMode here, so it stays on 'devices' list if that's where we came from
  };

  const handleChartPointClick = (point: ChartDataPoint, sensorInfo?: { name: string, sn: string }) => {
      setSelectedDiagnosisPoint(point);
      if (sensorInfo) {
          setDiagnosisSensorInfo(sensorInfo);
      } else {
          setDiagnosisSensorInfo(null);
      }
      setCurrentView('diagnosis-detail');
  };

  const handleBackToTrend = () => {
      setCurrentView('detail');
      setSelectedDiagnosisPoint(null);
      setDiagnosisSensorInfo(null);
  };

  const handleDashboardViewChange = (mode: 'projects' | 'devices', projectId: string | null) => {
      setDashboardViewMode(mode);
      setDashboardProjectId(projectId);
  };

  const handleUpdateDeviceImage = (deviceId: string, imageData: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, customImage: imageData } : d));
  };

  // Get current device info for detail view
  const currentDeviceObj = devices.find(d => d.id === selectedDeviceId);
  const currentProjectObj = projects.find(p => p.id === currentDeviceObj?.projectId);

  // Retrieve sensors for the selected device for Trend Analysis
  const detailSensors = useMemo(() => {
    if (!selectedDeviceId) return [];
    return getDeviceSimulation(selectedDeviceId).sensors;
  }, [selectedDeviceId]);

  // Determine SN to show in diagnosis detail: prioritized specific sensor SN, fallback to Device ID snippet
  const detailSn = diagnosisSensorInfo?.sn || (currentDeviceObj?.id.substring(0,8) || 'UNKNOWN');

  if (!currentUser) {
      return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col bg-slate-50 text-slate-900`}>
      {/* Mobile App Header Removed as per request */}
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
          {currentView === 'home' ? (
             <Dashboard 
                devices={devices} 
                projects={projects} 
                isDark={isDark} 
                onDeviceSelect={handleDeviceSelect}
                viewMode={dashboardViewMode}
                selectedProjectId={dashboardProjectId}
                onViewChange={handleDashboardViewChange}
             />
          ) : currentView === 'detail' ? (
             <TrendAnalysis 
                isDark={isDark} 
                sensorName={currentDeviceObj?.name || '未知设备'} 
                sensorId={selectedDeviceId || ''} 
                sensorSn={currentDeviceObj?.id.substring(0,8) || 'UNKNOWN'}
                deviceName={currentDeviceObj?.name}
                projectName={currentProjectObj?.name}
                onBack={handleBackToHome}
                deviceStatus={currentDeviceObj?.status}
                uhfValue={currentDeviceObj?.uhf_amp}
                tevValue={currentDeviceObj?.tev_amp}
                tempValue={currentDeviceObj?.temp}
                humidityValue={currentDeviceObj?.humidity}
                onChartClick={handleChartPointClick}
                sensors={detailSensors}
             />
          ) : (
             <DiagnosisDetail 
                isDark={isDark}
                dataPoint={selectedDiagnosisPoint}
                sensorName={currentDeviceObj?.name || '未知设备'} // Kept for reference but header uses SN
                sensorSn={detailSn}
                onBack={handleBackToTrend}
             />
          )}
      </div>
    </div>
  );
}

export default App;

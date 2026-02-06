
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  FolderTree, 
  Cpu, 
  HardDrive, 
  Settings2, 
  Save, 
  Trash2, 
  ChevronRight, 
  Info, 
  CheckCircle2, 
  Search,
  Box,
  Radio,
  Network,
  AlertCircle,
  X,
  Upload,
  Download,
  ImageIcon,
  Pencil,
  Activity,
  MapPin,
  Waves,
  Check,
  Layers,
  Eye,
  GitBranch,
  Database,
  FileJson,
  Scan,     
  Loader2,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { Project, ConfigDevice, IPC, ConfigSensor, SensorChannel } from '../types';

interface AccessConfigProps {
  isDark: boolean;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  devices: ConfigDevice[];
  setDevices: React.Dispatch<React.SetStateAction<ConfigDevice[]>>;
  ipcs: IPC[];
  setIpcs: React.Dispatch<React.SetStateAction<IPC[]>>;
  sensors: ConfigSensor[];
  setSensors: React.Dispatch<React.SetStateAction<ConfigSensor[]>>;
}

type TabType = 'projects' | 'devices' | 'ipcs' | 'sensors';

const AVAILABLE_CHANNELS = ['UHF', 'TEV', 'HFCT1', 'HFCT2', 'AE', '温度', '湿度'];

const TopologyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  project: Project;
  devices: ConfigDevice[];
  ipcs: IPC[];
  sensors: ConfigSensor[];
  onImport: (data: any) => void;
}> = ({ isOpen, onClose, isDark, project, devices, ipcs, sensors, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const projectDevices = devices.filter(d => d.projectId === project.id);
  const projectSensors = sensors.filter(s => s.projectId === project.id);
  const projectIpcIds = new Set(projectSensors.map(s => s.ipcId));
  const projectIpcs = ipcs.filter(i => projectIpcIds.has(i.id));

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      project: project,
      devices: projectDevices,
      sensors: projectSensors,
      ipcs: projectIpcs
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${project.name}_config.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImport(json);
      } catch (err) {
        alert('导入失败：文件格式错误');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-6 animate-fadeIn">
      <div className={`w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-800/50' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <FileJson size={22} />
             </div>
             <div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>项目配置文件</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{project.name}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={handleExport}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isDark ? 'bg-slate-800 border-slate-600 text-blue-400 hover:bg-slate-700' : 'bg-white border-gray-300 text-blue-600 hover:bg-gray-50'}`}
             >
                <Download size={14} /> 配置文件导出
             </button>
             <button 
                onClick={handleImportClick}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isDark ? 'bg-slate-800 border-slate-600 text-emerald-400 hover:bg-slate-700' : 'bg-white border-gray-300 text-emerald-600 hover:bg-gray-50'}`}
             >
                <Upload size={14} /> 配置文件导入
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

             <div className={`w-px h-6 mx-2 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>

             <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}>
                <X size={24} />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-10">
            {[
              { label: '关联设备', count: projectDevices.length, icon: HardDrive, color: 'text-blue-500' },
              { label: '关联工控机', count: projectIpcs.length, icon: Cpu, color: 'text-purple-500' },
              { label: '传感节点', count: projectSensors.length, icon: Radio, color: 'text-cyan-500' },
              { label: '采集通道', count: projectSensors.reduce((acc, s) => acc + s.channels.length, 0), icon: Waves, color: 'text-emerald-500' },
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                <stat.icon size={16} className={`${stat.color} mb-2`} />
                <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.count}</div>
                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-8 relative">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                   <FolderTree size={24} />
                </div>
                <div className="flex flex-col">
                   <span className="text-xs opacity-50 font-bold">根项目</span>
                   <span className="font-black text-lg">{project.name}</span>
                </div>
             </div>

             {projectDevices.map((dev) => {
               const devSensors = projectSensors.filter(s => s.deviceId === dev.id);
               return (
                <div key={dev.id} className="ml-6 pl-10 border-l-2 border-dashed border-blue-500/20 relative py-2">
                   <div className="absolute left-0 top-1/2 w-8 h-0.5 bg-blue-500/20"></div>
                   <div className={`p-4 rounded-xl border flex flex-col gap-4 ${isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                      <div className="flex items-center gap-3">
                         <HardDrive size={18} className="text-blue-500" />
                         <span className="font-bold text-sm">设备: {dev.name}</span>
                         <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-bold border border-blue-500/20">{dev.deviceType}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {devSensors.map(sen => {
                          const ipc = projectIpcs.find(i => i.id === sen.ipcId);
                          return (
                            <div key={sen.id} className={`p-3 rounded-lg border flex flex-col gap-2 ${isDark ? 'bg-black/20 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                               <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                     <Radio size={14} className="text-cyan-500" />
                                     <span className="text-xs font-bold">{sen.name}</span>
                                  </div>
                                  <span className="text-[9px] font-mono opacity-40">{sen.sn}</span>
                               </div>
                               <div className="flex items-center gap-4 text-[10px]">
                                  <div className="flex items-center gap-1 opacity-60">
                                     <Cpu size={10} /> {ipc?.name || '未关联IPC'}
                                  </div>
                                  <div className="flex items-center gap-1 text-blue-500 font-bold">
                                     <Waves size={10} /> {sen.channels.length} 通道
                                  </div>
                               </div>
                            </div>
                          )
                        })}
                      </div>
                   </div>
                </div>
               );
             })}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccessConfig: React.FC<AccessConfigProps> = ({ 
  isDark,
  projects, setProjects,
  devices, setDevices,
  ipcs, setIpcs,
  sensors, setSensors
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [ipError, setIpError] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isReadingSensor, setIsReadingSensor] = useState(false);
  const [sensorTypeRead, setSensorTypeRead] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const [viewingChannelsSensor, setViewingChannelsSensor] = useState<ConfigSensor | null>(null);
  const [topologyProject, setTopologyProject] = useState<Project | null>(null);

  const cardClass = `flex flex-col p-5 rounded-xl border transition-all duration-300 min-h-[260px] ${isDark ? 'bg-slate-800/40 border-slate-700 hover:border-blue-500/50' : 'bg-white border-gray-200 hover:shadow-lg hover:border-blue-300'}`;
  const inputClass = `w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600'}`;
  const labelClass = `block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  const validateIP = (ip: string) => {
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    let hasError = false;

    if (activeTab === 'projects') {
      if (!formData.name?.trim()) { errors.name = true; hasError = true; }
    } else if (activeTab === 'devices') {
      if (!formData.projectId) { errors.projectId = true; hasError = true; }
      if (!formData.image) { errors.image = true; hasError = true; }
    } else if (activeTab === 'ipcs') {
      if (!formData.name?.trim()) { errors.name = true; hasError = true; }
    } else if (activeTab === 'sensors') {
      if (!formData.sn?.trim()) { errors.sn = true; hasError = true; }
      if (!formData.ipcId) { errors.ipcId = true; hasError = true; }
      if (!formData.projectId) { errors.projectId = true; hasError = true; }
      if (!formData.deviceId) { errors.deviceId = true; hasError = true; }
    }

    setFormErrors(errors);
    return !hasError;
  };

  const handleSave = () => {
    setIpError(false);
    
    if (!validateForm()) return;

    if (activeTab === 'ipcs' && !validateIP(formData.ip)) {
      setIpError(true);
      return;
    }
    
    setIsSaving(true);
    
    setTimeout(() => {
      if (editingId) {
        if (activeTab === 'projects') setProjects(prev => prev.map(p => p.id === editingId ? { ...formData, id: editingId } : p));
        if (activeTab === 'devices') setDevices(prev => prev.map(d => d.id === editingId ? { ...formData, id: editingId } : d));
        if (activeTab === 'ipcs') setIpcs(prev => prev.map(i => i.id === editingId ? { ...formData, id: editingId } : i));
        if (activeTab === 'sensors') setSensors(prev => prev.map(s => s.id === editingId ? { ...formData, id: editingId } : s));
      } else {
        const id = Math.random().toString(36).substr(2, 9);
        if (activeTab === 'projects') setProjects([...projects, { ...formData, id, createdAt: new Date().toISOString() }]);
        if (activeTab === 'devices') setDevices([...devices, { ...formData, id }]);
        if (activeTab === 'ipcs') setIpcs([...ipcs, { ...formData, id }]);
        if (activeTab === 'sensors') {
          setSensors([...sensors, { ...formData, id, status: 'Unknown' }]);
        }
      }
      
      setIsSaving(false);
      setShowForm(false);
      setFormData({});
      setEditingId(null);
      setIpError(false);
      setFormErrors({});
    }, 400);
  };

  const startEdit = (tab: TabType, id: string) => {
    setEditingId(id);
    setFormErrors({});
    setIpError(false);
    let item: any = null;
    if (tab === 'projects') item = projects.find(p => p.id === id);
    if (tab === 'devices') item = devices.find(d => d.id === id);
    if (tab === 'ipcs') item = ipcs.find(i => i.id === id);
    if (tab === 'sensors') {
        item = sensors.find(s => s.id === id);
        setSensorTypeRead(true);
    }
    
    if (item) {
      setFormData({ ...item });
      setShowForm(true);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除此配置项吗？相关关联信息将无法撤销。')) return;
    if (activeTab === 'projects') setProjects(prev => prev.filter(p => p.id !== id));
    if (activeTab === 'devices') setDevices(prev => prev.filter(d => d.id !== id));
    if (activeTab === 'ipcs') setIpcs(prev => prev.filter(i => i.id !== id));
    if (activeTab === 'sensors') setSensors(prev => prev.filter(s => s.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
        if (formErrors.image) setFormErrors({ ...formErrors, image: false });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSensorChannel = (channelType: string) => {
    const currentChannels: SensorChannel[] = formData.channels || [];
    const exists = currentChannels.find(c => c.type === channelType);
    
    if (exists) {
      setFormData({
        ...formData,
        channels: currentChannels.filter(c => c.type !== channelType)
      });
    } else {
      setFormData({
        ...formData,
        channels: [...currentChannels, { type: channelType, location: '' }]
      });
    }
  };

  const updateChannelLocation = (channelType: string, location: string) => {
    const currentChannels: SensorChannel[] = formData.channels || [];
    setFormData({
      ...formData,
      channels: currentChannels.map(c => c.type === channelType ? { ...c, location } : c)
    });
  };

  const handleReadSensorType = () => {
    setReadError(null);
    if (!formData.sn) {
        setReadError("请输入传感节点SN，以便系统识别通信协议");
        return;
    }
    let detectionType = formData.type;
    setIsReadingSensor(true);
    setSensorTypeRead(false);
    
    setTimeout(() => {
        setIsReadingSensor(false);
        setSensorTypeRead(true);
        if (!detectionType) {
            const sn = formData.sn.toUpperCase();
            if (sn.includes('A2')) detectionType = 'SFPD-A2';
            else if (sn.includes('B1')) detectionType = 'SFPD-B1';
            else if (sn.includes('B2')) detectionType = 'SFPD-B2';
            else detectionType = 'SFPD-A1'; // Default
        }
        let detectedChannels: string[] = [];
        if (detectionType === 'SFPD-A1') detectedChannels = ['UHF', 'TEV'];
        else if (detectionType === 'SFPD-A2') detectedChannels = ['HFCT1', 'HFCT2'];
        else if (detectionType === 'SFPD-B1') detectedChannels = ['AE', 'UHF'];
        else if (detectionType === 'SFPD-B2') detectedChannels = ['温度', '湿度'];
        else detectedChannels = ['UHF']; // Default

        const newChannels = detectedChannels.map(type => ({ type, location: '' }));
        setFormData(prev => ({ 
            ...prev, 
            type: detectionType, 
            channels: newChannels 
        }));
        
    }, 2500);
  };

  const handleImportConfig = (data: any) => {
     if (!data || typeof data !== 'object') {
         alert('无效的配置文件');
         return;
     }
     const { project: newProject, devices: newDevices, sensors: newSensors, ipcs: newIpcs } = data;
     
     let importedCount = 0;

     // Restore Project Info if valid and ID matches
     if (newProject && newProject.id) {
         setProjects(prev => prev.map(p => p.id === newProject.id ? { ...p, ...newProject } : p));
     }

     if (Array.isArray(newIpcs)) {
         setIpcs(prev => {
             const map = new Map(prev.map(item => [item.id, item]));
             newIpcs.forEach((item: IPC) => map.set(item.id, item));
             return Array.from(map.values());
         });
         importedCount += newIpcs.length;
     }
     if (Array.isArray(newDevices)) {
         setDevices(prev => {
             const map = new Map(prev.map(item => [item.id, item]));
             newDevices.forEach((item: ConfigDevice) => map.set(item.id, item));
             return Array.from(map.values());
         });
         importedCount += newDevices.length;
     }
     if (Array.isArray(newSensors)) {
         setSensors(prev => {
             const map = new Map(prev.map(item => [item.id, item]));
             newSensors.forEach((item: ConfigSensor) => map.set(item.id, item));
             return Array.from(map.values());
         });
         importedCount += newSensors.length;
     }
     if (importedCount > 0) {
         alert(`成功导入配置！\n已更新项目信息及 ${importedCount} 项关联资产数据。`);
         // Keep modal open to show updated stats
     } else {
         alert('配置文件中未包含有效的资产数据');
     }
  };

  const getTabLabel = (id: TabType) => {
    switch (id) {
      case 'projects': return '项目';
      case 'devices': return '设备';
      case 'ipcs': return '工控机';
      case 'sensors': return '传感节点';
      default: return '';
    }
  };

  const EmptyState = ({ title, desc, icon: Icon }: any) => (
    <div className="flex flex-col items-center justify-center py-20 opacity-40">
      <div className={`p-6 rounded-full mb-4 ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
        <Icon size={48} />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-sm max-w-xs text-center">{desc}</p>
    </div>
  );

  return (
    <div className={`w-full flex flex-col p-6 animate-fadeIn ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      {topologyProject && (
        <TopologyModal 
          isOpen={!!topologyProject}
          onClose={() => setTopologyProject(null)}
          isDark={isDark}
          project={topologyProject}
          devices={devices}
          ipcs={ipcs}
          sensors={sensors}
          onImport={handleImportConfig}
        />
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-black mb-1 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Box className="text-blue-500" /> 接入配置管理
          </h1>
          <p className="text-sm opacity-60 font-medium">维护资产拓扑、链路映射及现场采集点布局</p>
        </div>
        <button 
          onClick={() => { 
              setShowForm(true); 
              setFormData({ channels: [] }); 
              setEditingId(null); 
              setIpError(false); 
              setFormErrors({});
              setSensorTypeRead(false);
              setReadError(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
        >
          <Plus size={20} /> 新增{getTabLabel(activeTab)}
        </button>
      </div>

      <div className={`flex gap-1 p-1 rounded-xl mb-6 w-fit border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-100 border-gray-200'}`}>
        {[
          { id: 'projects', label: '项目管理', icon: FolderTree },
          { id: 'devices', label: '设备资产', icon: HardDrive },
          { id: 'ipcs', label: '工控机(IPC)', icon: Cpu },
          { id: 'sensors', label: '传感节点', icon: Radio }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all
              ${activeTab === tab.id 
                ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-blue-700 shadow-sm border border-gray-200') 
                : 'opacity-50 hover:opacity-100'}`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="pr-2 pb-6">
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md p-6 overflow-y-auto animate-fadeIn">
            <div className={`w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp my-auto border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-800/50' : 'bg-gray-50 border-gray-100'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {editingId ? <Pencil size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                  {editingId ? '编辑' : '新建'}{getTabLabel(activeTab)}
                </h3>
                <button onClick={() => setShowForm(false)} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-800 text-white' : 'hover:bg-gray-200 text-slate-800'}`}><X size={20} /></button>
              </div>
              
              <div className="p-8 space-y-6">
                {activeTab === 'projects' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>项目名称 <span className="text-red-500">*</span></label>
                        <input className={`${inputClass} ${formErrors.name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.name || ''} placeholder="如: 500kV站局放监测项目" onChange={e => { setFormData({...formData, name: e.target.value}); if (formErrors.name) setFormErrors({...formErrors, name: false}); }} />
                      </div>
                      <div><label className={labelClass}>项目类型</label><input className={inputClass} value={formData.type || ''} placeholder="项目属性" onChange={e => setFormData({...formData, type: e.target.value})} /></div>
                    </div>
                    <div><label className={labelClass}>项目描述</label><textarea className={`${inputClass} h-24`} value={formData.description || ''} placeholder="输入项目背景 or 备注..." onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                  </>
                )}
                {/* ... existing device/ipc/sensor forms ... */}
                {activeTab === 'devices' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>所属项目 <span className="text-red-500">*</span></label>
                        <select className={`${inputClass} ${formErrors.projectId ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.projectId || ''} onChange={e => { setFormData({...formData, projectId: e.target.value}); if (formErrors.projectId) setFormErrors({...formErrors, projectId: false}); }}>
                          <option value="">选择关联项目</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div><label className={labelClass}>设备类型</label>
                        <select className={inputClass} value={formData.deviceType || ''} onChange={e => setFormData({...formData, deviceType: e.target.value})}>
                          <option value="">请选择设备类型</option>
                          <option value="开关柜">开关柜</option>
                          <option value="箱变">箱变</option>
                          <option value="油变">油变</option>
                          <option value="GIS组合开关">GIS组合开关</option>
                          <option value="配网电缆">配网电缆</option>
                          <option value="高架电缆">高架电缆</option>
                        </select>
                      </div>
                    </div>
                    <div><label className={labelClass}>设备名称</label><input className={inputClass} value={formData.name || ''} placeholder="输入资产名称 (如: 101隔离刀闸)" onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div>
                      <label className={labelClass}>设备图片 <span className="text-red-500">*</span></label>
                      <div onClick={() => fileInputRef.current?.click()} className={`w-full h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden ${formErrors.image ? 'border-red-500 bg-red-500/5' : (isDark ? 'border-slate-700 hover:bg-slate-800/50' : 'border-gray-200 hover:bg-gray-50')}`}>
                        {formData.image ? (
                          <>
                            <img src={formData.image} className="w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100"><Upload className="text-white" size={24} /></div>
                          </>
                        ) : (
                          <>
                            <ImageIcon className={`mb-2 ${formErrors.image ? 'text-red-400' : 'opacity-30'}`} size={28} />
                            <span className={`text-xs font-bold ${formErrors.image ? 'text-red-500' : 'opacity-40'}`}>{formErrors.image ? '请上传设备图片 (必填)' : '点击上传本地资产图片'}</span>
                          </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </div>
                    </div>
                  </>
                )}
                {/* ... Ipc and Sensor forms ... */}
                {activeTab === 'ipcs' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>工控机名称 <span className="text-red-500">*</span></label><input className={`${inputClass} ${formErrors.name ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.name || ''} placeholder="如: A相工控机-01" onChange={e => { setFormData({...formData, name: e.target.value}); if (formErrors.name) setFormErrors({...formErrors, name: false}); }} /></div>
                      <div><label className={labelClass}>工控机 IP</label><input className={`${inputClass} ${ipError ? 'border-red-500' : ''}`} value={formData.ip || ''} placeholder="192.168.X.X" onChange={e => setFormData({...formData, ip: e.target.value})} />{ipError && <p className="text-[10px] text-red-500 mt-1">请输入合法的 IP 地址格式</p>}</div>
                    </div>
                    <div><label className={labelClass}>工控机描述</label><textarea className={`${inputClass} h-20`} value={formData.description || ''} placeholder="输入工控机用途或部署位置备注..." onChange={e => setFormData({...formData, description: e.target.value})} /></div>
                  </>
                )}
                {activeTab === 'sensors' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>硬件型号</label><select className={inputClass} value={formData.type || ''} onChange={e => { setFormData(prev => ({...prev, type: e.target.value})); setSensorTypeRead(false); setReadError(null); }}><option value="">选择型号</option><option value="SFPD-A1">SFPD-A1 (UHF+TEV)</option><option value="SFPD-A2">SFPD-A2 (双HFCT)</option><option value="SFPD-B1">SFPD-B1 (AE+UHF)</option><option value="SFPD-B2">SFPD-B2 (温湿度)</option></select></div>
                      <div><label className={labelClass}>传感节点 SN <span className="text-red-500">*</span></label><input className={`${inputClass} ${formErrors.sn ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.sn || ''} placeholder="Sensor SN" onChange={e => { setFormData({...formData, sn: e.target.value}); if (formErrors.sn) setFormErrors({...formErrors, sn: false}); }} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className={labelClass}>关联工控机 <span className="text-red-500">*</span></label><select className={`${inputClass} ${formErrors.ipcId ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.ipcId || ''} onChange={e => { setFormData(prev => ({...prev, ipcId: e.target.value})); setReadError(null); if (formErrors.ipcId) setFormErrors({...formErrors, ipcId: false}); }}><option value="">请选择工控机</option>{ipcs.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                      <div><label className={labelClass}>传感节点名称</label><input className={inputClass} value={formData.name || ''} placeholder="显示名称" onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className={labelClass}>关联项目 <span className="text-red-500">*</span></label><select className={`${inputClass} ${formErrors.projectId ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.projectId || ''} onChange={e => { setFormData({...formData, projectId: e.target.value}); if (formErrors.projectId) setFormErrors({...formErrors, projectId: false}); }}><option value="">请选择项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                      <div><label className={labelClass}>关联设备 <span className="text-red-500">*</span></label><select className={`${inputClass} ${formErrors.deviceId ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500/50' : ''}`} value={formData.deviceId || ''} onChange={e => { setFormData({...formData, deviceId: e.target.value}); if (formErrors.deviceId) setFormErrors({...formErrors, deviceId: false}); }}><option value="">请选择设备</option>{devices.filter(d => !formData.projectId || d.projectId === formData.projectId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                    </div>
                    <div className="flex flex-col gap-2">
                        {readError && (<div className="flex items-center gap-2 text-xs text-red-500 font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20 animate-fadeIn"><AlertCircle size={14} />{readError}</div>)}
                        <button onClick={handleReadSensorType} disabled={isReadingSensor} className={`w-full py-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${isReadingSensor ? 'cursor-not-allowed opacity-80' : 'hover:scale-[0.99] active:scale-[0.97]'} ${sensorTypeRead ? (isDark ? 'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30' : 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200') : (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20')}`}>
                            {isReadingSensor ? <><Loader2 size={18} className="animate-spin" />正在读取固件信息...</> : sensorTypeRead ? <><CheckCircle2 size={18} />已成功读取 (点击重新获取)</> : <><Scan size={18} />读取传感节点类型</>}
                        </button>
                    </div>
                    {sensorTypeRead && (
                        <div className="p-4 rounded-xl border bg-opacity-5 space-y-4 animate-fadeIn" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? '#334155' : '#e2e8f0' }}>
                          <label className={labelClass}>配置模态通道与安装位置</label>
                          <div className="grid grid-cols-1 gap-3">
                            {AVAILABLE_CHANNELS.map(ch => {
                              const channelConfig = (formData.channels || []).find((c: any) => c.type === ch);
                              const isSelected = !!channelConfig;
                              return (
                                <div key={ch} className="flex items-center gap-4 group">
                                  <button onClick={() => toggleSensorChannel(ch)} className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center transition-all border ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : (isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-gray-100 border-gray-200 text-gray-400')}`}>{isSelected ? <Check size={18} /> : <span className="text-[10px] font-bold opacity-50">{ch.substring(0, 1)}</span>}</button>
                                  <div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-1"><span className={`text-xs font-bold ${isSelected ? (isDark ? 'text-blue-400' : 'text-blue-600') : 'opacity-40'}`}>{ch}</span></div>{isSelected ? (<div className="relative animate-fadeIn"><MapPin size={14} className={`absolute left-3 top-2.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} /><input className={`${inputClass} pl-10 h-9 text-xs py-1`} placeholder={`输入 ${ch} 通道的安装位置...`} value={channelConfig.location} onChange={(e) => updateChannelLocation(ch, e.target.value)} /></div>) : (<div className="h-9 flex items-center text-[10px] opacity-20 italic">未启用该通道</div>)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                    )}
                  </>
                )}
              </div>
              <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-gray-50'}`}>
                <button onClick={() => setShowForm(false)} className={`px-6 py-2.5 rounded-lg font-bold transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-200'}`}>取消</button>
                <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-10 py-2.5 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">{isSaving ? <CheckCircle2 size={18} className="animate-pulse" /> : <Save size={18} />}{isSaving ? '正在保存...' : '保存配置'}</button>
              </div>
            </div>
          </div>
        )}

        {viewingChannelsSensor && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-md p-6 animate-fadeIn">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
               <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-800/50' : 'bg-gray-50 border-gray-100'}`}><div className="flex items-center gap-3"><Layers size={18} className="text-blue-500" /><h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>通道模态详情</h3></div><button onClick={() => setViewingChannelsSensor(null)} className={`p-1.5 rounded-full hover:bg-black/10 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}><X size={20} /></button></div>
               <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-500/10"><div><div className="text-[10px] uppercase font-black opacity-40 mb-1">传感节点 SN</div><div className="font-mono text-sm font-bold">{viewingChannelsSensor.sn}</div></div><div className="text-right"><div className="text-[10px] uppercase font-black opacity-40 mb-1">节点名称</div><div className="text-sm font-bold">{viewingChannelsSensor.name}</div></div></div>
                  <div className="space-y-3">{viewingChannelsSensor.channels.map((chan, idx) => (<div key={idx} className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}><div className="flex items-center gap-2 mb-1.5"><Waves size={14} className="text-blue-500" /><span className="text-xs font-black uppercase text-blue-500">{chan.type}</span></div><div className="flex items-center gap-2 text-sm"><MapPin size={12} className="opacity-40" /><span className="opacity-80">{chan.location || '未标注位置'}</span></div></div>))}</div>
               </div>
               <div className={`p-4 border-t text-center ${isDark ? 'border-slate-800' : 'border-gray-100'}`}><button onClick={() => setViewingChannelsSensor(null)} className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all">确认</button></div>
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.length === 0 && <EmptyState title="暂无项目" desc="请先创建一个监测项目作为资产容器" icon={FolderTree} />}
            {projects.map(p => {
              const deviceCount = devices.filter(d => d.projectId === p.id).length;
              const sensorCount = sensors.filter(s => s.projectId === p.id).length;
              const projectIpcIds = new Set(sensors.filter(s => s.projectId === p.id).map(s => s.ipcId));
              const ipcCount = projectIpcIds.size;
              return (
                <div key={p.id} className={cardClass}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><FolderTree size={24} /></div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit('projects', p.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-gray-100 hover:text-slate-600'}`}><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-red-500 opacity-40 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h4 className={`text-lg font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{p.name}</h4>
                  <div className="flex items-center gap-2 mb-4"><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{p.type}</span></div>
                  <p className={`text-xs opacity-60 mb-auto line-clamp-2 h-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{p.description || '暂无描述信息'}</p>
                  <div className="pt-4 border-t border-dashed border-gray-500/20 grid grid-cols-3 gap-2 mt-4"><div className="flex flex-col"><span className="text-[9px] opacity-40 uppercase font-black">资产设备</span><span className={`text-sm font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{deviceCount} 台</span></div><div className="flex flex-col border-x border-gray-500/10 px-2 text-center"><span className="text-[9px] opacity-40 uppercase font-black">工控机</span><span className={`text-sm font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{ipcCount} 台</span></div><div className="flex flex-col pl-2 text-right"><span className="text-[9px] opacity-40 uppercase font-black">传感节点</span><span className={`text-sm font-black ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{sensorCount} 个</span></div></div>
                  <button onClick={() => setTopologyProject(p)} className="w-full mt-4 py-2 text-blue-500 hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 rounded-lg text-xs flex items-center justify-center gap-1 font-black transition-all">查看配置清单 <ChevronRight size={14}/></button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.length === 0 && <EmptyState title="暂无设备" desc="请先添加设备资产" icon={HardDrive} />}
            {devices.map(d => {
              const project = projects.find(p => p.id === d.projectId);
              return (
                <div key={d.id} className={cardClass}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}><HardDrive size={24} /></div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit('devices', d.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-gray-100 hover:text-slate-600'}`}><Pencil size={16} /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-red-500 opacity-40 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <h4 className={`text-lg font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{d.name}</h4>
                  <div className="flex flex-col gap-1 mb-3"><span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{d.deviceType}</span>{project && <span className="text-[10px] opacity-50 flex items-center gap-1"><FolderTree size={10} /> {project.name}</span>}</div>
                  {d.image && (<div className="w-full h-24 rounded-lg overflow-hidden border border-gray-500/10 mb-3"><img src={d.image} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" alt="Device" /></div>)}
                  <div className="mt-auto pt-3 border-t border-dashed border-gray-500/20 flex justify-between items-center"><span className="text-[10px] opacity-40 font-bold">DEVICE ID: {d.id.substring(0,8)}...</span></div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'ipcs' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ipcs.length === 0 && <EmptyState title="暂无工控机" desc="请添加工控机节点" icon={Cpu} />}
            {ipcs.map(i => (
              <div key={i.id} className={cardClass}>
                <div className="flex justify-between items-start mb-4"><div className={`p-2 rounded-lg ${isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'}`}><Cpu size={24} /></div><div className="flex gap-2"><button onClick={() => startEdit('ipcs', i.id)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-gray-100 hover:text-slate-600'}`}><Pencil size={16} /></button><button onClick={() => handleDelete(i.id)} className="p-1.5 rounded-lg text-red-500 opacity-40 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button></div></div>
                <h4 className={`text-lg font-bold mb-1 truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{i.name}</h4>
                <div className="flex items-center gap-2 mb-4"><div className={`px-2 py-0.5 rounded text-[10px] font-mono border ${isDark ? 'bg-slate-800 border-slate-700 text-purple-300' : 'bg-gray-100 border-gray-200 text-purple-700'}`}>IP: {i.ip}</div></div>
                <p className={`text-xs opacity-60 mb-auto line-clamp-2 h-8 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{i.description || '暂无描述信息'}</p>
                <div className="mt-4 pt-3 border-t border-dashed border-gray-500/20 flex justify-between items-center text-[10px]"><span className="opacity-40 font-bold">SN: {i.sn || 'Unknown'}</span><span className="text-green-500 font-bold flex items-center gap-1"><Activity size={10} /> 在线</span></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sensors' && (
          <>
            {sensors.length === 0 ? (
               <EmptyState title="暂无传感节点" desc="请添加传感节点设备" icon={Radio} />
            ) : (
              <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className={`${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-slate-500'} font-bold text-xs uppercase`}>
                      <tr>
                        <th className="px-6 py-4">传感器名称</th>
                        <th className="px-6 py-4">SN 序列号</th>
                        <th className="px-6 py-4">所属设备</th>
                        <th className="px-6 py-4">关联 IPC</th>
                        <th className="px-6 py-4">监测通道</th>
                        <th className="px-6 py-4">当前状态</th>
                        <th className="px-6 py-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-700 text-slate-300' : 'divide-gray-100 text-slate-700'}`}>
                      {sensors.map(s => {
                        const device = devices.find(d => d.id === s.deviceId);
                        const ipc = ipcs.find(i => i.id === s.ipcId);
                        const channelTypes = s.channels.map(c => c.type).join(', ');
                        
                        return (
                          <tr key={s.id} className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}>
                            <td className="px-6 py-4 font-bold">{s.name}</td>
                            <td className="px-6 py-4 font-mono text-xs opacity-70">{s.sn}</td>
                            <td className="px-6 py-4">
                              {device ? (
                                <div className="flex items-center gap-2">
                                  <HardDrive size={14} className="opacity-50" />
                                  <span>{device.name}</span>
                                </div>
                              ) : <span className="opacity-30">-</span>}
                            </td>
                            <td className="px-6 py-4">
                              {ipc ? (
                                <div className="flex items-center gap-2">
                                  <Cpu size={14} className="opacity-50" />
                                  <span>{ipc.name}</span>
                                </div>
                              ) : <span className="opacity-30">-</span>}
                            </td>
                            <td className="px-6 py-4">
                                <button 
                                  onClick={() => setViewingChannelsSensor(s)}
                                  className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs font-bold transition-all border ${isDark ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                >
                                  <Waves size={12} />
                                  <span>{s.channels.length} ({channelTypes || '无'})</span>
                                </button>
                            </td>
                            <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider
                                  ${s.status === 'Abnormal' 
                                    ? (isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-600') 
                                    : (s.status === 'Unknown' 
                                        ? (isDark ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                                        : (isDark ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-green-50 border-green-200 text-green-600')
                                      )
                                  }
                                `}>
                                  {s.status === 'Abnormal' ? <AlertCircle size={12} /> : s.status === 'Unknown' ? <HelpCircle size={12} /> : <CheckCircle2 size={12} />}
                                  {s.status === 'Abnormal' ? '异常' : s.status === 'Unknown' ? '未知' : '正常'}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => startEdit('sensors', s.id)}
                                  className={`p-1.5 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-400 hover:bg-gray-100 hover:text-slate-600'}`}
                                  title="编辑"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(s.id)}
                                  className="p-1.5 rounded-lg text-red-500 opacity-40 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                                  title="删除"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AccessConfig;

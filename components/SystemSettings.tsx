
import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, Key, Lock, Edit, Trash2, Check, X, 
  Search, Plus, MoreHorizontal, UserCog, Mail, Phone,
  CheckCircle2, AlertCircle, LayoutGrid, Activity, PlugZap, FileOutput, Settings
} from 'lucide-react';
import { User, UserRole } from '../types';

interface SystemSettingsProps {
  isDark: boolean;
}

const DEFAULT_SUPER_ADMIN: User = {
  id: 'super-admin-01',
  username: 'admin',
  displayName: '超级管理员',
  role: 'super_admin',
  permissions: ['dashboard', 'diagnosis', 'config', 'export', 'settings'],
  status: 'active',
  lastLogin: new Date().toLocaleString(),
  createdAt: '2023-01-01',
  email: 'admin@grid-system.com',
  phone: '13800138000'
};

const INITIAL_USERS: User[] = [
  {
    id: 'user-01',
    username: 'operator_a',
    displayName: '运维专责-张工',
    role: 'operator',
    permissions: ['dashboard', 'diagnosis', 'config'],
    status: 'active',
    lastLogin: '2023-10-25 09:30',
    createdAt: '2023-05-12',
    email: 'zhang@grid-system.com'
  },
  {
    id: 'user-02',
    username: 'viewer_b',
    displayName: '监控值班员',
    role: 'viewer',
    permissions: ['dashboard', 'diagnosis'],
    status: 'active',
    lastLogin: '2023-10-24 14:15',
    createdAt: '2023-06-20'
  }
];

const AVAILABLE_PERMISSIONS = [
  { key: 'dashboard', label: '仪表盘访问', icon: LayoutGrid },
  { key: 'diagnosis', label: '设备诊断与孪生', icon: Activity },
  { key: 'config', label: '接入配置管理', icon: PlugZap },
  { key: 'export', label: '数据报表导出', icon: FileOutput },
  { key: 'settings', label: '系统设置', icon: Settings },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['dashboard', 'diagnosis', 'config', 'export', 'settings'],
  admin: ['dashboard', 'diagnosis', 'config', 'settings'],
  operator: ['dashboard', 'diagnosis', 'config'],
  viewer: ['dashboard', 'diagnosis']
};

// --- Super Admin Specific Modal ---
const SuperAdminModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  admin: User;
  currentRealPassword: string;
  onSave: (updatedAdmin: User, newPassword?: string) => void;
  isDark: boolean;
}> = ({ isOpen, onClose, admin, currentRealPassword, onSave, isDark }) => {
  const [formData, setFormData] = useState<User>(admin);
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [error, setError] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(admin);
      setPasswords({ old: '', new: '', confirm: '' });
      setError('');
      setShowPasswordSection(false);
    }
  }, [isOpen, admin]);

  const handleSave = () => {
    setError('');
    let newPwdToSave: string | undefined = undefined;
    if (showPasswordSection) {
       if (!passwords.old) { setError('请输入原密码以确认身份'); return; }
       if (passwords.old !== currentRealPassword) { setError('原密码错误，验证失败'); return; }
       if (passwords.new) {
           if (passwords.new.length < 6) { setError('新密码长度不能少于6位'); return; }
           if (passwords.new !== passwords.confirm) { setError('两次输入的新密码不一致'); return; }
           newPwdToSave = passwords.new;
       }
    }
    onSave(formData, newPwdToSave);
  };

  if (!isOpen) return null;

  const inputClass = `w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800 focus:border-blue-600'}`;
  const labelClass = `block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-800' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2"><Shield className="text-purple-500" size={20} /><h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>超级管理员设置</h3></div>
          <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {error && (<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>)}
          <div><label className={labelClass}>超级管理员账号 (不可修改)</label><div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border opacity-60 cursor-not-allowed ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-200'}`}><Shield size={16} className="text-purple-500" /><span className="font-mono font-bold">admin</span></div></div>
          <div><label className={labelClass}>显示名称</label><input className={inputClass} value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>安全邮箱</label><input className={inputClass} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div><div><label className={labelClass}>安全手机</label><input className={inputClass} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} /></div></div>
          <div className={`p-4 rounded-xl border transition-all ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2"><Key size={16} className={isDark ? 'text-slate-400' : 'text-slate-600'} /><span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>修改登录密码</span></div>
                 <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={showPasswordSection} onChange={e => setShowPasswordSection(e.target.checked)} /><div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div></label>
             </div>
             {showPasswordSection && (<div className="space-y-3 mt-4 animate-fadeIn"><div><input type="password" className={inputClass} placeholder="请输入原密码 (默认: 123456)" value={passwords.old} onChange={e => setPasswords({...passwords, old: e.target.value})} /></div><div className="h-px bg-gray-500/20 my-2"></div><div><input type="password" className={inputClass} placeholder="新密码 (至少6位)" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} /></div><div><input type="password" className={inputClass} placeholder="确认新密码" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} /></div></div>)}
          </div>
        </div>
        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}><button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-gray-200'}`}>取消</button><button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">保存设置</button></div>
      </div>
    </div>
  );
};

// --- Generic User Modal ---
const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: Partial<User>;
  onSave: (user: Partial<User>) => void;
  isDark: boolean;
}> = ({ isOpen, onClose, user, onSave, isDark }) => {
  const [formData, setFormData] = useState<Partial<User>>({ permissions: [], status: 'active', role: 'operator' });

  useEffect(() => {
    if (isOpen) {
      if (user.id) { setFormData({ ...user }); } else { setFormData({ permissions: ROLE_PERMISSIONS['operator'], status: 'active', role: 'operator', displayName: '', username: '' }); }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (formData.role && ROLE_PERMISSIONS[formData.role]) { setFormData(prev => ({ ...prev, permissions: ROLE_PERMISSIONS[prev.role as string] })); }
  }, [formData.role]);

  if (!isOpen) return null;

  const inputClass = `w-full px-4 py-2.5 rounded-lg border outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800 focus:border-blue-600'}`;
  const labelClass = `block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-800' : 'bg-gray-50 border-gray-100'}`}><h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>{user.id ? '编辑用户' : '新建用户'}</h3><button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}><X size={20} /></button></div>
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>登录账号 (Username)</label><input className={inputClass} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="system_user" disabled={!!user.id} /></div><div><label className={labelClass}>显示名称 (Display Name)</label><input className={inputClass} value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="运维人员A" /></div></div>
          {!user.id && (<div><label className={labelClass}>初始密码</label><div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-300'}`}><Key size={16} className="opacity-40" /><input type="password" className="bg-transparent outline-none flex-1 text-sm" placeholder="••••••••" autoComplete="new-password" /></div><p className="text-[10px] mt-1 opacity-50">默认密码为 123456，用户首次登录需修改</p></div>)}
          <div className="grid grid-cols-2 gap-4"><div><label className={labelClass}>电子邮箱</label><div className="relative"><Mail size={14} className="absolute left-3 top-3 opacity-30" /><input className={`${inputClass} pl-9`} value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@grid.com" /></div></div><div><label className={labelClass}>联系电话</label><div className="relative"><Phone size={14} className="absolute left-3 top-3 opacity-30" /><input className={`${inputClass} pl-9`} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="138..." /></div></div></div>
          <hr className={`border-dashed ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />
          <div><label className={labelClass}>用户角色与状态</label><div className="flex gap-4"><div className="flex-1 space-y-2">{['admin', 'operator', 'viewer'].map(r => (<label key={r} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.role === r ? (isDark ? 'bg-blue-600/20 border-blue-500' : 'bg-blue-50 border-blue-500') : (isDark ? 'border-slate-700 hover:bg-slate-700' : 'border-gray-200 hover:bg-gray-50')}`}><input type="radio" name="role" checked={formData.role === r} onChange={() => setFormData({...formData, role: r as UserRole})} className="hidden" /><div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.role === r ? 'border-blue-500' : 'border-slate-400'}`}>{formData.role === r && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}</div><div><div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{r === 'admin' ? '系统管理员' : r === 'operator' ? '运维操作员' : '普通观察员'}</div></div></label>))}</div><div className="w-1/3"><label className={`flex flex-col items-center justify-center h-full rounded-lg border cursor-pointer transition-all ${formData.status === 'active' ? (isDark ? 'bg-green-500/10 border-green-500 text-green-500' : 'bg-green-50 border-green-500 text-green-600') : (isDark ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-gray-100 border-gray-300 text-slate-500')}`}><input type="checkbox" checked={formData.status === 'active'} onChange={e => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})} className="hidden" /><CheckCircle2 size={32} className="mb-2" /><span className="font-bold text-sm">{formData.status === 'active' ? '账号启用' : '账号禁用'}</span></label></div></div></div>
          <div><label className={labelClass}>模块访问权限 (由角色自动分配)</label><div className="grid grid-cols-2 gap-3">{AVAILABLE_PERMISSIONS.map(perm => { const hasPerm = (formData.permissions || []).includes(perm.key); return (<div key={perm.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-default ${hasPerm ? (isDark ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-300') : (isDark ? 'bg-slate-900 border-slate-700 opacity-40' : 'bg-white border-gray-200 opacity-40')}`}><div className={`p-1.5 rounded ${hasPerm ? 'bg-blue-500 text-white' : 'bg-slate-500/20'}`}><perm.icon size={14} /></div><span className={`text-xs font-bold ${hasPerm ? (isDark ? 'text-blue-300' : 'text-blue-700') : ''}`}>{perm.label}</span>{hasPerm && <Check size={14} className="ml-auto text-blue-500" />}</div>); })}</div></div>
        </div>
        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-gray-50'}`}><button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-600 hover:bg-gray-200'}`}>取消</button><button onClick={() => onSave(formData)} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all active:scale-95">保存配置</button></div>
      </div>
    </div>
  );
};

const SystemSettings: React.FC<SystemSettingsProps> = ({ isDark }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('sys_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  
  const [superAdmin, setSuperAdmin] = useState<User>(() => {
    const saved = localStorage.getItem('sys_super_admin');
    return saved ? JSON.parse(saved) : DEFAULT_SUPER_ADMIN;
  });

  const [superAdminPassword, setSuperAdminPassword] = useState(() => {
    return localStorage.getItem('sys_sa_pwd') || '123456';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaModalOpen, setIsSaModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { localStorage.setItem('sys_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('sys_super_admin', JSON.stringify(superAdmin)); }, [superAdmin]);

  const handleSaveUser = (userData: Partial<User>) => {
    if (userData.id) {
        setUsers(users.map(u => u.id === userData.id ? { ...u, ...userData } as User : u));
    } else {
        const newUser: User = { ...userData as User, id: `user-${Date.now()}`, createdAt: new Date().toISOString().split('T')[0], permissions: userData.permissions || [], role: userData.role || 'viewer', status: userData.status || 'active' };
        setUsers([...users, newUser]);
    }
    setIsModalOpen(false);
  };
  
  const handleSaveSuperAdmin = (updatedUser: User, newPassword?: string) => {
      setSuperAdmin(updatedUser);
      if (newPassword) { setSuperAdminPassword(newPassword); localStorage.setItem('sys_sa_pwd', newPassword); }
      setIsSaModalOpen(false);
  };

  const handleDeleteUser = (id: string) => { if (window.confirm('确定要删除该用户账号吗？')) { setUsers(users.filter(u => u.id !== id)); } };

  const getRoleBadge = (role: string) => {
    switch(role) {
        case 'super_admin': return { label: '超级管理员', class: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
        case 'admin': return { label: '系统管理员', class: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' };
        case 'operator': return { label: '运维专责', class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
        default: return { label: '观察员', class: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    }
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || u.displayName.includes(searchTerm));

  return (
    <div className={`w-full flex flex-col p-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isDark={isDark} user={editingUser} onSave={handleSaveUser} />
      <SuperAdminModal isOpen={isSaModalOpen} onClose={() => setIsSaModalOpen(false)} isDark={isDark} admin={superAdmin} currentRealPassword={superAdminPassword} onSave={handleSaveSuperAdmin} />

      <div className="flex justify-between items-center mb-8 flex-shrink-0">
        <div><h1 className={`text-2xl font-black mb-1 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}><UserCog className="text-blue-500" /> 系统用户管理</h1><p className="text-sm opacity-60 font-medium">配置超级管理员信息，并为普通用户分配登录账号和访问权限</p></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Super Admin Card */}
        <div className={`lg:w-1/3 flex flex-col rounded-2xl border p-6 relative overflow-hidden flex-shrink-0 ${isDark ? 'bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl border-b border-l text-xs font-bold flex items-center gap-2 ${isDark ? 'bg-purple-500/10 border-slate-700 text-purple-400' : 'bg-purple-50 border-gray-100 text-purple-600'}`}><Shield size={14} /> Root Account</div>
            <div className="flex flex-col items-center mt-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px] mb-4 shadow-lg shadow-purple-500/20"><div className={`w-full h-full rounded-full flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-white'}`}><span className="text-3xl font-black bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">SA</span></div></div>
                <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{superAdmin.displayName}</h2><p className="text-sm opacity-50 font-mono">@{superAdmin.username}</p>
            </div>
            <div className="space-y-4 mb-8">
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-black/20 border-slate-700' : 'bg-gray-50 border-gray-100'}`}><div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><Mail size={18}/></div><div className="flex-1 min-w-0"><div className="text-[10px] opacity-40 font-bold uppercase">安全邮箱</div><div className="text-sm font-medium truncate">{superAdmin.email}</div></div></div>
                <div className={`p-4 rounded-xl border flex items-center gap-4 ${isDark ? 'bg-black/20 border-slate-700' : 'bg-gray-50 border-gray-100'}`}><div className="p-2 rounded-lg bg-purple-500/10 text-purple-500"><Phone size={18}/></div><div className="flex-1 min-w-0"><div className="text-[10px] opacity-40 font-bold uppercase">安全手机</div><div className="text-sm font-medium truncate">{superAdmin.phone}</div></div></div>
            </div>
            <div className="mt-auto"><button onClick={() => setIsSaModalOpen(true)} className={`w-full py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${isDark ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-700'}`}><Edit size={16} /> 编辑管理员资料</button></div>
        </div>

        {/* Users Table */}
        <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className={`flex items-center px-3 py-2 rounded-lg border w-64 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}><Search size={16} className="opacity-40 mr-2" /><input type="text" placeholder="搜索用户..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent outline-none text-xs w-full" /></div>
                <button onClick={() => { setEditingUser({}); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"><Plus size={16} /> 新增用户</button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-slate-500'}`}><tr><th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">用户身份</th><th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">角色权限</th><th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">访问模块</th><th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">状态 / 最近登录</th><th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">操作</th></tr></thead>
                    <tbody className={`divide-y divide-gray-500/10 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {filteredUsers.map(u => {
                            const roleBadge = getRoleBadge(u.role);
                            return (
                                <tr key={u.id} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}>
                                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{u.displayName.substring(0, 1)}</div><div><div className="font-bold">{u.displayName}</div><div className="text-[10px] opacity-50 font-mono">@{u.username}</div></div></div></td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-md text-[10px] font-black border uppercase ${roleBadge.class}`}>{roleBadge.label}</span></td>
                                    <td className="px-6 py-4"><div className="flex flex-wrap gap-1 max-w-[200px]">{u.permissions.slice(0, 3).map(p => { const permInfo = AVAILABLE_PERMISSIONS.find(ap => ap.key === p); return permInfo ? (<div key={p} className={`p-1 rounded ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'}`} title={permInfo.label}><permInfo.icon size={12} /></div>) : null; })}{u.permissions.length > 3 && (<span className="text-[10px] opacity-50 font-bold p-1">+{u.permissions.length - 3}</span>)}</div></td>
                                    <td className="px-6 py-4"><div className="flex flex-col"><div className="flex items-center gap-1.5 mb-1"><div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div><span className={`text-xs font-bold ${u.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>{u.status === 'active' ? '活跃' : '禁用'}</span></div><div className="text-[10px] opacity-40">{u.lastLogin || '从未登录'}</div></div></td>
                                    <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-gray-100 text-blue-600'}`}><Edit size={16} /></button><button onClick={() => handleDeleteUser(u.id)} className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}><Trash2 size={16} /></button></div></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (<div className="py-20 text-center opacity-30"><Users size={40} className="mx-auto mb-2" /><p className="text-sm font-bold">没有找到用户</p></div>)}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

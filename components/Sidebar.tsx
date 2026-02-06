
import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Activity, AlertTriangle, Database, Settings, LogOut, Sun, Moon, ChevronLeft, ChevronRight, Menu, LayoutGrid, PlugZap, FileOutput, Globe, Check, Sparkles, StickyNote, Download, Upload } from 'lucide-react';
import { Theme, ViewMode, User } from '../types';

interface SidebarProps {
  theme: Theme;
  toggleTheme: () => void;
  collapsed: boolean;
  toggleCollapse: () => void;
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenAiChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  theme, toggleTheme, collapsed, toggleCollapse, 
  currentView, onNavigate, currentUser, onLogout,
  onOpenAiChat
}) => {
  const isDark = theme === 'dark';
  
  // Language Menu State
  const [showLang, setShowLang] = useState(false);
  const [currentLang, setCurrentLang] = useState('zh');
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLang(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { key: 'dashboard', icon: LayoutGrid, label: '仪表盘' },
    { key: 'diagnosis', icon: Activity, label: '设备诊断' },
    { key: 'config', icon: PlugZap, label: '接入配置' },
    // { key: 'export', icon: FileOutput, label: '数据导出' }, // Hidden as per request
    { key: 'settings', icon: Settings, label: '系统设置' },
  ];

  // Filter menu items based on user permissions
  const allowedMenuItems = menuItems.filter(item => 
    currentUser?.permissions.includes(item.key)
  );

  const getRoleLabel = (role: string) => {
      if (role === 'super_admin') return '超级管理员';
      if (role === 'admin') return '系统管理员';
      if (role === 'operator') return '运维专责';
      return '观察员';
  };

  return (
    <div className={`h-full flex flex-col transition-all duration-300 border-r z-20 relative ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'} ${collapsed ? 'w-20' : 'w-64'}`}>
      {/* Header */}
      <div className={`p-4 flex items-center flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'hidden md:flex' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">PD</div>
            {!collapsed && <span className={`font-bold text-lg whitespace-nowrap overflow-hidden ${isDark ? 'text-white' : 'text-slate-800'}`}>在线诊断系统</span>}
        </div>
        <button onClick={toggleCollapse} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-slate-600'}`}>
          {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation Items (Scrollable) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <nav className="px-3 space-y-2 mt-2 flex-shrink-0">
            {allowedMenuItems.map((item, idx) => {
              const isActive = currentView === item.key;
              return (
              <button
                key={idx}
                type="button"
                title={collapsed ? item.label : ''}
                onClick={() => onNavigate(item.key as ViewMode)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative
                  ${isActive
                    ? (isDark ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500 rounded-l-none' : 'bg-blue-50 text-blue-600 border-l-4 border-blue-600 rounded-l-none') 
                    : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900')
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon size={22} className="flex-shrink-0" />
                {!collapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{item.label}</span>}
                {collapsed && (
                  <div className={`absolute left-full ml-2 px-2 py-1 rounded bg-slate-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50`}>
                    {item.label}
                  </div>
                )}
              </button>
            )})}
          </nav>
      </div>

      {/* AI Diagnosis Button (Fixed above footer) */}
      <div className="px-3 pb-2 pt-2 flex-shrink-0 z-30 relative">
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onOpenAiChat();
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative border shadow-lg cursor-pointer
              ${isDark 
                ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-300 hover:border-blue-500/60 hover:text-white hover:bg-slate-800/50' 
                : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-white'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? "AI 智能诊断" : ""}
        >
            <div className="relative pointer-events-none">
                <Sparkles size={22} className="flex-shrink-0" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
            </div>
            {!collapsed && (
                <div className="flex flex-col items-start overflow-hidden pointer-events-none">
                    <span className="font-bold text-sm whitespace-nowrap">AI 智能诊断</span>
                    <span className="text-[10px] opacity-70 whitespace-nowrap">智能助手在线</span>
                </div>
            )}
            {collapsed && (
              <div className={`absolute left-full ml-2 px-2 py-1 rounded bg-slate-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50`}>
                AI 智能诊断
              </div>
            )}
        </button>
      </div>

      {/* Footer Area */}
      <div className={`p-3 border-t flex-shrink-0 ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        
        {/* Language Switcher */}
        <div ref={langRef} className="relative mb-3">
            <button 
                onClick={() => setShowLang(!showLang)}
                className={`
                  flex items-center gap-2 py-2 rounded-full transition-all backdrop-blur-md border text-sm font-medium cursor-pointer
                  ${collapsed ? 'justify-center w-10 h-10 px-0 mx-auto' : 'w-full px-4'}
                  ${isDark 
                    ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/50' 
                    : 'bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:text-slate-900 shadow-sm'
                  }
                `}
                title={collapsed ? "Language" : ""}
            >
                <Globe size={16} />
                {!collapsed && <span>Language</span>}
            </button>
            
            {showLang && (
                <div className={`absolute z-50 bottom-full mb-2 py-1 rounded-xl shadow-2xl border overflow-hidden animate-fadeIn backdrop-blur-xl
                    ${isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-gray-200'}
                    ${collapsed ? 'left-full bottom-0 ml-2 w-32' : 'left-0 w-full'}
                `}>
                    <button 
                        onClick={() => { setCurrentLang('zh'); setShowLang(false); }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-gray-100 hover:text-blue-600'}`}
                    >
                        <span>中文</span>
                        {currentLang === 'zh' && <Check size={14} className="text-blue-500" />}
                    </button>
                    <button 
                        onClick={() => { setCurrentLang('en'); setShowLang(false); }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${isDark ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 hover:bg-gray-100 hover:text-blue-600'}`}
                    >
                        <span>English</span>
                        {currentLang === 'en' && <Check size={14} className="text-blue-500" />}
                    </button>
                </div>
            )}
        </div>

        <button onClick={toggleTheme} className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-2 transition-all ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-slate-600'} ${collapsed ? 'justify-center' : ''}`}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && <span className="whitespace-nowrap overflow-hidden">{isDark ? '亮色模式' : '科技模式'}</span>}
        </button>
        <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-gray-50'} ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-slate-500/20 flex items-center justify-center font-bold text-slate-500">
             {currentUser?.displayName ? currentUser.displayName.charAt(0) : 'U'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
                <div className="font-bold text-sm truncate">{currentUser?.displayName || '未登录'}</div>
                <div className="text-[10px] opacity-60 truncate">{getRoleLabel(currentUser?.role || 'viewer')}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={onLogout} title="退出登录" className="ml-auto opacity-50 cursor-pointer hover:opacity-100 hover:text-red-500 transition-colors flex-shrink-0">
               <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

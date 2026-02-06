
import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { Zap, Shield, User as UserIcon, Lock, ArrowRight, Activity, AlertCircle, Globe, Check } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animateEntry, setAnimateEntry] = useState(false);
  
  // Language State
  const [showLang, setShowLang] = useState(false);
  const [currentLang, setCurrentLang] = useState('zh'); // 'zh' or 'en'
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnimateEntry(true);
    
    // Click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLang(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for effect
    setTimeout(() => {
      try {
        // 1. Check Super Admin
        const savedSa = localStorage.getItem('sys_super_admin');
        const saPwd = localStorage.getItem('sys_sa_pwd') || '123456'; // Default password if not changed
        
        // Parse SA or use default if localstorage is empty (first run)
        const superAdmin = savedSa ? JSON.parse(savedSa) : {
           id: 'super-admin-01',
           username: 'admin',
           displayName: '超级管理员',
           role: 'super_admin',
           permissions: ['dashboard', 'diagnosis', 'config', 'export', 'settings'],
           status: 'active'
        };

        if (username === superAdmin.username) {
           if (password === saPwd) {
               onLogin(superAdmin);
               return;
           } else {
               throw new Error('密码错误');
           }
        }

        // 2. Check Regular Users
        const savedUsers = localStorage.getItem('sys_users');
        const users: User[] = savedUsers ? JSON.parse(savedUsers) : []; // We rely on SystemSettings to populate this
        
        const foundUser = users.find(u => u.username === username);

        if (foundUser) {
            if (foundUser.status !== 'active') {
                throw new Error('该账号已被禁用，请联系管理员');
            }
            // For regular users, we assume a default password mechanism as SystemSettings 
            // currently doesn't persist custom passwords for sub-users in the JSON array.
            // In a real app, this would check a hashed password.
            if (password === '123456') {
                onLogin(foundUser);
            } else {
                throw new Error('密码错误 (默认密码: 123456)');
            }
        } else {
            throw new Error('用户不存在');
        }

      } catch (err: any) {
        setError(err.message);
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="w-screen h-screen bg-[#0B1120] flex items-center justify-center relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0B1120] to-[#0B1120]"></div>
         <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
         
         {/* Grid Line Animation */}
         <div className="absolute inset-0" style={{ 
             backgroundImage: 'linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
         }}></div>
      </div>

      {/* Language Switcher */}
      <div ref={langRef} className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setShowLang(!showLang)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/40 backdrop-blur-md border border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all text-sm font-medium"
        >
          <Globe size={16} />
          <span>Language</span>
        </button>
        
        {showLang && (
          <div className="absolute top-full right-0 mt-2 w-32 bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 animate-fadeIn">
            <button 
              onClick={() => { setCurrentLang('zh'); setShowLang(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white flex items-center justify-between"
            >
              <span>中文</span>
              {currentLang === 'zh' && <Check size={14} className="text-blue-400" />}
            </button>
            <button 
              onClick={() => { setCurrentLang('en'); setShowLang(false); }}
              className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white flex items-center justify-between"
            >
              <span>English</span>
              {currentLang === 'en' && <Check size={14} className="text-blue-400" />}
            </button>
          </div>
        )}
      </div>

      <div className={`w-full max-w-md relative z-10 transition-all duration-1000 transform ${animateEntry ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        {/* Header Logo Area */}
        <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-[1px] shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6 relative group">
                <div className="w-full h-full rounded-2xl bg-[#0B1120] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                    <Zap size={32} className="text-cyan-400 relative z-10 fill-cyan-400/20" />
                </div>
                {/* Decorative particles */}
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-ping"></div>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight text-center mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-slate-400">
                局放在线诊断系统
              </span>
            </h1>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500"></div>
            
            <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 animate-fadeIn">
                        <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-300 font-medium">{error}</span>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">用户名</label>
                    <div className="relative group">
                        <UserIcon size={18} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input 
                            type="text" 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                            placeholder="请输入账号 (如: admin)"
                            autoComplete="username"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">密码</label>
                    <div className="relative group">
                        <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
                            placeholder="请输入密码"
                            autoComplete="current-password"
                        />
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>验证身份中...</span>
                        </>
                    ) : (
                        <>
                            <span>安全登录</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

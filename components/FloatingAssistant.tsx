
import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Maximize2, Minimize2, X, Sparkles } from 'lucide-react';
import AIChat from './AIChat';

interface FloatingAssistantProps {
  isDark: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const FloatingAssistant: React.FC<FloatingAssistantProps> = ({ isDark, isOpen, onClose }) => {
  // -- Dragging Logic State --
  // Default Position: Bottom Right area
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);
  const initialPosRef = useRef<{ x: number, y: number } | null>(null);

  // Load saved position on mount
  useEffect(() => {
    const savedPos = localStorage.getItem('ai_window_position');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        const safeX = Math.min(Math.max(20, parsed.x), window.innerWidth - 100);
        const safeY = Math.min(Math.max(20, parsed.y), window.innerHeight - 100);
        setPosition({ x: safeX, y: safeY });
      } catch (e) { }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMaximized) return; // Disable dragging when maximized
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
    setIsDragging(true);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStartRef.current || !initialPosRef.current) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    let newX = initialPosRef.current.x + deltaX;
    let newY = initialPosRef.current.y + deltaY;

    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 50;
    
    newX = Math.min(Math.max(0, newX), maxX);
    newY = Math.min(Math.max(0, newY), maxY);

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (!isMaximized) {
        localStorage.setItem('ai_window_position', JSON.stringify(position));
    }
    setIsDragging(false);
    dragStartRef.current = null;
    initialPosRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const toggleMaximize = () => {
      setIsMaximized(!isMaximized);
  };

  // Styling for glassmorphism
  const glassPanel = isDark 
    ? 'bg-slate-900/95 border-slate-700/80 text-white shadow-[0_0_40px_rgba(0,0,0,0.6)]' 
    : 'bg-white/95 border-gray-200/80 text-slate-800 shadow-2xl';
  
  if (!isOpen) return null;

  const currentStyle = isMaximized ? {
      left: '20px',
      top: '20px',
      right: '20px',
      bottom: '20px',
      width: 'auto',
      height: 'auto',
      maxWidth: 'none',
      maxHeight: 'none',
      transform: 'none'
  } : {
      left: position.x,
      top: position.y,
      width: '420px', 
      height: '650px',
      maxHeight: 'calc(100vh - 40px)',
      maxWidth: 'calc(100vw - 40px)'
  };

  return (
    <div 
        className={`fixed z-[100] rounded-2xl overflow-hidden border backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out
        ${glassPanel}
        ${isDragging ? 'cursor-grabbing opacity-90' : 'opacity-100'}
        `}
        style={currentStyle}
    >
        {/* Window Title Bar */}
        <div 
            className={`h-12 w-full flex items-center justify-between px-4 border-b select-none flex-shrink-0
                ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-gray-100/80 border-gray-200/50'}
                ${!isMaximized ? 'cursor-grab active:cursor-grabbing' : ''}
            `}
            onMouseDown={handleMouseDown}
            onDoubleClick={toggleMaximize}
        >
            <div className="flex items-center gap-2 pointer-events-none">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                    <Sparkles size={14} />
                </div>
                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>AI 智能诊断助手</span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                <button 
                    onClick={toggleMaximize}
                    className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-gray-200 text-slate-500 hover:text-black'}`}
                    title={isMaximized ? "还原" : "最大化"}
                >
                    {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button 
                    onClick={onClose}
                    className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-100 text-slate-500 hover:text-red-500'}`}
                    title="关闭"
                >
                    <X size={18} />
                </button>
            </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 min-h-0 relative flex flex-col">
            <AIChat isDark={isDark} />
        </div>
    </div>
  );
};

export default FloatingAssistant;

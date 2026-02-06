
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image as ImageIcon, History, Plus, MessageSquare, Trash2, ChevronLeft } from 'lucide-react';
import { ChatMessage, ChatSession } from '../types';
import { createChatSession, sendMessage } from '../services/geminiService';
import { Chat } from '@google/genai';

interface AIChatProps {
  isDark: boolean;
  onClose?: () => void; // Optional now as parent handles close
}

const DEFAULT_WELCOME_MSG: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: '你好！我是智能诊断助手。您可以随时与我互动，查询或者统计各个维度的数据，或者针对一些特定现象或数据进行深度分析',
    timestamp: new Date()
};

const AIChat: React.FC<AIChatProps> = ({ isDark, onClose }) => {
  // -- Session State --
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
      const saved = localStorage.getItem('ai_chat_sessions');
      return saved ? JSON.parse(saved) : [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // -- UI State --
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string, preview: string } | null>(null);
  
  // Current messages being displayed (derived or standalone if new)
  const [messages, setMessages] = useState<ChatMessage[]>([DEFAULT_WELCOME_MSG]);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Init Gemni Chat
  useEffect(() => {
    if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession();
    }
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setSelectedImage({
          data: base64Data,
          mimeType: file.type,
          preview: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const createNewSession = () => {
      setMessages([DEFAULT_WELCOME_MSG]);
      setCurrentSessionId(null);
      chatSessionRef.current = createChatSession(); // Reset Gemini context
      if (window.innerWidth < 768) setShowHistory(false); // Auto close mobile sidebar
  };

  const loadSession = (session: ChatSession) => {
      // Need to convert string dates back to Date objects if loaded from JSON
      const parsedMessages = session.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
      }));
      setMessages(parsedMessages);
      setCurrentSessionId(session.id);
      
      // Note: In a real app, we'd need to re-hydrate the Gemini chat context with history
      // For this demo, we just reset the client, so it won't remember context of old chats perfectly
      chatSessionRef.current = createChatSession(); 
      
      setShowHistory(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
          createNewSession();
      }
  };

  const saveCurrentSession = (newMessages: ChatMessage[]) => {
      if (!currentSessionId) {
          // Create new session on first user message
          const newId = Date.now().toString();
          const firstUserMsg = newMessages.find(m => m.role === 'user');
          const title = firstUserMsg ? (firstUserMsg.text.slice(0, 15) + (firstUserMsg.text.length > 15 ? '...' : '')) : '新对话';
          
          const newSession: ChatSession = {
              id: newId,
              title: title,
              timestamp: new Date().toISOString(),
              messages: newMessages
          };
          setSessions(prev => [newSession, ...prev]);
          setCurrentSessionId(newId);
      } else {
          // Update existing
          setSessions(prev => prev.map(s => 
              s.id === currentSessionId 
              ? { ...s, messages: newMessages, timestamp: new Date().toISOString() } 
              : s
          ));
      }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || !chatSessionRef.current) return;

    const currentImage = selectedImage;
    const currentInput = input;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      timestamp: new Date(),
      image: currentImage || undefined
    };
    
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveCurrentSession(updatedMessages);

    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    if(textareaRef.current) textareaRef.current.style.height = 'auto';

    const responseText = await sendMessage(
      chatSessionRef.current, 
      currentInput, 
      currentImage ? { data: currentImage.data, mimeType: currentImage.mimeType } : undefined
    );

    const modelMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText,
      timestamp: new Date()
    };

    const finalMessages = [...updatedMessages, modelMsg];
    setMessages(finalMessages);
    saveCurrentSession(finalMessages);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* History Sidebar */}
      <div className={`absolute top-0 bottom-0 left-0 z-20 w-64 border-r backdrop-blur-md transition-transform duration-300 ease-in-out flex flex-col
          ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-gray-50/95 border-gray-200'}
          ${showHistory ? 'translate-x-0' : '-translate-x-full'}
      `}>
          <div className="p-4 border-b border-inherit flex items-center justify-between">
              <span className={`font-bold text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>历史会话</span>
              <button onClick={() => setShowHistory(false)} className={`p-1 rounded hover:bg-black/10 transition-colors`}>
                  <ChevronLeft size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              <button 
                onClick={createNewSession}
                className={`w-full flex items-center gap-2 p-3 rounded-lg border border-dashed transition-all mb-2
                    ${isDark ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800' : 'border-gray-300 text-slate-500 hover:text-blue-600 hover:bg-white'}
                `}
              >
                  <Plus size={16} />
                  <span className="text-xs font-bold">开启新对话</span>
              </button>

              {sessions.length === 0 && (
                  <div className="text-center py-10 opacity-40 text-xs">暂无历史记录</div>
              )}

              {sessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all border
                        ${currentSessionId === session.id 
                            ? (isDark ? 'bg-blue-600/20 border-blue-500/50 text-blue-100' : 'bg-blue-50 border-blue-200 text-blue-700')
                            : (isDark ? 'bg-transparent border-transparent hover:bg-slate-800 text-slate-400' : 'bg-transparent border-transparent hover:bg-white text-slate-600')
                        }
                    `}
                  >
                      <div className="flex items-start gap-2 pr-6">
                          <MessageSquare size={14} className="mt-0.5 flex-shrink-0 opacity-70" />
                          <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{session.title}</div>
                              <div className="text-[10px] opacity-50 mt-1">{new Date(session.timestamp).toLocaleDateString()}</div>
                          </div>
                      </div>
                      <button 
                        onClick={(e) => deleteSession(e, session.id)}
                        className="absolute right-2 top-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white text-slate-400 transition-all"
                      >
                          <Trash2 size={12} />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Chat Toolbar */}
          <div className={`h-10 flex items-center justify-between px-4 border-b flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-gray-100 bg-white/50'}`}>
             <div className="flex items-center gap-2">
                 <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-600'}`}
                    title="查看历史记录"
                 >
                     <History size={14} />
                     <span>历史记录</span>
                 </button>
             </div>
             
             <button 
                onClick={createNewSession}
                className={`p-1.5 rounded-md flex items-center gap-2 text-xs font-bold transition-colors ${isDark ? 'hover:bg-slate-700 text-blue-400' : 'hover:bg-gray-200 text-blue-600'}`}
                title="新对话"
             >
                 <Plus size={14} />
                 <span>新对话</span>
             </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm flex flex-col gap-2
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : (isDark ? 'bg-slate-800/80 text-slate-200 rounded-tl-none border border-slate-700' : 'bg-white/80 text-slate-800 rounded-tl-none border border-gray-200')
                  }`}>
                  
                  {msg.image && (
                    <div className="rounded-lg overflow-hidden border border-white/20 shadow-inner max-w-full">
                      <img src={msg.image.preview} alt="User uploaded" className="w-full h-auto object-cover max-h-60" />
                    </div>
                  )}
                  
                  {msg.text && (
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm rounded-tl-none flex items-center gap-2 ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`p-4 border-t flex-shrink-0 ${isDark ? 'border-slate-700/50 bg-slate-900/30' : 'border-gray-200/50 bg-white/30'}`}>
            {selectedImage && (
              <div className="mb-3 relative inline-block animate-fadeIn">
                <img src={selectedImage.preview} alt="Upload preview" className="h-20 w-auto rounded-lg border-2 border-blue-500 shadow-md object-cover" />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div className={`flex items-end gap-2 p-2 rounded-xl border transition-colors backdrop-blur-sm
              ${isDark ? 'bg-slate-900/60 border-slate-700 focus-within:border-blue-500' : 'bg-white/60 border-gray-200 focus-within:border-blue-400'}`}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}
                title="上传图片"
              >
                 <Paperclip size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedImage ? "描述一下这张图片..." : "输入问题或上传图片..."}
                rows={1}
                className={`flex-1 bg-transparent resize-none outline-none max-h-32 py-2 px-2 text-sm
                  ${isDark ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
              />
              <div className="flex gap-1 pb-1">
                <button 
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedImage) || isLoading}
                    className={`p-2 rounded-full transition-all flex-shrink-0
                    ${(input.trim() || selectedImage)
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                        : (isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400')}`}
                >
                   <Send size={18} />
                </button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default AIChat;

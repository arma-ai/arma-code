import React, { useState } from 'react';
import { LayoutDashboard, FileText, Youtube, Settings, LogOut, Plus, Bell, Brain, Sparkles, GraduationCap, User, AudioLines } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { ViewState } from '../../App';
import { useMaterials } from '../../hooks/useApi';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onUpload: () => void;
  onProjectSelect?: (id: string) => void;
}

export function DashboardLayout({ children, currentView, onNavigate, onUpload, onProjectSelect }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { materials } = useMaterials();
  const recentProjects = materials.slice(0, 5); // Get latest 5 materials
  const [modelName, setModelName] = useState('Arma Neural 1.0');

  const handleModelChange = () => {
    const newModel = modelName === 'Arma Neural 1.0' ? 'Arma Quantum 2.0 (Beta)' : 'Arma Neural 1.0';
    setModelName(newModel);
    toast.success(`Model switched to ${newModel}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <div className="h-screen w-full bg-[#0C0C0F] relative overflow-hidden font-sans selection:bg-primary/20 selection:text-primary flex">
      
      {/* GLOBAL BACKGROUND AMBIENCE */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* SIDEBAR */}
      <aside className="w-[280px] flex-shrink-0 hidden md:flex flex-col z-20 relative bg-transparent py-6 pl-4 pr-2">
        <div className="flex items-center gap-3 mb-10 pl-4 cursor-pointer" onClick={() => onNavigate('dashboard')}>
           <div className="w-8 h-8 rounded-lg flex items-center justify-center relative">
             <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
             <Brain className="w-5 h-5 text-primary relative z-10" />
           </div>
           <span className="font-medium text-lg tracking-tight text-white/90">arma</span>
        </div>

        <button 
          onClick={onUpload}
          className="group w-full py-3 px-4 bg-primary/15 border border-primary/30 text-white rounded-xl text-sm font-semibold hover:bg-primary hover:text-black hover:border-primary transition-all flex items-center justify-start gap-3 mb-8 mx-2 max-w-[calc(100%-16px)] backdrop-blur-sm shadow-[0_0_30px_rgba(255,138,61,0.18)]"
        >
          <div className="w-6 h-6 rounded-lg bg-primary/25 flex items-center justify-center text-primary group-hover:bg-black/10 group-hover:text-black transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <span>Add Document</span>
        </button>

        <nav className="space-y-1 flex-1 overflow-y-auto px-2 scrollbar-hide">
          <SidebarItem 
            icon={<LayoutDashboard size={18} />} 
            label="Home" 
            active={currentView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
          />
          <SidebarItem 
            icon={<FileText size={18} />} 
            label="Library" 
            active={currentView === 'library'} 
            onClick={() => onNavigate('library')}
          />
          <SidebarItem 
            icon={<GraduationCap size={18} />} 
            label="Exam Prep" 
            active={currentView === 'exam'} 
            onClick={() => onNavigate('exam')}
          />
          <SidebarItem
            icon={<AudioLines size={18} />}
            label="Voice Teacher"
            active={currentView === 'voice'}
            onClick={() => onNavigate('voice')}
          />

          <div className="pt-8 pb-2">
             <div className="px-4 flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Recent Projects</p>
             </div>
             
             <div className="space-y-0.5">
               {recentProjects.length > 0 ? (
                 recentProjects.map(project => (
                   <RecentProjectItem
                     key={project.id}
                     type={project.type}
                     title={project.title}
                     meta={new Date(project.created_at).toLocaleDateString()}
                     active={false}
                     onClick={() => onProjectSelect?.(project.id)}
                   />
                 ))
               ) : (
                 <div className="px-4 py-6 text-center">
                   <p className="text-xs text-white/30">No materials yet</p>
                 </div>
               )}
             </div>
          </div>
        </nav>

        <div className="mt-auto px-2 space-y-2">
          <div
            onClick={() => onNavigate('profile')}
            className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-colors group ${currentView === 'profile' ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xs text-white/80 font-medium group-hover:border-primary/30 transition-colors">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">
                {user?.full_name || user?.email || 'User'}
              </p>
            </div>
            <Settings className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-colors group hover:bg-red-500/10"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-red-500/30 transition-colors">
              <LogOut className="w-4 h-4 text-white/60 group-hover:text-red-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white/60 group-hover:text-red-400 transition-colors">Log out</p>
            </div>
          </button>
        </div>
      </aside>

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-[#0C0C0F] border-t border-white/10 z-50 flex items-center justify-around px-2">
           <MobileNavItem icon={<LayoutDashboard />} label="Home" active={currentView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
           <MobileNavItem icon={<FileText />} label="Library" active={currentView === 'library'} onClick={() => onNavigate('library')} />
           <MobileNavItem icon={<User />} label="Profile" active={currentView === 'profile'} onClick={() => onNavigate('profile')} />
           
           {/* Mobile FAB */}
           <div className="absolute bottom-[80px] right-4">
              <button onClick={onUpload} className="w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 transition-transform">
                <Plus size={24} />
              </button>
           </div>
        </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative z-10 h-full max-h-screen pt-4 pr-4 pb-4 pl-4 md:pl-0">
        
        {/* TOP BAR */}
        <header className="h-14 flex items-center justify-between px-6 mb-2 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
             <span className="hover:text-white/80 transition-colors cursor-pointer" onClick={() => onNavigate('dashboard')}>Arma</span>
             <span>/</span>
             <span className="text-white/90 font-medium capitalize">{currentView ? currentView.replace('-', ' ') : 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-4">
             <div onClick={handleModelChange} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70 hover:bg-white/10 transition-colors cursor-pointer">
               <Sparkles className="w-3 h-3 text-primary" />
               <span>{modelName}</span>
             </div>
             
             <button onClick={() => toast.info('No new notifications')} className="w-9 h-9 rounded-full bg-transparent hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-white transition-colors relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-[#0C0C0F]" />
             </button>
          </div>
        </header>

        {/* DASHBOARD FRAME */}
        <main className="flex-1 rounded-[32px] border border-white/[0.08] bg-[#121215]/80 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col">
           <div className="absolute inset-0 pointer-events-none rounded-[32px] ring-1 ring-inset ring-white/[0.05]" />
           <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 z-20 pointer-events-none" />
           
           <div id="ContentScroll" className="flex-1 overflow-y-auto relative scrollbar-hide clip-content">
              {children}
           </div>
        </main>
      </div>
    </div>
  );
}

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors ${active ? 'text-primary' : 'text-white/40'}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative group ${
        active 
          ? 'text-white bg-white/5 shadow-inner' 
          : 'text-muted-foreground/80 hover:text-white hover:bg-white/5'
      }`}
    >
      {active && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(255,138,61,0.8)]" />
      )}
      <span className={`transition-colors duration-200 ${active ? 'text-primary' : 'group-hover:text-white/90'}`}>
        {React.cloneElement(icon as React.ReactElement, { 
          size: 18, 
          className: active ? 'drop-shadow-[0_0_8px_rgba(255,138,61,0.5)]' : '' 
        })}
      </span>
      {label}
    </button>
  );
}

function RecentProjectItem({ type, title, meta, active, onClick }: { type: string, title: string, meta: string, active: boolean, onClick?: () => void }) {
  const isPdf = type === 'pdf';
  const isYoutube = type === 'youtube';
  return (
    <div onClick={onClick} className={`group flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition-all duration-200 ${active ? 'bg-white/5' : 'hover:bg-white/5'}`}>
       <div className={`w-6 h-6 rounded-lg flex items-center justify-center border border-white/5 ${isPdf ? 'bg-blue-500/10 text-blue-400' : isYoutube ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'} ${active ? 'ring-1 ring-primary/20' : ''}`}>
         {isYoutube ? <Youtube size={12} /> : <FileText size={12} />}
       </div>
       <div className="flex-1 min-w-0">
         <p className={`text-xs font-medium truncate transition-colors ${active ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>{title}</p>
         <p className="text-[10px] text-white/30 truncate">{meta}</p>
       </div>
       {active && (
         <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(255,138,61,0.8)]" />
       )}
    </div>
  )
}

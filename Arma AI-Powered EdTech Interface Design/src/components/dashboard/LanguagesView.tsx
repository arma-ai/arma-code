import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Globe, BookOpen, Mic, Languages, Play, CheckCircle2, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function LanguagesView() {
  const [viewMode, setViewMode] = useState<'home' | 'session'>('home');
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const startSession = (session: string) => {
    setActiveSession(session);
    setViewMode('session');
  };

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F] relative overflow-hidden">
      {viewMode === 'home' && (
        <LanguagesHome onStartSession={startSession} />
      )}
      {viewMode === 'session' && (
        <LanguageSession type={activeSession} onFinish={() => setViewMode('home')} />
      )}
    </div>
  );
}

function LanguagesHome({ onStartSession }: { onStartSession: (type: string) => void }) {
  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Languages</h1>
          <p className="text-white/40">Vocabulary, translation, and speaking practice.</p>
        </div>
      </div>

      {/* COURSES */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all cursor-pointer group">
           <div className="flex items-center gap-4 mb-4">
             <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
               <Globe size={24} />
             </div>
             <div>
               <h3 className="text-lg font-medium text-white group-hover:text-primary transition-colors">German (A2)</h3>
               <p className="text-sm text-white/40">Daily Goal: 15 mins</p>
             </div>
           </div>
           <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-2">
             <div className="bg-blue-500 h-full w-[45%]" />
           </div>
           <p className="text-xs text-white/30 text-right">45% complete • 12 day streak</p>
        </div>

        <button 
          onClick={() => toast.info('New Language modal opening...')}
          className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 hover:bg-white/[0.04] hover:border-white/20 transition-all cursor-pointer flex items-center justify-center gap-3 text-white/40 hover:text-white"
        >
           <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
             <Plus size={20} />
           </div>
           <span className="font-medium">Add Language Course</span>
        </button>
      </div>

      {/* TODAY'S PLAN */}
      <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-4">Today's Plan</h2>
      <div className="space-y-3">
        {[
          { title: 'Vocabulary Trainer', icon: <BookOpen size={18} />, time: '5 min' },
          { title: 'Short Reading', icon: <Languages size={18} />, time: '10 min' },
          { title: 'Speaking Practice', icon: <Mic size={18} />, time: '5 min' }
        ].map((item, i) => (
          <div 
            key={i} 
            onClick={() => onStartSession(item.title)}
            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 cursor-pointer group transition-all"
          >
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/10 transition-colors">
                  {item.icon}
                </div>
                <div>
                   <span className="text-white/80 group-hover:text-white transition-colors font-medium block">{item.title}</span>
                   <span className="text-xs text-white/30">{item.time}</span>
                </div>
             </div>
             <button className="px-4 py-2 rounded-lg bg-white/5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2">
               Start <ChevronRight size={14} />
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguageSession({ type, onFinish }: { type: string | null, onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  const handleNext = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else onFinish();
  };

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F]">
       <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#121215]/50 backdrop-blur-md">
          <button onClick={onFinish} className="flex items-center gap-2 text-white/40 hover:text-white">
            <ArrowLeft size={16} /> Exit
          </button>
          <div className="text-white font-medium">{type}</div>
          <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
             <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / totalSteps) * 100}%` }} />
          </div>
       </div>

       <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full text-center">
          <div className="mb-12">
             <div className="text-sm text-white/40 uppercase tracking-wider mb-4">Translate this phrase</div>
             <h2 className="text-3xl md:text-4xl font-medium text-white mb-8">
               "Ich möchte ein Ticket kaufen."
             </h2>
             
             <div className="flex gap-2 justify-center mb-8">
                {['I', 'would like', 'to buy', 'a ticket'].map((word, i) => (
                   <button key={i} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors">
                     {word}
                   </button>
                ))}
             </div>
          </div>

          <button 
            onClick={handleNext}
            className="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
             Check Answer
          </button>
       </div>
    </div>
  );
}

function Plus({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

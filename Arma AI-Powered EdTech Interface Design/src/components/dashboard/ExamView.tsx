import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Clock, CheckCircle2, AlertCircle, Play,
  ChevronRight, Trophy, BarChart2, BookOpen, Pause, Check, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useMaterials, useQuizQuestions } from '../../hooks/useApi';
import type { QuizQuestion } from '../../types/api';

export function ExamView() {
  const [viewMode, setViewMode] = useState<'home' | 'setup' | 'session' | 'results'>('home');
  const [selectedMode, setSelectedMode] = useState<'quick' | 'timed' | 'weak'>('quick');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [examConfig, setExamConfig] = useState({ duration: 30, questionCount: 10 });
  const [sessionData, setSessionData] = useState<any>(null);

  const handleSelectMaterial = (materialId: string) => {
    setSelectedMaterialId(materialId);
    setViewMode('setup');
  };

  const handleStartExam = (questions: QuizQuestion[]) => {
    if (!questions || questions.length === 0) {
      toast.error('No questions available');
      return;
    }

    setSessionData({
      currentQuestion: 0,
      answers: {},
      score: 0,
      timeLeft: examConfig.duration * 60,
      questions
    });
    setViewMode('session');
  };

  const handleFinishExam = (answers: Record<number, string>) => {
    setSessionData({ ...sessionData, answers });
    setViewMode('results');
  };

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F] relative overflow-hidden">
      {viewMode === 'home' && (
        <ExamHome
          onSelectMaterial={handleSelectMaterial}
        />
      )}
      {viewMode === 'setup' && selectedMaterialId && (
        <ExamSetup
          materialId={selectedMaterialId}
          mode={selectedMode}
          config={examConfig}
          setConfig={setExamConfig}
          onBack={() => setViewMode('home')}
          onStart={handleStartExam}
        />
      )}
      {viewMode === 'session' && sessionData && (
        <ExamSession
          data={sessionData}
          onFinish={handleFinishExam}
        />
      )}
      {viewMode === 'results' && sessionData && (
        <ExamResults
          data={sessionData}
          onHome={() => setViewMode('home')}
          onRetry={() => { setViewMode('setup'); }}
        />
      )}
    </div>
  );
}

function ExamHome({ onSelectMaterial }: { onSelectMaterial: (materialId: string) => void }) {
  const { materials, loading } = useMaterials();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const processedMaterials = materials.filter(m => m.processing_status === 'completed');

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-medium text-white tracking-tight mb-2">Exam Prep</h1>
          <p className="text-white/40">Practice quizzes from your materials</p>
        </div>
      </div>

      {processedMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-medium text-white mb-2">No Materials Yet</h2>
          <p className="text-white/40 max-w-md">
            Upload materials to generate practice quizzes
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-widest mb-4">Select Material</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {processedMaterials.map((material) => (
              <div
                key={material.id}
                onClick={() => onSelectMaterial(material.id)}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <BookOpen size={20} />
                  </div>
                  <h3 className="font-medium text-white line-clamp-1 flex-1 group-hover:text-primary transition-colors">
                    {material.title}
                  </h3>
                </div>
                <p className="text-xs text-white/40">
                  {material.type.toUpperCase()} • {new Date(material.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ExamSetup({ materialId, mode, config, setConfig, onBack, onStart }: {
  materialId: string;
  mode: string;
  config: any;
  setConfig: any;
  onBack: () => void;
  onStart: (questions: QuizQuestion[]) => void;
}) {
  const { material } = useMaterials().materials.find(m => m.id === materialId) ? { material: useMaterials().materials.find(m => m.id === materialId)! } : { material: null };
  const { questions, loading } = useQuizQuestions(materialId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!material || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center mb-6">
          <CheckCircle2 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">No Quiz Available</h2>
          <p className="text-white/40">
            Quiz questions haven't been generated for this material yet.
          </p>
        </div>
        <button onClick={onBack} className="px-6 py-3 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full p-8 justify-center">
       <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 w-fit">
         <ArrowLeft size={16} /> Back
       </button>

       <h1 className="text-3xl font-medium text-white mb-2">Start Quiz</h1>
       <p className="text-white/40 mb-8">{material.title}</p>

       <div className="space-y-6 mb-12">
          <div>
            <label className="block text-sm text-white/60 mb-2">Available Questions</label>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-bold text-white">{questions.length}</div>
              <div className="text-xs text-white/40">Total questions</div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Duration (Minutes)</label>
            <div className="grid grid-cols-4 gap-4">
               {[15, 30, 45, 60].map(m => (
                 <button
                   key={m}
                   onClick={() => setConfig({...config, duration: m})}
                   className={`py-3 rounded-xl border transition-colors ${config.duration === m ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-transparent text-white/60 hover:bg-white/10'}`}
                 >
                   {m}
                 </button>
               ))}
            </div>
          </div>
          
          <div>
             <label className="block text-sm text-white/60 mb-2">Difficulty</label>
             <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
               <div className="w-1/2 h-full bg-primary" />
             </div>
             <div className="flex justify-between text-xs text-white/30 mt-2">
               <span>Easy</span>
               <span>Medium</span>
               <span>Hard</span>
             </div>
          </div>
       </div>

       <button
         onClick={() => onStart(questions)}
         className="w-full py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 transition-all"
       >
         Start Quiz
       </button>
    </div>
  );
}

function ExamSession({ data, onFinish }: any) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(data.timeLeft);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t: number) => {
        if (t <= 0) {
          clearInterval(timer);
          onFinish(answers);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [answers]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Get current question and build options array from individual option fields
  const currentQuestion = data.questions[currentQ] as QuizQuestion;
  const options = [
    currentQuestion.option_a,
    currentQuestion.option_b,
    currentQuestion.option_c,
    currentQuestion.option_d
  ];

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOption(optionIndex);
    // Store the answer as 'a', 'b', 'c', or 'd'
    const optionLetter = String.fromCharCode(97 + optionIndex); // 'a', 'b', 'c', 'd'
    setAnswers(prev => ({ ...prev, [currentQ]: optionLetter }));
  };

  const handleNext = () => {
    if (currentQ < data.questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelectedOption(null);
    } else {
      onFinish(answers);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0C0C0F]">
       {/* HEADER */}
       <div className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-[#121215]/50 backdrop-blur-md">
          <div className="text-white/60">Question {currentQ + 1} / {data.questions.length}</div>
          <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 font-mono text-primary font-medium">
             {formatTime(timeLeft)}
          </div>
          <button className="text-white/40 hover:text-white flex items-center gap-2">
            <Pause size={16} /> Pause
          </button>
       </div>

       {/* CONTENT */}
       <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full">
          <div className="w-full mb-8">
            <h2 className="text-2xl font-medium text-white mb-8 leading-relaxed">
              {currentQuestion.question}
            </h2>
            
            <div className="space-y-3">
               {options.map((opt: string, i: number) => (
                 <button 
                   key={i}
                   onClick={() => handleSelectOption(i)}
                   className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                     selectedOption === i 
                       ? 'bg-primary/10 border-primary text-white shadow-[0_0_15px_rgba(255,138,61,0.1)]' 
                       : 'bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/[0.05] hover:border-white/10'
                   }`}
                 >
                   <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${
                     selectedOption === i ? 'border-primary bg-primary text-black' : 'border-white/20 text-white/30'
                   }`}>
                     {String.fromCharCode(65 + i)}
                   </div>
                   {opt}
                 </button>
               ))}
            </div>
          </div>

          <div className="flex justify-end w-full">
             <button 
               onClick={handleNext}
               disabled={selectedOption === null}
               className="px-8 py-3 bg-white text-black rounded-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all flex items-center gap-2"
             >
               {currentQ === data.questions.length - 1 ? 'Finish Exam' : 'Next Question'}
               <ChevronRight size={18} />
             </button>
          </div>
       </div>
    </div>
  );
}

function ExamResults({ data, onHome, onRetry }: { data: any, onHome: () => void, onRetry: () => void }) {
  // Calculate score based on answers
  const questions = data.questions as QuizQuestion[];
  const answers = data.answers as Record<number, string>;
  
  let correctCount = 0;
  questions.forEach((q, idx) => {
    if (answers[idx] === q.correct_option) {
      correctCount++;
    }
  });

  const scorePercent = Math.round((correctCount / questions.length) * 100);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-2xl mx-auto">
       <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 border shadow-[0_0_30px] ${
         scorePercent >= 70 
           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/20' 
           : scorePercent >= 50 
             ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/20'
             : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/20'
       }`}>
         <Trophy size={48} />
       </div>
       <h1 className="text-4xl font-medium text-white mb-2">Exam Completed!</h1>
       <p className="text-white/40 mb-8">
         {scorePercent >= 70 
           ? 'Great job! You demonstrated strong understanding.' 
           : scorePercent >= 50 
             ? 'Good effort! Keep practicing to improve.'
             : 'Keep studying! You can do better next time.'}
       </p>
       
       <div className="grid grid-cols-3 gap-4 w-full mb-12">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
             <div className={`text-3xl font-bold mb-1 ${
               scorePercent >= 70 ? 'text-emerald-400' : scorePercent >= 50 ? 'text-amber-400' : 'text-red-400'
             }`}>{scorePercent}%</div>
             <div className="text-xs text-white/40">Score</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
             <div className="text-3xl font-bold text-white mb-1">{correctCount}/{questions.length}</div>
             <div className="text-xs text-white/40">Correct</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
             <div className="text-3xl font-bold text-white mb-1">{questions.length}</div>
             <div className="text-xs text-white/40">Total Questions</div>
          </div>
       </div>

       <div className="flex gap-4 w-full">
          <button onClick={onRetry} className="flex-1 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-colors">
            Retry Exam
          </button>
          <button onClick={onHome} className="flex-1 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors">
            Back to Dashboard
          </button>
       </div>
    </div>
  );
}

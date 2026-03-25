import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, BookOpen, Brain, Trophy, Presentation, Headphones, RotateCcw, ChevronRight } from 'lucide-react';

export interface LearningProgressData {
  id: string;
  user_id: string;
  material_id: string;
  current_stage: string;
  summary_completed: boolean;
  summary_read_time_seconds: number;
  summary_word_count: number;
  flashcards_completed: boolean;
  flashcards_viewed_count: number;
  quiz_attempts_count: number;
  best_quiz_score: number;
  quiz_passed: boolean;
  quiz_weak_areas?: string[];
  presentation_completed: boolean;
  presentation_generated: boolean;
  podcast_completed: boolean;
  podcast_generated: boolean;
  mastery_achieved: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

interface RoadmapProgressSidebarProps {
  progress: LearningProgressData;
  onStageClick: (stage: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface StageConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const STAGES: StageConfig[] = [
  { id: 'summary', title: 'Summary', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'flashcards', title: 'Flashcards', icon: <Brain className="w-4 h-4" /> },
  { id: 'quiz', title: 'Quiz', icon: <Trophy className="w-4 h-4" /> },
  { id: 'presentation', title: 'Presentation', icon: <Presentation className="w-4 h-4" /> },
  { id: 'podcast', title: 'Podcast', icon: <Headphones className="w-4 h-4" /> },
  { id: 'retry_quiz', title: 'Retry Quiz', icon: <RotateCcw className="w-4 h-4" /> },
];

export const RoadmapProgressSidebar: React.FC<RoadmapProgressSidebarProps> = ({
  progress,
  onStageClick,
  isOpen,
  onClose,
}) => {
  const getStageStatus = (stageId: string) => {
    if (progress.mastery_achieved && stageId !== 'completed') {
      return 'completed';
    }

    const stageIndex = STAGES.findIndex((s) => s.id === stageId);
    const currentIndex = STAGES.findIndex((s) => s.id === progress.current_stage);

    if (stageId === 'summary' && progress.summary_completed) return 'completed';
    if (stageId === 'flashcards' && progress.flashcards_completed) return 'completed';
    if (stageId === 'quiz' && progress.quiz_passed) return 'completed';
    if (stageId === 'presentation' && progress.presentation_completed) return 'completed';
    if (stageId === 'podcast' && progress.podcast_completed) return 'completed';

    if (stageIndex === currentIndex) return 'current';
    if (stageIndex < currentIndex) return 'completed';
    return 'locked';
  };

  const calculateProgress = () => {
    let completed = 0;
    const total = STAGES.length;

    if (progress.summary_completed) completed++;
    if (progress.flashcards_completed) completed++;
    if (progress.quiz_passed) completed++;
    if (progress.presentation_completed) completed++;
    if (progress.podcast_completed) completed++;
    if (progress.mastery_achieved) completed++;

    return Math.round((completed / total) * 100);
  };

  const getStageDetails = (stageId: string) => {
    switch (stageId) {
      case 'summary':
        return progress.summary_read_time_seconds > 0
          ? `${Math.round(progress.summary_read_time_seconds / 60)} мин`
          : undefined;
      case 'flashcards':
        return progress.flashcards_viewed_count > 0
          ? `${progress.flashcards_viewed_count} карточек`
          : undefined;
      case 'quiz':
        if (progress.quiz_attempts_count > 0) {
          return `${progress.best_quiz_score}% (${progress.quiz_attempts_count} попыток)`;
        }
        return undefined;
      default:
        return undefined;
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-80 bg-[#121215] border-l border-white/10 z-50 shadow-2xl overflow-hidden"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Прогресс изучения</h2>
              <button
                onClick={onClose}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Общий прогресс</span>
                <span className="text-[#FF8A3D] font-semibold">{calculateProgress()}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#FF8A3D]"
                  initial={{ width: 0 }}
                  animate={{ width: `${calculateProgress()}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Stages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {STAGES.map((stage, index) => {
              const status = getStageStatus(stage.id);
              const details = getStageDetails(stage.id);
              const isClickable = status === 'current' || status === 'completed';

              return (
                <motion.button
                  key={stage.id}
                  onClick={() => isClickable && onStageClick(stage.id)}
                  disabled={!isClickable}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    w-full p-3 rounded-lg flex items-center gap-3 transition-all
                    ${status === 'completed' ? 'bg-[#FF8A3D]/10 hover:bg-[#FF8A3D]/20' : ''}
                    ${status === 'current' ? 'bg-white/5 border border-[#FF8A3D]/30' : ''}
                    ${status === 'locked' ? 'opacity-50' : ''}
                    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                  `}
                >
                  {/* Icon */}
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${status === 'completed' ? 'bg-[#FF8A3D] text-white' : ''}
                      ${status === 'current' ? 'bg-[#FF8A3D]/20 text-[#FF8A3D]' : ''}
                      ${status === 'locked' ? 'bg-white/10 text-white/40' : ''}
                    `}
                  >
                    {status === 'completed' ? (
                      <Check className="w-4 h-4" />
                    ) : status === 'locked' ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      stage.icon
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${status === 'locked' ? 'text-white/40' : 'text-white'}`}>
                        {stage.title}
                      </span>
                      {status === 'current' && (
                        <span className="text-[10px] text-[#FF8A3D] font-medium px-1.5 py-0.5 bg-[#FF8A3D]/20 rounded">
                          Сейчас
                        </span>
                      )}
                    </div>
                    {details && (
                      <p className="text-xs text-white/50 mt-0.5">{details}</p>
                    )}
                  </div>

                  {/* Arrow */}
                  {isClickable && (
                    <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Completion Status */}
          {progress.mastery_achieved && (
            <div className="p-4 border-t border-white/10">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-gradient-to-r from-[#FF8A3D]/20 to-[#F59E0B]/20 rounded-xl border border-[#FF8A3D]/30"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-[#FF8A3D]" />
                  <div>
                    <p className="text-sm font-semibold text-white">Материал освоен!</p>
                    <p className="text-xs text-white/60 mt-0.5">
                      {progress.completed_at
                        ? new Date(progress.completed_at).toLocaleDateString('ru-RU')
                        : 'Поздравляем!'}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};

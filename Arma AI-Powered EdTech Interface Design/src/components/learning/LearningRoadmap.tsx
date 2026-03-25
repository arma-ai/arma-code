import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, BookOpen, Brain, Trophy, Presentation, Headphones, RotateCcw } from 'lucide-react';

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

interface LearningRoadmapProps {
  progress: LearningProgressData;
  onStageClick: (stage: string) => void;
}

interface StageConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'summary',
    title: 'Summary',
    description: 'Прочитайте краткое содержание материала',
    icon: <BookOpen className="w-5 h-5" />,
    color: '#3B82F6', // Blue
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    description: 'Изучите ключевые понятия',
    icon: <Brain className="w-5 h-5" />,
    color: '#8B5CF6', // Purple
  },
  {
    id: 'quiz',
    title: 'Quiz',
    description: 'Проверьте свои знания',
    icon: <Trophy className="w-5 h-5" />,
    color: '#F59E0B', // Amber
  },
  {
    id: 'presentation',
    title: 'Presentation',
    description: 'Изучите материал визуально',
    icon: <Presentation className="w-5 h-5" />,
    color: '#EC4899', // Pink
  },
  {
    id: 'podcast',
    title: 'Podcast',
    description: 'Прослушайте аудио версию',
    icon: <Headphones className="w-5 h-5" />,
    color: '#10B981', // Green
  },
  {
    id: 'retry_quiz',
    title: 'Retry Quiz',
    description: 'Повторите проверку знаний',
    icon: <RotateCcw className="w-5 h-5" />,
    color: '#F97316', // Orange
  },
];

export const LearningRoadmap: React.FC<LearningRoadmapProps> = ({ progress, onStageClick }) => {
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Ваш путь изучения</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#FF8A3D]"
                initial={{ width: 0 }}
                animate={{ width: `${calculateProgress()}%` }}
                transition={{ duration: 0.5, ease: 'ease-out' }}
              />
            </div>
          </div>
          <span className="text-sm text-white/60 whitespace-nowrap">{calculateProgress()}%</span>
        </div>
      </div>

      {/* Roadmap - Desktop (horizontal) */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-white/10" />
          <motion.div
            className="absolute top-8 left-0 h-0.5 bg-[#FF8A3D]"
            initial={{ width: '0%' }}
            animate={{ width: `${(calculateProgress() / 100) * 100}%` }}
            transition={{ duration: 0.5 }}
          />

          {/* Stages */}
          <div className="relative flex justify-between">
            {STAGES.map((stage, index) => {
              const status = getStageStatus(stage.id);
              const isClickable = status === 'current' || status === 'completed';

              return (
                <motion.div
                  key={stage.id}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <button
                    onClick={() => isClickable && onStageClick(stage.id)}
                    disabled={!isClickable}
                    className={`
                      relative w-16 h-16 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${status === 'completed' ? 'bg-[#FF8A3D] text-white' : ''}
                      ${status === 'current' ? 'bg-white/10 text-[#FF8A3D] ring-2 ring-[#FF8A3D] ring-offset-2 ring-offset-[#0C0C0F] animate-pulse' : ''}
                      ${status === 'locked' ? 'bg-white/5 text-white/30' : ''}
                      ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                    `}
                  >
                    {status === 'completed' ? (
                      <Check className="w-6 h-6" />
                    ) : status === 'locked' ? (
                      <Lock className="w-5 h-5" />
                    ) : (
                      stage.icon
                    )}

                    {/* Status indicator */}
                    {status === 'current' && (
                      <motion.div
                        className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex items-center gap-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <span className="text-xs text-[#FF8A3D] font-medium">Текущий</span>
                      </motion.div>
                    )}
                  </button>

                  <div className="mt-4 text-center max-w-[140px]">
                    <h3 className={`text-sm font-semibold mb-1 ${status === 'locked' ? 'text-white/40' : 'text-white'}`}>
                      {stage.title}
                    </h3>
                    <p className="text-xs text-white/60">{stage.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roadmap - Mobile (vertical) */}
      <div className="md:hidden space-y-4">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const isClickable = status === 'current' || status === 'completed';

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => isClickable && onStageClick(stage.id)}
                disabled={!isClickable}
                className={`
                  w-full p-4 rounded-xl flex items-center gap-4
                  transition-all duration-300
                  ${status === 'completed' ? 'bg-[#FF8A3D]/20 border border-[#FF8A3D]/30' : ''}
                  ${status === 'current' ? 'bg-white/10 border border-[#FF8A3D]/50' : ''}
                  ${status === 'locked' ? 'bg-white/5 border border-white/5' : ''}
                  ${isClickable ? 'cursor-pointer hover:bg-white/10' : 'cursor-not-allowed opacity-60'}
                `}
              >
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                    ${status === 'completed' ? 'bg-[#FF8A3D] text-white' : ''}
                    ${status === 'current' ? 'bg-[#FF8A3D]/20 text-[#FF8A3D]' : ''}
                    ${status === 'locked' ? 'bg-white/10 text-white/30' : ''}
                  `}
                >
                  {status === 'completed' ? (
                    <Check className="w-6 h-6" />
                  ) : status === 'locked' ? (
                    <Lock className="w-5 h-5" />
                  ) : (
                    stage.icon
                  )}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${status === 'locked' ? 'text-white/40' : 'text-white'}`}>
                      {stage.title}
                    </h3>
                    {status === 'current' && (
                      <span className="text-xs text-[#FF8A3D] font-medium px-2 py-0.5 bg-[#FF8A3D]/20 rounded-full">
                        Текущий
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-1">{stage.description}</p>
                </div>

                {status === 'completed' && (
                  <Check className="w-5 h-5 text-[#FF8A3D]" />
                )}
                {status === 'locked' && (
                  <Lock className="w-4 h-4 text-white/30" />
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Message */}
      {progress.mastery_achieved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 p-6 bg-gradient-to-r from-[#FF8A3D]/20 to-[#F59E0B]/20 rounded-2xl border border-[#FF8A3D]/30 text-center"
        >
          <Trophy className="w-12 h-12 text-[#FF8A3D] mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Поздравляем!</h3>
          <p className="text-white/80">Вы успешно освоили этот материал</p>
          {progress.completed_at && (
            <p className="text-sm text-white/60 mt-2">
              Завершено: {new Date(progress.completed_at).toLocaleDateString('ru-RU')}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

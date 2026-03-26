import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Brain, ClipboardList, CheckCircle2, Lock, PlayCircle, AlertCircle } from 'lucide-react';
import type { LearningPath, LearningStage } from '../../types/api';

interface LearningRoadmapProps {
  learningPath: LearningPath;
  onStageClick?: (stage: string) => void;
}

const STAGES = [
  {
    id: 'summary',
    title: 'Конспект',
    description: 'Изучите основные понятия',
    icon: BookOpen,
    requiredStage: null as null,
  },
  {
    id: 'flashcards',
    title: 'Карточки',
    description: 'Запомните ключевые термины',
    icon: Brain,
    requiredStage: 'summary' as const,
  },
  {
    id: 'quiz',
    title: 'Тест',
    description: 'Проверьте свои знания',
    icon: ClipboardList,
    requiredStage: 'flashcards' as const,
  },
];

const STAGE_ICONS: Record<string, any> = {
  summary: BookOpen,
  flashcards: Brain,
  quiz: ClipboardList,
  remedial_presentation: PlayCircle,
  remedial_podcast: PlayCircle,
};

export function LearningRoadmap({ learningPath, onStageClick }: LearningRoadmapProps) {
  const getStageStatus = (stageId: string): LearningStage => {
    if (stageId === 'summary') return learningPath.summary_stage;
    if (stageId === 'flashcards') return learningPath.flashcards_stage;
    if (stageId === 'quiz') return learningPath.quiz_stage;
    return 'locked';
  };

  const getStageIcon = (stageId: string, status: LearningStage) => {
    if (status === 'completed') return CheckCircle2;
    if (status === 'locked') return Lock;
    return STAGE_ICONS[stageId] || BookOpen;
  };

  const getStageStyles = (status: LearningStage) => {
    switch (status) {
      case 'completed':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500',
          iconColor: 'text-white',
          text: 'text-white',
          description: 'text-white/40',
        };
      case 'in_progress':
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/30',
          iconBg: 'bg-primary',
          iconColor: 'text-black',
          text: 'text-white',
          description: 'text-white/60',
        };
      case 'available':
        return {
          bg: 'bg-white/[0.02]',
          border: 'border-white/10',
          iconBg: 'bg-white/10',
          iconColor: 'text-white/60',
          text: 'text-white/70',
          description: 'text-white/40',
        };
      default: // locked
        return {
          bg: 'bg-white/[0.01]',
          border: 'border-white/5',
          iconBg: 'bg-white/5',
          iconColor: 'text-white/20',
          text: 'text-white/30',
          description: 'text-white/20',
        };
    }
  };

  const isRemedialUnlocked = learningPath.remedial_presentation_unlocked || learningPath.remedial_podcast_unlocked;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-1">Ваш план обучения</h3>
        <p className="text-sm text-white/40">
          Пройдите все этапы для закрепления материала
        </p>
      </div>

      {/* Stages */}
      <div className="space-y-3">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const styles = getStageStyles(status);
          const IconComponent = getStageIcon(stage.id, status);
          const isClickable = status === 'available' || status === 'in_progress';

          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => isClickable && onStageClick?.(stage.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isClickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'
              } ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}>
                  <IconComponent size={20} className={styles.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold ${styles.text}`}>{stage.title}</span>
                    {status === 'completed' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                        Готово
                      </span>
                    )}
                    {status === 'in_progress' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                        В процессе
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${styles.description}`}>{stage.description}</p>
                </div>

                {/* Progress indicator */}
                {status === 'locked' && (
                  <div className="text-white/20">
                    <Lock size={18} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Remedial Content Warning */}
      {isRemedialUnlocked && learningPath.quiz_stage !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
        >
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-400 mb-1">Нужно повторить</h4>
              <p className="text-xs text-white/60">
                Доступны дополнительные материалы для повторения перед следующей попыткой теста
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Completion Status */}
      {learningPath.is_completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"
        >
          <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
          <h4 className="text-lg font-bold text-emerald-400">Материал освоен!</h4>
          <p className="text-sm text-white/60 mt-1">
            Отличная работа! Вы прошли все этапы обучения
          </p>
        </motion.div>
      )}
    </div>
  );
}

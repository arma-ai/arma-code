import React, { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import type { LearningStage } from '../../types/api';

interface StageGateProps {
  stageStatus: LearningStage;
  children: ReactNode;
  lockedMessage?: string;
}

/**
 * Component for gating content based on learning stage status.
 * Shows blurred content with lock overlay for locked stages.
 */
export function StageGate({ stageStatus, children, lockedMessage }: StageGateProps) {
  if (stageStatus !== 'locked') {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-xl">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <Lock size={32} className="text-white/40" />
        </div>
        <p className="text-sm text-white/60 text-center max-w-xs px-4">
          {lockedMessage || 'Этот этап откроется после выполнения предыдущих заданий'}
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to check if a stage is accessible
 */
export function useStageAccess(stageStatus: LearningStage): { isAccessible: boolean; isCompleted: boolean } {
  return {
    isAccessible: stageStatus === 'available' || stageStatus === 'in_progress' || stageStatus === 'completed',
    isCompleted: stageStatus === 'completed',
  };
}

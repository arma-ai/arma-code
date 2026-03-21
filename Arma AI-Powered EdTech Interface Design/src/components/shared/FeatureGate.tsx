import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { PlanTier } from '../../types/api';

const TIER_ORDER: Record<PlanTier, number> = { free: 0, student: 1, pro: 2 };

interface FeatureGateProps {
  requiredPlan: PlanTier;
  children: ReactNode;
}

export function FeatureGate({ requiredPlan, children }: FeatureGateProps) {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const currentTier = subscription?.plan_tier || 'free';

  if (TIER_ORDER[currentTier] >= TIER_ORDER[requiredPlan]) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-xl">
        <Lock className="w-6 h-6 text-white/40 mb-2" />
        <p className="text-sm text-white/60 mb-3">
          Requires <span className="text-primary font-medium capitalize">{requiredPlan}</span> plan
        </p>
        <button
          onClick={() => navigate('/pricing')}
          className="px-4 py-2 bg-primary text-black text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Upgrade to Unlock
        </button>
      </div>
    </div>
  );
}

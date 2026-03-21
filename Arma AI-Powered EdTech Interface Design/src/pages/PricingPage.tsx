import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Brain, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { billingApi } from '../services/api';
import { toast } from 'sonner';
import type { PlanTier } from '../types/api';

const plans = [
  {
    tier: 'free' as PlanTier,
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Get started with AI learning',
    icon: <Brain className="w-5 h-5" />,
    features: [
      '3 materials per month',
      '50 chat messages per month',
      '100 MB storage',
      'AI summaries & notes',
      'Flashcards & quizzes',
    ],
    limitations: ['No podcast generation', 'No presentations'],
  },
  {
    tier: 'student' as PlanTier,
    name: 'Student',
    price: '$9.99',
    period: '/month',
    description: 'Perfect for active learners',
    icon: <Zap className="w-5 h-5" />,
    popular: true,
    features: [
      '30 materials per month',
      '500 chat messages per month',
      '1 GB storage',
      'AI summaries & notes',
      'Flashcards & quizzes',
      '10 podcasts per month',
      '10 presentations per month',
    ],
    limitations: [],
  },
  {
    tier: 'pro' as PlanTier,
    name: 'Pro',
    price: '$29.99',
    period: '/month',
    description: 'Unlimited learning power',
    icon: <Crown className="w-5 h-5" />,
    features: [
      'Unlimited materials',
      'Unlimited chat messages',
      '10 GB storage',
      'AI summaries & notes',
      'Flashcards & quizzes',
      'Unlimited podcasts',
      'Unlimited presentations',
      'Priority support',
    ],
    limitations: [],
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, subscription } = useAuth();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  const currentPlan = subscription?.plan_tier || 'free';

  const handleSelectPlan = async (tier: PlanTier) => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    if (tier === 'free' || tier === currentPlan) return;

    setLoadingTier(tier);
    try {
      const url = await billingApi.createCheckout(
        tier,
        `${window.location.origin}/dashboard/profile?checkout=success`,
        `${window.location.origin}/pricing`,
      );
      window.location.href = url;
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C0C0F] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Header */}
      <nav className="relative z-10 px-6 py-6 md:py-8 max-w-7xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.1] flex items-center justify-center text-primary backdrop-blur-md">
            <Brain className="w-5 h-5" />
          </div>
          <span className="text-xl font-medium tracking-tight text-white/90">arma</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Dashboard
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Log in
            </button>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-24">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-4">
            Choose your plan
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            Unlock the full power of AI-assisted learning. Upgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.tier;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.tier}
                className={`relative rounded-3xl p-8 flex flex-col transition-all ${
                  isPopular
                    ? 'bg-white/[0.04] border-2 border-primary/30 shadow-[0_0_40px_rgba(255,138,61,0.1)]'
                    : 'bg-white/[0.02] border border-white/[0.05]'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-black text-xs font-bold rounded-full uppercase tracking-wider">
                    Popular
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isPopular ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'}`}>
                  {plan.icon}
                </div>

                <h3 className="text-xl font-medium text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-white/40 mb-6">{plan.description}</p>

                <div className="mb-8">
                  <span className="text-4xl font-medium text-white">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-white/70">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3 text-sm text-white/30 line-through">
                      <Check className="w-4 h-4 text-white/10 mt-0.5 flex-shrink-0" />
                      {limitation}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={isCurrent || loadingTier === plan.tier}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-white/5 text-white/40 cursor-default'
                      : isPopular
                        ? 'bg-primary text-black hover:bg-primary/90 hover:shadow-[0_0_25px_rgba(255,138,61,0.4)]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {loadingTier === plan.tier ? (
                    'Redirecting...'
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : plan.tier === 'free' ? (
                    'Get Started'
                  ) : (
                    <>
                      Upgrade
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

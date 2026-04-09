import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Brain, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { billingApi } from '../services/api';
import { toast } from 'sonner';
import type { PlanTier } from '../types/api';
import { Header } from '@/components/ui/header';
import { useTranslation } from '../i18n/I18nContext';

const plans = [
  {
    tier: 'free' as PlanTier,
    name: 'pricing.free_name',
    price: '$0',
    period: '',
    description: 'pricing.free_desc',
    icon: <Brain className="w-5 h-5" />,
    features: [
      'pricing.feat_3_materials',
      'pricing.feat_50_chat',
      'pricing.feat_100mb',
      'pricing.feat_summaries',
      'pricing.feat_flashcards',
    ],
    limitations: ['pricing.limit_no_podcast', 'pricing.limit_no_presentations'],
  },
  {
    tier: 'student' as PlanTier,
    name: 'pricing.student_name',
    price: '$9.99',
    period: '/month',
    description: 'pricing.student_desc',
    icon: <Zap className="w-5 h-5" />,
    popular: true,
    features: [
      'pricing.feat_30_materials',
      'pricing.feat_500_chat',
      'pricing.feat_1gb',
      'pricing.feat_summaries',
      'pricing.feat_flashcards',
      'pricing.feat_10_podcasts',
      'pricing.feat_10_presentations',
    ],
    limitations: [],
  },
  {
    tier: 'pro' as PlanTier,
    name: 'pricing.pro_name',
    price: '$29.99',
    period: '/month',
    description: 'pricing.pro_desc',
    icon: <Crown className="w-5 h-5" />,
    features: [
      'pricing.feat_unlimited_materials',
      'pricing.feat_unlimited_chat',
      'pricing.feat_10gb',
      'pricing.feat_summaries',
      'pricing.feat_flashcards',
      'pricing.feat_unlimited_podcasts',
      'pricing.feat_unlimited_presentations',
      'pricing.feat_priority_support',
    ],
    limitations: [],
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, subscription } = useAuth();
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-[#0C0C0F] relative ">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full opacity-40" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full opacity-30" />
      </div>

      {/* Header */}
      <Header />

      {/* Content */}
      <div className="relative z-10 max-w-6xl px-6 pt-8 pb-24 some-margin-idk-i-fucking-hate-tailwind-ahhhh">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-medium text-white tracking-tight mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-lg text-white/50 max-w-xl mx-auto">
            {t('pricing.subtitle')}
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
                    {t('pricing.popular')}
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isPopular ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/60'}`}>
                  {plan.icon}
                </div>

                <h3 className="text-xl font-medium text-white mb-1">{t(plan.name)}</h3>
                <p className="text-sm text-white/40 mb-6">{t(plan.description)}</p>

                <div className="mb-8">
                  <span className="text-4xl font-medium text-white">{plan.price}</span>
                  <span className="text-white/40 text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-white/70">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      {t(feature)}
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3 text-sm text-white/30 line-through">
                      <Check className="w-4 h-4 text-white/10 mt-0.5 flex-shrink-0" />
                      {t(limitation)}
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
                    t('pricing.redirecting')
                  ) : isCurrent ? (
                    t('pricing.current_plan')
                  ) : plan.tier === 'free' ? (
                    t('pricing.get_started')
                  ) : (
                    <>
                      {t('pricing.upgrade')}
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

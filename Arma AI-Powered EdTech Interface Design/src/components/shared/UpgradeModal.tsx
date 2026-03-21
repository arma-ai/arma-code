import { useState, useEffect, useCallback } from 'react';
import { X, Zap, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QuotaExceededError } from '../../types/api';

export function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<QuotaExceededError | null>(null);
  const navigate = useNavigate();

  const handleQuotaExceeded = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail && typeof detail === 'object') {
      setError(detail as QuotaExceededError);
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('quota-exceeded', handleQuotaExceeded);
  }, [handleQuotaExceeded]);

  if (!isOpen || !error) return null;

  const isQuotaError = error.error === 'quota_exceeded';

  const handleUpgrade = () => {
    setIsOpen(false);
    navigate('/pricing');
  };

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-3 md:mx-4 rounded-3xl bg-[#18181B] border border-white/10 shadow-2xl overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        <div className="p-5 md:p-8">
          <button onClick={handleClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-5">
              {isQuotaError ? <Zap className="w-7 h-7 text-primary" /> : <Lock className="w-7 h-7 text-primary" />}
            </div>

            <h2 className="text-xl font-medium text-white mb-2">
              {isQuotaError ? 'Limit Reached' : 'Feature Locked'}
            </h2>

            <p className="text-sm text-white/50 mb-6 max-w-sm">
              {error.message}
            </p>

            {isQuotaError && error.used !== undefined && error.limit !== undefined && (
              <div className="w-full mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/60">{error.resource_type?.replace('_', ' ')}</span>
                  <span className="text-amber-400 font-medium">{error.used} / {error.limit}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              className="w-full py-3 bg-primary text-black rounded-xl text-sm font-bold hover:bg-primary/90 transition-all hover:shadow-[0_0_25px_rgba(255,138,61,0.3)]"
            >
              View Plans & Upgrade
            </button>

            <button onClick={handleClose} className="mt-3 text-sm text-white/30 hover:text-white/60 transition-colors">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

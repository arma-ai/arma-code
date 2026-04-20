import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { useTranslation } from '../i18n/I18nContext';
import { toast } from 'sonner';
import { AICore } from '../components/shared/AICore';
import { Mail, ArrowLeft, RotateCcw, Loader2 } from 'lucide-react';
import { Header } from '@/components/ui/header';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendCode } = useAuth();
  const { t } = useTranslation();

  const emailFromQuery = searchParams.get('email') || '';
  const isReverify = searchParams.get('reverify') === 'true';
  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!canResend && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      document.getElementById('code-5')?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      toast.error(t('verify.code_required'));
      return;
    }

    if (!email) {
      toast.error(t('verify.email_required'));
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(email, verificationCode);
      toast.success(t('verify.success'));
      navigate('/dashboard');
    } catch (error: any) {
      const detail = error.response?.data?.detail || t('verify.error');
      toast.error(typeof detail === 'string' ? detail : t('verify.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) return;

    setIsResending(true);
    try {
      await resendCode(email);
      toast.success(t('verify.resent'));
      setCanResend(false);
      setCountdown(30);
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } catch (error: any) {
      const detail = error.response?.data?.detail || t('verify.resend_error');
      toast.error(typeof detail === 'string' ? detail : t('verify.resend_error'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0C0C0F' }}>
      <Header />

      {/* Background AI Core */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <AICore size="xl" />
      </motion.div>

      {/* Verify Card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">
          {/* Icon */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 variants={itemVariants} className="text-2xl font-medium text-white text-center mb-2">
            {isReverify ? t('verify.reverify_title') : t('verify.title')}
          </motion.h1>
          <motion.p variants={itemVariants} className="text-white/50 text-center text-sm mb-6">
            {isReverify ? t('verify.reverify_subtitle', { email }) : t('verify.subtitle', { email })}
          </motion.p>

          {/* Email Input (if not provided) */}
          {!emailFromQuery && (
            <motion.div variants={itemVariants} className="mb-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('verify.email_placeholder')}
                className="w-full h-12 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all"
              />
            </motion.div>
          )}

          {/* Code Inputs */}
          <form onSubmit={handleSubmit}>
            <motion.div variants={itemVariants} className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-bold bg-white/[0.03] border border-white/[0.06] rounded-xl text-white focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all"
                />
              ))}
            </motion.div>

            {/* Submit Button */}
            <motion.div variants={itemVariants}>
              <Button
                type="submit"
                disabled={isLoading || code.some(d => !d)}
                className="w-full h-12 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('verify.verifying')}
                  </>
                ) : (
                  t('verify.submit')
                )}
              </Button>
            </motion.div>
          </form>

          {/* Resend Code */}
          <motion.div variants={itemVariants} className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={!canResend || isResending || !email}
              className="text-sm text-primary/70 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mx-auto"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('verify.resending')}
                </>
              ) : canResend ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  {t('verify.resend')}
                </>
              ) : (
                t('verify.resend_countdown', { seconds: countdown })
              )}
            </button>
          </motion.div>

          {/* Back to Login */}
          <motion.div variants={itemVariants} className="mt-4 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('verify.back_to_login')}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

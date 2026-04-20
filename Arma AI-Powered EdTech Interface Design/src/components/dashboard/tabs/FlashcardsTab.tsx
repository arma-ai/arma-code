import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Play, CheckCircle2, Loader2, ChevronLeft, ChevronRight, RotateCw, X, Trophy, Zap, BookOpen } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nContext';
import { toast } from 'sonner';
import type { Material, Flashcard } from '../../../types/api';

type FlashcardItem = Pick<Flashcard, 'question' | 'answer'> & Partial<Flashcard>;

export interface FlashcardsTabProps {
    material: Material;
    flashcards: FlashcardItem[];
    loading: boolean;
    viewMode?: 'all' | 'single';
    onComplete?: () => void;
    onGoToQuiz?: () => void;
}

const PREVIEW_COUNT = 3;

export function FlashcardsTab({ material, flashcards, loading, viewMode = 'single', onComplete, onGoToQuiz }: FlashcardsTabProps) {
    const { t } = useTranslation();
    const [reviewStarted, setReviewStarted] = useState(false);
    const [currentCard, setCurrentCard] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [knownCards, setKnownCards] = useState<number[]>([]);
    const [learningCards, setLearningCards] = useState<number[]>([]);
    const [hasNotifiedComplete, setHasNotifiedComplete] = useState(false);

    // Notify parent when all cards are reviewed
    useEffect(() => {
        if (reviewStarted && knownCards.length + learningCards.length === flashcards.length && !hasNotifiedComplete) {
            setHasNotifiedComplete(true);
            onComplete?.();
        }
    }, [knownCards.length, learningCards.length, flashcards.length, reviewStarted, hasNotifiedComplete, onComplete]);

    // Debug
    // console.log('=== FlashcardsTab DEBUG ===', {
    //     hasFlashcards: !!flashcards,
    //     flashcardsLength: flashcards?.length,
    //     flashcards: flashcards,
    //     firstCard: flashcards?.[0]
    // });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-white/40">{t('flashcards.loading')}</p>
                </div>
            </div>
        );
    }

    if (!flashcards || flashcards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
                    <Brain size={40} />
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">{t('flashcards.no_flashcards')}</h2>
                <p className="text-white/40 max-w-md mb-8">
                    {t('flashcards.not_generated', { context: viewMode === 'all' ? 'all' : 'single' })}
                </p>
                <button
                    onClick={() => toast.info(t('flashcards.coming_soon'))}
                    className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                    {t('flashcards.generate')}
                </button>
            </div>
        );
    }

    // Review Session Complete
    if (reviewStarted && knownCards.length + learningCards.length === flashcards.length) {
        const percentage = Math.round((knownCards.length / flashcards.length) * 100);
        const isExcellent = percentage >= 80;
        const isGood = percentage >= 50;
        const circumference = 2 * Math.PI * 54;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        const accentColor = isExcellent ? '#10b981' : isGood ? '#f59e0b' : '#FF8A3D';

        return (
            <div className="flex items-center justify-center py-12 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-sm flex flex-col items-center gap-5"
                >
                    {/* Trophy icon */}
                    <motion.div
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
                    >
                        <Trophy size={28} style={{ color: accentColor }} />
                    </motion.div>

                    {/* Title */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {isExcellent ? t('flashcards.excellent') : isGood ? t('flashcards.good_progress') : t('flashcards.keep_learning')}
                        </h2>
                        <p className="text-white/40 text-sm">
                            {t('flashcards.reviewed_all', { count: flashcards.length })}
                        </p>
                    </div>

                    {/* Circular progress */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="relative"
                    >
                        <svg width="140" height="140" viewBox="0 0 140 140">
                            <circle cx="70" cy="70" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                            <motion.circle
                                cx="70" cy="70" r="54"
                                fill="none"
                                stroke={accentColor}
                                strokeWidth="10"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ delay: 0.35, duration: 1, ease: 'easeOut' }}
                                transform="rotate(-90 70 70)"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white">{percentage}%</span>
                            <span className="text-xs text-white/40">{t('flashcards.known')}</span>
                        </div>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        className="w-full grid grid-cols-2 gap-3"
                    >
                        <div className="p-5 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/15 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-400">{knownCards.length}</div>
                                <div className="text-xs text-white/40">{t('flashcards.known')}</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/15 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                <BookOpen size={18} className="text-amber-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-400">{learningCards.length}</div>
                                <div className="text-xs text-white/40">{t('flashcards.learning')}</div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Buttons */}
                    <div className="w-full flex flex-col gap-2">
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.4 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onGoToQuiz?.()}
                            className="w-full px-6 py-4 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(255,138,61,0.2)]"
                        >
                            <ChevronRight size={17} />
                            {t('flashcards.continue_to_quiz')}
                        </motion.button>
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, duration: 0.4 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                setReviewStarted(false);
                                setCurrentCard(0);
                                setIsFlipped(false);
                                setKnownCards([]);
                                setLearningCards([]);
                            }}
                            className="w-full px-6 py-3 bg-white/[0.03] border border-white/10 text-white/50 rounded-xl font-medium hover:bg-white/[0.06] transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <RotateCw size={15} />
                            {t('flashcards.review_again')}
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // Active Review Session
    if (reviewStarted) {
        const card = flashcards[currentCard];
        const progressPercent = ((knownCards.length + learningCards.length) / flashcards.length) * 100;

        return (
            <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-8">

                {/* Progress bar */}
                <div className="w-full max-w-2xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/30 uppercase tracking-wider">
                            {currentCard + 1} / {flashcards.length}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-white/30">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 size={11} className="text-emerald-400" />
                                {knownCards.length}
                            </span>
                            <span className="flex items-center gap-1">
                                <BookOpen size={11} className="text-amber-400" />
                                {learningCards.length}
                            </span>
                        </div>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-primary rounded-full"
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* Flashcard */}
                <div className="w-full max-w-2xl h-64" style={{ perspective: '1200px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`card-${currentCard}`}
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -40 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                            className="relative h-full cursor-pointer select-none"
                            onClick={() => setIsFlipped(!isFlipped)}
                        >
                            <motion.div
                                className="w-full h-full"
                                initial={false}
                                animate={{ rotateY: isFlipped ? 180 : 0 }}
                                transition={{ duration: 0.55, type: 'spring', stiffness: 180, damping: 22 }}
                                style={{ transformStyle: 'preserve-3d' }}
                            >
                                {/* Front */}
                                <div
                                    className="absolute inset-0 rounded-2xl border border-white/[0.08] bg-white/[0.03] flex flex-col items-center justify-center text-center p-8"
                                    style={{ backfaceVisibility: 'hidden' }}
                                >
                                    <span className="text-[10px] font-semibold text-white/20 uppercase tracking-widest mb-5">
                                        {t('flashcards.question')}
                                    </span>
                                    <p className="text-xl font-medium text-white leading-relaxed max-w-lg">
                                        {card.question}
                                    </p>
                                    <div className="absolute bottom-5 flex items-center gap-1.5 text-xs text-white/20">
                                        <RotateCw size={11} />
                                        <span>{t('flashcards.click_to_flip')}</span>
                                    </div>
                                </div>

                                {/* Back */}
                                <div
                                    className="absolute inset-0 rounded-2xl border border-primary/20 bg-primary/[0.04] flex flex-col items-center justify-center text-center p-8"
                                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                >
                                    <span className="text-[10px] font-semibold text-primary/40 uppercase tracking-widest mb-5">
                                        {t('flashcards.answer')}
                                    </span>
                                    <p className="text-xl font-medium text-white leading-relaxed max-w-lg">
                                        {card.answer}
                                    </p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex gap-3 w-full max-w-2xl">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                            setLearningCards([...learningCards, currentCard]);
                            if (currentCard < flashcards.length - 1) {
                                setCurrentCard(currentCard + 1);
                                setIsFlipped(false);
                            }
                        }}
                        className="flex-1 py-4 px-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold hover:bg-red-500/15 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <X size={16} />
                        <span>{t('flashcards.still_learning')}</span>
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                            setKnownCards([...knownCards, currentCard]);
                            if (currentCard < flashcards.length - 1) {
                                setCurrentCard(currentCard + 1);
                                setIsFlipped(false);
                            }
                        }}
                        className="flex-1 py-4 px-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/15 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <CheckCircle2 size={16} />
                        <span>{t('flashcards.know_it')}</span>
                    </motion.button>
                </div>
            </div>
        );
    }

    // Preview Screen (Default)
    return (
        <div className="max-w-4xl mx-auto px-12 pt-12">
            {/* Header Card */}
            <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-8 mb-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-24 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,138,61,0.1)] relative">
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <Brain size={32} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-white mb-1">{t('flashcards.deck_title')}</h2>
                        <p className="text-white/40 text-sm">{material?.title || (viewMode === 'all' ? t('project.view_mode.all') : t('flashcards.material'))}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-xl font-bold text-white mb-1">{flashcards.length}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">{t('flashcards.cards_label')}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-xl font-bold text-emerald-400 mb-1">{t('flashcards.ready')}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">{t('flashcards.status')}</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-xl font-bold text-white mb-1">{material?.type?.toUpperCase() || t('flashcards.na')}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">{t('flashcards.source')}</div>
                    </div>
                </div>
            </div>

            {/* Preview Cards */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-white/60 mb-6 px-2">{t('flashcards.card_preview')}</h3>
                <div className="space-y-3">
                    {flashcards.slice(0, PREVIEW_COUNT).map((card, idx) => (
                        <div key={idx} className="p-6 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.03] transition-colors">
                            <div className="mb-3">
                                <div className="text-xs text-primary/60 uppercase tracking-wider mb-2">{t('flashcards.question')}</div>
                                <div className="text-white/90 text-base leading-relaxed">{card.question}</div>
                            </div>
                            <div className="pt-4 mt-4 border-t border-white/5">
                                <div className="text-xs text-emerald-500/60 uppercase tracking-wider mb-2">{t('flashcards.answer')}</div>
                                <div className="text-white/70 text-base leading-relaxed">{card.answer}</div>
                            </div>
                        </div>
                    ))}
                </div>
                {flashcards.length > PREVIEW_COUNT && (
                    <p className="text-xs text-white/30 text-center mt-6">+ {flashcards.length - PREVIEW_COUNT} {t('flashcards.more_cards')}</p>
                )}
            </div>

            <div className="h-24" />

            {/* Start Button — sticky */}
            <div className="sticky bottom-0 pb-6 pt-3 bg-[#0C0C0F]">
                <button
                    onClick={() => setReviewStarted(true)}
                    className="w-full px-8 py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,138,61,0.2)] flex items-center justify-center gap-3"
                >
                    <Play size={20} fill="currentColor" />
                    {t('flashcards.start_review')}
                </button>
            </div>
        </div>
    );
}

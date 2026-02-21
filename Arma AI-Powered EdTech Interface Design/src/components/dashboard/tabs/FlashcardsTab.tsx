import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Material, Flashcard } from '../../../types/api';
import { ViewState } from '../../../App';

export interface FlashcardsTabProps {
    material: Material;
    flashcards: Flashcard[];
    loading: boolean;
    onNavigate?: (view: ViewState) => void;
    onSelectDeck?: (id: number) => void;
    navigate: ReturnType<typeof useNavigate>;
}

const PREVIEW_COUNT = 3;

export function FlashcardsTab({ material, flashcards, loading, onNavigate, onSelectDeck, navigate }: FlashcardsTabProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-white/40">Loading flashcards...</p>
                </div>
            </div>
        );
    }

    if (flashcards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
                    <Brain size={40} />
                </div>
                <h2 className="text-2xl font-medium text-white mb-2">No Flashcards Yet</h2>
                <p className="text-white/40 max-w-md mb-8">
                    Flashcards have not been generated for this material yet.
                </p>
                <button
                    onClick={() => toast.info('Flashcard generation coming soon')}
                    className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all"
                >
                    Generate Flashcards
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-12 h-full overflow-y-auto scrollbar-hide">
            <div className="w-full bg-white/[0.02] border border-white/5 rounded-2xl p-8 mb-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-24 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,138,61,0.1)] relative">
                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <Brain size={32} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-medium text-white mb-1">Flashcard Deck</h2>
                        <p className="text-white/40 text-sm">{material.title}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-xl font-bold text-white mb-1">{flashcards.length}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Cards</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-xl font-bold text-emerald-400 mb-1">Ready</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Status</div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                        <div className="text-xl font-bold text-white mb-1">{material.type.toUpperCase()}</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Source</div>
                    </div>
                </div>
            </div>

            {/* Flashcard Preview */}
            <div className="space-y-4 mb-8">
                <h3 className="text-sm font-medium text-white/60 mb-4">Card Preview</h3>
                {flashcards.slice(0, PREVIEW_COUNT).map((card) => (
                    <div key={card.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <div>
                            <div className="text-xs text-white/30 mb-1">Question:</div>
                            <div className="text-white/90">{card.question}</div>
                        </div>
                        <div>
                            <div className="text-xs text-white/30 mb-1">Answer:</div>
                            <div className="text-white/60">{card.answer}</div>
                        </div>
                        {card.difficulty && (
                            <div className="text-xs text-white/40">Difficulty: {card.difficulty}</div>
                        )}
                    </div>
                ))}
                {flashcards.length > PREVIEW_COUNT && (
                    <p className="text-xs text-white/30 text-center">+ {flashcards.length - PREVIEW_COUNT} more cards</p>
                )}
            </div>

            <button
                onClick={() => navigate(`/dashboard/flashcards/${material.id}`)}
                className="w-full px-8 py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,138,61,0.2)] flex items-center justify-center gap-3"
            >
                <Play size={20} fill="currentColor" />
                Start Review
            </button>
        </div>
    );
}

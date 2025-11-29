'use client';

import { useState, useEffect } from 'react';
import ProgressBlock from './ProgressBlock';
import AchievementsBlock from './AchievementsBlock';
import InteractiveQuiz from './InteractiveQuiz';
import InteractiveFlashcards from './InteractiveFlashcards';
import TutorChat from './TutorChat';
import GenerateQuizButton from './GenerateQuizButton';
import GenerateFlashcardsButton from './GenerateFlashcardsButton';
import SelectableText from './SelectableText';
import type { MaterialSummary, MaterialNotes, Flashcard, Quiz, TutorMessage } from '@/app/actions/materials';
import type { UserProgress } from '@/app/actions/progress';

interface MaterialTabsProps {
  materialId: string;
  summary: MaterialSummary | null;
  notes: MaterialNotes | null;
  flashcards: Flashcard[];
  quiz: Quiz[];
  tutorMessages: TutorMessage[];
  progress: UserProgress | null;
  hasAIData: boolean;
}

export default function MaterialTabs({
  materialId,
  summary,
  notes,
  flashcards,
  quiz,
  tutorMessages,
  progress,
  hasAIData,
}: MaterialTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('tutor');

  const tabs = [
    { id: 'tutor', label: 'AI Tutor' },
    { id: 'summary', label: 'Summary' },
    { id: 'notes', label: 'Notes' },
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'quiz', label: 'Quizzes' },
    { id: 'progress', label: 'Progress' },
    { id: 'achievements', label: 'Achievements' },
  ];

  // Слушаем событие переключения на вкладку AI Tutor
  useEffect(() => {
    const handleSwitchToTutor = () => {
      setActiveTab('tutor');
    };

    window.addEventListener('switch-to-tutor-tab' as any, handleSwitchToTutor);
    return () => {
      window.removeEventListener('switch-to-tutor-tab' as any, handleSwitchToTutor);
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs Navigation */}
      <div className="border-b border-black/10 bg-white sticky top-0 z-10">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'border-black text-black bg-white'
                  : 'border-transparent text-gray-600 hover:text-black hover:bg-gray-50'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {/* AI Tutor Tab */}
        {activeTab === 'tutor' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold text-black">AI Tutor</h2>
              </div>
              <p className="text-gray-600 mb-4 text-sm">
                Ask questions about the material. The AI tutor will answer based on the document content.
              </p>
              <TutorChat materialId={materialId} initialMessages={tutorMessages} />
            </div>
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-black">Summary</h2>
              </div>
              {!hasAIData && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Material is being processed. Summary will be available soon.
                  </p>
                </div>
              )}
              {summary && (
                <div>
                  <div className="bg-white border-2 border-black/10 rounded-lg p-6 shadow-md">
                    <SelectableText materialId={materialId}>
                      {summary.summary}
                    </SelectableText>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-black">Notes</h2>
              </div>
              {!hasAIData && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Material is being processed. Notes will be available soon.
                  </p>
                </div>
              )}
              {notes && (
                <div>
                  <div className="bg-white border-2 border-black/10 rounded-lg p-6 shadow-md">
                    <SelectableText materialId={materialId}>
                      {notes.notes}
                    </SelectableText>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-black">
                  Flashcards {flashcards.length > 0 && `(${flashcards.length})`}
                </h2>
              </div>
              {flashcards.length === 0 && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    {hasAIData
                      ? 'Generate flashcards from the material notes.'
                      : 'Material is being processed. Flashcards will be available soon.'}
                  </p>
                  {hasAIData && (
                    <GenerateFlashcardsButton materialId={materialId} />
                  )}
                </div>
              )}
              {flashcards.length > 0 && (
                <div>
                  <InteractiveFlashcards flashcards={flashcards} materialId={materialId} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-8 border border-black/10 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-black">
                  Quizzes {quiz.length > 0 && `(${quiz.length} questions)`}
                </h2>
              </div>
              {quiz.length === 0 && (
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Generate a quiz with multiple-choice questions based on the material notes.
                  </p>
                  <GenerateQuizButton materialId={materialId} />
                </div>
              )}
              {quiz.length > 0 && <InteractiveQuiz quiz={quiz} materialId={materialId} />}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <ProgressBlock materialId={materialId} initialProgress={progress} />
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <AchievementsBlock materialId={materialId} />
          </div>
        )}
      </div>
    </div>
  );
}

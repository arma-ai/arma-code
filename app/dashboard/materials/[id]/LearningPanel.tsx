'use client';

import { useState, useEffect } from 'react';
import TutorChat from './TutorChat';
import InteractiveFlashcards from './InteractiveFlashcards';
import InteractiveQuiz from './InteractiveQuiz';
import ProgressBlock from './ProgressBlock';
import AchievementsBlock from './AchievementsBlock';
import SelectableText from './SelectableText';
import GenerateQuizButton from './GenerateQuizButton';
import GenerateFlashcardsButton from './GenerateFlashcardsButton';
import type { MaterialSummary, MaterialNotes, Flashcard, Quiz, TutorMessage } from '@/app/actions/materials';
import type { UserProgress } from '@/app/actions/progress';

interface LearningPanelProps {
  materialId: string;
  summary: MaterialSummary | null;
  notes: MaterialNotes | null;
  flashcards: Flashcard[];
  quiz: Quiz[];
  tutorMessages: TutorMessage[];
  progress: UserProgress | null;
  hasAIData: boolean;
}

export default function LearningPanel({
  materialId,
  summary,
  notes,
  flashcards,
  quiz,
  tutorMessages,
  progress,
  hasAIData,
}: LearningPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('tutor');

  const tabs = [
    { id: 'tutor', label: 'AI chat with tutor' },
    { id: 'flashcards', label: 'Flashcards' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'summary', label: 'Summary' },
    { id: 'notes', label: 'My Notes' },
  ];

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
      {/* Top Buttons */}
      <div className="flex justify-end gap-3 px-6 py-4 border-b border-gray-200">
        <button className="px-4 py-2 border-2 border-red-500 text-red-500 rounded-md hover:bg-red-50 transition-colors font-medium text-sm">
          Update
        </button>
        <button className="px-4 py-2 border-2 border-black text-black rounded-md hover:bg-gray-50 transition-colors font-medium text-sm">
          Share
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-all relative ${
                activeTab === tab.id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {activeTab === tab.id && (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* AI Tutor Tab */}
        {activeTab === 'tutor' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <TutorChat materialId={materialId} initialMessages={tutorMessages} />
            </div>
          </div>
        )}

        {/* Flashcards Tab */}
        {activeTab === 'flashcards' && (
          <div className="p-6">
            {flashcards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  {hasAIData
                    ? 'Generate flashcards from the material notes.'
                    : 'Material is being processed. Flashcards will be available soon.'}
                </p>
                {hasAIData && (
                  <GenerateFlashcardsButton materialId={materialId} />
                )}
              </div>
            ) : (
              <InteractiveFlashcards flashcards={flashcards} materialId={materialId} />
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="p-6">
            {quiz.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  Generate a quiz with multiple-choice questions based on the material notes.
                </p>
                <GenerateQuizButton materialId={materialId} />
              </div>
            ) : (
              <InteractiveQuiz quiz={quiz} materialId={materialId} />
            )}
          </div>
        )}

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="p-6">
            {!hasAIData && (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Material is being processed. Summary will be available soon.
                </p>
              </div>
            )}
            {summary && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <SelectableText materialId={materialId}>
                  {summary.summary}
                </SelectableText>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="p-6">
            {!hasAIData && (
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Material is being processed. Notes will be available soon.
                </p>
              </div>
            )}
            {notes && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <SelectableText materialId={materialId}>
                  {notes.notes}
                </SelectableText>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


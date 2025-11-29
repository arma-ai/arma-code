'use client';

import { useState, useRef } from 'react';
import { askAboutSelection } from '@/app/actions/askAboutSelection';
import { useRouter } from 'next/navigation';

interface SelectionModalProps {
  materialId: string;
  selectedText: string;
  onClose: () => void;
}

export default function SelectionModal({ materialId, selectedText, onClose }: SelectionModalProps) {
  const router = useRouter();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState<string>('');
  const currentRequestIdRef = useRef<number>(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    // Генерируем уникальный ID для этого запроса
    const requestId = Date.now();
    currentRequestIdRef.current = requestId;

    setLoading(true);
    setError(null);
    setAnswer(null); // Очищаем предыдущий ответ

    try {
      const userQ = question.trim();
      setUserQuestion(userQ);

      const updatedMessages = await askAboutSelection(materialId, selectedText, userQ);

      // Проверяем, не устарел ли этот запрос (если был задан новый вопрос)
      if (currentRequestIdRef.current !== requestId) {
        console.log('Ignoring outdated response');
        return;
      }

      // Находим наш вопрос в сообщениях (последнее сообщение пользователя с context='selection')
      const ourUserMessage = updatedMessages
        .filter(msg => msg.role === 'user' && msg.context === 'selection' && msg.content === userQ)
        .pop();

      if (!ourUserMessage) {
        // Если не нашли наш вопрос, берем последнее сообщение пользователя
        const lastUserMessage = updatedMessages
          .filter(msg => msg.role === 'user' && msg.context === 'selection')
          .pop();

        if (lastUserMessage) {
          // Ищем ответ, который идет после этого вопроса
          const userMessageIndex = updatedMessages.findIndex(msg => msg.id === lastUserMessage.id);
          const assistantMessage = updatedMessages
            .slice(userMessageIndex + 1)
            .find(msg => msg.role === 'assistant');

          if (assistantMessage) {
            setAnswer(assistantMessage.content);
          }
        }
      } else {
        // Нашли наш вопрос, ищем ответ после него
        const userMessageIndex = updatedMessages.findIndex(msg => msg.id === ourUserMessage.id);
        const assistantMessage = updatedMessages
          .slice(userMessageIndex + 1)
          .find(msg => msg.role === 'assistant');

        if (assistantMessage) {
          setAnswer(assistantMessage.content);
        }
      }

      setQuestion('');
      setLoading(false);

      // Отправляем события для обновления UI
      window.dispatchEvent(new CustomEvent('tutor-message-updated', {
        detail: { materialId, messages: updatedMessages }
      }));
      window.dispatchEvent(new Event('progress-updated'));

      // Переключаемся на вкладку AI Tutor
      window.dispatchEvent(new CustomEvent('switch-to-tutor-tab'));

      // Обновляем страницу для синхронизации данных
      router.refresh();
    } catch (err) {
      // Проверяем, не устарел ли запрос
      if (currentRequestIdRef.current !== requestId) {
        console.log('Ignoring error from outdated request');
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to get answer');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col border border-black/10">
        {/* Header */}
        <div className="bg-black px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Ask AI about selected text</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!answer ? (
            <>
              {/* Selected Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Text:
                </label>
                <div className="bg-gray-50 border-2 border-black/10 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-black text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedText}
                  </p>
                </div>
              </div>

              {/* Question Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="question" className="block text-sm font-medium text-black mb-2">
                    Your Question:
                  </label>
                  <textarea
                    id="question"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about the selected text..."
                    className="w-full px-4 py-3 border-2 border-black/20 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors resize-none"
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-gray-100 border border-black/20 text-black px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="flex-1 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Getting answer...
                      </span>
                    ) : (
                      'Ask AI'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="px-6 py-3 border-2 border-black/20 rounded-lg text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Show Answer */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Your Question:
                  </label>
                  <div className="bg-gray-50 border-2 border-black/10 rounded-lg p-4">
                    <p className="text-black text-sm leading-relaxed whitespace-pre-wrap">
                      {userQuestion}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    AI Answer:
                  </label>
                  <div className="bg-white border-2 border-black/10 rounded-lg p-4 max-h-60 overflow-y-auto shadow-md">
                    <p className="text-black text-sm leading-relaxed whitespace-pre-wrap">
                      {answer}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-black/10 rounded-lg p-3">
                  <p className="text-gray-700 text-xs">
                    Answer also saved in AI Tutor chat. Go to &quot;AI Tutor&quot; tab to see full conversation history.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnswer(null);
                    setUserQuestion('');
                    setQuestion('');
                  }}
                  className="flex-1 bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all font-semibold shadow-lg hover:shadow-xl"
                >
                  Ask Another Question
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 border-2 border-black/20 rounded-lg text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors font-semibold"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


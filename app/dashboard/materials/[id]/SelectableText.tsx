'use client';

import { useState, useRef, useEffect } from 'react';
import { askAboutSelection } from '@/app/actions/askAboutSelection';
import { useRouter } from 'next/navigation';

interface SelectableTextProps {
  children: string;
  materialId: string;
}

export default function SelectableText({ children, materialId }: SelectableTextProps) {
  const [selectedText, setSelectedText] = useState('');
  const [savedSelectedText, setSavedSelectedText] = useState(''); // Сохраняем выделенный текст для поля вопроса
  const [showQuestionBox, setShowQuestionBox] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const questionBoxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let selectionTimeout: NodeJS.Timeout;
    
    const handleSelection = () => {
      // Debounce для оптимизации производительности
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
      
      selectionTimeout = setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          setSelectedText('');
          return;
        }

        const text = selection.toString().trim();
        // Минимальная длина выделения - 5 символов
        if (text.length < 5) {
          setSelectedText('');
          return;
        }

        // Проверяем, что выделение находится внутри нашего контейнера
        const range = selection.getRangeAt(0);
        if (!containerRef.current?.contains(range.commonAncestorContainer)) {
          setSelectedText('');
          return;
        }

        setSelectedText(text);

        // Позиционируем кнопку
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        
        if (containerRect) {
          // Позиционируем кнопку под выделенным текстом, по центру
          const buttonLeft = Math.max(
            0,
            Math.min(
              rect.left - containerRect.left + rect.width / 2,
              containerRect.width - 200 // Оставляем место для кнопки (примерно 200px)
            )
          );
          
          setButtonPosition({
            top: rect.bottom - containerRect.top + 10,
            left: buttonLeft,
          });
        }
      }, 100); // Debounce 100ms
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Не очищаем выделение при клике на кнопку или поле вопроса
      if (buttonRef.current?.contains(e.target as Node) || 
          questionBoxRef.current?.contains(e.target as Node)) {
        return;
      }
      
      // Не очищаем выделение, если поле вопроса открыто
      if (showQuestionBox) {
        return;
      }
      
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setSelectedText('');
        setShowQuestionBox(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleClickOutside);
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }
    };
  }, [showQuestionBox]);

  const handleAskAI = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedText.trim() && selectedText.trim().length >= 5) {
      // Сохраняем выделенный текст перед открытием поля вопроса
      setSavedSelectedText(selectedText.trim());
      setShowQuestionBox(true);
      setQuestion('');
      setError(null);
      // Не очищаем выделение сразу, чтобы пользователь видел что выделено
    }
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    const textToUse = savedSelectedText || selectedText.trim();
    if (!textToUse || textToUse.length < 5) {
      setError('Selected text is too short');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Получаем обновленные сообщения с ответом
      const updatedMessages = await askAboutSelection(materialId, textToUse, question.trim());
      
      // Обновляем UI через события (без перезагрузки страницы)
      window.dispatchEvent(new CustomEvent('tutor-message-updated', { 
        detail: { materialId, messages: updatedMessages } 
      }));
      window.dispatchEvent(new Event('progress-updated'));
      window.dispatchEvent(new CustomEvent('switch-to-tutor-tab'));
      
      // Закрываем поле вопроса после небольшой задержки, чтобы пользователь увидел успех
      setTimeout(() => {
        setShowQuestionBox(false);
        setQuestion('');
        setSelectedText('');
        setSavedSelectedText('');
        window.getSelection()?.removeAllRanges();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
      setLoading(false);
    }
  };

  const handleCloseQuestionBox = () => {
    setShowQuestionBox(false);
    setQuestion('');
    setError(null);
    setSavedSelectedText('');
    setTimeout(() => {
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    }, 100);
  };

  return (
    <div ref={containerRef} className="relative select-text">
      <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{children}</div>
      
      {selectedText && !showQuestionBox && (
        <button
          ref={buttonRef}
          onClick={handleAskAI}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute z-50 bg-black text-white px-4 py-2 rounded-lg shadow-xl hover:bg-gray-900 transition-all font-semibold text-sm whitespace-nowrap transform -translate-x-1/2 pointer-events-auto"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
          }}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Ask AI about this
          </span>
        </button>
      )}

      {showQuestionBox && (
        <div
          ref={questionBoxRef}
          className="absolute z-50 bg-white border-2 border-black rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[500px]"
          style={{
            top: `${buttonPosition.top + 40}px`,
            left: `${Math.max(10, Math.min(buttonPosition.left - 160, (containerRef.current?.offsetWidth || 500) - 330))}px`,
          }}
        >
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">Selected text:</div>
            <div className="text-xs text-black bg-gray-50 border border-black/10 rounded p-2 max-h-20 overflow-y-auto">
              {(savedSelectedText || selectedText).substring(0, 100)}{(savedSelectedText || selectedText).length > 100 ? '...' : ''}
            </div>
          </div>
          
          <form onSubmit={handleSubmitQuestion} className="space-y-3">
            <div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the selected text..."
                disabled={loading}
                autoFocus
                className="w-full px-3 py-2 border-2 border-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black text-sm"
              />
            </div>
            
            {error && (
              <div className="text-xs text-black bg-gray-100 border border-black/20 rounded p-2">
                {error}
              </div>
            )}
            
            {loading && (
              <div className="text-xs text-gray-600 text-center py-2">
                Getting answer... Check AI Tutor tab for response.
              </div>
            )}
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex-1 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-lg"
              >
                {loading ? 'Sending...' : 'Ask'}
              </button>
              <button
                type="button"
                onClick={handleCloseQuestionBox}
                disabled={loading}
                className="px-4 py-2 border-2 border-black/20 rounded-lg text-black hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


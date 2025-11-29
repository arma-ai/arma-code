'use client';

import { useState, useRef, useEffect } from 'react';
import { sendTutorMessage } from '@/app/actions/tutorChat';
import { clearChatHistory } from '@/app/actions/clearChat';
import { TutorMessage } from '@/app/actions/materials';
import { useRouter } from 'next/navigation';

interface TutorChatProps {
  materialId: string;
  initialMessages: TutorMessage[];
}

export default function TutorChat({ materialId, initialMessages }: TutorChatProps) {
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for message updates
  useEffect(() => {
    const handleMessageUpdate = (event: CustomEvent) => {
      const { materialId: eventMaterialId, messages: newMessages } = event.detail;
      if (eventMaterialId === materialId) {
        setMessages(newMessages);
        window.dispatchEvent(new Event('progress-updated'));
      }
    };

    window.addEventListener('tutor-message-updated' as any, handleMessageUpdate);
    return () => {
      window.removeEventListener('tutor-message-updated' as any, handleMessageUpdate);
    };
  }, [materialId]);

  // Update messages when initialMessages changes or on mount
  const isClearingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function loadLatestMessages() {
      try {
        // Fetch latest messages from server to ensure history is up to date
        // This fixes the issue where switching tabs (unmounting) caused history to be lost
        // if the parent component didn't re-fetch.
        const { getTutorMessages } = await import('@/app/actions/tutorChat');
        const latestMessages = await getTutorMessages(materialId);

        if (mounted && latestMessages && latestMessages.length > 0) {
          setMessages(latestMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }

    loadLatestMessages();

    return () => {
      mounted = false;
    };
  }, [materialId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const updatedMessages = await sendTutorMessage(materialId, userMessage);
      setMessages(updatedMessages);
      window.dispatchEvent(new Event('progress-updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearChat() {
    if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    setError(null);
    isClearingRef.current = true;

    try {
      await clearChatHistory(materialId);
      setMessages([]);
      window.dispatchEvent(new CustomEvent('tutor-message-updated', {
        detail: { materialId, messages: [] }
      }));
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear chat history');
      isClearingRef.current = false;
      setMessages(initialMessages);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white relative font-sans">
      {/* Header Actions (Clear) */}
      {messages.length > 0 && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handleClearChat}
            disabled={clearing}
            className="p-2 text-gray-400 hover:text-gray-600 bg-white/80 backdrop-blur-sm rounded-full hover:bg-gray-100 transition-colors"
            title="Clear chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            {/* Icon */}
            <div className="w-16 h-16 text-gray-200 mb-4">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-400 mb-8">
              Learn with AI Tutor
            </h2>

            {/* Grid of Actions - Compact 2x2 */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <ActionButton icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />} label="Quiz" />
              <ActionButton icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />} label="Flashcards" />
              <ActionButton icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />} label="Summary" />
              <ActionButton icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />} label="Notes" />
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isSelectionContext = message.context === 'selection';
            return (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm ${message.role === 'user'
                    ? 'bg-black text-white rounded-br-none'
                    : isSelectionContext
                      ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                      : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}
                >
                  {isSelectionContext && message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 border-b border-gray-200/50 pb-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="font-semibold uppercase tracking-wide">Context</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            );
          })
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 rounded-2xl rounded-bl-none px-4 py-2.5 border border-gray-100 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-t border-red-100">
          <p className="text-red-600 text-xs flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-gray-50">
        <div className="flex justify-between items-center mb-3 px-2">
          <h3 className="text-sm font-medium text-gray-500">Learn anything</h3>
          <div className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors">
            <span>GPT-5 Mini</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <form onSubmit={handleSend} className="relative">
          <div className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-[2rem] focus-within:bg-white focus-within:border-gray-300 focus-within:ring-4 focus-within:ring-gray-100 transition-all duration-300 shadow-sm">
            {/* Attachment Button */}
            <button type="button" className="pl-3 text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {/* Input Field */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-base py-2.5"
              placeholder="Ask a question..."
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className={`
                p-2.5 rounded-full transition-all duration-200 flex-shrink-0 mr-1
                ${input.trim()
                  ? 'bg-black text-white shadow-md hover:scale-105 hover:bg-gray-900'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center justify-center gap-2 px-3 py-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm hover:bg-gray-50 transition-all duration-200 group text-center">
      <div className="text-gray-400 group-hover:text-black transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <span className="text-xs font-medium text-gray-500 group-hover:text-black transition-colors">{label}</span>
    </button>
  );
}

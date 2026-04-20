import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nContext';
import { toast } from 'sonner';
import type { Material, TutorMessage } from '../../../types/api';
import { materialsApi } from '../../../services/api';

export interface ChatTabProps {
  material: Material;
  projectId?: string;
  messages: TutorMessage[];
  sendMessage: (message: string, context?: 'chat' | 'selection') => Promise<any>;
  sending: boolean;
  loading: boolean;
  isTyping?: boolean;
}

const DEBOUNCE_MS = 300;

export function ChatTab({ material, projectId, messages, sendMessage, sending, loading, isTyping }: ChatTabProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastSentRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const scrollCheckRef = useRef<NodeJS.Timeout>();

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    // Debounce: prevent double-sends within 300ms
    const now = Date.now();
    if (now - lastSentRef.current < DEBOUNCE_MS) return;
    lastSentRef.current = now;

    const messageText = input;
    setInput('');
    try {
      await sendMessage(messageText);
    } catch (err) {
      toast.error(t('chat.failed_send'));
    }
  };

  const handleSpeak = async (msg: TutorMessage) => {
    if (!msg.id || speakingId) return;

    try {
      setSpeakingId(msg.id);
      
      // Generate speech
      const response = projectId
        ? await materialsApi.projectTutorSpeak(projectId, msg.id)
        : await materialsApi.tutorSpeak(material.id, msg.id);
      
      // Play audio
      const audioUrl = response.audio_url.startsWith('http')
        ? response.audio_url
        : `http://localhost:8000${response.audio_url}`;
      
      const audio = new Audio(audioUrl);
      audio.addEventListener('ended', () => {
        setSpeakingId(null);
        setAudioElement(null);
      });
      audio.addEventListener('error', () => {
        toast.error(t('chat.failed_audio'));
        setSpeakingId(null);
        setAudioElement(null);
      });
      
      setAudioElement(audio);
      await audio.play();
      toast.success(t('chat.playing_audio'));
      
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t('chat.failed_speech'));
      setSpeakingId(null);
    }
  };

  const handleStopSpeaking = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.remove();
      setAudioElement(null);
      setSpeakingId(null);
      toast.info(t('chat.stopped'));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkScroll = () => {
    const distanceFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    setShowScrollButton(distanceFromBottom > 200);
  };

  React.useEffect(() => {
    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  // Auto-scroll when new messages arrive, only if already near bottom
  React.useEffect(() => {
    const distanceFromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    if (distanceFromBottom < 200 || messages.length === 0) {
      scrollToBottom();
    }
  }, [messages, isTyping]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/40">{t('chat.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      {/* Messages */}
      <div className="p-4 md:p-8 space-y-6 pb-28">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">{t('chat.start_conversation')}</h3>
              <p className="text-white/40">{t('chat.ask_about', { title: material.title })}</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'assistant' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/10 border-white/20 text-white'}`}>
                  {msg.role === 'assistant' ? <Sparkles size={14} /> : <div className="text-xs font-bold">ME</div>}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white/5 text-white/90 rounded-tl-none' : 'bg-primary/10 text-white rounded-tr-none'}`}>
                  <div className="flex items-start gap-3">
                    {msg.role === 'assistant' ? (
                      <div className="flex-1 markdown-content prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="flex-1">{msg.content}</span>
                    )}
                    {msg.role === 'assistant' && msg.id && (
                      <button
                        onClick={() => speakingId === msg.id ? handleStopSpeaking() : handleSpeak(msg)}
                        disabled={!!speakingId}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                          speakingId === msg.id
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10'
                        }`}
                        title={speakingId === msg.id ? t('chat.stop') : t('chat.listen')}
                      >
                        {speakingId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-4 max-w-3xl mx-auto">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-primary/10 border-primary/20 text-primary">
                  <Sparkles size={14} />
                </div>
                <div className="p-3 rounded-2xl bg-white/5 text-white/90 rounded-tl-none flex items-center">
                  <div className="flex items-center gap-1.5">
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgb(255, 138, 61)', animation: 'typing-bounce 1.4s infinite' }} />
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgb(255, 138, 61)', animation: 'typing-bounce 1.4s infinite 0.15s' }} />
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgb(255, 138, 61)', animation: 'typing-bounce 1.4s infinite 0.3s' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && messages.length > 3 && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 right-8 p-2 rounded-full bg-primary text-black shadow-lg hover:bg-primary/90 transition-all opacity-70 hover:opacity-100 z-10"
          title={t('chat.scroll_bottom')}
        >
          <ArrowLeft size={20} className="rotate-90" />
        </button>
      )}

      {/* Input — sticky to bottom of viewport */}
      <div className="sticky bottom-0 bg-[#0C0C0F] border-t border-white/5 px-4 py-3 md:px-8 md:py-4">
        <div className="relative max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
            placeholder={t('chat.placeholder')}
            disabled={sending}
            className="w-full h-12 bg-[#0A0A0C] border border-white/10 rounded-xl px-4 pr-12 text-sm text-white placeholder:text-white/30 focus:border-primary/30 focus:outline-none transition-colors shadow-lg disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="absolute right-2 top-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} className="rotate-90" />}
          </button>
        </div>
      </div>
    </div>
  );
}

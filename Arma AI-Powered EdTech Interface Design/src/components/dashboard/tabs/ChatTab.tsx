import React, { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Loader2, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import type { Material, TutorMessage } from '../../../types/api';
import { materialsApi } from '../../../services/api';

export interface ChatTabProps {
  material: Material;
  messages: TutorMessage[];
  sendMessage: (message: string, context?: 'chat' | 'selection') => Promise<any>;
  sending: boolean;
  loading: boolean;
}

const DEBOUNCE_MS = 300;

export function ChatTab({ material, messages, sendMessage, sending, loading }: ChatTabProps) {
  const [input, setInput] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const lastSentRef = useRef(0);

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
      toast.error('Failed to send message');
    }
  };

  const handleSpeak = async (msg: TutorMessage) => {
    if (!msg.id || speakingId) return;

    try {
      setSpeakingId(msg.id);
      
      // Generate speech
      const response = await materialsApi.tutorSpeak(material.id, msg.id);
      
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
        toast.error('Failed to play audio');
        setSpeakingId(null);
        setAudioElement(null);
      });
      
      setAudioElement(audio);
      await audio.play();
      toast.success('Playing audio...');
      
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate speech');
      setSpeakingId(null);
    }
  };

  const handleStopSpeaking = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.remove();
      setAudioElement(null);
      setSpeakingId(null);
      toast.info('Stopped');
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/40">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
         {messages.length === 0 ? (
           <div className="flex items-center justify-center h-full">
             <div className="text-center max-w-md">
               <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                 <Sparkles className="w-8 h-8 text-primary" />
               </div>
               <h3 className="text-lg font-medium text-white mb-2">Start a conversation</h3>
               <p className="text-white/40">Ask questions about <strong>{material.title}</strong></p>
             </div>
           </div>
         ) : (
           messages.map((msg, i) => (
             <div key={msg.id || i} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'assistant' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/10 border-white/20 text-white'}`}>
                  {msg.role === 'assistant' ? <Sparkles size={14} /> : <div className="text-xs font-bold">ME</div>}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white/5 text-white/90 rounded-tl-none' : 'bg-primary/10 text-white rounded-tr-none'}`}>
                  <div className="flex items-start gap-3">
                    <span className="flex-1">{msg.content}</span>
                    {msg.role === 'assistant' && msg.id && (
                      <button
                        onClick={() => speakingId === msg.id ? handleStopSpeaking() : handleSpeak(msg)}
                        disabled={!!speakingId}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                          speakingId === msg.id
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10'
                        }`}
                        title={speakingId === msg.id ? 'Stop' : 'Listen'}
                      >
                        {speakingId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                    )}
                  </div>
                </div>
             </div>
           ))
         )}
      </div>

      {/* Input Area */}
      <div className="p-6 shrink-0 max-w-3xl mx-auto w-full">
         <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {['Summarize section 2', 'Create flashcards', 'Explain key terms', 'Give me a quiz'].map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setInput(suggestion)}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                {suggestion}
              </button>
            ))}
         </div>
         <div className="relative group">
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={(e) => e.key === 'Enter' && !sending && handleSend()}
             placeholder="Ask anything about this material..."
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

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, FileText, Youtube, MessageSquare, Brain, CheckCircle2,
  Headphones, MonitorPlay, ChevronRight, Play, MoreHorizontal,
  Sparkles, Check, Clock, Calendar, Download, Share2, Layers, Search,
  Menu, Link as LinkIcon, Volume2, Bookmark, Edit3, X, RotateCw, Shuffle, Archive, Loader2,
  AlertCircle, RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useMaterial,
  useMaterialSummary,
  useMaterialNotes,
  useFlashcards,
  useQuizQuestions,
  useTutorChat
} from '../../hooks/useApi';
import { materialsApi } from '../../services/api';
import type { Material, TutorMessage, Flashcard, QuizQuestion, MaterialSummary } from '../../types/api';

import { ViewState } from '../../App';

interface ProjectDetailViewProps {
  projectId?: string | null;
  onBack?: () => void;
  onNavigate?: (view: ViewState) => void;
  onSelectDeck?: (id: number) => void;
}

export function ProjectDetailView({ projectId: propProjectId, onBack: propOnBack, onNavigate, onSelectDeck }: ProjectDetailViewProps) {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use URL parameter if available, otherwise use prop
  const projectId = urlId || propProjectId;
  const onBack = propOnBack || (() => navigate(-1));
  const { material, loading: materialLoading, refetch: refetchMaterial } = useMaterial(projectId);
  const { summary, loading: summaryLoading } = useMaterialSummary(projectId);
  const { notes, loading: notesLoading } = useMaterialNotes(projectId);
  const { flashcards, loading: flashcardsLoading } = useFlashcards(projectId);
  const { questions, loading: quizLoading } = useQuizQuestions(projectId);
  const { messages, sendMessage, sending, loading: chatLoading } = useTutorChat(projectId);

  const [activeTab, setActiveTab] = useState<'chat' | 'summary' | 'flashcards' | 'quiz' | 'podcast' | 'slides'>('chat');
  const [outlineOpen, setOutlineOpen] = useState(true);

  // Loading state for the entire component
  if (materialLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0C0C0F]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/40">Loading material...</p>
        </div>
      </div>
    );
  }

  // No material found
  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0C0C0F]">
        <p className="text-white/40 mb-4">Material not found</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0C0C0F]">
      
      {/* TOP HEADER */}
      <div className="h-14 border-b border-white/5 bg-[#121215]/80 backdrop-blur-md flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
           <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors">
             <ArrowLeft size={18} />
           </button>
           <div className={`w-8 h-8 rounded-lg flex items-center justify-center border border-white/5 shrink-0 ${material.type === 'pdf' ? 'bg-blue-500/10 text-blue-400' : material.type === 'youtube' ? 'bg-red-500/10 text-red-400' : 'bg-purple-500/10 text-purple-400'}`}>
             {material.type === 'pdf' ? <FileText size={16} /> : material.type === 'youtube' ? <Youtube size={16} /> : <LinkIcon size={16} />}
           </div>
           <div className="min-w-0">
             <h1 className="text-sm font-medium text-white/90 truncate">{material.title}</h1>
             <div className="flex items-center gap-2 text-[10px] text-white/30 font-mono">
               <span>{new Date(material.created_at).toLocaleDateString()}</span>
               <span className="w-1 h-1 rounded-full bg-white/20" />
               <span className="uppercase">{material.processing_status}</span>
             </div>
           </div>
        </div>

        {/* TOP TABS */}
        <div className="flex items-center gap-1">
           {[
             { id: 'chat', label: 'Chat', icon: <MessageSquare size={14} /> },
             { id: 'summary', label: 'Summary', icon: <FileText size={14} /> },
             { id: 'flashcards', label: 'Flashcards', icon: <Brain size={14} /> },
             { id: 'quiz', label: 'Quiz', icon: <CheckCircle2 size={14} /> },
             { id: 'podcast', label: 'Podcast', icon: <Headphones size={14} /> },
             { id: 'slides', label: 'Slides', icon: <MonitorPlay size={14} /> },
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                 activeTab === tab.id
                   ? 'bg-white/10 text-white shadow-inner'
                   : 'text-white/40 hover:text-white hover:bg-white/5'
               }`}
             >
               {tab.icon}
               <span className="hidden lg:inline">{tab.label}</span>
             </button>
           ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT OUTLINE PANEL (TOC) */}
        <AnimatePresence>
          {outlineOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-white/5 bg-[#0C0C0F]/50 flex flex-col shrink-0"
            >
              <div className="p-4 border-b border-white/5 flex justify-between items-center">
                 <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                   Table of Contents
                 </h3>
                 <button onClick={() => setOutlineOpen(false)} className="text-white/20 hover:text-white"><X size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                 {activeTab === 'summary' && summary ? (
                   <TableOfContentsSummary summary={summary.summary} />
                 ) : (
                 <div className="p-4 text-center text-xs text-white/30">
                   {material.type === 'pdf' ? 'PDF outline not yet available' : 'Video timestamps not yet available'}
                 </div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER WORKSPACE */}
        <div className="flex-1 flex flex-col relative bg-[#121215]/40 overflow-hidden">
           {!outlineOpen && (
             <button 
               onClick={() => setOutlineOpen(true)}
               className="absolute left-4 top-4 z-10 p-2 rounded-lg bg-black/40 text-white/40 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md border border-white/5"
             >
               <Layers size={16} />
             </button>
           )}

           <div className="flex-1 h-full overflow-hidden">
              {activeTab === 'chat' && (
                <ChatTab
                  material={material}
                  messages={messages}
                  sendMessage={sendMessage}
                  sending={sending}
                  loading={chatLoading}
                />
              )}
              {activeTab === 'summary' && (
                <SummaryTab
                  material={material}
                  summary={summary}
                  loading={summaryLoading}
                />
              )}
              {activeTab === 'flashcards' && (
                <FlashcardsTab
                  material={material}
                  flashcards={flashcards}
                  loading={flashcardsLoading}
                  onNavigate={onNavigate}
                  onSelectDeck={onSelectDeck}
                  navigate={navigate}
                />
              )}
              {activeTab === 'quiz' && (
                <QuizTab
                  material={material}
                  questions={questions}
                  loading={quizLoading}
                />
              )}
              {activeTab === 'podcast' && <PodcastTab material={material} onRefetch={refetchMaterial} />}
              {activeTab === 'slides' && <SlidesTab material={material} onRefetch={refetchMaterial} />}
           </div>
        </div>

        {/* RIGHT ACTIONS RAIL (Metadata) */}
        <div className="w-64 border-l border-white/5 bg-[#0C0C0F]/50 flex flex-col shrink-0">
           <div className="p-4 border-b border-white/5">
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">Project Info</h3>
           </div>
           
           <div className="p-4 space-y-6 overflow-y-auto flex-1">
              {/* Status */}
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Status</label>
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  material.processing_status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  material.processing_status === 'processing' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  material.processing_status === 'failed' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  'bg-blue-500/10 border-blue-500/20 text-blue-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    material.processing_status === 'completed' ? 'bg-emerald-400' :
                    material.processing_status === 'processing' ? 'bg-amber-400 animate-pulse' :
                    material.processing_status === 'failed' ? 'bg-red-400' :
                    'bg-blue-400'
                  }`} />
                  {material.processing_status === 'failed' ? 'ERROR' : material.processing_status.toUpperCase()}
                </div>
              </div>

              {/* Retry Button for failed or stuck materials */}
              <RetryButton
                material={material}
                onRetrySuccess={refetchMaterial}
              />

              {/* Processing Progress */}
              {material.processing_status === 'processing' && material.processing_progress > 0 && (
                <div>
                  <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Progress</label>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Processing</span>
                      <span className="text-white/60">{material.processing_progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${material.processing_progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Material Info */}
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Type</label>
                <span className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] text-white/60">
                  {material.type.toUpperCase()}
                </span>
              </div>

              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Created</label>
                <p className="text-xs text-white/60">{new Date(material.created_at).toLocaleDateString()}</p>
              </div>

              {/* Actions */}
              <div>
                <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Actions</label>
                <div className="space-y-1">
                   <ActionButton icon={<Download size={14} />} label="Export" onClick={() => toast.success('Export started')} />
                   <ActionButton icon={<Share2 size={14} />} label="Share" onClick={() => toast.success('Share link copied')} />
                   <ActionButton icon={<Edit3 size={14} />} label="Rename" onClick={() => toast.info('Rename modal opening...')} />
                   <ActionButton icon={<Archive size={14} />} label="Archive" onClick={() => toast.success('Project archived')} />
                   <div className="h-px bg-white/5 my-2" />
                   <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <X size={14} />
                      Delete Project
                   </button>
                </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors">
       {icon}
       {label}
    </button>
  );
}

// Retry button component for failed/stuck materials
function RetryButton({ material, onRetrySuccess }: { material: Material; onRetrySuccess: () => Promise<void> | void }) {
  const [isRetrying, setIsRetrying] = useState(false);

  // Check if material needs retry
  const needsRetry = material.processing_status === 'failed' ||
    (material.processing_status === 'processing' && material.processing_progress === 0);

  if (!needsRetry) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await materialsApi.retry(material.id);
      toast.success('Processing restarted');
      await onRetrySuccess();
    } catch (error) {
      console.error('Error retrying material:', error);
      toast.error('Failed to restart processing');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20">
      <div className="flex items-start gap-3 mb-3">
        <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-red-400 mb-1">
            {material.processing_status === 'failed' ? 'Processing Failed' : 'Processing Stuck'}
          </p>
          <p className="text-xs text-white/40">
            {material.processing_status === 'failed'
              ? 'An error occurred while processing this material.'
              : 'Processing appears to be stuck at 0%. Try restarting.'}
          </p>
        </div>
      </div>
      <button
        onClick={handleRetry}
        disabled={isRetrying}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isRetrying ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RotateCcw size={16} />
            Retry Processing
          </>
        )}
      </button>
    </div>
  );
}

// --- TABS CONTENT ---

interface ChatTabProps {
  material: Material;
  messages: TutorMessage[];
  sendMessage: (message: string, context?: 'chat' | 'selection') => Promise<any>;
  sending: boolean;
  loading: boolean;
}

function ChatTab({ material, messages, sendMessage, sending, loading }: ChatTabProps) {
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const messageText = input;
    setInput('');
    try {
      await sendMessage(messageText);
    } catch (err) {
      toast.error('Failed to send message');
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
                  {msg.content}
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

// Table of Contents component for Summary view
// Summary section interface
interface SummarySection {
  id: string;
  title: string;
  topics: string[];
  readTime: number;
  content: string;
  keyPoints: string[];
}

function TableOfContentsSummary({ summary }: { summary: string }) {
  const sections = parseSummaryIntoSections(summary);
  
  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <button 
          key={section.id}
          onClick={() => toast.info(`Focused on: ${section.title}`)}
          className="w-full text-left p-2 rounded-lg hover:bg-white/5 text-xs text-white/60 hover:text-white transition-colors group"
        >
          <div className="flex items-start gap-2">
            <span className="text-white/20 font-mono shrink-0 mt-0.5">#</span>
            <div className="min-w-0">
              <p className="truncate font-medium">{section.title}</p>
              <p className="text-[10px] text-white/30 truncate">
                {section.readTime} mins • {section.topics.join(', ')}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Helper function to parse summary - defined before it's used
function parseSummaryIntoSections(summaryText: string): SummarySection[] {
  // Split by double newlines or paragraph breaks
  const paragraphs = summaryText.split(/\n\n+/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return [{
      id: 'overview',
      title: 'Overview',
      topics: ['General Summary'],
      readTime: Math.ceil(summaryText.split(' ').length / 200),
      content: summaryText,
      keyPoints: []
    }];
  }

  // Try to extract sections from the text
  const sections: SummarySection[] = [];
  let currentSection: SummarySection | null = null;
  
  paragraphs.forEach((para, index) => {
    const trimmed = para.trim();
    const wordCount = trimmed.split(' ').length;
    const readTime = Math.ceil(wordCount / 200);
    
    // Check if this looks like a section header (short line, possibly with colon or number)
    const isHeader = wordCount < 10 && (
      /^[\d]+[\.\)]\s/.test(trimmed) || 
      /^[A-ZА-Я].*:$/.test(trimmed) ||
      /^#+\s/.test(trimmed) ||
      (wordCount <= 5 && /^[A-ZА-Я]/.test(trimmed))
    );
    
    if (isHeader || index === 0) {
      // Start new section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      const title = trimmed.replace(/^[\d#]+[\.\)]\s*/, '').replace(/:$/, '').trim();
      currentSection = {
        id: `section-${index}`,
        title: title || `Section ${sections.length + 1}`,
        topics: [],
        readTime: readTime,
        content: isHeader ? '' : trimmed,
        keyPoints: []
      };
    } else if (currentSection) {
      // Add to current section
      currentSection.content += (currentSection.content ? '\n\n' : '') + trimmed;
      currentSection.readTime += readTime;
      
      // Try to extract key points from bullet points
      const bullets = trimmed.match(/^[-•*]\s.+$/gm);
      if (bullets) {
        currentSection.keyPoints.push(...bullets.map(b => b.replace(/^[-•*]\s/, '')));
      }
    }
  });
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // If we only got one section, try to create a more structured view
  if (sections.length === 1 && sections[0].content.length > 500) {
    const content = sections[0].content;
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    
    if (sentences.length >= 4) {
      const chunkSize = Math.ceil(sentences.length / 3);
      return [
        {
          id: 'intro',
          title: 'Introduction & Overview',
          topics: ['Core Concepts', 'Background'],
          readTime: Math.ceil(chunkSize * 15 / 200),
          content: sentences.slice(0, chunkSize).join('. ') + '.',
          keyPoints: sentences.slice(0, 2).map(s => s.trim())
        },
        {
          id: 'main',
          title: 'Key Concepts & Analysis',
          topics: ['Main Ideas', 'Details'],
          readTime: Math.ceil(chunkSize * 15 / 200),
          content: sentences.slice(chunkSize, chunkSize * 2).join('. ') + '.',
          keyPoints: sentences.slice(chunkSize, chunkSize + 2).map(s => s.trim())
        },
        {
          id: 'conclusion',
          title: 'Conclusions & Insights',
          topics: ['Summary', 'Takeaways'],
          readTime: Math.ceil((sentences.length - chunkSize * 2) * 15 / 200),
          content: sentences.slice(chunkSize * 2).join('. ') + '.',
          keyPoints: sentences.slice(-2).map(s => s.trim())
        }
      ];
    }
  }
  
  return sections.length > 0 ? sections : [{
    id: 'overview',
    title: 'Overview',
    topics: ['General Summary'],
    readTime: Math.ceil(summaryText.split(' ').length / 200),
    content: summaryText,
    keyPoints: []
  }];
}

interface SummaryTabProps {
  material: Material;
  summary: MaterialSummary | null;
  loading: boolean;
}

function SummaryTab({ summary, loading }: SummaryTabProps) {
  const navigate = useNavigate();
  
  const sections = summary ? parseSummaryIntoSections(summary.summary) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/40">Loading summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
          <FileText size={40} />
        </div>
        <h2 className="text-2xl font-medium text-white mb-2">No Summary Yet</h2>
        <p className="text-white/40 max-w-md mb-8">
          Summary has not been generated for this material yet.
        </p>
        <button
          onClick={() => toast.info('Summary generation coming soon')}
          className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all"
        >
          Generate Summary
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-12 overflow-y-auto h-full scrollbar-hide">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-medium text-white">Executive Summary</h2>
        <div className="flex gap-2">
          <button 
            className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors" 
            title="Export PDF"
          >
            <Download size={18} />
          </button>
          <button 
            onClick={() => navigate('../flashcards')}
            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            Convert to Flashcards
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section) => (
          <section 
            key={section.id} 
            className="relative pl-6 border-l border-white/10 hover:border-primary/50 transition-colors group"
          >
            {/* Timeline dot */}
            <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-[#121215] border border-white/20 group-hover:border-primary group-hover:bg-primary transition-colors" />
            
            {/* Section title with read time */}
            <h3 className="text-lg font-medium text-white mb-3 flex items-center gap-3">
              {section.title}
              <span className="text-xs font-normal text-white/30 px-2 py-0.5 rounded-full bg-white/5">
                {section.readTime} min read
              </span>
            </h3>
            
            {/* Section content */}
            <p className="text-white/60 leading-relaxed font-light mb-4">
              {section.content}
            </p>
            
            {/* Key Points box */}
            {section.keyPoints.length > 0 && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Key Points</h4>
                <ul className="space-y-2">
                  {section.keyPoints.slice(0, 4).map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white/80">
                      <span className="text-primary">•</span>
                      {point.length > 120 ? point.substring(0, 120) + '...' : point}
              </li>
            ))}
          </ul>
        </div>
      )}
          </section>
        ))}
      </div>
    </div>
  );
}

interface FlashcardsTabProps {
  material: Material;
  flashcards: Flashcard[];
  loading: boolean;
  onNavigate?: (view: ViewState) => void;
  onSelectDeck?: (id: number) => void;
  navigate: ReturnType<typeof useNavigate>;
}

function FlashcardsTab({ material, flashcards, loading, onNavigate, onSelectDeck, navigate }: FlashcardsTabProps) {
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

  // READY STATE
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
         {flashcards.slice(0, 3).map((card) => (
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
         {flashcards.length > 3 && (
           <p className="text-xs text-white/30 text-center">+ {flashcards.length - 3} more cards</p>
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

interface QuizTabProps {
  material: Material;
  questions: QuizQuestion[];
  loading: boolean;
}

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function QuizTab({ material, questions, loading }: QuizTabProps) {
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null); // Now stores TEXT, not letter
  const [answers, setAnswers] = useState<Record<number, string>>({}); // Stores TEXT of selected answers
  const [showResult, setShowResult] = useState(false);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, Array<{letter: string, text: string}>>>({});

  // Shuffle options when quiz starts or question changes
  useEffect(() => {
    if (quizStarted && questions.length > 0 && !shuffledOptions[currentQuestion]) {
      const question = questions[currentQuestion];
      const options = [
        { letter: 'A', text: question.option_a },
        { letter: 'B', text: question.option_b },
        { letter: 'C', text: question.option_c },
        { letter: 'D', text: question.option_d }
      ];
      const shuffled = shuffleArray(options);
      // Reassign letters after shuffle
      const withNewLetters = shuffled.map((opt, idx) => ({
        ...opt,
        letter: String.fromCharCode(65 + idx) // A, B, C, D
      }));
      setShuffledOptions(prev => ({ ...prev, [currentQuestion]: withNewLetters }));
    }
  }, [quizStarted, currentQuestion, questions, shuffledOptions]);

  const handleSelectAnswer = (answerText: string) => {
    if (isAnswerLocked) return;
    setSelectedAnswer(answerText); // Store text, not letter
  };

  const handleConfirmAnswer = () => {
    if (!selectedAnswer) return;
    
    setIsAnswerLocked(true);
    setAnswers(prev => ({ ...prev, [currentQuestion]: selectedAnswer })); // Store text
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(answers[currentQuestion + 1] || null);
      setIsAnswerLocked(!!answers[currentQuestion + 1]);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(answers[currentQuestion - 1] || null);
      setIsAnswerLocked(!!answers[currentQuestion - 1]);
    }
  };

  const handleRestartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers({});
    setShowResult(false);
    setIsAnswerLocked(false);
    setShuffledOptions({}); // Reset shuffled options for new attempt
  };

  // Get correct answer TEXT for a question (now stored directly as text)
  const getCorrectAnswerText = (q: QuizQuestion): string => {
    if (!q) return '';
    return q.correct_option || '';
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      const userAnswerText = answers[idx];
      const correctAnswerText = getCorrectAnswerText(q);
      if (userAnswerText === correctAnswerText) {
        correct++;
      }
    });
    return correct;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/40">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
         <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
           <CheckCircle2 size={40} />
         </div>
         <h2 className="text-2xl font-medium text-white mb-2">No Quiz Yet</h2>
         <p className="text-white/40 max-w-md mb-8">
           Quiz questions have not been generated for this material yet.
         </p>
         <button
           onClick={() => toast.info('Quiz generation coming soon')}
           className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all"
         >
           Generate Quiz
         </button>
      </div>
    );
  }

  // Quiz Results Screen
  if (showResult) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);
    const isPassing = percentage >= 70;

  return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {/* Result Circle */}
            <div className="relative w-48 h-48 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="88"
                  fill="none"
                  stroke={isPassing ? '#10b981' : '#f97316'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 553' }}
                  animate={{ strokeDasharray: `${percentage * 5.53} 553` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className={`text-5xl font-bold ${isPassing ? 'text-emerald-400' : 'text-primary'}`}
                >
                  {percentage}%
                </motion.span>
                <span className="text-white/40 text-sm">Score</span>
         </div>
       </div>

            {/* Result Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className={`text-3xl font-bold mb-2 ${isPassing ? 'text-emerald-400' : 'text-primary'}`}>
                {isPassing ? '🎉 Excellent!' : '📚 Keep Learning!'}
              </h2>
              <p className="text-white/60 mb-6">
                You got {score} out of {questions.length} questions correct
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-4 mb-8"
            >
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400">{score}</div>
                <div className="text-xs text-white/40">Correct</div>
              </div>
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-2xl font-bold text-red-400">{questions.length - score}</div>
                <div className="text-xs text-white/40">Incorrect</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-bold text-white">{questions.length}</div>
                <div className="text-xs text-white/40">Total</div>
              </div>
            </motion.div>

            {/* Answer Review */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-left mb-8"
            >
              <h3 className="text-sm font-medium text-white/60 mb-4">Answer Review</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
         {questions.map((q, idx) => {
                  const userAnswerText = answers[idx];
                  const correctText = getCorrectAnswerText(q);
                  const isCorrectAnswer = userAnswerText === correctText;

           return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border ${
                        isCorrectAnswer
                          ? 'bg-emerald-500/5 border-emerald-500/20'
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isCorrectAnswer ? 'bg-emerald-500' : 'bg-red-500'
                        }`}>
                          {isCorrectAnswer ? <Check size={14} className="text-white" /> : <X size={14} className="text-white" />}
                   </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/80 mb-2 line-clamp-2">{q.question}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex gap-2">
                              <span className="text-white/40">Your answer:</span>
                              <span className={isCorrectAnswer ? 'text-emerald-400' : 'text-red-400'}>
                                {userAnswerText || 'Not answered'}
                              </span>
                            </div>
                            {!isCorrectAnswer && (
                              <div className="flex gap-2">
                                <span className="text-white/40">Correct:</span>
                                <span className="text-emerald-400">{correctText}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex gap-4"
            >
              <button
                onClick={handleRestartQuiz}
                className="flex-1 px-6 py-4 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <RotateCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => {
                  setQuizStarted(false);
                  setShowResult(false);
                  setCurrentQuestion(0);
                  setAnswers({});
                }}
                className="px-6 py-4 bg-white/5 text-white rounded-xl font-medium hover:bg-white/10 transition-all"
              >
                Back to Preview
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Active Quiz Session
  if (quizStarted) {
    const question = questions[currentQuestion];
    
    // Get shuffled options for this question (or loading state)
    const currentOptions = shuffledOptions[currentQuestion] || [];
    
    // Get correct answer TEXT
    const correctAnswerText = getCorrectAnswerText(question);
    
    // Check if selected answer is correct (compare by TEXT)
    const isCorrect = selectedAnswer === correctAnswerText;
    
    // If options not yet shuffled, show loading
    if (currentOptions.length === 0) {
                         return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-[#0A0A0C]">
        {/* Quiz Header */}
        <div className="flex-shrink-0 border-b border-white/5 bg-[#0D0D0F]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to exit? Your progress will be lost.')) {
                    setQuizStarted(false);
                    setCurrentQuestion(0);
                    setAnswers({});
                  }
                }}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
              >
                <X size={18} />
                <span className="text-sm">Exit Quiz</span>
              </button>
              <div className="flex items-center gap-4">
                <div className="text-sm text-white/60">
                  Question <span className="text-white font-bold">{currentQuestion + 1}</span> of {questions.length}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Question Number Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <span className="text-xs font-bold text-primary">QUESTION {currentQuestion + 1}</span>
                </div>

                {/* Question Text */}
                <h2 className="text-2xl md:text-3xl font-medium text-white leading-relaxed mb-10">
                  {question.question}
                </h2>

                {/* Answer Options */}
                <div className="space-y-4">
                  {currentOptions.map((option, idx) => {
                    const isSelected = selectedAnswer === option.text;
                    const isCorrectOption = option.text === correctAnswerText;
                    const showFeedback = isAnswerLocked && isSelected;

                    return (
                      <motion.button
                        key={option.text}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => handleSelectAnswer(option.text)}
                        disabled={isAnswerLocked}
                        className={`w-full p-5 rounded-2xl border-2 text-left transition-all group relative overflow-hidden ${
                          isAnswerLocked
                            ? isCorrectOption
                              ? 'bg-emerald-500/10 border-emerald-500/50'
                              : isSelected
                                ? 'bg-red-500/10 border-red-500/50'
                                : 'bg-white/[0.02] border-white/5 opacity-50'
                            : isSelected
                              ? 'bg-primary/10 border-primary'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Option Letter */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                            isAnswerLocked
                              ? isCorrectOption
                                ? 'bg-emerald-500 text-white'
                                : isSelected
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white/5 text-white/30'
                              : isSelected
                                ? 'bg-primary text-black'
                                : 'bg-white/5 text-white/60 group-hover:bg-white/10'
                          }`}>
                            {isAnswerLocked && (isSelected || isCorrectOption) ? (
                              isCorrectOption ? <Check size={20} /> : <X size={20} />
                            ) : (
                              option.letter
                            )}
                          </div>

                          {/* Option Text */}
                          <span className={`text-base md:text-lg flex-1 ${
                            isAnswerLocked
                              ? isCorrectOption
                                ? 'text-emerald-400'
                                : isSelected
                                  ? 'text-red-400'
                                  : 'text-white/30'
                              : isSelected
                                ? 'text-white'
                                : 'text-white/70 group-hover:text-white'
                          }`}>
                            {option.text}
                          </span>
                        </div>

                        {/* Feedback Badge */}
                        {showFeedback && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                               isCorrect
                                ? 'bg-emerald-500 text-white'
                                : 'bg-red-500 text-white'
                            }`}
                          >
                            {isCorrect ? 'Correct!' : 'Incorrect'}
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Explanation Section - Shows after answer is confirmed */}
                {isAnswerLocked && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-6 rounded-2xl border ${
                      isCorrect 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCorrect ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                      }`}>
                        {isCorrect ? (
                          <CheckCircle2 size={20} className="text-emerald-400" />
                        ) : (
                          <Brain size={20} className="text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-bold mb-3 ${
                          isCorrect ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {isCorrect ? '🎉 Correct!' : '💡 Explanation'}
                        </h4>
                        
                        {/* Correct Answer Display */}
                        <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="text-xs text-emerald-400/60 uppercase tracking-wider mb-1">Correct Answer</div>
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-emerald-500 text-white font-bold flex items-center justify-center">
                              <Check size={16} />
                               </span>
                            <span className="text-emerald-400 font-medium">
                              {correctAnswerText}
                            </span>
                             </div>
                           </div>

                        {/* Your Answer (if wrong) */}
                        {!isCorrect && selectedAnswer && (
                          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                            <div className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Your Answer</div>
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-lg bg-red-500 text-white font-bold flex items-center justify-center">
                                <X size={16} />
                              </span>
                              <span className="text-red-400 font-medium">
                                {selectedAnswer}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Explanation Text */}
                        <div className="text-white/70 text-sm leading-relaxed">
                          {isCorrect ? (
                            <p>
                              Great job! You correctly identified the answer. This demonstrates your understanding of the material.
                              {question.explanation && (
                                <span className="block mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1">Additional Info</span>
                                  {question.explanation}
                                </span>
                              )}
                            </p>
                          ) : (
                            <div>
                              <p className="mb-3">
                                Don't worry! Learning from mistakes is part of the process. Here's why this answer is correct:
                              </p>
                              {question.explanation ? (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1">Explanation</span>
                                  <p className="text-white/80">{question.explanation}</p>
                                </div>
                              ) : (
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <span className="text-white/40 text-xs uppercase tracking-wider block mb-1">Tip</span>
                                  <p className="text-white/60">
                                    Review the section about "{question.question.split(' ').slice(0, 5).join(' ')}..." in your material to better understand this concept.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Quiz Footer */}
        <div className="flex-shrink-0 border-t border-white/5 bg-[#0D0D0F]">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevQuestion}
                  disabled={currentQuestion === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
              </div>

              {/* Confirm/Next Button */}
              {!isAnswerLocked ? (
                <button
                  onClick={handleConfirmAnswer}
                  disabled={!selectedAnswer}
                  className="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  Confirm Answer
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={currentQuestion === questions.length - 1 ? () => setShowResult(true) : handleNextQuestion}
                  className="px-8 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  {currentQuestion === questions.length - 1 ? 'See Results' : 'Next Question'}
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Question Dots */}
              <div className="flex items-center gap-1.5">
                {questions.map((q, idx) => {
                  const userAnswerText = answers[idx];
                  const correctText = getCorrectAnswerText(q);
                  const isAnsweredCorrect = userAnswerText === correctText;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentQuestion(idx);
                        setSelectedAnswer(answers[idx] || null);
                        setIsAnswerLocked(!!answers[idx]);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        idx === currentQuestion
                          ? 'bg-primary scale-125'
                          : userAnswerText
                            ? isAnsweredCorrect
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                            : 'bg-white/20 hover:bg-white/40'
                      }`}
                    />
                         );
                       })}
              </div>
                     </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Preview Screen (Default)
  return (
    <div className="max-w-3xl mx-auto p-8 h-full overflow-y-auto">
       {/* Header */}
       <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
             <div className="w-20 h-24 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)] relative">
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <CheckCircle2 size={32} className="text-emerald-500" />
             </div>
             <div>
                <h2 className="text-2xl font-medium text-white mb-1">Quiz Ready</h2>
                <p className="text-white/40 text-sm">{material.title}</p>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
             <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <div className="text-xl font-bold text-white mb-1">{questions.length}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Questions</div>
             </div>
             <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <div className="text-xl font-bold text-emerald-400 mb-1">Multiple Choice</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Format</div>
             </div>
             <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
                <div className="text-xl font-bold text-white mb-1">{material.type.toUpperCase()}</div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Source</div>
             </div>
          </div>
       </div>

       {/* Question Preview */}
       <div className="space-y-4 mb-8">
         <h3 className="text-sm font-medium text-white/60 mb-4">Question Preview</h3>
         {questions.slice(0, 3).map((q, idx) => {
           const options = [q.option_a, q.option_b, q.option_c, q.option_d];

           return (
             <div key={q.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div>
                   <div className="text-xs text-white/30 mb-1">Question {idx + 1}:</div>
                   <div className="text-white/90">{q.question}</div>
                </div>
                <div>
                   <div className="text-xs text-white/30 mb-1">Options:</div>
                   <div className="grid grid-cols-2 gap-2 text-sm text-white/60">
                     {options.map((option, optIdx) => (
                       <div key={optIdx} className="flex items-start gap-1">
                         <span className="text-white/40">{String.fromCharCode(65 + optIdx)}.</span>
                         <span className="line-clamp-1">{option}</span>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
           );
         })}
         {questions.length > 3 && (
           <p className="text-xs text-white/30 text-center">+ {questions.length - 3} more questions</p>
         )}
       </div>

       {/* Start Quiz Button */}
         <button
         onClick={() => setQuizStarted(true)}
         className="w-full px-8 py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,138,61,0.2)] flex items-center justify-center gap-3"
         >
         <Play size={20} fill="currentColor" />
         Start Quiz
         </button>
    </div>
  );
}

function PodcastTab({ material, onRefetch }: { material: Material; onRefetch: () => Promise<void> | void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (material.podcast_audio_url) {
      // Build full URL for audio (backend returns relative path like /storage/...)
      const audioUrl = material.podcast_audio_url.startsWith('http')
        ? material.podcast_audio_url
        : `http://localhost:8000${material.podcast_audio_url}`;

      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      });
      setAudioElement(audio);
      return () => {
        audio.pause();
        audio.remove();
      };
    }
  }, [material.podcast_audio_url]);

  const handleGeneratePodcast = async () => {
    try {
      setIsGenerating(true);
      toast.info('Generating podcast script...');

      // First generate script
      const scriptResponse = await materialsApi.generatePodcastScript(material.id);
      toast.success('Script generated! Now generating audio with Edge TTS...');

      // Then generate audio using Edge TTS (free, high-quality Microsoft TTS)
      const audioResponse = await materialsApi.generatePodcastAudio(material.id, 'edge');
      toast.success(`Podcast generated successfully using ${audioResponse.provider}!`);

      // Refresh material data and wait for it
      await onRefetch();
    } catch (error: any) {
      console.error('Failed to generate podcast:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate podcast');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElement) return;
    const time = parseFloat(e.target.value);
    audioElement.currentTime = time;
    setCurrentTime(time);
  };

  const handleDownload = () => {
    if (!material.podcast_audio_url) return;

    // Build full URL for download
    const audioUrl = material.podcast_audio_url.startsWith('http')
      ? material.podcast_audio_url
      : `http://localhost:8000${material.podcast_audio_url}`;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `${material.title}_podcast.mp3`;
    a.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show audio player if podcast exists
  if (material.podcast_audio_url && material.podcast_script) {
    // Calculate which script line should be shown based on time
    // For simplicity, we'll divide total duration by number of lines
    const currentLineIndex = material.podcast_script.length > 0 && duration > 0
      ? Math.floor((currentTime / duration) * material.podcast_script.length)
      : 0;
    const currentLine = material.podcast_script[Math.min(currentLineIndex, material.podcast_script.length - 1)];

    return (
      <div className="h-full flex flex-col overflow-y-auto scrollbar-hide">
          {/* TOP SECTION - Icon, Title, Player */}
          <div className="flex flex-col items-center pt-16 pb-8 px-8 border-b border-white/5">
            {/* Podcast Icon */}
            <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white mb-8 border border-white/10 shadow-2xl relative">
              <Headphones size={64} />
              {isPlaying && <div className="absolute inset-0 bg-white/5 rounded-3xl animate-pulse" />}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-medium text-white mb-2 text-center max-w-2xl">{material.title}</h2>
            <p className="text-white/40 text-sm mb-10 text-center">
              Generated conversation about {material.title}
            </p>

            {/* Audio Player */}
            <div className="w-full max-w-2xl bg-white/[0.02] rounded-2xl p-6 border border-white/5">
              {/* Progress Bar */}
              <div className="mb-6">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                />
                <div className="flex justify-between text-xs text-white/40 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                >
                  {isPlaying ? (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-5 bg-black rounded-full" />
                      <div className="w-1.5 h-5 bg-black rounded-full" />
                    </div>
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="p-3 rounded-xl hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                  title="Download podcast"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION - Current Subtitles/Transcript */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 min-h-[400px]">
            <div className="w-full max-w-3xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentLineIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {/* Speaker Label */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm font-medium text-primary">{currentLine?.speaker || 'Host A'}</span>
                  </div>

                  {/* Current Text */}
                  <p className="text-3xl md:text-4xl font-light text-white leading-relaxed mb-12">
                    {currentLine?.text || 'Starting podcast...'}
                  </p>

                  {/* Progress indicator */}
                  <div className="flex items-center justify-center gap-2 flex-wrap max-w-xl mx-auto">
                    {material.podcast_script.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-full transition-all ${
                          idx === currentLineIndex
                            ? 'w-8 bg-primary'
                            : idx < currentLineIndex
                              ? 'w-4 bg-primary/30'
                              : 'w-2 bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
      </div>
    );
  }

  // Show generation UI
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white mb-6 border border-white/10 shadow-2xl relative">
        <Headphones size={48} />
        {isGenerating && <div className="absolute inset-0 bg-white/5 rounded-3xl animate-pulse" />}
      </div>
      <h2 className="text-xl font-medium text-white mb-2">Podcast Overview</h2>
      <p className="text-white/40 text-sm mb-8">
        Podcast has not been generated yet
      </p>

         <button
        onClick={handleGeneratePodcast}
        disabled={isGenerating}
        className="px-8 py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(255,138,61,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles size={20} />
           Generate Podcast
          </>
       )}
      </button>
    </div>
  );
}

function SlidesTab({ material, onRefetch }: { material: Material; onRefetch: () => Promise<void> | void }) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const hasPresentation = material.presentation_url || material.presentation_embed_url;
  const isGeneratingStatus = material.presentation_status === 'generating';
  const isFailed = material.presentation_status === 'failed';

  const handleGeneratePresentation = async () => {
    try {
      setIsGenerating(true);
      toast.info('Generating presentation... This may take a minute.');

      await materialsApi.generatePresentation(material.id);
      toast.success('Presentation generated successfully!');

      // Refresh material data and wait for it
      await onRefetch();
    } catch (error: any) {
      console.error('Failed to generate presentation:', error);
      toast.error(error.response?.data?.detail || 'Failed to generate presentation');
    } finally {
      setIsGenerating(false);
    }
  };

  // Show loading state
  if (isGenerating || isGeneratingStatus) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
          <Loader2 size={40} className="text-primary animate-spin" />
        </div>
        <h2 className="text-2xl font-medium text-white mb-2">Generating Presentation</h2>
        <p className="text-white/40 max-w-md">
          Our AI is creating your presentation slides. This usually takes 30-60 seconds...
        </p>
      </div>
    );
  }

  // Show empty state / generate button
  if (!hasPresentation) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
         <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 mb-6">
           <MonitorPlay size={40} />
         </div>
         <h2 className="text-2xl font-medium text-white mb-2">No Presentation Yet</h2>
         <p className="text-white/40 max-w-md mb-2">
           Presentation slides have not been generated for this material yet.
         </p>
         {isFailed && (
           <p className="text-red-400 text-sm mb-6">
             Previous generation failed. Please try again.
           </p>
         )}
         {!isFailed && <div className="mb-6" />}
         <button
           onClick={handleGeneratePresentation}
           disabled={isGenerating}
           className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
         >
           <Sparkles size={20} />
           Generate Slides
         </button>
      </div>
    );
  }

  // Show presentation viewer
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with actions */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-medium text-white">Presentation</h2>
         <p className="text-white/40 text-sm">Generated slides for {material.title}</p>
       </div>
        <div className="flex items-center gap-2">
          {material.presentation_url && (
            <a
              href={material.presentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Download
            </a>
          )}
          <button
            onClick={handleGeneratePresentation}
            disabled={isGenerating}
            className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <RotateCw size={16} />
            Regenerate
          </button>
              </div>
           </div>

      {/* Presentation embed */}
      <div className="flex-1 p-4 overflow-hidden">
        {material.presentation_embed_url ? (
          <iframe
            src={material.presentation_embed_url}
            className="w-full h-full rounded-xl border border-white/10"
            allow="fullscreen"
            title="Presentation"
          />
        ) : material.presentation_url ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/10">
            <MonitorPlay size={64} className="text-white/20 mb-4" />
            <p className="text-white/60 mb-4">Presentation is ready!</p>
            <a
              href={material.presentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-primary text-black rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
            >
              <Play size={20} />
              Open Presentation
            </a>
          </div>
        ) : null}
       </div>
    </div>
  );
}

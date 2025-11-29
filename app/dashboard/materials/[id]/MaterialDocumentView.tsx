'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  getMaterialFullText,
  getMaterialSummary,
  getMaterialNotes,
  getMaterialFlashcards,
  getMaterialQuiz,
  getTutorMessages,
  getMaterialPodcastData,
  getMaterialPresentationData,
  getMaterialRichContent,
  MaterialSummary,
  MaterialNotes,
  Flashcard,
  Quiz,
  TutorMessage
} from '@/app/actions/materials';
import SelectableText from './SelectableText';
import TutorChat from './TutorChat';
import PodcastView from './PodcastView';
import InteractiveFlashcards from './InteractiveFlashcards';
import InteractiveQuiz from './InteractiveQuiz';
import GenerateFlashcardsButton from './GenerateFlashcardsButton';
import GenerateQuizButton from './GenerateQuizButton';
import ReprocessButton from './ReprocessButton';
import GenerateSummaryButton from './GenerateSummaryButton';
import GenerateNotesButton from './GenerateNotesButton';
import TimestampedTranscript from './TimestampedTranscript';
import PresentationView from './PresentationView';
import RichDocumentView from './RichDocumentView';
import dynamic from 'next/dynamic';
import type { RichDocumentBlock } from '@/types/rich-content';

const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});

export interface MaterialDocumentViewProps {
  materialId: string;
  materialTitle: string;
  materialType: 'pdf' | 'youtube';
  filePath?: string | null;
  pdfUrl?: string | null;
  youtubeUrl?: string | null;
}

type TabType = 'chat' | 'flashcards' | 'quiz' | 'summary' | 'notes' | 'podcast' | 'presentation';

export default function MaterialDocumentView({
  materialId,
  materialTitle,
  materialType,
  filePath,
  pdfUrl,
  youtubeUrl,
}: MaterialDocumentViewProps) {
  const [fullText, setFullText] = useState<string | null>(null);
  const [summary, setSummary] = useState<MaterialSummary | null>(null);
  const [notes, setNotes] = useState<MaterialNotes | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [podcastData, setPodcastData] = useState<{ script: string | null; audioUrl: string | null }>({ script: null, audioUrl: null });
  const [presentationData, setPresentationData] = useState<{ status: string | null; url: string | null; embedUrl: string | null }>({ status: null, url: null, embedUrl: null });
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [richBlocks, setRichBlocks] = useState<RichDocumentBlock[]>([]);
  const [richMetadata, setRichMetadata] = useState<Record<string, any> | null>(null);
  const [richLoading, setRichLoading] = useState(false);
  const [richProgress, setRichProgress] = useState<{ value: number; message: string }>({ value: 0, message: '' });
  const [richError, setRichError] = useState<string | null>(null);
  const [richHasRequested, setRichHasRequested] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs and state for timestamped transcript
  const videoRef = useRef<HTMLIFrameElement>(null);
  const [showTimestampedTranscript, setShowTimestampedTranscript] = useState(materialType === 'youtube');

  const [viewMode, setViewMode] = useState<'rich' | 'text' | 'pdf'>(materialType === 'pdf' ? 'rich' : 'text');
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setViewMode(materialType === 'pdf' ? 'rich' : 'text');
    setRichBlocks([]);
    setRichMetadata(null);
    setRichProgress({ value: 0, message: '' });
    setRichError(null);
    setRichHasRequested(false);
  }, [materialId, materialType]);

  const loadSecondaryData = useCallback(async () => {
    const secondaryResults = await Promise.allSettled([
      getMaterialSummary(materialId),
      getMaterialNotes(materialId),
      getMaterialFlashcards(materialId),
      getMaterialQuiz(materialId),
      getTutorMessages(materialId),
      getMaterialPodcastData(materialId),
      getMaterialPresentationData(materialId)
    ]);

    if (!isMountedRef.current) {
      return;
    }

    if (secondaryResults[0].status === 'fulfilled') setSummary(secondaryResults[0].value);
    if (secondaryResults[1].status === 'fulfilled') setNotes(secondaryResults[1].value);
    if (secondaryResults[2].status === 'fulfilled') setFlashcards(secondaryResults[2].value);
    if (secondaryResults[3].status === 'fulfilled') setQuiz(secondaryResults[3].value);
    if (secondaryResults[4].status === 'fulfilled') setTutorMessages(secondaryResults[4].value);

    if (secondaryResults[5].status === 'fulfilled') {
      const podcastInfo = secondaryResults[5].value;
      setPodcastData({ script: podcastInfo.podcastScript, audioUrl: podcastInfo.podcastAudioUrl });
    }

    if (secondaryResults[6].status === 'fulfilled') {
      const presentationInfo = secondaryResults[6].value;
      setPresentationData({
        status: presentationInfo.presentationStatus,
        url: presentationInfo.presentationUrl,
        embedUrl: presentationInfo.presentationEmbedUrl
      });
    }
  }, [materialId]);

  const loadCriticalData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const textData = await getMaterialFullText(materialId);

      if (!isMountedRef.current) {
        return;
      }

      setFullText(textData);

      if (textData && (textData.includes('Это видео добавлено без транскрипта') || textData.startsWith('YouTube Video:') || textData.startsWith('Error processing'))) {
        setShowTimestampedTranscript(false);
      }

      setLoading(false);
      loadSecondaryData();
    } catch (err) {
      console.error('Failed to load material data:', err);
      if (!isMountedRef.current) {
        return;
      }
      setError('Failed to load material data. Please try again.');
      setLoading(false);
    }
  }, [materialId, loadSecondaryData]);

  useEffect(() => {
    loadCriticalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    const handleRefresh = () => {
      loadSecondaryData();
    };

    window.addEventListener('full-text-updated', handleRefresh);
    return () => window.removeEventListener('full-text-updated', handleRefresh);
  }, [loadSecondaryData]);

  useEffect(() => {
    if (!fullText || (summary && notes)) {
      return;
    }

    const interval = setInterval(() => {
      loadSecondaryData();
    }, 8000);

    return () => clearInterval(interval);
  }, [fullText, summary, notes, loadSecondaryData]);

  const loadRichContent = useCallback(async () => {
    if (materialType !== 'pdf') {
      return;
    }

    setRichHasRequested(true);
    setRichLoading(true);
    setRichError(null);
    setRichProgress({ value: 15, message: 'Fetching structured blocks...' });

    try {
      const { blocks, metadata } = await getMaterialRichContent(materialId);

      if (!isMountedRef.current) {
        return;
      }

      setRichProgress({ value: 65, message: 'Rendering layout...' });
      setRichBlocks(blocks || []);
      setRichMetadata(metadata || null);

      setRichProgress({
        value: blocks && blocks.length ? 100 : 100,
        message: blocks && blocks.length ? 'Rich view ready' : 'Structured view is not available yet',
      });
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('[MaterialDocumentView] Failed to load rich content:', err);
      setRichError('Не удалось загрузить Rich view. Попробуйте снова или переключитесь на текст.');
      setRichProgress({ value: 100, message: 'Failed to load structured view' });
    } finally {
      if (isMountedRef.current) {
        setRichLoading(false);
      }
    }
  }, [materialId, materialType]);

  useEffect(() => {
    if (materialType !== 'pdf') {
      return;
    }
    loadRichContent();
  }, [materialType, materialId, loadRichContent]);

  const handleViewModeChange = useCallback((mode: 'rich' | 'text' | 'pdf') => {
    setViewMode(mode);
    if (mode === 'rich' && materialType === 'pdf' && !richHasRequested) {
      loadRichContent();
    }
  }, [materialType, richHasRequested, loadRichContent]);

  const handleRetryRich = useCallback(() => {
    loadRichContent();
  }, [loadRichContent]);

  // Split text into paragraphs
  const paragraphs = fullText ? fullText.split('\n\n').filter(p => p.trim().length > 0) : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-white min-h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-gray-100 rounded-full mb-4"></div>
          <div className="text-gray-400 font-medium">Loading material...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center bg-white min-h-screen">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md text-center border border-gray-100">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Error Loading Material</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
      {/* Header Row - Glassmorphism & No Borders */}
      <div className="flex h-20 items-center bg-white/80 backdrop-blur-xl z-20 relative">
        {/* Left Header (Title) - 65% */}
        <div className="w-[65%] px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 truncate max-w-2xl tracking-tight">{materialTitle}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1.5">
              <span className="capitalize px-3 py-1 bg-gray-100/80 rounded-full text-xs font-semibold text-gray-700">
                {materialType}
              </span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="text-gray-400">Processed</span>
            </div>
          </div>
          {/* Removed Presentation Button from Header */}
        </div>

        {/* Right Header (Tabs) - 35% */}
        <div className="w-[35%] px-6 flex items-center justify-center">
          {/* Tab Navigation - Floating Pill Design */}
          <div className="flex items-center gap-1 p-1.5 bg-gray-100/80 rounded-full overflow-x-auto scrollbar-hide max-w-full shadow-inner">
            {[
              { id: 'chat', label: 'Chat', icon: null },
              { id: 'flashcards', label: 'Flashcards', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { id: 'podcast', label: 'Podcast', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
              { id: 'presentation', label: 'Presentation', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' }, // New Tab
              { id: 'quiz', label: 'Quiz', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              { id: 'summary', label: 'Summary', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { id: 'notes', label: 'Notes', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 whitespace-nowrap flex-shrink-0
                  ${activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                    : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                  }
                `}
              >
                {tab.id === 'chat' ? (
                  <span className={`w-2 h-2 rounded-full shadow-sm ${activeTab === 'chat' ? 'bg-green-500' : 'bg-gray-300'}`} />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon || ''} />
                  </svg>
                )}
                {tab.label}
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-5 bg-gray-300/50 mx-2 flex-shrink-0"></div>

            {/* Expand Icon */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white transition-all flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Columns - No Borders */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Content (Video/Transcript) */}
        <div className="w-[65%] flex flex-col bg-white overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          {/* Video Player */}
          {materialType === 'youtube' && youtubeUrl && (
            <div className="p-8 pb-0">
              <div className="aspect-video w-full rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-black transform transition-all hover:shadow-[0_20px_50px_rgba(8,_112,_184,_0.7)] hover:scale-[1.002] duration-500">
                <iframe
                  ref={videoRef}
                  src={`${youtubeUrl}${youtubeUrl.includes('?') ? '&' : '?'}enablejsapi=1`}
                  className="w-full h-full"
                  title="YouTube Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* Transcript / Text Content */}
          <div className="p-10 max-w-5xl mx-auto w-full">
            {fullText ? (
              <div className="prose prose-lg max-w-none">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-sm font-medium text-gray-900">
                      {materialType === 'youtube' ? 'Transcript' : 'Document Content'}
                    </h2>
                  </div>

                  {/* Reprocess button and View toggle for PDF */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <ReprocessButton materialId={materialId} />

                    {materialType === 'pdf' && (
                      <div className="flex rounded-full border border-gray-300 overflow-hidden text-xs font-semibold shadow-sm">
                        <button
                          onClick={() => handleViewModeChange('rich')}
                          disabled={richLoading && !richBlocks.length && !richError}
                          className={`px-3 py-1.5 transition-colors ${
                            viewMode === 'rich'
                              ? 'bg-black text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          } ${(richBlocks.length === 0 && !richLoading && !richError) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Rich view
                        </button>
                        <button
                          onClick={() => handleViewModeChange('text')}
                          className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
                            viewMode === 'text'
                              ? 'bg-black text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Text
                        </button>
                        <button
                          onClick={() => handleViewModeChange('pdf')}
                          disabled={!pdfUrl}
                          className={`px-3 py-1.5 border-l border-gray-200 transition-colors ${
                            viewMode === 'pdf'
                              ? 'bg-black text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          } ${!pdfUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          PDF
                        </button>
                      </div>
                    )}
                    {materialType === 'pdf' && richLoading && (
                      <span className="text-[11px] uppercase tracking-wide text-gray-400">
                        Building rich view… {Math.round(Math.min(richProgress.value, 100))}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning if using fallback text */}
                {(fullText.includes('Это видео добавлено без транскрипта') || fullText.startsWith('YouTube Video:')) && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-2 bg-amber-100 rounded-full">
                        <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-900 mb-1">Processing Issue</h4>
                        <p className="text-sm text-amber-700 leading-relaxed">
                          This transcript is a placeholder because the original processing failed to get the text.
                          <br />
                          <strong>Try clicking &quot;Reprocess Material&quot; above now that the system has been upgraded.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timestamped Transcript for YouTube or PDF/Text View */}
                {materialType === 'youtube' ? (
                  showTimestampedTranscript ? (
                    <TimestampedTranscript
                      materialId={materialId}
                      videoRef={videoRef}
                      onNoSegments={() => setShowTimestampedTranscript(false)}
                    />
                  ) : (
                    <div className="space-y-8">
                      {paragraphs.map((paragraph, index) => (
                        <div key={index} className="text-gray-600 leading-loose text-justify text-lg font-light">
                          <SelectableText materialId={materialId}>
                            {paragraph.trim()}
                          </SelectableText>
                        </div>
                      ))}
                    </div>
                  )
                ) : viewMode === 'pdf' ? (
                  pdfUrl ? (
                    <div className="h-[calc(100vh-200px)] -mx-10 border border-gray-200 rounded-xl overflow-hidden bg-gray-100 shadow-lg">
                      <div className="h-full">
                        <object
                          data={pdfUrl}
                          type="application/pdf"
                          className="w-full h-full"
                        >
                          <embed
                            src={pdfUrl}
                            type="application/pdf"
                            className="w-full h-full"
                          />
                        </object>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-2xl p-6">
                      Original PDF is not available for this material.
                    </div>
                  )
                ) : viewMode === 'rich' ? (
                  richLoading || !richBlocks.length || richError ? (
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-gray-200 bg-white/70 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-800">
                            {richError ? 'Rich view unavailable' : richProgress.message || 'Preparing rich view...'}
                          </p>
                          <span className="text-xs text-gray-500">
                            {Math.round(Math.min(richProgress.value, 100))}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(richProgress.value, 100)}%` }}
                            className={`h-full transition-all duration-500 ${richError ? 'bg-red-500' : 'bg-black'}`}
                          />
                        </div>
                        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {richError
                              ? 'Попробуйте снова или переключитесь на текстовый режим.'
                              : 'Вы можете оставаться на странице — мы автоматически подгрузим разметку.'}
                          </span>
                          {richError && (
                            <button
                              onClick={handleRetryRich}
                              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-black text-black hover:bg-black hover:text-white transition-colors"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {richMetadata?.pages && (
                        <div className="text-xs uppercase tracking-widest text-gray-400">
                          {richMetadata.pages} pages · extracted {new Date(richMetadata.extractedAt || Date.now()).toLocaleDateString()}
                        </div>
                      )}
                      <RichDocumentView materialId={materialId} blocks={richBlocks} />
                    </div>
                  )
                ) : (
                  <div className="space-y-8">
                    {paragraphs.map((paragraph, index) => (
                      <div key={index} className="text-gray-600 leading-loose text-justify text-lg font-light">
                        <SelectableText materialId={materialId}>
                          {paragraph.trim()}
                        </SelectableText>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="p-6 bg-gray-50 rounded-full mb-6">
                  <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <p className="text-xl font-medium text-gray-500">Content not available yet</p>
                <p className="text-sm mt-2 text-gray-400">The material is being processed.</p>
                <div className="mt-8">
                  <ReprocessButton materialId={materialId} label="Force Reprocess" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Tools */}
        <div className="w-[35%] flex flex-col bg-gray-50/50 border-l border-gray-100 backdrop-blur-sm">
          {/* Tab Content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chat' && (
              <div className="absolute inset-0">
                <TutorChat materialId={materialId} initialMessages={tutorMessages} />
              </div>
            )}

            {activeTab === 'podcast' && (
              <div className="absolute inset-0">
                <PodcastView
                  materialId={materialId}
                  podcastScript={podcastData.script}
                  podcastAudioUrl={podcastData.audioUrl}
                  onUpdate={async () => {
                    const data = await getMaterialPodcastData(materialId);
                    setPodcastData({ script: data.podcastScript, audioUrl: data.podcastAudioUrl });
                  }}
                />
              </div>
            )}

            {activeTab === 'presentation' && (
              <div className="absolute inset-0">
                <PresentationView
                  materialId={materialId}
                  presentationStatus={presentationData.status}
                  presentationUrl={presentationData.url}
                  presentationEmbedUrl={presentationData.embedUrl}
                  onUpdate={async () => {
                    const data = await getMaterialPresentationData(materialId);
                    setPresentationData({ status: data.presentationStatus, url: data.presentationUrl, embedUrl: data.presentationEmbedUrl });
                  }}
                />
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div className="h-full overflow-y-auto p-8">
                {flashcards.length > 0 ? (
                  <InteractiveFlashcards flashcards={flashcards} materialId={materialId} />
                ) : (
                  <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full shadow-sm inline-block mb-4">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6 font-medium">
                      Generate flashcards from the material notes.
                    </p>
                    <GenerateFlashcardsButton materialId={materialId} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="h-full overflow-y-auto p-8">
                {quiz.length > 0 ? (
                  <InteractiveQuiz quiz={quiz} materialId={materialId} />
                ) : (
                  <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full shadow-sm inline-block mb-4">
                      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6 font-medium">
                      Generate a quiz with multiple-choice questions.
                    </p>
                    <GenerateQuizButton materialId={materialId} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'summary' && (
              <div className="h-full overflow-y-auto p-8">
                {summary ? (
                  <div className="prose prose-sm max-w-none">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Summary</h3>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50">
                      <div className="whitespace-pre-wrap text-gray-600 leading-relaxed text-base">
                        {summary.summary}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full shadow-sm inline-block mb-4">
                      <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back
                    </Link>
                    <p className="text-gray-600 mb-6 font-medium">
                      Summary not available yet.
                    </p>
                    <GenerateSummaryButton materialId={materialId} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="h-full overflow-y-auto p-8">
                {notes ? (
                  <div className="prose prose-sm max-w-none">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">Study Notes</h3>
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100/50">
                      <div className="whitespace-pre-wrap text-gray-600 leading-relaxed text-base">
                        {notes.notes}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full shadow-sm inline-block mb-4">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-6 font-medium">
                      Notes not available yet.
                    </p>
                    <GenerateNotesButton materialId={materialId} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

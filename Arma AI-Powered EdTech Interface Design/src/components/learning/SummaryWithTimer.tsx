import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/button';
import { userApi } from '@/services/api';

interface SummaryWithTimerProps {
  materialId: string;
  onComplete: (readTimeSeconds: number) => void;
  onOpenChat?: (selectedText?: string) => void;
}

interface ReadingTimeData {
  material_id: string;
  summary: string;
  word_count: number;
  estimated_reading_time_seconds: number;
  estimated_reading_time_minutes: number;
  minimum_required_seconds: number;
  early_unlock_seconds: number;
}

export const SummaryWithTimer: React.FC<SummaryWithTimerProps> = ({
  materialId,
  onComplete,
  onOpenChat,
}) => {
  const [summaryData, setSummaryData] = useState<ReadingTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeSpent, setTimeSpent] = useState(0);
  const [canComplete, setCanComplete] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [showChatButton, setShowChatButton] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Load summary data
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await userApi.getLearningProgress(materialId);
        // Fetch summary with reading time
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/materials/${materialId}/summary/reading-time`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to load summary');
        }
        
        const summaryData = await response.json();
        setSummaryData(summaryData);
      } catch (error) {
        console.error('Error loading summary:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [materialId]);

  // Timer effect
  useEffect(() => {
    if (!summaryData) return;

    const timer = setInterval(() => {
      setTimeSpent((prev) => {
        const newTime = prev + 1;
        
        // Check if can unlock early (10-15 seconds before estimated time)
        if (newTime >= summaryData.early_unlock_seconds) {
          setCanComplete(true);
        }
        
        // Auto-complete when minimum time is reached
        if (newTime >= summaryData.minimum_required_seconds) {
          setCanComplete(true);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [summaryData]);

  // Handle text selection
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();
      
      if (selectedText && selectedText.length > 10) {
        setSelectedText(selectedText);
        setShowChatButton(true);
      } else {
        setShowChatButton(false);
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleTextSelection);
    return () => document.removeEventListener('selectionchange', handleTextSelection);
  }, []);

  const handleComplete = () => {
    if (!canComplete || !summaryData) return;
    onComplete(timeSpent);
  };

  const handleAskAI = () => {
    if (selectedText && onOpenChat) {
      onOpenChat(selectedText);
      setShowChatButton(false);
      setSelectedText('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!summaryData) return 0;
    return Math.min(100, (timeSpent / summaryData.minimum_required_seconds) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Загрузка summary...</div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Не удалось загрузить summary</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timer Bar */}
      <div className="sticky top-0 z-10 bg-[#0C0C0F]/95 backdrop-blur border-b border-white/10 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Clock className={`w-5 h-5 ${canComplete ? 'text-[#FF8A3D]' : 'text-white/60'}`} />
            <span className="text-white/80 font-medium">
              {canComplete ? 'Можно продолжать' : 'Время чтения'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">
              Прогресс: {formatTime(timeSpent)} / {formatTime(summaryData.minimum_required_seconds)}
            </span>
            <span className="text-sm text-white/40">
              ({summaryData.word_count} слов, ~{summaryData.estimated_reading_time_minutes} мин)
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className={`h-full transition-all duration-300 ${
              canComplete ? 'bg-[#FF8A3D]' : 'bg-blue-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Summary Content */}
      <div
        ref={summaryRef}
        className="prose prose-invert prose-lg max-w-none"
        style={{
          color: '#F3F3F3',
          lineHeight: '1.8',
        }}
      >
        <div className="whitespace-pre-wrap text-white/90">
          {summaryData.summary || 'Summary не доступно'}
        </div>
      </div>

      {/* Floating Chat Button (appears on text selection) */}
      <AnimatePresence>
        {showChatButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="fixed bottom-24 right-8 z-50"
          >
            <Button
              onClick={handleAskAI}
              className="bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white shadow-lg shadow-[#FF8A3D]/30 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Спросить AI о выделенном
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Button */}
      <div className="mt-8 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={handleComplete}
            disabled={!canComplete}
            className={`
              px-8 py-6 text-lg font-semibold cursor-pointer transition-all duration-300
              ${canComplete
                ? 'bg-[#FF8A3D] hover:bg-[#FF8A3D]/90 text-white shadow-lg shadow-[#FF8A3D]/30'
                : 'bg-white/10 text-white/40 cursor-not-allowed'}
            `}
          >
            {canComplete ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Я прочитал
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 mr-2" />
                Прочитайте внимательно ({Math.ceil(summaryData.minimum_required_seconds - timeSpent)} сек)
              </>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Selected Text Highlight Info */}
      <AnimatePresence>
        {selectedText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-[#121215] border border-[#FF8A3D]/30 rounded-lg px-4 py-2 text-sm text-white/80"
          >
            Выделено: {selectedText.substring(0, 50)}...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { usePrefersReducedMotion } from '../components/reactbits/usePrefersReducedMotion';
import { materialsApi } from '@/lib/api/materials';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'pdf' | 'youtube';
}

export default function UploadModal({ isOpen, onClose, mode: initialMode }: UploadModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'pdf' | 'youtube'>(initialMode);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
   const prefersReducedMotion = usePrefersReducedMotion();

  // Синхронизируем mode с initialMode при изменении
  useEffect(() => {
    setMode(initialMode);
    setTitle('');
    setFile(null);
    setYoutubeUrl('');
    setError(null);
  }, [initialMode, isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!title.trim()) {
      setError('Please enter a title');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'pdf') {
        if (!file || file.size === 0) {
          setError('Please select a PDF file');
          setLoading(false);
          return;
        }

        if (file.type !== 'application/pdf') {
          setError('Only PDF files are allowed');
          setLoading(false);
          return;
        }

        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
          setError(`File size exceeds 50 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB`);
          setLoading(false);
          return;
        }

        const result = await materialsApi.uploadPDF(title.trim(), file);
        if (result && result.id) {
          // For PDF, we can just close or redirect. Usually redirect.
          window.location.assign(`/dashboard/materials/${result.id}`);
        }
      } else {
        if (!youtubeUrl.trim()) {
          setError('Please enter a YouTube URL');
          setLoading(false);
          return;
        }

        // Create a timeout promise
        const timeoutPromise = new Promise<{ id: string }>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), 30000)
        );

        // Race between the actual request and the timeout
        const result = await Promise.race([
          materialsApi.createYouTube(title.trim(), youtubeUrl.trim()),
          timeoutPromise
        ]);

        if (result && result.id) {
          // Use window.location.assign for reliable navigation to processing page
          window.location.assign(`/dashboard/materials/${result.id}`);
        } else {
          throw new Error('No ID returned from server');
        }
      }
    } catch (err) {
      console.error('[UploadModal] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add material');
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.15 : 0.25, ease: 'easeOut' }}
          >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            Add Learning Material
          </h2>
          <motion.button
            onClick={onClose}
            className="text-gray-400 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-full"
            whileHover={prefersReducedMotion ? undefined : { rotate: 90 }}
            transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Mode Switcher */}
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <motion.button
                type="button"
                onClick={() => setMode('pdf')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'pdf'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black'
                  }`}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              >
                PDF Document
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setMode('youtube')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'youtube'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-black'
                  }`}
                whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              >
                YouTube Video
              </motion.button>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white"
                placeholder="Enter material title"
              />
            </div>

            {mode === 'pdf' ? (
              <div>
                <label htmlFor="file" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  PDF File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        const MAX_FILE_SIZE = 50 * 1024 * 1024;
                        if (selectedFile.size > MAX_FILE_SIZE) {
                          setError(`File size exceeds 50 MB.`);
                          e.target.value = '';
                        } else {
                          setFile(selectedFile);
                          setError(null);
                        }
                      }
                    }}
                    className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer bg-gray-50/50 hover:bg-white"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 ml-1">
                  Max file size: 50 MB
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="youtubeUrl" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  YouTube URL
                </label>
                <input
                  type="url"
                  id="youtubeUrl"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Videos with captions/subtitles provide the best AI analysis results.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <motion.button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-8 py-3.5 border border-gray-200 rounded-full text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                disabled={loading}
                className="flex-1 px-8 py-3.5 bg-black text-white rounded-full font-semibold hover:bg-gray-900 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileHover={prefersReducedMotion || loading ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion || loading ? undefined : { scale: 0.99 }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  mode === 'pdf' ? 'Upload PDF' : 'Add Video'
                )}
              </motion.button>
            </div>
          </form>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { materialsApi } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

export default function UploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'pdf' | 'youtube'>('pdf');

  useEffect(() => {
    if (modeParam === 'youtube') {
      setMode('youtube');
    } else {
      setMode('pdf');
    }
  }, [modeParam]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;

    if (!title || title.trim().length === 0) {
      setError('Please enter a title');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'pdf') {
        const file = formData.get('file') as File;

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

        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
        if (file.size > MAX_FILE_SIZE) {
          setError(`File size exceeds the maximum limit of 50 MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)} MB`);
          setLoading(false);
          return;
        }

        const result = await materialsApi.uploadPDF(title.trim(), file);
        if (result && result.id) {
          // Redirect to material page
          window.location.assign(`/dashboard/materials/${result.id}`);
        }
      } else {
        const youtubeUrl = formData.get('youtubeUrl') as string;

        if (!youtubeUrl || youtubeUrl.trim().length === 0) {
          setError('Please enter a YouTube URL');
          setLoading(false);
          return;
        }

        console.log('[UploadForm] Creating YouTube material...');

        const result = await materialsApi.createYouTube(title.trim(), youtubeUrl.trim());

        console.log('[UploadForm] Result:', result);

        if (result && result.id) {
          console.log('[UploadForm] Redirecting to material page:', result.id);
          // Use window.location.assign for reliable navigation
          window.location.assign(`/dashboard/materials/${result.id}`);
        } else {
          throw new Error('No ID returned from server');
        }
      }
    } catch (err) {
      console.error('[UploadForm] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to add material');
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Header - Dynamic based on mode */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Add Learning Material
        </h2>

        {/* Mode Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => {
              setMode('pdf');
              router.replace('/dashboard/upload?mode=pdf');
            }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'pdf'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-500 hover:text-black'
              }`}
          >
            PDF Document
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('youtube');
              router.replace('/dashboard/upload?mode=youtube');
            }}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'youtube'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-500 hover:text-black'
              }`}
          >
            YouTube Video
          </button>
        </div>

        <p className="text-gray-500 mt-4">
          {mode === 'pdf'
            ? 'Upload a PDF file to generate study materials.'
            : 'Paste a YouTube link to generate study materials.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            defaultValue=""
            className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white"
            placeholder="Enter material title"
          />
        </div>

        {mode === 'pdf' ? (
          <div>
            <label htmlFor="file" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
              PDF Document
            </label>
            <div className="relative group">
              <div className="absolute inset-0 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 group-hover:border-black/20 transition-colors pointer-events-none"></div>
              <div className="relative flex flex-col items-center justify-center py-12 px-4 text-center cursor-pointer">
                <svg className="w-12 h-12 text-gray-300 mb-3 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-900 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">PDF up to 50MB</p>
                <input
                  type="file"
                  id="file"
                  name="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const MAX_FILE_SIZE = 50 * 1024 * 1024;
                      if (file.size > MAX_FILE_SIZE) {
                        setError(`File too large. Max 50MB.`);
                        e.target.value = '';
                      } else {
                        setError(null);
                      }
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="youtubeUrl" className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
              YouTube URL
            </label>
            <input
              type="url"
              id="youtubeUrl"
              name="youtubeUrl"
              required
              defaultValue=""
              className="w-full px-5 py-3.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all placeholder-gray-400 bg-gray-50/50 hover:bg-white"
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl">
              <div className="flex gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700 leading-relaxed">
                  Videos with captions/subtitles provide the best AI analysis results.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            disabled={loading}
            className="px-8 py-3.5 border border-gray-200 rounded-full text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-8 py-3.5 bg-black text-white rounded-full font-semibold hover:bg-gray-900 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import PDFViewer from './PDFViewer';

interface DocumentViewerProps {
  fileUrl: string | null;
  materialId: string;
  materialTitle: string;
  materialType: 'pdf' | 'youtube';
  youtubeUrl?: string;
}

export default function DocumentViewer({ 
  fileUrl, 
  materialId, 
  materialTitle,
  materialType,
  youtubeUrl 
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(2);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Document Title */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-black">{materialTitle}</h1>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Zoom In */}
          <button
            onClick={() => setZoom(Math.min(zoom + 10, 200))}
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Zoom In"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>

          {/* Search */}
          <button
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Search"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Dark Mode */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 hover:bg-gray-200 rounded transition-colors ${darkMode ? 'bg-gray-300' : ''}`}
            title="Dark Mode"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          {/* Read Aloud */}
          <button
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Read Aloud"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
        </div>

        {/* Page Counter and Zoom */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700">{currentPage}/{totalPages}</span>
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-700">{zoom}%</span>
            <button className="p-1">
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Download */}
          <button
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Download"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Fullscreen */}
          <button
            className="p-2 hover:bg-gray-200 rounded transition-colors"
            title="Fullscreen"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {materialType === 'youtube' && youtubeUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <iframe
              src={youtubeUrl}
              className="w-full h-full"
              title="YouTube Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : fileUrl ? (
          <PDFViewer fileUrl={fileUrl} materialId={materialId} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 mb-4">Document not available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

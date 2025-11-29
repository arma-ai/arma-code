'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UploadCardProps {
  type: 'pdf' | 'youtube';
  onClick: () => void;
}

export default function UploadCard({ type, onClick }: UploadCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all text-left w-full"
    >
      {type === 'pdf' ? (
        <>
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-black mb-1">Upload Files</h3>
          <p className="text-sm text-gray-500">Only PDF files are allowed now</p>
        </>
      ) : (
        <>
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-black mb-1">YouTube videos link</h3>
          <p className="text-sm text-gray-500">Paste the link of any YouTube video</p>
        </>
      )}
    </button>
  );
}


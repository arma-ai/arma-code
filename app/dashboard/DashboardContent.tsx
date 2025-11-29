'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Material } from '@/app/actions/materials';
import UploadModal from './UploadModal';
import DeleteMaterialButton from './DeleteMaterialButton';

interface DashboardContentProps {
  materials: Material[];
}

// Helper to extract YouTube ID
// Helper to extract YouTube ID
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  // Allow 10-12 chars for ID to be safe, though usually 11
  return (match && match[2].length >= 10 && match[2].length <= 12) ? match[2] : null;
}

export default function DashboardContent({ materials }: DashboardContentProps) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'pdf' | 'youtube'>('pdf');

  const recentMaterials = materials.slice(0, 6);

  return (
    <>
      <div className="flex-1 bg-white min-h-screen">
        <div className="max-w-6xl mx-auto px-6 pt-4 pb-8">
          {/* Hero Section */}
          <section className="mb-8">
            <div className="text-center mb-0">
              <h1 className="text-2xl font-medium text-black flex items-center justify-center gap-1">
                More Ways to Learn with <img src="/logo.png" alt="arma" className="h-32 w-auto object-contain" />
              </h1>
            </div>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8 relative z-10 -mt-8">
              {/* Upload Files */}
              <button
                onClick={() => {
                  setUploadMode('pdf');
                  setUploadModalOpen(true);
                }}
                className="group bg-white rounded-xl border border-gray-300 p-5 text-left hover:border-black transition-colors"
              >
                <div className="mb-3">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black mb-1">Upload PDF</h3>
                <p className="text-gray-400 text-xs font-medium">Only PDF files are allowed now</p>
              </button>

              {/* YouTube Link */}
              <button
                onClick={() => {
                  setUploadMode('youtube');
                  setUploadModalOpen(true);
                }}
                className="group bg-white rounded-xl border border-gray-300 p-5 text-left hover:border-black transition-colors"
              >
                <div className="mb-3">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-black mb-1">YouTube videos link</h3>
                <p className="text-gray-400 text-xs font-medium">Paste the link of any YouTube video</p>
              </button>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for your projects..."
                  className="w-full px-5 py-3 rounded-full border border-gray-300 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-0 transition-colors text-base"
                />
              </div>
            </div>
          </section>

          {/* Recent Materials */}
          <section className="mb-16 pb-16 border-b border-gray-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-black">Recent Materials</h2>
              {materials.length > 6 && (
                <Link
                  href="/dashboard/materials"
                  className="text-gray-500 hover:text-black font-medium flex items-center gap-2 group transition-colors"
                >
                  View all
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>

            {materials.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentMaterials.map((material) => {
                  const youtubeId = material.type === 'youtube' && material.source ? getYouTubeId(material.source) : null;
                  const thumbnailUrl = youtubeId
                    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
                    : null;

                  return (
                    <div key={material.id} className="group bg-white rounded-xl border border-gray-200 hover:border-black transition-all duration-300 overflow-hidden flex flex-col h-full hover:shadow-lg">
                      <Link href={`/dashboard/materials/${material.id}`} className="flex-1 flex flex-col">
                        {/* Preview Image */}
                        <div className="aspect-video w-full bg-gray-100 relative overflow-hidden border-b border-gray-100">
                          {material.type === 'youtube' && thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={material.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-50 group-hover:bg-gray-100 transition-colors">
                              {material.type === 'youtube' ? (
                                <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                                </svg>
                              ) : (
                                <div className="relative w-24 h-32 bg-white shadow-sm border border-gray-200 rounded flex flex-col p-2">
                                  <div className="w-full h-2 bg-gray-100 mb-2 rounded-sm" />
                                  <div className="w-3/4 h-2 bg-gray-100 mb-2 rounded-sm" />
                                  <div className="w-full h-2 bg-gray-100 mb-2 rounded-sm" />
                                  <div className="w-5/6 h-2 bg-gray-100 mb-2 rounded-sm" />
                                  <div className="mt-auto w-8 h-8 bg-gray-50 rounded-full self-end" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Type Badge */}
                          <div className="absolute top-3 right-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium backdrop-blur-md ${material.type === 'youtube'
                              ? 'bg-black/70 text-white'
                              : 'bg-white/90 text-black border border-gray-200'
                              }`}>
                              {material.type === 'youtube' ? 'Video' : 'PDF'}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="text-lg font-bold text-black line-clamp-1 mb-2 group-hover:text-gray-700 transition-colors">
                            {material.title}
                          </h3>

                          {/* Summary with forced truncation */}
                          <div className="mb-4 h-5 overflow-hidden">
                            <p className="text-sm text-gray-500 truncate">
                              {material.summary || 'No summary available. Process the material to generate an AI description.'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                            <span className="text-xs text-gray-400 font-medium">
                              {(() => {
                                const date = new Date(material.created_at);
                                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                              })()}
                            </span>

                            {/* Delete Button (Small & Minimal) */}
                            <div onClick={(e) => e.preventDefault()}>
                              <DeleteMaterialButton materialId={material.id} materialTitle={material.title} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-black mb-3">No materials yet</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Start your learning journey by uploading a PDF or adding a YouTube video
                </p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Material
                </button>
              </div>
            )}
          </section>

          {/* Stats Section */}
          {materials.length > 0 && (
            <section>
              <h2 className="text-3xl font-bold text-black mb-8">Overview</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Materials</div>
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-black">{materials.length}</div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Videos</div>
                    <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-black">
                    {materials.filter(m => m.type === 'youtube').length}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Documents</div>
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold text-black">
                    {materials.filter(m => m.type === 'pdf').length}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <UploadModal
        key={uploadMode}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        mode={uploadMode}
      />
    </>
  );
}

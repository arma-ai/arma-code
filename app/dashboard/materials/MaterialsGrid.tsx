'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Material } from '@/lib/api';
import UploadModal from '../UploadModal';
import DeleteMaterialButton from '../DeleteMaterialButton';

interface MaterialsGridProps {
    materials: Material[];
}

// Helper to extract YouTube ID
function getYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export default function MaterialsGrid({ materials }: MaterialsGridProps) {
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<'pdf' | 'youtube'>('pdf');

    return (
        <div className="w-full max-w-7xl mx-auto px-8 py-12">
            <div className="mb-8 flex justify-between items-center">
                <h1 className="text-4xl font-bold text-black">All Materials</h1>
                <button
                    onClick={() => setUploadModalOpen(true)}
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Material
                </button>
            </div>

            {materials.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map((material) => {
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
                </div>
            )}

            <UploadModal
                key={uploadMode}
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                mode={uploadMode}
            />
        </div>
    );
}

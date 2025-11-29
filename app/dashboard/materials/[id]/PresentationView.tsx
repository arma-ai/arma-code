'use client';

import { useState } from 'react';

interface PresentationViewProps {
    materialId: string;
    presentationStatus: string | null;
    presentationUrl: string | null;
    presentationEmbedUrl: string | null;
    onUpdate: () => void;
}

export default function PresentationView({ materialId, presentationStatus, presentationUrl, presentationEmbedUrl, onUpdate }: PresentationViewProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const [showPreview, setShowPreview] = useState(false);

    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            const { generatePresentation } = await import('@/app/actions/presentation');
            await generatePresentation(materialId);
            onUpdate();
        } catch (e) {
            console.error(e);
            alert('Failed to generate presentation');
        } finally {
            setIsGenerating(false);
        }
    };

    if (presentationStatus === 'completed' && (presentationEmbedUrl || presentationUrl)) {
        return (
            <>
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-white to-gray-50">
                    <div className="max-w-lg w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
                        <div className="mb-6 p-4 bg-green-50 rounded-full inline-block">
                            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Presentation Ready!</h3>
                        <p className="text-gray-500 mb-8">Your slides have been generated successfully.</p>

                        <div className="flex flex-col gap-3">
                            {presentationEmbedUrl && (
                                <button
                                    onClick={() => setShowPreview(true)}
                                    className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-bold shadow-md flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Preview Slides
                                </button>
                            )}

                            {presentationUrl && (
                                <a
                                    href={presentationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-bold flex items-center justify-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download PPTX
                                </a>
                            )}

                            <button
                                onClick={handleGenerate}
                                className="mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
                            >
                                Regenerate Presentation
                            </button>
                        </div>
                    </div>
                </div>

                {/* Full Screen Preview Modal */}
                {showPreview && presentationEmbedUrl && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8">
                        <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-200">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                                <h3 className="font-bold text-lg text-gray-800">Presentation Preview</h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Iframe Container */}
                            <div className="flex-1 bg-gray-100 relative">
                                <iframe
                                    src={presentationEmbedUrl}
                                    className="absolute inset-0 w-full h-full border-0"
                                    allowFullScreen
                                    title="Presentation Preview"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                {presentationUrl && (
                                    <a
                                        href={presentationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-lg w-full bg-white p-10 rounded-3xl shadow-xl border border-gray-100">
                <div className="mb-8 relative inline-block">
                    <div className="absolute inset-0 bg-indigo-100 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg transform rotate-3 transition-transform hover:rotate-0 duration-300">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
                    </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Presentation Generator</h3>
                <p className="text-gray-500 mb-8 text-lg leading-relaxed">
                    Transform this material into a professional PowerPoint presentation in seconds.
                    <span className="block mt-2 text-sm text-gray-400">Includes smart layouts, relevant images, and key points.</span>
                </p>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || presentationStatus === 'generating'}
                    className={`w-full py-4 px-6 rounded-xl text-white font-bold text-lg shadow-lg transform transition-all duration-200 flex items-center justify-center gap-3
                        ${isGenerating || presentationStatus === 'generating'
                            ? 'bg-gray-400 cursor-wait scale-100'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-[1.02] hover:shadow-xl active:scale-95'
                        }`}
                >
                    {isGenerating || presentationStatus === 'generating' ? (
                        <>
                            <svg className="animate-spin w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Designing Slides...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Generate Presentation</span>
                        </>
                    )}
                </button>

                <p className="mt-4 text-xs text-gray-400">Powered by GPT-4 & SlidesGPT</p>
            </div>
        </div>
    );
}

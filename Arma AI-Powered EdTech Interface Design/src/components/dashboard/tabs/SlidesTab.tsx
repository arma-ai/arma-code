import React, { useState } from 'react';
import { MonitorPlay, Play, Download, RotateCw, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { materialsApi } from '../../../services/api';
import type { Material } from '../../../types/api';

export function SlidesTab({ material, onRefetch }: { material: Material; onRefetch: () => Promise<void> | void }) {
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

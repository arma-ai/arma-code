'use client';

import { useState } from 'react';
import { reprocessMaterial } from '@/app/actions/reprocessMaterial';

export default function ReprocessButton({ materialId, label = 'Reprocess Material' }: { materialId: string, label?: string }) {
    const [isReprocessing, setIsReprocessing] = useState(false);

    const handleReprocess = async () => {
        if (!confirm('Are you sure you want to reprocess this material? This will delete existing notes, summary, and flashcards.')) {
            return;
        }

        setIsReprocessing(true);
        try {
            await reprocessMaterial(materialId);
            // Reload the page to show the new state (processing)
            window.location.reload();
        } catch (error) {
            console.error('Failed to reprocess:', error);
            alert('Failed to start reprocessing. Please try again.');
            setIsReprocessing(false);
        }
    };

    return (
        <button
            onClick={handleReprocess}
            disabled={isReprocessing}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
            title="Force reprocessing of this material"
        >
            {isReprocessing ? (
                <>
                    <svg className="animate-spin h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Starting...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {label}
                </>
            )}
        </button>
    );
}

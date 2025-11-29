'use client';

import { useState } from 'react';
import { generateNotes } from '@/app/actions/generateNotes';

interface GenerateNotesButtonProps {
    materialId: string;
}

export default function GenerateNotesButton({ materialId }: GenerateNotesButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);

        try {
            await generateNotes(materialId);
            // Trigger a reload of the data
            window.dispatchEvent(new Event('full-text-updated'));
        } catch (err) {
            console.error('Failed to generate notes:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate notes');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {error && (
                <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg max-w-md text-center">
                    {error}
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
                {loading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Notes...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Generate Notes
                    </>
                )}
            </button>
        </div>
    );
}

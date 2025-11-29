'use server';

import { createClient } from '@/lib/supabase/server';

export interface TranscriptSegment {
    id: string;
    segment_index: number;
    start_time: number;
    end_time: number;
    text: string;
}

export async function getTranscriptSegments(materialId: string): Promise<TranscriptSegment[]> {
    const supabase = await createClient();

    // Проверка авторизации
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Получение сегментов транскрипта
    const { data, error } = await supabase
        .from('transcript_segments')
        .select('*')
        .eq('material_id', materialId)
        .order('segment_index', { ascending: true });

    if (error) {
        console.error('Failed to fetch transcript segments:', error);
        return [];
    }

    return data || [];
}

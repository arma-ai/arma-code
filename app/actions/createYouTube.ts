'use server';

import { createClient } from '@/lib/supabase/server';

export async function createYouTube(url: string, title: string) {
    console.log('[createYouTube] Starting...', { url, title });
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('[createYouTube] Auth error:', authError);
        throw new Error('Unauthorized');
    }

    // Extract ID
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (!match || !match[1]) {
        throw new Error('Invalid YouTube URL');
    }
    const videoId = match[1];

    console.log('[createYouTube] Inserting into DB...');
    const { data, error } = await supabase.from('materials').insert({
        user_id: user.id,
        title: title.trim(),
        type: 'youtube',
        source: url,
        file_path: `youtube/${videoId}`,
        file_name: `YouTube Video: ${videoId}`,
        processing_status: 'queued',
        processing_progress: 0
    }).select().single();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        throw new Error('Failed to create material: No data returned');
    }

    return { id: data.id };
}

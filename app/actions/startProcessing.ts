'use server';

import { createClient } from '@/lib/supabase/server';

export async function startProcessing(materialId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Trigger background processing
    // We don't await this, we just start it
    import('@/app/actions/processMaterial').then(({ processMaterial }) => {
        console.log(`[startProcessing] Triggering processMaterial for ${materialId}`);
        processMaterial(materialId).catch((error) => {
            console.error('[startProcessing] Auto-processing failed:', error);
        });
    });

    return { success: true };
}

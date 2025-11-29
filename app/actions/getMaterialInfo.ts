'use server';

import { createClient } from '@/lib/supabase/server';

export async function getMaterialInfo(materialId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from('materials')
        .select('id, type, source, title')
        .eq('id', materialId)
        .eq('user_id', user.id)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

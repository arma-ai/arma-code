'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';
import { getMaterialFullText, getDocumentText } from './materials';

// Проверка наличия API ключа
if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables. Please add it to .env.local file.');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateSummaryFromText(text: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content:
                    'You are an expert at summarizing educational materials. Create a concise, comprehensive summary of the provided text.',
            },
            {
                role: 'user',
                content: `Summarize the following text:\n\n${text.substring(0, 50000)}`, // Limit context
            },
        ],
        temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
}

export async function generateSummary(materialId: string) {
    const supabase = await createClient();

    // Проверка авторизации
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // Получение материала
    const { data: material, error: materialError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .eq('user_id', user.id)
        .single();

    if (materialError || !material) {
        throw new Error('Material not found');
    }

    // Проверка статуса обработки
    if (material.processing_status !== 'completed') {
        throw new Error(`Material is still being processed (${material.processing_status || 'pending'}). Please wait for processing to complete before generating summary.`);
    }

    // Проверка, не создан ли уже summary
    const { data: existingSummary } = await supabase
        .from('material_summaries')
        .select('id')
        .eq('material_id', materialId);

    if (existingSummary && existingSummary.length > 0) {
        // Удаляем старое саммари для перегенерации
        const { error: deleteError } = await supabase
            .from('material_summaries')
            .delete()
            .eq('material_id', materialId);

        if (deleteError) {
            console.error('Failed to delete existing summary:', deleteError);
        }
    }

    // Получаем текст
    let textToUse = await getMaterialFullText(materialId);

    // Если full_text нет, пробуем собрать из embeddings
    if (!textToUse || textToUse.trim().length === 0) {
        console.log('[generateSummary] full_text missing, trying to reconstruct from embeddings...');
        textToUse = await getDocumentText(materialId);
    }

    if (!textToUse || textToUse.trim().length === 0) {
        console.error('[generateSummary] No content available. Material:', material);
        throw new Error('No content available for generating summary. The material may not have been processed correctly. Please try reprocessing the material.');
    }

    console.log(`[generateSummary] Generating summary from ${textToUse.length} characters of text`);

    // Генерация
    const summary = await generateSummaryFromText(textToUse);

    if (!summary) {
        throw new Error('Failed to generate summary');
    }

    console.log(`[generateSummary] Generated summary: ${summary.length} characters`);

    // Сохранение
    const { error: insertError } = await supabase.from('material_summaries').insert({
        material_id: materialId,
        summary,
    });

    if (insertError) {
        console.error('[generateSummary] Failed to save summary:', insertError);
        throw new Error(`Failed to save summary: ${insertError.message}`);
    }

    console.log('[generateSummary] Summary saved successfully');

    revalidatePath(`/dashboard/materials/${materialId}`);
    return { success: true };
}

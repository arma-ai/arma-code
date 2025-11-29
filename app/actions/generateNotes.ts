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

async function generateNotesFromText(text: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content:
                    'You are an expert at creating study notes. Extract key points, concepts, and important information from the provided text in a structured format.',
            },
            {
                role: 'user',
                content: `Create detailed study notes from the following text:\n\n${text.substring(0, 50000)}`, // Limit context
            },
        ],
        temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
}

export async function generateNotes(materialId: string) {
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
        throw new Error(`Material is still being processed (${material.processing_status || 'pending'}). Please wait for processing to complete before generating notes.`);
    }

    // Проверка, не созданы ли уже notes
    const { data: existingNotes } = await supabase
        .from('material_notes')
        .select('id')
        .eq('material_id', materialId);

    if (existingNotes && existingNotes.length > 0) {
        // Удаляем старые заметки для перегенерации
        const { error: deleteError } = await supabase
            .from('material_notes')
            .delete()
            .eq('material_id', materialId);

        if (deleteError) {
            console.error('Failed to delete existing notes:', deleteError);
        }
    }

    // Получаем текст
    let textToUse = await getMaterialFullText(materialId);

    // Если full_text нет, пробуем собрать из embeddings
    if (!textToUse || textToUse.trim().length === 0) {
        console.log('[generateNotes] full_text missing, trying to reconstruct from embeddings...');
        textToUse = await getDocumentText(materialId);
    }

    if (!textToUse || textToUse.trim().length === 0) {
        console.error('[generateNotes] No content available. Material:', material);
        throw new Error('No content available for generating notes. The material may not have been processed correctly. Please try reprocessing the material.');
    }

    console.log(`[generateNotes] Generating notes from ${textToUse.length} characters of text`);

    // Генерация
    const notes = await generateNotesFromText(textToUse);

    if (!notes) {
        throw new Error('Failed to generate notes');
    }

    console.log(`[generateNotes] Generated notes: ${notes.length} characters`);

    // Сохранение
    const { error: insertError } = await supabase.from('material_notes').insert({
        material_id: materialId,
        notes,
    });

    if (insertError) {
        console.error('[generateNotes] Failed to save notes:', insertError);
        throw new Error(`Failed to save notes: ${insertError.message}`);
    }

    console.log('[generateNotes] Notes saved successfully');

    revalidatePath(`/dashboard/materials/${materialId}`);
    return { success: true };
}

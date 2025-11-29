'use server';

import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { revalidatePath } from 'next/cache';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePresentation(materialId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    // 1. Fetch material content
    // 1. Fetch material content
    const { data: material, error: materialError } = await supabase
        .from('materials')
        .select('title, full_text, material_summaries(summary)')
        .eq('id', materialId)
        .single();

    if (materialError || !material) {
        console.error('[generatePresentation] Material fetch error:', materialError);
        throw new Error('Material not found');
    }

    // 2. Update status to generating
    await supabase
        .from('materials')
        .update({ presentation_status: 'generating' })
        .eq('id', materialId);

    try {
        // 3. Generate Prompt for SlidesGPT using OpenAI
        // We use the summary if available, otherwise a chunk of the full text to avoid token limits
        // @ts-ignore - Supabase types might not know about the relation structure without generation
        const summaryText = material.material_summaries?.[0]?.summary;
        const contentContext = summaryText || material.full_text?.substring(0, 10000) || '';

        const promptResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert presentation designer. Your goal is to create a perfect prompt for an AI presentation generator (SlidesGPT).
          
          The user wants a presentation based on the provided educational material.
          
          Output ONLY the prompt string that I should send to SlidesGPT. Do not include any explanations.
          
          The prompt should be structured like this:
          "Create a [Number] slide presentation about [Title]. The audience is [Audience]. 
          Cover these key points:
          - [Point 1]
          - [Point 2]
          ...
          Tone: [Tone]. Visual Style: [Style]."
          
          Keep the prompt under 1000 characters if possible, but make it detailed enough for a high-quality result.`
                },
                {
                    role: 'user',
                    content: `Title: ${material.title}\n\nContent:\n${contentContext}`
                }
            ]
        });

        const slidesGPTPrompt = promptResponse.choices[0].message.content;
        console.log('[generatePresentation] Generated Prompt:', slidesGPTPrompt);

        // 4. Call SlidesGPT API
        const SLIDESGPT_API_KEY = process.env.SLIDESGPT_API_KEY;
        if (!SLIDESGPT_API_KEY) {
            throw new Error('SLIDESGPT_API_KEY is not set');
        }

        const slidesResponse = await fetch('https://api.slidesgpt.com/v1/presentations/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SLIDESGPT_API_KEY}`
            },
            body: JSON.stringify({
                prompt: slidesGPTPrompt,
                // You can add more options here if the API supports them, e.g., theme, slide_count
            })
        });

        if (!slidesResponse.ok) {
            const errorText = await slidesResponse.text();
            throw new Error(`SlidesGPT API Error: ${slidesResponse.status} ${errorText}`);
        }

        const slidesData = await slidesResponse.json();
        // Assuming the API returns { url: "...", ... } or similar. 
        // Based on research: it might return an ID and we need to poll, OR it returns the link directly.
        // Research said: "The API responds with an id for the generated presentation, along with embed and download URLs."
        // Let's assume the response structure based on standard async APIs or the research snippet.
        // If it returns download_url or url immediately:

        const presentationUrl = slidesData.download || slidesData.download_url || slidesData.url || slidesData.link;
        const presentationEmbedUrl = slidesData.embed || slidesData.embed_url;

        if (!presentationUrl) {
            console.error('SlidesGPT Response:', slidesData);
            throw new Error('Failed to get presentation URL from SlidesGPT response');
        }

        // 5. Save URL and update status
        await supabase
            .from('materials')
            .update({
                presentation_status: 'completed',
                presentation_url: presentationUrl,
                presentation_embed_url: presentationEmbedUrl
            })
            .eq('id', materialId);

        revalidatePath(`/dashboard/materials/${materialId}`);
        return { success: true, url: presentationUrl };

    } catch (error) {
        console.error('[generatePresentation] Error:', error);

        await supabase
            .from('materials')
            .update({ presentation_status: 'failed' })
            .eq('id', materialId);

        throw error;
    }
}

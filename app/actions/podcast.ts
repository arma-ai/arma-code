'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePodcastScript(materialId: string) {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get material
    const { data: material } = await supabase
        .from('materials')
        .select('full_text, title')
        .eq('id', materialId)
        .single();

    if (!material || !material.full_text) {
        throw new Error('Material not found or has no text');
    }

    // Generate script using GPT
    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: `You are an expert podcast producer. Create an engaging, natural-sounding podcast dialogue script between two hosts (Host A and Host B) based on the provided educational material.
        
        Guidelines:
        - Host A: Knowledgeable, structured, leads the conversation.
        - Host B: Curious, asks clarifying questions, adds analogies, makes it relatable.
        - Tone: Conversational, educational, enthusiastic, but professional.
        - Structure: Intro, key concepts discussion, practical examples, summary/outro.
        - Format: Return ONLY the dialogue in a JSON format: { "script": [ { "speaker": "Host A", "text": "..." }, { "speaker": "Host B", "text": "..." } ] }.
        - Language: The script MUST be in the same language as the source text.
        - Length: Approximately 5-10 minutes of reading time (about 1000-1500 words).`
            },
            {
                role: 'user',
                content: `Material Title: ${material.title}\n\nContent:\n${material.full_text.substring(0, 50000)}`
            }
        ],
        response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Failed to generate script');

    const parsed = JSON.parse(content);
    const script = parsed.script;

    // Save to DB
    const { error } = await supabase
        .from('materials')
        .update({ podcast_script: JSON.stringify(script) })
        .eq('id', materialId);

    if (error) throw new Error(`Failed to save script: ${error.message}`);

    revalidatePath(`/dashboard/materials/${materialId}`);
    return { success: true };
}

export async function generatePodcastAudio(materialId: string) {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // Get material script
    const { data: material } = await supabase
        .from('materials')
        .select('podcast_script')
        .eq('id', materialId)
        .single();

    if (!material || !material.podcast_script) {
        throw new Error('Podcast script not found');
    }

    const script = JSON.parse(material.podcast_script);

    // ElevenLabs Config
    const API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!API_KEY) throw new Error('ELEVENLABS_API_KEY is not set');

    // Default Voices (can be configured)
    const VOICE_A_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel (Female)
    const VOICE_B_ID = 'AZnzlk1XvdvUeBnXmlld'; // Domi (Male)

    // We will generate audio for each segment and stitch them? 
    // Or just return the list of audio URLs?
    // For simplicity and speed, let's try to generate one single audio file if possible, 
    // but ElevenLabs doesn't support multi-speaker in one go easily without their specific "Projects" API which is complex.
    // A simpler approach for MVP: Generate audio for each paragraph and stitch them using ffmpeg?
    // We don't have ffmpeg in this environment easily.
    // Alternative: Generate audio for each segment, upload them, and let the frontend play them sequentially.
    // OR: Concatenate buffers in memory and upload one file. (MP3 concatenation is tricky but possible).

    // Let's try to concatenate buffers.
    const audioBuffers: Buffer[] = [];

    for (const [index, line] of script.entries()) {
        const voiceId = line.speaker === 'Host A' ? VOICE_A_ID : VOICE_B_ID;

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': API_KEY,
                },
                body: JSON.stringify({
                    text: line.text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                    },
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`ElevenLabs API error: ${response.status} ${response.statusText}`, errorBody);
                throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            audioBuffers.push(Buffer.from(arrayBuffer));
        } catch (e) {
            console.error('Error generating audio segment:', e);
            // If this is the first error, rethrow it so the user sees it
            if (audioBuffers.length === 0 && index === 0) {
                throw e;
            }
        }
    }

    if (audioBuffers.length === 0) {
        throw new Error('Failed to generate any audio');
    }

    // Concatenate buffers (simple concatenation works for some MP3s but not always perfect, but often okay for MVP)
    const finalBuffer = Buffer.concat(audioBuffers);

    // Upload to Supabase Storage
    // Must use user.id folder to satisfy RLS policy
    const fileName = `${user.id}/podcasts/${materialId}_${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(fileName, finalBuffer, {
            contentType: 'audio/mpeg',
            upsert: true
        });

    if (uploadError) throw new Error(`Failed to upload audio: ${uploadError.message}`);

    // Save file path to DB (we will generate signed URL on fetch)
    const { error: dbError } = await supabase
        .from('materials')
        .update({ podcast_audio_url: fileName })
        .eq('id', materialId);

    if (dbError) throw new Error(`Failed to save audio URL: ${dbError.message}`);

    revalidatePath(`/dashboard/materials/${materialId}`);
    return { success: true, audioUrl: fileName };
}

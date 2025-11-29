import { NextResponse } from 'next/server';
import { createYouTubeMaterial } from '@/app/actions/materials';

export async function GET() {
    try {
        console.log('Testing createYouTubeMaterial...');
        const result = await createYouTubeMaterial(
            'https://www.youtube.com/watch?v=jNQXAC9IVRw', // First YouTube video (Me at the zoo)
            'Test Video ' + Date.now()
        );
        console.log('Result:', result);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

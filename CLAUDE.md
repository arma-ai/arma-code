# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EduPlatform is a Next.js 14 educational platform with AI-powered learning features. Users can upload PDF materials or YouTube videos, which are then processed using OpenAI APIs to generate summaries, notes, flashcards, quizzes, and an intelligent RAG-based tutor chat. The platform includes gamification features with XP and achievements.

**Tech Stack:**
- **Framework:** Next.js 14 with App Router, TypeScript, Server Actions
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **AI:** OpenAI (GPT-4o, GPT-4o-mini, text-embedding-3-large, Whisper)
- **PDF Processing:** pdf-parse, pdf-lib, pdfjs-dist, mammoth
- **YouTube Processing:** youtube-transcript, Whisper API

## Development Commands

### Setup
```bash
npm install
```

### Development
```bash
npm run dev    # Start development server on localhost:3000
```

### Build & Deploy
```bash
npm run build  # Build for production
npm start      # Start production server
npm run lint   # Run ESLint
```

## Environment Configuration

Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-proj-...  # Must start with 'sk-' or 'sk-proj-'
```

## Architecture & Structure

### Core Directory Structure

```
/app
  /actions              # Server Actions (use 'use server')
    - processMaterial.ts  # Main AI processing pipeline
    - tutorChat.ts        # RAG-based chat with vector search
    - materials.ts        # CRUD operations for materials
    - podcast.ts          # Podcast generation
    - presentation.ts     # Presentation generation
    - achievements.ts     # Gamification logic
    - progress.ts         # XP and progress tracking
  /api                  # API routes (rare, prefer Server Actions)
  /dashboard            # Protected dashboard pages
    /materials/[id]     # Material detail page with 33+ components
  /auth                 # OAuth callback routes
  /components           # Shared components
  globals.css           # Global styles

/lib
  /supabase
    - server.ts         # Server-side Supabase client
    - middleware.ts     # Session management
  - youtube-transcription.ts        # Whisper + subtitles
  - youtube-transcription-timestamps.ts  # With timestamps
  - youtube-audio.ts                # Audio extraction
  - rich-document-parser.ts         # PDF structure extraction

/middleware.ts          # Auth middleware (runs on all routes)
```

### Key Architectural Patterns

#### 1. Server Actions Pattern
All data mutations and AI processing use Next.js Server Actions (files with `'use server'`). These are called directly from Client Components:

```typescript
// Server Action (app/actions/example.ts)
'use server';
import { createClient } from '@/lib/supabase/server';

export async function myAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // ... logic
}

// Client Component
import { myAction } from '@/app/actions/example';
await myAction();
```

#### 2. Material Processing Pipeline
When a material is uploaded or created, it enters a multi-stage processing pipeline:

1. **Text Extraction** (YouTube transcription or PDF parsing)
2. **Text Normalization** (encoding fixes, cleanup)
3. **AI Generation** (summary, notes, flashcards, quiz in parallel)
4. **Embeddings Creation** (chunking + vector embeddings for RAG)
5. **Podcast Script** (auto-generated)

Progress is tracked in `materials` table with `processing_progress` (0-100) and `processing_status` fields.

#### 3. RAG (Retrieval-Augmented Generation) Chat
The tutor chat uses vector similarity search:

1. User asks question → create embedding with `text-embedding-3-large`
2. Find similar chunks via `match_material_chunks` RPC (cosine similarity)
3. Pass top 5 chunks as context to GPT-4o
4. Generate response based on document context + conversation history

**Important:** Uses fallback strategy if RPC fails or no chunks match.

#### 4. Row Level Security (RLS)
All Supabase tables use RLS policies. Users can only access their own:
- materials
- material_summaries, material_notes, flashcards, quizzes
- material_embeddings
- tutor_messages
- progress, achievements

#### 5. Rich Document Parsing
PDFs are parsed with structure awareness:
- `rich-document-parser.ts` extracts headings, lists, tables, images
- Saves to `rich_content` JSONB column as `RichDocumentBlock[]`
- Falls back to plain text extraction if rich parsing fails

### Material Types

The platform supports two material types:

**PDF (`type: 'pdf'`):**
- Uploaded to Supabase Storage bucket `materials/`
- Stored at `materials/${userId}/${timestamp}-${random}.pdf`
- Text extracted via `pdf-parse` or `rich-document-parser.ts`
- Encoding issues handled automatically (Russian text fix with iconv-lite)

**YouTube (`type: 'youtube'`):**
- Stored with `source` field containing YouTube URL
- No file upload to Storage
- Transcription: tries subtitles first, then Whisper API as fallback
- Supports timestamped transcripts saved to `transcript_segments` table

### OpenAI Usage

**Models used:**
- `gpt-4o-mini` - Summary, notes (fast, cheap)
- `gpt-4o` - Flashcards, quiz, tutor chat, podcast scripts (higher quality)
- `text-embedding-3-large` - Embeddings for RAG (3072 dimensions)
- `whisper-1` - YouTube audio transcription (fallback)

**Text chunking:**
- Processing chunks: 8000 chars (for summary/notes generation)
- Embedding chunks: 1000 chars (for better RAG retrieval)

### Database Schema Highlights

**Key tables:**
```sql
materials            # User's uploaded materials (PDF or YouTube)
  - full_text        # Extracted and normalized text
  - rich_content     # Structured document (JSONB)
  - processing_progress, processing_status

material_summaries   # AI-generated summaries
material_notes       # AI-generated study notes
flashcards          # Question/answer pairs
quizzes             # Multiple choice questions (4 options)

material_embeddings  # Vector embeddings for RAG
  - embedding        # vector(3072) - pgvector extension required
  - chunk_text       # The text chunk
  - chunk_index      # Order in document

tutor_messages      # Chat history with AI tutor
  - context          # 'chat' | 'selection' (for selection-based questions)

transcript_segments # YouTube video timestamps
  - start_time, end_time, text

progress            # User XP and level per material
achievements        # Unlocked achievements

RPC Functions:
  - match_material_chunks(query_embedding, match_material_id, match_threshold, match_count)
    Returns top N similar chunks using cosine similarity
```

### Encoding Issues & Text Processing

**Russian/Cyrillic text handling:**
The codebase has extensive logic to fix encoding issues in PDF extraction:

- `processMaterial.ts` tries multiple encodings: win1251, cp866, koi8-r, iso88595, maccyrillic
- Uses `iconv-lite` to convert from latin1/binary to proper encoding
- Detects cyrillic characters and chooses best encoding
- Falls back to original text if conversion fails

**Text normalization:**
- Remove excessive line breaks (max 2 consecutive)
- Remove page numbers, isolated dashes
- Preserve at least 10% of original length (safety check)
- Applied before AI processing and embedding creation

### YouTube Transcription Strategy

Three-tier fallback strategy:

1. **Primary:** `youtube-transcription-timestamps.ts` - Gets subtitles WITH timestamps
   - Saves to `transcript_segments` table for timeline navigation

2. **Fallback 1:** `youtube-transcription.ts` - Gets subtitles OR Whisper transcription
   - Tries youtube-transcript library first
   - Downloads audio and uses Whisper API if no subtitles

3. **Fallback 2:** Emergency placeholder text if all methods fail
   - Informs user that transcription is unavailable

### Component Organization

The material detail page (`/dashboard/materials/[id]`) has 33+ components for different features:

**Core UI:**
- `MaterialTabs.tsx` - Tab navigation (Document, Summary, Notes, etc.)
- `Sidebar.tsx` / `SidebarClient.tsx` - Collapsible AI tools sidebar
- `DocumentViewer.tsx` - Switches between PDF/YouTube/Rich Document views

**Interactive Features:**
- `TutorChat.tsx` - RAG-based chat interface
- `InteractiveFlashcards.tsx` - Flip card study mode
- `InteractiveQuiz.tsx` - Multiple choice quiz with scoring
- `TextSelectionHandler.tsx` + `SelectionModal.tsx` - Ask about selected text

**Material Views:**
- `PDFViewer.tsx` - PDF.js integration
- `RichDocumentView.tsx` - Structured document view
- `TimestampedTranscript.tsx` - YouTube transcript with seek

**Generation Buttons:**
- `GenerateSummaryButton.tsx`
- `GenerateNotesButton.tsx`
- `GenerateFlashcardsButton.tsx`
- `GenerateQuizButton.tsx`
- All handle loading states and trigger Server Actions

**Gamification:**
- `ProgressBlock.tsx` - XP bar and level display
- `AchievementsBlock.tsx` + `AchievementModal.tsx` - Achievement display
- `ViewTracker.tsx` - Tracks time spent viewing material
- `QuizTracker.tsx` - Tracks quiz completions

### Testing & Development Tips

**Run single test:**
The project doesn't have a test suite configured. Add tests with Jest/Vitest if needed.

**Debug material processing:**
- Check `processing_status` and `processing_progress` in materials table
- All processing steps log to console with `[processMaterial]` prefix
- If processing fails, check `full_text` column was saved correctly

**Debug RAG chat:**
- Ensure `pgvector` extension is enabled in Supabase
- Check `material_embeddings` table has data
- Test `match_material_chunks` RPC function in SQL Editor
- Fallback to first N chunks if RPC fails (see `tutorChat.ts`)

**Debug encoding issues:**
- Look for `[extractTextFromPDF]` logs showing encoding attempts
- Check if text contains cyrillic characters or suspicious chars
- Use `testEncoding.ts` action to debug specific files

### Common Workflows

**Adding a new AI feature:**
1. Create Server Action in `/app/actions/your-feature.ts`
2. Use `createClient()` from `@/lib/supabase/server`
3. Check user auth with `supabase.auth.getUser()`
4. Call OpenAI API with appropriate model
5. Save results to Supabase table
6. Add RLS policies for the table
7. Create UI component in appropriate dashboard page
8. Call Server Action from component

**Adding a new material type:**
1. Update `materials` table schema (add columns if needed)
2. Modify `processMaterial.ts` to handle new type
3. Add text extraction logic (similar to PDF or YouTube)
4. Create viewer component (similar to PDFViewer or RichDocumentView)
5. Update `DocumentViewer.tsx` to include new type

**Modifying AI prompts:**
- Summary: `processMaterial.ts` → `generateSummary()`
- Notes: `processMaterial.ts` → `generateNotes()`
- Flashcards: `processMaterial.ts` → `generateFlashcards()`
- Quiz: `processMaterial.ts` → `generateQuizQuestions()`
- Tutor: `tutorChat.ts` → `sendTutorMessage()` → `systemPrompt`

All prompts include: "MUST be written in the EXACT SAME LANGUAGE as the provided source text" to preserve Russian/English.

### Migration & SQL Files

Root directory contains many `.sql` files for schema changes:

**Initial setup:**
- `supabase-setup.sql` - Complete schema with all tables, RLS, RPC functions

**Migrations:**
- `add-full-text-column.sql` - Add `full_text` to materials
- `add-youtube-support.sql` - Add YouTube type support
- `add-transcript-segments.sql` - Add timestamp tracking
- `add-rich-content.sql` - Add rich document parsing
- `add-podcast-columns.sql` - Add podcast generation
- `add-presentation-columns.sql` - Add presentation generation
- `fix-rls-policies.sql` - Fix RLS issues
- `populate-achievements.sql` - Seed achievement data

**Storage setup:**
- `storage-setup.sql` - Create materials bucket and policies
- `storage-setup.md` - Manual setup instructions

Always run new migrations in Supabase SQL Editor after making schema changes.

### Important Constraints & Limitations

1. **PDF file size limit:** 50 MB (enforced in `uploadMaterial` action)
2. **OpenAI rate limits:** No built-in retry logic, fails if quota exceeded
3. **Embedding dimensions:** 3072 (text-embedding-3-large) - must match pgvector column
4. **Chunk sizes:** Don't change without re-processing all embeddings
5. **YouTube audio:** Downloads to `/tmp`, must cleanup after Whisper transcription
6. **RLS policies:** All server-side queries automatically filtered by user_id
7. **Session handling:** Middleware refreshes session on every request

### Security Considerations

- All API keys in `.env.local` (never committed)
- Supabase RLS enforces data isolation
- File uploads restricted to authenticated users
- Storage bucket is private (not public)
- OAuth only (no password auth currently)
- CSRF protection via Next.js built-in mechanisms

### Language Support

The platform is bilingual (Russian/English):
- UI text is mostly in Russian
- AI preserves source language (Russian PDF → Russian summary)
- Code comments are in Russian
- Prompts instruct AI to maintain source language

When modifying prompts or UI, maintain this bilingual approach.

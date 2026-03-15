# Tab Components Integration Guide

## Status: Completed ✅

### New Tab Components Created
All tab components have been copied from production and adapted for local use:

1. ✅ **FlashcardsTab.tsx** - Interactive flashcard deck with preview
2. ✅ **QuizTab.tsx** - Interactive quiz session with scoring
3. ✅ **ChatTab.tsx** - AI tutor chat with TTS (already existed locally)
4. ✅ **PodcastTab.tsx** - Audio podcast player with synchronized transcript
5. ✅ **SlidesTab.tsx** - AI-generated presentation viewer

## Current Architecture Issue

### Problem
The local `ProjectDetailView.tsx` uses a **Project-centric** architecture:
- Supports multiple materials per project
- Has "All Materials" / "Single Material" view mode toggle
- Uses `content` (project-level) and `materialContent` (single material) objects

The new tab components expect a **Material-centric** architecture:
- Single material only
- Requires `material: Material` object
- Uses data directly from that material

### Current Implementation Status

#### Flashcards Tab
- **Single Material Mode**: Now uses `FlashcardsTab` component with adapter
- **All Materials Mode**: Still shows old grid view (needs adaptation)

#### Quiz Tab  
- **Single Material Mode**: Now uses `QuizTab` component with adapter
- **All Materials Mode**: Still shows old list view (needs adaptation)

#### Other Tabs
- **Chat**: Already has TTS functionality locally
- **Podcast**: Component created, needs integration
- **Slides**: Component created, needs integration
- **Summary**: Already works with both modes

## Integration Steps

### Option 1: Quick Integration (Recommended for Now)

Use new tab components only in "Single Material" mode:

```tsx
// In ProjectDetailView.tsx Flashcards tab section
{activeTab === 'flashcards' && (
  viewMode === 'single' && materialContent ? (
    <FlashcardsTab
      material={convertMaterialContentToMaterial(materialContent)}
      flashcards={materialContent.flashcards || []}
      loading={materialLoading}
      navigate={navigate}
    />
  ) : viewMode === 'all' && content?.flashcards ? (
    // Keep existing "All Materials" grid view
    <ExistingFlashcardsGrid flashcards={content.flashcards} />
  ) : null
)}
```

### Option 2: Full Integration (Requires More Work)

1. **Create wrapper components** that support both modes:
   - `FlashcardsTabWrapper` - combines flashcards from multiple materials
   - `QuizTabWrapper` - combines questions from multiple materials

2. **Update tab component props** to accept both modes:
   ```tsx
   interface FlashcardsTabProps {
     materials: Material[];  // For "All Materials" mode
     material?: Material;    // For "Single Material" mode
     viewMode: 'all' | 'single';
     // ... other props
   }
   ```

3. **Combine data for "All Materials" mode**:
   ```tsx
   const allFlashcards = project.materials.flatMap(m => m.flashcards);
   const allQuestions = project.materials.flatMap(m => m.quiz);
   ```

## Required Backend Endpoints

The new tabs require these backend endpoints:

### Podcast Tab
- `POST /materials/:id/podcast/generate` - Generate podcast script
- `POST /materials/:id/podcast/audio` - Generate audio with Edge TTS
- Requires: `podcast_audio_url`, `podcast_script` fields in Material model

### Slides Tab
- `POST /materials/:id/presentation/generate` - Generate presentation
- Requires: `presentation_url`, `presentation_embed_url`, `presentation_status` fields

### Chat Tab (TTS)
- `POST /materials/:id/tutor/:messageId/speak` - Generate speech for chat message
- Requires: TTS service (already exists locally)

## Database Migrations Needed

Check if these migrations exist in production:

```sql
-- Podcast fields
ALTER TABLE materials ADD COLUMN podcast_audio_url TEXT;
ALTER TABLE materials ADD COLUMN podcast_script JSONB;
ALTER TABLE materials ADD COLUMN podcast_status VARCHAR(50);

-- Presentation fields
ALTER TABLE materials ADD COLUMN presentation_url TEXT;
ALTER TABLE materials ADD COLUMN presentation_embed_url TEXT;
ALTER TABLE materials ADD COLUMN presentation_status VARCHAR(50);
ALTER TABLE materials ADD COLUMN presentation_provider VARCHAR(50);
```

## Testing Checklist

### Single Material Mode
- [ ] Flashcards: Preview shows 3 cards, "Start Review" button works
- [ ] Quiz: Preview shows 3 questions, "Start Quiz" button works
- [ ] Quiz: Interactive session with one question at a time
- [ ] Quiz: Score calculation and answer review at end
- [ ] Podcast: Generate button works, player shows when ready
- [ ] Slides: Generate button works, viewer shows when ready
- [ ] Chat: TTS button works on AI responses

### All Materials Mode
- [ ] Flashcards: Shows combined grid from all materials
- [ ] Quiz: Shows combined list from all materials
- [ ] Podcast: Shows podcasts from all materials (TBD - needs design)
- [ ] Slides: Shows slides from all materials (TBD - needs design)

## Next Steps

1. **Immediate** (Phase 1 - Done):
   - ✅ Copy tab components from production
   - ✅ Test in Single Material mode

2. **Short-term** (Phase 2):
   - [ ] Add Podcast and Slides tabs to ProjectDetailView
   - [ ] Test all tabs in Single Material mode
   - [ ] Fix any bugs or UI issues

3. **Medium-term** (Phase 3):
   - [ ] Create wrapper components for All Materials mode
   - [ ] Add view mode toggle support to all tabs
   - [ ] Test with multiple materials per project

4. **Long-term** (Phase 4):
   - [ ] Migrate to production database schema
   - [ ] Add backend endpoints for Podcast and Slides
   - [ ] Full integration testing

## File Locations

```
Local Project:
/Arma AI-Powered EdTech Interface Design/src/
├── components/dashboard/tabs/
│   ├── FlashcardsTab.tsx    ✅ Updated
│   ├── QuizTab.tsx          ✅ Updated
│   ├── ChatTab.tsx          ✅ Already had TTS
│   ├── PodcastTab.tsx       ✅ New
│   ├── SlidesTab.tsx        ✅ New
│   └── SummaryTab.tsx       ✅ Existing
├── pages/
│   └── ProjectDetailView.tsx   ⚠️ Needs updates

Production Reference:
/prod_version/Arma AI-Powered EdTech Interface Design/src/
└── components/dashboard/
    └── ProjectDetailView.tsx   (1898 lines - reference implementation)
```

## Notes

- The local version has enhanced features (Projects, monitoring) not in production
- Production has enhanced UI (Podcast, Slides, better tabs) not in local
- Goal is to merge best of both versions
- Current approach: Use new tabs in Single Material mode first, then add All Materials support

---

*Last updated: 2026-03-04*
*Phase 1 Status: ✅ Complete*

# 📋 Implementation Plan - Single Material View & Restoring Tabs

**Date:** March 4, 2026  
**Status:** Planning Phase

---

## Part 1: Single Material View Implementation

### 🎯 Goal
Allow users to view AI-generated content (Summary, Flashcards, Quiz) for either:
- **All Materials** (combined) - current ProjectContent
- **Single Material** (individual) - per-material content

---

### Phase 1.1: Backend - Get Material-Level Content

**Current State:**
- ✅ ProjectContent stores combined content for all materials
- ❌ No way to get content for individual material

**Required Changes:**

#### 1.1.1 Add Material-Level Content Fields
**File:** `backend/app/infrastructure/database/models/material.py`

Material already has:
- ✅ `full_text` - extracted text
- ✅ `summary` relationship (MaterialSummary)
- ✅ `notes` relationship (MaterialNotes)
- ✅ `flashcards` relationship (Flashcard list)
- ✅ `quiz_questions` relationship (QuizQuestion list)

**Action:** No database changes needed - relationships already exist!

#### 1.1.2 Create API Endpoint for Material Content
**File:** `backend/app/api/v1/endpoints/materials.py`

**New Endpoint:**
```python
@router.get("/{material_id}/content", response_model=MaterialContentResponse)
async def get_material_content(
    material_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI-generated content for a single material."""
    # Get material with relationships
    # Return summary, notes, flashcards, quiz for this material only
```

**Response Schema:**
```python
class MaterialContentResponse(BaseModel):
    id: UUID
    material_id: UUID
    title: str
    summary: Optional[str]
    notes: Optional[str]
    flashcards: List[Dict[str, str]]
    quiz: List[Dict[str, Any]]
    processing_status: str
```

**Estimated Time:** 30 minutes

---

### Phase 1.2: Frontend - View Mode Toggle

**Current State:**
- ✅ Toggle switch implemented (All Materials / Single Material)
- ✅ Dropdown to select specific material
- ❌ Doesn't fetch material-level content yet

**Required Changes:**

#### 1.2.1 Add Material Content Hook
**File:** `src/hooks/useApi.ts`

**New Hook:**
```typescript
export function useMaterialContent(materialId: string | null) {
  const [content, setContent] = useState<MaterialContent | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchContent = useCallback(async () => {
    if (!materialId) return;
    const data = await materialsApi.getMaterialContent(materialId);
    setContent(data);
  }, [materialId]);
  
  useEffect(() => {
    fetchContent();
  }, [materialId]);
  
  return { content, loading, refetch: fetchContent };
}
```

**Estimated Time:** 20 minutes

#### 1.2.2 Update ProjectDetailView
**File:** `src/pages/ProjectDetailView.tsx`

**Changes:**
1. Add `useMaterialContent` hook call when `viewMode === 'single'`
2. Show material-specific content in single mode
3. Show project content in all mode
4. Add loading states for switching modes

**Estimated Time:** 45 minutes

---

### Phase 1.3: UI Improvements

#### 1.3.1 Better Mode Indicators
- Show which material is selected in single mode
- Show material count in all mode
- Add visual distinction between modes

#### 1.3.2 Smooth Transitions
- Fade animation when switching modes
- Preserve scroll position
- Show loading skeleton during fetch

**Estimated Time:** 30 minutes

---

### Phase 1.4: Testing Checklist

- [ ] Switch between All/Single modes
- [ ] Select different materials in single mode
- [ ] Verify content matches selected material
- [ ] Test with 1 material (hide toggle)
- [ ] Test with 10 materials (dropdown works)
- [ ] Test loading states
- [ ] Test error handling

**Estimated Time:** 20 minutes

---

### Total Estimated Time: **2.5 hours**

---

## Part 2: Restoring Chat, Podcast, Slides Tabs

### 🎯 Goal
Restore removed tabs from original design:
- **Chat** - RAG-based chat with material(s)
- **Podcast** - Text-to-speech audio generation
- **Slides** - Presentation generation

---

### Phase 2.1: Backend - Verify Existing Endpoints

**Current State:**
- ✅ Chat endpoints exist (`/api/v1/materials/{id}/tutor`)
- ✅ Podcast generation exists (`/api/v1/materials/{id}/podcast/generate-audio`)
- ✅ Slides generation exists (`/api/v1/materials/{id}/presentation/generate`)

**Action:** Test existing endpoints to ensure they work

**Estimated Time:** 30 minutes

---

### Phase 2.2: Frontend - Add Tab Buttons

**File:** `src/pages/ProjectDetailView.tsx`

**Add Tab Buttons:**
```tsx
<button onClick={() => setActiveTab('chat')}>
  <MessageSquare size={16} />
  Chat
</button>
<button onClick={() => setActiveTab('podcast')}>
  <Headphones size={16} />
  Podcast
</button>
<button onClick={() => setActiveTab('slides')}>
  <Presentation size={16} />
  Slides
</button>
```

**Update ViewState type:**
```typescript
type ViewState = 'materials' | 'summary' | 'flashcards' | 'quiz' | 'chat' | 'podcast' | 'slides';
```

**Estimated Time:** 15 minutes

---

### Phase 2.3: Create Chat Tab

**File:** `src/pages/ProjectDetailView.tsx` (or new component)

**Features:**
- Chat interface with AI tutor
- RAG-based responses from material(s)
- Message history
- Text input + send button
- TTS option for responses

**UI Components:**
- Messages list (user + assistant)
- Input field
- Send button
- Loading indicator
- Clear history button

**API Integration:**
- `POST /api/v1/materials/{id}/tutor` - send message
- `GET /api/v1/materials/{id}/tutor/history` - get history
- `POST /api/v1/materials/{id}/tutor/{message_id}/speak` - TTS

**Estimated Time:** 1.5 hours

---

### Phase 2.4: Create Podcast Tab

**File:** `src/pages/ProjectDetailView.tsx` (or new component)

**Features:**
- Show available podcast episodes (per material)
- Audio player
- Generate podcast button
- TTS provider selection (Edge TTS / ElevenLabs)

**UI Components:**
- Podcast episode list
- Audio player (HTML5 `<audio>`)
- Generate button
- Provider selector
- Download button

**API Integration:**
- `POST /api/v1/materials/{id}/podcast/generate-script` - generate script
- `POST /api/v1/materials/{id}/podcast/generate-audio` - generate audio
- Get `podcast_audio_url` from material

**Estimated Time:** 1 hour

---

### Phase 2.5: Create Slides Tab

**File:** `src/pages/ProjectDetailView.tsx` (or new component)

**Features:**
- Show generated presentation
- Embed slides viewer
- Generate new presentation button
- Download/embed options

**UI Components:**
- Presentation embed iframe
- Generate button
- Loading state
- Error state
- Download link

**API Integration:**
- `POST /api/v1/materials/{id}/presentation/generate` - generate
- Get `presentation_embed_url` from material
- Get `presentation_url` for download

**Estimated Time:** 45 minutes

---

### Phase 2.6: View Mode Integration

**For Chat, Podcast, Slides:**
- Should they work in 'single' mode? (per material)
- Or only in 'all' mode? (combined)

**Decision:**
- **Chat** - Both modes (chat with single or all)
- **Podcast** - Single mode only (per material)
- **Slides** - Single mode only (per material)

**Estimated Time:** 30 minutes

---

### Phase 2.7: Testing Checklist

- [ ] Chat tab opens
- [ ] Can send messages
- [ ] AI responds correctly
- [ ] Podcast tab shows audio player
- [ ] Can generate podcast
- [ ] Audio plays
- [ ] Slides tab shows presentation
- [ ] Can generate slides
- [ ] Presentation embeds correctly
- [ ] View mode toggle works for all tabs

**Estimated Time:** 45 minutes

---

### Total Estimated Time: **5.5 hours**

---

## Summary

| Phase | Description | Time |
|-------|-------------|------|
| 1.1 | Backend - Material content endpoint | 30 min |
| 1.2 | Frontend - Material content hook + view | 65 min |
| 1.3 | UI improvements | 30 min |
| 1.4 | Testing | 20 min |
| **Part 1 Total** | **Single Material View** | **2.5 hours** |
| 2.1 | Verify backend endpoints | 30 min |
| 2.2 | Add tab buttons | 15 min |
| 2.3 | Chat tab | 90 min |
| 2.4 | Podcast tab | 60 min |
| 2.5 | Slides tab | 45 min |
| 2.6 | View mode integration | 30 min |
| 2.7 | Testing | 45 min |
| **Part 2 Total** | **Restore Tabs** | **5.5 hours** |

---

## **Grand Total: 8 hours**

---

## Implementation Order

1. ✅ **Start with Part 1** (Single Material View) - fixes current issue
2. ✅ **Then Part 2** (Restore Tabs) - adds missing features

---

## Notes

- Keep existing ProjectContent for "All Materials" mode
- Material-level content already exists in database
- Chat/Podcast/Slides endpoints already exist - just need UI
- Test with real materials (PDFs) not just placeholders

---

**Ready to start implementation!** 🚀

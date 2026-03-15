# AI Tutor Chat Tab - Implementation Plan

## Current State Analysis (Production Version)

### How It Works on Production

#### 1. Architecture Overview

The production version uses a **material-centric** approach where each material has its own AI tutor chat session.

**Key Components:**
- `ChatTab` - Main chat interface component
- `useTutorChat` hook - Manages chat state and API communication
- `tutorApi` - API client for chat endpoints
- `TutorMessage` type - Message structure

#### 2. Chat Tab UI Structure

```
┌─────────────────────────────────────────┐
│  Chat Messages Area (scrollable)        │
│  ┌─────────────────────────────────┐    │
│  │ 💬 AI Message                   │    │
│  │    Hello! Ask me anything...    │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │              👤 User Message    │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  Quick Suggestions (horizontal scroll)  │
│  [Summarize] [Flashcards] [Quiz] [...]  │
├─────────────────────────────────────────┤
│  Input Field                            │
│  ┌──────────────────────────────┐ [→]  │
│  │ Ask anything about this...   │      │
│  └──────────────────────────────┘      │
└─────────────────────────────────────────┘
```

#### 3. Chat Tab Features (Production)

**Message Display:**
- Avatar icons (Sparkles for AI, "ME" for user)
- Different styling for AI vs user messages
- AI messages: `bg-white/5 text-white/90 rounded-tl-none`
- User messages: `bg-primary/10 text-white rounded-tr-none`
- Right-aligned for user, left-aligned for AI

**Input Area:**
- Quick suggestion chips (horizontal scroll)
  - "Summarize section 2"
  - "Create flashcards"
  - "Explain key terms"
  - "Give me a quiz"
- Text input with send button
- Send button shows loader when sending
- Enter key to send

**Loading States:**
- Initial load: Spinner with "Loading chat..."
- Sending: Loader icon in send button
- Empty state: "Start a conversation" with Sparkles icon

#### 4. Data Flow (Production)

```
User types message
    ↓
Click Send or Press Enter
    ↓
handleSend() called
    ↓
sendMessage(message, context) via useTutorChat hook
    ↓
POST /api/v1/materials/:id/tutor/messages
    ↓
Backend processes with RAG + AI
    ↓
Response with AI message
    ↓
Update messages state
    ↓
Re-render ChatTab
```

#### 5. API Endpoints (Production)

```typescript
// Get chat history
GET /api/v1/materials/:id/tutor/messages

// Send message
POST /api/v1/materials/:id/tutor/messages
{
  "message": "Explain this concept",
  "context": "chat" | "selection"
}

// Clear history
DELETE /api/v1/materials/:id/tutor/messages

// Text-to-Speech (optional feature)
POST /api/v1/materials/:id/tutor/:messageId/speak
```

#### 6. Message Type (Production)

```typescript
interface TutorMessage {
  id: string;
  material_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  // Optional TTS fields
  audio_url?: string;
  audio_status?: 'pending' | 'generating' | 'completed' | 'failed';
}
```

---

## Local Version Current State

### What Exists Now

#### 1. Existing Components

**Local ChatTab** (`src/components/dashboard/tabs/ChatTab.tsx`):
- ✅ Already has TTS (Text-to-Speech) functionality
- ✅ Has suggestion chips
- ✅ Has message display with avatars
- ✅ Has volume icons for TTS
- ⚠️ Not integrated into ProjectDetailView

**Local useTutorChat Hook** (`src/hooks/useApi.ts`):
- ✅ `useTutorChat(materialId)` hook exists
- ✅ Returns: `messages`, `sendMessage`, `sending`, `loading`, `clearHistory`
- ✅ Auto-fetches chat history on mount

**Local API** (`src/services/api.ts`):
```typescript
tutorApi = {
  getHistory: (materialId) => GET /materials/:id/tutor
  sendMessage: (materialId, { message, context }) => POST /materials/:id/tutor
  clearHistory: (materialId) => DELETE /materials/:id/tutor
  tutorSpeak: (materialId, messageId) => POST /materials/:id/tutor/:messageId/speak
}
```

#### 2. What's Missing

**ProjectDetailView Integration:**
- ❌ No Chat tab button in tab navigation
- ❌ No ChatTab rendering logic
- ❌ No useTutorChat hook usage in ProjectDetailView
- ❌ Current tabs: `materials`, `summary`, `flashcards`, `quiz`
- ❌ Missing: `chat`, `podcast`, `slides`

**Tab Structure:**
- Current local uses view mode toggle (All Materials / Single Material)
- Production uses single material view only
- Need to adapt Chat tab for both modes

---

## Implementation Plan

### Phase 1: Add Chat Tab to ProjectDetailView

#### Step 1.1: Update Tab Navigation

**File:** `src/pages/ProjectDetailView.tsx`

Add Chat tab button to the tab navigation:

```tsx
const [activeTab, setActiveTab] = useState<'chat' | 'materials' | 'summary' | 'flashcards' | 'quiz'>('materials');

// In the tab bar:
<button
  onClick={() => setActiveTab('chat')}
  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
    activeTab === 'chat'
      ? 'border-primary text-primary'
      : 'border-transparent text-white/40 hover:text-white/60'
  }`}
>
  <div className="flex items-center gap-2">
    <MessageSquare size={16} />
    Chat
  </div>
</button>
```

#### Step 1.2: Import Required Dependencies

```tsx
import { MessageSquare } from 'lucide-react';
import { useTutorChat } from '../hooks/useApi';
import { ChatTab } from '../components/dashboard/tabs/ChatTab';
```

#### Step 1.3: Add Chat Hook for Single Material Mode

```tsx
const { 
  messages: tutorMessages, 
  sendMessage, 
  sending, 
  loading: chatLoading 
} = useTutorChat(selectedMaterialId);
```

#### Step 1.4: Add Chat Tab Content Rendering

```tsx
{/* Chat Tab */}
{activeTab === 'chat' && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="h-full"
  >
    {viewMode === 'single' && selectedMaterialId ? (
      <ChatTab
        material={project?.materials.find(m => m.id === selectedMaterialId) as any}
        messages={tutorMessages}
        sendMessage={sendMessage}
        sending={sending}
        loading={chatLoading}
      />
    ) : viewMode === 'all' ? (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Chat Available for Single Material
          </h3>
          <p className="text-white/40">
            Switch to "Single Material" mode to chat with AI tutor about a specific material
          </p>
        </div>
      </div>
    ) : null}
  </motion.div>
)}
```

---

### Phase 2: Fix ChatTab Component

#### Step 2.1: Update ChatTab Props Interface

**File:** `src/components/dashboard/tabs/ChatTab.tsx`

```tsx
export interface ChatTabProps {
  material: Material;
  messages: TutorMessage[];
  sendMessage: (message: string, context?: 'chat' | 'selection') => Promise<any>;
  sending: boolean;
  loading: boolean;
  viewMode?: 'all' | 'single'; // Add this prop
}
```

#### Step 2.2: Add TTS Functionality (Already Exists)

The local ChatTab already has TTS. Make sure it's working:

```tsx
const [speakingId, setSpeakingId] = useState<string | null>(null);
const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

const handleSpeak = async (msg: TutorMessage) => {
  if (!msg.id || speakingId) return;
  try {
    setSpeakingId(msg.id);
    const response = await materialsApi.tutorSpeak(material.id, msg.id);
    const audioUrl = response.audio_url.startsWith('http')
      ? response.audio_url
      : `http://localhost:8000${response.audio_url}`;
    const audio = new Audio(audioUrl);
    audio.addEventListener('ended', () => {
      setSpeakingId(null);
      setAudioElement(null);
    });
    setAudioElement(audio);
    await audio.play();
  } catch (err: any) {
    toast.error(err.response?.data?.detail || 'Failed to generate speech');
    setSpeakingId(null);
  }
};
```

#### Step 2.3: Add Message Display with TTS Button

```tsx
{messages.map((msg, i) => (
  <div 
    key={msg.id || i} 
    className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
  >
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
      msg.role === 'assistant' 
        ? 'bg-primary/10 border-primary/20 text-primary' 
        : 'bg-white/10 border-white/20 text-white'
    }`}>
      {msg.role === 'assistant' ? <Sparkles size={14} /> : <div className="text-xs font-bold">ME</div>}
    </div>
    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
      msg.role === 'assistant' 
        ? 'bg-white/5 text-white/90 rounded-tl-none' 
        : 'bg-primary/10 text-white rounded-tr-none'
    }`}>
      <div className="flex items-start gap-3">
        <span className="flex-1">{msg.content}</span>
        {msg.role === 'assistant' && msg.id && (
          <button
            onClick={() => speakingId === msg.id ? handleStopSpeaking() : handleSpeak(msg)}
            disabled={!!speakingId}
            className={`shrink-0 p-1.5 rounded-lg transition-colors ${
              speakingId === msg.id
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10'
            }`}
            title={speakingId === msg.id ? 'Stop' : 'Listen'}
          >
            {speakingId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>
    </div>
  </div>
))}
```

---

### Phase 3: Backend Requirements

#### Step 3.1: Required API Endpoints

Make sure these endpoints exist on backend:

```python
# Backend: backend/app/api/v1/endpoints/tutor.py

# Get chat history
@router.get("/materials/{material_id}/tutor")
async def get_chat_history(material_id: str):
    """Get chat history for a material"""
    pass

# Send message
@router.post("/materials/{material_id}/tutor")
async def send_message(material_id: str, request: TutorMessageRequest):
    """Send a message to the AI tutor"""
    pass

# Clear history
@router.delete("/materials/{material_id}/tutor")
async def clear_history(material_id: str):
    """Clear chat history for a material"""
    pass

# Text-to-Speech (optional)
@router.post("/materials/{material_id}/tutor/{message_id}/speak")
async def tutor_speak(material_id: str, message_id: str):
    """Generate speech for a message"""
    pass
```

#### Step 3.2: Database Schema

```python
# Backend: backend/app/infrastructure/database/models/tutor_message.py

class TutorMessage(Base):
    __tablename__ = "tutor_messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    material_id = Column(String, ForeignKey("materials.id"), nullable=False)
    role = Column(String, nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # TTS fields
    audio_url = Column(String, nullable=True)
    audio_status = Column(String, default='pending')
    
    # Relationships
    material = relationship("Material", back_populates="tutor_messages")
```

---

### Phase 4: Testing Checklist

#### Step 4.1: UI Testing

- [ ] Chat tab button appears in navigation
- [ ] Clicking Chat tab shows chat interface
- [ ] Empty state shows when no messages
- [ ] Messages display correctly (AI vs User styling)
- [ ] Quick suggestion chips work
- [ ] Input field accepts text
- [ ] Send button sends message
- [ ] Enter key sends message
- [ ] Loading spinner shows when sending
- [ ] Messages appear after sending

#### Step 4.2: TTS Testing (If Available)

- [ ] Volume icon appears on AI messages
- [ ] Click volume icon plays audio
- [ ] Icon changes to stop icon while playing
- [ ] Click stop icon stops audio
- [ ] Only one audio plays at a time

#### Step 4.3: View Mode Testing

- [ ] Single Material mode: Chat works
- [ ] All Materials mode: Shows "Switch to Single Material" message
- [ ] Switching modes preserves chat history

---

### Phase 5: Known Limitations & Future Improvements

#### Current Limitations

1. **All Materials Mode**: Chat only works in Single Material mode
   - **Reason**: Each material has separate chat history
   - **Workaround**: Show message to switch to Single Material mode

2. **No Cross-Material Context**: AI tutor only knows about one material at a time
   - **Future**: Implement project-level chat with RAG across all materials

3. **No Chat History Persistence**: (Check if backend supports this)
   - **Future**: Ensure chat history is saved to database

#### Future Improvements

1. **Project-Level Chat**: One chat for entire project
2. **Context Selection**: Allow user to select which materials to include in context
3. **Chat Export**: Export chat history as PDF/Markdown
4. **Voice Input**: Speech-to-text for input
5. **Enhanced TTS**: Multiple voices, speed control

---

## File Changes Summary

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/ProjectDetailView.tsx` | Modify | Add Chat tab button and rendering logic |
| `src/components/dashboard/tabs/ChatTab.tsx` | Already exists | Verify TTS functionality |
| `src/hooks/useApi.ts` | Already exists | `useTutorChat` hook exists |
| `src/services/api.ts` | Already exists | `tutorApi` exists |
| `backend/app/api/v1/endpoints/tutor.py` | Verify | Ensure endpoints exist |

### New Imports Required

```tsx
// In ProjectDetailView.tsx
import { MessageSquare } from 'lucide-react';
import { useTutorChat } from '../hooks/useApi';
import { ChatTab } from '../components/dashboard/tabs/ChatTab';
```

---

## Estimated Timeline

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1** | Add Chat tab to ProjectDetailView | 30 min |
| **Phase 2** | Fix ChatTab component & TTS | 30 min |
| **Phase 3** | Verify backend endpoints | 30 min |
| **Phase 4** | Testing & bug fixes | 30 min |
| **Total** | | **~2 hours** |

---

## Success Criteria

- ✅ Chat tab appears in ProjectDetailView navigation
- ✅ Users can send messages to AI tutor
- ✅ Messages display with correct styling
- ✅ Quick suggestion chips work
- ✅ TTS works (if backend endpoint exists)
- ✅ Chat works in Single Material mode
- ✅ Appropriate message in All Materials mode

---

*Last updated: 2026-03-06*
*Author: AI Assistant*

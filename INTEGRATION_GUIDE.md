# Adaptive Learning System — Integration Guide

## ✅ Implementation Complete

All core components for the Adaptive Learning System have been implemented. This guide shows how to integrate them into your existing ProjectDetailView.

---

## 📦 What's Been Created

### Backend (Python/FastAPI)

| File | Purpose |
|------|---------|
| `backend/app/infrastructure/database/models/learning.py` | 4 new DB tables |
| `backend/app/schemas/learning.py` | Pydantic schemas |
| `backend/app/api/v1/endpoints/users.py` | User profile & learning progress API |
| `backend/app/api/v1/endpoints/materials.py` | Updated with reading time & selection endpoints |
| `backend/app/infrastructure/ai/openai_service.py` | Personalized flashcard & quiz generation |
| `backend/alembic/versions/20260324_adaptive_learning.py` | DB migration |

### Frontend (React/TypeScript)

| Component | Purpose |
|-----------|---------|
| `UserProfileSetup.tsx` | 4-step registration profiling |
| `LearningRoadmap.tsx` | Visual 6-stage roadmap |
| `RoadmapProgressSidebar.tsx` | Progress sidebar |
| `SummaryWithTimer.tsx` | Timed reading with early unlock |
| `AIChatSidebar.tsx` | Text selection → AI chat |
| `FlashcardDeck.tsx` | Card flip with mandatory viewing |
| `QuizWithThreshold.tsx` | Quiz with 70% pass/fail |
| `PresentationViewer.tsx` | Slide viewer |
| `PodcastPlayer.tsx` | Audio player |

---

## 🔧 Integration Steps

### Step 1: Update ProjectDetailView

```typescript
// src/pages/ProjectDetailView.tsx

import {
  LearningRoadmap,
  RoadmapProgressSidebar,
  SummaryWithTimer,
  AIChatSidebar,
  FlashcardDeck,
  QuizWithThreshold,
  PresentationViewer,
  PodcastPlayer,
  userApi,
  type LearningProgressData,
  type Flashcard,
  type QuizQuestion,
  type PresentationSlide,
} from '@/components/learning';

// Add state
const [learningProgress, setLearningProgress] = useState<LearningProgressData | null>(null);
const [currentStage, setCurrentStage] = useState<string>('summary');
const [showRoadmapSidebar, setShowRoadmapSidebar] = useState(false);
const [showChatSidebar, setShowChatSidebar] = useState(false);
const [selectedQuestion, setSelectedQuestion] = useState<string>('');

// Load progress on material select
useEffect(() => {
  if (selectedMaterial) {
    userApi.getLearningProgress(selectedMaterial.id)
      .then(setLearningProgress)
      .catch(console.error);
  }
}, [selectedMaterial]);

// Handle stage completion
const handleStageComplete = async (stage: string, data?: any) => {
  try {
    const result = await userApi.completeStage(selectedMaterial.id, stage, data);
    setLearningProgress(prev => prev ? { ...prev, current_stage: result.next_stage } : null);
    
    // Auto-advance to next stage
    setCurrentStage(result.next_stage);
  } catch (error) {
    console.error('Error completing stage:', error);
    toast.error('Failed to save progress');
  }
};

// Handle quiz submission
const handleQuizSubmit = async (result: {
  score_percentage: number;
  questions_correct: number;
  questions_total: number;
  weak_areas?: string[];
  time_spent_seconds: number;
}) => {
  try {
    const quizResult = await userApi.submitQuizResult(selectedMaterial.id, result);
    
    if (quizResult.passed) {
      toast.success('Quiz passed! Material mastered.');
      setCurrentStage('completed');
    } else {
      toast.info('Quiz not passed. Recommended: Study presentation.');
      setCurrentStage('presentation');
    }
  } catch (error) {
    console.error('Error submitting quiz:', error);
    toast.error('Failed to submit quiz');
  }
};

// Render stage content
const renderStageContent = () => {
  if (!learningProgress) return <LoadingSpinner />;

  switch (currentStage) {
    case 'summary':
      return (
        <SummaryWithTimer
          materialId={selectedMaterial.id}
          onComplete={(readTime) => handleStageComplete('summary', { read_time_seconds: readTime })}
          onOpenChat={(text) => {
            setSelectedQuestion(text);
            setShowChatSidebar(true);
          }}
        />
      );

    case 'flashcards':
      return (
        <FlashcardDeck
          flashcards={projectContent.flashcards || []}
          onComplete={(viewedCount) => handleStageComplete('flashcards', { viewed_count: viewedCount })}
          materialId={selectedMaterial.id}
        />
      );

    case 'quiz':
      return (
        <QuizWithThreshold
          questions={projectContent.quiz || []}
          onSubmit={handleQuizSubmit}
          passThreshold={70}
          materialId={selectedMaterial.id}
        />
      );

    case 'presentation':
      return (
        <PresentationViewer
          slides={presentationSlides}
          onComplete={() => handleStageComplete('presentation')}
          isLoading={!presentationSlides}
        />
      );

    case 'podcast':
      return (
        <PodcastPlayer
          audioUrl={podcastAudioUrl}
          durationSeconds={podcastDuration}
          onComplete={() => handleStageComplete('podcast')}
          onProgress={(seconds) => userApi.updatePodcastProgress(selectedMaterial.id, { progress_seconds: seconds, completed: false })}
        />
      );

    case 'retry_quiz':
      return (
        <QuizWithThreshold
          questions={retryQuizQuestions}
          onSubmit={handleQuizSubmit}
          passThreshold={70}
          materialId={selectedMaterial.id}
        />
      );

    case 'completed':
      return (
        <div className="text-center py-12">
          <Trophy className="w-24 h-24 text-[#FF8A3D] mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Material Mastered!</h2>
          <p className="text-white/60">You've completed all stages of this learning path.</p>
        </div>
      );

    default:
      return <div>Unknown stage</div>;
  }
};

// In your JSX
return (
  <div className="min-h-screen bg-[#0C0C0F]">
    <Header />
    
    {/* Learning Roadmap Button */}
    <Button
      onClick={() => setShowRoadmapSidebar(true)}
      className="fixed top-20 right-4 z-30 cursor-pointer"
    >
      📊 Progress
    </Button>

    {/* Main Content Area */}
    <div className="container mx-auto px-4 py-8">
      {selectedMaterial ? (
        renderStageContent()
      ) : (
        <LearningRoadmap
          progress={learningProgress}
          onStageClick={(stage) => setCurrentStage(stage)}
        />
      )}
    </div>

    {/* Progress Sidebar */}
    <RoadmapProgressSidebar
      progress={learningProgress}
      isOpen={showRoadmapSidebar}
      onClose={() => setShowRoadmapSidebar(false)}
      onStageClick={(stage) => {
        setCurrentStage(stage);
        setShowRoadmapSidebar(false);
      }}
    />

    {/* AI Chat Sidebar */}
    <AIChatSidebar
      materialId={selectedMaterial?.id}
      isOpen={showChatSidebar}
      onClose={() => setShowChatSidebar(false)}
      initialQuestion={selectedQuestion}
    />
  </div>
);
```

---

## 🎯 Stage Flow Logic

```
1. Summary (with timer)
   ↓ [User clicks "I've Read It"]
2. Flashcards (mandatory viewing)
   ↓ [All cards viewed]
3. Quiz (70% pass threshold)
   ↓
   ├─→ PASS (≥70%) → Completed ✅
   └─→ FAIL (<70%) → Presentation
                        ↓
                   Podcast (optional)
                        ↓
                   Retry Quiz
                        ↓
                   Completed ✅
```

---

## 📊 API Endpoints Reference

### User Profile
```typescript
// Create profile
await userApi.createProfile({
  age: 20,
  education_level: 'university',
  university_year: 2,
  faculty: 'computer_science',
  learning_style: 'visual',
  interests: ['programming', 'AI']
});

// Get profile
const profile = await userApi.getProfile();

// Update profile
await userApi.updateProfile({ faculty: 'data_science' });
```

### Learning Progress
```typescript
// Get progress for material
const progress = await userApi.getLearningProgress(materialId);

// Complete stage
await userApi.completeStage(materialId, 'summary', {
  read_time_seconds: 300
});

// Submit quiz result
const result = await userApi.submitQuizResult(materialId, {
  score_percentage: 75.0,
  questions_correct: 8,
  questions_total: 10,
  weak_areas: ['topic1', 'topic3'],
  time_spent_seconds: 180
});
```

### Content Generation
```typescript
// Get summary with reading time
const summary = await fetch(`/api/v1/materials/${id}/summary/reading-time`);

// Get presentation
const presentation = await userApi.getPresentation(materialId);

// Get podcast
const podcast = await userApi.getPodcast(materialId);
```

---

## 🎨 Design System Compliance

All components follow your `DESIGN.md`:

| Element | Value |
|---------|-------|
| Primary Color | `#FF8A3D` |
| Background | `#0C0C0F` |
| Surface | `#121215` |
| Foreground | `#F3F3F3` |
| Font | Satoshi |
| Animations | Framer Motion |
| Easing | `[0.22, 1, 0.36, 1]` |

---

## 🧪 Testing Checklist

### Registration Flow
- [ ] User completes 4-step profiling
- [ ] Profile saved to database
- [ ] Redirect to dashboard works

### Learning Roadmap
- [ ] Roadmap displays all 6 stages
- [ ] Current stage highlighted
- [ ] Locked stages not clickable
- [ ] Progress bar updates

### Summary Stage
- [ ] Timer counts down correctly
- [ ] Early unlock works (10-15s before end)
- [ ] Text selection → AI chat works
- [ ] Progress saved on completion

### Flashcards Stage
- [ ] Cards flip with animation
- [ ] All cards must be viewed
- [ ] Progress tracked
- [ ] Keyboard navigation works

### Quiz Stage
- [ ] 70% threshold enforced
- [ ] Pass → Completed
- [ ] Fail → Presentation recommended
- [ ] Weak areas displayed

### Presentation Stage
- [ ] Slides navigate smoothly
- [ ] Fullscreen mode works
- [ ] All slides must be viewed
- [ ] Progress saved

### Podcast Stage
- [ ] Audio plays correctly
- [ ] Playback speed adjustable
- [ ] Progress tracked
- [ ] Completion detected (95%)

---

## 🚀 Deployment

### 1. Run Migrations
```bash
cd backend
docker-compose run --rm backend alembic upgrade head
```

### 2. Build Frontend
```bash
cd "Arma AI-Powered EdTech Interface Design"
npm run build
```

### 3. Start Services
```bash
docker-compose up -d backend celery-worker frontend
```

### 4. Verify
- Visit http://localhost:3000
- Register new account
- Complete profile setup
- Upload material
- Test learning roadmap flow

---

## 📈 Success Metrics

Track these analytics:

| Metric | Target |
|--------|--------|
| Profile completion rate | >90% |
| Summary read completion | >80% |
| Flashcard completion | >75% |
| Quiz first-attempt pass | 60-70% |
| Quiz after remediation pass | >85% |
| Overall material completion | >70% |

---

## 🐛 Known Limitations

1. **Presentation Generation** — Backend service not yet implemented (slides mocked)
2. **Podcast Generation** — Edge TTS integration needed for audio files
3. **Profile Context** — Flashcard/quiz generation updated but needs testing with real AI calls
4. **Weak Areas Detection** — Simplified implementation (first 3 words of question)

---

## 🔜 Next Steps (Optional Enhancements)

1. **Spaced Repetition** — Schedule flashcard reviews
2. **Social Features** — Study groups, leaderboards
3. **Advanced Analytics** — Learning velocity, mastery visualization
4. **Multi-language** — Interface localization
5. **Mobile App** — React Native version

---

## 📞 Support

For issues or questions:
1. Check component source files for inline comments
2. Review API docs: http://localhost:8000/docs
3. Check browser console for debug logs

---

**Last Updated:** March 24, 2026  
**Version:** 1.0.0  
**Status:** Ready for Integration

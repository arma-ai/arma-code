# Adaptive Learning System — Arma

## 🎯 System Overview

### Current State (As-Is)
Currently, the Arma platform operates on a **direct-generation model**:
1. User registers on the website
2. User uploads learning materials (PDFs, YouTube videos, web articles)
3. System immediately generates: **Flashcards**, **Quizzes**, and **Summary**
4. User consumes content in any order, with no guided learning path

**Limitations:**
- No personalization based on user's educational level
- No structured learning progression
- Users can skip important sections
- No adaptive content based on age/grade level
- No consequences for failing quizzes
- No alternative learning formats (presentations, podcasts)

---

## 🚀 New Vision: Adaptive Learning Journey

### Core Philosophy
Transform Arma from a **content generator** into an **adaptive learning companion** that:
- Understands the learner's profile (age, grade, faculty, etc.)
- Generates personalized content tailored to their level
- Guides users through a structured learning roadmap
- Adapts based on performance (quiz results, comprehension)
- Provides multiple learning modalities (text, audio, visual)

---

## 📋 User Journey Map

### Phase 1: Registration with Profiling
**Goal:** Understand who the learner is to personalize content delivery

#### Flow:
```
User lands on registration page
    ↓
Standard registration (email, password, name)
    ↓
Educational Profile Questionnaire (NEW)
    ↓
Profile saved to user account
    ↓
Registration complete
```

#### Educational Profile Questions

**Branching Logic:**

**Q1: What is your age?**
- If **< 18**: Ask school-related questions
  - Q2: What grade are you in? (1-11)
  - Q3: What subjects are you most interested in? (Math, Science, Languages, Arts, etc.)
  - Q4: What is your preferred learning style? (Visual, Auditory, Reading/Writing, Kinesthetic)

- If **≥ 18**: Ask university/professional questions
  - Q2: Are you currently a university student?
    - If **Yes**:
      - Q3: What year are you in? (1st, 2nd, 3rd, 4th+)
      - Q4: What is your faculty/major? (Computer Science, Medicine, Engineering, Business, etc.)
      - Q5: What is your preferred learning style?
    - If **No**:
      - Q3: What is your highest completed education level?
      - Q4: What field do you work/study in?
      - Q5: What is your preferred learning style?

**Data Stored:**
```json
{
  "user_id": "uuid",
  "age": 20,
  "education_level": "university",
  "university_year": 2,
  "faculty": "Computer Science",
  "learning_style": "visual",
  "interests": ["programming", "AI", "web development"]
}
```

---

### Phase 2: Material Upload
**Goal:** User uploads learning material (unchanged from current flow)

#### Flow:
```
User navigates to project
    ↓
Clicks "Add Material"
    ↓
Uploads PDF / YouTube URL / Web Article
    ↓
System processes material (with profile context)
    ↓
Material ready for learning journey
```

**Key Change:** All generated content now includes **user profile context**:
- Summary: Adjusted reading level and examples based on age/grade
- Flashcards: Terminology and complexity matched to education level
- Quizzes: Question difficulty and framing personalized
- Presentations: Visual complexity and depth adjusted

---

### Phase 3: Learning Roadmap (NEW)
**Goal:** Guide user through structured learning path with gates and animations

#### Roadmap Structure:
```
┌─────────────────────────────────────────────────────────────┐
│                    LEARNING ROADMAP                         │
│                                                             │
│  [1. Summary] → [2. Flashcards] → [3. Quiz]                │
│       ↓              ↓              ↓                       │
│   ⏱️ Timer      ✅ Complete     ❌ Fail                    │
│   📝 AI Chat    🔓 Unlock       ↓                          │
│                                 [4. Presentation]           │
│                                      ↓                      │
│                                 [5. Podcast] (optional)     │
│                                      ↓                      │
│                                 [6. Retry Quiz]             │
│                                      ↓                      │
│                                 ✅ Mastery Achieved         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Detailed Roadmap Stages

### Stage 1: Summary with Timer ⏱️

**Purpose:** Ensure user actually reads the summary (not just skipping)

#### Features:
1. **Minimum Reading Time Calculation**
   - Formula: `word_count / 200 WPM = minutes`
   - Example: 1000 words → 5 minutes minimum
   - Display: "Estimated reading time: 5 min"

2. **Early Unlock Mechanism**
   - If user finishes 10-15 seconds before minimum time → "I've Read It" button unlocks
   - Visual indicator: Button shows countdown timer
   - Animation: Button glows when unlockable

3. **Text Selection → AI Chat Integration** (NEW)
   - User highlights any text passage
   - Floating action button appears: "Ask AI about this"
   - Opens chat sidebar with pre-filled context:
     ```
     User's question: [highlighted text + optional question]
     Context: Summary section, paragraph 3
     Material: [Material Title]
     User Profile: 2nd year CS student
     ```

4. **Visual Design**
   - Clean reading interface with progress bar
   - Timer displayed prominently (countdown style)
   - Highlighting tool with orange accent (`#FF8A3D`)
   - Smooth animations when unlocking button

#### State Machine:
```
READING → TIMER_EXPIRED → BUTTON_UNLOCKED → USER_CLICKED → NEXT_STAGE
         ↓
    EARLY_FINISH (10-15s before) → BUTTON_UNLOCKED
```

---

### Stage 2: Flashcards 🎴

**Purpose:** Active recall practice before assessment

#### Features:
1. **Gated Access**
   - Flashcards section is **locked** until summary is marked complete
   - Visual lock icon with tooltip: "Complete the summary first"

2. **Mandatory Completion**
   - User **must** view all flashcards (cannot skip)
   - Progress indicator: "Card 3 of 15"
   - "Next" button only appears after viewing current card

3. **Personalization**
   - Flashcard language complexity matches user's education level
   - Examples reference familiar concepts (e.g., high school vs university examples)
   - Learning style adaptation:
     - Visual learners: More diagrams/images in cards
     - Auditory learners: Text-to-speech option for each card
     - Reading/Writing: Detailed explanations

4. **Animations**
   - Card flip animation (Framer Motion)
   - Smooth transitions between cards
   - Progress bar fills with orange accent
   - Completion celebration animation

#### State Machine:
```
LOCKED → UNLOCKED (after summary) → IN_PROGRESS → ALL_VIEWED → NEXT_STAGE
```

---

### Stage 3: Quiz 📝

**Purpose:** Assess comprehension and determine next steps

#### Features:
1. **Gated Access**
   - Quiz is **locked** until all flashcards are viewed
   - Visual indicator: "Complete flashcards first"

2. **Quiz Structure**
   - 10+ multiple-choice questions (generated by AI)
   - Questions personalized to user's level
   - Immediate feedback after each question (optional setting)
   - Score calculation: Percentage correct

3. **Pass/Fail Threshold**
   - **Pass:** ≥ 70% correct → Learning journey complete ✅
   - **Fail:** < 70% correct → Remediation path 🔄

4. **Results Screen**
   - Score display with visual gauge
   - Breakdown by topic/section
   - Personalized message based on profile:
     - High school: "Great job! You've mastered this topic! 🎉"
     - University: "Solid understanding. Ready to apply this knowledge."

#### State Machine:
```
LOCKED → UNLOCKED (after flashcards) → IN_PROGRESS → SUBMITTED
                                                    ↓
                                    ┌───────────────┴───────────────┐
                                    ↓                               ↓
                               PASS (≥70%)                      FAIL (<70%)
                                    ↓                               ↓
                              ✅ COMPLETE                    🔄 REMEDIATION
```

---

### Stage 4: Presentation (Remediation Path) 📊

**Purpose:** Alternative explanation format for users who failed quiz

#### Trigger:
- User scores < 70% on quiz

#### Features:
1. **Auto-Generation**
   - AI generates slide-style presentation
   - Focuses on quiz topics user struggled with
   - Visual-heavy with key concepts highlighted
   - 8-12 slides depending on material complexity

2. **Personalization**
   - Visual complexity matches education level
   - Examples reference user's faculty/interests
   - Learning style adaptation:
     - Visual: More diagrams, charts, infographics
     - Auditory: Speaker notes, optional narration
     - Reading/Writing: Detailed bullet points

3. **Mandatory Review**
   - User must view all slides (similar to flashcards)
   - Progress indicator
   - Cannot skip ahead

4. **Visual Design**
   - Slide-based interface with navigation arrows
   - Full-screen mode available
   - Orange accent for key points
   - Smooth slide transitions

#### State Machine:
```
GENERATING → READY → IN_REVIEW → ALL_SLIDES_VIEWED → NEXT_CHOICE
```

---

### Stage 5: Podcast (Optional Remediation) 🎧

**Purpose:** Audio learning alternative for struggling users

#### Trigger:
- User failed quiz AND completed presentation
- OR user explicitly requests audio format

#### Features:
1. **Generation Options**
   - **Auto-generate after presentation:** "Would you like to listen to a podcast version?"
   - **Manual trigger:** "Generate Podcast" button in roadmap

2. **Text-to-Speech Implementation**
   - Use Edge TTS (already in tech stack)
   - Natural voice with appropriate pacing
   - Chapters/sections matching material structure
   - Duration: 5-15 minutes depending on content

3. **Personalization**
   - Voice speed adjusted to user preference
   - Language complexity matches profile
   - Examples reference user's background

4. **Player Features**
   - Play/pause, skip forward/backward
   - Playback speed control (0.75x, 1x, 1.25x, 1.5x)
   - Progress bar with chapter markers
   - Download for offline listening (optional)

#### State Machine:
```
REQUESTED → GENERATING → READY → PLAYING → COMPLETED → RETRY_QUIZ
```

---

### Stage 6: Quiz Retry 🔄

**Purpose:** Re-assess after remediation

#### Trigger:
- User completed presentation OR podcast

#### Features:
1. **New Quiz Generation**
   - Different questions from same material (avoid repetition)
   - Similar difficulty level
   - Same personalization rules

2. **Second Chance Logic**
   - **Pass:** ≥ 70% → Mastery achieved ✅
   - **Fail:** < 70% → Option to:
     - Review presentation again
     - Listen to podcast (if not done)
     - Contact AI tutor for help
     - Mark as "incomplete" and return later

3. **Multiple Attempts Tracking**
   - Show attempt history
   - Encourage progress: "You improved by 15%!"
   - No penalty for multiple attempts (growth mindset)

#### State Machine:
```
LOCKED → UNLOCKED (after remediation) → IN_PROGRESS → SUBMITTED
                                                    ↓
                                    ┌───────────────┴───────────────┐
                                    ↓                               ↓
                               PASS (≥70%)                    FAIL (<70%)
                                    ↓                               ↓
                              ✅ MASTERY                   🔄 MORE REMEDIATION
```

---

## 🎨 UI/UX Requirements

### Roadmap Visualization

#### Desktop View:
```
┌────────────────────────────────────────────────────────────────┐
│  Learning Roadmap: [Material Title]                            │
│                                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │  📄      │ →  │  🎴      │ →  │  📝      │                 │
│  │ Summary  │    │Flashcards│    │  Quiz    │                 │
│  │  ✅      │    │  ✅      │    │  🔒      │                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│       ↓                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │  📊      │ →  │  🎧      │ →  │  📝      │                 │
│  │Presentation│   │ Podcast  │    │Retry Quiz│                 │
│  │  🔒      │    │  🔒      │    │  🔒      │                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│                                                                │
│  Current: Flashcards (2 of 6 stages)                           │
│  Progress: ████████░░░░ 67%                                    │
└────────────────────────────────────────────────────────────────┘
```

#### Mobile View:
```
┌────────────────────────┐
│  Learning Roadmap      │
│                        │
│  ● Summary ✅          │
│  │                     │
│  ● Flashcards 🎴       │
│  │  (Current)          │
│  ● Quiz 📝 🔒          │
│  │                     │
│  ● Presentation 📊 🔒  │
│  │                     │
│  ● Podcast 🎧 🔒       │
│  │                     │
│  ● Retry Quiz 📝 🔒    │
│                        │
│  Progress: 67%         │
└────────────────────────┘
```

### Animation Requirements

1. **Roadmap Entrance Animation**
   - Stages appear sequentially (staggered)
   - Current stage pulses with orange glow
   - Locked stages have subtle lock icon animation

2. **Stage Transition**
   - Smooth fade-out/fade-in between stages
   - Progress bar fills with easing animation
   - Unlock sound effect (subtle, optional)

3. **Timer Animation**
   - Countdown with smooth decrement
   - Color change: Orange → Green when unlockable
   - Pulse animation when < 10 seconds remaining

4. **Completion Celebrations**
   - Confetti animation on quiz pass
   - Progress bar fills with burst effect
   - Checkmark draws itself on completed stages

---

## 🗄️ Database Schema Changes

### New Tables Required

#### 1. `user_profiles` (NEW)
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Age/Grade Info
    age INTEGER,
    education_level VARCHAR(50), -- 'school', 'university', 'professional'
    
    -- School-specific (if age < 18)
    grade_level INTEGER, -- 1-11
    school_interests TEXT[], -- ['math', 'science', 'languages', 'arts']
    
    -- University-specific (if age >= 18)
    university_year INTEGER, -- 1-4+
    faculty VARCHAR(100), -- 'Computer Science', 'Medicine', etc.
    major VARCHAR(100),
    
    -- Learning Preferences
    learning_style VARCHAR(50), -- 'visual', 'auditory', 'reading', 'kinesthetic'
    interests TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

#### 2. `learning_progress` (NEW)
```sql
CREATE TABLE learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Roadmap Stage Tracking
    current_stage VARCHAR(50), -- 'summary', 'flashcards', 'quiz', 'presentation', 'podcast', 'retry_quiz'
    
    -- Stage Status
    summary_completed BOOLEAN DEFAULT FALSE,
    summary_read_time_seconds INTEGER,
    flashcards_completed BOOLEAN DEFAULT FALSE,
    flashcards_viewed_count INTEGER DEFAULT 0,
    
    -- Quiz Attempts
    quiz_attempts INTEGER DEFAULT 0,
    best_quiz_score DECIMAL(5,2), -- 0-100
    quiz_passed BOOLEAN DEFAULT FALSE,
    
    -- Remediation
    presentation_completed BOOLEAN DEFAULT FALSE,
    podcast_completed BOOLEAN DEFAULT FALSE,
    
    -- Completion
    mastery_achieved BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, material_id)
);

CREATE INDEX idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX idx_learning_progress_material_id ON learning_progress(material_id);
```

#### 3. `quiz_attempts` (Enhanced)
```sql
-- Add columns to existing quiz_attempts table
ALTER TABLE quiz_attempts ADD COLUMN score_percentage DECIMAL(5,2);
ALTER TABLE quiz_attempts ADD COLUMN passed BOOLEAN DEFAULT FALSE;
ALTER TABLE quiz_attempts ADD COLUMN questions_answered INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN questions_correct INTEGER;
ALTER TABLE quiz_attempts ADD COLUMN time_spent_seconds INTEGER;
```

#### 4. `presentations` (NEW)
```sql
CREATE TABLE presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    slides JSONB, -- Array of slide objects with title, content, image_url
    total_slides INTEGER,
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT NOW(),
    generation_prompt TEXT,
    user_profile_context JSONB,
    
    -- Tracking
    viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP
);

CREATE INDEX idx_presentations_material_id ON idx_presentations(material_id);
```

#### 5. `podcasts` (NEW)
```sql
CREATE TABLE podcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audio Content
    audio_url VARCHAR(500),
    duration_seconds INTEGER,
    
    -- Metadata
    generated_at TIMESTAMP DEFAULT NOW(),
    generation_prompt TEXT,
    user_profile_context JSONB,
    voice_type VARCHAR(50),
    playback_speed DECIMAL(3,2) DEFAULT 1.0,
    
    -- Tracking
    played BOOLEAN DEFAULT FALSE,
    play_progress_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP
);

CREATE INDEX idx_podcasts_material_id ON podcasts(material_id);
```

---

## 🔧 Backend API Changes

### New Endpoints Required

#### User Profile Endpoints
```python
# POST /api/v1/users/profile
# Create/update user educational profile
Request: {
    "age": 20,
    "education_level": "university",
    "university_year": 2,
    "faculty": "Computer Science",
    "learning_style": "visual",
    "interests": ["programming", "AI"]
}

# GET /api/v1/users/profile
# Get current user's profile
Response: {
    "id": "uuid",
    "user_id": "uuid",
    "age": 20,
    ...
}
```

#### Learning Progress Endpoints
```python
# GET /api/v1/materials/{id}/learning-progress
# Get user's progress on material roadmap
Response: {
    "material_id": "uuid",
    "current_stage": "flashcards",
    "summary_completed": true,
    "flashcards_completed": false,
    "quiz_passed": false,
    "mastery_achieved": false,
    "progress_percentage": 33
}

# POST /api/v1/materials/{id}/learning-progress/stage
# Update stage completion
Request: {
    "stage": "summary",
    "completed": true,
    "read_time_seconds": 285
}

# POST /api/v1/materials/{id}/learning-progress/complete
# Mark entire roadmap as complete
```

#### Presentation Endpoints
```python
# POST /api/v1/materials/{id}/presentation/generate
# Generate presentation for remediation
Request: {
    "focus_areas": ["topic1", "topic2"],  # From quiz weak points
    "user_profile_context": {...}
}
Response: {
    "presentation_id": "uuid",
    "status": "generating",
    "estimated_time_seconds": 30
}

# GET /api/v1/materials/{id}/presentation
# Get generated presentation
Response: {
    "id": "uuid",
    "slides": [...],
    "total_slides": 10,
    "viewed": false
}

# POST /api/v1/materials/{id}/presentation/view
# Mark presentation as viewed
```

#### Podcast Endpoints
```python
# POST /api/v1/materials/{id}/podcast/generate
# Generate podcast/audio version
Request: {
    "voice_type": "male/female",
    "playback_speed": 1.0
}

# GET /api/v1/materials/{id}/podcast
# Get generated podcast
Response: {
    "id": "uuid",
    "audio_url": "https://...",
    "duration_seconds": 420,
    "play_progress_seconds": 0
}

# POST /api/v1/materials/{id}/podcast/progress
# Update playback progress
Request: {
    "progress_seconds": 120,
    "completed": false
}
```

#### Enhanced Quiz Endpoints
```python
# POST /api/v1/materials/{id}/quiz/generate
# Generate quiz with user profile context
Request: {
    "user_profile_context": {...},
    "difficulty_adjustment": -1  # -1 for easier (remediation), 0 for normal, +1 for harder
}

# POST /api/v1/materials/{id}/quiz/submit
# Submit quiz answers
Request: {
    "answers": [
        {"question_id": "uuid", "selected_option": "A"},
        ...
    ]
}
Response: {
    "score_percentage": 65.0,
    "passed": false,
    "questions_correct": 6,
    "questions_total": 10,
    "weak_areas": ["topic1", "topic3"],
    "next_stage": "presentation"
}
```

---

## 🎭 Frontend Component Changes

### New Components Required

#### 1. `UserProfileSetup.tsx`
**Location:** Registration flow
**Purpose:** Collect educational profile during registration

```typescript
interface Props {
  onComplete: (profile: UserProfileData) => void;
}

// Features:
// - Age input with branching logic
// - Dynamic question rendering based on age
// - Visual progress indicator
// - Validation for required fields
```

#### 2. `LearningRoadmap.tsx`
**Location:** Material detail view
**Purpose:** Visual roadmap with stage progression

```typescript
interface Props {
  materialId: string;
  currentStage: LearningStage;
  progress: LearningProgress;
  onStageComplete: (stage: string) => void;
}

// Features:
// - Interactive roadmap visualization
// - Stage status indicators (locked, current, completed)
// - Progress bar with animation
// - Stage transition handling
```

#### 3. `SummaryWithTimer.tsx`
**Location:** Summary stage
**Purpose:** Timed reading with AI chat integration

```typescript
interface Props {
  summary: string;
  materialId: string;
  estimatedReadTime: number;
  onComplete: () => void;
}

// Features:
// - Countdown timer with visual indicator
// - Text selection → AI chat integration
// - Early unlock mechanism
// - Button state management
```

#### 4. `FlashcardDeck.tsx`
**Location:** Flashcards stage
**Purpose:** Mandatory flashcard completion

```typescript
interface Props {
  flashcards: Flashcard[];
  onComplete: () => void;
}

// Features:
// - Card flip animation
// - Progress tracking
// - Mandatory viewing (no skip)
// - Completion detection
```

#### 5. `QuizWithThreshold.tsx`
**Location:** Quiz stage
**Purpose:** Quiz with pass/fail logic

```typescript
interface Props {
  quiz: Quiz;
  onSubmit: (result: QuizResult) => void;
  passThreshold: number; // 70%
}

// Features:
// - Question rendering with personalization
// - Score calculation
// - Pass/fail determination
// - Results display with next-stage routing
```

#### 6. `PresentationViewer.tsx`
**Location:** Presentation stage
**Purpose:** Slide-based presentation viewer

```typescript
interface Props {
  presentation: Presentation;
  onComplete: () => void;
}

// Features:
// - Slide navigation
// - Full-screen mode
// - Progress tracking
// - Mandatory viewing
```

#### 7. `PodcastPlayer.tsx`
**Location:** Podcast stage
**Purpose:** Audio player with progress tracking

```typescript
interface Props {
  podcast: Podcast;
  onProgress: (seconds: number) => void;
  onComplete: () => void;
}

// Features:
// - Play/pause controls
// - Playback speed adjustment
// - Progress bar with chapter markers
// - Background playback support
```

#### 8. `RoadmapProgressSidebar.tsx`
**Location:** Material detail sidebar
**Purpose:** Persistent roadmap progress display

```typescript
interface Props {
  progress: LearningProgress;
  currentStage: string;
}

// Features:
// - Mini roadmap visualization
// - Stage status indicators
// - Quick navigation to stages
// - Progress percentage
```

---

## 📦 Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Priority:** HIGH - Core infrastructure

#### Backend Tasks:
- [ ] Create database migrations for new tables
  - `user_profiles`
  - `learning_progress`
  - `presentations`
  - `podcasts`
- [ ] Update existing `quiz_attempts` schema
- [ ] Create SQLAlchemy models for new tables
- [ ] Add Pydantic schemas for request/response validation

#### Frontend Tasks:
- [ ] Create `UserProfileSetup` component
- [ ] Integrate profile setup into registration flow
- [ ] Update registration API calls to include profile data
- [ ] Create profile API service methods

#### Deliverables:
- ✅ Database schema ready
- ✅ User profile collection during registration
- ✅ Profile data persisted and retrievable

---

### Phase 2: Learning Progress Tracking (Week 2-3)
**Priority:** HIGH - Core tracking logic

#### Backend Tasks:
- [ ] Implement learning progress CRUD endpoints
- [ ] Create stage transition logic
- [ ] Add progress calculation utilities
- [ ] Implement gating logic (can't skip stages)

#### Frontend Tasks:
- [ ] Create `LearningRoadmap` component
- [ ] Create `RoadmapProgressSidebar` component
- [ ] Implement stage state management
- [ ] Add roadmap animations (Framer Motion)
- [ ] Integrate with existing material detail view

#### Deliverables:
- ✅ Visual roadmap with all 6 stages
- ✅ Progress tracking across sessions
- ✅ Stage gating logic enforced

---

### Phase 3: Summary with Timer (Week 3-4)
**Priority:** MEDIUM - First stage implementation

#### Backend Tasks:
- [ ] Enhance summary generation to include word count
- [ ] Add reading time calculation endpoint
- [ ] Implement text selection → AI chat endpoint
- [ ] Track summary read time in database

#### Frontend Tasks:
- [ ] Create `SummaryWithTimer` component
- [ ] Implement text selection detection
- [ ] Create floating "Ask AI" button
- [ ] Build AI chat sidebar integration
- [ ] Implement early unlock logic
- [ ] Add timer animations

#### Deliverables:
- ✅ Timed summary reading with countdown
- ✅ Text selection → AI chat working
- ✅ Early unlock mechanism functional

---

### Phase 4: Flashcards (Week 4-5)
**Priority:** MEDIUM - Second stage implementation

#### Backend Tasks:
- [ ] Update flashcard generation to use profile context
- [ ] Add flashcard viewing progress endpoint
- [ ] Track individual card views

#### Frontend Tasks:
- [ ] Create `FlashcardDeck` component
- [ ] Implement card flip animation
- [ ] Add mandatory viewing logic
- [ ] Create progress indicator
- [ ] Add completion celebration animation

#### Deliverables:
- ✅ Flashcards with profile-personalized content
- ✅ Mandatory viewing enforced
- ✅ Smooth animations and transitions

---

### Phase 5: Quiz with Pass/Fail (Week 5-6)
**Priority:** HIGH - Critical decision point

#### Backend Tasks:
- [ ] Update quiz generation with profile context
- [ ] Implement quiz submission with scoring
- [ ] Add pass/fail threshold logic
- [ ] Track weak areas from quiz results
- [ ] Generate different quiz for retry

#### Frontend Tasks:
- [ ] Create `QuizWithThreshold` component
- [ ] Implement score calculation display
- [ ] Build results screen with next-stage routing
- [ ] Add pass/fail animations
- [ ] Create weak areas visualization

#### Deliverables:
- ✅ Quiz with 70% pass threshold
- ✅ Automatic routing to remediation on fail
- ✅ Score tracking and history

---

### Phase 6: Presentations (Week 6-8)
**Priority:** MEDIUM - Remediation path

#### Backend Tasks:
- [ ] Create presentation generation prompt template
- [ ] Implement slide generation with AI
- [ ] Add user profile context to generation
- [ ] Create presentation viewing tracking
- [ ] Implement focus areas from quiz results

#### Frontend Tasks:
- [ ] Create `PresentationViewer` component
- [ ] Implement slide navigation
- [ ] Add full-screen mode
- [ ] Create slide transition animations
- [ ] Add mandatory viewing logic

#### AI Prompt Engineering:
```
Generate a presentation for a {education_level} student studying {faculty}.
Focus on these weak areas: {weak_areas}.
Create {num_slides} slides with:
- Clear titles
- Concise bullet points
- Visual descriptions for each slide
- Examples relevant to {faculty} students
Reading level: {grade_level}
```

#### Deliverables:
- ✅ AI-generated presentations
- ✅ Slide viewer with navigation
- ✅ Focus on quiz weak areas

---

### Phase 7: Podcasts (Week 8-10)
**Priority:** LOW - Optional enhancement

#### Backend Tasks:
- [ ] Enhance Edge TTS integration for long-form content
- [ ] Create podcast generation prompt
- [ ] Implement audio file storage (S3/local)
- [ ] Add playback progress tracking
- [ ] Create podcast metadata endpoint

#### Frontend Tasks:
- [ ] Create `PodcastPlayer` component
- [ ] Implement playback controls
- [ ] Add speed adjustment
- [ ] Create progress bar with chapters
- [ ] Add background playback support

#### Deliverables:
- ✅ Audio podcast generation
- ✅ Full-featured audio player
- ✅ Progress tracking

---

### Phase 8: Polish & Testing (Week 10-12)
**Priority:** HIGH - Production readiness

#### Backend Tasks:
- [ ] Write unit tests for all new endpoints
- [ ] Load test presentation/podcast generation
- [ ] Optimize database queries
- [ ] Add error handling and retry logic
- [ ] Implement caching for generated content

#### Frontend Tasks:
- [ ] Write component unit tests
- [ ] E2E testing (Playwright/Cypress)
- [ ] Performance optimization (lazy loading, memoization)
- [ ] Accessibility audit (WCAG 2.1)
- [ ] Mobile responsiveness testing

#### UX Polish:
- [ ] Refine animations (timing, easing)
- [ ] Add sound effects (optional, toggleable)
- [ ] Improve error messages
- [ ] Add loading states and skeletons
- [ ] Create empty states

#### Deliverables:
- ✅ Full test coverage
- ✅ Production-ready performance
- ✅ Polished UX with animations

---

## 🎯 Success Metrics

### Quantitative Metrics
| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Quiz pass rate (first attempt) | N/A | 60-70% | Analytics |
| Quiz pass rate (after remediation) | N/A | 85-90% | Analytics |
| Average time per material | ~10 min | 25-30 min | Analytics |
| Completion rate (all stages) | N/A | 75%+ | Analytics |
| User retention (7-day) | TBD | +20% | Analytics |
| Profile completion rate | N/A | 90%+ | Analytics |

### Qualitative Metrics
- User feedback on personalization quality
- Perceived learning effectiveness
- Engagement with AI chat feature
- Satisfaction with multiple learning modalities

---

## 🔐 Privacy & Data Considerations

### User Profile Data
- **Age:** Stored securely, used only for personalization
- **Education info:** Never shared with third parties
- **Learning style:** Used for content adaptation only

### Learning Progress
- **Quiz scores:** Private to user, not visible to others
- **Weak areas:** Used for adaptive generation, deleted after session
- **Time spent:** Aggregated for analytics, anonymized

### Compliance
- GDPR compliance for EU users
- COPPA compliance for users < 13 (parental consent)
- Data export/deletion on user request

---

## 🚀 Future Enhancements (Post-MVP)

### Advanced Features
1. **Spaced Repetition System (SRS)**
   - Schedule flashcard reviews based on forgetting curve
   - Optimal review intervals

2. **Social Learning**
   - Study groups with shared roadmaps
   - Leaderboards for quiz scores
   - Peer-to-peer explanations

3. **Advanced Analytics**
   - Learning velocity tracking
   - Topic mastery visualization
   - Personalized study recommendations

4. **AI Tutor Enhancements**
   - Voice-based conversations
   - Socratic questioning method
   - Emotional support and motivation

5. **Content Marketplace**
   - Pre-made roadmaps for common topics
   - Community-generated presentations
   - Expert-verified quizzes

6. **Multi-Language Support**
   - Interface localization
   - Content translation
   - Language learning specific features

---

## 📝 Migration Plan from Current System

### Backward Compatibility
- Existing users: Add profile setup as optional onboarding
- Existing materials: Generate roadmap progress on first access
- Existing quizzes: Migrate scores to new format

### Rollout Strategy
1. **Alpha:** Internal testing with team
2. **Beta:** 50-100 friendly users
3. **Gradual:** 10% → 25% → 50% → 100% of users
4. **Full Launch:** Marketing push, feature announcement

### Rollback Plan
- Feature flags for each stage
- Ability to disable new roadmap for specific users
- Database migration rollback scripts

---

## 📚 Technical Documentation

### API Documentation
- Swagger/OpenAPI specs updated with new endpoints
- Postman collection for testing
- Rate limiting documentation

### Component Documentation
- Storybook stories for all new components
- Prop documentation with TypeScript
- Usage examples in code comments

### Architecture Documentation
- Sequence diagrams for stage transitions
- Database ERD with relationships
- Deployment architecture diagram

---

## 🎓 Conclusion

This adaptive learning system transforms Arma from a **content generator** into an **intelligent learning companion** that:

1. ✅ **Understands the learner** through educational profiling
2. ✅ **Personalizes content** based on age, grade, and learning style
3. ✅ **Guides the journey** through structured roadmap stages
4. ✅ **Adapts to performance** with remediation paths
5. ✅ **Supports multiple modalities** (text, visual, audio)
6. ✅ **Ensures comprehension** with gated progression and quizzes

The implementation is phased over 12 weeks, with each phase delivering tangible value and building toward the complete vision. Success metrics will guide iteration and improvement post-launch.

---

**Document Version:** 1.0.0
**Created:** March 24, 2026
**Status:** Ready for Implementation
**Owner:** Development Team

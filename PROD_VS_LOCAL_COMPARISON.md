# Production vs Local Version Comparison Report

**Generated:** 2026-03-04  
**Production Path:** `/Users/vueko/Projects/arma-ai/prod_version/`  
**Local Path:** `/Users/vueko/Projects/arma-ai/`

---

## Executive Summary

This report provides a comprehensive comparison between the production version and the local development version of the ARMA AI EdTech platform. The analysis reveals significant architectural differences, with the local version containing additional features (Projects, monitoring, enhanced middleware) that are not present in production, while production has unique features (Voice Teacher, landing intent handling) that need to be preserved.

---

## 1. Frontend Structure Comparison

### 1.1 Directory Structure Overview

| Aspect | Production | Local | Difference |
|--------|-----------|-------|------------|
| Total TSX Files | 68 | 78 | +10 local |
| Pages Directory | 2 files | 3 files | +ProjectDetailView (local) |
| Components Directory | 6 subdirs | 7 subdirs | +upload (local) |
| Dashboard Components | 10 files | 11 files | +ProjectCard (local) |
| Tab Components | 0 (inline) | 6 files | Modular tabs (local) |

### 1.2 Files Only in LOCAL Version

#### Frontend Components
```
src/pages/ProjectDetailView.tsx (790 lines)
  - Features: "All Materials" / "Single Material" view toggle
  - Project-focused architecture
  - Project deletion functionality

src/components/dashboard/tabs/
  - ChatTab.tsx
  - FlashcardsTab.tsx
  - PodcastTab.tsx
  - QuizTab.tsx
  - SlidesTab.tsx
  - SummaryTab.tsx

src/components/dashboard/ProjectCard.tsx
src/components/upload/FileInput.tsx
src/components/ErrorBoundary.tsx
src/components/ui/header.tsx
```

#### Root Level Documentation (Local only)
```
CHANGELOG_PROJECTS_FEATURE.md
CLEANUP_SUMMARY.md
DEPLOYMENT.md
DOCKER_DEPLOYMENT.md
IMPLEMENTATION_PLAN_SINGLE_MATERIAL_AND_TABS.md
MULTIFILE_UPLOAD_IMPLEMENTATION.md
MULTIFILE_UPLOAD_PLAN.md
PROJECTS_FEATURE_DOCUMENTATION.md
```

#### Configuration Files (Local only)
```
docker-compose.prod.yml
docker/postgres/ (directory)
Arma AI-Powered EdTech Interface Design/Dockerfile
Arma AI-Powered EdTech Interface Design/nginx.conf
.env
.env.example
```

### 1.3 Files Only in PRODUCTION Version

#### Frontend Components
```
src/components/dashboard/VoiceTeacherView.tsx
src/utils/landingIntent.ts
```

#### Root Level (Production only)
```
scripts/deploy.sh
scripts/eduplatform.service
CLAUDE.md
```

---

## 2. App.tsx Architecture Comparison

### 2.1 Key Differences

| Feature | Production | Local |
|---------|-----------|-------|
| **Component Loading** | Lazy loading with `React.lazy()` + `Suspense` | Direct imports |
| **Error Boundary** | ❌ Not present | ✅ Wraps entire app |
| **Landing Intent Handling** | ✅ Full implementation | ❌ Simple navigation |
| **Upload Modal Prefill** | ✅ Supports file/topic prefill | ❌ Basic modal |
| **Voice Teacher View** | ✅ Imported and routed | ❌ Not present |
| **ViewState Type** | Includes `'voice'` | No `'voice'` |

### 2.2 Production App.tsx Highlights

```typescript
import { Suspense, lazy } from 'react';

// Lazy loaded components for code splitting
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const VoiceTeacherView = lazy(() => import('./components/dashboard/VoiceTeacherView'));

// Landing intent handling - pass topic/file from landing page
function LandingPageWrapper() {
  const navigate = useNavigate();
  return (
    <LandingPage
      onStart={(payload) => {
        const hasTopic = Boolean(payload?.topic?.trim());
        const hasFile = Boolean(payload?.file);
        if (hasTopic || hasFile) {
          setLandingIntent({ topic: payload?.topic, file: payload?.file || null });
        }
        navigate('/login');
      }}
    />
  );
}
```

### 2.3 Local App.tsx Highlights

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

// Simple landing page wrapper
function LandingPageWrapper() {
  const navigate = useNavigate();
  return <LandingPage onStart={() => navigate('/login')} />;
}

// Error boundary wraps entire app for graceful error handling
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          {/* ... app content ... */}
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## 3. ProjectDetailView.tsx - Critical Differences

### 3.1 Architecture Comparison

| Aspect | Production | Local (`/pages/`) |
|--------|-----------|-------------------|
| **Location** | `src/components/dashboard/` | `src/pages/` |
| **Lines of Code** | 1898 lines | 790 lines |
| **View Mode Toggle** | ❌ Single material only | ✅ "All Materials" / "Single Material" |
| **Tab Architecture** | Inline components | External modular components |
| **Focus** | Material-centric | Project-centric |
| **Delete Project** | ❌ Not present | ✅ `handleDeleteProject()` |
| **Markdown Rendering** | Custom parsing | `react-markdown` + `remark-gfm` |

### 3.2 Feature Comparison

#### Production Features
- **6 Tabs**: Chat, Summary, Flashcards, Quiz, **Podcast**, **Slides**
- **Inline tab components** (all defined in single file)
- **Table of Contents panel** (collapsible left sidebar)
- **Right actions rail** (metadata and project info)
- **Retry button** for failed/stuck materials
- **Single material view only**

#### Local Features (`/pages/ProjectDetailView.tsx`)
- **4 Tabs**: Materials, Summary, Flashcards, Quiz
- **View Mode Toggle**: Switch between "All Materials" and "Single Material"
- **Material selector dropdown** (Single Material mode)
- **Project deletion** functionality
- **External tab components** from `/components/dashboard/tabs/`
- **Markdown rendering** with `ReactMarkdown` and `remarkGfm`

### 3.3 The Bug: "Single Material" Not Working

**Root Cause:** The local version has the view mode toggle UI, but the implementation is incomplete:

1. **Quiz Tab Missing Single Material Logic** - Only checks `content?.quiz` (all materials), doesn't check `materialContent?.quiz` (single material)
2. **Summary Tab** - ✅ Has both `viewMode === 'all'` and `viewMode === 'single'` branches
3. **Flashcards Tab** - ✅ Has both `viewMode === 'all'` and `viewMode === 'single'` branches
4. **Quiz Tab** - ❌ **MISSING** `viewMode === 'single'` branch

**Fix Required:** Add `viewMode === 'single'` conditional branch to Quiz tab (similar to Summary and Flashcards tabs)

---

## 4. Package.json Dependencies Comparison

### 4.1 Dependencies Only in LOCAL

| Package | Version | Purpose |
|---------|---------|---------|
| `react-markdown` | `^10.1.0` | Markdown rendering |
| `remark-gfm` | `^4.0.1` | GitHub Flavored Markdown support |

### 4.2 Version Differences

| Package | Production | Local |
|---------|-----------|-------|
| `clsx` | `*` | `^2.1.1` |
| `motion` | `*` | `^11.0.0` |
| `next-themes` | `*` | `^0.3.0` |
| `sonner` | `*` | `^1.5.0` |
| `tailwind-merge` | `*` | `^2.5.0` |

### 4.3 Shared Dependencies (Identical Versions)
Both versions share 40+ identical dependencies:
- `@radix-ui/*` components (all)
- `axios` `^1.7.9`
- `react-router-dom` `^7.1.3`
- `react-hook-form` `^7.55.0`
- `lucide-react` `^0.487.0`
- `recharts` `^2.15.2`
- `pdfjs-dist` `^4.10.38`
- `vite` `6.3.5`
- `typescript` `^5.7.2`

---

## 5. Backend Structure Comparison

### 5.1 Directory Structure

| Aspect | Production | Local | Difference |
|--------|-----------|-------|------------|
| Total Python Files | 55 | 66 | +11 local |
| API Endpoints | 5 files | 8 files | +3 local |
| Middleware | ❌ None | ✅ 2 files | Enhanced (local) |
| Metrics | ❌ None | ✅ 2 files | Prometheus (local) |
| Database Models | 6 files | 8 files | +Project, +MaterialChunk |

### 5.2 Files Only in LOCAL Backend

#### API Endpoints
```
app/api/v1/endpoints/health.py
app/api/v1/endpoints/projects.py
app/api/v1/endpoints/previousMaterials.py
```

#### Database Models
```
app/infrastructure/database/models/project.py
app/infrastructure/database/models/material_chunk.py
```

#### Middleware & Utilities
```
app/middleware.py
app/api/middleware.py
app/core/metrics.py
app/infrastructure/utils/metrics.py
app/infrastructure/utils/document_extractors.py
app/infrastructure/utils/youtube_extractor.py
app/infrastructure/ai/ai_tts_service.py
```

#### Root Backend Files (Local only)
```
Dockerfile
requirements-full.txt
retry_failed_materials.py
create_admin_sync.py
start.sh
storage/ (directory)
```

### 5.3 Files Only in PRODUCTION Backend

#### Alembic Migrations
```
alembic/versions/dab3998dcff8_initial_migration_create_all_tables.py
alembic/versions/971a0879e09f_add_podcast_fields_to_materials.py
alembic/versions/8ff1e48b75ed_add_presentation_fields_to_materials.py
alembic/versions/69f9387fe939_increase_presentation_url_column_size.py
alembic/versions/20260305000100_add_quiz_question_explanation.py
alembic/versions/20251222221959_change_correct_option_to_text.py
```

#### Tests
```
tests/unit/test_quiz_exam_contracts.py
```

#### Requirements (Split)
```
requirements/base.txt
requirements/dev.txt
requirements/prod.txt
```

---

## 6. main.py Comparison

### 6.1 Production main.py (Simpler)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

def create_application() -> FastAPI:
    app = FastAPI(...)
    
    # CORS middleware only
    app.add_middleware(CORSMiddleware, ...)
    
    # Static files for podcasts
    app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")
    
    # API router
    app.include_router(api_router, prefix="/api/v1")
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "environment": settings.APP_ENV}
```

### 6.2 Local main.py (Enhanced)

```python
from fastapi import FastAPI
from prometheus_client import make_asgi_app  # Prometheus metrics

from app.middleware import CorrelationIDMiddleware, StructuredLoggingMiddleware
from app.infrastructure.utils.metrics import metrics_middleware

def create_application() -> FastAPI:
    app = FastAPI(...)
    
    # Multiple middleware layers
    app.add_middleware(CORSMiddleware, ...)
    app.add_middleware(StructuredLoggingMiddleware)
    app.add_middleware(CorrelationIDMiddleware)
    app.middleware("http")(metrics_middleware)  # Prometheus
    
    # Static files for podcasts + uploaded materials
    app.mount("/storage", StaticFiles(directory=storage_dir), name="storage")
    
    # API router + health endpoints
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(health_endpoints.router)
    
    # Prometheus metrics endpoint
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)
```

### 6.3 Key Differences

| Feature | Production | Local |
|---------|-----------|-------|
| **Prometheus Metrics** | ❌ | ✅ `/metrics` endpoint |
| **Correlation ID Middleware** | ❌ | ✅ Request tracing |
| **Structured Logging** | ❌ | ✅ Enhanced logging |
| **Health Endpoint** | Inline `@app.get("/health")` | Separate router |
| **Lines of Code** | ~50 lines | ~70 lines |

---

## 7. Major Feature Differences

### 7.1 Features Only in LOCAL

| Feature | Description | Status |
|---------|-------------|--------|
| **Project Concept** | Full project management with multiple materials | ⚠️ Partially implemented |
| **View Mode Toggle** | Switch between "All Materials" / "Single Material" | ❌ Bug: Quiz tab missing logic |
| **Project Deletion** | Delete entire projects with all materials | ✅ Implemented |
| **Error Boundary** | React error boundary for graceful error handling | ✅ Implemented |
| **Prometheus Monitoring** | Metrics collection and visualization | ✅ Implemented |
| **Correlation IDs** | Request tracing across services | ✅ Implemented |
| **Structured Logging** | Enhanced logging with request context | ✅ Implemented |
| **Material Chunks** | Chunk-based material processing | ⚠️ Model exists, usage unclear |
| **TTS Service** | AI text-to-speech service | ⚠️ Service exists, integration unclear |
| **YouTube Extractor** | Dedicated YouTube extraction utility | ✅ Implemented |
| **Document Extractors** | Multi-format document extraction | ✅ Implemented |

### 7.2 Features Only in PRODUCTION

| Feature | Description | Priority |
|---------|-------------|----------|
| **Voice Teacher View** | Voice-based learning interface | High |
| **Landing Intent Handling** | Pass topic/file from landing page to upload | High |
| **Upload Modal Prefill** | Auto-populate upload modal from landing page | High |
| **Retry Failed Materials** | UI button to retry stuck/failed processing | High |
| **Table of Contents Panel** | Collapsible left sidebar with content outline | Medium |
| **Right Actions Rail** | Metadata and actions sidebar | Medium |
| **Migration Files** | Complete alembic migration history | Critical |
| **Unit Tests** | Quiz/exam contract tests | Medium |
| **Split Requirements** | Separate base/dev/prod requirements | Medium |
| **Deploy Scripts** | Production deployment scripts | Critical |

---

## 8. Architecture Differences

### 8.1 Frontend Architecture

| Aspect | Production | Local |
|--------|-----------|-------|
| **Component Loading** | Lazy loading with Suspense | Direct imports |
| **Error Handling** | Basic | Error Boundary wrapper |
| **Tab Architecture** | Inline components | External modular tabs |
| **View Organization** | Material-centric | Project-centric |
| **Code Splitting** | ✅ Yes | ❌ No |
| **File Organization** | Fewer, larger files | More, smaller files |

### 8.2 Backend Architecture

| Aspect | Production | Local |
|--------|-----------|-------|
| **Monitoring** | Basic | Prometheus + Metrics |
| **Logging** | Standard | Structured with Correlation IDs |
| **Database Models** | Material-focused | Project + Material + Chunks |
| **API Organization** | 5 endpoints | 8 endpoints |
| **Middleware Stack** | Minimal | Multi-layered |
| **TTS Integration** | ❌ | ✅ AI TTS Service |

### 8.3 Data Model Differences

#### Production Models
```
- Material (standalone)
- User
- Flashcard
- Quiz
- QuizAttempt
- Embedding
```

#### Local Models (Production + Additional)
```
- All production models PLUS:
- Project (groups multiple materials)
- MaterialChunk (chunked content)
```

---

## 9. Critical Issues to Address

### 9.1 High Priority Bugs (Local)

1. **Quiz Tab "Single Material" Not Working**
   - **File:** `Arma AI-Powered EdTech Interface Design/src/pages/ProjectDetailView.tsx`
   - **Issue:** Missing `viewMode === 'single'` conditional branch
   - **Fix:** Add single material logic similar to Summary and Flashcards tabs

2. **Missing Production Features in Local**
   - Voice Teacher View
   - Landing intent handling
   - Retry failed materials button
   - Code splitting with lazy loading

3. **Missing Local Features in Production**
   - Project support
   - View mode toggle
   - Error boundary
   - Prometheus monitoring

### 9.2 Database Migration Gaps

**Production has migrations that local might be missing:**
```
- 20260305000100_add_quiz_question_explanation.py
- 20251222221959_change_correct_option_to_text.py
- 971a0879e09f_add_podcast_fields_to_materials.py
- 8ff1e48b75ed_add_presentation_fields_to_materials.py
```

**Local has models that need migrations:**
```
- Project model
- MaterialChunk model
```

---

## 10. Recommendations for Synchronization

### Phase 1: Fix Local Bugs & UI Issues (Immediate - 1-2 days)

1. **Fix Quiz Tab Single Material View** ✅ (Already fixed)
   - Add `viewMode === 'single'` branch to Quiz tab
   - Test with `materialContent?.quiz`

2. **Replace Flashcards Tab with Production Version**
   - **Current Local Issue**: All flashcards displayed at once (dumped on page)
   - **Production Has**: Interactive flashcard deck with:
     - Card preview (first 3 cards)
     - "Start Review" button that navigates to dedicated flashcards view
     - Proper state management for flip/remember/forgot
   - **Action**: Copy `FlashcardsTab.tsx` from production to local tabs directory
   - **Note**: Production version navigates to `/dashboard/flashcards/${material.id}` for actual review

3. **Replace Quiz Tab with Production Version**
   - **Current Local Issue**: All questions displayed at once (dumped on page)
   - **Production Has**: Interactive quiz session with:
     - Quiz start screen with preview
     - One question at a time
     - Shuffled answer options
     - Progress bar
     - Score calculation with circular progress animation
     - Answer review at the end
     - "Try Again" functionality
   - **Action**: Copy `QuizTab.tsx` from production to local tabs directory
   - **Adaptation Needed**: Support both `content.quiz` (all materials) and `materialContent.quiz` (single material)

4. **Add Missing Tabs from Production**
   - **Chat Tab**: AI tutor chat with TTS (text-to-speech) support
     - Production has: `ChatTab` with voice synthesis
     - Local has: Basic chat without TTS
     - **Action**: Merge production ChatTab into local, add TTS functionality
   
   - **Podcast Tab**: Audio podcast generation with Edge TTS
     - Production has: Full podcast player with synchronized transcript
     - Local has: No podcast functionality
     - **Action**: Copy `PodcastTab.tsx` from production, ensure backend endpoints exist
   
   - **Slides Tab**: AI-generated presentation slides
     - Production has: Embedded presentation viewer (Gamma/Slides)
     - Local has: No slides functionality
     - **Action**: Copy `SlidesTab.tsx` from production, ensure backend endpoints exist

5. **Add Missing Production Features to Local**
   - Voice Teacher View component
   - Landing intent handling utilities
   - Retry failed materials button
   - Lazy loading with Suspense
   - Table of Contents panel for Summary view

### Phase 2: Merge Local Features to Production (Short-term - 2-3 days)

1. **Add Project Support**
   - Migrate `projects.py` endpoint to production
   - Add `Project` and `MaterialChunk` models to production database
   - Create database migrations for new models
   - Add view mode toggle UI ("All Materials" / "Single Material")
   - **Critical**: Ensure all tabs support both view modes:
     - Summary tab: ✅ Already supports both
     - Flashcards tab: ⚠️ Needs adaptation for "All Materials" mode
     - Quiz tab: ⚠️ Needs adaptation for "All Materials" mode
     - Chat tab: ❓ Needs clarification (chat per material or per project?)
     - Podcast tab: ❓ Needs clarification (podcast per material or per project?)
     - Slides tab: ❓ Needs clarification (slides per material or per project?)

2. **Add Monitoring & Logging**
   - Integrate Prometheus metrics to production
   - Add structured logging middleware
   - Add correlation ID tracking
   - Add `/metrics` endpoint

3. **Add Error Boundary**
   - Wrap production app with ErrorBoundary for graceful error handling

4. **Adapt Tab Components for Multi-Material Support**
   - **FlashcardsTab**: Add prop for view mode, combine flashcards from multiple materials when in "All Materials" mode
   - **QuizTab**: Add prop for view mode, combine questions from multiple materials when in "All Materials" mode
   - **SummaryTab**: Already supports both modes (uses `content.summary` vs `materialContent.summary`)
   - **PodcastTab**: May need to support project-level podcasts or show multiple material podcasts
   - **SlidesTab**: May need to support project-level slides or show multiple material slides

### Phase 3: Code Quality & Architecture Improvements (Medium-term - 1-2 weeks)

1. **Modularize Tab Components**
   - Production has inline tab components (harder to maintain)
   - Local has modular tab components in `/components/dashboard/tabs/`
   - **Action**: Extract production inline tab components to modular files
   - **Benefit**: Easier testing, maintenance, and feature additions

2. **Add Code Splitting to Local**
   - Implement lazy loading with `React.lazy()` and `Suspense`
   - Split large components (tabs, views) into separate chunks
   - **Benefit**: Faster initial page load, better performance

3. **Add Tests**
   - Migrate unit tests from production (`test_quiz_exam_contracts.py`)
   - Add integration tests for Project feature
   - Add frontend tests for tab components
   - Add E2E tests for critical user flows (upload → generate → study)

4. **Refactor Tab Architecture**
   - Create unified tab interface/props
   - Add support for view mode toggle in all tabs
   - Implement proper loading states for each tab
   - Add error boundaries within tabs

### Phase 4: Deployment Preparation (1-2 days)

1. **Update Deployment Scripts**
   - Merge production deploy scripts (`scripts/deploy.sh`) with local Docker configs
   - Update nginx configuration for new routes
   - Add systemd service file for production

2. **Database Migration Strategy**
   - Create migrations for Project and MaterialChunk models
   - Test migration rollback procedures
   - Backup production database before migration
   - Plan zero-downtime migration strategy

3. **Backend API Updates**
   - Add endpoints for Podcast generation (Edge TTS)
   - Add endpoints for Slides generation
   - Add TTS endpoint for Chat tab (tutor-speak)
   - Ensure all endpoints support both material and project contexts

4. **Frontend Configuration**
   - Update environment variables for new features
   - Add feature flags for gradual rollout
   - Update API client with new endpoints

5. **Documentation**
   - Update README with new features (Podcast, Slides, Chat TTS)
   - Document Project feature usage
   - Create user guide for new tabs
   - Update API documentation

### Phase 5: Testing & QA (1 week)

1. **Manual Testing**
   - Test all tabs in "Single Material" mode
   - Test all tabs in "All Materials" mode
   - Test view mode toggle functionality
   - Test podcast generation and playback
   - Test slides generation and viewing
   - Test chat TTS functionality
   - Test flashcards review flow
   - Test quiz session flow

2. **Performance Testing**
   - Test with large number of materials (50+)
   - Test with large flashcard decks (100+ cards)
   - Test with large quiz question sets (50+ questions)
   - Test podcast/slides generation under load

3. **Cross-Browser Testing**
   - Chrome, Firefox, Safari, Edge
   - Mobile responsive design
   - Tablet responsive design

4. **Bug Fixes**
   - Address any issues found during testing
   - Optimize performance bottlenecks
   - Fix UI/UX inconsistencies

---

## 11. Critical UI Issues to Fix Immediately

### 11.1 Flashcards Tab - Current State vs Required

**Current Local (BROKEN):**
```
❌ All flashcards dumped on page at once
❌ No interactive flip functionality
❌ No "Remember/Forgot" tracking
❌ No dedicated review mode
```

**Production (CORRECT):**
```
✅ Preview shows first 3 cards
✅ "Start Review" button navigates to dedicated view
✅ Full flashcard review experience at /dashboard/flashcards/:id
✅ Proper state management for flip/remember/forgot
```

**Fix:** Copy production `FlashcardsTab.tsx` to local tabs directory

### 11.2 Quiz Tab - Current State vs Required

**Current Local (BROKEN):**
```
❌ All questions dumped on page at once
❌ No interactive quiz session
❌ No progress tracking
❌ No score calculation
❌ No answer review
```

**Production (CORRECT):**
```
✅ Quiz start screen with deck preview
✅ One question at a time
✅ Shuffled answer options
✅ Progress bar
✅ Score calculation with circular animation
✅ Answer review at end
✅ "Try Again" functionality
```

**Fix:** Copy production `QuizTab.tsx` to local tabs directory, adapt for multi-material support

### 11.3 Missing Tabs

**Chat Tab:**
- Local: Basic chat without TTS
- Production: Chat with text-to-speech (listen to AI responses)
- **Action:** Merge production ChatTab TTS functionality

**Podcast Tab:**
- Local: Does not exist
- Production: Full podcast player with Edge TTS, synchronized transcript
- **Action:** Copy production PodcastTab, ensure backend support

**Slides Tab:**
- Local: Does not exist
- Production: Embedded presentation viewer (Gamma/Slides integration)
- **Action:** Copy production SlidesTab, ensure backend support

---

## 12. Updated File Inventory

### Files to Add to Production (from Local)
```
Frontend:
✓ src/pages/ProjectDetailView.tsx (with Quiz tab fix)
✓ src/components/dashboard/ProjectCard.tsx
✓ src/components/ErrorBoundary.tsx

Backend:
✓ app/api/v1/endpoints/projects.py
✓ app/infrastructure/database/models/project.py
✓ app/infrastructure/database/models/material_chunk.py
✓ app/middleware.py
✓ app/core/metrics.py
✓ app/infrastructure/utils/metrics.py

Configuration:
✓ docker-compose.prod.yml (merge with existing)
✓ Dockerfile (frontend)
✓ nginx.conf
```

### Files to Add to Local (from Production)
```
Frontend:
✓ src/components/dashboard/VoiceTeacherView.tsx
✓ src/utils/landingIntent.ts
✓ src/components/dashboard/ProjectDetailView.tsx (reference for tabs)
✓ Lazy loading implementation in App.tsx
✓ Retry failed materials UI

Tab Components (CRITICAL):
✓ FlashcardsTab.tsx (production version - interactive deck)
✓ QuizTab.tsx (production version - interactive quiz)
✓ ChatTab.tsx (production version - with TTS)
✓ PodcastTab.tsx (production version - audio player)
✓ SlidesTab.tsx (production version - presentation viewer)

Backend:
✓ alembic/versions/*.py (6 migration files)
✓ tests/unit/test_quiz_exam_contracts.py
✓ requirements/base.txt, dev.txt, prod.txt

Scripts:
✓ scripts/deploy.sh
✓ scripts/eduplatform.service
```

### Files to Merge/Adapt (Both Versions)
```
Tab Components for Multi-Material Support:
⚠️ FlashcardsTab.tsx - Add viewMode prop, combine flashcards from multiple materials
⚠️ QuizTab.tsx - Add viewMode prop, combine questions from multiple materials
⚠️ PodcastTab.tsx - Clarify: per-material or per-project podcasts?
⚠️ SlidesTab.tsx - Clarify: per-material or per-project slides?
⚠️ ChatTab.tsx - Clarify: chat per-material or per-project?

ProjectDetailView.tsx:
⚠️ Merge production UI enhancements (TOC panel, actions rail)
⚠️ Keep local view mode toggle functionality
⚠️ Ensure all tabs receive correct data based on view mode
```

---

## 13. Estimated Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| **Phase 1: Fix UI Issues** | 1-2 days | 🔴 Critical |
| **Phase 2: Merge Features** | 2-3 days | 🔴 Critical |
| **Phase 3: Code Quality** | 1-2 weeks | 🟡 Medium |
| **Phase 4: Deployment Prep** | 1-2 days | 🟡 Medium |
| **Phase 5: Testing & QA** | 1 week | 🟡 Medium |

**Total Estimated Time:** 3-4 weeks for full synchronization

---

## 14. Conclusion

The local version contains significant enhancements over production (Projects, monitoring, enhanced middleware), but is missing critical production features (Voice Teacher, landing intent, retry functionality). 

### Immediate Priorities (This Week):

1. **Fix Flashcards Tab UI** - Replace with production version (interactive deck, not dump all cards)
2. **Fix Quiz Tab UI** - Replace with production version (interactive quiz, not dump all questions)
3. **Add Missing Tabs** - Chat with TTS, Podcast, Slides
4. **Fix Quiz Tab "Single Material" Bug** - Already completed ✅

### Short-term Priorities (Next 2 Weeks):

1. **Add Project Support to Production** - Migrate projects.py endpoint and models
2. **Adapt Tabs for Multi-Material** - Support both "All Materials" and "Single Material" modes
3. **Create Database Migrations** - For Project and MaterialChunk models
4. **Add Production Features to Local** - Voice Teacher, landing intent, retry functionality

### Medium-term Priorities (Next Month):

1. **Code Quality Improvements** - Lazy loading, modular tabs, unified interfaces
2. **Testing** - Unit tests, integration tests, E2E tests
3. **Deployment Preparation** - Scripts, migrations, documentation

**Risk Level:** Medium-High (database schema changes, new features)

---

*Report generated: 2026-03-04*  
*Last updated: 2026-03-04 with Flashcards/Quiz/Chat/Podcast/Slides tab analysis*

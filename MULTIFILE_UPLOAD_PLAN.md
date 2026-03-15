# 📋 Plan: Multi-File Material Upload per Project

**Date:** March 4, 2026  
**Status:** Draft  
**Author:** AI Assistant

---

## 🎯 Goal

Enable users to upload **up to 10 files** (PDF, YouTube URLs, web links) to a **single project**, with all materials being processed together to generate unified learning content (flashcards, quizzes, summaries, etc.) based on the **combined content** of all materials.

---

## 📊 Current Architecture Analysis

### Current Flow (Single File)
```
Frontend → Upload 1 file → Backend creates Material → Celery processes → AI generates content
```

### Target Flow (Multi-File)
```
Frontend → Upload 1-10 files → Backend creates multiple Materials linked to Project → 
Celery processes each → Combine all text → AI generates unified content per Project
```

---

## 🏗️ Architecture Changes

### 1. Database Schema Changes

#### Current State
- ✅ `Project` entity exists with `materials` relationship
- ✅ `Material` has `project_id` foreign key
- ✅ `Flashcard`, `QuizQuestion` linked to `Material`

#### Required Changes

**A. Add Project-level AI Content Tables**

```sql
-- New table for project-level summaries
CREATE TABLE project_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- New table for project-level notes
CREATE TABLE project_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    notes TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- New table for project-level flashcards
CREATE TABLE project_flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- New table for project-level quiz questions
CREATE TABLE project_quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- New table for project-level embeddings (RAG)
CREATE TABLE project_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(3072),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**B. Update Material Model**

Add field to track if material is part of multi-file upload:
```python
# In Material model
batch_id = Column(UUID(as_uuid=True), nullable=True)  # Groups materials uploaded together
```

**C. Add Project Processing Status**

```python
class ProjectProcessingStatus(str, enum.Enum):
    PENDING = "pending"  # Waiting for all materials to upload
    PROCESSING = "processing"  # Processing materials
    GENERATING = "generating"  # Generating AI content
    COMPLETED = "completed"
    FAILED = "failed"
```

---

### 2. Backend API Changes

#### A. New Upload Endpoint

**Current:**
```python
POST /api/v1/materials
- Accepts: single file
- Returns: single material
```

**New:**
```python
POST /api/v1/projects/{project_id}/materials/batch
- Accepts: List[UploadFile] (max 10) + List[str] for YouTube URLs
- Returns: List[Material] with batch_id
- Triggers: Background task for batch processing
```

**Request Schema:**
```python
class BatchMaterialUpload(BaseModel):
    files: List[UploadFile] = File(...)  # Max 10 files
    youtube_urls: List[str] = Form(default=[])  # Max 10 URLs
    link_urls: List[str] = Form(default=[])  # Max 10 web links
    project_id: UUID = Form(...)
```

**Response Schema:**
```python
class BatchUploadResponse(BaseModel):
    batch_id: UUID
    project_id: UUID
    materials: List[MaterialResponse]
    status: str  # "queued", "processing"
    total_files: int
```

#### B. New Project-level Content Endpoints

```python
# Get project-level summary
GET /api/v1/projects/{project_id}/summary

# Get project-level notes
GET /api/v1/projects/{project_id}/notes

# Get project-level flashcards
GET /api/v1/projects/{project_id}/flashcards

# Get project-level quiz
GET /api/v1/projects/{project_id}/quiz

# Regenerate project content
POST /api/v1/projects/{project_id}/regenerate
```

---

### 3. Celery Task Changes

#### Current Task Flow
```
process_material_task(material_id)
  ↓
Extract text from single material
  ↓
Generate AI content for single material
  ↓
Save to Material
```

#### New Task Flow

**Task 1: Process Individual Materials**
```python
@celery_app.task
def process_material_batch_task(batch_id: UUID, material_ids: List[UUID]):
    """
    Process all materials in a batch.
    
    Steps:
    1. Process each material individually (extract text)
    2. Wait for all to complete
    3. Combine all text
    4. Trigger project-level AI generation
    """
    # Process each material
    for material_id in material_ids:
        process_single_material(material_id)
    
    # Combine texts
    combined_text = combine_material_texts(material_ids)
    
    # Generate project-level content
    generate_project_content.delay(batch_id, combined_text)
```

**Task 2: Generate Project-level Content**
```python
@celery_app.task
def generate_project_content_task(batch_id: UUID, combined_text: str):
    """
    Generate AI content for entire project.
    
    Steps:
    1. Generate summary from combined text
    2. Generate notes from combined text
    3. Generate flashcards (15-20) from combined text
    4. Generate quiz (10-15 questions) from combined text
    5. Create embeddings for RAG
    6. Update project status
    """
    # Parallel AI generation
    summary, notes, flashcards, quiz = await asyncio.gather(
        ai_service.generate_summary(combined_text),
        ai_service.generate_notes(combined_text),
        ai_service.generate_flashcards(combined_text, count=20),
        ai_service.generate_quiz(combined_text, count=15),
    )
    
    # Save to project-level tables
    save_project_content(batch_id, summary, notes, flashcards, quiz)
    
    # Create embeddings
    create_project_embeddings(batch_id, combined_text)
```

---

### 4. Frontend Changes

#### A. UploadModal Component Updates

**Current:**
- Single file upload
- No project association

**Required Changes:**
```typescript
interface UploadModalProps {
  projectId?: UUID;  // Optional: link to existing project
  onCreateProject?: (name: string) => Promise<UUID>;  // Create new project
  onClose: () => void;
  onSuccess?: (projectId: UUID) => void;
}
```

**New Flow:**
1. User opens UploadModal
2. If no projectId provided:
   - Show "Project Name" input
   - Create new project on submit
3. User selects 1-10 files (mix of PDF, YouTube, Links)
4. Upload all files with `projectId`
5. Redirect to Project Detail page with progress tracking

#### B. New Project Creation Flow

```typescript
// In UploadModal
const handleProjectCreation = async () => {
  // 1. Create project if needed
  const projectId = projectName 
    ? await createProject(projectName)
    : existingProjectId;
  
  // 2. Prepare batch upload
  const formData = new FormData();
  formData.append('project_id', projectId);
  
  // Add files (max 10)
  files.forEach(file => {
    formData.append('files', file);
  });
  
  // Add YouTube URLs
  youtubeUrls.forEach(url => {
    formData.append('youtube_urls', url);
  });
  
  // Add Link URLs
  linkUrls.forEach(url => {
    formData.append('link_urls', url);
  });
  
  // 3. Upload batch
  const response = await uploadBatchMaterials(formData);
  
  // 4. Navigate to project page
  navigate(`/dashboard/projects/${projectId}`);
};
```

#### C. Project Detail Page Updates

**New Components Needed:**
```typescript
// src/components/dashboard/ProjectDetailView.tsx
- Show all materials in project
- Show processing status for each material
- Show combined progress bar
- Display project-level content (summary, notes, flashcards, quiz)
```

**Progress Tracking:**
```typescript
interface ProjectProgress {
  totalMaterials: number;
  processedMaterials: number;
  generatingContent: boolean;
  completed: boolean;
  materials: Array<{
    id: UUID;
    title: string;
    status: ProcessingStatus;
    progress: number;
  }>;
}
```

---

### 5. File Storage Structure

#### Current
```
storage/materials/{user_id}/{filename}
```

#### New (Optional Enhancement)
```
storage/materials/{user_id}/projects/{project_id}/{filename}
storage/materials/{user_id}/projects/{project_id}/{batch_id}/{filename}
```

---

## 📝 Implementation Steps

### Phase 1: Database & Models (Day 1-2)

1. **Create Alembic Migrations**
   ```bash
   make db-migrate-create msg="add_project_level_content_tables"
   make db-migrate-create msg="add_material_batch_id"
   make db-migrate-create msg="add_project_processing_status"
   ```

2. **Create SQLAlchemy Models**
   - `ProjectSummary`
   - `ProjectNotes`
   - `ProjectFlashcard`
   - `ProjectQuizQuestion`
   - `ProjectEmbedding`
   - Update `Material` with `batch_id`

3. **Create Pydantic Schemas**
   - `BatchMaterialUpload`
   - `BatchUploadResponse`
   - `ProjectContentResponse`

---

### Phase 2: Backend API (Day 3-4)

1. **Create Batch Upload Endpoint**
   - `POST /api/v1/projects/{project_id}/materials/batch`
   - File validation (max 10, file types, sizes)
   - Save files to storage
   - Create Material records
   - Generate `batch_id`

2. **Create Project Content Endpoints**
   - `GET /api/v1/projects/{project_id}/summary`
   - `GET /api/v1/projects/{project_id}/notes`
   - `GET /api/v1/projects/{project_id}/flashcards`
   - `GET /api/v1/projects/{project_id}/quiz`
   - `POST /api/v1/projects/{project_id}/regenerate`

3. **Update Projects Endpoint**
   - Add project creation with materials
   - Add project list with material counts

---

### Phase 3: Celery Tasks (Day 5-6)

1. **Create Batch Processing Task**
   ```python
   @celery_app.task
   def process_material_batch_task(batch_id, material_ids)
   ```

2. **Create Project Content Generation Task**
   ```python
   @celery_app.task
   def generate_project_content_task(batch_id, combined_text)
   ```

3. **Update Task Orchestration**
   - Chain tasks: process → combine → generate
   - Add progress tracking
   - Add error handling & rollback

---

### Phase 4: Frontend (Day 7-9)

1. **Update UploadModal Component**
   - Multi-file selection UI
   - File type icons (PDF, YouTube, Link)
   - File removal
   - Project name input
   - Progress indicator

2. **Create Project Detail Page**
   - Material list with status
   - Combined progress bar
   - Project content tabs (Summary, Notes, Flashcards, Quiz)
   - Real-time status updates (polling or WebSocket)

3. **Update Navigation**
   - Navigate to project after upload
   - Show project in dashboard
   - Add project-level actions

---

### Phase 5: Testing & Polish (Day 10-11)

1. **Backend Tests**
   - Unit tests for batch upload
   - Integration tests for Celery tasks
   - API endpoint tests

2. **Frontend Tests**
   - Component tests for UploadModal
   - E2E tests for upload flow

3. **UX Improvements**
   - Loading states
   - Error messages
   - Success notifications
   - Progress animations

---

## 🔒 Validation & Limits

### File Limits
```python
MAX_FILES_PER_BATCH = 10
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_FILE_TYPES = ["pdf", "docx", "txt", "md", "html"]
MAX_YOUTUBE_URLS = 10
MAX_LINK_URLS = 10
```

### Validation Rules
```python
# In endpoint
if len(files) + len(youtube_urls) + len(link_urls) > MAX_FILES_PER_BATCH:
    raise HTTPException(400, "Maximum 10 materials per project")

for file in files:
    if file.size > MAX_FILE_SIZE:
        raise HTTPException(400, f"File {file.filename} exceeds 50MB limit")
    
    if get_file_extension(file) not in ALLOWED_FILE_TYPES:
        raise HTTPException(400, f"File type not allowed: {file.filename}")
```

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Frontend  │
│  (React UI) │
└──────┬──────┘
       │
       │ POST /projects/{id}/materials/batch
       │ [files: 10, youtube_urls: [], link_urls: []]
       ▼
┌─────────────────────────────┐
│   Backend (FastAPI)         │
│  1. Validate files          │
│  2. Save to storage         │
│  3. Create Material records │
│  4. Generate batch_id       │
│  5. Queue Celery task       │
└──────────────┬──────────────┘
               │
               │ process_material_batch_task(batch_id, material_ids)
               ▼
┌─────────────────────────────┐
│   Celery Worker             │
│  1. Process each material   │
│     - Extract text          │
│     - Update status         │
│  2. Combine all texts       │
│  3. Queue content generation│
└──────────────┬──────────────┘
               │
               │ generate_project_content_task(batch_id, combined_text)
               ▼
┌─────────────────────────────┐
│   Celery Worker (AI)        │
│  1. Generate summary        │
│  2. Generate notes          │
│  3. Generate flashcards     │
│  4. Generate quiz           │
│  5. Create embeddings       │
│  6. Save to project tables  │
└──────────────┬──────────────┘
               │
               │ Update project status = COMPLETED
               ▼
┌─────────────────────────────┐
│   Frontend (Polling)        │
│  - Check project status     │
│  - Show progress            │
│  - Display content          │
└─────────────────────────────┘
```

---

## 🎨 UI/UX Considerations

### Upload Modal
- Show file count: "3/10 files selected"
- Drag & drop for multiple files
- File type badges (PDF icon, YouTube icon, Link icon)
- Remove individual files
- Show file sizes

### Project Page
- Material list with individual status
- Overall project progress bar
- Estimated time remaining
- Notifications on completion
- Tabs for different content types

### Error Handling
- Clear error messages for failed uploads
- Retry mechanism for failed materials
- Partial success handling (some files fail, others succeed)

---

## 🚀 Rollout Strategy

### Option A: Big Bang
- Deploy all changes at once
- Pros: Clean implementation
- Cons: Higher risk, longer downtime

### Option B: Phased Rollout (Recommended)
1. **Phase 1:** Backend-only (database + API)
2. **Phase 2:** Celery tasks
3. **Phase 3:** Frontend ( UploadModal)
4. **Phase 4:** Frontend (Project pages)
5. **Phase 5:** Testing & optimization

---

## 📈 Future Enhancements

1. **Mixed Content Types:** Allow mixing PDFs, YouTube, and links in same project
2. **Incremental Upload:** Add more materials to existing project
3. **Material Grouping:** Group materials by topic within project
4. **Collaborative Projects:** Multiple users contribute to same project
5. **Material Versioning:** Track changes to materials over time
6. **Smart Chunking:** AI-powered text chunking for better embeddings

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large combined text exceeds LLM context | High | Implement smart summarization before generation |
| Long processing time for 10 files | Medium | Show progress, send email on completion |
| Database performance with embeddings | Medium | Index optimization, pagination |
| File storage costs | Low | Implement cleanup, compression |
| Celery task failures | Medium | Retry logic, dead letter queue |

---

## ✅ Success Criteria

- [ ] Users can upload 1-10 files to a project
- [ ] All files are processed and linked to project
- [ ] AI content is generated from combined text
- [ ] Project detail page shows all materials and content
- [ ] Progress tracking works in real-time
- [ ] Error handling is robust
- [ ] Performance is acceptable (< 5 min for 10 PDFs)

---

## 📚 Related Documentation

- [Backend API Documentation](http://localhost:8000/docs)
- [Deployment Guide](DEPLOYMENT.md)
- [Setup Guide](backend/SETUP_GUIDE.md)
- [YouTube Processing](backend/YOUTUBE_PROCESSING.md)
- [Document Formats](backend/DOCUMENT_FORMATS.md)

---

**Status:** Ready for Implementation  
**Estimated Time:** 10-12 days  
**Priority:** High

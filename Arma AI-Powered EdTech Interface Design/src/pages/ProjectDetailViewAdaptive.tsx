import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Folder, Plus, Trash2, Loader2, MessageSquare, BookOpen, BrainCircuit, ClipboardList, FileText, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useProject, useProjectContent, useMaterialContent, useTutorChat } from '../hooks/useApi';
import { toast } from 'sonner';
import { projectsApi, userApi, type LearningProgressData } from '@/services/api';
import type { Flashcard, QuizQuestion } from '@/types/api';
import { FlashcardsTab } from '../components/dashboard/tabs/FlashcardsTab';
import { QuizTab } from '../components/dashboard/tabs/QuizTab';
import { ChatTab } from '../components/dashboard/tabs/ChatTab';
import { ProcessingModal, ProgressiveReveal, OnboardingTour, DashboardHero } from '../components/dashboard';
import { useMaterialUpload } from '../hooks/useMaterialUpload';
import {
  LearningRoadmap,
  RoadmapProgressSidebar,
  SummaryWithTimer,
  AIChatSidebar,
  FlashcardDeck,
  QuizWithThreshold,
} from '../components/learning';

export function ProjectDetailViewAdaptive() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, loading, refetch } = useProject(projectId || null);
  const { content, loading: contentLoading } = useProjectContent(projectId || null);
  
  // Adaptive Learning State
  const [learningProgress, setLearningProgress] = useState<LearningProgressData | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('summary');
  const [showRoadmapSidebar, setShowRoadmapSidebar] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'materials' | 'summary' | 'flashcards' | 'quiz' | 'roadmap'>('roadmap');
  
  // Upload flow
  const {
    uploading,
    showProcessingModal,
    status: uploadStatus,
    isComplete: uploadComplete,
    isFailed: uploadFailed,
    statusError: uploadError,
    startUpload,
    handleCloseModal,
  } = useMaterialUpload(refetch);

  const [isDeleting, setIsDeleting] = useState(false);

  // Load learning progress when material is selected
  useEffect(() => {
    if (project && project.materials.length > 0 && !learningProgress) {
      const firstMaterialId = project.materials[0].id;
      userApi.getLearningProgress(firstMaterialId)
        .then(setLearningProgress)
        .catch(console.error);
    }
  }, [project]);

  // Auto-refresh processing materials
  useEffect(() => {
    if (!projectId || !project) return;

    const hasProcessingMaterials = project.materials.some(
      m => {
        const status = (m.processing_status || '').toLowerCase();
        return status === 'queued' || status === 'processing';
      }
    );

    if (!hasProcessingMaterials) return;

    const interval = setInterval(async () => {
      await refetch(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [projectId, project?.materials.map(m => `${m.id}-${m.processing_status}`).join(','), refetch]);

  // Redirect to single material if only one exists
  useEffect(() => {
    if (!project || loading) return;
    if (project.materials.length === 1) {
      navigate(`/dashboard/materials/${project.materials[0].id}`, { replace: true });
    }
  }, [project, loading, navigate]);

  // Upload handlers
  const handleUploadPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.doc,.txt,.md,.html,.rtf,.odt,.epub';
    input.multiple = false;

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await startUpload(async () => {
          const formData = new FormData();
          formData.append('title', file.name);
          formData.append('material_type', 'pdf');
          formData.append('file', file);
          if (projectId) {
            formData.append('project_id', projectId);
          }

          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/v1/materials`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
          }

          const material = await response.json();
          return material.id;
        });
      } catch (error) {
        console.error('[handleUploadPDF] Error:', error);
      }
    };

    input.click();
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    if (!confirm(`Are you sure you want to delete project "${project.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await projectsApi.delete(projectId!);
      toast.success('Project deleted successfully');
      window.dispatchEvent(new CustomEvent('project-deleted', { detail: { projectId } }));
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle stage completion
  const handleStageComplete = async (stage: string, data?: any) => {
    if (!project || project.materials.length === 0) return;
    
    const materialId = project.materials[0].id;
    
    try {
      const result = await userApi.completeStage(materialId, stage, data);
      setLearningProgress(prev => prev ? { ...prev, current_stage: result.next_stage } : null);
      setCurrentStage(result.next_stage);
      toast.success(`Stage "${stage}" completed!`);
    } catch (error: any) {
      console.error('Error completing stage:', error);
      toast.error(error.response?.data?.detail || 'Failed to save progress');
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
    if (!project || project.materials.length === 0) return;
    
    const materialId = project.materials[0].id;
    
    try {
      const quizResult = await userApi.submitQuizResult(materialId, result);
      
      if (quizResult.passed) {
        toast.success(`Quiz passed! Score: ${quizResult.score_percentage}%`);
        setCurrentStage('completed');
      } else {
        toast.info(`Quiz not passed (${quizResult.score_percentage}%). Recommended: Study presentation.`);
        setCurrentStage('presentation');
      }
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    }
  };

  if (!projectId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0C0C0F]">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </button>
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-10 h-10 bg-[#FF8A3D]/10 rounded-xl flex items-center justify-center">
                  <Folder className="w-5 h-5 text-[#FF8A3D]" />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold text-white md:text-xl">{project?.name || 'Loading...'}</h1>
                  <p className="text-sm text-white/40">
                    {project?.materials.length || 0} materials
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRoadmapSidebar(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium cursor-pointer"
              >
                📊 Progress
              </button>
              <button
                onClick={handleUploadPDF}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF8A3D] text-white rounded-lg hover:bg-[#FF8A3D]/90 transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Material</span>
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting || !project}
                className="flex w-auto items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span className="hidden sm:inline text-sm font-medium">Delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'roadmap'
                  ? 'border-[#FF8A3D] text-[#FF8A3D]'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              📊 Learning Path
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'chat'
                  ? 'border-[#FF8A3D] text-[#FF8A3D]'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <MessageSquare size={16} />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'materials'
                  ? 'border-[#FF8A3D] text-[#FF8A3D]'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <FileText size={16} />
              Materials
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'border-[#FF8A3D] text-[#FF8A3D]'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <BookOpen size={16} />
              Summary
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'flashcards'
                  ? 'border-[#FF8A3D] text-[#FF8A3D]'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <BrainCircuit size={16} />
              Flashcards
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'border-[#FF8A3D] text-[#FF8A3D]'
                  : 'border-transparent text-white/40 hover:text-white/60'
              }`}
            >
              <ClipboardList size={16} />
              Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Learning Roadmap Tab */}
        {activeTab === 'roadmap' && learningProgress && (
          <LearningRoadmap
            progress={learningProgress}
            onStageClick={(stage) => setCurrentStage(stage)}
          />
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && project && (
          <>
            {project.materials.length === 0 && (
              <div className="py-12">
                <DashboardHero
                  onUploadPDF={handleUploadPDF}
                  onUploadVideo={() => {}}
                  onUploadNotes={handleUploadPDF}
                  isUploading={uploading}
                />
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8"
            >
              {project.materials.map((material, index) => (
                <ProgressiveReveal
                  key={material.id}
                  sectionId={material.id}
                  delay={200}
                  staggerDelay={index * 100}
                >
                  <div className="group cursor-pointer p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-[#FF8A3D]/20 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#FF8A3D]/10 flex items-center justify-center text-[#FF8A3D]">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-xs font-medium flex items-center gap-1">
                        <CheckCircle size={12} />
                        Ready
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-white/90 mb-3 line-clamp-2">
                      {material.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <FileText size={12} />
                      <span className="uppercase">{material.type}</span>
                    </div>
                  </div>
                </ProgressiveReveal>
              ))}
            </motion.div>
          </>
        )}

        {/* Summary Tab - Adaptive Learning Version */}
        {activeTab === 'summary' && project && project.materials.length > 0 && (
          <SummaryWithTimer
            materialId={project.materials[0].id}
            onComplete={(readTime) => handleStageComplete('summary', { read_time_seconds: readTime })}
            onOpenChat={(text) => {
              setSelectedQuestion(text);
              setShowChatSidebar(true);
            }}
          />
        )}

        {/* Flashcards Tab - Adaptive Learning Version */}
        {activeTab === 'flashcards' && content && content.flashcards && (
          <FlashcardDeck
            flashcards={content.flashcards as Flashcard[]}
            onComplete={(viewedCount) => handleStageComplete('flashcards', { viewed_count: viewedCount })}
            materialId={project.materials[0]?.id}
          />
        )}

        {/* Quiz Tab - Adaptive Learning Version */}
        {activeTab === 'quiz' && content && content.quiz && (
          <QuizWithThreshold
            questions={content.quiz as QuizQuestion[]}
            onSubmit={handleQuizSubmit}
            passThreshold={70}
            materialId={project.materials[0]?.id}
          />
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && project && (
          <ChatTab
            material={project.materials[0] as any}
            messages={[]}
            sendMessage={async () => {}}
            sending={false}
            loading={false}
            isTyping={false}
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
        materialId={project?.materials[0]?.id}
        isOpen={showChatSidebar}
        onClose={() => setShowChatSidebar(false)}
        initialQuestion={selectedQuestion}
      />

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={showProcessingModal}
        realProgress={uploadStatus?.progress || 0}
        isComplete={uploadComplete}
        isError={uploadFailed}
        onClose={handleCloseModal}
      />
    </div>
  );
}

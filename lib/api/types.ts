/**
 * TypeScript типы для API responses (соответствуют Pydantic schemas в Python)
 */

// ===== Auth =====

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ===== Quiz =====

export type CorrectOption = 'a' | 'b' | 'c' | 'd';

export interface QuizQuestion {
  id: string;
  material_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  created_at: string;
}

export interface QuizQuestionWithAnswer extends QuizQuestion {
  correct_option: CorrectOption;
}

export interface QuizListResponse {
  questions: QuizQuestion[];
  total: number;
}

export interface QuizAnswerRequest {
  question_id: string;
  selected_option: CorrectOption;
}

export interface QuizAnswerResponse {
  question_id: string;
  is_correct: boolean;
  correct_option: CorrectOption;
  selected_option: CorrectOption;
}

export interface QuizAttemptRequest {
  answers: QuizAnswerRequest[];
}

export interface QuizAttemptResponse {
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  results: QuizAnswerResponse[];
}

// ===== Quiz Attempt Storage =====

export interface QuizAttemptAnswerDetail {
  question_id: string;
  selected: CorrectOption;
  correct: boolean;
  correct_option: CorrectOption;
}

export interface QuizAttemptSaveRequest {
  material_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  answers: QuizAttemptAnswerDetail[];
}

export interface QuizAttemptHistoryResponse {
  id: string;
  user_id: string;
  material_id: string;
  score: number;
  total_questions: number;
  percentage: number;
  completed_at: string;
  answers: QuizAttemptAnswerDetail[];
  created_at: string;
}

export interface QuizStatisticsResponse {
  total_attempts: number;
  best_score: number;
  best_percentage: number;
  average_score: number;
  average_percentage: number;
  last_attempt: QuizAttemptHistoryResponse | null;
  attempts: QuizAttemptHistoryResponse[];
}

// ===== Materials =====

export type MaterialType = 'pdf' | 'youtube';
export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Material {
  id: string;
  user_id: string;
  title: string;
  type: MaterialType;
  file_path?: string;
  file_name?: string;
  source?: string;
  processing_status: ProcessingStatus;
  processing_progress: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialDetailResponse extends Material {
  full_text?: string;
  summary?: string;
  notes?: string;
}

export interface MaterialCreateRequest {
  title: string;
  type: MaterialType;
  source?: string;
}

// ===== Flashcards =====

export interface Flashcard {
  id: string;
  material_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface FlashcardListResponse {
  flashcards: Flashcard[];
  total: number;
}

// ===== Tutor Chat =====

export type TutorMessageRole = 'user' | 'assistant';
export type TutorMessageContext = 'chat' | 'selection';

export interface TutorMessage {
  id: string;
  material_id: string;
  role: TutorMessageRole;
  content: string;
  context: TutorMessageContext;
  created_at: string;
}

export interface TutorMessageRequest {
  message: string;
  context?: TutorMessageContext;
}

export interface TutorMessageResponse extends TutorMessage {}

export interface TutorChatHistoryResponse {
  messages: TutorMessage[];
  total: number;
}

// ===== Common =====

export interface MessageResponse {
  message: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

import { FileText, Youtube, Link as LinkIcon, Headphones } from 'lucide-react';

// --- TYPES ---

export type ProjectType = 'PDF' | 'YouTube' | 'Link';
export type ProjectStatus = 'READY' | 'PROCESSING' | 'FAILED';

export interface TOCSection {
  id: string;
  title: string;
  keyTopics: string[];
  estimatedMinutes: number;
  isCompleted?: boolean;
}

export interface Card {
  id: number;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'known';
  nextReview?: string;
}

export interface Deck {
  id: number;
  projectId: number;
  title: string;
  cards: Card[];
  lastStudied?: string;
  dueCount: number;
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: number;
  projectId: number;
  title: string;
  questions: QuizQuestion[];
  isCompleted: boolean;
  score?: number;
}

export interface Project {
  id: number;
  type: ProjectType;
  title: string;
  source: string;
  meta: string; // "42 pages", "18 min"
  addedDate: string; // ISO date
  lastOpened: string; // "2h ago", "Yesterday" - display string
  lastOpenedDate: string; // ISO date for sorting
  status: ProjectStatus;
  progressPercent: number; // 0-100 (for processing or learning)
  tags: string[];
  outputs: {
    chatCount: number;
    flashcardsCount: number;
    quizCount: number;
    summaryExists: boolean;
    podcastExists: boolean;
    slidesExists: boolean;
  };
  toc: TOCSection[];
  isPinned?: boolean;
  isArchived?: boolean;
}

// --- MOCK DATA ---

const TOC_TEMPLATE_PDF = [
  { id: 's1', title: 'Introduction & Core Concepts', keyTopics: ['Definitions', 'History'], estimatedMinutes: 15 },
  { id: 's2', title: 'Theoretical Framework', keyTopics: ['Models', 'Paradigms'], estimatedMinutes: 25 },
  { id: 's3', title: 'Case Studies', keyTopics: ['Application', 'Results'], estimatedMinutes: 20 },
  { id: 's4', title: 'Conclusion', keyTopics: ['Summary', 'Future Work'], estimatedMinutes: 10 },
];

const TOC_TEMPLATE_YT = [
  { id: 't1', title: '00:00 - Introduction', keyTopics: ['Intro'], estimatedMinutes: 2 },
  { id: 't2', title: '02:15 - Main Argument', keyTopics: ['Thesis'], estimatedMinutes: 10 },
  { id: 't3', title: '12:30 - Examples', keyTopics: ['Demo'], estimatedMinutes: 5 },
  { id: 't4', title: '16:45 - Final Thoughts', keyTopics: ['Summary'], estimatedMinutes: 3 },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    type: 'PDF',
    title: 'Advanced Quantum Mechanics',
    source: 'Quantum_Mech_Adv_2024.pdf',
    meta: '42 pages',
    addedDate: '2023-11-15T10:00:00Z',
    lastOpened: '2h ago',
    lastOpenedDate: '2023-12-17T14:30:00Z',
    status: 'READY',
    progressPercent: 45,
    tags: ['Physics', 'University', 'Exam Prep'],
    outputs: { chatCount: 12, flashcardsCount: 24, quizCount: 2, summaryExists: true, podcastExists: true, slidesExists: false },
    toc: TOC_TEMPLATE_PDF,
    isPinned: true,
  },
  {
    id: 2,
    type: 'PDF',
    title: 'Introduction to Neural Networks',
    source: 'Intro_NN_v2.pdf',
    meta: '156 pages',
    addedDate: '2023-10-20T09:00:00Z',
    lastOpened: '2 days ago',
    lastOpenedDate: '2023-12-15T10:00:00Z',
    status: 'PROCESSING',
    progressPercent: 10,
    tags: ['AI', 'CS', 'Work'],
    outputs: { chatCount: 0, flashcardsCount: 0, quizCount: 0, summaryExists: false, podcastExists: false, slidesExists: false },
    toc: [],
    isPinned: false,
  },
  {
    id: 3,
    type: 'YouTube',
    title: 'The History of Modern Art',
    source: 'youtu.be/k9s8d7f',
    meta: '18 min',
    addedDate: '2023-11-18T14:20:00Z',
    lastOpened: 'Yesterday',
    lastOpenedDate: '2023-12-16T16:45:00Z',
    status: 'READY',
    progressPercent: 80,
    tags: ['Art', 'History'],
    outputs: { chatCount: 8, flashcardsCount: 10, quizCount: 1, summaryExists: true, podcastExists: false, slidesExists: true },
    toc: TOC_TEMPLATE_YT,
    isPinned: true,
  },
  {
    id: 4,
    type: 'YouTube',
    title: 'Calculus 101 — Limits',
    source: 'youtu.be/calc101',
    meta: '45 min',
    addedDate: '2023-11-10T08:00:00Z',
    lastOpened: 'Last week',
    lastOpenedDate: '2023-12-10T09:30:00Z',
    status: 'READY',
    progressPercent: 60,
    tags: ['Math', 'University'],
    outputs: { chatCount: 3, flashcardsCount: 15, quizCount: 2, summaryExists: true, podcastExists: false, slidesExists: false },
    toc: TOC_TEMPLATE_YT,
    isPinned: false,
  },
  {
    id: 5,
    type: 'PDF',
    title: 'Business Strategy 2024',
    source: 'Strategy_Q1.pdf',
    meta: '12 pages',
    addedDate: '2023-11-01T11:00:00Z',
    lastOpened: 'Last week',
    lastOpenedDate: '2023-12-08T11:00:00Z',
    status: 'READY',
    progressPercent: 100,
    tags: ['Work', 'Strategy'],
    outputs: { chatCount: 2, flashcardsCount: 5, quizCount: 1, summaryExists: true, podcastExists: false, slidesExists: true },
    toc: TOC_TEMPLATE_PDF,
    isPinned: false,
  },
  {
    id: 6,
    type: 'PDF',
    title: 'Cognitive Psychology — Lecture Notes',
    source: 'Psych_Lecture_3.pdf',
    meta: '33 pages',
    addedDate: '2023-11-19T13:00:00Z',
    lastOpened: '3h ago',
    lastOpenedDate: '2023-12-17T13:30:00Z',
    status: 'READY',
    progressPercent: 25,
    tags: ['Psychology', 'Exam'],
    outputs: { chatCount: 4, flashcardsCount: 30, quizCount: 0, summaryExists: true, podcastExists: false, slidesExists: false },
    toc: TOC_TEMPLATE_PDF,
    isPinned: false,
  },
  {
    id: 7,
    type: 'PDF',
    title: 'English B2 Vocabulary Pack',
    source: 'Vocab_B2.pdf',
    meta: '24 pages',
    addedDate: '2023-11-12T15:00:00Z',
    lastOpened: 'Yesterday',
    lastOpenedDate: '2023-12-16T09:00:00Z',
    status: 'READY',
    progressPercent: 55,
    tags: ['Languages', 'English'],
    outputs: { chatCount: 1, flashcardsCount: 100, quizCount: 5, summaryExists: false, podcastExists: false, slidesExists: false },
    toc: TOC_TEMPLATE_PDF,
    isPinned: false,
  },
  {
    id: 8,
    type: 'Link',
    title: 'German A2 Basics',
    source: 'dw.com/learn-german',
    meta: 'Webpage',
    addedDate: '2023-11-05T10:00:00Z',
    lastOpened: '5 days ago',
    lastOpenedDate: '2023-12-12T10:00:00Z',
    status: 'READY',
    progressPercent: 30,
    tags: ['Languages', 'German'],
    outputs: { chatCount: 2, flashcardsCount: 40, quizCount: 1, summaryExists: true, podcastExists: false, slidesExists: false },
    toc: [],
    isPinned: false,
  },
  {
    id: 9,
    type: 'YouTube',
    title: 'Microeconomics — Supply & Demand',
    source: 'youtu.be/micro1',
    meta: '22 min',
    addedDate: '2023-11-14T16:00:00Z',
    lastOpened: 'Last week',
    lastOpenedDate: '2023-12-09T16:00:00Z',
    status: 'READY',
    progressPercent: 90,
    tags: ['Economics', 'Exam'],
    outputs: { chatCount: 6, flashcardsCount: 20, quizCount: 2, summaryExists: true, podcastExists: false, slidesExists: false },
    toc: TOC_TEMPLATE_YT,
    isPinned: false,
  },
  {
    id: 10,
    type: 'PDF',
    title: 'Project Management Cheat Sheet',
    source: 'PM_CheatSheet.pdf',
    meta: '9 pages',
    addedDate: '2023-10-30T09:00:00Z',
    lastOpened: 'Last month',
    lastOpenedDate: '2023-11-17T09:00:00Z',
    status: 'FAILED',
    progressPercent: 0,
    tags: ['Work', 'Productivity'],
    outputs: { chatCount: 0, flashcardsCount: 0, quizCount: 0, summaryExists: false, podcastExists: false, slidesExists: false },
    toc: [],
    isPinned: false,
  },
];

// MOCK DECKS
export const MOCK_DECKS: Deck[] = [
  { 
    id: 1, 
    projectId: 1, 
    title: 'Quantum Physics Basics', 
    dueCount: 12, 
    cards: Array(24).fill(0).map((_, i) => ({ id: i, front: `Concept ${i+1}`, back: `Definition of concept ${i+1}`, status: i < 10 ? 'known' : 'new' }))
  },
  { 
    id: 2, 
    projectId: 3, 
    title: 'Modern Art History', 
    dueCount: 0, 
    cards: Array(10).fill(0).map((_, i) => ({ id: i+100, front: `Artist ${i+1}`, back: `Style of artist ${i+1}`, status: 'known' }))
  },
  { 
    id: 3, 
    projectId: 7, 
    title: 'English B2 Vocab', 
    dueCount: 45, 
    cards: Array(100).fill(0).map((_, i) => ({ id: i+200, front: `Word ${i+1}`, back: `Definition ${i+1}`, status: 'learning' }))
  },
];

// Helper to get formatted data
export const getProcessingProjects = () => MOCK_PROJECTS.filter(p => p.status === 'PROCESSING');
export const getPinnedProjects = () => MOCK_PROJECTS.filter(p => p.isPinned && !p.isArchived);
export const getRecentProjects = () => MOCK_PROJECTS.filter(p => !p.isArchived).sort((a, b) => new Date(b.lastOpenedDate).getTime() - new Date(a.lastOpenedDate).getTime()).slice(0, 5);

// Mock function to add project (simulated)
export const createMockProject = (type: ProjectType, title: string): Project => {
  return {
    id: Math.floor(Math.random() * 10000),
    type,
    title,
    source: type === 'YouTube' ? 'youtube.com/watch?v=mock' : 'uploaded_file.pdf',
    meta: type === 'YouTube' ? '0 min' : '0 pages',
    addedDate: new Date().toISOString(),
    lastOpened: 'Just now',
    lastOpenedDate: new Date().toISOString(),
    status: 'PROCESSING',
    progressPercent: 0,
    tags: [],
    outputs: { chatCount: 0, flashcardsCount: 0, quizCount: 0, summaryExists: false, podcastExists: false, slidesExists: false },
    toc: [],
    isPinned: false
  };
};

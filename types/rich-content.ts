export type RichBlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'page_preview'
  | 'quote'
  | 'table'
  | 'meta';

export interface RichDocumentPosition {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  unit?: 'px' | 'percent';
}

export interface RichDocumentImage {
  dataUrl: string;
  width: number;
  height: number;
  alt?: string;
  caption?: string;
  storagePath?: string;
}

export interface RichDocumentBlock {
  id: string;
  type: RichBlockType;
  page?: number;
  text?: string;
  level?: number;
  listItems?: string[];
  table?: string[][];
  position?: RichDocumentPosition;
  image?: RichDocumentImage;
  metadata?: Record<string, any>;
}

export interface RichDocumentContent {
  plainText: string;
  blocks: RichDocumentBlock[];
  metadata: {
    pages: number;
    source?: string;
    extractedAt: string;
    previewPages: number;
  };
}


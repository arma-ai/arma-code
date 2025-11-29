import sharp from 'sharp';
import { randomUUID } from 'crypto';
import type { RichDocumentBlock, RichDocumentContent } from '@/types/rich-content';

interface ParseOptions {
  mimeType?: string;
  fileName?: string;
  maxPreviewPages?: number;
}

const DEFAULT_LINE_GAP = 8;
const DEFAULT_MAX_PREVIEWS = Number.MAX_SAFE_INTEGER;

export async function parseRichDocument(buffer: Buffer, options: ParseOptions = {}): Promise<RichDocumentContent> {
  const mime = options.mimeType?.toLowerCase() || '';
  const file = options.fileName?.toLowerCase() || '';
  const isPdf = mime.includes('pdf') || file.endsWith('.pdf');

  if (isPdf) {
    return parsePdf(buffer, options);
  }

  // Fallback: return plain text block (still useful for AI)
  const fallbackText = buffer.toString('utf8');
  return {
    plainText: fallbackText,
    blocks: [
      {
        id: randomUUID(),
        type: 'paragraph',
        text: fallbackText,
        page: 1,
      },
    ],
    metadata: {
      pages: 1,
      source: options.fileName,
      extractedAt: new Date().toISOString(),
      previewPages: 0,
    },
  };
}

async function parsePdf(buffer: Buffer, options: ParseOptions): Promise<RichDocumentContent> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });
  const pdf = await loadingTask.promise;

  const blocks: RichDocumentBlock[] = [];
  const maxPreviews = Math.min(options.maxPreviewPages ?? DEFAULT_MAX_PREVIEWS, pdf.numPages);

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    if (pageNumber <= maxPreviews) {
      const preview = await renderPagePreview(buffer, pageNumber - 1);
      if (preview) {
        blocks.push({
          id: randomUUID(),
          type: 'page_preview',
          page: pageNumber,
          image: preview,
          metadata: { kind: 'page_preview' },
        });
      }
    }

    const pageBlocks = buildBlocksFromTextContent(textContent.items as any[], viewport.height, pageNumber);
    blocks.push(...pageBlocks);
  }

  return {
    plainText: blocksToPlainText(blocks),
    blocks,
    metadata: {
      pages: pdf.numPages,
      source: options.fileName,
      extractedAt: new Date().toISOString(),
      previewPages: maxPreviews,
    },
  };
}

async function renderPagePreview(buffer: Buffer, pageIndex: number) {
  try {
    const { data, info } = await sharp(buffer, { density: 144, page: pageIndex })
      .png()
      .toBuffer({ resolveWithObject: true });

    return {
      dataUrl: `data:image/png;base64,${data.toString('base64')}`,
      width: info.width || 0,
      height: info.height || 0,
      alt: `Page ${pageIndex + 1}`,
    };
  } catch (error) {
    console.warn('[rich-document-parser] Failed to render page preview', error);
    return null;
  }
}

function buildBlocksFromTextContent(items: any[], pageHeight: number, pageNumber: number): RichDocumentBlock[] {
  const blocks: RichDocumentBlock[] = [];
  let currentParagraph: string[] = [];
  let currentList: string[] = [];
  let lastY: number | null = null;
  let currentFontSize = 12;
  let currentType: 'heading' | 'paragraph' = 'paragraph';

  const flushParagraph = () => {
    if (!currentParagraph.length) return;
    const text = currentParagraph.join(' ').replace(/\s+/g, ' ').trim();
    if (!text) {
      currentParagraph = [];
      return;
    }

    blocks.push({
      id: randomUUID(),
      type: currentType,
      text,
      page: pageNumber,
      level: currentType === 'heading' ? determineHeadingLevel(currentFontSize) : undefined,
      position: lastY
        ? {
            y: +(1 - lastY / pageHeight).toFixed(4),
            unit: 'percent',
          }
        : undefined,
    });

    currentParagraph = [];
    currentType = 'paragraph';
  };

  const flushList = () => {
    if (!currentList.length) return;
    blocks.push({
      id: randomUUID(),
      type: 'list',
      listItems: [...currentList],
      page: pageNumber,
    });
    currentList = [];
  };

  for (const item of items) {
    const str = typeof item.str === 'string' ? item.str.trim() : '';
    if (!str) {
      continue;
    }

    const transform = Array.isArray(item.transform) ? item.transform : [0, 0, 0, 0, 0, 0];
    const y = transform[5] || 0;
    const fontSize = typeof item.height === 'number' ? item.height : 12;
    const isHeadingLine = fontSize >= 16;
    const isBullet = /^[•·\-–]/.test(str);

    if (isBullet) {
      flushParagraph();
      currentList.push(str.replace(/^[•·\-–]+\s*/, '').trim());
      lastY = y;
      continue;
    } else if (currentList.length > 0 && lastY !== null && Math.abs(lastY - y) > DEFAULT_LINE_GAP) {
      flushList();
    }

    if (lastY !== null && Math.abs(lastY - y) > DEFAULT_LINE_GAP) {
      flushParagraph();
    }

    currentParagraph.push(str);
    currentFontSize = fontSize;
    currentType = isHeadingLine ? 'heading' : currentType;
    lastY = y;
  }

  flushParagraph();
  flushList();

  return blocks;
}

function blocksToPlainText(blocks: RichDocumentBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        parts.push(`${'#'.repeat(block.level ?? 2)} ${block.text ?? ''}`.trim());
        break;
      case 'paragraph':
        if (block.text) {
          parts.push(block.text);
        }
        break;
      case 'quote':
        if (block.text) {
          parts.push(`> ${block.text}`);
        }
        break;
      case 'list':
        if (block.listItems?.length) {
          parts.push(block.listItems.map((item) => `• ${item}`).join('\n'));
        }
        break;
      case 'table':
        if (block.table?.length) {
          const tableText = block.table.map((row) => row.join(' | ')).join('\n');
          parts.push(tableText);
        }
        break;
      case 'image':
      case 'page_preview':
        parts.push(
          `[Image ${block.page ? `page ${block.page}` : ''} - ${block.image?.caption || block.image?.alt || 'See original document'}]`
        );
        break;
      default:
        break;
    }
  }

  return parts.join('\n\n').trim();
}

function determineHeadingLevel(fontSize: number) {
  if (fontSize >= 28) return 1;
  if (fontSize >= 22) return 2;
  if (fontSize >= 18) return 3;
  return 4;
}


'use client';

import type { RichDocumentBlock } from '@/types/rich-content';
import SelectableText from './SelectableText';

interface RichDocumentViewProps {
  materialId: string;
  blocks: RichDocumentBlock[];
}

const headingStyles: Record<number, string> = {
  1: 'text-3xl font-bold',
  2: 'text-2xl font-semibold',
  3: 'text-xl font-semibold',
  4: 'text-lg font-semibold',
};

export default function RichDocumentView({ materialId, blocks }: RichDocumentViewProps) {
  if (!blocks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
        Structured view will appear here after processing completes.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {blocks.map((block) => {
        switch (block.type) {
          case 'heading': {
            const levelClass = headingStyles[block.level ?? 3] || headingStyles[3];
            return (
              <div key={block.id} className={`${levelClass} text-gray-900`}>
                {block.text && (
                  <SelectableText materialId={materialId}>
                    {block.text}
                  </SelectableText>
                )}
              </div>
            );
          }

          case 'paragraph':
            return (
              <p key={block.id} className="text-gray-700 leading-relaxed text-justify">
                {block.text && (
                  <SelectableText materialId={materialId}>
                    {block.text}
                  </SelectableText>
                )}
              </p>
            );

          case 'quote':
            return (
              <blockquote
                key={block.id}
                className="border-l-4 border-gray-300 pl-4 italic text-gray-600"
              >
                {block.text && (
                  <SelectableText materialId={materialId}>
                    {block.text}
                  </SelectableText>
                )}
              </blockquote>
            );

          case 'list':
            return (
              <ul key={block.id} className="list-disc list-outside pl-6 space-y-1 text-gray-700">
                {block.listItems?.map((item, index) => (
                  <li key={`${block.id}-${index}`}>
                    <SelectableText materialId={materialId}>
                      {item}
                    </SelectableText>
                  </li>
                ))}
              </ul>
            );

          case 'table':
            return (
              <div key={block.id} className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full border-collapse text-sm">
                  <tbody>
                    {block.table?.map((row, rowIndex) => (
                      <tr key={`${block.id}-row-${rowIndex}`} className="odd:bg-white even:bg-gray-50/80">
                        {row.map((cell, cellIndex) => (
                          <td key={`${block.id}-cell-${rowIndex}-${cellIndex}`} className="px-4 py-3 border border-gray-100 text-gray-700">
                            <SelectableText materialId={materialId}>
                              {cell}
                            </SelectableText>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'image':
          case 'page_preview':
            return block.image?.dataUrl ? (
              <figure key={block.id} className="rounded-2xl overflow-hidden shadow border border-gray-200 bg-white">
                <img
                  src={block.image.dataUrl}
                  alt={block.image.alt || 'Document illustration'}
                  className="w-full"
                />
                {(block.image.caption || block.type === 'page_preview') && (
                  <figcaption className="text-sm text-gray-500 px-4 py-3 border-t border-gray-100 bg-gray-50">
                    {block.image.caption || `Page ${block.page || ''}`.trim()}
                  </figcaption>
                )}
              </figure>
            ) : null;

          default:
            return null;
        }
      })}
    </div>
  );
}


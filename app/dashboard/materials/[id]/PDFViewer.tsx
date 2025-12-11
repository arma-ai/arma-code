'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { askAboutSelection } from '@/app/actions/askAboutSelection';

interface PDFViewerProps {
  fileUrl: string;
  materialId: string;
  showOriginal?: boolean;
  onToggleOriginal?: () => void;
}

export default function PDFViewer({ fileUrl, materialId, showOriginal, onToggleOriginal }: PDFViewerProps) {
  // ----- PDF rendering state -----
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const textLayerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ----- Ask AI selection state -----
  const [selectedText, setSelectedText] = useState('');
  const [savedSelectedText, setSavedSelectedText] = useState('');
  const [showQuestionBox, setShowQuestionBox] = useState(false);
  const [question, setQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const questionBoxRef = useRef<HTMLDivElement>(null);

  // Load and render PDF using pdfjs-dist (client‑only)
  useEffect(() => {
    if (showOriginal) return; // No need to render canvas when showing raw PDF
    let pdfDoc: any = null;
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const loadingTask = pdfjs.getDocument(fileUrl);
        pdfDoc = await loadingTask.promise;
        setNumPages(pdfDoc.numPages);
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          const containerWidth = containerRef.current?.clientWidth || 800;
          const scale = (containerWidth - 40) / viewport.width;
          const scaledViewport = page.getViewport({ scale });

          const canvas = canvasRefs.current[i - 1];
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = scaledViewport.width;
              canvas.height = scaledViewport.height;
              await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
            }
          }

          const textDiv = textLayerRefs.current[i - 1];
          if (textDiv) {
            const textContent = await page.getTextContent();
            textDiv.innerHTML = '';
            textContent.items.forEach((item: any) => {
              const span = document.createElement('span');
              span.textContent = item.str;
              const tx = pdfjs.Util.transform(item.transform, scaledViewport.transform);
              const [x, y] = [tx[4], tx[5]];
              span.style.position = 'absolute';
              span.style.left = `${x}px`;
              span.style.top = `${scaledViewport.height - y}px`;
              span.style.fontSize = `${item.height * scale}px`;
              span.style.fontFamily = item.fontName;
              span.style.whiteSpace = 'pre';
              textDiv.appendChild(span);
            });
          }
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        setError('Failed to load PDF');
        setLoading(false);
      }
    };
    loadPdf();
    return () => {
      if (pdfDoc) pdfDoc.destroy();
    };
  }, [fileUrl, showOriginal]);

  // ----- Selection handling (inside rendered text layers) -----
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      const txt = sel?.toString().trim() || '';
      if (txt) {
        setSelectedText(txt);
        setSavedSelectedText(txt);
      } else {
        setSelectedText('');
      }
    };
    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleAskQuestion = async () => {
    if (!question.trim() || !savedSelectedText) return;
    setAiLoading(true);
    setAiError(null);
    try {
      await askAboutSelection(materialId, savedSelectedText, question);
      setShowQuestionBox(false);
      setQuestion('');
      setSavedSelectedText('');
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to ask AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClose = () => {
    setShowQuestionBox(false);
    setQuestion('');
    setAiError(null);
  };

  if (loading && !showOriginal) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        <p className="ml-4 text-gray-600">Loading PDF...</p>
      </div>
    );
  }

  if (error && !showOriginal) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative p-4 bg-gray-50 overflow-auto" ref={containerRef}>
      {/* Toggle button – minimalistic black/white */}
      <button
        onClick={onToggleOriginal}
        className="absolute top-4 right-4 px-3 py-1.5 border border-black text-black bg-white hover:bg-black hover:text-white transition-colors text-xs rounded"
      >
        {showOriginal ? 'Processed View' : 'Original PDF'}
      </button>

      {showOriginal ? (
        <object data={fileUrl} type="application/pdf" className="w-full h-[calc(100vh-200px)]" />
      ) : (
        <div>
          {Array.from({ length: numPages }, (_, i) => (
            <div key={i} className="relative mb-8 shadow-lg bg-white">
              <canvas
                ref={el => { canvasRefs.current[i] = el; }}
                className="block w-full"
              />
              <div
                ref={el => { textLayerRefs.current[i] = el; }}
                className="absolute inset-0 pointer-events-none"
                style={{ userSelect: 'text' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Ask AI button */}
      {selectedText && !showQuestionBox && (
        <button
          onClick={() => setShowQuestionBox(true)}
          className="fixed bottom-4 right-4 px-4 py-2 bg-black text-white rounded-lg shadow-lg hover:bg-gray-800"
        >
          Ask AI about selection
        </button>
      )}

      {/* Modal */}
      {showQuestionBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div ref={questionBoxRef} className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold mb-3">Ask AI about selected text</h3>
            <p className="mb-2 text-sm text-gray-600 italic">&ldquo;{savedSelectedText}&rdquo;</p>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Your question…"
              className="w-full p-2 border rounded mb-4"
              rows={4}
            />
            {aiError && <p className="text-red-600 text-sm mb-2">{aiError}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={handleClose} className="px-4 py-2 border rounded">Cancel</button>
              <button
                onClick={handleAskQuestion}
                disabled={aiLoading || !question.trim()}
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              >
                {aiLoading ? 'Asking…' : 'Ask AI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

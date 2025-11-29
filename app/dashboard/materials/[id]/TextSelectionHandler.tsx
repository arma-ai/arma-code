'use client';

import { useState, useEffect, useRef } from 'react';
import SelectionModal from './SelectionModal';

interface TextSelectionHandlerProps {
  children: React.ReactNode;
  materialId: string;
}

export default function TextSelectionHandler({ children, materialId }: TextSelectionHandlerProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [showButton, setShowButton] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [showModal, setShowModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setShowButton(false);
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length === 0) {
        setShowButton(false);
        return;
      }

      // Проверяем, что выделение находится внутри нашего контейнера
      const range = selection.getRangeAt(0);
      if (!containerRef.current?.contains(range.commonAncestorContainer)) {
        setShowButton(false);
        return;
      }

      setSelectedText(selectedText);

      // Получаем позицию выделения
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      setButtonPosition({
        top: rect.bottom - containerRect.top + window.scrollY + 10,
        left: rect.left - containerRect.left + window.scrollX + rect.width / 2,
      });
      setShowButton(true);
    };

    const handleClick = (e: MouseEvent) => {
      // Если клик не на кнопке, скрываем её
      const target = e.target as HTMLElement;
      if (!target.closest('.selection-button')) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
        setShowButton(false);
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const handleAskAI = () => {
    setShowModal(true);
    setShowButton(false);
    // Очищаем выделение
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedText('');
  };

  return (
    <div ref={containerRef} className="relative">
      {children}
      {showButton && selectedText && (
        <button
          onClick={handleAskAI}
          className="selection-button fixed z-50 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all font-semibold text-sm flex items-center gap-2 transform -translate-x-1/2"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Ask AI about this
        </button>
      )}
      {showModal && (
        <SelectionModal
          materialId={materialId}
          selectedText={selectedText}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}


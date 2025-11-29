'use client';

import { useState } from 'react';
import { updateMaterialFullText } from '@/app/actions/updateFullText';
import { forceUpdateFullText } from '@/app/actions/forceUpdateFullText';
import { fixMaterialEncoding } from '@/app/actions/fixEncoding';
import { useRouter } from 'next/navigation';

interface UpdateFullTextButtonProps {
  materialId: string;
}

export default function UpdateFullTextButton({ materialId }: UpdateFullTextButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleUpdate() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateMaterialFullText(materialId);
      console.log('[UpdateFullTextButton] Update result:', result);
      setSuccess(true);
      
      // Отправляем событие обновления
      window.dispatchEvent(new Event('full-text-updated'));
      
      // Обновляем страницу через небольшую задержку
      setTimeout(() => {
        router.refresh();
        // Также принудительно перезагружаем страницу для гарантии
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 1000);
    } catch (err) {
      console.error('Update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update document text';
      setError(errorMessage);
      
      // Если ошибка связана с отсутствием поля, показываем инструкцию
      if (errorMessage.includes('does not exist') || errorMessage.includes('migration')) {
        setError(`${errorMessage}. Please run the SQL script in Supabase SQL Editor.`);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-green-600 text-sm">
        Document text updated successfully! Refreshing...
      </div>
    );
  }

  async function handleForceUpdate() {
    console.log('[UpdateFullTextButton] handleForceUpdate called');
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('[UpdateFullTextButton] Force updating full_text for material:', materialId);
      const result = await forceUpdateFullText(materialId);
      console.log('[UpdateFullTextButton] Force update result:', result);
      
      if (result && result.success) {
        setSuccess(true);
        console.log('[UpdateFullTextButton] Force update successful, reloading page...');
        
        // Отправляем событие обновления
        window.dispatchEvent(new Event('full-text-updated'));
        
        // Принудительно обновляем страницу
        setTimeout(() => {
          router.refresh();
          // Жесткая перезагрузка для гарантии
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }, 500);
      } else {
        console.error('[UpdateFullTextButton] Force update failed');
        setError('Failed to force update');
        setLoading(false);
      }
    } catch (err) {
      console.error('[UpdateFullTextButton] Force update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to force update';
      setError(errorMessage);
      setLoading(false);
    }
  }

  async function handleFixEncoding() {
    console.log('[UpdateFullTextButton] handleFixEncoding called');
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('[UpdateFullTextButton] Fixing encoding for material:', materialId);
      const result = await fixMaterialEncoding(materialId);
      console.log('[UpdateFullTextButton] Fix encoding result:', result);
      
      if (result && result.success) {
        setSuccess(true);
        console.log('[UpdateFullTextButton] Encoding fixed successfully, reloading page...');
        
        // Отправляем событие обновления
        window.dispatchEvent(new Event('full-text-updated'));
        
        // Принудительно обновляем страницу
        setTimeout(() => {
          router.refresh();
          // Жесткая перезагрузка для гарантии
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }, 500);
      } else {
        const errorMsg = result?.message || 'Failed to fix encoding';
        console.error('[UpdateFullTextButton] Fix encoding failed:', errorMsg);
        setError(errorMsg);
        setLoading(false);
      }
    } catch (err) {
      console.error('[UpdateFullTextButton] Fix encoding error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fix encoding';
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[UpdateFullTextButton] Fix Encoding button clicked');
            handleFixEncoding();
          }}
          disabled={loading}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Исправить кодировку: конвертирует Windows-1251 в UTF-8"
        >
          {loading ? 'Исправление...' : 'Исправить кодировку'}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[UpdateFullTextButton] Force Update button clicked');
            handleForceUpdate();
          }}
          disabled={loading}
          className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Переобработать: переизвлекает текст из PDF"
        >
          {loading ? 'Обработка...' : 'Переобработать'}
        </button>
      </div>
      {error && (
        <div className="text-red-600 text-xs mt-1 max-w-xs">
          {error}
        </div>
      )}
    </div>
  );
}


'use client';

import { useState } from 'react';
import { materialsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface DeleteMaterialButtonProps {
  materialId: string;
  materialTitle: string;
}

export default function DeleteMaterialButton({ materialId, materialTitle }: DeleteMaterialButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      await materialsApi.delete(materialId);
      // Редирект на dashboard после успешного удаления
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete material');
      setLoading(false);
      setShowConfirm(false);
    }
  }

  function handleCancel() {
    setShowConfirm(false);
  }

  if (showConfirm) {
    return (
      <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDelete();
          }}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCancel();
          }}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleDelete();
      }}
      className="w-full px-4 py-2 border border-gray-200 hover:border-red-600 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
      title="Delete material"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      Delete
    </button>
  );
}


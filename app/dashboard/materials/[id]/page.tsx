'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authApi, authStorage, materialsApi } from '@/lib/api';
import SidebarClient from './SidebarClient';
import MaterialDocumentView from './MaterialDocumentView';
import Link from 'next/link';

export default function MaterialPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<any>(null);
  const [material, setMaterial] = useState<any>(null);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = authStorage.getToken();
        if (!token) {
          router.replace('/login');
          return;
        }

        const materialId = params.id as string;
        console.log('Loading data for material:', materialId);

        // Load data sequentially to identify which one fails
        let currentUser;
        try {
            console.log('Fetching current user...');
            currentUser = await authApi.getCurrentUser();
            console.log('User fetched:', currentUser);
        } catch (e) {
            console.error('Failed to load user:', e);
            if (String(e).includes('401')) {
                authStorage.removeToken();
                router.replace('/login');
                return;
            }
            throw new Error('Failed to load user profile');
        }

        let materialData;
        try {
            console.log('Fetching material details...');
            materialData = await materialsApi.getById(materialId);
            console.log('Material fetched:', materialData);
        } catch (e) {
            console.error('Failed to load material details:', e);
            if (String(e).includes('404')) {
                throw new Error('Material not found');
            }
            throw new Error('Failed to load material details');
        }

        let materials = [];
        try {
            console.log('Fetching all materials...');
            materials = await materialsApi.getAll();
            console.log('All materials fetched:', materials.length);
        } catch (e) {
            console.warn('Failed to load materials list:', e);
            // Non-critical, continue
        }

        setUser(currentUser);
        setMaterial(materialData);
        setAllMaterials(materials);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load page data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
        setLoading(false);
      }
    };

    if (params.id) {
      loadData();
    }
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading material...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Page</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
            <Link href="/dashboard" className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !material) {
    return null;
  }

  // Если статус processing или failed, показываем заглушку, 
  // НО если уже есть partial data (например текст извлечен), MaterialDocumentView сам разберется.
  // В текущей реализации MaterialDocumentView умеет показывать "Content not available yet" и кнопку Reprocess.
  // Поэтому мы рендерим его всегда, чтобы пользователь видел интерфейс.

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 h-full">
        <SidebarClient
          userEmail={user.email || 'User'}
          materials={allMaterials.map(m => ({ id: m.id, title: m.title }))}
          activeMaterialId={material.id}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Material View Component */}
        <div className="flex-1 h-full relative">
            <MaterialDocumentView
              materialId={material.id}
              materialTitle={material.title}
              materialType={material.type}
              filePath={material.file_path}
              // В API пока нет file_url, но если бы был, мы бы его передали.
              // Для локальной разработки это может быть /api/files/...
              pdfUrl={null} 
              youtubeUrl={material.source}
              initialData={material}
            />
        </div>
      </div>
    </div>
  );
}

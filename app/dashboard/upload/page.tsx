'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, authStorage } from '@/lib/api';
import Sidebar from '../Sidebar';
import UploadForm from './UploadForm';

export default function UploadPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authStorage.getToken();
        if (!token) {
          router.replace('/login');
          return;
        }

        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        authStorage.removeToken();
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email || 'User'} />
      <div className="flex-1 bg-white">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
            <h1 className="text-3xl font-bold text-black mb-2">Add Learning Material</h1>
            <p className="text-gray-600 mb-6">Upload a PDF or add a YouTube video</p>
            <UploadForm />
          </div>
        </div>
      </div>
    </div>
  );
}


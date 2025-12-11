'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, authStorage, materialsApi, type Material } from '@/lib/api';
import Sidebar from './Sidebar';
import DashboardContent from './DashboardContent';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = authStorage.getToken();
        if (!token) {
          router.replace('/login');
          return;
        }

        // Получаем текущего пользователя и материалы параллельно
        const [currentUser, allMaterials] = await Promise.all([
          authApi.getCurrentUser(),
          materialsApi.getAll()
        ]);

        setUser(currentUser);
        setMaterials(allMaterials);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load data:', error);
        authStorage.removeToken();
        router.replace('/login');
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Редирект произойдет в useEffect
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email || 'User'} />
      <DashboardContent materials={materials} />
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, authStorage, materialsApi } from '@/lib/api';
import Sidebar from '../Sidebar';
import MaterialsGrid from './MaterialsGrid';

export default function MaterialsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const token = authStorage.getToken();
                if (!token) {
                    router.replace('/login');
                    return;
                }

                // Получаем пользователя и материалы параллельно
                const [currentUser, materialsData] = await Promise.all([
                    authApi.getCurrentUser(),
                    materialsApi.getAll()
                ]);

                setUser(currentUser);
                setMaterials(materialsData);
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
                    <p className="text-gray-600">Loading materials...</p>
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
            <div className="flex-1">
                <MaterialsGrid materials={materials} />
            </div>
        </div>
    );
}

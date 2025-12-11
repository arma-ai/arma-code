'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, authStorage } from '@/lib/api';
import Sidebar from '../Sidebar';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
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
        console.error('Failed to load profile:', error);
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
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    authStorage.removeToken();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email || 'User'} />

      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-black mb-4">Profile</h1>
            <p className="text-lg text-gray-600">Manage your account settings</p>
          </div>

          <div className="grid gap-8">
            {/* User Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Personal Information</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Full Name</p>
                  <p className="text-lg text-black font-medium border-b border-gray-100 pb-2">
                    {user.full_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Email Address</p>
                  <p className="text-lg text-black font-medium border-b border-gray-100 pb-2">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-black mb-6">Account Actions</h2>
              <button
                onClick={handleLogout}
                className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

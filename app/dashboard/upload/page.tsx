import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '../Sidebar';
import UploadForm from './UploadForm';

export default async function UploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar userEmail={user.email} />
      <div className="flex-1 bg-white">
        <div className="max-w-3xl mx-auto px-8 py-12">
          <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
            <h1 className="text-3xl font-bold text-black mb-2">Add Learning Material</h1>
            <p className="text-gray-600 mb-6">Upload a PDF or add a YouTube video</p>
            <Suspense fallback={<div>Loading form...</div>}>
              <UploadForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}


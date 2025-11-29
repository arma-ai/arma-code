import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getMaterialById,
  getMaterialFileUrl,
} from '@/app/actions/materials';
import MaterialDocumentView from './MaterialDocumentView';
import { notFound } from 'next/navigation';
import Sidebar from './Sidebar';
import ProgressBar from '@/app/dashboard/ProgressBar';

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

interface MaterialPageProps {
  params: Promise<{ id: string }>;
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  // Отключаем кэширование для этой страницы, чтобы всегда получать актуальные данные
  const { unstable_noStore } = await import('next/cache');
  unstable_noStore();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const material = await getMaterialById(id);

  if (!material) {
    notFound();
  }

  // Получаем fileUrl только для PDF материалов (для кнопки "Open original PDF")
  const pdfUrl = material.type !== 'youtube'
    ? await getMaterialFileUrl(material.file_path)
    : null;

  // Prepare YouTube embed URL
  const youtubeEmbedUrl = material.type === 'youtube' && material.source
    ? (() => {
      const videoId = extractYouTubeVideoId(material.source);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    })()
    : null;

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content - Document Viewer (Takes full remaining width) */}
        <div className="flex-1 overflow-hidden">
          <MaterialDocumentView
            materialId={id}
            materialTitle={material.title}
            materialType={material.type === 'youtube' ? 'youtube' : 'pdf'}
            filePath={material.file_path}
            pdfUrl={pdfUrl}
            youtubeUrl={youtubeEmbedUrl}
          />
        </div>
      </div>

      {/* Progress Bar in bottom right corner */}
      <ProgressBar materialId={id} />
    </>
  );
}

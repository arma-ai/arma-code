'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '../../../components/Logo';

interface SidebarClientProps {
  userEmail: string;
  materials: Array<{ id: string; title: string }>;
}

export default function SidebarClient({ userEmail, materials }: SidebarClientProps) {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo Header */}
      <div className="p-6 border-b border-gray-200">
        <Logo href="/dashboard" />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-1">
          <div className="border-b border-gray-200 mb-4"></div>

          <Link
            href="/dashboard/upload"
            className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-sm"
          >
            Add Project
          </Link>
          <button className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-sm">
            Search
          </button>
          <button className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-sm">
            History
          </button>

          <div className="border-b border-gray-200 my-4"></div>

          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Workspaces</h3>
            <button className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors mb-1 text-sm">
              Create workspace
            </button>
            <button className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-sm">
              Your space
            </button>
          </div>

          <div className="border-b border-gray-200 my-4"></div>

          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Your projects</h3>
            {materials.length > 0 ? (
              <div className="space-y-1">
                {materials.map((material) => (
                  <Link
                    key={material.id}
                    href={`/dashboard/materials/${material.id}`}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${pathname === `/dashboard/materials/${material.id}`
                        ? 'bg-gray-100 text-black font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {material.title.length > 20
                      ? `${material.title.substring(0, 20)}...`
                      : material.title}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-gray-500">Document&apos;s name</p>
            )}
          </div>

          <div className="border-b border-gray-200 my-4"></div>

          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Instruments</h3>
            <button className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors mb-1 text-sm">
              Leave Feedback
            </button>
            <button className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md transition-colors text-sm">
              Join community
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 space-y-3">
        <button className="w-full bg-green-500 text-white px-4 py-2 rounded-md font-medium hover:bg-green-600 transition-colors text-sm">
          Free plan
        </button>
        <div className="bg-gray-100 rounded-full px-4 py-2 text-center">
          <p className="text-sm text-gray-600">{userEmail}</p>
        </div>
      </div>
    </div>
  );
}


'use client';

import Link from 'next/link';
import Logo from '../../../components/Logo';

interface SidebarClientProps {
  userEmail: string;
  materials: Array<{ id: string; title: string }>;
  activeMaterialId?: string;
}

export default function SidebarClient({ userEmail, materials, activeMaterialId }: SidebarClientProps) {
  return (
    <div className="w-64 bg-gray-100 border-r border-gray-200 h-screen flex flex-col font-sans">
      {/* Logo Header */}
      <div className="px-6 py-5">
        <Logo href="/dashboard" />
      </div>

      <div className="w-full h-px bg-gray-300 mx-auto" />

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-4 space-y-6">
          {/* Main Actions */}
          <div className="space-y-1">
            <Link
              href="/dashboard/upload"
              className="flex items-center px-3 py-2 text-gray-900 hover:bg-gray-200 rounded-lg transition-colors text-base font-medium"
            >
              Add Project
            </Link>
            <button className="flex w-full items-center px-3 py-2 text-gray-900 hover:bg-gray-200 rounded-lg transition-colors text-base font-medium">
              Search
            </button>
            <button className="flex w-full items-center px-3 py-2 text-gray-900 hover:bg-gray-200 rounded-lg transition-colors text-base font-medium">
              History
            </button>
          </div>

          <div className="w-full h-px bg-gray-300" />

          {/* Workspaces */}
          <div>
            <h3 className="px-3 text-xl font-medium text-gray-900 mb-2">Workspaces</h3>
            <div className="space-y-1">
              <button className="flex w-full items-center px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                Create workspace
              </button>
              <button className="flex w-full items-center px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                Your space
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-gray-300" />

          {/* Your Projects */}
          <div>
            <h3 className="px-3 text-xl font-medium text-gray-900 mb-2">Your projects</h3>
            <div className="space-y-1">
              {materials.length > 0 ? (
                materials.slice(0, 8).map((material) => (
                  <Link
                    key={material.id}
                    href={`/dashboard/materials/${material.id}`}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeMaterialId === material.id
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="truncate">
                      {material.title}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-gray-500">No projects yet</p>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-gray-300" />

          {/* Instruments */}
          <div>
            <h3 className="px-3 text-xl font-medium text-gray-900 mb-2">Instruments</h3>
            <div className="space-y-1">
              <button className="flex w-full items-center px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                Leave Feedback
              </button>
              <button className="flex w-full items-center px-3 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium">
                Join community
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 space-y-3">
        <button className="w-full bg-[#22C55E] text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition-colors text-sm shadow-sm">
          Free plan
        </button>
        <div className="bg-white border border-gray-200 rounded-full px-4 py-2 text-center shadow-sm">
          <p className="text-xs text-gray-600 font-medium truncate">{userEmail}</p>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from '@/app/actions/auth';
import { usePathname } from 'next/navigation';
import { materialsApi, type Material as ApiMaterial } from '@/lib/api';

interface SidebarProps {
  userEmail?: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<ApiMaterial[]>([]);

  const isMaterialView = pathname?.includes('/materials/');

  useEffect(() => {
    if (isMaterialView) {
      async function loadProjects() {
        try {
          const data = await materialsApi.getAll();
          setProjects(data);
        } catch (error) {
          console.error('Failed to load projects', error);
        }
      }
      loadProjects();
    }
  }, [isMaterialView]);

  const currentMaterialId = pathname?.split('/materials/')?.[1]?.split('/')?.[0];

  // --- WIDE SIDEBAR (For Material View) ---
  if (isMaterialView) {
    return (
      <div className="w-64 bg-[#FAFAFA] border-r border-gray-200 flex flex-col h-screen font-sans text-gray-900 flex-shrink-0">
        {/* Logo Area */}
        <div className="px-5 pt-4 pb-6">
          <Link href="/dashboard" className="block">
            <Image
              src="/logo.png"
              alt="arma"
              width={100}
              height={32}
              className="h-7 w-auto object-contain"
              style={{ width: 'auto' }}
              priority
            />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-8 scrollbar-hide">
          {/* Main Navigation */}
          <div className="space-y-1">
            <WideNavItem
              href="/dashboard/upload"
              label="Add content"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
            />
            <WideNavItem
              href="#"
              label="Search"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
            />
            <WideNavItem
              href="/dashboard/materials"
              label="History"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
          </div>

          {/* Spaces Section */}
          <div>
            <h3 className="px-2 text-xs font-bold text-gray-900 mb-2">Spaces</h3>
            <div className="space-y-1">
              <WideNavItem
                href="#"
                label="Create space"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
              />
              <WideNavItem
                href="/dashboard"
                label="Bobur's Space"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              />
            </div>
          </div>

          {/* Projects Section */}
          <div>
            <h3 className="px-2 text-xs font-bold text-gray-900 mb-2">Reviews</h3>
            <div className="space-y-1">
              {projects.length > 0 ? (
                projects.map((project) => {
                  const isActive = currentMaterialId === project.id;
                  return (
                    <Link
                      key={project.id}
                      href={`/dashboard/materials/${project.id}`}
                      className={`
                        flex items-center gap-3 px-2 py-1.5 rounded-lg text-[13px] transition-colors truncate group
                        ${isActive
                          ? 'bg-gray-100 text-black font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                        }
                      `}
                    >
                      <div className={`flex-shrink-0 w-4 flex justify-center ${isActive ? 'text-green-500' : 'text-gray-400'}`}>
                        {isActive ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        ) : (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        )}
                      </div>
                      <span className="truncate">{project.title}</span>
                    </Link>
                  );
                })
              ) : (
                <div className="text-xs text-gray-400 px-2">Loading...</div>
              )}
            </div>
          </div>

          {/* Help & Tools Section */}
          <div>
            <h3 className="px-2 text-xs font-bold text-gray-900 mb-2">Help & tools</h3>
            <div className="space-y-1">
              <WideNavItem
                href="#"
                label="Feedback"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>}
              />
              <WideNavItem
                href="#"
                label="Quick guide"
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="p-4 mt-auto border-t border-gray-100 bg-white">
          <button className="w-full py-2 mb-4 bg-[#E8F5E9] text-[#1B5E20] rounded-lg font-medium text-xs hover:bg-[#C8E6C9] transition-colors flex items-center justify-center gap-2">
            Free Plan
          </button>

          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
              {/* Avatar placeholder or image */}
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                {userEmail?.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-900 truncate">Bobur Xolikulov</div>
              <div className="text-[10px] text-gray-500 truncate">{userEmail}</div>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  // --- COMPACT SIDEBAR (For Dashboard / Other pages) ---
  return (
    <div className="w-20 bg-white border-r border-gray-200 min-h-screen flex flex-col items-center py-6 transition-all duration-300 ease-in-out flex-shrink-0">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/dashboard" className="block p-2 rounded-xl hover:bg-gray-50 transition-colors">
          <Image
            src="/logo-small.png"
            alt="Logo"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
          />
        </Link>
      </div>

      {/* Create Action */}
      <div className="mb-6">
        <Link
          href="/dashboard/upload"
          className="flex items-center justify-center w-12 h-12 bg-black text-white rounded-2xl hover:bg-gray-800 hover:scale-105 hover:shadow-lg transition-all duration-200 group relative"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            New Material
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 w-full flex flex-col items-center gap-4">
        <CompactNavItem
          href="/dashboard"
          active={pathname === '/dashboard'}
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
          label="Home"
        />
        <CompactNavItem
          href="/dashboard/materials"
          active={pathname?.startsWith('/dashboard/materials') && !pathname.includes('/materials/')}
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />}
          label="Materials"
        />
        <CompactNavItem
          href="/dashboard/profile"
          active={pathname === '/dashboard/profile'}
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
          label="Profile"
        />
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col items-center gap-4 w-full">
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 font-semibold text-sm border border-gray-200 cursor-help group relative">
          {userEmail?.charAt(0).toUpperCase() || 'U'}
          <span className="absolute left-14 bg-white border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {userEmail}
          </span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
              Sign Out
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}

function WideNavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-2 py-1.5 text-[13px] text-gray-600 hover:bg-gray-100 hover:text-black rounded-lg transition-colors"
    >
      <div className="text-gray-400">{icon}</div>
      <span>{label}</span>
    </Link>
  );
}

function CompactNavItem({ href, active, icon, label }: { href: string; active: boolean; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group
        ${active
          ? 'bg-gray-100 text-black shadow-sm'
          : 'text-gray-500 hover:bg-gray-50 hover:text-black'
        }
      `}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      <span className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
      {active && (
        <span className="absolute -right-1 top-1 w-2 h-2 bg-black rounded-full border-2 border-white"></span>
      )}
    </Link>
  );
}

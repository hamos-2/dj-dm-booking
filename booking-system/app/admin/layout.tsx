import React from 'react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Mock Admin Badge
  const unreadDMs = 3;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 bg-white">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            BookingAdmin
          </span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors">
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          
          <Link href="/admin/bookings" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <span>📋</span>
            <span>Bookings</span>
          </Link>

          <Link href="/admin/instagram" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
            <div className="flex items-center space-x-3">
              <span>💬</span>
              <span>DM Inbox</span>
            </div>
            {unreadDMs > 0 && (
              <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-semibold">
                {unreadDMs}
              </span>
            )}
          </Link>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Settings
            </h4>
            <Link href="/admin/settings/availability" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <span>⏰</span>
              <span>Availability</span>
            </Link>
            <Link href="/admin/settings" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              <span>⚙️</span>
              <span>Integrations</span>
            </Link>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button className="flex w-full items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header (optional but good context) */}
        <header className="md:hidden h-14 bg-white border-b flex items-center px-4 justify-between">
            <span className="font-bold">Admin</span>
            <button>☰</button>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}

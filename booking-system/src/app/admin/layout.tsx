'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (!session && pathname !== '/admin/login') {
        router.push('/admin/login');
      }
      setLoading(false);
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  useEffect(() => {
    async function fetchUnread() {
      const { count } = await supabase
        .from('instagram_messages')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'unread');
      
      setUnreadCount(count || 0);
    }
    fetchUnread();
    
    // Optional: Real-time subscription
    const channel = supabase
      .channel('admin_unread_count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instagram_messages' }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const linkClass = (path: string) => 
    `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive(path) 
        ? 'bg-gray-100 text-gray-900' 
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  if (loading && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center italic text-gray-400 animate-pulse">
        Authenticating...
      </div>
    );
  }

  // Also skip sidebar if on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

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
          <Link href="/admin" className={linkClass('/admin')}>
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          
          <Link href="/admin/bookings" className={linkClass('/admin/bookings')}>
            <span>📋</span>
            <span>Bookings</span>
          </Link>

          <Link href="/admin/instagram" className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive('/admin/instagram') 
              ? 'bg-gray-100 text-gray-900' 
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}>
            <div className="flex items-center space-x-3">
              <span>💬</span>
              <span>DM Inbox</span>
            </div>
            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-semibold">
                {unreadCount}
              </span>
            )}
          </Link>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Settings
            </h4>
            <Link href="/admin/settings/availability" className={linkClass('/admin/settings/availability')}>
              <span>⏰</span>
              <span>Availability</span>
            </Link>
            <Link href="/admin/settings" className={linkClass('/admin/settings')}>
              <span>⚙️</span>
              <span>Integrations</span>
            </Link>
            <Link href="/admin/settings/environment" className={linkClass('/admin/settings/environment')}>
              <span>🔐</span>
              <span>Environment</span>
            </Link>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
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

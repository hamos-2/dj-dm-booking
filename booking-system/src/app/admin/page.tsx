'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, startOfDay, endOfDay } from 'date-fns';

export default function AdminDashboardHome() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ today: 0, week: 0, unread: 0 });
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        // 1. Fetch Bookings via API
        const response = await fetch('/api/admin/bookings');
        const result = await response.json();
        const allBookings = result.bookings || [];

        // 2. Filter today's confirmed bookings
        const todayBookings = allBookings.filter((b: any) => {
          const bookingDate = new Date(b.start_time);
          return bookingDate >= start && bookingDate <= end && b.status === 'confirmed';
        });

        // 3. Fetch Unread DMs count
        const { count: unreadCount } = await supabase
          .from('instagram_messages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unread');

        setBookings(todayBookings);
        
        // Use confirmed bookings for weekly forecast
        const confirmedBookings = allBookings.filter((b: any) => b.status === 'confirmed');

        setStats({
          today: todayBookings.length,
          week: confirmedBookings.length, // Total confirmed bookings
          unread: unreadCount || 0
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Today's Overview</h1>
        <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
          {format(new Date(), 'MMMM dd, yyyy (EEE)')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Today</div>
          <div className="text-3xl font-bold text-gray-900">{stats.today}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Weekly Forecast</div>
          <div className="text-3xl font-bold text-gray-900">{stats.week}</div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm bg-blue-50/50">
          <div className="text-sm font-medium text-blue-600 mb-1">Unread DMs</div>
          <div className="text-3xl font-bold text-blue-700">{stats.unread}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Today's Timeline</h3>
        </div>
        <ul className="divide-y divide-gray-100">
          {loading ? (
            <li className="p-8 text-center text-gray-400">Loading timeline...</li>
          ) : bookings.length === 0 ? (
            <li className="p-12 text-center text-gray-400 italic">No bookings scheduled for today.</li>
          ) : (
            bookings.map((booking) => (
              <li key={booking.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center">
                <div className="w-16 font-medium text-gray-900">
                  {format(new Date(booking.start_time), 'HH:mm')}
                </div>
                
                <div className="flex-1 px-4 flex items-center space-x-4">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  
                  <span className="font-medium text-gray-900">{booking.customer_name}</span>
                  
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase ${
                    booking.source === 'instagram' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.source}
                  </span>
                </div>
                
                <button 
                  onClick={() => setSelectedBooking(booking)}
                  className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors"
                >
                  View Details
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4">Booking Details</h2>
            <div className="space-y-4 text-gray-700">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-400">Customer:</span>
                <span className="font-medium">{selectedBooking.customer_name}</span>
                <span className="text-gray-400">Email:</span>
                <span>{selectedBooking.customer_email}</span>
                <span className="text-gray-400">Phone:</span>
                <span>{selectedBooking.customer_phone || '-'}</span>
                <span className="text-gray-400">Time:</span>
                <span className="font-semibold text-blue-600">
                  {format(new Date(selectedBooking.start_time), 'HH:mm')} - {format(new Date(selectedBooking.end_time), 'HH:mm')}
                </span>
                <span className="text-gray-400">Status:</span>
                <span className="uppercase text-green-600 font-bold">{selectedBooking.status}</span>
              </div>
            </div>
            <button 
              onClick={() => setSelectedBooking(null)}
              className="mt-8 w-full bg-gray-900 text-white py-3 rounded-xl font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

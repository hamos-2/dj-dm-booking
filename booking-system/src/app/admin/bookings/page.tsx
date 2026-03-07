'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';

export default function AdminBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const itemsPerPage = 7;

  // Modal State
  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/bookings');
      const result = await response.json();
      
      if (result.error) {
        console.error(result.error);
      } else {
        setBookings(result.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
    setLoading(false);
  }

  const handleCancelClick = (id: string) => {
    setModal({
      show: true,
      title: '예약 취소',
      message: '정말로 이 예약을 취소하시겠습니까? 구글 캘린더 일정명도 함께 삭제됩니다.',
      type: 'danger',
      onConfirm: () => processCancel(id)
    });
  };

  const processCancel = async (id: string) => {
    setIsProcessing(true);
    setModal(prev => ({ ...prev, show: false }));
    try {
      // Use Edge Function for proper Google Sync
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cancelBooking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ booking_id: id })
      });
      const result = await response.json();

      if (response.ok) {
        // Show success using a temporary state or alert (alert is safer for one-off success if not using a toast system, but let's use a non-blocking UI update)
        fetchBookings();
      } else {
        alert('취소 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error: any) {
      console.error('Cancel error:', error);
      alert('취소 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreClick = (id: string) => {
    setModal({
      show: true,
      title: '예약 복구',
      message: '취소된 예약을 다시 Confirmed 상태로 복구하시겠습니까?',
      type: 'info',
      onConfirm: () => processRestore(id)
    });
  };

  const processRestore = async (id: string) => {
    setIsProcessing(true);
    setModal(prev => ({ ...prev, show: false }));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/restoreBooking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ booking_id: id })
      });
      const result = await response.json();

      if (response.ok) {
        fetchBookings();
      } else {
        alert('복구 실패: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error: any) {
      console.error('Restore error:', error);
      alert('복구 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         b.customer_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || b.status?.toLowerCase() === statusFilter.toLowerCase();
    
    // Support mapping 'insta' filter to 'instagram' source
    const filterSrc = sourceFilter.toLowerCase() === 'insta' ? 'instagram' : sourceFilter.toLowerCase();
    const matchesSource = sourceFilter === 'All Sources' || b.source?.toLowerCase() === filterSrc;
    
    // Date filter logic (Robust comparison using yyyy-MM-dd)
    let bookingDate = '';
    try {
      bookingDate = format(new Date(b.start_time), 'yyyy-MM-dd');
    } catch (e) {
      bookingDate = b.start_time.split(' ')[0].split('T')[0];
    }
    const matchesDate = !dateFilter || bookingDate === dateFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesDate;
  });

  // Removed handleCancel and handleRestore as they are replaced by modal-driven functions

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sourceFilter, dateFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex gap-4 p-6 pt-0 border-b border-gray-100 flex-wrap lg:flex-nowrap justify-between">
           <div className="flex gap-4 flex-wrap flex-1">
             <div className="relative">
                <input 
                  type="text"
                  placeholder="고객 이름 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-60"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
             </div>
             <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
             >
                <option>All Statuses</option>
                <option>Confirmed</option>
                <option>Canceled</option>
             </select>
             <select 
                value={sourceFilter} 
                onChange={(e) => setSourceFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
             >
                <option>All Sources</option>
                <option>Web</option>
                <option>Insta</option>
             </select>
             <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
             />
           </div>
           
           <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                리스트 뷰
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                칸반 보드
              </button>
           </div>
        </div>

        {viewMode === 'kanban' ? (
           <div className="p-6">
             <KanbanBoard />
           </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm mx-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객명
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    전화번호
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    예약 시간
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출처
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading bookings...
                    </td>
                  </tr>
                ) : paginatedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                      No bookings found.
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {booking.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.customer_email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.customer_phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(booking.start_time), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {booking.status === 'Confirmed' ? (
                          <button 
                            onClick={() => handleCancelClick(booking.id)}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            disabled={isProcessing}
                          >
                            Cancel
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRestoreClick(booking.id)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            disabled={isProcessing}
                          >
                            Retrieve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {viewMode === 'list' && totalPages > 1 && (
              <div className="flex items-center justify-between p-4 px-6 bg-gray-50 border-t border-gray-100">
                <span className="text-sm text-gray-700">
                  Showing <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, bookings.length)}</span> to <span className="font-semibold">{Math.min(currentPage * itemsPerPage, bookings.length)}</span> of <span className="font-semibold">{bookings.length}</span> results
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Custom Modal */}
        {modal.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
              <h2 className={`text-xl font-bold mb-2 ${modal.type === 'danger' ? 'text-red-600' : 'text-blue-600'}`}>
                {modal.title}
              </h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {modal.message}
              </p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  disabled={isProcessing}
                >
                  취소
                </button>
                <button 
                  onClick={modal.onConfirm}
                  className={`flex-1 text-white py-3 rounded-xl font-medium transition-colors ${
                    modal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={isProcessing}
                >
                  {isProcessing ? '처리 중...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && !modal.show && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-[110]">
            <div className="bg-white px-6 py-4 rounded-full shadow-xl border border-gray-100 flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
              </span>
              <span className="text-sm font-medium text-gray-700">시스템 처리 중...</span>
            </div>
          </div>
        )}
    </div>
  );
}

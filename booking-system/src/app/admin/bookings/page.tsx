'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export default function AdminBookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [dateFilter, setDateFilter] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [currentPage, setCurrentPage] = useState(1);
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
    
    // Date filter logic (Robust comparison using yyyy-MM-dd)
    let bookingDate = '';
    try {
      bookingDate = format(new Date(b.start_time), 'yyyy-MM-dd');
    } catch (e) {
      bookingDate = b.start_time.split(' ')[0].split('T')[0];
    }
    const matchesDate = !dateFilter || bookingDate === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
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
  }, [searchTerm, statusFilter, dateFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Bookings List</h1>
        <button 
          onClick={fetchBookings}
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex space-x-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            >
                <option>All Statuses</option>
                <option>Confirmed</option>
                <option>Canceled</option>
            </select>
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
            />
        </div>
        <div className="w-full sm:w-64 relative">
             <input 
               type="text" 
               placeholder="Search by name or email" 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full border border-gray-300 pl-3 pr-8 py-2 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
             />
             <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading bookings...</div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-wide text-xs text-gray-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">Customer Name</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold w-12 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {paginatedBookings.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">조회된 예약이 없습니다.</td>
                 </tr>
               ) : (
                 paginatedBookings.map((b) => (
                    <tr className="hover:bg-gray-50 transition-colors" key={b.id}>
                       <td className="px-6 py-4 font-medium text-gray-900">
                         {format(new Date(b.start_time), 'MM/dd')}
                       </td>
                       <td className="px-6 py-4">{format(new Date(b.start_time), 'HH:mm')}</td>
                       <td className="px-6 py-4 font-medium text-gray-900">
                           <div>{b.customer_name}</div>
                           <div className="text-xs text-gray-400">{b.customer_email}</div>
                       </td>
                       <td className="px-6 py-4 text-gray-500 uppercase">{b.source}</td>
                       <td className="px-6 py-4">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                               b.status === 'confirmed' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                           }`}>
                              {b.status === 'confirmed' ? '✅ Confirmed' : '❌ Canceled'} 
                           </span>
                       </td>
                         <td className="px-6 py-4 text-right">
                           {b.status === 'confirmed' ? (
                             <button 
                               onClick={() => handleCancelClick(b.id)}
                               className="text-red-500 hover:text-red-700 font-medium text-xs transition-colors p-1.5 hover:bg-red-50 rounded"
                             >
                               Cancel
                             </button>
                           ) : (
                             <div className="flex flex-col items-end gap-1">
                               <span className="text-gray-400 text-xs italic mb-1">Canceled</span>
                               <button 
                                 onClick={() => handleRestoreClick(b.id)}
                                 className="text-blue-500 hover:text-blue-700 font-medium text-[10px] uppercase tracking-wider transition-colors px-1 py-0.5 border border-blue-200 rounded hover:border-blue-500"
                               >
                                 Retrieve
                               </button>
                             </div>
                           )}
                        </td>
                    </tr>
                 ))
               )}
            </tbody>
          </table>
        )}
        
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30">
             <button 
               onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
               disabled={currentPage === 1}
               className="text-sm border border-gray-300 bg-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-gray-50"
             >
               Previous
             </button>
             <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
             <button 
               onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
               disabled={currentPage === totalPages}
               className="text-sm border border-gray-300 bg-white px-3 py-1.5 rounded disabled:opacity-50 hover:bg-gray-50"
             >
               Next
             </button>
        </div>
      </div>

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

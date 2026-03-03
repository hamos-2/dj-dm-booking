'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // 오늘 날짜 기본
  );
  const [availableSlots, setAvailableSlots] = useState<{start: string, end: string}[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  // Initialize Supabase client
  const supabase = createClient();

  // 날짜 변경 시 슬롯 조회 (Edge Function 호출)
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDate) return;
      setIsLoading(true);
      setSelectedSlot(null);

      try {
        const { data, error } = await supabase.functions.invoke('getAvailableSlots', {
          body: { date: selectedDate, timezone: 'Asia/Seoul' }
        });

        if (error) throw error;
        
        // Edge function에서 반환되는 형태에 맞춰 슬롯 상태 업데이트 
        // (Mock에서는 `{slots: []}` 로 설정했습니다)
        setAvailableSlots(data?.slots || []);
        
      } catch (error) {
        console.error("Error fetching slots:", error);
        alert("예약 가능한 슬롯을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSlots();
  }, [selectedDate]);

  // 예약 확정 처리 (Edge Function 호출)
  const handleBooking = async () => {
    if (!selectedSlot || !name || !email) {
      alert("이름과 이메일을 모두 입력해주세요.");
      return;
    }

    setIsBooking(true);
    const slot = availableSlots.find(s => s.start === selectedSlot);

    try {
      const { data, error } = await supabase.functions.invoke('createBooking', {
        body: {
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          start_time: slot?.start,
          end_time: slot?.end,
          source: 'web'
        }
      });

      if (error) throw error;
      
      // 성공 시 완료 페이지로 리다이렉트 (Mock에서는 단순 alert 처리 후 창 이동 가능)
      window.location.href = '/booking/confirm';
      
    } catch (error: any) {
      console.error("Booking Error:", error);
      alert(error.message || "예약 중 충돌 등의 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Summary / Date Picker */}
        <div className="md:w-1/2 p-8 border-r border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Book a Session</h1>
          <p className="text-gray-500 mb-8">Select a date to see available times.</p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>

        {/* Right Side: Slots & Form */}
        <div className="md:w-1/2 p-8 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Times
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center p-8 text-gray-400">Loading Slots...</div>
          ) : availableSlots.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 border rounded-lg bg-gray-50 bg-opacity-50">
               선택한 날짜에 예약 가능한 시간이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-8">
              {availableSlots.map((slot) => {
                const dateObj = new Date(slot.start);
                const timeString = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                
                const isSelected = selectedSlot === slot.start;
                
                return (
                  <button
                    key={slot.start}
                    onClick={() => setSelectedSlot(slot.start)}
                    className={`p-3 text-center border rounded-lg font-medium transition-all ${
                      isSelected 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.02]' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-500 hover:shadow-sm'
                    }`}
                  >
                    {timeString}
                  </button>
                );
              })}
            </div>
          )}

          {selectedSlot && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="font-medium text-gray-900 border-t pt-4">Your Details</h3>
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button fullWidth onClick={handleBooking} disabled={isBooking}>
                {isBooking ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

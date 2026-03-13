'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export default function BookingPageWrapper() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
      <BookingPage />
    </Suspense>
  );
}

function BookingPage() {
  const searchParams = useSearchParams();
  const flash_id = searchParams.get('flash_id');
  const [flashDesign, setFlashDesign] = useState<any>(null);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('sv').split('T')[0] // Local YYYY-MM-DD
  );
  const [availableSlots, setAvailableSlots] = useState<{start: string, end: string}[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [openDates, setOpenDates] = useState<string[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [tattooPlacement, setTattooPlacement] = useState('');
  const [estimatedSize, setEstimatedSize] = useState('');
  const [notes, setNotes] = useState('');
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  // Initialize Supabase client
  const supabase = createClient();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReferenceImages(Array.from(e.target.files));
    }
  };

  useEffect(() => {
    if (flash_id) {
      supabase.from('flash_designs').select('*').eq('id', flash_id).single()
        .then(({ data }) => {
          if (data) {
            setFlashDesign(data);
            if (data.size) setEstimatedSize(data.size);
            if (data.body_placement_suggestion) setTattooPlacement(data.body_placement_suggestion);
          }
        });
    }
  }, [flash_id, supabase]);

  // 날짜 변경 시 슬롯 조회 (Edge Function 호출)
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedDate) return;
      setIsLoading(true);
      setSelectedSlot(null);

      try {
        const res = await fetch(`/api/availability/slots?date=${selectedDate}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        setAvailableSlots(data?.slots || []);
        
      } catch (error) {
        console.error("Error fetching slots:", error);
        alert("예약 가능한 슬롯을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSlots();
  }, [selectedDate, supabase]);

  useEffect(() => {
    async function loadDates() {
      try {
        const res = await fetch('/api/availability/dates');
        const data = await res.json();
        setOpenDates(data.openDates || []);
        if (data.openDates && data.openDates.length > 0) {
          setSelectedDate(data.openDates[0]);
        } else {
          setIsLoadingDates(false);
        }
      } catch(e) { console.error('Error loading dates:', e); }
      setIsLoadingDates(false);
    }
    loadDates();
  }, []);

  // 예약 확정 처리 (Edge Function 호출)
  const handleBooking = async () => {
    // Trim values to avoid whitespace issues
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    console.log("Attempting booking with:", { selectedSlot, trimmedName, trimmedEmail });

    if (!selectedSlot) {
      alert("시간대를 선택해주세요.");
      return;
    }
    if (!trimmedName || !trimmedEmail) {
      alert("이름과 이메일을 모두 입력해주세요.");
      return;
    }
    if (!consentChecked) {
      alert("이용 약관 및 시술 동의서에 동의해주세요.");
      return;
    }

    setIsBooking(true);
    const slot = availableSlots.find(s => s.start === selectedSlot);

    try {
      let reference_image_urls: string[] = [];

      if (referenceImages.length > 0) {
        setIsUploading(true);
        for (const file of referenceImages) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `public/${Date.now()}_${fileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('crm_images')
            .upload(filePath, file);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            throw new Error("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
          }

          const { data: urlData } = supabase.storage
            .from('crm_images')
            .getPublicUrl(filePath);

          reference_image_urls.push(urlData.publicUrl);
        }
        setIsUploading(false);
      }

      const { data, error } = await supabase.functions.invoke('createBooking', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: {
          customer_name: trimmedName,
          customer_email: trimmedEmail,
          customer_phone: phone.trim(),
          start_time: slot?.start,
          end_time: slot?.end,
          source: 'web',
          tattoo_placement: tattooPlacement,
          estimated_size: estimatedSize,
          notes: notes,
          reference_image_urls: reference_image_urls,
          flash_id: flash_id
        }
      });

      if (error) throw error;
      
      // 성공 시 완료 페이지로 리다이렉트
      const dateStr = encodeURIComponent(format(new Date(slot?.start || ''), 'MMMM dd, yyyy HH:mm'));
      window.location.href = `/booking/confirm?name=${encodeURIComponent(trimmedName)}&time=${dateStr}`;
      
    } catch (error: any) {
      console.error("Booking Error:", error);
      alert(error.message || "예약 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsBooking(false);
      setIsUploading(false);
    }
  };

  // Calculate min date (today) in local timezone
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localISOTime = new Date(today.getTime() - offset).toISOString();
  const todayStr = localISOTime.split('T')[0];

  // Calculate filtered slots (no past times if today)
  const filteredSlots = availableSlots.filter(slot => {
    if (selectedDate !== todayStr) return true;
    return new Date(slot.start).getTime() > new Date().getTime();
  });

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Summary / Date Picker */}
        <div className="md:w-1/2 p-8 border-r border-gray-100">
          {flashDesign ? (
            <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Selected Design</h2>
              <div className="flex gap-4 items-start">
                <img src={flashDesign.image_url} alt={flashDesign.title} className="w-24 h-24 object-cover rounded-lg border border-gray-100" />
                <div>
                  <h3 className="font-semibold text-lg">{flashDesign.title}</h3>
                  <p className="text-sm text-gray-500 mb-1">{flashDesign.size ? `Size: ${flashDesign.size}` : ''}</p>
                  <p className="text-sm font-medium">Price: ₩{flashDesign.price?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Book a Session</h1>
              <p className="text-gray-500">Select a date to see available times.</p>
            </div>
          )}
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input 
              type="date" 
              value={selectedDate}
              min={todayStr}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
              }}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-gray-900"
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
          ) : filteredSlots.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 border rounded-lg bg-gray-50 bg-opacity-50">
               선택한 날짜에 예약 가능한 시간이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-8">
              {filteredSlots.map((slot) => {
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
              <input 
                type="tel" 
                placeholder="Phone Number (optional)" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="text" 
                placeholder="Tattoo Placement (e.g., forearm, back)" 
                value={tattooPlacement}
                onChange={(e) => setTattooPlacement(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="text" 
                placeholder="Estimated Size (e.g., 5x5 cm)" 
                value={estimatedSize}
                onChange={(e) => setEstimatedSize(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea 
                placeholder="Additional Notes" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              />
              <div className="w-full border border-gray-300 rounded-lg p-2.5 text-sm text-gray-600">
                <label className="block font-medium mb-1">Reference Images</label>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
              </div>

              {/* Consent Section */}
              <div className="flex items-start space-x-3 pt-2">
                <div className="flex items-center h-5">
                  <input 
                    id="consent" 
                    type="checkbox" 
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300" 
                    required 
                  />
                </div>
                <label htmlFor="consent" className="text-sm font-medium text-gray-900 leading-tight">
                  개인정보 수집 및 타투 시술 기본 약관에 동의합니다. <br/>
                  <span className="text-xs text-gray-500 font-normal">예약금 입금 전에는 일정이 확정되지 않으며 상담을 통해 최종 결정됩니다.</span>
                </label>
              </div>

              <Button fullWidth onClick={handleBooking} disabled={isBooking || isUploading || !consentChecked}>
                {isBooking || isUploading ? 'Processing...' : 'Confirm Booking'}
              </Button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

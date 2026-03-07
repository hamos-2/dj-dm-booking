'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AvailabilitySettingsPage() {
  const supabase = createClient();
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const [schedule, setSchedule] = useState<any[]>([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [bufferTime, setBufferTime] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<{type: 'idle' | 'loading' | 'success' | 'error', message?: string}>({type: 'idle'});

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const response = await fetch('/api/admin/availability');
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
          setSchedule(result.data);
          setSlotDuration(result.data[0].slot_duration_minutes);
          setBufferTime(result.data[0].buffer_minutes);
        } else {
          // Initialize with default values if empty
          const defaults = DAYS.map((_, i) => ({
            day_of_week: i,
            is_active: i > 0 && i < 6, // Mon-Fri
            start_time: '09:00:00',
            end_time: '18:00:00',
            slot_duration_minutes: 60,
            buffer_minutes: 15
          }));
          setSchedule(defaults);
        }
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      }
      setLoading(false);
    }
    fetchAvailability();
  }, []);

  const handleToggleDay = (dayIdx: number) => {
    setSchedule(prev => prev.map(day => 
      day.day_of_week === dayIdx ? { ...day, is_active: !day.is_active } : day
    ));
  };

  const handleChangeTime = (dayIdx: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule(prev => prev.map(day => 
      day.day_of_week === dayIdx ? { ...day, [field]: value } : day
    ));
  };

  const handleSave = async () => {
    setSaveStatus({ type: 'loading' });
    try {
      const payload = {
        schedule: schedule.map(s => ({
          ...s,
          slot_duration_minutes: slotDuration,
          buffer_minutes: bufferTime
        }))
      };

      const response = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (result.error) throw new Error(result.error);
      
      setSaveStatus({ type: 'success', message: '설정이 저장되었습니다!' });
      
      setTimeout(() => {
        setSaveStatus({ type: 'idle' });
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', message: err.message || '저장 중 오류가 발생했습니다.'});
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Availability Settings</h1>
        <p className="text-gray-500">Define your standard operating hours. Slots will be automatically generated based on these bounds.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-6 mb-8 pb-8 border-b border-gray-100">
             <div className="flex-1">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Slot Duration (minutes)</label>
                 <select 
                   value={slotDuration}
                   onChange={(e) => setSlotDuration(parseInt(e.target.value))}
                   className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 text-gray-900"
                 >
                     <option value={30}>30 mins</option>
                     <option value={60}>60 mins</option>
                     <option value={90}>90 mins</option>
                 </select>
             </div>
             <div className="flex-1">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                 <select 
                   value={bufferTime}
                   onChange={(e) => setBufferTime(parseInt(e.target.value))}
                   className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500 text-gray-900"
                 >
                     <option value={0}>0 mins</option>
                     <option value={15}>15 mins</option>
                     <option value={30}>30 mins</option>
                 </select>
                 <p className="text-xs text-gray-500 mt-1">Time between consecutive bookings</p>
             </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Weekly Schedule</h3>
            
            {DAYS.map((day, idx) => {
               const daySchedule = schedule.find(s => s.day_of_week === idx);
               const isActive = daySchedule?.is_active || false;
               const startTime = daySchedule?.start_time?.slice(0, 5) || '09:00';
               const endTime = daySchedule?.end_time?.slice(0, 5) || '18:00';
               
               return (
                <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-24 font-medium flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isActive} 
                          onChange={() => handleToggleDay(idx)}
                          className="rounded text-blue-600" 
                        />
                        <span className="text-gray-900">{day}</span>
                    </div>
                    
                    {isActive ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                            <input 
                              type="time" 
                              value={startTime} 
                              onChange={(e) => handleChangeTime(idx, 'start_time', e.target.value)}
                              className="border border-gray-300 rounded-md p-1 px-2 text-sm w-full text-gray-900" 
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                              type="time" 
                              value={endTime} 
                              onChange={(e) => handleChangeTime(idx, 'end_time', e.target.value)}
                              className="border border-gray-300 rounded-md p-1 px-2 text-sm w-full text-gray-900" 
                            />
                        </div>
                    ) : (
                        <div className="flex-1 max-w-sm text-gray-400 text-sm italic py-1">
                            Off
                        </div>
                    )}
                </div>
               );
            })}
        </div>

        <div className="pt-4 flex flex-col items-end gap-3">
            {saveStatus.type !== 'idle' && (
              <div className={`p-3 rounded-md text-sm font-medium w-full sm:w-auto ${
                saveStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
                saveStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                'bg-blue-50 text-blue-600 border border-blue-100'
              }`}>
                {saveStatus.type === 'loading' ? 'Processing...' : saveStatus.message}
              </div>
            )}
            <button 
              onClick={handleSave}
              disabled={saveStatus.type === 'loading'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
                {saveStatus.type === 'loading' ? 'Saving...' : 'Save Configuration'}
            </button>
        </div>
      </div>
      
    </div>
  );
}

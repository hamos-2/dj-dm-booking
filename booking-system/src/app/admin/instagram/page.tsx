'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export default function AdminDmInboxPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDm, setSelectedDm] = useState<any | null>(null);
  
  // Extraction state
  const [extractName, setExtractName] = useState('');
  const [extractContact, setExtractContact] = useState('');
  const [converting, setConverting] = useState(false);

  async function fetchMessages() {
    console.log('Fetching messages...');
    const { data, error } = await supabase
      .from('instagram_messages')
      .select('*')
      .order('received_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    console.log('Messages fetched:', data);
    setMessages(data || []);
    if (data && data.length > 0 && !selectedDm) {
      setSelectedDm(data[0]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('instagram_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_messages'
        },
        (payload) => {
          console.log('Real-time change received:', payload);
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleConvert = async () => {
    if (!selectedDm || !extractName) {
       alert("고객 이름을 입력해주세요.");
       return;
    }
    setConverting(true);
    try {
      const { error } = await supabase.functions.invoke('createBooking', {
        body: {
          customer_name: extractName,
          customer_email: extractContact.includes('@') ? extractContact : 'extracted-from-dm@instagram.com',
          customer_phone: extractContact.includes('@') ? '' : extractContact,
          start_time: new Date().toISOString(), // Default or parsed from message
          source: 'instagram'
        }
      });

      if (error) throw error;
      
      // Update message status
      await supabase
        .from('instagram_messages')
        .update({ status: 'read' }) // or 'booked' if added to enum
        .eq('id', selectedDm.id);

      alert('예약이 생성되었습니다!');
      fetchMessages();
    } catch (err: any) {
      alert('변환 중 오류: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Left List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50/80">
          <h2 className="font-bold text-gray-900">Instagram DM Inbox</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="p-4 text-center text-gray-400 italic">No messages yet.</div>
          ) : (
            messages.map((dm) => (
              <button 
                key={dm.id}
                onClick={() => setSelectedDm(dm)}
                className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedDm?.id === dm.id ? 'bg-blue-50/50 outline-2 outline-blue-500 -outline-offset-2' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-medium text-gray-900 flex items-center gap-2">
                    {dm.status === 'unread' && <span className="h-2 w-2 bg-blue-500 rounded-full inline-block"></span>}
                    @{dm.instagram_user_id}
                  </span>
                  <span className="text-xs text-gray-500">{format(new Date(dm.received_at), 'MM/dd HH:mm')}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{dm.message}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Detail Viewer */}
      <div className="w-2/3 flex flex-col bg-gray-50/30">
        <div className="flex-1 p-8">
            {selectedDm ? (
              <div className="max-w-xl mx-auto space-y-6">
                  <div className="text-center font-medium text-gray-500 mb-8 border-b pb-4">
                      Selected Conversation: @{selectedDm.instagram_user_id}
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
                      <span className="absolute -top-3 left-4 bg-gray-100 px-2 py-0.5 text-xs text-gray-500 rounded-md">Incoming Message</span>
                      <p className="text-gray-900 text-lg">
                          "{selectedDm.message}"
                      </p>
                      <div className="mt-4 text-sm text-gray-400">
                          Received: {format(new Date(selectedDm.received_at), 'yyyy-MM-dd HH:mm:ss')}
                      </div>
                  </div>

                  <div className="mt-8 pt-8 border-t border-gray-200">
                      <h3 className="text-lg font-medium mb-4">Quick Convert to Booking</h3>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <input 
                            type="text" 
                            placeholder="Extract Name" 
                            value={extractName}
                            onChange={(e) => setExtractName(e.target.value)}
                            className="border rounded-md p-2 text-sm text-gray-900" 
                          />
                          <input 
                            type="text" 
                            placeholder="Email / Phone" 
                            value={extractContact}
                            onChange={(e) => setExtractContact(e.target.value)}
                            className="border rounded-md p-2 text-sm text-gray-900" 
                          />
                      </div>
                      <button 
                        onClick={handleConvert}
                        disabled={converting}
                        className="bg-blue-600 text-white px-4 py-2 w-full rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                          {converting ? 'Processing...' : 'Convert to Booking →'}
                      </button>
                  </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                 Select a conversation to view details.
              </div>
            )}
        </div>
      </div>

    </div>
  );
}

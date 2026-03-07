'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';

export default function AdminDmInboxPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Extraction state
  const [extractName, setExtractName] = useState('');
  const [extractContact, setExtractContact] = useState('');
  const [extractDate, setExtractDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [extractTime, setExtractTime] = useState(() => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return format(nextHour, 'HH:mm');
  });
  const [convertStatus, setConvertStatus] = useState<{type: 'idle' | 'loading' | 'success' | 'error', message?: string}>({type: 'idle'});
  
  // Reply state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  async function fetchMessages() {
    console.log('Fetching messages and users...');
    
    // Fetch messages
    const { data: msgs, error: msgsError } = await supabase
      .from('instagram_messages')
      .select('*')
      .order('received_at', { ascending: false });
    
    if (msgsError) {
      console.error('Error fetching messages:', msgsError);
      return;
    }

    // Fetch user profiles
    const { data: usersData, error: usersError } = await supabase
      .from('instagram_users')
      .select('*');

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    const userMap = (usersData || []).reduce((acc, u) => {
      acc[u.instagram_user_id] = u;
      return acc;
    }, {} as Record<string, any>);

    setMessages(msgs || []);
    setUsers(userMap);
    setLoading(false);
  }

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time changes for messages
    const msgChannel = supabase
      .channel('instagram_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_messages'
        },
        () => fetchMessages()
      )
      .subscribe();

    // Subscribe to real-time changes for user profiles
    const userChannel = supabase
      .channel('instagram_users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'instagram_users'
        },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(userChannel);
    };
  }, []);

  const conversations = useMemo(() => {
    const map = new Map<string, any[]>();
    messages.forEach(m => {
      if (!map.has(m.instagram_user_id)) map.set(m.instagram_user_id, []);
      map.get(m.instagram_user_id)!.push(m);
    });
    
    return Array.from(map.entries()).map(([userId, msgs]) => {
      return {
        userId,
        messages: msgs,
        latestMessageAt: msgs[0].received_at,
        hasUnread: msgs.some(m => m.status === 'unread')
      };
    }).sort((a, b) => new Date(b.latestMessageAt).getTime() - new Date(a.latestMessageAt).getTime());
  }, [messages]);

  useEffect(() => {
    if (conversations.length > 0 && !selectedUserId) {
      setSelectedUserId(conversations[0].userId);
      // Mark read implicitly if the first is selected automatically? 
      // It's probably better to let the user click to mark read explicitly.
    }
  }, [conversations, selectedUserId]);

  const selectedConversation = conversations.find(c => c.userId === selectedUserId);

  const handleConvert = async () => {
    if (!selectedUserId || !extractName) {
       setConvertStatus({type: 'error', message: "고객 이름을 입력해주세요."});
       return;
    }
    setConvertStatus({type: 'loading'});
    try {
      // Combine date and time
      const dateTimeString = `${extractDate}T${extractTime}:00`;
      const startObj = new Date(dateTimeString);
      const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // Default to 1 hour
      
      // We pass the ANON_KEY to bypass potential ES256 API Gateway JWT validation errors 
      // because the user token might be ES256 while gateway expects HS256. 
      // The Edge Function uses Service Role internally anyway.
      const { error, data } = await supabase.functions.invoke('createBooking', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: {
          customer_name: extractName,
          customer_email: extractContact.includes('@') ? extractContact : 'extracted-from-dm@instagram.com',
          customer_phone: extractContact.includes('@') ? '' : extractContact,
          start_time: startObj.toISOString(),
          end_time: endObj.toISOString(),
          source: 'instagram'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      
      // Additional safety to mark remaining as booked/read if we convert
      const unreadMessageIds = selectedConversation?.messages.filter(m => m.status === 'unread').map(m => m.id) || [];
      if (unreadMessageIds.length > 0) {
        await supabase
          .from('instagram_messages')
          .update({ status: 'read' })
          .in('id', unreadMessageIds);
      }

      setConvertStatus({type: 'success', message: '예약이 성공적으로 생성되었습니다!'});
      fetchMessages();
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setConvertStatus({type: 'idle'});
      }, 3000);
    } catch (err: any) {
      console.error('Convert Error:', err);
      setConvertStatus({type: 'error', message: err.message || '예약 생성 중 오류가 발생했습니다.'});
    }
  };

  const handleSelectConversation = async (userId: string) => {
    setSelectedUserId(userId);
    
    // Auto-fill extraction name if available
    const user = users[userId];
    if (user?.name) {
      setExtractName(user.name);
    }

    // Find unread messages for this user and mark them read
    const unreadMsgs = messages.filter(m => m.instagram_user_id === userId && m.status === 'unread');
    if (unreadMsgs.length > 0) {
      await supabase
        .from('instagram_messages')
        .update({ status: 'read' })
        .in('id', unreadMsgs.map(m => m.id));
      
      // Optimistically update local state to reflect read status immediately
      setMessages(messages.map(m => m.instagram_user_id === userId ? {...m, status: 'read'} : m));
    }
  }

  const handleSendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;
    setSendingReply(true);

    try {
      const { error, data } = await supabase.functions.invoke('replyInstagram', {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: {
          recipient_id: selectedConversation.userId,
          message_text: replyText.trim(),
        }
      });

      if (error) {
        // If the API fails due to missing tokens, we can still show a fallback alert or simulate insert
        throw error;
      }
      
      // Clear input on success
      setReplyText('');
      alert('Reply sent successfully!');
      fetchMessages(); // refresh to show the new outgoing message
    } catch (err: any) {
      console.error('Error sending reply:', err);
      alert('답장 전송 중 오류가 발생했습니다: ' + err.message + '\n(Instagram Page Access Token이 필요할 수 있습니다)');
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Left List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50/80 shrink-0">
          <h2 className="font-bold text-gray-900">Instagram DM Inbox</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Loading messages...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-400 italic">No conversations yet.</div>
          ) : (
            conversations.map((conv) => {
              const user = users[conv.userId];
              return (
                <button 
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv.userId)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedUserId === conv.userId ? 'bg-blue-50/50 outline-2 outline-blue-500 -outline-offset-2' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">
                      {user?.profile_pic_url ? (
                        <img src={user.profile_pic_url} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">
                          {user?.name?.[0] || 'IG'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <span className="font-semibold text-gray-900 flex items-center gap-1.5 truncate">
                          {conv.hasUnread && <span className="h-2 w-2 bg-blue-500 rounded-full inline-block shrink-0"></span>}
                          {user?.name || conv.userId}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{format(new Date(conv.latestMessageAt), 'HH:mm')}</span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{conv.messages[0].message}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Detail Viewer */}
      <div className="w-2/3 flex flex-col bg-gray-50/30">
        <div className="flex-1 p-6 flex flex-col h-full overflow-hidden">
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200 shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shadow-sm">
                        {users[selectedConversation.userId]?.profile_pic_url ? (
                          <img src={users[selectedConversation.userId].profile_pic_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                            {users[selectedConversation.userId]?.name?.[0] || 'IG'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-lg">
                          {users[selectedConversation.userId]?.name || selectedConversation.userId}
                        </h2>
                        <p className="text-xs text-blue-500 font-medium">@{selectedConversation.userId}</p>
                      </div>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto pr-4 space-y-4 mb-4 relative">
                    {/* Render messages in chronological order (oldest first) */}
                    {[...selectedConversation.messages].reverse().map((msg) => {
                       const isOutbound = msg.is_reply === true;
                       return (
                         <div key={msg.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                           <div className={`relative px-4 pt-3 pb-2 max-w-[85%] rounded-2xl shadow-sm border ${
                             isOutbound 
                               ? 'bg-blue-600 border-blue-700 text-white rounded-tr-none' 
                               : 'bg-white border-gray-200 text-gray-900 rounded-tl-none'
                           }`}>
                               {!isOutbound && (
                                   <span className="absolute -top-2.5 left-4 bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 rounded-md uppercase tracking-wider font-semibold border border-gray-200">
                                       Incoming
                                   </span>
                               )}
                               <p className={`mt-1 whitespace-pre-wrap ${!isOutbound && 'pt-2'}`}>
                                   {msg.message}
                               </p>
                               <div className={`mt-1 text-right text-[10px] ${isOutbound ? 'text-blue-200' : 'text-gray-400'}`}>
                                   {format(new Date(msg.received_at), 'MM-dd HH:mm')}
                               </div>
                           </div>
                         </div>
                       );
                    })}
                  </div>

                  {/* Reply Action Area */}
                  <div className="pt-4 border-t border-gray-100 shrink-0 mb-6">
                      <div className="flex gap-2">
                          <textarea 
                             rows={2}
                             placeholder="고객에게 보낼 답장을 입력하세요..."
                             value={replyText}
                             onChange={(e) => setReplyText(e.target.value)}
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' && !e.shiftKey) {
                                 e.preventDefault();
                                 handleSendReply();
                               }
                             }}
                             className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                          <button 
                             onClick={handleSendReply}
                             disabled={sendingReply || !replyText.trim()}
                             className="bg-blue-600 text-white px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                          >
                             {sendingReply ? '...' : 'Send'}
                          </button>
                      </div>
                  </div>

                  {/* Booking Converter Widget */}
                  <div className="pt-4 border-t border-gray-200 bg-gray-50/80 rounded-t-xl shrink-0">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 px-1">Quick Convert to Booking</h3>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                          <input 
                            type="text" 
                            placeholder="Extract Name" 
                            value={extractName}
                            onChange={(e) => setExtractName(e.target.value)}
                            className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 bg-white placeholder-gray-400" 
                          />
                          <input 
                            type="text" 
                            placeholder="Email / Phone" 
                            value={extractContact}
                            onChange={(e) => setExtractContact(e.target.value)}
                            className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 bg-white placeholder-gray-400" 
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                          <input 
                            type="date" 
                            min={format(new Date(), 'yyyy-MM-dd')}
                            value={extractDate}
                            onChange={(e) => {
                              setExtractDate(e.target.value);
                              // If they change to today, but time is in the past, reset time
                              const today = format(new Date(), 'yyyy-MM-dd');
                              const nowTime = format(new Date(), 'HH:mm');
                              if (e.target.value === today && extractTime < nowTime) {
                                const nextH = new Date();
                                nextH.setHours(nextH.getHours() + 1);
                                nextH.setMinutes(0);
                                setExtractTime(format(nextH, 'HH:mm'));
                              }
                            }}
                            className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 bg-white" 
                          />
                          <input 
                            type="time" 
                            min={extractDate === format(new Date(), 'yyyy-MM-dd') ? format(new Date(), 'HH:mm') : undefined}
                            value={extractTime}
                            onChange={(e) => setExtractTime(e.target.value)}
                            className="border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-900 bg-white" 
                          />
                      </div>
                      
                      {convertStatus.type !== 'idle' && (
                        <div className={`mb-3 p-2 rounded-md text-sm font-medium ${
                          convertStatus.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 
                          convertStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' :
                          'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {convertStatus.type === 'loading' ? 'Processing...' : convertStatus.message}
                        </div>
                      )}

                      <button 
                        onClick={handleConvert}
                        disabled={convertStatus.type === 'loading'}
                        className="bg-blue-600 text-white px-4 py-2.5 w-full rounded-md font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                          {convertStatus.type === 'loading' ? 'Processing...' : 'Create Booking from Conversation →'}
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

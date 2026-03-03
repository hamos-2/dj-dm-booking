export default function AdminDmInboxPage() {
  const MOCK_DMS = [
    { id: 'msg-1', username: 'user_abc', text: '안녕하세요, 6월 12일 예약 문의드립니다.', date: '06/10 09:32', status: 'unread' },
    { id: 'msg-2', username: 'user_xyz', text: '감사합니다. 확정할게요.', date: '06/09 18:00', status: 'read' },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      
      {/* Left List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50/80">
          <h2 className="font-bold text-gray-900">Instagram DM Inbox</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_DMS.map((dm) => (
            <button 
              key={dm.id}
              className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  dm.status === 'unread' ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-900 flex items-center gap-2">
                  {dm.status === 'unread' && <span className="h-2 w-2 bg-blue-500 rounded-full inline-block"></span>}
                  @{dm.username}
                </span>
                <span className="text-xs text-gray-500">{dm.date}</span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{dm.text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right Detail Viewer */}
      <div className="w-2/3 flex flex-col bg-gray-50/30">
        <div className="flex-1 p-8">
            <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center font-medium text-gray-500 mb-8 border-b pb-4">
                    Selected Conversation: @user_abc
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm relative">
                    <span className="absolute -top-3 left-4 bg-gray-100 px-2 py-0.5 text-xs text-gray-500 rounded-md">Incoming Message</span>
                    <p className="text-gray-900 text-lg">
                        "안녕하세요, 6월 12일 오후 2시에 예약 가능한가요? 1시간 정도 필요합니다."
                    </p>
                    <div className="mt-4 text-sm text-gray-400">
                        Received: 2025-06-10 09:32
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Quick Convert to Booking</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder="Extract Name" className="border rounded-md p-2 text-sm" />
                        <input type="text" placeholder="Extract Phone / Contact Info" className="border rounded-md p-2 text-sm" />
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 w-full rounded-md font-medium hover:bg-blue-700 transition-colors">
                        Convert to Booking &rarr;
                    </button>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
}

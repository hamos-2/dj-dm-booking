export default function AdminDashboardHome() {
  const MOCK_TODAY_BOOKINGS = [
    { id: '1', time: '09:00', customer: 'Hong Gil Dong', source: 'Web', status: 'confirmed' },
    { id: '2', time: '11:15', customer: 'Kim Chul Soo', source: 'Instagram', status: 'confirmed' },
    { id: '3', time: '15:15', customer: 'Lee Young Hee', source: 'Web', status: 'confirmed' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Today's Overview</h1>
        <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
          June 10, 2025 (Tue)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Today</div>
          <div className="text-3xl font-bold text-gray-900">3</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-500 mb-1">This Week</div>
          <div className="text-3xl font-bold text-gray-900">12</div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm bg-blue-50/50">
          <div className="text-sm font-medium text-blue-600 mb-1">Unread DMs</div>
          <div className="text-3xl font-bold text-blue-700">2</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-base font-semibold leading-6 text-gray-900">Today's Timeline</h3>
        </div>
        <ul className="divide-y divide-gray-100">
          {MOCK_TODAY_BOOKINGS.map((booking) => (
            <li key={booking.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center">
              <div className="w-16 font-medium text-gray-900">{booking.time}</div>
              
              <div className="flex-1 px-4 flex items-center space-x-4">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                
                <span className="font-medium">{booking.customer}</span>
                
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  booking.source === 'Instagram' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {booking.source}
                </span>
              </div>
              
              <button className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors">
                View Details
              </button>
            </li>
          ))}
          {/* Empty Slot mockup */}
           <li className="p-6 flex items-center bg-gray-50/30">
              <div className="w-16 font-medium text-gray-400">14:00</div>
               <div className="flex-1 px-4 flex items-center space-x-4">
                  <span className="h-3 w-3 rounded-full border-2 border-dashed border-gray-300"></span>
                  <span className="text-gray-400 italic">No booking</span>
               </div>
           </li>
        </ul>
      </div>

    </div>
  );
}

export default function AdminBookingsPage() {
  const MOCK_BOOKINGS = [
    { id: '1', date: '6/10', time: '09:00', customer: 'Hong Gil Dong', source: 'Web', status: 'confirmed' },
    { id: '2', date: '6/10', time: '11:15', customer: 'Kim Chul Soo', source: 'DM', status: 'confirmed' },
    { id: '3', date: '6/09', time: '14:00', customer: 'Lee Young Hee', source: 'Web', status: 'canceled' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Bookings List</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex space-x-2">
            <select className="border border-gray-300 rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-blue-500">
                <option>All Statuses</option>
                <option>Confirmed</option>
                <option>Canceled</option>
            </select>
            <input type="date" className="border border-gray-300 rounded-md text-sm p-2 outline-none focus:ring-1 focus:ring-blue-500"/>
        </div>
        <div className="w-full sm:w-64 relative">
             <input type="text" placeholder="Search by name or contact" className="w-full border border-gray-300 pl-3 pr-8 py-2 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"/>
             <span className="absolute right-3 top-2.5 text-gray-400">🔍</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/80 border-b border-gray-100 uppercase tracking-wide text-xs text-gray-500">
            <tr>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-6 py-4 font-semibold">Customer Name</th>
              <th className="px-6 py-4 font-semibold">Source</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold w-12">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
             {MOCK_BOOKINGS.map((b) => (
                 <tr className="hover:bg-gray-50 transition-colors" key={b.id}>
                    <td className="px-6 py-4 font-medium text-gray-900">{b.date}</td>
                    <td className="px-6 py-4">{b.time}</td>
                    <td className="px-6 py-4 font-medium">{b.customer}</td>
                    <td className="px-6 py-4 text-gray-500">{b.source}</td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            b.status === 'confirmed' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                           {b.status === 'confirmed' ? '✅ Confirmed' : '❌ Canceled'} 
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded hover:bg-gray-100">
                            ⋮
                        </button>
                    </td>
                 </tr>
             ))}
          </tbody>
        </table>
        
        <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between bg-gray-50/30">
             <button className="text-sm border border-gray-300 bg-white px-3 py-1.5 rounded disabled:opacity-50">Previous</button>
             <span className="text-sm text-gray-500">Page 1 of 3</span>
             <button className="text-sm border border-gray-300 bg-white px-3 py-1.5 rounded">Next</button>
        </div>
      </div>

    </div>
  );
}

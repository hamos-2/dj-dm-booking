export default function AvailabilitySettingsPage() {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
                 <select className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500">
                     <option>30 mins</option>
                     <option selected>60 mins</option>
                     <option>90 mins</option>
                 </select>
             </div>
             <div className="flex-1">
                 <label className="block text-sm font-medium text-gray-700 mb-2">Buffer Time (minutes)</label>
                 <select className="w-full border border-gray-300 rounded-md p-2 focus:ring-1 focus:ring-blue-500">
                     <option>0 mins</option>
                     <option selected>15 mins</option>
                     <option>30 mins</option>
                 </select>
                 <p className="text-xs text-gray-500 mt-1">Time between consecutive bookings</p>
             </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Weekly Schedule</h3>
            
            {DAYS.map((day, idx) => {
               const isActive = idx < 5; // Mon-Fri active mock
               return (
                <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-24 font-medium flex items-center gap-3">
                        <input type="checkbox" defaultChecked={isActive} className="rounded text-blue-600" />
                        {day}
                    </div>
                    
                    {isActive ? (
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                            <input type="time" defaultValue="09:00" className="border border-gray-300 rounded-md p-1 px-2 text-sm w-full" />
                            <span className="text-gray-400">-</span>
                            <input type="time" defaultValue="18:00" className="border border-gray-300 rounded-md p-1 px-2 text-sm w-full" />
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

        <div className="pt-4 flex justify-end">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                Save Configuration
            </button>
        </div>
      </div>
      
    </div>
  );
}

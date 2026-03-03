export default function IntegrationsSettingsPage() {
  const isGoogleConnected = true;

  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in duration-500">
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-500">Manage third-party connections required for your system.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg p-2 shadow-sm flex items-center justify-center">
                  <span className="text-2xl">📅</span>
              </div>
              <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Google Calendar</h3>
                  <p className="text-sm text-gray-500 mb-2 mt-1">
                      Two-way sync for bookings and availability verification.
                  </p>
                  
                  {isGoogleConnected ? (
                      <div className="flex items-center gap-2 mt-2">
                          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                          <span className="text-sm font-medium text-gray-900">Connected to <strong>admin@example.com</strong></span>
                      </div>
                  ) : (
                      <div className="flex items-center gap-2 mt-2">
                          <span className="flex h-2 w-2 rounded-full bg-red-400"></span>
                          <span className="text-sm text-gray-500">Not connected</span>
                      </div>
                  )}
              </div>
           </div>

           <div>
              {isGoogleConnected ? (
                  <button className="text-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
                      Re-authenticate
                  </button>
              ) : (
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm">
                      Connect Google Account
                  </button>
              )}
           </div>
        </div>
        
        {isGoogleConnected && (
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">Token auto-refreshes using OAuth. Last sync: Just now.</span>
                <button className="text-red-500 font-medium hover:bg-red-50 px-3 py-1 rounded transition-colors">
                    Disconnect
                </button>
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm opacity-60">
        <div className="flex items-center justify-between">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 justify-center to-purple-600 rounded-lg flex items-center text-white">
                  <span className="text-2xl font-bold italic">ig</span>
              </div>
              <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Instagram Webhooks</h3>
                  <p className="text-sm text-gray-500 mb-2 mt-1">
                      Receive Direct Messages into your inbox directly. Configured via Meta App settings.
                  </p>
                  
                  <div className="flex items-center gap-2 mt-2">
                      <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-sm font-medium text-gray-900">Webhook Active</span>
                  </div>
              </div>
           </div>
        </div>
      </div>
      
    </div>
  );
}

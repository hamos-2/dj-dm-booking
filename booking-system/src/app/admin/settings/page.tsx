'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function IntegrationsSettingsPage() {
  const supabase = createClient();
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [instagramSettings, setInstagramSettings] = useState<any>({
    instagram_verify_token: '',
    instagram_access_token: '',
    facebook_page_id: '',
    facebook_page_name: ''
  });
  const [loading, setLoading] = useState(true);
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [showInstagramConfig, setShowInstagramConfig] = useState(false);

  const fetchStatus = async () => {
    try {
      // Google Status
      const googleRes = await fetch('/api/admin/integrations/google');
      const googleData = await googleRes.json();
      setIsGoogleConnected(googleData.connected);
      setConnectedEmail(googleData.email);

      // Instagram Settings
      const igRes = await fetch('/api/admin/integrations/instagram');
      const igData = await igRes.json();
      if (igData.settings) {
        setInstagramSettings(igData.settings);
      }
    } catch (err) {
      console.error('Failed to fetch integration status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleGoogleAuth = () => {
    // Redirect to OAuth start
    window.location.href = '/api/auth/google';
  };

  const handleDisconnect = async () => {
    if (!confirm('정말 연동을 해제하시겠습니까?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('oauth_tokens')
        .delete()
        .eq('provider', 'google'); // Simplified for admin

      if (error) throw error;
      setIsGoogleConnected(false);
      setConnectedEmail(null);
      alert('연동이 해제되었습니다.');
    } catch (err: any) {
      alert('해제 중 오류: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstagram = async () => {
    setSavingInstagram(true);
    try {
      const res = await fetch('/api/admin/integrations/instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: instagramSettings })
      });
      const data = await res.json();
      if (data.success) {
        alert('Instagram 설정이 저장되었습니다.');
        setShowInstagramConfig(false);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert('저장 중 오류: ' + err.message);
    } finally {
      setSavingInstagram(false);
    }
  };

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
                          <span className="text-sm font-medium text-gray-900">Connected to <strong>{connectedEmail || 'Account'}</strong></span>
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
              <button 
                onClick={handleGoogleAuth}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm ${
                    isGoogleConnected 
                    ? 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                  {isGoogleConnected ? 'Re-authenticate' : 'Connect Google Account'}
              </button>
           </div>
        </div>
        
        {isGoogleConnected && (
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">Token auto-refreshes using OAuth. Last sync: Just now.</span>
                <button 
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="text-red-500 font-medium hover:bg-red-50 px-3 py-1 rounded transition-colors disabled:opacity-50"
                >
                    {loading ? 'Disconnecting...' : 'Disconnect'}
                </button>
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
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
                      <span className={`flex h-2 w-2 rounded-full ${
                        instagramSettings.instagram_verify_token && 
                        instagramSettings.instagram_verify_token !== 'default_verify_token' 
                          ? 'bg-green-500' : 'bg-gray-300'
                      }`}></span>
                      <span className="text-sm font-medium text-gray-900">
                        {instagramSettings.instagram_verify_token && 
                         instagramSettings.instagram_verify_token !== 'default_verify_token' 
                          ? 'Webhook Configured' : 'Setup Required'}
                      </span>
                  </div>
              </div>
           </div>
           <div>
              <button 
                onClick={() => setShowInstagramConfig(!showInstagramConfig)}
                className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
              >
                  {showInstagramConfig ? 'Close' : 'Manage'}
              </button>
           </div>
        </div>

        {showInstagramConfig && (
          <div className="mt-8 pt-8 border-t border-gray-100 space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="grid gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL (Meta App에 입력)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instagramWebhook`}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-500"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/instagramWebhook`);
                      alert('URL이 복사되었습니다.');
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm border border-gray-200"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Verify Token</label>
                  <input 
                    type="text" 
                    value={instagramSettings.instagram_verify_token || ''}
                    onChange={(e) => setInstagramSettings({...instagramSettings, instagram_verify_token: e.target.value})}
                    placeholder="E.g. my_custom_token"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Meta App Webhook 설정의 'Verify Token'과 일치해야 합니다.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook Page ID</label>
                  <input 
                    type="text" 
                    readOnly
                    value={instagramSettings?.facebook_page_name ? `${instagramSettings.facebook_page_name} (${instagramSettings.facebook_page_id})` : instagramSettings?.facebook_page_id || ''}
                    placeholder="자동으로 연동됩니다"
                    className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-500 outline-none"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Access Token 저장 시 자동으로 확인되어 연동됩니다.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook Page Access Token</label>
                  <input 
                    type="password" 
                    value={instagramSettings.instagram_access_token || ''}
                    onChange={(e) => setInstagramSettings({...instagramSettings, instagram_access_token: e.target.value})}
                    placeholder="EAAWtor..."
                    className="w-full border border-gray-300 rounded-md p-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">답장 발송을 위한 권한(pages_messaging)이 포함된 페이지 토큰입니다.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveInstagram}
                disabled={savingInstagram}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50"
              >
                {savingInstagram ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}

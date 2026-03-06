'use client';

import { useState, useEffect } from 'react';

const ENV_KEYS = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', section: 'Supabase' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', section: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', section: 'Supabase', type: 'password' },
  { key: 'GOOGLE_CLIENT_ID', label: 'Google Client ID', section: 'Google OAuth' },
  { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret', section: 'Google OAuth', type: 'password' },
  { key: 'GOOGLE_REDIRECT_URI', label: 'Google Redirect URI', section: 'Google OAuth' },
  { key: 'NEXT_PUBLIC_APP_URL', label: 'App URL', section: 'App Configuration' },
];

export default function EnvironmentSettingsPage() {
  const [env, setEnv] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchEnv();
  }, []);

  const fetchEnv = async () => {
    try {
      const res = await fetch('/api/admin/env');
      const data = await res.json();
      if (data.env) {
        setEnv(data.env);
      }
    } catch (err) {
      console.error('Failed to fetch env:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env }),
      });
      if (res.ok) {
        setMessage({ text: 'Environment variables saved! Next.js may restart to apply changes.', type: 'success' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err: any) {
      setMessage({ text: 'Error saving: ' + err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const sections = Array.from(new Set(ENV_KEYS.map(k => k.section)));

  if (loading) return <div className="p-8 text-center text-gray-500">Loading configurations...</div>;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Environment Configuration</h1>
        <p className="text-gray-500">Manage your local development environment variables (.env.local).</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {sections.map(section => (
          <div key={section} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-gray-900">{section}</h3>
            </div>
            <div className="p-6 space-y-5">
              {ENV_KEYS.filter(k => k.section === section).map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input 
                    type={field.type || 'text'}
                    value={env[field.key] || ''}
                    onChange={(e) => setEnv({ ...env, [field.key]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder={`Enter ${field.label}`}
                  />
                  <p className="mt-1 text-[11px] text-gray-400 font-mono">{field.key}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="fixed bottom-8 right-8">
          <button 
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Saving...
              </>
            ) : 'Save Environment Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

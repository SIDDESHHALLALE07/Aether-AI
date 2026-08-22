import React from 'react';
import { useThemeStore } from '../stores/useThemeStore';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Account & Platform Settings</h1>
        <p className="text-xs text-gray-400 mt-1">Manage API preferences, theme configuration, and storage parameters.</p>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div>
            <h3 className="text-xs font-bold text-white">Appearance Theme</h3>
            <p className="text-[11px] text-gray-400">Select default user interface theme mode.</p>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="dark" className="bg-gray-900">Dark Mode (Default)</option>
            <option value="light" className="bg-gray-900">Light Mode</option>
            <option value="system" className="bg-gray-900">System Preference</option>
          </select>
        </div>

        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div>
            <h3 className="text-xs font-bold text-white">Gemini API Gateway</h3>
            <p className="text-[11px] text-gray-400">Managed via backend server environment variables (`GEMINI_API_KEY`).</p>
          </div>
          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            Backend Proxy Active
          </span>
        </div>
      </div>
    </div>
  );
};

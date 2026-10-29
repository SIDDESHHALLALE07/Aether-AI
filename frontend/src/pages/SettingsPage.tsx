import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { UserSettings } from '../types';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Loader2, Save, RotateCcw } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { resetWorkspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'data' | 'ai' | 'reports'>('appearance');
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'light',
    date_format: 'YYYY-MM-DD',
    number_format: 'standard',
    copilot_enabled: true,
    copilot_style: 'balanced',
    copilot_level: 'beginner',
    ai_processing_enabled: true,
    outlier_method: 'iqr',
    correlation_method: 'pearson',
    missing_value_strategy: 'median',
    max_chart_count: 6,
    report_title_template: 'Executive Dataset Intelligence Report',
    report_include_summary: true,
    report_include_quality: true,
    report_include_stats: true,
    report_include_charts: true,
    report_include_correlations: true,
    report_include_patterns: true,
    report_include_insights: true,
    report_include_recommendations: true,
    report_include_cleaning: true,
    notify_analysis_complete: true,
    notify_cleaning_complete: true,
    notify_report_ready: true,
    notify_errors: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const saved = await api.getUserSettings().catch(() => null);
        if (saved) {
          setSettings({ ...saved, theme: 'light' });
        }
      } catch {
        // Handled
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const updated = await api.updateUserSettings({ ...settings, theme: 'light' });
      setSettings({ ...updated, theme: 'light' });
      setSaveStatus('Settings saved successfully.');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetWorkspace = () => {
    if (window.confirm('Reset active workspace state?')) {
      resetWorkspace();
      setSaveStatus('Workspace state reset.');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const tabs: { id: 'account' | 'appearance' | 'data' | 'ai' | 'reports'; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'data', label: 'Data Processing' },
    { id: 'ai', label: 'AI Copilot' },
    { id: 'reports', label: 'Report Defaults' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin mx-auto mb-2" />
        <p className="text-xs text-[#64748B]">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Settings</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Application preferences and configuration</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 sm:py-2 rounded-md transition-colors touch-manipulation"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {saveStatus && (
        <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs">
          {saveStatus}
        </div>
      )}

      {/* Responsive Tab Strip */}
      <div className="overflow-x-auto scrollbar-none flex border-b border-[#E2E8F0] space-x-2 sm:space-x-4 text-xs font-medium min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 px-1 border-b-2 transition-colors whitespace-nowrap touch-manipulation ${
              activeTab === tab.id
                ? 'border-[#2563EB] text-[#2563EB] font-semibold'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-6 space-y-4 text-xs text-[#0F172A] min-w-0">
        {/* 1. Account */}
        {activeTab === 'account' && (
          <div className="space-y-4 min-w-0">
            <h2 className="font-semibold text-sm text-[#0F172A]">Account Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">User Name</label>
                <input
                  type="text"
                  disabled
                  value="Aether Analyst"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value="analyst@aether.local"
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Appearance */}
        {activeTab === 'appearance' && (
          <div className="space-y-4 min-w-0">
            <h2 className="font-semibold text-sm text-[#0F172A]">Theme & Appearance</h2>
            <div className="space-y-3.5 max-w-md">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Theme</label>
                <select
                  disabled
                  value="light"
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A] touch-manipulation"
                >
                  <option value="light">Light (Standard Professional)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Language</label>
                <select
                  disabled
                  value="en"
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A] touch-manipulation"
                >
                  <option value="en">English (US)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 3. Data */}
        {activeTab === 'data' && (
          <div className="space-y-4 min-w-0">
            <h2 className="font-semibold text-sm text-[#0F172A]">Data & Workspace</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <button
                  type="button"
                  onClick={handleResetWorkspace}
                  className="flex items-center space-x-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2 rounded-md transition-colors touch-manipulation"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Clear workspace session state</span>
                </button>
              </div>
              <div className="pt-2">
                <label className="flex items-center space-x-2.5 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    checked={settings.ai_processing_enabled}
                    onChange={(e) => setSettings({ ...settings, ai_processing_enabled: e.target.checked })}
                    className="rounded border-[#CBD5E1] text-[#2563EB] w-4 h-4"
                  />
                  <span className="text-xs text-[#475569]">Enable automatic dataset statistical summarization on upload</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. AI */}
        {activeTab === 'ai' && (
          <div className="space-y-4 min-w-0">
            <h2 className="font-semibold text-sm text-[#0F172A]">AI Copilot Preferences</h2>
            <div className="space-y-3.5 max-w-md">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Response Style</label>
                <select
                  value={settings.copilot_style}
                  onChange={(e) => setSettings({ ...settings, copilot_style: e.target.value as any })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="concise">Concise (Direct analytical metrics)</option>
                  <option value="balanced">Balanced (Metrics + context)</option>
                  <option value="detailed">Detailed (In-depth breakdown)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Analytical Detail Level</label>
                <select
                  value={settings.copilot_level}
                  onChange={(e) => setSettings({ ...settings, copilot_level: e.target.value as any })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="beginner">Standard Business</option>
                  <option value="intermediate">Advanced Statistical</option>
                  <option value="advanced">Comprehensive Data Science</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 5. Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-4 min-w-0">
            <h2 className="font-semibold text-sm text-[#0F172A]">Report Generation Defaults</h2>
            <div className="space-y-3.5 max-w-md">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Default Format</label>
                <select
                  disabled
                  value="pdf"
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A] touch-manipulation"
                >
                  <option value="pdf">PDF (Print-Ready A4 Document)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">Default Report Detail</label>
                <select
                  value={settings.report_include_summary ? 'detailed' : 'summary'}
                  onChange={(e) => setSettings({ ...settings, report_include_summary: e.target.value === 'detailed' })}
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                >
                  <option value="summary">Summary Report</option>
                  <option value="detailed">Comprehensive Audit</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { UserSettings } from '../types';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useThemeStore } from '../stores/useThemeStore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  RotateCcw, 
  User, 
  Palette, 
  Database, 
  Bot, 
  FileText,
  CheckCircle2,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { 
  PageTransition,
  AnimatedCard,
  InteractiveButton,
  AetherSignal,
  SkeletonCard
} from '../components/motion';

export const SettingsPage: React.FC = () => {
  const { resetWorkspace } = useWorkspaceStore();
  const { theme: storeTheme, setTheme: setStoreTheme } = useThemeStore();
  const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'data' | 'ai' | 'reports'>('appearance');
  
  const [settings, setSettings] = useState<UserSettings>({
    theme: storeTheme || 'light',
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
          const localStored = (localStorage.getItem('aether_theme') as any) || storeTheme;
          const currentTheme = localStored || (saved.theme as any) || 'system';
          setSettings({ ...saved, theme: currentTheme });
          if (currentTheme) {
            setStoreTheme(currentTheme);
          }
        } else {
          setSettings(prev => ({ ...prev, theme: storeTheme }));
        }
      } catch {
        // Handled
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setSettings(prev => ({ ...prev, theme: newTheme }));
    setStoreTheme(newTheme);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const updated = await api.updateUserSettings(settings);
      setSettings(updated);
      setStoreTheme(updated.theme);
      setSaveStatus('Preferences saved successfully.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetWorkspace = () => {
    if (window.confirm('Reset active workspace state and reload defaults?')) {
      resetWorkspace();
      setSaveStatus('Workspace cache reset.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const tabs: { id: 'account' | 'appearance' | 'data' | 'ai' | 'reports'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'data', label: 'Data Processing', icon: Database },
    { id: 'ai', label: 'AI Copilot', icon: Bot },
    { id: 'reports', label: 'Report Defaults', icon: FileText },
    { id: 'account', label: 'Account Profile', icon: User },
  ];

  if (isLoading) {
    return (
      <PageTransition className="max-w-4xl mx-auto py-12 space-y-4">
        <SkeletonCard lines={6} />
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-6 max-w-5xl mx-auto pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">Studio Settings</h1>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs sm:text-sm font-bold border border-blue-200">
              Preferences
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1.5">Configure statistical computation parameters, AI persona, and display units</p>
        </div>

        <InteractiveButton
          onClick={handleSave}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow touch-manipulation cursor-pointer min-h-[46px]"
        >
          {isSaving ? <AetherSignal status="processing" size="sm" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Saving Changes...' : 'Save Preferences'}</span>
        </InteractiveButton>
      </div>

      <AnimatePresence>
        {saveStatus && (
          <motion.div 
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center space-x-2.5 shadow-2xs"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{saveStatus}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented Tab Strip with Aether Glide */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center space-x-1.5 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none shadow-2xs relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap touch-manipulation cursor-pointer z-10 min-h-[44px] ${
                isActive
                  ? 'text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="settings-active-tab"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/60 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Card with Smooth Tab Switching */}
      <AnimatedCard className="p-6 sm:p-8 text-xs sm:text-sm text-[#0F172A] min-w-0 rounded-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* 1. Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-5 min-w-0">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-sm text-[#0F172A]">Display & Interface Standards</h2>
                  <p className="text-[11px] text-slate-500">Color temperature, system theme switching, and locale formatting</p>
                </div>

                <div className="space-y-5 max-w-xl">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-2">Color System & Themes</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Light Option */}
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleThemeChange('light')}
                        className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                          settings.theme === 'light'
                            ? 'border-[#2563EB] bg-blue-50/60 shadow-xs ring-1 ring-[#2563EB]'
                            : 'border-[#CBD5E1] hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                            <Sun className="w-4 h-4" />
                          </div>
                          {settings.theme === 'light' && (
                            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                          )}
                        </div>
                        <span className="font-bold text-xs text-[#0F172A]">Crisp Light</span>
                        <span className="text-[11px] text-[#64748B] mt-0.5">High-contrast modern enterprise SaaS mode</span>
                      </motion.button>

                      {/* Dark Option */}
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleThemeChange('dark')}
                        className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                          settings.theme === 'dark'
                            ? 'border-[#2563EB] bg-blue-50/60 shadow-xs ring-1 ring-[#2563EB]'
                            : 'border-[#CBD5E1] hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700">
                            <Moon className="w-4 h-4" />
                          </div>
                          {settings.theme === 'dark' && (
                            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                          )}
                        </div>
                        <span className="font-bold text-xs text-[#0F172A]">Obsidian Dark</span>
                        <span className="text-[11px] text-[#64748B] mt-0.5">Deep slate & obsidian dark cyber aesthetic</span>
                      </motion.button>

                      {/* System Option */}
                      <motion.button
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleThemeChange('system')}
                        className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                          settings.theme === 'system'
                            ? 'border-[#2563EB] bg-blue-50/60 shadow-xs ring-1 ring-[#2563EB]'
                            : 'border-[#CBD5E1] hover:border-slate-400 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
                            <Monitor className="w-4 h-4" />
                          </div>
                          {settings.theme === 'system' && (
                            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                          )}
                        </div>
                        <span className="font-bold text-xs text-[#0F172A]">System Default</span>
                        <span className="text-[11px] text-[#64748B] mt-0.5">Automatically syncs with OS dark/light mode</span>
                      </motion.button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">System Language</label>
                    <select
                      disabled
                      value="en"
                      className="w-full bg-slate-50 border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] shadow-2xs"
                    >
                      <option value="en">English (United States)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Data */}
            {activeTab === 'data' && (
              <div className="space-y-4 min-w-0">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-sm text-[#0F172A]">Computation & Workspace Cache</h2>
                  <p className="text-[11px] text-slate-500">Fast in-memory execution parameters and background summarization</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div>
                    <InteractiveButton
                      type="button"
                      onClick={handleResetWorkspace}
                      className="flex items-center space-x-2 bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-2xs touch-manipulation cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Flush Local Workspace State</span>
                    </InteractiveButton>
                    <p className="text-[11px] text-slate-400 mt-1.5">Clears active session cache and reloads datasets from backend storage.</p>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start space-x-3 cursor-pointer touch-manipulation">
                      <input
                        type="checkbox"
                        checked={settings.ai_processing_enabled}
                        onChange={(e) => setSettings({ ...settings, ai_processing_enabled: e.target.checked })}
                        className="rounded border-[#CBD5E1] text-[#2563EB] w-4 h-4 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block">Automatic Statistical Profiling on Upload</span>
                        <span className="text-[11px] text-slate-500 block">Computes column distributions, missing value ratios, and cardinality immediately when files are uploaded.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. AI */}
            {activeTab === 'ai' && (
              <div className="space-y-4 min-w-0">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-sm text-[#0F172A]">Aether Copilot Reasoning Persona</h2>
                  <p className="text-[11px] text-slate-500">Fine-tune tone, depth of statistical explanations, and analytical output</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Explanation Depth</label>
                    <select
                      value={settings.copilot_style}
                      onChange={(e) => setSettings({ ...settings, copilot_style: e.target.value as any })}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                    >
                      <option value="concise">Concise (Direct quantitative figures & metrics)</option>
                      <option value="balanced">Balanced (Empirical numbers + executive context)</option>
                      <option value="detailed">Exhaustive (Full mathematical methodology & caveats)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Audience Persona</label>
                    <select
                      value={settings.copilot_level}
                      onChange={(e) => setSettings({ ...settings, copilot_level: e.target.value as any })}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                    >
                      <option value="beginner">Business Executive (Strategic insights)</option>
                      <option value="intermediate">Data Analyst (Formulas, correlations, distributions)</option>
                      <option value="advanced">Senior Data Scientist (Parametric & non-parametric rigor)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Reports */}
            {activeTab === 'reports' && (
              <div className="space-y-4 min-w-0">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-sm text-[#0F172A]">Default Document Template</h2>
                  <p className="text-[11px] text-slate-500">Standard sections and styling embedded into generated PDF files</p>
                </div>

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Default Export Format</label>
                    <select
                      disabled
                      value="pdf"
                      className="w-full bg-slate-50 border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] shadow-2xs"
                    >
                      <option value="pdf">Vector PDF (Print-Ready A4 Document)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Default Audit Scope</label>
                    <select
                      value={settings.report_include_summary ? 'detailed' : 'summary'}
                      onChange={(e) => setSettings({ ...settings, report_include_summary: e.target.value === 'detailed' })}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                    >
                      <option value="summary">Summary Snapshot</option>
                      <option value="detailed">Comprehensive Deep-Dive Audit</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Account */}
            {activeTab === 'account' && (
              <div className="space-y-4 min-w-0">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="font-bold text-sm text-[#0F172A]">Analyst Profile</h2>
                  <p className="text-[11px] text-slate-500">Active user session metadata</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Name</label>
                    <input
                      type="text"
                      disabled
                      value="Aether Analyst"
                      className="w-full bg-slate-50 border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Session Email</label>
                    <input
                      type="email"
                      disabled
                      value="analyst@aether.local"
                      className="w-full bg-slate-50 border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] font-medium"
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </AnimatedCard>
    </PageTransition>
  );
};

import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';

export const LandingPage: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] font-sans transition-colors duration-200">
      {/* Header */}
      <nav className="h-14 border-b border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#111827] px-4 sm:px-6 flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <img src="/favicon.svg" alt="Aether Logo" className="w-6 h-6" width={24} height={24} />
          <span className="font-bold text-base tracking-tight text-[#0F172A] dark:text-white">
            Aether
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors touch-manipulation min-h-[34px] min-w-[34px] flex items-center justify-center border border-transparent hover:border-[#CBD5E1]"
            title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
          <Link 
            to="/dashboard"
            className="text-xs font-medium text-[#475569] hover:text-[#0F172A] dark:text-slate-300 dark:hover:text-white px-2.5 py-1.5 transition-colors touch-manipulation"
          >
            Overview
          </Link>
          <Link
            to="/dashboard"
            className="text-xs font-medium bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 py-1.5 rounded-md transition-colors touch-manipulation"
          >
            Open Aether
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6 space-y-6 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0F172A] tracking-tight">
            Data Analytics & Intelligence
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-xl">
            Aether provides automated data profiling, cleaning, statistical analysis, interactive Plotly visualization, and executive reporting.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2.5 rounded-md transition-colors touch-manipulation"
            >
              Get Started
            </Link>
            <Link
              to="/workspace"
              className="bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-4 py-2.5 rounded-md transition-colors touch-manipulation"
            >
              Workspace
            </Link>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-[#E2E8F0]">
          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
            <h3 className="text-xs font-semibold text-[#0F172A]">Data Cleaning</h3>
            <p className="text-xs text-[#64748B]">Quality scoring, deduplication, and non-destructive version rollback.</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1">
            <h3 className="text-xs font-semibold text-[#0F172A]">Statistical Analysis</h3>
            <p className="text-xs text-[#64748B]">Descriptive summaries, bivariate correlations, and anomaly detection.</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-1 sm:col-span-2 md:col-span-1">
            <h3 className="text-xs font-semibold text-[#0F172A]">Reports & AI</h3>
            <p className="text-xs text-[#64748B]">Automated PDF document compilation and natural language data queries.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

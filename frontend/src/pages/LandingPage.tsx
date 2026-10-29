import React from 'react';
import { Link } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Header */}
      <nav className="h-14 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-2 flex-shrink-0">
          <img src="/favicon.svg" alt="Aether Logo" className="w-6 h-6" width={24} height={24} />
          <span className="font-bold text-base tracking-tight text-[#0F172A]">
            Aether
          </span>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <Link 
            to="/dashboard"
            className="text-xs font-medium text-[#475569] hover:text-[#0F172A] px-2.5 py-1.5 transition-colors touch-manipulation"
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

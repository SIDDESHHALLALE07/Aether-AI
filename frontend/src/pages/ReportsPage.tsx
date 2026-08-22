import React from 'react';
import { FileText, Download, FileSpreadsheet } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Executive Reports & Data Export</h1>
          <p className="text-xs text-gray-400 mt-1">Export PDF summary reports or formula-injection protected CSV/Excel datasets.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <FileText className="w-8 h-8 text-indigo-400 mb-3" />
          <h2 className="text-sm font-bold text-white mb-1">Executive Summary PDF Report</h2>
          <p className="text-xs text-gray-400 mb-4">Includes dataset overview, quality score, cleaning log, analytics, rendered charts, and AI insights.</p>
          <button className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all">
            <Download className="w-4 h-4" />
            <span>Generate & Download PDF</span>
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <FileSpreadsheet className="w-8 h-8 text-cyan-400 mb-3" />
          <h2 className="text-sm font-bold text-white mb-1">Sanitized CSV / Excel Export</h2>
          <p className="text-xs text-gray-400 mb-4">Export current active dataset version (V2). Automatically escapes formula triggers (=, +, -, @).</p>
          <div className="flex space-x-3">
            <button className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all">
              <Download className="w-4 h-4" />
              <span>Export Clean CSV</span>
            </button>
            <button className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-xs font-semibold px-4 py-2.5 rounded-xl">
              <span>Export Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

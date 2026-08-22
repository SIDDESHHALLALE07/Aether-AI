import React from 'react';
import { Sparkles, ShieldCheck, RotateCcw } from 'lucide-react';

export const CleaningPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Data Cleaning</h1>
          <p className="text-xs text-gray-400 mt-1">Non-destructive cleaning with version history & before/after comparisons.</p>
        </div>
        <button className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold px-4 py-2 rounded-xl">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Rollback to V1</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Data Quality Breakdown</span>
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Completeness', score: 96, desc: '0.4% missing cells in TotalCharges' },
              { name: 'Uniqueness', score: 100, desc: 'Zero duplicate rows detected' },
              { name: 'Validity', score: 92, desc: '3 outlier values outside 1.5x IQR' },
              { name: 'Consistency', score: 94, desc: 'Category case variations normalized' },
            ].map((q, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-200">{q.name}</span>
                  <span className="text-emerald-400">{q.score}%</span>
                </div>
                <p className="text-[10px] text-gray-400">{q.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <h2 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Recommended Cleaning Operations</span>
          </h2>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <span className="text-xs font-bold text-purple-300">Impute Missing Values</span>
              <p className="text-[11px] text-gray-300 mt-1">Impute 12 missing TotalCharges cells using median ($1,390.50).</p>
              <button className="mt-3 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-lg font-semibold">
                Apply & Save V2
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

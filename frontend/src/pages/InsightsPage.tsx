import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { 
  Loader2, 
  Lightbulb, 
  Sparkles, 
  ArrowRight, 
  Bot
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { InsightItem } from '../types';

export const InsightsPage: React.FC = () => {
  const { activeDataset, datasets } = useWorkspaceStore();
  const navigate = useNavigate();

  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeDataset) return;

    let isMounted = true;
    const fetchInsights = async () => {
      setIsLoading(true);
      try {
        const data = await api.getInsights(activeDataset.id);
        if (isMounted) setInsights(data);
      } catch {
        if (isMounted) setInsights([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInsights();
    return () => {
      isMounted = false;
    };
  }, [activeDataset]);

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Automated Machine Insights</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <Lightbulb className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Active Dataset Selected</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            {datasets.length === 0
              ? 'Upload a dataset to derive automated heuristics, statistical conclusions, and tactical insights.'
              : 'Please select a dataset to view automated insights.'}
          </p>
          <Link 
            to="/datasets"
            className="inline-flex items-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation"
          >
            <span>{datasets.length === 0 ? 'Upload Dataset' : 'Select Dataset'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-amber-50/30 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Executive Machine Insights</h1>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              {insights.length} Findings
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 truncate" title={activeDataset.original_filename}>
            Dataset: <span className="font-semibold text-[#0F172A] font-mono">{activeDataset.original_filename}</span> • Automated AI Synthesis
          </p>
        </div>

        <Link
          to="/copilot"
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-xs hover:shadow inline-flex items-center space-x-1.5"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Ask Copilot About Insights</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 card-base">
          <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          <span className="mt-3 text-xs font-medium text-[#64748B]">Synthesizing statistical findings & tactical suggestions...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 text-xs text-[#64748B]">
          <Lightbulb className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-[#0F172A]">No Insights Generated Yet</h2>
          <p className="mt-1 max-w-sm mx-auto">
            Run an analysis or cleaning pass on this dataset to produce actionable executive insights.
          </p>
        </div>
      ) : (
        <div className="space-y-4 min-w-0">
          {insights.map((ins, idx) => {
            const evidenceObj = ins.computed_evidence || {};
            const evidenceEntries = Object.entries(evidenceObj).filter(([k]) => k !== 'raw');

            return (
              <div 
                key={ins.id || idx}
                className="p-5 sm:p-6 rounded-2xl card-base hover:border-slate-300 transition-all space-y-3.5 text-xs text-[#0F172A] shadow-xs min-w-0 border-l-4 border-l-blue-600"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-[#0F172A] break-words flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{ins.title}</span>
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 self-start sm:self-auto">
                    Finding #{idx + 1}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider block">Core Finding:</span>
                  <p className="text-sm text-slate-800 leading-relaxed break-words font-medium">{ins.description}</p>
                </div>

                {evidenceEntries.length > 0 && (
                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 font-mono text-[11px]">
                    <span className="font-sans font-bold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">Empirical Metrics:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {evidenceEntries.map(([key, val]) => (
                        <div key={key} className="bg-white p-2 rounded-lg border border-slate-200/60 flex items-center justify-between">
                          <span className="text-slate-500 truncate mr-2">{key}:</span>
                          <span className="text-slate-900 font-bold whitespace-nowrap">
                            {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(2)) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ins.ai_interpretation && (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1">
                    <span className="font-bold text-blue-800 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Recommended Action:</span>
                    </span>
                    <p className="text-xs text-blue-950 leading-relaxed break-words font-medium">{ins.ai_interpretation}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Derived by Aether Automated Reasoning</span>
                  <button
                    onClick={() => navigate('/copilot', { state: { initialPrompt: `Deep dive into this insight: ${ins.title}. Suggest concrete next steps.` } })}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Discuss in Copilot</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
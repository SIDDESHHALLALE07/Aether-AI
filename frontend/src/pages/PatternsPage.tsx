import React, { useEffect, useState, useMemo } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { 
  Loader2, 
  Compass, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { PatternResult } from '../types';

export const PatternsPage: React.FC = () => {
  const { activeDataset, datasets } = useWorkspaceStore();
  const navigate = useNavigate();

  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!activeDataset) return;

    let isMounted = true;
    const fetchPatterns = async () => {
      setIsLoading(true);
      try {
        const data = await api.getPatterns(activeDataset.id);
        if (isMounted) setPatterns(data);
      } catch {
        if (isMounted) setPatterns([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPatterns();
    return () => {
      isMounted = false;
    };
  }, [activeDataset]);

  const patternTypes = useMemo(() => {
    const types = new Set<string>();
    patterns.forEach(p => {
      if (p.pattern_type) types.add(p.pattern_type);
    });
    return Array.from(types);
  }, [patterns]);

  const filteredPatterns = useMemo(() => {
    if (filterType === 'all') return patterns;
    return patterns.filter(p => p.pattern_type?.toLowerCase() === filterType.toLowerCase());
  }, [patterns, filterType]);

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Pattern & Anomaly Discovery</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <Compass className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Active Dataset Selected</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            {datasets.length === 0 ? 'Upload a dataset to detect non-obvious statistical patterns and anomalies.' : 'Please select a dataset to view patterns.'}
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

  const getBadgeStyle = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('correl') || t.includes('relat')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (t.includes('outlier') || t.includes('anom')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (t.includes('trend') || t.includes('time')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (t.includes('distrib') || t.includes('skew')) {
      return 'bg-violet-50 text-violet-700 border-violet-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Pattern & Anomaly Discovery</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {patterns.length} Signals
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 truncate" title={activeDataset.original_filename}>
            Dataset: <span className="font-semibold text-[#0F172A] font-mono">{activeDataset.original_filename}</span>
          </p>
        </div>

        {/* Filter Pills */}
        {patternTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'all' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Signals ({patterns.length})
            </button>
            {patternTypes.map((pt) => (
              <button
                key={pt}
                onClick={() => setFilterType(pt)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  filterType.toLowerCase() === pt.toLowerCase() ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {pt}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 card-base">
          <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          <span className="mt-3 text-xs font-medium text-[#64748B]">Scanning dataset for anomalies, collinearity, and distribution clusters...</span>
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div className="p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 text-xs text-[#64748B]">
          <Compass className="w-10 h-10 text-[#94A3B8] mx-auto mb-3" />
          <h2 className="text-sm font-bold text-[#0F172A]">No Significant Patterns Detected</h2>
          <p className="mt-1 max-w-sm mx-auto">
            {filterType !== 'all' 
              ? `No patterns match the selected "${filterType}" filter.` 
              : 'The statistical scans did not identify severe anomalies or non-random clustering in this sample.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {filteredPatterns.map((p) => {
            const evidenceEntries = p.evidence ? Object.entries(p.evidence) : [];
            const badgeClass = getBadgeStyle(p.pattern_type || '');

            return (
              <div 
                key={p.id}
                className="p-5 rounded-2xl card-interactive flex flex-col justify-between space-y-4 text-xs min-w-0"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}>
                      {p.pattern_type}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  </div>

                  <p className="text-sm font-medium text-[#0F172A] leading-relaxed break-words">
                    {p.explanation}
                  </p>
                </div>

                {evidenceEntries.length > 0 && (
                  <div className="pt-3 border-t border-[#F1F5F9] font-mono text-[11px] text-[#64748B] space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans mb-1">Empirical Evidence:</span>
                    {evidenceEntries.slice(0, 4).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center gap-2">
                        <span className="truncate text-slate-600">{k}:</span>
                        <span className="font-bold text-[#0F172A] whitespace-nowrap">
                          {typeof v === 'number' ? v.toFixed(3) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Statistical Anomaly</span>
                  <button
                    onClick={() => navigate('/copilot', { state: { initialPrompt: `Explain this pattern in detail: ${p.explanation}` } })}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Analyze with AI</span>
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
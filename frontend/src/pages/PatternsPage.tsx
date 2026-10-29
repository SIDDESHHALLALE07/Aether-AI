import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Loader2, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { PatternResult } from '../types';

export const PatternsPage: React.FC = () => {
  const { activeDataset, datasets } = useWorkspaceStore();

  const [patterns, setPatterns] = useState<PatternResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Patterns</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">
            {datasets.length === 0 ? 'Please upload a dataset to detect patterns.' : 'Please select a dataset to view patterns.'}
          </p>
          <Link 
            to="/datasets"
            className="mt-3 inline-block bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors touch-manipulation"
          >
            {datasets.length === 0 ? 'Upload Dataset' : 'Select Dataset'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Patterns</h1>
        <p className="text-xs text-[#64748B] mt-0.5 truncate" title={activeDataset.original_filename}>
          Dataset: <span className="font-medium text-[#0F172A]">{activeDataset.original_filename}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 sm:py-20 bg-white border border-[#E2E8F0] rounded-xl">
          <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
          <span className="ml-2 text-xs text-[#64748B]">Scanning patterns...</span>
        </div>
      ) : patterns.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
          <Compass className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          No significant statistical patterns detected in this dataset.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
          {patterns.map((p) => {
            const evidenceEntries = p.evidence ? Object.entries(p.evidence) : [];

            return (
              <div 
                key={p.id}
                className="p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between space-y-3 text-xs min-w-0"
              >
                <div>
                  <h3 className="font-semibold text-xs text-[#2563EB] uppercase tracking-wider mb-1">
                    {p.pattern_type}
                  </h3>
                  <p className="text-[#0F172A] leading-relaxed break-words">
                    {p.explanation}
                  </p>
                </div>

                {evidenceEntries.length > 0 && (
                  <div className="pt-2.5 border-t border-[#F1F5F9] font-mono text-[11px] text-[#64748B] space-y-1">
                    {evidenceEntries.slice(0, 3).map(([k, v]) => (
                      <div key={k} className="flex justify-between items-center gap-2">
                        <span className="truncate">{k}:</span>
                        <span className="font-semibold text-[#0F172A] whitespace-nowrap">
                          {typeof v === 'number' ? v.toFixed(2) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

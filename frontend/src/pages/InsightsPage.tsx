import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Loader2, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { InsightItem } from '../types';

export const InsightsPage: React.FC = () => {
  const { activeDataset, datasets } = useWorkspaceStore();

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
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Insights</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">
            {datasets.length === 0
              ? 'No dataset available. Please upload a dataset to view insights.'
              : 'Please select a dataset to view insights.'}
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Insights</h1>
        <p className="text-xs text-[#64748B] mt-0.5 truncate" title={activeDataset.original_filename}>
          Dataset: <span className="font-medium text-[#0F172A]">{activeDataset.original_filename}</span>
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 sm:py-20 bg-white border border-[#E2E8F0] rounded-xl">
          <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
          <span className="ml-2 text-xs text-[#64748B]">Loading insights...</span>
        </div>
      ) : insights.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
          <Lightbulb className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <p>No insights found for this dataset.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 min-w-0">
          {insights.map((ins) => {
            const evidenceObj = ins.computed_evidence || {};
            const evidenceEntries = Object.entries(evidenceObj).filter(([k]) => k !== 'raw');

            return (
              <div 
                key={ins.id}
                className="p-4 sm:p-5 rounded-xl bg-white border border-[#E2E8F0] space-y-2.5 text-xs text-[#0F172A] shadow-xs min-w-0"
              >
                <h3 className="font-semibold text-sm sm:text-base text-[#0F172A] break-words">{ins.title}</h3>

                <div>
                  <span className="font-semibold text-[#475569] block text-[11px] uppercase tracking-wider">Finding:</span>
                  <p className="text-[#0F172A] mt-0.5 leading-relaxed break-words">{ins.description}</p>
                </div>

                {evidenceEntries.length > 0 && (
                  <div>
                    <span className="font-semibold text-[#475569] block mb-1 text-[11px] uppercase tracking-wider">Evidence:</span>
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 space-y-1 font-mono text-[11px]">
                      {evidenceEntries.map(([key, val]) => (
                        <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[#64748B] truncate">{key}:</span>
                          <span className="text-[#0F172A] font-semibold">
                            {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(2)) : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ins.ai_interpretation && (
                  <div className="pt-1">
                    <span className="font-semibold text-[#2563EB] block text-[11px] uppercase tracking-wider">Recommended Action:</span>
                    <p className="text-[#0F172A] mt-0.5 leading-relaxed break-words">{ins.ai_interpretation}</p>
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

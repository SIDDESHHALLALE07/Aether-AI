import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Compass, 
  Lightbulb, 
  Loader2, 
  Table 
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { api } from '../services/api';

export const DashboardPage: React.FC = () => {
  const { 
    projects, 
    datasets, 
    activeProject, 
    activeDataset, 
    selectDataset, 
    isLoadingProjects, 
    isLoadingDatasets 
  } = useWorkspaceStore();

  const navigate = useNavigate();
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [patternsCount, setPatternsCount] = useState<number>(0);
  const [insightsCount, setInsightsCount] = useState<number>(0);
  const [rowsCount, setRowsCount] = useState<number>(0);
  const [columnsCount, setColumnsCount] = useState<number>(0);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  useEffect(() => {
    if (!activeDataset) {
      setQualityScore(null);
      setPatternsCount(0);
      setInsightsCount(0);
      setRowsCount(0);
      setColumnsCount(0);
      return;
    }

    let isMounted = true;
    const fetchDatasetMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const qPromise = api.getDatasetQuality(activeDataset.id).catch(() => null);
        const pPromise = api.getPatterns(activeDataset.id).catch(() => []);
        const iPromise = api.getInsights(activeDataset.id).catch(() => []);
        const dPromise = api.getDataset(activeDataset.id).catch(() => null);

        const [q, p, i, d] = await Promise.all([qPromise, pPromise, iPromise, dPromise]);
        
        if (!isMounted) return;
        if (q) setQualityScore(q.overall_score);
        if (p) setPatternsCount(p.length);
        if (i) setInsightsCount(i.length);
        if (d && d.latest_version) {
          setRowsCount(d.latest_version.row_count);
          setColumnsCount(d.latest_version.column_count);
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) setIsLoadingMetrics(false);
      }
    };

    fetchDatasetMetrics();
    return () => {
      isMounted = false;
    };
  }, [activeDataset]);

  if (isLoadingProjects || isLoadingDatasets) {
    return (
      <div className="flex items-center justify-center py-16 sm:py-20 bg-white border border-[#E2E8F0] rounded-lg">
        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB] animate-spin" />
        <span className="ml-2 text-xs text-[#64748B]">Loading overview...</span>
      </div>
    );
  }

  if (!activeProject && projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Overview</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">No project selected. Create a project to begin.</p>
          <Link 
            to="/projects"
            className="mt-3 inline-block bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors touch-manipulation"
          >
            Create Project
          </Link>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Overview</h1>
          <Link
            to="/datasets"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-3.5 py-1.5 rounded-md transition-colors touch-manipulation"
          >
            Upload Dataset
          </Link>
        </div>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">No dataset available in this project. Please upload a dataset to begin analysis.</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Datasets', value: datasets.length.toString(), icon: FileSpreadsheet },
    { label: 'Volume', value: rowsCount > 0 ? `${rowsCount.toLocaleString()} rows × ${columnsCount} cols` : (activeDataset ? 'Profiling...' : '-'), icon: Table },
    { label: 'Quality', value: qualityScore !== null ? `${qualityScore}/100` : (isLoadingMetrics ? '...' : '-'), icon: ShieldCheck },
    { label: 'Patterns', value: patternsCount.toString(), icon: Compass },
    { label: 'Insights', value: insightsCount.toString(), icon: Lightbulb },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Overview</h1>
          <p className="text-xs text-[#64748B] mt-0.5 truncate" title={activeDataset?.original_filename || 'None'}>
            Dataset: <span className="font-medium text-[#0F172A]">{activeDataset?.original_filename || 'None'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link
            to="/datasets"
            className="flex-1 sm:flex-none text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-3.5 py-2 rounded-md transition-colors touch-manipulation"
          >
            Upload Dataset
          </Link>
          <Link
            to="/analytics"
            className="flex-1 sm:flex-none text-center bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2 rounded-md transition-colors touch-manipulation"
          >
            View Analysis
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {metrics.map((m, idx) => (
          <div key={idx} className="p-3 sm:p-3.5 rounded-lg bg-white border border-[#E2E8F0] min-w-0">
            <span className="text-[11px] sm:text-xs text-[#64748B] block truncate">{m.label}</span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-[#0F172A] truncate" title={m.value}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Datasets Table & Aether AI Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
        <div className="md:col-span-2 p-3.5 sm:p-4 rounded-lg bg-white border border-[#E2E8F0] space-y-3 min-w-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
              Project Datasets ({datasets.length})
            </h2>
            <Link to="/datasets" className="text-xs text-[#2563EB] hover:underline font-medium touch-manipulation">
              View all
            </Link>
          </div>

          <div className="overflow-x-auto border border-[#E2E8F0] rounded-md scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[380px]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2 px-3">Filename</th>
                  <th className="py-2 px-3">Size</th>
                  <th className="py-2 px-3">Version</th>
                  <th className="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {datasets.slice(0, 5).map((ds) => {
                  const isSelected = activeDataset?.id === ds.id;
                  return (
                    <tr key={ds.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-3 font-medium text-[#0F172A] max-w-[160px] truncate" title={ds.original_filename}>
                        {ds.original_filename}
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">
                        {(ds.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">
                        v{ds.current_version_num}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isSelected ? (
                          <span className="text-xs text-[#166534] font-medium">Active</span>
                        ) : (
                          <button
                            onClick={() => selectDataset(ds)}
                            className="text-[#2563EB] hover:underline text-xs font-medium touch-manipulation py-1 px-1.5"
                          >
                            Select
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Aether AI Quick Prompt */}
        <div className="p-3.5 sm:p-4 rounded-lg bg-white border border-[#E2E8F0] flex flex-col justify-between space-y-3 min-w-0">
          <div>
            <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider mb-2">
              Aether AI
            </h2>
            <div className="space-y-1.5">
              {[
                "What are the strongest relationships?",
                "Which columns need attention?",
                "Explain this distribution.",
                "What should I clean first?",
              ].map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    navigate('/copilot', { state: { initialPrompt: promptText } });
                  }}
                  className="w-full text-left text-xs p-2.5 rounded bg-[#F8FAFC] hover:bg-[#EFF6FF] border border-[#E2E8F0] text-[#0F172A] transition-colors touch-manipulation"
                >
                  {promptText}
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/copilot"
            className="w-full text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs py-2 rounded-md transition-colors block touch-manipulation"
          >
            Open Aether AI
          </Link>
        </div>
      </div>
    </div>
  );
};

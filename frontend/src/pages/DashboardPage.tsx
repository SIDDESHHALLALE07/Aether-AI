import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Compass, 
  Lightbulb, 
  Loader2, 
  Table,
  Upload,
  ArrowRight,
  Sparkles,
  Bot,
  Database,
  BarChart3,
  SlidersHorizontal,
  FileText
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
      <div className="flex flex-col items-center justify-center py-24 card-base">
        <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
        <span className="mt-3 text-xs font-medium text-[#64748B]">Initializing intelligence dashboard...</span>
      </div>
    );
  }

  if (!activeProject && projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-5">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Overview</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <Database className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">Get Started with Aether Copilot</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            Create your first workspace project to begin uploading datasets and deriving machine insights.
          </p>
          <Link 
            to="/projects"
            className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs hover:shadow touch-manipulation"
          >
            <span>Create New Project</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Overview</h1>
            <p className="text-xs text-[#64748B] mt-0.5">Project: <span className="font-semibold text-slate-800">{activeProject?.name}</span></p>
          </div>
          <Link
            to="/datasets"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-xs touch-manipulation inline-flex items-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Dataset</span>
          </Link>
        </div>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <FileSpreadsheet className="w-10 h-10 text-blue-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Datasets Uploaded Yet</h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto mt-1 mb-5">
            Upload a CSV, Excel, or JSON data file into this project to unlock automatic cleaning, correlation discovery, charts, and AI assistance.
          </p>
          <Link
            to="/datasets"
            className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </Link>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Project Datasets', value: datasets.length.toString(), icon: FileSpreadsheet, color: 'text-blue-600 bg-blue-50' },
    { label: 'Dataset Size', value: rowsCount > 0 ? `${rowsCount.toLocaleString()} rows × ${columnsCount} cols` : (activeDataset ? 'Profiling...' : '-'), icon: Table, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Data Quality', value: qualityScore !== null ? `${qualityScore.toFixed(0)} / 100` : (isLoadingMetrics ? '...' : '-'), icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Pattern Signals', value: patternsCount.toString(), icon: Compass, color: 'text-sky-600 bg-sky-50' },
    { label: 'Key Insights', value: insightsCount.toString(), icon: Lightbulb, color: 'text-amber-500 bg-amber-50' },
  ];

  return (
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Executive Overview</h1>
            <span className="pulse-dot-green" />
          </div>
          <p className="text-xs text-[#64748B]">
            Active Dataset: <span className="font-semibold text-[#0F172A] font-mono">{activeDataset?.original_filename || 'None'}</span>
            {activeDataset && <span className="ml-1.5 text-blue-600 font-semibold">(v{activeDataset.current_version_num})</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Link
            to="/datasets"
            className="flex-1 sm:flex-none text-center bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold px-3.5 py-2 rounded-lg transition-all shadow-2xs touch-manipulation inline-flex items-center justify-center space-x-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload File</span>
          </Link>
          <Link
            to="/workspace"
            className="flex-1 sm:flex-none text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-xs hover:shadow touch-manipulation inline-flex items-center justify-center space-x-1.5"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="p-4 rounded-xl card-base hover:border-slate-300 transition-all min-w-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-[#64748B] truncate">{m.label}</span>
                <div className={`p-1.5 rounded-lg ${m.color} border border-black/5`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-base sm:text-lg font-bold text-[#0F172A] truncate" title={m.value}>
                {m.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Launchpad & AI Assistant */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 min-w-0">
        {/* Datasets Table */}
        <div className="md:col-span-2 p-4 sm:p-5 rounded-xl card-base space-y-3.5 min-w-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Project Datasets ({datasets.length})
              </h2>
            </div>
            <Link to="/datasets" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-semibold touch-manipulation flex items-center space-x-1">
              <span>View all datasets</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl scrollbar-thin shadow-2xs">
            <table className="w-full text-left text-xs min-w-[420px]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3.5">Filename</th>
                  <th className="py-2.5 px-3.5">Size</th>
                  <th className="py-2.5 px-3.5">Version</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {datasets.slice(0, 5).map((ds) => {
                  const isSelected = activeDataset?.id === ds.id;
                  return (
                    <tr key={ds.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-2.5 px-3.5 font-medium text-[#0F172A] max-w-[200px] truncate" title={ds.original_filename}>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">{ds.original_filename}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-[#64748B] whitespace-nowrap">
                        {(ds.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="py-2.5 px-3.5 text-[#64748B] whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold">
                          v{ds.current_version_num}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        {isSelected ? (
                          <span className="inline-flex items-center space-x-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => selectDataset(ds)}
                            className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-semibold touch-manipulation py-1 px-2.5 rounded-md hover:bg-blue-50 transition-colors"
                          >
                            Set Active
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

        {/* Aether AI Quick Prompt Launchpad */}
        <div className="p-4 sm:p-5 rounded-xl card-base flex flex-col justify-between space-y-4 min-w-0 bg-gradient-to-b from-white to-blue-50/20">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Bot className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Aether AI Copilot
                </h2>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            </div>

            <p className="text-[11px] text-[#64748B] mb-2.5">Instant statistical inquiries on this dataset:</p>
            <div className="space-y-1.5">
              {[
                "What are the strongest relationships?",
                "Which columns have missing data or anomalies?",
                "Explain the distribution of numeric values.",
                "Provide actionable data cleaning suggestions.",
              ].map((promptText, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    navigate('/copilot', { state: { initialPrompt: promptText } });
                  }}
                  className="w-full text-left text-xs p-2.5 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-200 border border-[#E2E8F0] text-[#0F172A] transition-all touch-manipulation shadow-2xs hover:shadow-xs group flex items-center justify-between"
                >
                  <span className="truncate pr-2">{promptText}</span>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <Link
            to="/copilot"
            className="w-full text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs py-2.5 rounded-lg transition-all block touch-manipulation shadow-xs hover:shadow"
          >
            Launch Full Chat Studio
          </Link>
        </div>
      </div>

      {/* Feature Fast-Travel Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/cleaning"
          className="p-3.5 rounded-xl card-base hover:border-blue-300 transition-all flex items-center space-x-3 group"
        >
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#0F172A] truncate">Data Quality</div>
            <div className="text-[11px] text-[#64748B] truncate">Imputation & Cleaning</div>
          </div>
        </Link>

        <Link
          to="/analytics"
          className="p-3.5 rounded-xl card-base hover:border-indigo-300 transition-all flex items-center space-x-3 group"
        >
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-105 transition-transform">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#0F172A] truncate">Analytics Lab</div>
            <div className="text-[11px] text-[#64748B] truncate">Correlation & GroupBy</div>
          </div>
        </Link>

        <Link
          to="/visualizations"
          className="p-3.5 rounded-xl card-base hover:border-violet-300 transition-all flex items-center space-x-3 group"
        >
          <div className="p-2 rounded-lg bg-violet-50 text-violet-600 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#0F172A] truncate">Visual Studio</div>
            <div className="text-[11px] text-[#64748B] truncate">10+ Interactive Charts</div>
          </div>
        </Link>

        <Link
          to="/reports"
          className="p-3.5 rounded-xl card-base hover:border-emerald-300 transition-all flex items-center space-x-3 group"
        >
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#0F172A] truncate">Executive Reports</div>
            <div className="text-[11px] text-[#64748B] truncate">PDF & Excel Export</div>
          </div>
        </Link>
      </div>
    </div>
  );
};
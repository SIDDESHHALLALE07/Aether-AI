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
  BarChart3,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { api } from '../services/api';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  AnimatedCard, 
  CountUp,
  NoProjectsIllustration,
  NoDatasetsIllustration
} from '../components/motion';

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
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-24 card-base">
          <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          <span className="mt-3 text-xs font-medium text-[#64748B] dark:text-slate-400">Initializing intelligence dashboard...</span>
        </div>
      </PageTransition>
    );
  }

  if (!activeProject && projects.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8 space-y-5">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Overview</h1>
          <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19]">
            <NoProjectsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Get Started with Aether Copilot</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
              Create your first workspace project to begin uploading datasets and deriving machine insights.
            </p>
            <Link 
              to="/projects"
              className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs hover:shadow touch-manipulation active:scale-[0.98]"
            >
              <span>Create New Project</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (datasets.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Overview</h1>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Project: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeProject?.name}</span></p>
            </div>
            <Link
              to="/datasets"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-xs touch-manipulation inline-flex items-center space-x-1.5 active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Dataset</span>
            </Link>
          </div>
          <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19]">
            <NoDatasetsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Datasets Uploaded Yet</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
              Upload a CSV, Excel, or JSON data file into this project to unlock automatic cleaning, correlation discovery, charts, and AI assistance.
            </p>
            <Link
              to="/datasets"
              className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload File</span>
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-7 max-w-full pb-12 min-w-0">
        {/* Header Banner */}
        <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Executive Overview</h1>
              <span className="pulse-dot-green" />
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              Active Dataset: <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] font-mono">{activeDataset?.original_filename || 'None'}</span>
              {activeDataset && <span className="ml-2 text-blue-600 dark:text-blue-400 font-bold">(v{activeDataset.current_version_num})</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Link
              to="/datasets"
              className="flex-1 sm:flex-none text-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs touch-manipulation inline-flex items-center justify-center space-x-2 min-h-[44px] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload File</span>
            </Link>
            <Link
              to="/workspace"
              className="flex-1 sm:flex-none text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow touch-manipulation inline-flex items-center justify-center space-x-2 min-h-[44px] active:scale-[0.98]"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Metrics Row: Staggered entrance, restrained hover lift, CountUp values */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
          {/* 1: Project Datasets */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-6 rounded-2xl min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">Project Datasets</span>
                <div className="p-2 sm:p-2.5 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-800/40">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate">
                <CountUp value={datasets.length} />
              </div>
            </AnimatedCard>
          </StaggerItem>

          {/* 2: Dataset Size */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-6 rounded-2xl min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">Dataset Size</span>
                <div className="p-2 sm:p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/40">
                  <Table className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate">
                {rowsCount > 0 ? (
                  <span>
                    <CountUp value={rowsCount} /> r × {columnsCount} c
                  </span>
                ) : (activeDataset ? 'Profiling...' : '-')}
              </div>
            </AnimatedCard>
          </StaggerItem>

          {/* 3: Data Quality */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-6 rounded-2xl min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">Data Quality</span>
                <div className="p-2 sm:p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/50 dark:border-emerald-800/40">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate">
                {qualityScore !== null ? (
                  <span>
                    <CountUp value={qualityScore} suffix=" / 100" />
                  </span>
                ) : (isLoadingMetrics ? '...' : '-')}
              </div>
            </AnimatedCard>
          </StaggerItem>

          {/* 4: Pattern Signals */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-6 rounded-2xl min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">Pattern Signals</span>
                <div className="p-2 sm:p-2.5 rounded-xl text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200/50 dark:border-sky-800/40">
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate">
                <CountUp value={patternsCount} />
              </div>
            </AnimatedCard>
          </StaggerItem>

          {/* 5: Key Insights */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-6 rounded-2xl min-w-0">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider truncate">Key Insights</span>
                <div className="p-2 sm:p-2.5 rounded-xl text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-800/40">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate">
                <CountUp value={insightsCount} />
              </div>
            </AnimatedCard>
          </StaggerItem>
        </StaggerContainer>

        {/* Quick Launchpad & AI Assistant */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 min-w-0">
          {/* Datasets Table */}
          <div className="md:col-span-2 p-5 sm:p-7 rounded-2xl card-base space-y-4 min-w-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Project Datasets ({datasets.length})
                </h2>
              </div>
              <Link to="/datasets" className="text-xs sm:text-sm text-[#2563EB] dark:text-blue-400 hover:text-[#1D4ED8] font-semibold touch-manipulation flex items-center space-x-1.5 group">
                <span>View all datasets</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="overflow-x-auto border border-[#E2E8F0] dark:border-white/10 rounded-xl scrollbar-thin shadow-2xs">
              <table className="w-full text-left text-xs sm:text-sm min-w-[460px]">
                <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-bold border-b border-[#E2E8F0] dark:border-white/10 uppercase tracking-wider text-[11px] sm:text-xs">
                  <tr>
                    <th className="py-3.5 px-4">Filename</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4">Version</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5 bg-white dark:bg-[#111827]">
                  {datasets.slice(0, 5).map((ds) => {
                    const isSelected = activeDataset?.id === ds.id;
                    return (
                      <tr key={ds.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-[#0F172A] dark:text-[#F8FAFC] max-w-[220px] truncate" title={ds.original_filename}>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono">{ds.original_filename}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                          {(ds.file_size_bytes / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-xs font-mono font-semibold">
                            v{ds.current_version_num}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isSelected ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => selectDataset(ds)}
                              className="text-[#2563EB] dark:text-blue-400 hover:text-[#1D4ED8] text-xs sm:text-sm font-semibold touch-manipulation py-1.5 px-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors min-h-[38px] active:scale-[0.98]"
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
          <div className="p-5 sm:p-7 rounded-2xl card-base flex flex-col justify-between space-y-4 min-w-0 bg-gradient-to-b from-white to-blue-50/20 dark:from-[#111827] dark:to-blue-950/20">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-white/10 mb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
                    Aether AI Copilot
                  </h2>
                </div>
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>

              <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mb-3">Instant statistical inquiries on this dataset:</p>
              <div className="space-y-2">
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
                    className="w-full text-left text-xs sm:text-sm p-3 rounded-xl bg-white dark:bg-[#111827] hover:bg-blue-50/70 dark:hover:bg-blue-950/40 hover:border-blue-200 dark:hover:border-blue-800 border border-[#E2E8F0] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] transition-all touch-manipulation shadow-2xs hover:shadow-xs group flex items-center justify-between min-h-[44px] active:scale-[0.99]"
                  >
                    <span className="truncate pr-2 font-medium">{promptText}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <Link
              to="/copilot"
              className="w-full text-center bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs sm:text-sm py-3 rounded-xl transition-all block touch-manipulation shadow-xs hover:shadow min-h-[46px] flex items-center justify-center active:scale-[0.98]"
            >
              Launch Full Chat Studio
            </Link>
          </div>
        </div>

        {/* Feature Fast-Travel Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5">
          <Link
            to="/cleaning"
            className="p-4 sm:p-5 rounded-2xl card-base hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center space-x-3.5 group"
          >
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">Data Quality</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">Imputation & Cleaning</div>
            </div>
          </Link>

          <Link
            to="/analytics"
            className="p-4 sm:p-5 rounded-2xl card-base hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex items-center space-x-3.5 group"
          >
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">Analytics Lab</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">Correlation & GroupBy</div>
            </div>
          </Link>

          <Link
            to="/visualizations"
            className="p-4 sm:p-5 rounded-2xl card-base hover:border-violet-300 dark:hover:border-violet-700 transition-all flex items-center space-x-3.5 group"
          >
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">Visual Studio</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">10+ Interactive Charts</div>
            </div>
          </Link>

          <Link
            to="/reports"
            className="p-4 sm:p-5 rounded-2xl card-base hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex items-center space-x-3.5 group"
          >
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">Executive Reports</div>
              <div className="text-xs text-[#64748B] dark:text-slate-400 truncate">PDF & Excel Export</div>
            </div>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
};

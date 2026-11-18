import React, { useEffect, useState, useMemo } from 'react';
import {
  Upload,
  Play,
  Bot,
  Sparkles,
  ShieldCheck,
  BarChart3,
  PieChart,
  Lightbulb,
  CheckCircle2,
  Database,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Compass,
  FileText,
  Table as TableIcon,
  Search,
  ArrowUpRight,
  SlidersHorizontal,
  HardDrive
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { PlotlyChart } from '../components/common/PlotlyChart';
import { api } from '../services/api';
import type { DatasetVersion, DataQualityScore, DataProfile, SummaryStatistics } from '../types';
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  AnimatedCard,
  CountUp,
  SkeletonBox,
  SkeletonTable,
  InteractiveButton,
  NoDatasetsIllustration
} from '../components/motion';

export const WorkspacePage: React.FC = () => {
  const { activeDataset, activeProject, datasets } = useWorkspaceStore();
  const navigate = useNavigate();

  const [quality, setQuality] = useState<DataQualityScore | null>(null);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [summaryChartData, setSummaryChartData] = useState<any[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false);

  // Table Preview State
  const [previewData, setPreviewData] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    total_rows: number;
    page: number;
    limit: number;
  } | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(false);
  const [tableSearchFilter, setTableSearchFilter] = useState<string>('');
  const previewLimit = 15;

  // Sync selectedVersionNum with activeDataset
  useEffect(() => {
    if (activeDataset?.current_version_num) {
      setSelectedVersionNum(activeDataset.current_version_num);
      setPreviewPage(1);
    }
  }, [activeDataset?.id, activeDataset?.current_version_num]);

  // Load dataset metadata, quality, profile, and summary statistics
  useEffect(() => {
    if (!activeDataset?.id) {
      setQuality(null);
      setProfile(null);
      setVersions([]);
      setSummaryChartData([]);
      return;
    }

    let isMounted = true;
    setLoadingMetrics(true);

    Promise.allSettled([
      api.getDataset(activeDataset.id),
      api.getDatasetQuality(activeDataset.id),
      api.getDatasetProfile(activeDataset.id),
      api.getAnalyticsSummary(activeDataset.id),
    ]).then(([detailRes, qualRes, profRes, sumRes]) => {
      if (!isMounted) return;

      if (detailRes.status === 'fulfilled' && detailRes.value) {
        setVersions(detailRes.value.versions || []);
      }
      if (qualRes.status === 'fulfilled' && qualRes.value) {
        setQuality(qualRes.value);
      }
      if (profRes.status === 'fulfilled' && profRes.value) {
        setProfile(profRes.value);
      }
      if (sumRes.status === 'fulfilled' && sumRes.value) {
        const sumData = sumRes.value as SummaryStatistics;
        const statsMap = sumData.summary_statistics || (sumData as any).summaryStatistics || {};
        const keys = Object.keys(statsMap);
        if (keys.length > 0) {
          const k1 = keys[0];
          const k2 = keys[1] || keys[0];
          setSummaryChartData([
            {
              x: ['Min', 'Mean', 'Max'],
              y: [statsMap[k1]?.min || 0, statsMap[k1]?.mean || 0, statsMap[k1]?.max || 0],
              type: 'bar',
              name: k1,
              marker: { color: '#2563EB', opacity: 0.9 },
            },
            ...(keys.length > 1
              ? [
                {
                  x: ['Min', 'Mean', 'Max'],
                  y: [statsMap[k2]?.min || 0, statsMap[k2]?.mean || 0, statsMap[k2]?.max || 0],
                  type: 'bar',
                  name: k2,
                  marker: { color: '#8B5CF6', opacity: 0.9 },
                },
              ]
              : []),
          ]);
        } else {
          setSummaryChartData([]);
        }
      }
    }).finally(() => {
      if (isMounted) setLoadingMetrics(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeDataset?.id, activeDataset?.current_version_num]);

  // Load preview data rows for table
  useEffect(() => {
    if (!activeDataset?.id) {
      setPreviewData(null);
      return;
    }

    let isMounted = true;
    setIsTableLoading(true);

    api.getDatasetPreview(activeDataset.id, selectedVersionNum, previewPage, previewLimit)
      .then((data) => {
        if (!isMounted) return;
        setPreviewData(data);
      })
      .catch(() => {
        if (!isMounted) return;
        setPreviewData(null);
      })
      .finally(() => {
        if (isMounted) setIsTableLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDataset?.id, selectedVersionNum, previewPage]);

  const summaryChartLayout = useMemo(() => ({
    barmode: 'group' as const,
    margin: { t: 20, r: 15, l: 35, b: 30 },
    height: 195,
    autosize: true,
    legend: { orientation: 'h' as const, y: 1.25, x: 0 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'Inter, sans-serif', size: 11, color: '#475569' },
    xaxis: { showgrid: false },
    yaxis: { gridcolor: '#F1F5F9' },
  }), []);

  // Filter preview rows client-side if user types a filter string
  const filteredRows = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    if (!tableSearchFilter.trim()) return previewData.rows;
    const q = tableSearchFilter.toLowerCase();
    return previewData.rows.filter((row) =>
      previewData.columns.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [previewData, tableSearchFilter]);

  // Empty state when no dataset is selected
  if (!activeDataset) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Workspace Studio</h1>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1">Interactive data canvas, automated profiling, and machine intelligence hub.</p>
          </div>

          <div className="p-8 sm:p-14 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19] border border-[#E2E8F0] dark:border-white/10">
            <NoDatasetsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Active Dataset in Session</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto mt-1.5 mb-6 leading-relaxed">
              {datasets.length === 0
                ? 'Upload a CSV, Excel, or JSON dataset to initiate automated data cleaning, profiling, and statistical analysis.'
                : 'Select a dataset from your project or upload a new file to open your analysis studio.'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/datasets"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation inline-flex items-center space-x-2 active:scale-[0.98]"
              >
                <Upload className="w-4 h-4" />
                <span>{datasets.length === 0 ? 'Upload Your First Dataset' : 'Select Dataset'}</span>
              </Link>
              <Link
                to="/projects"
                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs font-semibold px-5 py-2.5 rounded-lg transition-all touch-manipulation active:scale-[0.98]"
              >
                Manage Projects
              </Link>
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  const numColsCount = profile?.numeric_summary
    ? Object.keys(profile.numeric_summary).length
    : (profile as any)?.numericSummary
      ? Object.keys((profile as any).numericSummary).length
      : 0;

  const catColsCount = profile?.categorical_summary
    ? Object.keys(profile.categorical_summary).length
    : (profile as any)?.categoricalSummary
      ? Object.keys((profile as any).categoricalSummary).length
      : 0;

  const overallQualityScore = quality?.overall_score ?? (quality as any)?.overallScore ?? null;
  const completenessScore = quality?.completeness_score ?? (quality as any)?.completenessScore ?? 0;
  const validityScore = quality?.validity_score ?? (quality as any)?.validityScore ?? 0;
  const uniquenessScore = quality?.uniqueness_score ?? (quality as any)?.uniquenessScore ?? 0;

  const totalRows = activeDataset.latest_version?.row_count ?? previewData?.total_rows ?? 0;
  const totalCols = activeDataset.latest_version?.column_count ?? previewData?.columns?.length ?? 0;
  const totalPages = previewData ? Math.ceil(previewData.total_rows / previewLimit) : 1;
  const fileExt = activeDataset.original_filename.split('.').pop()?.toUpperCase() || 'DATA';

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-7 max-w-full pb-12 min-w-0">
        {/* 1. WORKSPACE HERO & HEADER */}
        <div className="card-base bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 p-5 sm:p-7 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate">
                {activeProject?.name || 'Workspace Project'}
              </h1>
              <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800">
                v{activeDataset.current_version_num}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold border border-slate-200 dark:border-slate-700">
                {fileExt}
              </span>
              {overallQualityScore !== null && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Health Score <CountUp value={overallQualityScore} />/100</span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#475569] dark:text-slate-400">
              <span className="font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 truncate max-w-[240px] sm:max-w-md shadow-2xs font-medium" title={activeDataset.original_filename}>
                {activeDataset.original_filename}
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                <CountUp value={totalRows} />
                <span className="text-[#64748B] dark:text-slate-400 font-normal ml-1">Records</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                <span>{totalCols}</span>
                <span className="text-[#64748B] dark:text-slate-400 font-normal ml-1">Columns</span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-[#64748B] dark:text-slate-400 font-mono">
                {((activeDataset.file_size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/datasets"
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-2xs hover:border-slate-400 touch-manipulation min-h-[44px] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4 text-[#64748B] dark:text-slate-400" />
              <span>Switch / Upload</span>
            </Link>
            <Link
              to="/analytics"
              className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100/90 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs sm:text-sm font-semibold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition-all shadow-2xs touch-manipulation min-h-[44px] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400 fill-indigo-600" />
              <span>Run Analytics</span>
            </Link>
            <Link
              to="/copilot"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold py-2.5 px-4.5 rounded-xl flex items-center space-x-2 transition-all shadow-xs hover:shadow touch-manipulation min-h-[44px] active:scale-[0.98]"
            >
              <Bot className="w-4 h-4" />
              <span>Ask Aether AI</span>
            </Link>
          </div>
        </div>

        {/* 2. THREE-COLUMN ANALYSIS CONTROL CENTER */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 items-stretch">

          {/* LEFT COLUMN: DATASET PROFILE */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-7 rounded-2xl flex flex-col justify-between min-h-[490px]">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-white/10 mb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                      <Database className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Dataset Schema & Profile</h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">Automated type and structure assessment</p>
                    </div>
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-900/40">
                    PROFILED
                  </span>
                </div>

                {loadingMetrics ? (
                  <div className="space-y-3.5 py-6">
                    <SkeletonBox className="h-7 w-full" />
                    <SkeletonBox className="h-7 w-full" />
                    <SkeletonBox className="h-7 w-full" />
                    <SkeletonBox className="h-7 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/10 text-xs sm:text-sm">
                      <span className="text-[#64748B] dark:text-slate-400 font-medium flex items-center space-x-2">
                        <TableIcon className="w-4 h-4 text-slate-400" />
                        <span>Total Rows</span>
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono"><CountUp value={totalRows} /></span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/10 text-xs sm:text-sm">
                      <span className="text-[#64748B] dark:text-slate-400 font-medium flex items-center space-x-2">
                        <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                        <span>Total Columns</span>
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono">{totalCols}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/10 text-xs sm:text-sm">
                      <span className="text-[#64748B] dark:text-slate-400 font-medium flex items-center space-x-2">
                        <HardDrive className="w-4 h-4 text-slate-400" />
                        <span>Memory Footprint</span>
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] font-mono">{((activeDataset.file_size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/10 text-xs sm:text-sm">
                      <span className="text-[#64748B] dark:text-slate-400 font-medium">Numeric Features</span>
                      <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-100 dark:border-blue-800">{numColsCount} Columns</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-white/10 text-xs sm:text-sm">
                      <span className="text-[#64748B] dark:text-slate-400 font-medium">Categorical Features</span>
                      <span className="font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-0.5 rounded border border-violet-100 dark:border-violet-800">{catColsCount} Columns</span>
                    </div>
                  </div>
                )}

                {/* Quality Score Breakdown Bars */}
                {quality && (
                  <div className="mt-5 space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Health Metric Diagnostics</span>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="font-medium">Completeness</span>
                          <span className="font-bold text-slate-900 dark:text-[#F8FAFC] font-mono"><CountUp value={completenessScore} />%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, completenessScore)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full bg-emerald-500 rounded-full" 
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="font-medium">Validity</span>
                          <span className="font-bold text-slate-900 dark:text-[#F8FAFC] font-mono"><CountUp value={validityScore} />%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, validityScore)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full bg-blue-500 rounded-full" 
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                          <span className="font-medium">Uniqueness</span>
                          <span className="font-bold text-slate-900 dark:text-[#F8FAFC] font-mono"><CountUp value={uniquenessScore} />%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, uniquenessScore)}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full bg-violet-500 rounded-full" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {overallQualityScore !== null && (
                <div className="mt-5 pt-4 border-t border-[#E2E8F0] dark:border-white/10 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Overall Reliability</span>
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <CountUp value={overallQualityScore} /> / 100
                  </span>
                </div>
              )}
            </AnimatedCard>
          </StaggerItem>

          {/* CENTER COLUMN: ANALYSIS OVERVIEW */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-7 rounded-2xl flex flex-col justify-between min-h-[490px] space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40">
                      <BarChart3 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Distribution & Summary</h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">Bivariate range & statistical metrics</p>
                    </div>
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-2.5 py-1 rounded-md border border-violet-100 dark:border-violet-900/40">
                    PLOTLY
                  </span>
                </div>

                {/* Key KPI Strip */}
                <div className="grid grid-cols-2 gap-3.5 mt-4">
                  <div className="p-3.5 sm:p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                    <span className="text-xs text-blue-700 dark:text-blue-400 font-bold block uppercase tracking-wider">Active Version</span>
                    <span className="text-lg font-extrabold text-blue-900 dark:text-blue-300">Version {activeDataset.current_version_num}</span>
                  </div>
                  <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold block uppercase tracking-wider">Reliability Score</span>
                    <span className="text-lg font-extrabold text-emerald-900 dark:text-emerald-300">
                      {overallQualityScore !== null ? <span><CountUp value={overallQualityScore} /> / 100</span> : 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Embedded Plotly Chart Component */}
                <div className="h-60 sm:h-64 w-full mt-4 bg-white dark:bg-[#111827] rounded-xl p-1.5 border border-slate-100 dark:border-white/10 overflow-hidden shadow-2xs">
                  {summaryChartData.length > 0 ? (
                    <PlotlyChart
                      data={summaryChartData}
                      layout={summaryChartLayout}
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-[#94A3B8] text-xs sm:text-sm">
                      {loadingMetrics ? 'Loading statistical summary...' : 'No numerical columns found to render distribution.'}
                    </div>
                  )}
                </div>

                {/* Recent Automated Insights */}
                <div className="space-y-2 mt-4 pt-3.5 border-t border-slate-100 dark:border-white/10">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Key Insights Summary</span>
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Dataset <strong>{activeDataset.original_filename}</strong> isolated in memory.</span>
                    </div>
                    <div className="flex items-start space-x-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-white/5">
                      <TrendingUp className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>Non-destructive versioning active for <strong>V{activeDataset.current_version_num}</strong>.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                <span className="flex items-center space-x-2">
                  <span className="pulse-dot-green" />
                  <span className="font-medium">Real-time Profiler</span>
                </span>
                <Link to="/analytics" className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center space-x-1 group min-h-[36px]">
                  <span>View Full Analytics</span>
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </AnimatedCard>
          </StaggerItem>

          {/* RIGHT COLUMN: DATASET CONTEXT & ANALYSIS TOOLS */}
          <StaggerItem>
            <AnimatedCard interactive lift className="p-5 sm:p-7 rounded-2xl flex flex-col justify-between min-h-[490px]">
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] dark:border-white/10 mb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                      <Sparkles className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Studio Navigation</h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">Specialized analytic modules</p>
                    </div>
                  </div>
                  <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/40">
                    ACTIVE
                  </span>
                </div>

                {/* Status Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-2.5 mb-4">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-[#64748B] dark:text-slate-400 font-medium">Dataset Status</span>
                    <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-md border border-emerald-200 dark:border-emerald-800">Ready & Verified</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-[#64748B] dark:text-slate-400 font-medium">Version Branch</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Version {activeDataset.current_version_num}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="text-[#64748B] dark:text-slate-400 font-medium">Security Escaping</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Formula Protected</span>
                    </span>
                  </div>
                </div>

                {/* Analysis Tools Quick Links */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Analytical Workflow</span>

                  <button
                    onClick={() => navigate('/cleaning')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 group cursor-pointer min-h-[46px] active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Sparkles className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                      <span>Data Quality & Cleaning</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/visualizations')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 group cursor-pointer min-h-[46px] active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <PieChart className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                      <span>Visual Analytics Studio</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/patterns')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 group cursor-pointer min-h-[46px] active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Compass className="w-4.5 h-4.5 text-sky-600 dark:text-sky-400" />
                      <span>Pattern & Anomaly Discovery</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/insights')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 group cursor-pointer min-h-[46px] active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Lightbulb className="w-4.5 h-4.5 text-amber-500 dark:text-amber-400" />
                      <span>Automated AI Insights</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/reports')}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 group cursor-pointer min-h-[46px] active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Executive PDF Report</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                <span>Engine Speed</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Sub-second In-Memory</span>
              </div>
            </AnimatedCard>
          </StaggerItem>

        </StaggerContainer>

        {/* 3. DATASET PREVIEW & DATA TABLE */}
        <div className="p-5 sm:p-7 rounded-2xl card-base space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                <TableIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Dataset Records Table</h2>
                  <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                    {previewLimit} / page
                  </span>
                </div>
                {previewData && (
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-0.5">
                    Viewing records {((previewPage - 1) * previewLimit + 1).toLocaleString()} to {Math.min(previewPage * previewLimit, previewData.total_rows).toLocaleString()} of {previewData.total_rows.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Quick in-table search filter */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={tableSearchFilter}
                  onChange={(e) => setTableSearchFilter(e.target.value)}
                  placeholder="Filter current rows..."
                  className="bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] w-full sm:w-56 shadow-2xs min-h-[42px]"
                />
              </div>

              {/* Version Selector (if multiple versions exist) */}
              {versions.length > 1 && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <span className="font-medium text-[#475569] dark:text-slate-300 whitespace-nowrap">Version:</span>
                  <select
                    value={selectedVersionNum}
                    onChange={(e) => {
                      setSelectedVersionNum(Number(e.target.value));
                      setPreviewPage(1);
                    }}
                    className="bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] touch-manipulation shadow-2xs min-h-[42px]"
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.version_number}>
                        v{v.version_number} ({v.row_count.toLocaleString()} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tabular Preview */}
          {isTableLoading ? (
            <SkeletonTable rows={8} cols={previewData?.columns?.length || 5} />
          ) : filteredRows.length > 0 && previewData ? (
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-white/10 scrollbar-thin shadow-2xs">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-full">
                <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-bold border-b border-[#E2E8F0] dark:border-white/10 uppercase tracking-wider text-[11px] sm:text-xs">
                  <tr>
                    <th className="py-3 px-3.5 text-center text-[#94A3B8] font-mono w-14 border-r border-[#E2E8F0] dark:border-white/10 sticky left-0 bg-[#F8FAFC] dark:bg-slate-900 z-10">
                      #
                    </th>
                    {previewData.columns.map((col) => (
                      <th key={col} className="py-3 px-4 whitespace-nowrap border-r border-[#E2E8F0] dark:border-white/10 last:border-r-0 font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                        <div className="flex items-center space-x-1.5">
                          <span className="truncate">{col}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/5 font-mono text-xs sm:text-sm bg-white dark:bg-[#111827]">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/40 dark:hover:bg-blue-900/20 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-[#94A3B8] font-mono bg-[#F8FAFC] dark:bg-slate-900/70 border-r border-[#E2E8F0] dark:border-white/10 sticky left-0 font-medium">
                        {(previewPage - 1) * previewLimit + idx + 1}
                      </td>
                      {previewData.columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined || val === '';
                        return (
                          <td key={col} className="py-2.5 px-4 whitespace-nowrap border-r border-[#E2E8F0] dark:border-white/10 last:border-r-0 text-[#0F172A] dark:text-[#F8FAFC]">
                            {isNull ? (
                              <span className="text-[#94A3B8] italic font-normal bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">null</span>
                            ) : typeof val === 'number' ? (
                              <span className="text-slate-900 dark:text-slate-200 font-semibold">{val}</span>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300">{String(val)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-xs sm:text-sm text-[#64748B] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-[#E2E8F0] dark:border-white/10">
              {tableSearchFilter.trim()
                ? `No records match "${tableSearchFilter}". Try clearing your filter.`
                : 'No records found for this version.'}
            </div>
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3.5 border-t border-[#E2E8F0] dark:border-white/10 gap-3">
              <div className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                Showing page <span className="font-bold text-slate-800 dark:text-slate-200">{previewPage}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </div>

              <div className="flex items-center space-x-2.5">
                <InteractiveButton
                  disabled={previewPage <= 1 || isTableLoading}
                  onClick={() => setPreviewPage((prev) => Math.max(1, prev - 1))}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation shadow-2xs transition-colors min-h-[40px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </InteractiveButton>

                <InteractiveButton
                  disabled={previewPage >= totalPages || isTableLoading}
                  onClick={() => setPreviewPage((prev) => Math.min(totalPages, prev + 1))}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation shadow-2xs transition-colors min-h-[40px]"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </InteractiveButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

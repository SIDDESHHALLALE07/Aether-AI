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
  Loader2,
  FileSpreadsheet,
  Table as TableIcon,
  Search,
  ArrowUpRight,
  SlidersHorizontal,
  HardDrive
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Link, useNavigate } from 'react-router-dom';
import { PlotlyChart } from '../components/common/PlotlyChart';
import { api } from '../services/api';
import type { DatasetVersion, DataQualityScore, DataProfile, SummaryStatistics } from '../types';

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
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Workspace Studio</h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">Interactive data canvas, automated profiling, and machine intelligence hub.</p>
        </div>

        <div className="p-8 sm:p-14 text-center card-base bg-gradient-to-b from-white to-slate-50 border border-[#E2E8F0]">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#2563EB] mx-auto mb-4 shadow-xs">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A]">No Active Dataset in Session</h2>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto mt-1.5 mb-6 leading-relaxed">
            {datasets.length === 0
              ? 'Upload a CSV, Excel, or JSON dataset to initiate automated data cleaning, profiling, and statistical analysis.'
              : 'Select a dataset from your project or upload a new file to open your analysis studio.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/datasets"
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 touch-manipulation inline-flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>{datasets.length === 0 ? 'Upload Your First Dataset' : 'Select Dataset'}</span>
            </Link>
            <Link
              to="/projects"
              className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold px-5 py-2.5 rounded-lg transition-all touch-manipulation"
            >
              Manage Projects
            </Link>
          </div>
        </div>
      </div>
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
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* 1. WORKSPACE HERO & HEADER */}
      <div className="card-base bg-gradient-to-r from-white via-white to-blue-50/40 p-4 sm:p-6 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight truncate">
              {activeProject?.name || 'Workspace Project'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              v{activeDataset.current_version_num}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold border border-slate-200">
              {fileExt}
            </span>
            {overallQualityScore !== null && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center space-x-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Health Score {overallQualityScore.toFixed(0)}/100</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#475569]">
            <span className="font-mono bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-800 truncate max-w-[240px] sm:max-w-md shadow-2xs font-medium" title={activeDataset.original_filename}>
              {activeDataset.original_filename}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-800 flex items-center space-x-1">
              <span>{totalRows.toLocaleString()}</span>
              <span className="text-[#64748B] font-normal">Records</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-800 flex items-center space-x-1">
              <span>{totalCols}</span>
              <span className="text-[#64748B] font-normal">Columns</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[#64748B]">
              {((activeDataset.file_size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/datasets"
            className="bg-white hover:bg-slate-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-2xs hover:border-slate-400 touch-manipulation"
          >
            <Upload className="w-3.5 h-3.5 text-[#64748B]" />
            <span>Switch / Upload</span>
          </Link>
          <Link
            to="/analytics"
            className="bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition-all shadow-2xs touch-manipulation"
          >
            <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
            <span>Run Analytics</span>
          </Link>
          <Link
            to="/copilot"
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs hover:shadow hover:-translate-y-0.2 touch-manipulation"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Ask Aether AI</span>
          </Link>
        </div>
      </div>

      {/* 2. THREE-COLUMN ANALYSIS CONTROL CENTER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">

        {/* LEFT COLUMN: DATASET PROFILE */}
        <div className="p-5 sm:p-6 rounded-xl card-base flex flex-col justify-between min-h-[470px]">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Dataset Schema & Profile</h2>
                  <p className="text-[11px] text-[#64748B]">Automated type and structure assessment</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                PROFILED
              </span>
            </div>

            {loadingMetrics ? (
              <div className="flex flex-col items-center justify-center p-10 text-[#94A3B8] text-xs space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="font-medium text-slate-600">Profiling dataset schema...</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-[#64748B] font-medium flex items-center space-x-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Total Rows</span>
                  </span>
                  <span className="font-bold text-[#0F172A]">{totalRows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-[#64748B] font-medium flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Total Columns</span>
                  </span>
                  <span className="font-bold text-[#0F172A]">{totalCols}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-[#64748B] font-medium flex items-center space-x-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>Memory Footprint</span>
                  </span>
                  <span className="font-bold text-[#0F172A]">{((activeDataset.file_size_bytes || 0) / (1024 * 1024)).toFixed(2)} MB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-[#64748B] font-medium">Numeric Features</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{numColsCount} Columns</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs">
                  <span className="text-[#64748B] font-medium">Categorical Features</span>
                  <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">{catColsCount} Columns</span>
                </div>
              </div>
            )}

            {/* Quality Score Breakdown Bars */}
            {quality && (
              <div className="mt-5 space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Health Metric Diagnostics</span>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs text-slate-700 mb-1">
                      <span className="font-medium">Completeness</span>
                      <span className="font-bold text-slate-900 font-mono">{completenessScore.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, completenessScore)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-700 mb-1">
                      <span className="font-medium">Validity</span>
                      <span className="font-bold text-slate-900 font-mono">{validityScore.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, validityScore)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-700 mb-1">
                      <span className="font-medium">Uniqueness</span>
                      <span className="font-bold text-slate-900 font-mono">{uniquenessScore.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, uniquenessScore)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {overallQualityScore !== null && (
            <div className="mt-5 pt-3.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Overall Reliability</span>
              <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                {overallQualityScore.toFixed(0)} / 100
              </span>
            </div>
          )}
        </div>

        {/* CENTER COLUMN: ANALYSIS OVERVIEW */}
        <div className="p-5 sm:p-6 rounded-xl card-base flex flex-col justify-between min-h-[470px] space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Distribution & Summary</h2>
                  <p className="text-[11px] text-[#64748B]">Bivariate range & statistical metrics</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">
                PLOTLY
              </span>
            </div>

            {/* Key KPI Strip */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wider">Active Version</span>
                <span className="text-base font-extrabold text-blue-900">Version {activeDataset.current_version_num}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[10px] text-emerald-700 font-bold block uppercase tracking-wider">Reliability Score</span>
                <span className="text-base font-extrabold text-emerald-900">{overallQualityScore !== null ? `${overallQualityScore.toFixed(0)} / 100` : 'Pending'}</span>
              </div>
            </div>

            {/* Embedded Plotly Chart Component */}
            <div className="h-52 w-full mt-4 bg-white rounded-xl p-1 border border-slate-100 overflow-hidden shadow-2xs">
              {summaryChartData.length > 0 ? (
                <PlotlyChart
                  data={summaryChartData}
                  layout={summaryChartLayout}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-[#94A3B8] text-xs">
                  {loadingMetrics ? 'Loading statistical summary...' : 'No numerical columns found to render distribution.'}
                </div>
              )}
            </div>

            {/* Recent Automated Insights */}
            <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Key Insights Summary</span>
              <div className="space-y-2">
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Dataset <strong>{activeDataset.original_filename}</strong> isolated in memory.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                  <TrendingUp className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span>Non-destructive versioning active for <strong>V{activeDataset.current_version_num}</strong>.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
            <span className="flex items-center space-x-1.5">
              <span className="pulse-dot-green" />
              <span>Real-time Profiler</span>
            </span>
            <Link to="/analytics" className="font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1">
              <span>View Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* RIGHT COLUMN: DATASET CONTEXT & ANALYSIS TOOLS */}
        <div className="p-5 sm:p-6 rounded-xl card-base flex flex-col justify-between min-h-[470px] md:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E2E8F0] mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Studio Navigation</h2>
                  <p className="text-[11px] text-[#64748B]">Specialized analytic modules</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                ACTIVE
              </span>
            </div>

            {/* Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#64748B] font-medium">Dataset Status</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">Ready & Verified</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#64748B] font-medium">Version Branch</span>
                <span className="font-semibold text-slate-800">Version {activeDataset.current_version_num}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#64748B] font-medium">Security Escaping</span>
                <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Formula Injection Protected</span>
                </span>
              </div>
            </div>

            {/* Analysis Tools Quick Links */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Analytical Workflow</span>

              <button
                onClick={() => navigate('/cleaning')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] hover:border-blue-300 hover:bg-blue-50/50 transition-all text-xs font-semibold text-slate-700 group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Data Quality & Cleaning</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/visualizations')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] hover:border-violet-300 hover:bg-violet-50/50 transition-all text-xs font-semibold text-slate-700 group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <PieChart className="w-4 h-4 text-violet-600" />
                  <span>Visual Analytics Studio</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/patterns')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] hover:border-sky-300 hover:bg-sky-50/50 transition-all text-xs font-semibold text-slate-700 group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <Compass className="w-4 h-4 text-sky-600" />
                  <span>Pattern & Anomaly Discovery</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/insights')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] hover:border-amber-300 hover:bg-amber-50/50 transition-all text-xs font-semibold text-slate-700 group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Automated AI Insights</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-[#E2E8F0] hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-xs font-semibold text-slate-700 group cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Executive PDF Report</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
            <span>Engine Speed</span>
            <span className="font-semibold text-emerald-600">Sub-second In-Memory</span>
          </div>
        </div>

      </div>

      {/* 3. DATASET PREVIEW & DATA TABLE */}
      <div className="p-4 sm:p-6 rounded-xl card-base space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">Dataset Records Table</h2>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded border border-slate-200">
                  {previewLimit} / page
                </span>
              </div>
              {previewData && (
                <p className="text-[11px] text-[#64748B]">
                  Viewing records {((previewPage - 1) * previewLimit + 1).toLocaleString()} to {Math.min(previewPage * previewLimit, previewData.total_rows).toLocaleString()} of {previewData.total_rows.toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Quick in-table search filter */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearchFilter}
                onChange={(e) => setTableSearchFilter(e.target.value)}
                placeholder="Filter current rows..."
                className="bg-white border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] w-full sm:w-48 shadow-2xs"
              />
            </div>

            {/* Version Selector (if multiple versions exist) */}
            {versions.length > 1 && (
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="font-medium text-[#475569] whitespace-nowrap">Version:</span>
                <select
                  value={selectedVersionNum}
                  onChange={(e) => {
                    setSelectedVersionNum(Number(e.target.value));
                    setPreviewPage(1);
                  }}
                  className="bg-white border border-[#CBD5E1] text-xs text-[#0F172A] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB] touch-manipulation shadow-2xs"
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
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl border border-[#E2E8F0]">
            <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
            <span className="mt-2 text-xs text-[#64748B] font-medium">Fetching dataset records...</span>
          </div>
        ) : filteredRows.length > 0 && previewData ? (
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] scrollbar-thin shadow-2xs">
            <table className="w-full text-left text-xs border-collapse min-w-full">
              <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3 text-center text-[#94A3B8] font-mono w-12 border-r border-[#E2E8F0] sticky left-0 bg-[#F8FAFC] z-10">
                    #
                  </th>
                  {previewData.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3.5 whitespace-nowrap border-r border-[#E2E8F0] last:border-r-0 font-semibold text-[#0F172A]">
                      <div className="flex items-center space-x-1.5">
                        <span className="truncate">{col}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px] bg-white">
                {filteredRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2 px-3 text-center text-[#94A3B8] font-mono bg-[#F8FAFC] border-r border-[#E2E8F0] sticky left-0 font-medium">
                      {(previewPage - 1) * previewLimit + idx + 1}
                    </td>
                    {previewData.columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined || val === '';
                      return (
                        <td key={col} className="py-2 px-3.5 whitespace-nowrap border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]">
                          {isNull ? (
                            <span className="text-[#94A3B8] italic font-normal bg-slate-50 px-1 py-0.5 rounded text-[10px]">null</span>
                          ) : typeof val === 'number' ? (
                            <span className="text-slate-900 font-medium">{val}</span>
                          ) : (
                            <span className="text-slate-700">{String(val)}</span>
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
          <div className="py-12 text-center text-xs text-[#64748B] bg-slate-50/50 rounded-xl border border-[#E2E8F0]">
            {tableSearchFilter.trim()
              ? `No records match "${tableSearchFilter}". Try clearing your filter.`
              : 'No records found for this version.'}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-[#E2E8F0] gap-3">
            <div className="text-xs text-[#64748B]">
              Showing page <span className="font-semibold text-slate-800">{previewPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={previewPage <= 1 || isTableLoading}
                onClick={() => setPreviewPage((prev) => Math.max(1, prev - 1))}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation shadow-2xs transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                disabled={previewPage >= totalPages || isTableLoading}
                onClick={() => setPreviewPage((prev) => Math.min(totalPages, prev + 1))}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation shadow-2xs transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
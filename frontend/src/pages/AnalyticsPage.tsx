import React, { useEffect, useState, useMemo } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { 
  Loader2, 
  BarChart3, 
  TrendingUp, 
  Layers, 
  ArrowRight, 
  Play, 
  Table as TableIcon,
  Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import type { SummaryStatistics, CorrelationMatrixData, ColumnDistributionData } from '../types';
import { 
  PageTransition, 
  InteractiveButton, 
  NoDatasetsIllustration,
  motionTokens 
} from '../components/motion';

export const AnalyticsPage: React.FC = () => {
  const { activeDataset, datasets } = useWorkspaceStore();

  const [summary, setSummary] = useState<SummaryStatistics | null>(null);
  const [correlation, setCorrelation] = useState<CorrelationMatrixData | null>(null);
  const [corrMethod, setCorrMethod] = useState<'pearson' | 'spearman'>('pearson');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [distribution, setDistribution] = useState<ColumnDistributionData | null>(null);
  const [columnsList, setColumnsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDistLoading, setIsDistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'descriptive' | 'correlations' | 'distributions' | 'groupby'>('descriptive');

  // Search filter for summary statistics table
  const [statSearchFilter, setStatSearchFilter] = useState('');

  // Group by state
  const [groupByCol, setGroupByCol] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('');
  const [aggFunc, setAggFunc] = useState<string>('mean');
  const [groupByResults, setGroupByResults] = useState<any[] | null>(null);
  const [isGroupByLoading, setIsGroupByLoading] = useState(false);
  const [groupByError, setGroupByError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDataset) return;

    let isMounted = true;
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const sumPromise = api.getAnalyticsSummary(activeDataset.id);
        const corrPromise = api.getCorrelationMatrix(activeDataset.id, corrMethod);
        const dsPromise = api.getDataset(activeDataset.id).catch(() => null);
        
        const [sData, cData, dsData] = await Promise.all([sumPromise, corrPromise, dsPromise]);
        if (!isMounted) return;
        setSummary(sData);
        setCorrelation(cData);

        if (dsData && dsData.latest_version && dsData.latest_version.columns_meta) {
          const meta = dsData.latest_version.columns_meta;
          const names = Array.isArray(meta) ? meta.map((c: any) => c.name) : Object.keys(meta);
          setColumnsList(names);
          if (names.length > 0 && !groupByCol) setGroupByCol(names[0]);
        }

        const cols = Object.keys(sData.summary_statistics || {});
        if (cols.length > 0) {
          const initCol = cols[0];
          setSelectedColumn(initCol);
          if (!targetCol) setTargetCol(initCol);
          const dist = await api.getColumnDistribution(activeDataset.id, initCol);
          if (isMounted) setDistribution(dist);
        }
      } catch {
        // Handled
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, [activeDataset, corrMethod]);

  const handleColumnChange = async (col: string) => {
    if (!activeDataset || !col) return;
    setSelectedColumn(col);
    setIsDistLoading(true);
    try {
      const dist = await api.getColumnDistribution(activeDataset.id, col);
      setDistribution(dist);
    } catch {
      // Handled
    } finally {
      setIsDistLoading(false);
    }
  };

  const handleRunGroupBy = async () => {
    if (!activeDataset || !groupByCol || !targetCol) return;
    setIsGroupByLoading(true);
    setGroupByError(null);
    try {
      const res = await api.getGroupByAnalytics(activeDataset.id, groupByCol, targetCol, aggFunc);
      setGroupByResults(res);
    } catch (err: any) {
      setGroupByError(err.message || 'Failed to compute aggregation.');
      setGroupByResults(null);
    } finally {
      setIsGroupByLoading(false);
    }
  };

  const statCols = summary ? Object.keys(summary.summary_statistics) : [];

  const filteredStatCols = useMemo(() => {
    if (!statSearchFilter.trim()) return statCols;
    const q = statSearchFilter.toLowerCase();
    return statCols.filter(col => col.toLowerCase().includes(q));
  }, [statCols, statSearchFilter]);

  if (!activeDataset) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8 space-y-5">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Statistical Analytics Lab</h1>
          <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19]">
            <NoDatasetsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Active Dataset Selected</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
              {datasets.length === 0 
                ? 'Upload a dataset to run parametric distributions, bivariate correlations, and multi-group aggregations.' 
                : 'Select a dataset to view statistical analyses.'}
            </p>
            <Link 
              to="/datasets"
              className="inline-flex items-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation active:scale-[0.98]"
            >
              <span>{datasets.length === 0 ? 'Upload Dataset' : 'Select Dataset'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 max-w-full pb-12 min-w-0">
        {/* Header Banner */}
        <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Analytics Studio</h1>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800">
                v{activeDataset.current_version_num}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1.5 truncate" title={activeDataset.original_filename}>
              Dataset: <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] font-mono">{activeDataset.original_filename}</span> • {statCols.length} Numeric Features
            </p>
          </div>

          {/* Segmented Control Tab Navigation with Aether Glide */}
          <div className="bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl flex items-center space-x-1.5 text-xs sm:text-sm font-semibold overflow-x-auto scrollbar-none shadow-2xs border border-slate-200/50 dark:border-white/5">
            {[
              { id: 'descriptive', label: 'Summary Stats', icon: TableIcon },
              { id: 'correlations', label: 'Correlation Matrix', icon: TrendingUp },
              { id: 'distributions', label: 'Distributions', icon: BarChart3 },
              { id: 'groupby', label: 'Aggregations', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap touch-manipulation cursor-pointer min-h-[44px] ${
                    isActive
                      ? 'text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="analytics-active-tab"
                      className="absolute inset-0 bg-white dark:bg-[#111827] rounded-xl shadow-xs border border-slate-200/60 dark:border-white/10 z-0"
                      transition={motionTokens.spring.glide}
                    />
                  )}
                  <Icon className={`relative z-10 w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 card-base">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <span className="mt-3 text-xs sm:text-sm font-medium text-[#64748B] dark:text-slate-400">Computing summary distributions & correlation vectors...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* TAB 1: Descriptive Summary Statistics */}
            {activeTab === 'descriptive' && (
              <motion.div
                key="descriptive"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: motionTokens.duration.page, ease: motionTokens.ease.out }}
                className="p-5 sm:p-7 rounded-2xl card-base space-y-5 min-w-0"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                      Descriptive Summary Statistics
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                      Parametric, quartile, and skewness indicators across {statCols.length} numerical columns
                    </p>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={statSearchFilter}
                      onChange={(e) => setStatSearchFilter(e.target.value)}
                      placeholder="Search column..."
                      className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[44px]"
                    />
                  </div>
                </div>

                {filteredStatCols.length === 0 ? (
                  <div className="py-12 text-center text-xs sm:text-sm text-[#64748B] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                    {statSearchFilter.trim() 
                      ? `No columns match "${statSearchFilter}".` 
                      : 'No numeric columns detected in this dataset.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-white/10 scrollbar-thin shadow-2xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[760px]">
                      <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-white/10">
                        <tr>
                          <th className="py-3 px-4 sticky left-0 bg-[#F8FAFC] dark:bg-slate-900 z-10 border-r border-[#E2E8F0] dark:border-white/10">Column Name</th>
                          <th className="py-3 px-3.5 text-right">Count</th>
                          <th className="py-3 px-3.5 text-right">Mean</th>
                          <th className="py-3 px-3.5 text-right">Std Dev</th>
                          <th className="py-3 px-3.5 text-right">Min</th>
                          <th className="py-3 px-3.5 text-right">25% (Q1)</th>
                          <th className="py-3 px-3.5 text-right">Median</th>
                          <th className="py-3 px-3.5 text-right">75% (Q3)</th>
                          <th className="py-3 px-3.5 text-right">Max</th>
                          <th className="py-3 px-3.5 text-right">Skewness</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5 font-mono text-xs bg-white dark:bg-[#111827]">
                        {filteredStatCols.map((col) => {
                          const s = summary!.summary_statistics[col];
                          return (
                            <tr key={col} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                              <td className="py-3 px-4 font-sans font-semibold text-[#0F172A] dark:text-[#F8FAFC] sticky left-0 bg-white dark:bg-[#111827] z-10 border-r border-[#E2E8F0] dark:border-white/10 whitespace-nowrap">
                                {col}
                              </td>
                              <td className="py-3 px-3.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{s.count.toLocaleString()}</td>
                              <td className="py-3 px-3.5 text-right font-medium text-blue-900 dark:text-blue-300 whitespace-nowrap">{s.mean.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right text-[#64748B] dark:text-slate-400 whitespace-nowrap">{s.std.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{s.min.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right text-[#64748B] dark:text-slate-400 whitespace-nowrap">{s.q25.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap bg-slate-50/60 dark:bg-slate-800/40">{s.median.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right text-[#64748B] dark:text-slate-400 whitespace-nowrap">{s.q75.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right text-slate-700 dark:text-slate-300 whitespace-nowrap">{s.max.toFixed(2)}</td>
                              <td className="py-3 px-3.5 text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">{s.skewness.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: Correlation Matrix */}
            {activeTab === 'correlations' && (
              <motion.div
                key="correlations"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: motionTokens.duration.page, ease: motionTokens.ease.out }}
                className="p-5 sm:p-7 rounded-2xl card-base space-y-5 min-w-0"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                      Bivariate Correlation Matrix
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                      Pairwise linear coefficients ranging from -1.00 (inverse) to +1.00 (collinear)
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs sm:text-sm">
                    <span className="font-medium text-[#64748B] dark:text-slate-400">Method:</span>
                    <select
                      value={corrMethod}
                      onChange={(e) => setCorrMethod(e.target.value as any)}
                      className="bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[40px]"
                    >
                      <option value="pearson">Pearson (Linear)</option>
                      <option value="spearman">Spearman (Rank)</option>
                    </select>
                  </div>
                </div>

                {correlation && correlation.columns.length > 1 ? (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-white/10 scrollbar-thin shadow-2xs">
                    <table className="w-full text-center text-xs sm:text-sm border-collapse min-w-[540px]">
                      <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-white/10">
                        <tr>
                          <th className="py-2.5 px-3.5 text-left sticky left-0 bg-[#F8FAFC] dark:bg-slate-900 z-10 border-r border-[#E2E8F0] dark:border-white/10">Feature</th>
                          {correlation.columns.map((c) => (
                            <th key={c} className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5 font-mono text-[11px] bg-white dark:bg-[#111827]">
                        {correlation.columns.map((rowName, rIdx) => (
                          <tr key={rowName} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3.5 text-left font-sans font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-slate-900 sticky left-0 z-10 border-r border-[#E2E8F0] dark:border-white/10 whitespace-nowrap">
                              {rowName}
                            </td>
                            {correlation.matrix[rIdx]?.map((val, cIdx) => {
                              const isSelf = rIdx === cIdx;
                              const isStrongPos = val > 0.6 && !isSelf;
                              const isStrongNeg = val < -0.6 && !isSelf;
                              return (
                                <td 
                                  key={cIdx} 
                                  className={`py-2 px-3 border border-[#E2E8F0] dark:border-white/10 transition-colors ${
                                    isSelf 
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold' 
                                      : isStrongPos 
                                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 font-bold' 
                                      : isStrongNeg 
                                      ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 font-bold' 
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}
                                >
                                  {val.toFixed(3)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-[#64748B] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl border border-[#E2E8F0] dark:border-white/10">
                    At least two numeric variables are required to generate a pairwise correlation matrix.
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: Distributions Explorer */}
            {activeTab === 'distributions' && (
              <motion.div
                key="distributions"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: motionTokens.duration.page, ease: motionTokens.ease.out }}
                className="p-5 sm:p-7 rounded-2xl card-base space-y-5 min-w-0"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                      Frequency Distribution Explorer
                    </h2>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">Binned density histogram and percentile shares</p>
                  </div>

                  <div className="flex items-center space-x-2 text-xs sm:text-sm w-full sm:w-auto">
                    <span className="font-medium text-[#64748B] dark:text-slate-400 whitespace-nowrap">Column:</span>
                    <select
                      value={selectedColumn}
                      onChange={(e) => handleColumnChange(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] w-full sm:w-auto shadow-2xs font-medium min-h-[44px]"
                    >
                      {statCols.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isDistLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
                    <span className="mt-2 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">Computing distribution intervals...</span>
                  </div>
                ) : distribution ? (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-white/10 scrollbar-thin shadow-2xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
                      <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-white/10">
                        <tr>
                          <th className="py-3 px-4">Interval / Value Range</th>
                          <th className="py-3 px-3.5">Count</th>
                          <th className="py-3 px-3.5">Share</th>
                          <th className="py-3 px-3.5 w-1/2">Density Bar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5 font-mono text-xs bg-white dark:bg-[#111827]">
                        {distribution.bins?.map((b, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20">
                            <td className="py-3 px-4 font-sans font-medium text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">{b.bin}</td>
                            <td className="py-3 px-3.5 text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">{b.count.toLocaleString()}</td>
                            <td className="py-3 px-3.5 font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">{b.percentage}%</td>
                            <td className="py-3 px-3.5">
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, Math.max(1, b.percentage))}%` }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {distribution.distribution?.map((d, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20">
                            <td className="py-3 px-4 font-sans font-medium text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">{d.value}</td>
                            <td className="py-3 px-3.5 text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">{d.count.toLocaleString()}</td>
                            <td className="py-3 px-3.5 font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap">{d.percentage}%</td>
                            <td className="py-3 px-3.5">
                              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(100, Math.max(1, d.percentage))}%` }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full"
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* TAB 4: Group Aggregations */}
            {activeTab === 'groupby' && (
              <motion.div
                key="groupby"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: motionTokens.duration.page, ease: motionTokens.ease.out }}
                className="p-5 sm:p-7 rounded-2xl card-base space-y-5 min-w-0"
              >
                <div className="pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                  <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
                    Multivariate Group Aggregation Engine
                  </h2>
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                    Segment quantitative metrics across categorical dimensions (e.g. Total Revenue by Region)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Group By (Dimension)</label>
                    <select
                      value={groupByCol}
                      onChange={(e) => setGroupByCol(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[46px]"
                    >
                      <option value="">Select column...</option>
                      {columnsList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Target Numeric Metric</label>
                    <select
                      value={targetCol}
                      onChange={(e) => setTargetCol(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[46px]"
                    >
                      <option value="">Select metric...</option>
                      {statCols.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Aggregation Function</label>
                    <div className="flex space-x-2.5">
                      <select
                        value={aggFunc}
                        onChange={(e) => setAggFunc(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[46px]"
                      >
                        <option value="mean">Mean (Average)</option>
                        <option value="sum">Sum (Total)</option>
                        <option value="min">Minimum</option>
                        <option value="max">Maximum</option>
                        <option value="count">Count (Frequency)</option>
                      </select>
                      <InteractiveButton
                        onClick={handleRunGroupBy}
                        disabled={!groupByCol || !targetCol || isGroupByLoading}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-5 rounded-xl transition-colors flex items-center justify-center space-x-1.5 whitespace-nowrap shadow-xs cursor-pointer min-h-[46px]"
                      >
                        {isGroupByLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                        <span>Compute</span>
                      </InteractiveButton>
                    </div>
                  </div>
                </div>

                {groupByError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs sm:text-sm text-red-800 dark:text-red-200">
                    {groupByError}
                  </div>
                )}

                {groupByResults && (
                  <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-white/10 scrollbar-thin shadow-2xs">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-white/10">
                        <tr>
                          <th className="py-3 px-4">{groupByCol}</th>
                          <th className="py-3 px-4 text-right">{aggFunc.toUpperCase()}({targetCol})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5 font-mono text-xs bg-white dark:bg-[#111827]">
                        {groupByResults.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20">
                            <td className="py-3 px-4 font-sans font-medium text-[#0F172A] dark:text-[#F8FAFC]">{item[groupByCol] ?? '–'}</td>
                            <td className="py-3 px-4 text-right font-bold text-blue-900 dark:text-blue-300">
                              {typeof item[targetCol] === 'number' ? item[targetCol].toFixed(2) : String(item[targetCol] ?? '–')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </PageTransition>
  );
};

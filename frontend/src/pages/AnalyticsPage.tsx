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
import { api } from '../services/api';
import type { SummaryStatistics, CorrelationMatrixData, ColumnDistributionData } from '../types';

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
      <div className="max-w-4xl mx-auto py-8 space-y-5">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Statistical Analytics Lab</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <BarChart3 className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Active Dataset Selected</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            {datasets.length === 0 
              ? 'Upload a dataset to run parametric distributions, bivariate correlations, and multi-group aggregations.' 
              : 'Select a dataset to view statistical analyses.'}
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
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Analytics Studio</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              v{activeDataset.current_version_num}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 truncate" title={activeDataset.original_filename}>
            Dataset: <span className="font-semibold text-[#0F172A] font-mono">{activeDataset.original_filename}</span> • {statCols.length} Numeric Features
          </p>
        </div>

        {/* Segmented Control Tab Navigation */}
        <div className="bg-slate-100/80 p-1 rounded-xl flex items-center space-x-1 text-xs font-semibold overflow-x-auto scrollbar-none shadow-2xs">
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
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap touch-manipulation cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs font-bold border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 card-base">
          <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          <span className="mt-3 text-xs font-medium text-[#64748B]">Computing summary distributions & correlation vectors...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: Descriptive Summary Statistics */}
          {activeTab === 'descriptive' && (
            <div className="p-4 sm:p-6 rounded-xl card-base space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Descriptive Summary Statistics
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Parametric, quartile, and skewness indicators across {statCols.length} numerical columns
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={statSearchFilter}
                    onChange={(e) => setStatSearchFilter(e.target.value)}
                    placeholder="Search column..."
                    className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                  />
                </div>
              </div>

              {filteredStatCols.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B] bg-slate-50/50 rounded-xl border border-[#E2E8F0]">
                  {statSearchFilter.trim() 
                    ? `No columns match "${statSearchFilter}".` 
                    : 'No numeric columns detected in this dataset.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] scrollbar-thin shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3.5 sticky left-0 bg-[#F8FAFC] z-10 border-r border-[#E2E8F0]">Column Name</th>
                        <th className="py-2.5 px-3 text-right">Count</th>
                        <th className="py-2.5 px-3 text-right">Mean</th>
                        <th className="py-2.5 px-3 text-right">Std Dev</th>
                        <th className="py-2.5 px-3 text-right">Min</th>
                        <th className="py-2.5 px-3 text-right">25% (Q1)</th>
                        <th className="py-2.5 px-3 text-right">Median</th>
                        <th className="py-2.5 px-3 text-right">75% (Q3)</th>
                        <th className="py-2.5 px-3 text-right">Max</th>
                        <th className="py-2.5 px-3 text-right">Skewness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px] bg-white">
                      {filteredStatCols.map((col) => {
                        const s = summary!.summary_statistics[col];
                        return (
                          <tr key={col} className="hover:bg-blue-50/30 transition-colors">
                            <td className="py-2.5 px-3.5 font-sans font-semibold text-[#0F172A] sticky left-0 bg-white hover:bg-blue-50/30 z-10 border-r border-[#E2E8F0] whitespace-nowrap">
                              {col}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{s.count.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-blue-900 whitespace-nowrap">{s.mean.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-[#64748B] whitespace-nowrap">{s.std.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{s.min.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-[#64748B] whitespace-nowrap">{s.q25.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap bg-slate-50/60">{s.median.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-[#64748B] whitespace-nowrap">{s.q75.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-700 whitespace-nowrap">{s.max.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">{s.skewness.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Correlation Matrix */}
          {activeTab === 'correlations' && (
            <div className="p-4 sm:p-6 rounded-xl card-base space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Bivariate Correlation Matrix
                  </h2>
                  <p className="text-[11px] text-[#64748B]">
                    Pairwise linear coefficients ranging from -1.00 (inverse) to +1.00 (collinear)
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-medium text-[#64748B]">Method:</span>
                  <select
                    value={corrMethod}
                    onChange={(e) => setCorrMethod(e.target.value as any)}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                  >
                    <option value="pearson">Pearson (Linear)</option>
                    <option value="spearman">Spearman (Rank)</option>
                  </select>
                </div>
              </div>

              {correlation && correlation.columns.length > 1 ? (
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] scrollbar-thin shadow-2xs">
                  <table className="w-full text-center text-xs border-collapse min-w-[540px]">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3.5 text-left sticky left-0 bg-[#F8FAFC] z-10 border-r border-[#E2E8F0]">Feature</th>
                        {correlation.columns.map((c) => (
                          <th key={c} className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-800">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px] bg-white">
                      {correlation.columns.map((rowName, rIdx) => (
                        <tr key={rowName} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3.5 text-left font-sans font-semibold text-[#0F172A] bg-[#F8FAFC] sticky left-0 z-10 border-r border-[#E2E8F0] whitespace-nowrap">
                            {rowName}
                          </td>
                          {correlation.matrix[rIdx]?.map((val, cIdx) => {
                            const isSelf = rIdx === cIdx;
                            const isStrongPos = val > 0.6 && !isSelf;
                            const isStrongNeg = val < -0.6 && !isSelf;
                            return (
                              <td 
                                key={cIdx} 
                                className={`py-2 px-3 border border-[#E2E8F0] transition-colors ${
                                  isSelf 
                                    ? 'bg-slate-100 text-slate-500 font-bold' 
                                    : isStrongPos 
                                    ? 'bg-blue-100 text-blue-900 font-bold' 
                                    : isStrongNeg 
                                    ? 'bg-rose-100 text-rose-900 font-bold' 
                                    : 'text-slate-700'
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
                <div className="py-12 text-center text-xs text-[#64748B] bg-slate-50/50 rounded-xl border border-[#E2E8F0]">
                  At least two numeric variables are required to generate a pairwise correlation matrix.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Distributions Explorer */}
          {activeTab === 'distributions' && (
            <div className="p-4 sm:p-6 rounded-xl card-base space-y-4 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E2E8F0]">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                    Frequency Distribution Explorer
                  </h2>
                  <p className="text-[11px] text-[#64748B]">Binned density histogram and percentile shares</p>
                </div>

                <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
                  <span className="font-medium text-[#64748B] whitespace-nowrap">Column:</span>
                  <select
                    value={selectedColumn}
                    onChange={(e) => handleColumnChange(e.target.value)}
                    className="bg-white border border-[#CBD5E1] rounded-lg px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] w-full sm:w-auto shadow-2xs font-medium"
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
                  <span className="mt-2 text-xs text-[#64748B]">Computing distribution intervals...</span>
                </div>
              ) : distribution ? (
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] scrollbar-thin shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3.5">Interval / Value Range</th>
                        <th className="py-2.5 px-3">Count</th>
                        <th className="py-2.5 px-3">Share</th>
                        <th className="py-2.5 px-3 w-1/2">Density Bar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px] bg-white">
                      {distribution.bins?.map((b, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="py-2.5 px-3.5 font-sans font-medium text-[#0F172A] whitespace-nowrap">{b.bin}</td>
                          <td className="py-2.5 px-3 text-[#0F172A] whitespace-nowrap">{b.count.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">{b.percentage}%</td>
                          <td className="py-2.5 px-3">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(1, b.percentage))}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                      {distribution.distribution?.map((d, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="py-2.5 px-3.5 font-sans font-medium text-[#0F172A] whitespace-nowrap">{d.value}</td>
                          <td className="py-2.5 px-3 text-[#0F172A] whitespace-nowrap">{d.count.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700 whitespace-nowrap">{d.percentage}%</td>
                          <td className="py-2.5 px-3">
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(1, d.percentage))}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: Group Aggregations */}
          {activeTab === 'groupby' && (
            <div className="p-4 sm:p-6 rounded-xl card-base space-y-4 min-w-0">
              <div className="pb-3 border-b border-[#E2E8F0]">
                <h2 className="text-sm font-bold text-[#0F172A] tracking-tight">
                  Multivariate Group Aggregation Engine
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Segment quantitative metrics across categorical dimensions (e.g. Total Revenue by Region)
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Group By (Dimension)</label>
                  <select
                    value={groupByCol}
                    onChange={(e) => setGroupByCol(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                  >
                    <option value="">Select column...</option>
                    {columnsList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Target Numeric Metric</label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                  >
                    <option value="">Select metric...</option>
                    {statCols.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Aggregation Function</label>
                  <div className="flex space-x-2">
                    <select
                      value={aggFunc}
                      onChange={(e) => setAggFunc(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                    >
                      <option value="mean">Mean (Average)</option>
                      <option value="sum">Sum (Total)</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                      <option value="count">Count (Frequency)</option>
                    </select>
                    <button
                      onClick={handleRunGroupBy}
                      disabled={!groupByCol || !targetCol || isGroupByLoading}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold text-xs px-4 rounded-lg transition-colors flex items-center justify-center space-x-1 whitespace-nowrap shadow-xs"
                    >
                      {isGroupByLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      <span>Compute</span>
                    </button>
                  </div>
                </div>
              </div>

              {groupByError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {groupByError}
                </div>
              )}

              {groupByResults && (
                <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] scrollbar-thin shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3.5">{groupByCol}</th>
                        <th className="py-2.5 px-3.5 text-right">{aggFunc.toUpperCase()}({targetCol})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px] bg-white">
                      {groupByResults.map((item, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="py-2.5 px-3.5 font-sans font-medium text-[#0F172A]">{item[groupByCol] ?? '–'}</td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-blue-900">
                            {typeof item[targetCol] === 'number' ? item[targetCol].toFixed(2) : String(item[targetCol] ?? '–')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
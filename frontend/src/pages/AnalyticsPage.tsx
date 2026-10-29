import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Loader2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isDistLoading, setIsDistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'descriptive' | 'correlations' | 'distributions' | 'groupby'>('descriptive');

  // Group by state
  const [groupByCol, setGroupByCol] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('');
  const [aggFunc, setAggFunc] = useState<string>('mean');
  const [groupByResults, setGroupByResults] = useState<any[] | null>(null);
  const [isGroupByLoading, setIsGroupByLoading] = useState(false);

  useEffect(() => {
    if (!activeDataset) return;

    let isMounted = true;
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const sumPromise = api.getAnalyticsSummary(activeDataset.id);
        const corrPromise = api.getCorrelationMatrix(activeDataset.id, corrMethod);
        
        const [sData, cData] = await Promise.all([sumPromise, corrPromise]);
        if (!isMounted) return;
        setSummary(sData);
        setCorrelation(cData);

        const cols = Object.keys(sData.summary_statistics || {});
        if (cols.length > 0) {
          const initCol = cols[0];
          setSelectedColumn(initCol);
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
    try {
      const res = await api.getGroupByAnalytics(activeDataset.id, groupByCol, targetCol, aggFunc);
      setGroupByResults(res);
    } catch {
      // Handled
    } finally {
      setIsGroupByLoading(false);
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Analytics</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">
            {datasets.length === 0 
              ? 'Please upload a dataset to compute statistical analytics.'
              : 'Please select a dataset to view analytics.'}
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

  const statCols = summary ? Object.keys(summary.summary_statistics) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Analytics</h1>
          <p className="text-xs text-[#64748B] mt-0.5 truncate" title={activeDataset.original_filename}>
            Dataset: <span className="font-medium text-[#0F172A]">{activeDataset.original_filename} (v{activeDataset.current_version_num})</span>
          </p>
        </div>

        {/* Responsive Tab Navigation */}
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-none flex bg-[#F1F5F9] p-1 rounded-lg text-xs font-medium flex-nowrap">
          {[
            { id: 'descriptive', label: 'Summary' },
            { id: 'correlations', label: 'Correlations' },
            { id: 'distributions', label: 'Distributions' },
            { id: 'groupby', label: 'Aggregations' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap touch-manipulation ${
                activeTab === tab.id
                  ? 'bg-white text-[#0F172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-[#E2E8F0] rounded-xl">
          <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
          <span className="ml-2 text-xs text-[#64748B]">Calculating statistics...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: Descriptive Summary Statistics */}
          {activeTab === 'descriptive' && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3 min-w-0">
              <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Summary Statistics ({statCols.length} Numeric Columns)
              </h2>

              {statCols.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  No numeric columns found in this dataset.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3 sticky left-0 bg-[#F8FAFC] z-10 border-r border-[#E2E8F0]">Column</th>
                        <th className="py-2.5 px-3">Count</th>
                        <th className="py-2.5 px-3">Mean</th>
                        <th className="py-2.5 px-3">Std Dev</th>
                        <th className="py-2.5 px-3">Min</th>
                        <th className="py-2.5 px-3">25% (Q1)</th>
                        <th className="py-2.5 px-3">Median</th>
                        <th className="py-2.5 px-3">75% (Q3)</th>
                        <th className="py-2.5 px-3">Max</th>
                        <th className="py-2.5 px-3">Skewness</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                      {statCols.map((col) => {
                        const s = summary!.summary_statistics[col];
                        return (
                          <tr key={col} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 font-sans font-medium text-[#0F172A] sticky left-0 bg-white hover:bg-[#F8FAFC] z-10 border-r border-[#E2E8F0] whitespace-nowrap">
                              {col}
                            </td>
                            <td className="py-2.5 px-3 text-[#0F172A] whitespace-nowrap">{s.count.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-[#0F172A] whitespace-nowrap">{s.mean.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">{s.std.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-[#0F172A] whitespace-nowrap">{s.min.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">{s.q25.toFixed(2)}</td>
                            <td className="py-2.5 px-3 font-semibold text-[#0F172A] whitespace-nowrap">{s.median.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">{s.q75.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-[#0F172A] whitespace-nowrap">{s.max.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-[#64748B] whitespace-nowrap">{s.skewness.toFixed(2)}</td>
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
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  Correlation Matrix
                </h2>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-[#64748B]">Method:</span>
                  <select
                    value={corrMethod}
                    onChange={(e) => setCorrMethod(e.target.value as any)}
                    className="bg-white border border-[#CBD5E1] rounded-md px-2 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  >
                    <option value="pearson">Pearson</option>
                    <option value="spearman">Spearman</option>
                  </select>
                </div>
              </div>

              {correlation && correlation.columns.length > 1 ? (
                <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] scrollbar-thin">
                  <table className="w-full text-center text-xs border-collapse min-w-[500px]">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2 px-3 text-left sticky left-0 bg-[#F8FAFC] z-10 border-r border-[#E2E8F0]">Variable</th>
                        {correlation.columns.map((c) => (
                          <th key={c} className="py-2 px-3 whitespace-nowrap">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                      {correlation.columns.map((rowName, rIdx) => (
                        <tr key={rowName} className="hover:bg-[#F8FAFC]">
                          <td className="py-2 px-3 text-left font-sans font-medium text-[#0F172A] bg-[#F8FAFC] sticky left-0 z-10 border-r border-[#E2E8F0] whitespace-nowrap">
                            {rowName}
                          </td>
                          {correlation.matrix[rIdx]?.map((val, cIdx) => {
                            const isSelf = rIdx === cIdx;
                            return (
                              <td key={cIdx} className={`py-2 px-3 border border-[#E2E8F0] ${isSelf ? 'bg-[#F8FAFC] font-semibold text-[#0F172A]' : 'text-[#475569]'}`}>
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
                <div className="py-8 text-center text-xs text-[#64748B]">
                  At least two numeric variables are required for correlation analysis.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Distributions Explorer */}
          {activeTab === 'distributions' && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3 min-w-0">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                  Column Distribution
                </h2>

                <div className="flex items-center space-x-2 text-xs w-full sm:w-auto">
                  <span className="text-[#64748B] whitespace-nowrap">Column:</span>
                  <select
                    value={selectedColumn}
                    onChange={(e) => handleColumnChange(e.target.value)}
                    className="bg-white border border-[#CBD5E1] rounded-md px-2 py-1 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] w-full sm:w-auto touch-manipulation"
                  >
                    {statCols.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isDistLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
                  <span className="ml-2 text-xs text-[#64748B]">Calculating distribution...</span>
                </div>
              ) : distribution ? (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] scrollbar-thin">
                    <table className="w-full text-left text-xs border-collapse min-w-[480px]">
                      <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2.5 px-3">Interval / Value</th>
                          <th className="py-2.5 px-3">Count</th>
                          <th className="py-2.5 px-3">Percentage</th>
                          <th className="py-2.5 px-3 w-2/5">Distribution</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                        {distribution.bins?.map((b, idx) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="py-2 px-3 font-sans text-[#0F172A] whitespace-nowrap">{b.bin}</td>
                            <td className="py-2 px-3 text-[#0F172A] whitespace-nowrap">{b.count.toLocaleString()}</td>
                            <td className="py-2 px-3 text-[#0F172A] whitespace-nowrap">{b.percentage}%</td>
                            <td className="py-2 px-3">
                              <div className="w-full bg-[#F1F5F9] rounded-sm h-2 overflow-hidden">
                                <div 
                                  className="bg-[#2563EB] h-full rounded-sm"
                                  style={{ width: `${Math.min(100, Math.max(1, b.percentage))}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                        {distribution.distribution?.map((d, idx) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="py-2 px-3 font-sans text-[#0F172A] whitespace-nowrap">{d.value}</td>
                            <td className="py-2 px-3 text-[#0F172A] whitespace-nowrap">{d.count.toLocaleString()}</td>
                            <td className="py-2 px-3 text-[#0F172A] whitespace-nowrap">{d.percentage}%</td>
                            <td className="py-2 px-3">
                              <div className="w-full bg-[#F1F5F9] rounded-sm h-2 overflow-hidden">
                                <div 
                                  className="bg-[#2563EB] h-full rounded-sm"
                                  style={{ width: `${Math.min(100, Math.max(1, d.percentage))}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: Group Aggregations */}
          {activeTab === 'groupby' && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-4 min-w-0">
              <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Group Aggregation
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Group By (Dimension)</label>
                  <input
                    type="text"
                    value={groupByCol}
                    onChange={(e) => setGroupByCol(e.target.value)}
                    placeholder="e.g. Category"
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Target Numeric Column</label>
                  <input
                    type="text"
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    placeholder="e.g. Revenue"
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">Function</label>
                  <div className="flex space-x-2">
                    <select
                      value={aggFunc}
                      onChange={(e) => setAggFunc(e.target.value)}
                      className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                    >
                      <option value="mean">Mean</option>
                      <option value="sum">Sum</option>
                      <option value="count">Count</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                      <option value="std">Std Dev</option>
                    </select>
                    <button
                      onClick={handleRunGroupBy}
                      disabled={!groupByCol || !targetCol || isGroupByLoading}
                      className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-medium text-xs rounded-md transition-colors touch-manipulation whitespace-nowrap"
                    >
                      {isGroupByLoading ? '...' : 'Run'}
                    </button>
                  </div>
                </div>
              </div>

              {groupByResults && (
                <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse min-w-[320px]">
                    <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                      <tr>
                        <th className="py-2.5 px-3">{groupByCol}</th>
                        <th className="py-2.5 px-3">{targetCol} ({aggFunc.toUpperCase()})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono text-[11px]">
                      {groupByResults.map((r, idx) => {
                        const keyVal = r[groupByCol];
                        const metricVal = r[`${targetCol}_${aggFunc}`];
                        return (
                          <tr key={idx} className="hover:bg-[#F8FAFC]">
                            <td className="py-2 px-3 font-sans font-medium text-[#0F172A] whitespace-nowrap">{String(keyVal)}</td>
                            <td className="py-2 px-3 text-[#0F172A] font-semibold whitespace-nowrap">
                              {metricVal !== null && metricVal !== undefined ? metricVal : 'null'}
                            </td>
                          </tr>
                        );
                      })}
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

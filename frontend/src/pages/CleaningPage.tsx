import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { 
  Loader2, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Trash2, 
  SlidersHorizontal,
  Scissors,
  ArrowRight,
  Database,
  History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { DataQualityScore, DatasetVersion } from '../types';

export const CleaningPage: React.FC = () => {
  const { activeDataset, datasets, selectDataset } = useWorkspaceStore();

  const [quality, setQuality] = useState<DataQualityScore | null>(null);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [imputeColumn, setImputeColumn] = useState('');
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'constant'>('median');
  const [columnsList, setColumnsList] = useState<string[]>([]);

  const refreshCleaningState = React.useCallback(async () => {
    if (!activeDataset) return;
    setIsLoading(true);
    try {
      const qPromise = api.getDatasetQuality(activeDataset.id).catch(() => null);
      const dPromise = api.getDataset(activeDataset.id).catch(() => null);

      const [q, d] = await Promise.all([qPromise, dPromise]);
      setQuality(q);

      if (d) {
        setVersions(d.versions || []);
        if (d.latest_version && d.latest_version.columns_meta) {
          if (Array.isArray(d.latest_version.columns_meta)) {
            setColumnsList(d.latest_version.columns_meta.map((c: any) => c.name));
          } else {
            setColumnsList(Object.keys(d.latest_version.columns_meta));
          }
        }
      }
    } catch {
      // Handled
    } finally {
      setIsLoading(false);
    }
  }, [activeDataset]);

  useEffect(() => {
    refreshCleaningState();
  }, [refreshCleaningState]);

  const handleExecuteOperation = async (opType: string, params: Record<string, any> = {}) => {
    if (!activeDataset || isExecuting) return;
    setIsExecuting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await api.applyCleaningOperation(activeDataset.id, opType, params);
      setActionSuccess(`Operation applied successfully. New version generated.`);
      const updated = await api.getDataset(activeDataset.id);
      if (updated && updated.dataset) {
        selectDataset(updated.dataset);
      }
      await refreshCleaningState();
    } catch (err: any) {
      setActionError(err.message || `Failed to execute cleaning operation.`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRollback = async (targetVersion: number) => {
    if (!activeDataset || isExecuting) return;
    if (!window.confirm(`Rollback to Version ${targetVersion}? Non-destructive versioning will branch safely.`)) return;

    setIsExecuting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await api.rollbackCleaningVersion(activeDataset.id, targetVersion);
      setActionSuccess(`Successfully rolled back to Version ${targetVersion}.`);
      const updated = await api.getDataset(activeDataset.id);
      if (updated && updated.dataset) {
        selectDataset(updated.dataset);
      }
      await refreshCleaningState();
    } catch (err: any) {
      setActionError(err.message || `Failed to rollback version.`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Data Quality & Cleaning</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <Sparkles className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Active Dataset Selected</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            {datasets.length === 0
              ? 'Upload a dataset to evaluate health metrics, impute missing values, and sanitize records.'
              : 'Please select a dataset to perform automated data sanitization.'}
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

  const qualityMetrics = [
    { label: 'Overall Reliability', score: quality?.overall_score ?? null, color: 'text-emerald-700 bg-emerald-50' },
    { label: 'Completeness', score: quality?.completeness_score ?? null, color: 'text-blue-700 bg-blue-50' },
    { label: 'Uniqueness', score: quality?.uniqueness_score ?? null, color: 'text-violet-700 bg-violet-50' },
    { label: 'Validity', score: quality?.validity_score ?? null, color: 'text-sky-700 bg-sky-50' },
    { label: 'Consistency', score: quality?.consistency_score ?? null, color: 'text-amber-700 bg-amber-50' },
  ];

  return (
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Data Quality & Cleaning Lab</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              v{activeDataset.current_version_num}
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 truncate" title={activeDataset.original_filename}>
            Dataset: <span className="font-semibold text-[#0F172A] font-mono">{activeDataset.original_filename}</span> • Non-Destructive Versioning
          </p>
        </div>

        <Link
          to="/workspace"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <span>Return to Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-medium">{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span className="font-medium">{actionError}</span>
        </div>
      )}

      {/* Quality Score Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {qualityMetrics.map((m, idx) => (
          <div key={idx} className="p-4 rounded-xl card-base hover:border-slate-300 transition-all min-w-0">
            <span className="text-[11px] font-semibold text-[#64748B] block truncate">{m.label}</span>
            <div className="mt-1 text-lg sm:text-xl font-extrabold text-[#0F172A] flex items-center space-x-1.5">
              <span>{m.score !== null ? `${m.score.toFixed(0)}` : '–'}</span>
              {m.score !== null && <span className="text-xs text-slate-400 font-normal">/ 100</span>}
            </div>
            {m.score !== null && (
              <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.score > 85 ? 'bg-emerald-500' : m.score > 65 ? 'bg-blue-500' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${Math.min(100, m.score)}%` }} 
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-w-0">
        {/* Operations */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="p-4 sm:p-6 rounded-xl card-base space-y-4 min-w-0">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#E2E8F0]">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Automated Cleaning Operations
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-blue-200 transition-all shadow-2xs">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <h3 className="text-xs font-bold text-[#0F172A]">Deduplicate Records</h3>
                  </div>
                  <p className="text-xs text-[#64748B]">Detects and purges identical rows across all attributes.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('remove_duplicates')}
                  className="mt-4 w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-2xs touch-manipulation"
                >
                  {isExecuting ? 'Processing...' : 'Remove Duplicate Rows'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Scissors className="w-4 h-4 text-slate-700" />
                    <h3 className="text-xs font-bold text-[#0F172A]">Drop Null Rows</h3>
                  </div>
                  <p className="text-xs text-[#64748B]">Eliminates rows containing null or empty values.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('drop_missing')}
                  className="mt-4 w-full bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-2xs touch-manipulation"
                >
                  {isExecuting ? 'Processing...' : 'Drop Missing Rows'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-[#0F172A]">Cap Outliers (1.5x IQR)</h3>
                  </div>
                  <p className="text-xs text-[#64748B]">Bounds extreme distribution tails using robust interquartile fences.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('handle_outliers_iqr')}
                  className="mt-4 w-full bg-white hover:bg-slate-50 border border-[#CBD5E1] disabled:opacity-50 text-[#0F172A] text-xs font-semibold py-2 rounded-lg transition-colors shadow-2xs touch-manipulation"
                >
                  {isExecuting ? 'Processing...' : 'Cap Outliers'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-[#0F172A]">Sanitize Text Whitespace</h3>
                  </div>
                  <p className="text-xs text-[#64748B]">Trims unprinted whitespace and standardizes string casing.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('trim_whitespace')}
                  className="mt-4 w-full bg-white hover:bg-slate-50 border border-[#CBD5E1] disabled:opacity-50 text-[#0F172A] text-xs font-semibold py-2 rounded-lg transition-colors shadow-2xs touch-manipulation"
                >
                  {isExecuting ? 'Processing...' : 'Sanitize Text'}
                </button>
              </div>
            </div>

            {/* Imputation Config Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border border-blue-100 space-y-3 mt-4">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-[#0F172A]">Statistical Value Imputation</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">Target Column</label>
                  <select
                    value={imputeColumn}
                    onChange={(e) => setImputeColumn(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                  >
                    <option value="">Select column...</option>
                    {columnsList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#475569] mb-1">Imputation Strategy</label>
                  <select
                    value={imputeStrategy}
                    onChange={(e) => setImputeStrategy(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                  >
                    <option value="median">Median (Robust)</option>
                    <option value="mean">Mean (Parametric)</option>
                    <option value="mode">Mode (Most Frequent)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    disabled={!imputeColumn || isExecuting}
                    onClick={() => handleExecuteOperation('impute_missing', { column: imputeColumn, strategy: imputeStrategy })}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors shadow-2xs touch-manipulation"
                  >
                    {isExecuting ? 'Applying...' : 'Apply Imputation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Version History */}
        <div className="lg:col-span-1 p-4 sm:p-5 rounded-xl card-base flex flex-col justify-between min-w-0">
          <div className="space-y-3.5">
            <div className="flex items-center space-x-2 pb-3 border-b border-[#E2E8F0]">
              <History className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Lineage & Versions
              </h2>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
                <span className="mt-2 text-xs text-slate-500">Loading version lineage...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#64748B]">
                No prior version history found.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto scrollbar-thin">
                {versions.map((v) => {
                  const isCurrent = v.version_number === activeDataset.current_version_num;
                  return (
                    <div 
                      key={v.id}
                      className={`p-3.5 rounded-xl border text-xs transition-all ${
                        isCurrent 
                          ? 'bg-blue-50/70 border-blue-200 shadow-2xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#0F172A]">
                          Version {v.version_number}
                        </span>

                        {isCurrent ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRollback(v.version_number)}
                            disabled={isExecuting}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline flex items-center space-x-1 touch-manipulation cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Rollback</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-[#64748B] mt-1 font-mono">
                        {v.row_count.toLocaleString()} rows × {v.column_count} cols
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Rollback Strategy</span>
            <span className="font-semibold text-slate-700">Zero-Loss Cloning</span>
          </div>
        </div>
      </div>
    </div>
  );
};
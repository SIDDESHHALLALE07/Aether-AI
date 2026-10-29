import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Loader2 } from 'lucide-react';
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
      setActionSuccess(`Operation completed successfully.`);
      const updated = await api.getDataset(activeDataset.id);
      if (updated && updated.dataset) {
        selectDataset(updated.dataset);
      }
      await refreshCleaningState();
    } catch (err: any) {
      setActionError(err.message || `Failed to execute operation.`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRollback = async (targetVersion: number) => {
    if (!activeDataset || isExecuting) return;
    if (!window.confirm(`Rollback to Version ${targetVersion}?`)) return;

    setIsExecuting(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      await api.rollbackCleaningVersion(activeDataset.id, targetVersion);
      setActionSuccess(`Rolled back to Version ${targetVersion}.`);
      const updated = await api.getDataset(activeDataset.id);
      if (updated && updated.dataset) {
        selectDataset(updated.dataset);
      }
      await refreshCleaningState();
    } catch (err: any) {
      setActionError(err.message || `Failed to rollback.`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Cleaning</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">
            {datasets.length === 0
              ? 'Please upload a dataset to perform cleaning.'
              : 'Please select a dataset to perform cleaning.'}
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

  const qualityMetrics = [
    { label: 'Overall Quality', score: quality?.overall_score ?? null },
    { label: 'Completeness', score: quality?.completeness_score ?? null },
    { label: 'Uniqueness', score: quality?.uniqueness_score ?? null },
    { label: 'Validity', score: quality?.validity_score ?? null },
    { label: 'Consistency', score: quality?.consistency_score ?? null },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Cleaning</h1>
        <p className="text-xs text-[#64748B] mt-0.5 truncate" title={activeDataset.original_filename}>
          Dataset: <span className="font-medium text-[#0F172A]">{activeDataset.original_filename} (v{activeDataset.current_version_num})</span>
        </p>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-md bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-md bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-xs">
          {actionError}
        </div>
      )}

      {/* Quality Score Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {qualityMetrics.map((m, idx) => (
          <div key={idx} className="p-3 sm:p-3.5 rounded-lg bg-white border border-[#E2E8F0] min-w-0">
            <span className="text-[11px] sm:text-xs text-[#64748B] block truncate">{m.label}</span>
            <div className="mt-1 text-sm sm:text-base font-semibold text-[#0F172A]">
              {m.score !== null ? `${m.score}/100` : '–'}
            </div>
          </div>
        ))}
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
        {/* Operations */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] space-y-3 min-w-0">
            <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider pb-2 border-b border-[#F1F5F9]">
              Cleaning Operations
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#0F172A]">Remove Duplicates</h3>
                  <p className="text-xs text-[#64748B] mt-1">Purges identical rows across all fields.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('remove_duplicates')}
                  className="mt-3 w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium py-2 rounded-md transition-colors touch-manipulation"
                >
                  Remove Duplicates
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#0F172A]">Drop Missing Rows</h3>
                  <p className="text-xs text-[#64748B] mt-1">Removes rows containing null values.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('drop_missing')}
                  className="mt-3 w-full bg-[#0F172A] hover:bg-[#1E293B] disabled:opacity-50 text-white text-xs font-medium py-2 rounded-md transition-colors touch-manipulation"
                >
                  Drop Missing Rows
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#0F172A]">Cap Outliers (IQR)</h3>
                  <p className="text-xs text-[#64748B] mt-1">Clamps extreme values to 1.5x IQR boundary.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('handle_outliers_iqr')}
                  className="mt-3 w-full bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] disabled:opacity-50 text-[#0F172A] text-xs font-medium py-2 rounded-md transition-colors touch-manipulation"
                >
                  Cap Outliers
                </button>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#0F172A]">Trim Text</h3>
                  <p className="text-xs text-[#64748B] mt-1">Removes leading and trailing whitespaces.</p>
                </div>
                <button
                  disabled={isExecuting}
                  onClick={() => handleExecuteOperation('trim_whitespace')}
                  className="mt-3 w-full bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] disabled:opacity-50 text-[#0F172A] text-xs font-medium py-2 rounded-md transition-colors touch-manipulation"
                >
                  Trim Text
                </button>
              </div>
            </div>

            {/* Imputation Config Box */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5 mt-3">
              <h3 className="text-xs font-semibold text-[#0F172A]">Imputation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">Column</label>
                  <select
                    value={imputeColumn}
                    onChange={(e) => setImputeColumn(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  >
                    <option value="">Select column...</option>
                    {columnsList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#475569] mb-1">Strategy</label>
                  <select
                    value={imputeStrategy}
                    onChange={(e) => setImputeStrategy(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
                  >
                    <option value="median">Median</option>
                    <option value="mean">Mean</option>
                    <option value="mode">Mode</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    disabled={!imputeColumn || isExecuting}
                    onClick={() => handleExecuteOperation('impute_missing', { column: imputeColumn, strategy: imputeStrategy })}
                    className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium py-2 rounded-md transition-colors touch-manipulation"
                  >
                    Apply Imputation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Version History */}
        <div className="lg:col-span-1 p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col justify-between min-w-0">
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider pb-2 border-b border-[#F1F5F9]">
              Version History
            </h2>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#64748B]">
                No version history found.
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin">
                {versions.map((v) => {
                  const isCurrent = v.version_number === activeDataset.current_version_num;
                  return (
                    <div 
                      key={v.id}
                      className={`p-3 rounded-lg border text-xs ${
                        isCurrent 
                          ? 'bg-[#EFF6FF]/50 border-[#BFDBFE]' 
                          : 'bg-[#F8FAFC] border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-[#0F172A]">
                          Version {v.version_number}
                        </span>

                        {isCurrent ? (
                          <span className="text-[10px] sm:text-[11px] text-[#166534] bg-[#DCFCE7] px-1.5 py-0.5 rounded font-medium">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRollback(v.version_number)}
                            disabled={isExecuting}
                            className="text-xs text-[#2563EB] hover:underline font-medium touch-manipulation py-0.5"
                          >
                            Rollback
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-[#64748B] mt-1">
                        {v.row_count.toLocaleString()} rows × {v.column_count} cols
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

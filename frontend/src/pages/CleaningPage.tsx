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
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import type { DataQualityScore, DatasetVersion } from '../types';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  AnimatedCard, 
  CountUp,
  AetherSignal,
  InteractiveButton,
  NoDatasetsIllustration
} from '../components/motion';

export const CleaningPage: React.FC = () => {
  const { activeDataset, datasets, selectDataset } = useWorkspaceStore();

  const [quality, setQuality] = useState<DataQualityScore | null>(null);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingOp, setExecutingOp] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [imputeColumn, setImputeColumn] = useState('');
  const [imputeStrategy, setImputeStrategy] = useState<'mean' | 'median' | 'mode' | 'constant'>('median');
  const [columnsList, setColumnsList] = useState<string[]>([]);

  const isExecuting = executingOp !== null;

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
    setExecutingOp(opType);
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
      setExecutingOp(null);
    }
  };

  const handleRollback = async (targetVersion: number) => {
    if (!activeDataset || isExecuting) return;
    if (!window.confirm(`Rollback to Version ${targetVersion}? Non-destructive versioning will branch safely.`)) return;

    setExecutingOp(`rollback_${targetVersion}`);
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
      setExecutingOp(null);
    }
  };

  if (!activeDataset) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Data Quality & Cleaning</h1>
          <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19]">
            <NoDatasetsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Active Dataset Selected</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
              {datasets.length === 0
                ? 'Upload a dataset to evaluate health metrics, impute missing values, and sanitize records.'
                : 'Please select a dataset to perform automated data sanitization.'}
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

  const qualityMetrics = [
    { label: 'Overall Reliability', score: quality?.overall_score ?? null },
    { label: 'Completeness', score: quality?.completeness_score ?? null },
    { label: 'Uniqueness', score: quality?.uniqueness_score ?? null },
    { label: 'Validity', score: quality?.validity_score ?? null },
    { label: 'Consistency', score: quality?.consistency_score ?? null },
  ];

  return (
    <PageTransition>
      <div className="space-y-6 max-w-full pb-12 min-w-0">
        {/* Header Banner */}
        <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Data Quality & Cleaning Lab</h1>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold border border-emerald-200 dark:border-emerald-800">
                v{activeDataset.current_version_num}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1.5 truncate" title={activeDataset.original_filename}>
              Dataset: <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC] font-mono">{activeDataset.original_filename}</span> • Non-Destructive Versioning
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isExecuting && (
              <AetherSignal status="processing" label="Applying pipeline operation..." compact />
            )}
            <Link
              to="/workspace"
              className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center space-x-1.5 group min-h-[40px] px-3 py-1.5 rounded-lg"
            >
              <span>Return to Studio</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Action Notifications */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-4 sm:p-4.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm flex items-center space-x-2.5 shadow-2xs"
            >
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="font-medium">{actionSuccess}</span>
            </motion.div>
          )}

          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-4 sm:p-4.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm flex items-center space-x-2.5 shadow-2xs"
            >
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span className="font-medium">{actionError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quality Score Row: Staggered entrance, real CountUp, animated progress fills */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
          {qualityMetrics.map((m, idx) => (
            <StaggerItem key={idx}>
              <AnimatedCard interactive lift className="p-4.5 sm:p-5 rounded-2xl min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-[#64748B] dark:text-slate-400 block truncate">{m.label}</span>
                <div className="mt-1.5 text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] flex items-center space-x-1.5">
                  {m.score !== null ? (
                    <>
                      <CountUp value={m.score} />
                      <span className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-normal">/ 100</span>
                    </>
                  ) : (
                    <span>–</span>
                  )}
                </div>
                {m.score !== null && (
                  <div className="mt-2.5 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, m.score)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        m.score > 85 ? 'bg-emerald-500' : m.score > 65 ? 'bg-blue-500' : 'bg-amber-500'
                      }`} 
                    />
                  </div>
                )}
              </AnimatedCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Main Operations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-7 min-w-0">
          {/* Operations */}
          <div className="lg:col-span-2 space-y-5 min-w-0">
            <div className="p-5 sm:p-7 rounded-2xl card-base space-y-5 min-w-0">
              <div className="flex items-center space-x-2.5 pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                <SlidersHorizontal className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Automated Cleaning Operations
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* 1: Deduplicate */}
                <div className={`p-4.5 sm:p-5 rounded-xl border flex flex-col justify-between transition-all shadow-2xs ${
                  executingOp === 'remove_duplicates'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-800'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <Trash2 className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Deduplicate Records</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">Detects and purges identical rows across all attributes.</p>
                  </div>
                  <InteractiveButton
                    disabled={isExecuting}
                    onClick={() => handleExecuteOperation('remove_duplicates')}
                    className="mt-4 w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    {executingOp === 'remove_duplicates' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{executingOp === 'remove_duplicates' ? 'Processing...' : 'Remove Duplicate Rows'}</span>
                  </InteractiveButton>
                </div>

                {/* 2: Drop Null Rows */}
                <div className={`p-4.5 sm:p-5 rounded-xl border flex flex-col justify-between transition-all shadow-2xs ${
                  executingOp === 'drop_missing'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <Scissors className="w-4.5 h-4.5 text-slate-700 dark:text-slate-300" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Drop Null Rows</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">Eliminates rows containing null or empty values.</p>
                  </div>
                  <InteractiveButton
                    disabled={isExecuting}
                    onClick={() => handleExecuteOperation('drop_missing')}
                    className="mt-4 w-full bg-[#0F172A] dark:bg-slate-700 hover:bg-[#1E293B] dark:hover:bg-slate-600 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    {executingOp === 'drop_missing' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{executingOp === 'drop_missing' ? 'Processing...' : 'Drop Missing Rows'}</span>
                  </InteractiveButton>
                </div>

                {/* 3: Cap Outliers */}
                <div className={`p-4.5 sm:p-5 rounded-xl border flex flex-col justify-between transition-all shadow-2xs ${
                  executingOp === 'handle_outliers_iqr'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <ShieldCheck className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Cap Outliers (1.5x IQR)</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">Bounds extreme distribution tails using robust interquartile fences.</p>
                  </div>
                  <InteractiveButton
                    disabled={isExecuting}
                    onClick={() => handleExecuteOperation('handle_outliers_iqr')}
                    className="mt-4 w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 disabled:opacity-50 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    {executingOp === 'handle_outliers_iqr' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{executingOp === 'handle_outliers_iqr' ? 'Processing...' : 'Cap Outliers'}</span>
                  </InteractiveButton>
                </div>

                {/* 4: Sanitize Text */}
                <div className={`p-4.5 sm:p-5 rounded-xl border flex flex-col justify-between transition-all shadow-2xs ${
                  executingOp === 'trim_whitespace'
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                }`}>
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Sanitize Text Whitespace</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">Trims unprinted whitespace and standardizes string casing.</p>
                  </div>
                  <InteractiveButton
                    disabled={isExecuting}
                    onClick={() => handleExecuteOperation('trim_whitespace')}
                    className="mt-4 w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 disabled:opacity-50 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
                  >
                    {executingOp === 'trim_whitespace' && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>{executingOp === 'trim_whitespace' ? 'Processing...' : 'Sanitize Text'}</span>
                  </InteractiveButton>
                </div>
              </div>

              {/* Imputation Config Box */}
              <div className="p-4.5 sm:p-5 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/40 space-y-3.5 mt-4">
                <div className="flex items-center space-x-2.5">
                  <Database className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Statistical Value Imputation</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Target Column</label>
                    <select
                      value={imputeColumn}
                      onChange={(e) => setImputeColumn(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[46px]"
                    >
                      <option value="">Select column...</option>
                      {columnsList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Imputation Strategy</label>
                    <select
                      value={imputeStrategy}
                      onChange={(e) => setImputeStrategy(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[46px]"
                    >
                      <option value="median">Median (Robust)</option>
                      <option value="mean">Mean (Parametric)</option>
                      <option value="mode">Mode (Most Frequent)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <InteractiveButton
                      disabled={!imputeColumn || isExecuting}
                      onClick={() => handleExecuteOperation('impute_missing', { column: imputeColumn, strategy: imputeStrategy })}
                      className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition-colors shadow-2xs flex items-center justify-center space-x-2 cursor-pointer min-h-[46px]"
                    >
                      {executingOp === 'impute_missing' && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{executingOp === 'impute_missing' ? 'Applying...' : 'Apply Imputation'}</span>
                    </InteractiveButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Version History */}
          <div className="lg:col-span-1 p-5 sm:p-6 rounded-2xl card-base flex flex-col justify-between min-w-0">
            <div className="space-y-4">
              <div className="flex items-center space-x-2.5 pb-3.5 border-b border-[#E2E8F0] dark:border-white/10">
                <History className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider">
                  Lineage & Versions
                </h2>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
                  <span className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Loading version lineage...</span>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                  No prior version history found.
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin">
                  <AnimatePresence>
                    {versions.map((v) => {
                      const isCurrent = v.version_number === activeDataset.current_version_num;
                      const isRollingBackThis = executingOp === `rollback_${v.version_number}`;
                      return (
                        <motion.div 
                          key={v.id}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`p-4 rounded-xl border text-xs sm:text-sm transition-all ${
                            isCurrent 
                              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 shadow-2xs' 
                              : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                              Version {v.version_number}
                            </span>

                            {isCurrent ? (
                              <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleRollback(v.version_number)}
                                disabled={isExecuting}
                                className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold hover:underline flex items-center space-x-1 touch-manipulation cursor-pointer disabled:opacity-50 min-h-[36px]"
                              >
                                {isRollingBackThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                                <span>Rollback</span>
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 font-mono">
                            {v.row_count.toLocaleString()} rows × {v.column_count} cols
                          </p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <div className="pt-3.5 border-t border-slate-100 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Rollback Strategy</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Zero-Loss Cloning</span>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

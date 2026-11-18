import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  BarChart3, 
  SlidersHorizontal, 
  FileText, 
  Search, 
  FileSpreadsheet, 
  ArrowRight, 
  ShieldCheck, 
  Table as TableIcon 
} from 'lucide-react';
import { api } from '../services/api';
import type { Dataset, DatasetVersion, DataQualityScore } from '../types';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { PageTransition, SkeletonTable, InteractiveButton } from '../components/motion';

export const DatasetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { selectDataset } = useWorkspaceStore();

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [versions, setVersions] = useState<DatasetVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [previewData, setPreviewData] = useState<{
    columns: string[];
    rows: Record<string, any>[];
    total_rows: number;
    page: number;
    limit: number;
  } | null>(null);
  const [quality, setQuality] = useState<DataQualityScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rowFilter, setRowFilter] = useState('');
  const limit = 25;

  useEffect(() => {
    if (!id) return;
    const fetchMeta = async () => {
      setIsLoading(true);
      try {
        const detail = await api.getDataset(id);
        setDataset(detail.dataset);
        setVersions(detail.versions || []);
        setSelectedVersionNum(detail.dataset.current_version_num);
        selectDataset(detail.dataset);

        try {
          const q = await api.getDatasetQuality(id);
          setQuality(q);
        } catch {
          // Handled
        }
      } catch {
        // Handled
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeta();
  }, [id, selectDataset]);

  useEffect(() => {
    if (!id) return;
    const fetchRows = async () => {
      setIsTableLoading(true);
      try {
        const p = await api.getDatasetPreview(id, selectedVersionNum, page, limit);
        setPreviewData(p);
      } catch {
        // Handled
      } finally {
        setIsTableLoading(false);
      }
    };
    fetchRows();
  }, [id, selectedVersionNum, page]);

  const filteredRows = useMemo(() => {
    if (!previewData || !previewData.rows) return [];
    if (!rowFilter.trim()) return previewData.rows;
    const q = rowFilter.toLowerCase();
    return previewData.rows.filter((row) =>
      previewData.columns.some((col) => {
        const val = row[col];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
      })
    );
  }, [previewData, rowFilter]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-24 card-base max-w-5xl mx-auto">
          <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          <span className="mt-3 text-xs font-medium text-[#64748B] dark:text-slate-400">Loading dataset records & metadata...</span>
        </div>
      </PageTransition>
    );
  }

  if (!dataset) {
    return (
      <PageTransition>
        <div className="p-8 sm:p-12 text-center card-base max-w-xl mx-auto my-12">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Dataset Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">The requested dataset could not be located in this project.</p>
          <Link to="/datasets" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800">
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to Datasets Library</span>
          </Link>
        </div>
      </PageTransition>
    );
  }

  const totalPages = previewData ? Math.ceil(previewData.total_rows / limit) : 1;

  return (
    <PageTransition>
      <div className="space-y-6 max-w-full pb-12 min-w-0">
        {/* Top Header Card */}
        <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 min-w-0">
          <div className="min-w-0 w-full md:w-auto space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight truncate font-mono" title={dataset.original_filename}>
                {dataset.original_filename}
              </h1>
              <span className="text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                v{dataset.current_version_num}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span>{(dataset.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="uppercase font-semibold text-slate-700 dark:text-slate-300">{dataset.file_type}</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span>Uploaded {new Date(dataset.created_at).toLocaleDateString()}</span>
              {quality && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Quality {quality.overall_score.toFixed(0)}/100</span>
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Link
              to="/workspace"
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold px-4.5 py-2.5 rounded-xl transition-all shadow-xs touch-manipulation active:scale-[0.98] min-h-[44px]"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/analytics"
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs touch-manipulation active:scale-[0.98] min-h-[44px]"
            >
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Analytics</span>
            </Link>
            <Link
              to="/cleaning"
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs touch-manipulation active:scale-[0.98] min-h-[44px]"
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Clean</span>
            </Link>
            <Link
              to="/reports"
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 text-[#0F172A] dark:text-[#F8FAFC] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-2xs touch-manipulation active:scale-[0.98] min-h-[44px]"
            >
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Report</span>
            </Link>
          </div>
        </div>

        {/* Main Table Preview Card */}
        <div className="card-base p-5 sm:p-7 rounded-2xl space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                <TableIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Raw Record Table</h2>
                {previewData && (
                  <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                    Records {((page - 1) * limit + 1).toLocaleString()} to {Math.min(page * limit, previewData.total_rows).toLocaleString()} of {previewData.total_rows.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rowFilter}
                  onChange={(e) => setRowFilter(e.target.value)}
                  placeholder="Filter page rows..."
                  className="w-full sm:w-56 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[44px]"
                />
              </div>

              {versions.length > 1 && (
                <div className="flex items-center space-x-2 text-xs sm:text-sm">
                  <span className="font-semibold text-[#475569] dark:text-slate-300 whitespace-nowrap">Version:</span>
                  <select
                    value={selectedVersionNum}
                    onChange={(e) => {
                      setSelectedVersionNum(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-white/10 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[44px]"
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
                <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-white/10">
                  <tr>
                    <th className="py-3 px-3.5 text-center text-[#94A3B8] font-mono w-14 border-r border-[#E2E8F0] dark:border-white/10 sticky left-0 bg-[#F8FAFC] dark:bg-slate-900">#</th>
                    {previewData.columns.map((col) => (
                      <th key={col} className="py-3 px-4 whitespace-nowrap border-r border-[#E2E8F0] dark:border-white/10 last:border-r-0 font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/5 font-mono text-xs bg-white dark:bg-[#111827]">
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-[#94A3B8] font-mono bg-[#F8FAFC] dark:bg-slate-900/70 border-r border-[#E2E8F0] dark:border-white/10 sticky left-0 font-medium">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      {previewData.columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined || val === '';
                        return (
                          <td key={col} className="py-2.5 px-4 whitespace-nowrap border-r border-[#E2E8F0] dark:border-white/10 last:border-r-0 text-[#0F172A] dark:text-[#F8FAFC]">
                            {isNull ? (
                              <span className="text-[#94A3B8] italic font-normal bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">null</span>
                            ) : typeof val === 'number' ? (
                              <span className="text-slate-900 dark:text-slate-200 font-medium">{val}</span>
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
            <div className="py-12 text-center text-xs sm:text-sm text-[#64748B] dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-[#E2E8F0] dark:border-white/10">
              {rowFilter.trim() ? `No records match "${rowFilter}".` : 'No records found for this version.'}
            </div>
          )}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-[#E2E8F0] dark:border-white/10 gap-3.5">
              <div className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                Page <span className="font-semibold text-slate-800 dark:text-slate-200">{page}</span> of <span className="font-semibold text-slate-800 dark:text-slate-200">{totalPages}</span>
              </div>

              <div className="flex items-center space-x-2.5">
                <InteractiveButton
                  disabled={page <= 1 || isTableLoading}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs min-h-[40px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </InteractiveButton>

                <InteractiveButton
                  disabled={page >= totalPages || isTableLoading}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs min-h-[40px]"
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

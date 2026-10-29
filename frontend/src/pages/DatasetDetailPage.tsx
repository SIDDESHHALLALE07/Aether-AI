import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  SlidersHorizontal,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import type { Dataset, DatasetVersion, DataQualityScore } from '../types';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white border border-[#E2E8F0] rounded-lg">
        <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
        <span className="ml-2 text-xs text-[#64748B]">Loading preview...</span>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg max-w-xl mx-auto">
        <h2 className="text-sm font-semibold text-[#0F172A]">Dataset Not Found</h2>
        <Link to="/datasets" className="mt-3 inline-block text-xs font-medium text-[#2563EB] underline touch-manipulation">
          Back to Datasets
        </Link>
      </div>
    );
  }

  const totalPages = previewData ? Math.ceil(previewData.total_rows / limit) : 1;

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Top Header Card */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 min-w-0">
        <div className="min-w-0 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-semibold text-[#0F172A] tracking-tight truncate" title={dataset.original_filename}>
              {dataset.original_filename}
            </h1>
            <span className="text-xs text-[#64748B] flex-shrink-0">(v{dataset.current_version_num})</span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
            <span>{(dataset.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
            <span>•</span>
            <span className="uppercase">{dataset.file_type}</span>
            <span>•</span>
            <span>Uploaded {new Date(dataset.created_at).toLocaleDateString()}</span>
            {quality && (
              <>
                <span>•</span>
                <span className="text-[#166534] font-medium">Quality: {quality.overall_score}/100</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Link
            to="/analytics"
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-3.5 py-2 sm:py-1.5 rounded-md transition-colors touch-manipulation"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </Link>
          <Link
            to="/cleaning"
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2 sm:py-1.5 rounded-md transition-colors touch-manipulation"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Cleaning</span>
          </Link>
          <Link
            to="/reports"
            className="flex-1 md:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2 sm:py-1.5 rounded-md transition-colors touch-manipulation"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reports</span>
          </Link>
        </div>
      </div>

      {/* Version Selector & Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 text-xs">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="font-medium text-[#475569] whitespace-nowrap">Version:</span>
          <select
            value={selectedVersionNum}
            onChange={(e) => {
              setSelectedVersionNum(Number(e.target.value));
              setPage(1);
            }}
            className="bg-white border border-[#CBD5E1] text-xs text-[#0F172A] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#2563EB] w-full sm:w-auto touch-manipulation"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.version_number}>
                Version {v.version_number} ({v.row_count.toLocaleString()} rows × {v.column_count} cols)
              </option>
            ))}
          </select>
        </div>

        {previewData && (
          <div className="text-xs text-[#64748B]">
            Rows {((page - 1) * limit + 1).toLocaleString()} – {Math.min(page * limit, previewData.total_rows).toLocaleString()} of {previewData.total_rows.toLocaleString()}
          </div>
        )}
      </div>

      {/* Tabular Preview */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-[#E2E8F0] min-w-0">
        <div className="mb-3">
          <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
            Raw Records Preview
          </h2>
        </div>

        {isTableLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
            <span className="ml-2 text-xs text-[#64748B]">Loading records...</span>
          </div>
        ) : previewData && previewData.rows.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#E2E8F0] scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse min-w-full">
              <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-2.5 text-center text-[#94A3B8] font-mono w-12 border-r border-[#E2E8F0] sticky left-0 bg-[#F8FAFC]">#</th>
                  {previewData.columns.map((col) => (
                    <th key={col} className="p-2.5 whitespace-nowrap border-r border-[#E2E8F0] last:border-r-0 font-semibold text-[#0F172A]">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
                {previewData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC]">
                    <td className="p-2 text-center text-[#94A3B8] font-mono bg-[#F8FAFC] border-r border-[#E2E8F0] sticky left-0">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    {previewData.columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined || val === '';
                      return (
                        <td key={col} className="p-2 whitespace-nowrap border-r border-[#E2E8F0] last:border-r-0 text-[#0F172A]">
                          {isNull ? (
                            <span className="text-[#94A3B8] italic">null</span>
                          ) : typeof val === 'number' ? (
                            <span>{val}</span>
                          ) : (
                            String(val)
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
          <div className="py-8 text-center text-xs text-[#64748B]">
            No rows available.
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E2E8F0] gap-2">
            <button
              disabled={page <= 1 || isTableLoading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="flex items-center space-x-1 px-3.5 py-2 rounded-md border border-[#CBD5E1] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-40 touch-manipulation min-h-[38px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-[#64748B] whitespace-nowrap">
              Page {page} of {totalPages}
            </span>

            <button
              disabled={page >= totalPages || isTableLoading}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="flex items-center space-x-1 px-3.5 py-2 rounded-md border border-[#CBD5E1] text-xs font-medium text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-40 touch-manipulation min-h-[38px]"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

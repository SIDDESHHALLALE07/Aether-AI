import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { api } from '../services/api';
import type { Report } from '../types';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  FileCheck
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { activeDataset, datasets, selectDataset, activeChartConfig } = useWorkspaceStore();

  const [detailLevel, setDetailLevel] = useState<string>('comprehensive');
  const [includeCharts, setIncludeCharts] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [reportHistory, setReportHistory] = useState<Report[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDataset) return;
    const fetchHistory = async () => {
      try {
        const history = await api.getReportHistory(activeDataset.id);
        setReportHistory(history || []);
      } catch {
        // Silently handled
      }
    };
    fetchHistory();
  }, [activeDataset]);

  const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const ds = datasets.find((d) => d.id === selectedId);
    if (ds) {
      selectDataset(ds);
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  const handleGeneratePdf = async () => {
    if (!activeDataset) return;
    setIsGenerating(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const chartPayload = includeCharts && activeChartConfig ? {
        chart_type: activeChartConfig.chartType,
        x_column: activeChartConfig.xColumn,
        y_column: activeChartConfig.yColumn,
        group_by: activeChartConfig.groupColumn,
        aggregation: activeChartConfig.aggregation,
        bins: activeChartConfig.bins
      } : undefined;

      const payload = {
        chart_config: chartPayload,
        detail_level: detailLevel
      };

      const report = await api.generatePdfReport(activeDataset.id, payload);
      setSuccessMessage('Executive report compiled successfully.');
      setReportHistory((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
    } catch {
      setErrorMessage('Unable to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async (reportId?: string) => {
    if (!activeDataset) return;
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const cleanName = activeDataset.original_filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Aether_Data_Analysis_Report_${cleanName}.pdf`;
      await api.downloadPdfReportBlob(activeDataset.id, filename, reportId);
    } catch {
      setErrorMessage('Unable to download report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'excel') => {
    if (!activeDataset) return;
    if (format === 'csv') setIsExportingCsv(true);
    else setIsExportingExcel(true);
    setErrorMessage(null);

    try {
      const cleanName = activeDataset.original_filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      const filename = `Aether_Export_${cleanName}.${ext}`;
      await api.downloadExportBlob(activeDataset.id, format, filename);
    } catch {
      setErrorMessage(`Unable to export dataset as ${format.toUpperCase()}. Please try again.`);
    } finally {
      if (format === 'csv') setIsExportingCsv(false);
      else setIsExportingExcel(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Executive Reports & Data Export</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <FileText className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Active Dataset Selected</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            {datasets.length === 0
              ? 'Upload a dataset to generate publication-grade PDF reports, summaries, and spreadsheets.'
              : 'Please select a dataset to produce reports.'}
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-emerald-50/30 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Executive Reports & Export Studio</h1>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              PDF & Excel Engine
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1 truncate" title={activeDataset.original_filename}>
            Dataset: <span className="font-semibold text-[#0F172A] font-mono">{activeDataset.original_filename}</span> • v{activeDataset.current_version_num}
          </p>
        </div>

        <Link
          to="/workspace"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
        >
          <span>Return to Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 font-bold hover:underline ml-2 touch-manipulation">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 font-bold hover:underline ml-2 touch-manipulation">
            Dismiss
          </button>
        </div>
      )}

      {/* Report Controls */}
      <div className="p-5 sm:p-6 card-base space-y-5 min-w-0">
        <div className="flex items-center space-x-2 pb-3 border-b border-[#E2E8F0]">
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            Configure Document Generation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Active Dataset Source
            </label>
            <select
              value={activeDataset.id}
              onChange={handleDatasetChange}
              className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_filename} (v{d.current_version_num})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Audit Detail Level
            </label>
            <select
              value={detailLevel}
              onChange={(e) => setDetailLevel(e.target.value)}
              className="w-full text-xs bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#2563EB] shadow-2xs"
            >
              <option value="comprehensive">Comprehensive Enterprise Audit</option>
              <option value="standard">Standard Statistical Brief</option>
              <option value="executive">High-Level Executive Summary</option>
            </select>
          </div>

          <div className="flex items-center sm:pt-6">
            <label className="flex items-center space-x-2 text-xs font-medium text-[#475569] cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#2563EB] w-4 h-4"
              />
              <span>Embed Rendered Visualizations</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation whitespace-nowrap"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            <span>{isGenerating ? 'Compiling PDF...' : 'Generate New PDF'}</span>
          </button>

          <button
            onClick={() => handleDownloadPdf()}
            disabled={isDownloading}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-2xs touch-manipulation whitespace-nowrap"
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-blue-600" />}
            <span>{isDownloading ? 'Downloading...' : 'Download Latest PDF'}</span>
          </button>

          <button
            onClick={() => handleExportData('csv')}
            disabled={isExportingCsv}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold px-3.5 py-2.5 rounded-lg transition-all shadow-2xs touch-manipulation whitespace-nowrap"
          >
            {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isExportingCsv ? 'Exporting...' : 'Export .CSV'}</span>
          </button>

          <button
            onClick={() => handleExportData('excel')}
            disabled={isExportingExcel}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 disabled:opacity-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold px-3.5 py-2.5 rounded-lg transition-all shadow-2xs touch-manipulation whitespace-nowrap"
          >
            {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />}
            <span>{isExportingExcel ? 'Exporting...' : 'Export .XLSX'}</span>
          </button>
        </div>
      </div>

      {/* Report History */}
      <div className="card-base p-4 sm:p-6 space-y-4 min-w-0">
        <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
          Compiled Report Archive
        </h2>

        {reportHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B] bg-slate-50/50 rounded-xl border border-[#E2E8F0]">
            No reports compiled yet. Click <strong>Generate New PDF</strong> above to produce a document.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl scrollbar-thin shadow-2xs">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3.5">Document Title</th>
                  <th className="py-2.5 px-3.5">Source Dataset</th>
                  <th className="py-2.5 px-3.5">Timestamp</th>
                  <th className="py-2.5 px-3.5">Format</th>
                  <th className="py-2.5 px-3.5 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {reportHistory.map((rep) => (
                  <tr key={rep.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-[#0F172A] max-w-[200px] truncate" title={rep.title || 'Data Analysis Report'}>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{rep.title || 'Executive Data Report'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-[#475569] max-w-[160px] truncate font-mono text-[11px]" title={rep.summary_data?.dataset_name || activeDataset.original_filename}>
                      {rep.summary_data?.dataset_name || activeDataset.original_filename}
                    </td>
                    <td className="py-3 px-3.5 text-[#64748B] whitespace-nowrap text-[11px]">
                      {formatDate(rep.created_at)}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                        {rep.file_format?.toUpperCase() || 'PDF'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDownloadPdf(rep.id)}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs touch-manipulation py-1 px-2.5 rounded hover:bg-blue-50 transition-colors"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { api } from '../services/api';
import type { Report } from '../types';
import { Link } from 'react-router-dom';
import { FileText, Download, FileSpreadsheet, Loader2 } from 'lucide-react';

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
      setSuccessMessage('Report generated successfully.');
      setReportHistory((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
    } catch {
      setErrorMessage('Unable to generate the report. Please try again.');
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
      setErrorMessage('Unable to download the report. Please try again.');
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
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Reports</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">
            {datasets.length === 0
              ? 'No dataset available. Please upload a dataset to generate reports.'
              : 'Please select a dataset to generate reports.'}
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

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Page Header */}
      <div>
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Reports</h1>
        <p className="text-xs text-[#64748B] mt-0.5 truncate" title={activeDataset.original_filename}>
          Dataset: <span className="font-medium text-[#0F172A]">{activeDataset.original_filename} (v{activeDataset.current_version_num})</span>
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-[#166534] text-xs underline ml-2 touch-manipulation">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-[#991B1B] text-xs underline ml-2 touch-manipulation">
            Dismiss
          </button>
        </div>
      )}

      {/* Report Controls */}
      <div className="p-3.5 sm:p-5 bg-white border border-[#E2E8F0] rounded-xl space-y-4 min-w-0">
        <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider pb-2 border-b border-[#F1F5F9]">
          Report Generation
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Dataset
            </label>
            <select
              value={activeDataset.id}
              onChange={handleDatasetChange}
              className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.original_filename} (v{d.current_version_num})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Detail Level
            </label>
            <select
              value={detailLevel}
              onChange={(e) => setDetailLevel(e.target.value)}
              className="w-full text-xs bg-white border border-[#CBD5E1] rounded-md px-3 py-2 text-[#0F172A] focus:outline-none focus:border-[#2563EB] touch-manipulation"
            >
              <option value="comprehensive">Comprehensive Audit</option>
              <option value="standard">Standard Analysis</option>
              <option value="executive">Executive Summary</option>
            </select>
          </div>

          <div className="flex items-center sm:pt-6">
            <label className="flex items-center space-x-2 text-xs text-[#475569] cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={(e) => setIncludeCharts(e.target.checked)}
                className="rounded border-[#CBD5E1] text-[#2563EB] w-4 h-4"
              />
              <span>Include Analytical Charts</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2">
          <button
            onClick={handleGeneratePdf}
            disabled={isGenerating}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-md transition-colors touch-manipulation whitespace-nowrap"
          >
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            <span>{isGenerating ? 'Generating...' : 'Generate PDF'}</span>
          </button>

          <button
            onClick={() => handleDownloadPdf()}
            disabled={isDownloading}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-[#F8FAFC] disabled:opacity-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2.5 rounded-md transition-colors touch-manipulation whitespace-nowrap"
          >
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={() => handleExportData('csv')}
            disabled={isExportingCsv}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-[#F8FAFC] disabled:opacity-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2.5 rounded-md transition-colors touch-manipulation whitespace-nowrap"
          >
            {isExportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>{isExportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => handleExportData('excel')}
            disabled={isExportingExcel}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-white hover:bg-[#F8FAFC] disabled:opacity-50 border border-[#CBD5E1] text-[#0F172A] text-xs font-medium px-3.5 py-2.5 rounded-md transition-colors touch-manipulation whitespace-nowrap"
          >
            {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            <span>{isExportingExcel ? 'Exporting...' : 'Export Excel'}</span>
          </button>
        </div>
      </div>

      {/* Report History */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 space-y-3 min-w-0">
        <h2 className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">Report History</h2>

        {reportHistory.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#64748B]">
            No reports generated yet. Click Generate PDF above.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3.5">Report</th>
                  <th className="py-2.5 px-3.5">Dataset</th>
                  <th className="py-2.5 px-3.5">Created</th>
                  <th className="py-2.5 px-3.5">Format</th>
                  <th className="py-2.5 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {reportHistory.map((rep) => (
                  <tr key={rep.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-3.5 font-medium text-[#0F172A] max-w-[180px] truncate" title={rep.title || 'Data Analysis Report'}>
                      {rep.title || 'Data Analysis Report'}
                    </td>
                    <td className="py-3 px-3.5 text-[#475569] max-w-[160px] truncate" title={rep.summary_data?.dataset_name || activeDataset.original_filename}>
                      {rep.summary_data?.dataset_name || activeDataset.original_filename}
                    </td>
                    <td className="py-3 px-3.5 text-[#64748B] whitespace-nowrap">
                      {formatDate(rep.created_at)}
                    </td>
                    <td className="py-3 px-3.5 text-[#475569] uppercase text-[11px] whitespace-nowrap">
                      {rep.file_format}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDownloadPdf(rep.id)}
                        className="text-[#2563EB] hover:underline font-medium text-xs touch-manipulation py-1"
                      >
                        Download
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

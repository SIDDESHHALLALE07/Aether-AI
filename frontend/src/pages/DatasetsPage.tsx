import React, { useState, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  AlertCircle,
  FileCheck2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { 
  PageTransition, 
  ModalTransition, 
  InteractiveButton, 
  NoDatasetsIllustration,
  NoSearchResultsIllustration,
  SkeletonTable
} from '../components/motion';

export const DatasetsPage: React.FC = () => {
  const { 
    projects, 
    datasets, 
    activeProject, 
    activeDataset, 
    selectDataset, 
    uploadDataset, 
    isLoadingDatasets 
  } = useWorkspaceStore();

  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDatasets = datasets.filter((d) =>
    d.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls', 'json'].includes(ext || '')) {
      setUploadError('Please select a valid CSV, Excel, or JSON file (.csv, .xlsx, .xls, .json)');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) {
      setUploadError('Please select or create a project first.');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const ds = await uploadDataset(activeProject.id, selectedFile);
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      selectDataset(ds);
      navigate('/workspace');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload dataset');
    } finally {
      setIsUploading(false);
    }
  };

  if (!activeProject && projects.length === 0) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Datasets Library</h1>
          <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19]">
            <NoDatasetsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Active Project</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1 mb-5 max-w-sm mx-auto">
              Please create a project first to hold your analytical datasets and versions.
            </p>
            <Link 
              to="/projects"
              className="inline-flex items-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation active:scale-[0.98]"
            >
              <span>Go to Projects</span>
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
        <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Datasets Library</h1>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800">
                {datasets.length} Files
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1.5">
              Active Project: <span className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{activeProject?.name || 'Default Project'}</span>
            </p>
          </div>
          
          <InteractiveButton 
            onClick={() => {
              setIsUploadModalOpen(true);
              setUploadError(null);
              setSelectedFile(null);
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow cursor-pointer min-h-[44px]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </InteractiveButton>
        </div>

        {/* Main Table Card */}
        <div className="card-base p-5 sm:p-7 rounded-2xl space-y-5 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3.5">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by filename..." 
                className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs transition-all min-h-[44px]"
              />
            </div>

            <div className="text-xs sm:text-sm font-medium text-[#64748B] dark:text-slate-400">
              Showing {filteredDatasets.length} of {datasets.length} {datasets.length === 1 ? 'dataset' : 'datasets'}
            </div>
          </div>

          {isLoadingDatasets ? (
            <SkeletonTable rows={5} cols={7} />
          ) : filteredDatasets.length === 0 ? (
            <div className="p-12 text-center bg-slate-50/50 dark:bg-slate-900/40 border border-[#E2E8F0] dark:border-white/10 rounded-2xl text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
              {datasets.length === 0 ? (
                <NoDatasetsIllustration className="w-24 h-24 mx-auto mb-3" />
              ) : (
                <NoSearchResultsIllustration className="w-24 h-24 mx-auto mb-3" />
              )}
              <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Datasets Found</h3>
              <p className="mt-1">
                {datasets.length === 0 
                  ? 'Upload your first CSV, Excel, or JSON dataset to start.' 
                  : 'No files match your search filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E2E8F0] dark:border-white/10 rounded-xl scrollbar-thin shadow-2xs">
              <table className="w-full text-left text-xs sm:text-sm min-w-[680px]">
                <thead className="bg-[#F8FAFC] dark:bg-slate-900/60 text-[#475569] dark:text-slate-400 font-semibold border-b border-[#E2E8F0] dark:border-white/10">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-3.5">Type</th>
                    <th className="py-3 px-3.5">Size</th>
                    <th className="py-3 px-3.5">Active Version</th>
                    <th className="py-3 px-3.5">Uploaded</th>
                    <th className="py-3 px-3.5">Status</th>
                    <th className="py-3 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9] dark:divide-white/5 bg-white dark:bg-[#111827]">
                  {filteredDatasets.map((ds) => {
                    const isSelected = activeDataset?.id === ds.id;
                    const sizeMb = (ds.file_size_bytes / 1024 / 1024).toFixed(2);
                    return (
                      <tr 
                        key={ds.id} 
                        className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors ${
                          isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-[#0F172A] dark:text-[#F8FAFC] max-w-[200px] truncate" title={ds.original_filename}>
                          <div className="flex items-center space-x-2.5">
                            <FileSpreadsheet className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="font-mono text-xs sm:text-sm">{ds.original_filename}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3.5 uppercase text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                            {ds.file_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-[#64748B] dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                          {sizeMb} MB
                        </td>
                        <td className="py-3.5 px-3.5 text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                          <span className="bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-mono font-bold text-xs border border-blue-100 dark:border-blue-800">
                            v{ds.current_version_num}
                          </span>
                        </td>
                        <td className="py-3.5 px-3.5 text-[#64748B] dark:text-slate-400 whitespace-nowrap text-xs">
                          {new Date(ds.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-3.5 whitespace-nowrap">
                          {isSelected ? (
                            <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => selectDataset(ds)}
                              className="text-xs sm:text-sm text-[#2563EB] dark:text-blue-400 hover:text-[#1D4ED8] font-bold touch-manipulation hover:underline cursor-pointer min-h-[36px]"
                            >
                              Set Active
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-3.5 whitespace-nowrap text-xs sm:text-sm">
                          <Link 
                            to={`/datasets/${ds.id}`}
                            className="text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-semibold hover:underline"
                          >
                            Preview
                          </Link>
                          <Link 
                            to="/workspace"
                            onClick={() => selectDataset(ds)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold hover:underline"
                          >
                            Studio
                          </Link>
                          <Link 
                            to="/cleaning"
                            onClick={() => selectDataset(ds)}
                            className="text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-semibold hover:underline"
                          >
                            Clean
                          </Link>
                          <Link 
                            to="/reports"
                            onClick={() => selectDataset(ds)}
                            className="text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white font-semibold hover:underline"
                          >
                            Report
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Dataset Modal */}
        <ModalTransition isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
          <div className="w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] rounded-2xl border border-[#E2E8F0] dark:border-white/10 shadow-2xl p-5 sm:p-6 relative scrollbar-thin">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]">Upload Dataset File</h3>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Selected Project</label>
                <input 
                  type="text" 
                  disabled 
                  value={activeProject?.name || ''} 
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium min-h-[46px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Dataset File (.csv, .xlsx, .json)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40'
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <FileCheck2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 animate-in zoom-in duration-150" />
                      <p className="font-bold text-slate-900 dark:text-[#F8FAFC] text-xs sm:text-sm font-mono">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      <span className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">Click to change file</span>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-10 h-10 text-blue-500 mx-auto mb-2.5" />
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">Click to browse or drag file here</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Supports CSV, Excel (XLSX/XLS), JSON</p>
                    </div>
                  )}
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv, .xlsx, .xls, .json"
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
                <InteractiveButton
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-[#475569] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[44px]"
                >
                  Cancel
                </InteractiveButton>
                <InteractiveButton
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center space-x-2 cursor-pointer min-h-[44px]"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>{isUploading ? 'Uploading & Parsing...' : 'Upload & Analyze'}</span>
                </InteractiveButton>
              </div>
            </form>
          </div>
        </ModalTransition>
      </div>
    </PageTransition>
  );
};

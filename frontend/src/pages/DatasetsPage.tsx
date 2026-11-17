import React, { useState, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  X,
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Database,
  AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredDatasets = datasets.filter((d) =>
    d.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls', 'json'].includes(ext || '')) {
        setUploadError('Please select a valid CSV, Excel, or JSON file (.csv, .xlsx, .xls, .json)');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
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
      <div className="max-w-4xl mx-auto py-8 space-y-5 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Datasets Library</h1>
        <div className="p-8 sm:p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <Database className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Active Project</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 mb-5 max-w-sm mx-auto">
            Please create a project first to hold your analytical datasets and versions.
          </p>
          <Link 
            to="/projects"
            className="inline-flex items-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation"
          >
            <span>Go to Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Datasets Library</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {datasets.length} Files
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Active Project: <span className="font-semibold text-[#0F172A]">{activeProject?.name || 'Default Project'}</span>
          </p>
        </div>
        
        <button 
          onClick={() => {
            setIsUploadModalOpen(true);
            setUploadError(null);
            setSelectedFile(null);
          }}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs hover:shadow touch-manipulation cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Dataset</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card-base p-4 sm:p-6 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by filename..." 
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs transition-all"
            />
          </div>

          <div className="text-xs font-medium text-[#64748B]">
            Showing {filteredDatasets.length} of {datasets.length} {datasets.length === 1 ? 'dataset' : 'datasets'}
          </div>
        </div>

        {isLoadingDatasets ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
            <span className="mt-2 text-xs text-[#64748B]">Loading datasets library...</span>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="p-12 text-center bg-slate-50/50 border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
            <FileSpreadsheet className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#0F172A]">No Datasets Found</h3>
            <p className="mt-1">
              {datasets.length === 0 
                ? 'Upload your first CSV, Excel, or JSON dataset to start.' 
                : 'No files match your search filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl scrollbar-thin shadow-2xs">
            <table className="w-full text-left text-xs min-w-[680px]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3.5">Filename</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Active Version</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] bg-white">
                {filteredDatasets.map((ds) => {
                  const isSelected = activeDataset?.id === ds.id;
                  const sizeMb = (ds.file_size_bytes / 1024 / 1024).toFixed(2);
                  return (
                    <tr 
                      key={ds.id} 
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-medium text-[#0F172A] max-w-[200px] truncate" title={ds.original_filename}>
                        <div className="flex items-center space-x-2">
                          <FileSpreadsheet className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-mono text-xs">{ds.original_filename}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500 whitespace-nowrap">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {ds.file_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap font-mono text-[11px]">
                        {sizeMb} MB
                      </td>
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold text-[10px] border border-blue-100">
                          v{ds.current_version_num}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap text-[11px]">
                        {new Date(ds.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isSelected ? (
                          <span className="inline-flex items-center space-x-1 text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => selectDataset(ds)}
                            className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-bold touch-manipulation hover:underline"
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-3 whitespace-nowrap">
                        <Link 
                          to={`/datasets/${ds.id}`}
                          className="text-xs text-slate-600 hover:text-[#0F172A] font-semibold hover:underline"
                        >
                          Preview
                        </Link>
                        <Link 
                          to="/workspace"
                          onClick={() => selectDataset(ds)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
                        >
                          Studio
                        </Link>
                        <Link 
                          to="/cleaning"
                          onClick={() => selectDataset(ds)}
                          className="text-xs text-slate-600 hover:text-[#0F172A] font-semibold hover:underline"
                        >
                          Clean
                        </Link>
                        <Link 
                          to="/reports"
                          onClick={() => selectDataset(ds)}
                          className="text-xs text-slate-600 hover:text-[#0F172A] font-semibold hover:underline"
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
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl p-5 sm:p-6 relative scrollbar-thin">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">Upload Dataset File</h3>
              </div>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1.5">Selected Project</label>
                <input 
                  type="text" 
                  disabled 
                  value={activeProject?.name || ''} 
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1.5">Dataset File (.csv, .xlsx, .json)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/40 rounded-xl p-6 text-center cursor-pointer transition-all"
                >
                  <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-slate-900 text-xs font-mono">{selectedFile.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-800 text-xs">Click to browse or drag file here</p>
                      <p className="text-[11px] text-slate-400 mt-1">Supports CSV, Excel (XLSX/XLS), JSON</p>
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

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{isUploading ? 'Uploading & Parsing...' : 'Upload & Analyze'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useRef } from 'react';
import { 
  Search, 
  Loader2, 
  X,
  Upload,
  FileSpreadsheet
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
      navigate('/analytics');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload dataset');
    } finally {
      setIsUploading(false);
    }
  };

  if (!activeProject && projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Datasets</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">No project selected. Please create a project to upload datasets.</p>
          <Link 
            to="/projects"
            className="mt-3 inline-block bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors touch-manipulation"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Datasets</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Project: <span className="font-medium text-[#0F172A]">{activeProject?.name || 'None'}</span>
          </p>
        </div>
        
        <button 
          onClick={() => {
            setIsUploadModalOpen(true);
            setUploadError(null);
            setSelectedFile(null);
          }}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-3.5 py-2.5 sm:py-2 rounded-md transition-colors touch-manipulation"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Dataset</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 sm:p-4 space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search datasets..." 
              className="w-full bg-white border border-[#CBD5E1] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="text-xs text-[#64748B] self-end sm:self-center">
            {filteredDatasets.length} {filteredDatasets.length === 1 ? 'dataset' : 'datasets'}
          </div>
        </div>

        {isLoadingDatasets ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#2563EB] animate-spin" />
            <span className="ml-2 text-xs text-[#64748B]">Loading datasets...</span>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="p-8 text-center border border-[#E2E8F0] rounded-lg text-xs text-[#64748B]">
            <FileSpreadsheet className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
            {datasets.length === 0 
              ? 'No datasets uploaded yet. Click Upload Dataset to begin.' 
              : 'No datasets match your search query.'}
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-lg scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[620px]">
              <thead className="bg-[#F8FAFC] text-[#475569] font-medium border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-2.5 px-3.5">Filename</th>
                  <th className="py-2.5 px-3">Format</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Uploaded</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredDatasets.map((ds) => {
                  const isSelected = activeDataset?.id === ds.id;
                  const sizeMb = (ds.file_size_bytes / 1024 / 1024).toFixed(2);
                  return (
                    <tr 
                      key={ds.id} 
                      className={`hover:bg-[#F8FAFC] transition-colors ${
                        isSelected ? 'bg-[#EFF6FF]/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5 font-medium text-[#0F172A] max-w-[180px] truncate" title={ds.original_filename}>
                        {ds.original_filename}
                      </td>
                      <td className="py-3 px-3 uppercase text-[11px] text-[#64748B] whitespace-nowrap">
                        {ds.file_type}
                      </td>
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                        {sizeMb} MB
                      </td>
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                        v{ds.current_version_num}
                      </td>
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap">
                        {new Date(ds.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isSelected ? (
                          <span className="text-xs text-[#166534] font-medium bg-[#DCFCE7] px-2 py-0.5 rounded">
                            Active
                          </span>
                        ) : (
                          <button
                            onClick={() => selectDataset(ds)}
                            className="text-xs text-[#2563EB] hover:underline font-medium touch-manipulation"
                          >
                            Select
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-2.5 whitespace-nowrap">
                        <Link 
                          to={`/datasets/${ds.id}`}
                          className="text-xs text-[#475569] hover:text-[#0F172A] font-medium touch-manipulation py-1"
                        >
                          Preview
                        </Link>
                        <Link 
                          to="/analytics"
                          onClick={() => selectDataset(ds)}
                          className="text-xs text-[#2563EB] hover:underline font-medium touch-manipulation py-1"
                        >
                          Analyze
                        </Link>
                        <Link 
                          to="/cleaning"
                          onClick={() => selectDataset(ds)}
                          className="text-xs text-[#475569] hover:text-[#0F172A] font-medium touch-manipulation py-1"
                        >
                          Clean
                        </Link>
                        <Link 
                          to="/reports"
                          onClick={() => selectDataset(ds)}
                          className="text-xs text-[#475569] hover:text-[#0F172A] font-medium touch-manipulation py-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#E2E8F0] shadow-2xl p-4 sm:p-5 relative scrollbar-thin">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">Upload Dataset</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-3 p-2.5 rounded bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-xs">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls, .json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CBD5E1] hover:border-[#2563EB] rounded-lg p-5 sm:p-8 text-center cursor-pointer bg-[#F8FAFC] transition-colors flex flex-col items-center justify-center touch-manipulation min-h-[140px]"
              >
                {selectedFile ? (
                  <div className="min-w-0 max-w-full">
                    <p className="text-xs font-semibold text-[#0F172A] truncate max-w-[260px] mx-auto" title={selectedFile.name}>{selectedFile.name}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <span className="inline-block mt-2 text-xs text-[#2563EB] font-medium underline">
                      Choose another file
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
                    <p className="text-xs font-medium text-[#0F172A]">Click to select CSV, Excel, or JSON file</p>
                    <p className="text-[11px] text-[#64748B] mt-1">(.csv, .xlsx, .xls, .json)</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-md border border-[#CBD5E1] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors touch-manipulation min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-md transition-colors touch-manipulation min-h-[40px]"
                >
                  {isUploading ? 'Uploading...' : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

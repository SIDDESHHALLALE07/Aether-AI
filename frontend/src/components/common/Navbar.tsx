import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  FolderKanban, 
  FileSpreadsheet, 
  ChevronDown, 
  Menu, 
  Plus, 
  Check, 
  Upload, 
  RotateCcw,
  Sliders,
  X
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { Link, useNavigate } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const { 
    projects, 
    datasets, 
    activeProject, 
    activeDataset, 
    selectProject, 
    selectDataset, 
    toggleMobileMenu,
    resetWorkspace
  } = useWorkspaceStore();
  const navigate = useNavigate();

  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showDatasetMenu, setShowDatasetMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser] = useState<{ full_name?: string; email?: string }>({
    full_name: 'Aether Analyst',
    email: 'analyst@aether.local'
  });

  const projectRef = useRef<HTMLDivElement>(null);
  const datasetRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false);
      }
      if (datasetRef.current && !datasetRef.current.contains(e.target as Node)) {
        setShowDatasetMenu(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResetSession = () => {
    resetWorkspace();
    setShowUserMenu(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate('/copilot', { state: { initialPrompt: searchQuery } });
    setShowMobileSearch(false);
  };

  return (
    <header className="h-14 bg-white border-b border-[#E2E8F0] sticky top-0 z-40 px-2.5 sm:px-4 md:px-6 flex items-center justify-between min-w-0 w-full">
      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="absolute inset-0 bg-white z-50 px-3 flex items-center space-x-2 md:hidden">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center relative">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or ask Aether AI..."
              className="w-full bg-white border border-[#CBD5E1] rounded-md pl-9 pr-3 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
            />
          </form>
          <button
            type="button"
            onClick={() => setShowMobileSearch(false)}
            className="p-2 rounded-md text-[#64748B] hover:text-[#0F172A] min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Left: Brand & Selectors */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0">
        {/* Mobile menu toggle */}
        <button 
          onClick={toggleMobileMenu}
          className="p-2 -ml-1 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] md:hidden flex-shrink-0 touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
          title="Open Navigation"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand: Logo + Wordmark */}
        <Link 
          to="/overview" 
          className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0 transition-opacity hover:opacity-90"
          title="Aether - Overview"
        >
          <img 
            src="/favicon.svg" 
            alt="Aether" 
            className="w-6 h-6 flex-shrink-0"
            width={24}
            height={24}
          />
          <span className="font-bold text-[#0F172A] text-sm sm:text-base tracking-tight select-none hidden min-[400px]:inline">
            Aether
          </span>
        </Link>

        <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block flex-shrink-0" />

        {/* Project Selector */}
        <div className="relative flex-shrink min-w-0" ref={projectRef}>
          <button
            onClick={() => {
              setShowProjectMenu(!showProjectMenu);
              setShowDatasetMenu(false);
            }}
            className="flex items-center space-x-1 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-xs text-[#0F172A] transition-colors touch-manipulation min-w-0 min-h-[36px]"
            title={activeProject ? activeProject.name : 'Select Project'}
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
            <span className="font-medium max-w-[62px] min-[360px]:max-w-[78px] xs:max-w-[110px] sm:max-w-[140px] md:max-w-[160px] truncate text-left">
              {activeProject ? activeProject.name : 'Project'}
            </span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#94A3B8] flex-shrink-0 transition-transform ${showProjectMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProjectMenu && (
            <div className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-1rem)] bg-white border border-[#E2E8F0] rounded-md shadow-lg p-1.5 z-50">
              <div className="px-2.5 py-1.5 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
                <span className="font-semibold text-[#64748B]">Projects</span>
                <Link
                  to="/projects"
                  onClick={() => setShowProjectMenu(false)}
                  className="text-[#2563EB] hover:underline font-medium flex items-center space-x-1 text-xs py-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </Link>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 scrollbar-thin">
                {projects.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-[#64748B]">
                    No projects found.<br />
                    <Link to="/projects" onClick={() => setShowProjectMenu(false)} className="text-[#2563EB] font-medium mt-1 inline-block py-1">
                      Create Project
                    </Link>
                  </div>
                ) : (
                  projects.map((p) => {
                    const isSelected = activeProject?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          selectProject(p);
                          setShowProjectMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors touch-manipulation ${
                          isSelected 
                            ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' 
                            : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <span className="truncate mr-2">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dataset Selector */}
        <div className="relative flex-shrink min-w-0" ref={datasetRef}>
          <button
            onClick={() => {
              setShowDatasetMenu(!showDatasetMenu);
              setShowProjectMenu(false);
            }}
            className="flex items-center space-x-1 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-1.5 py-1 sm:px-2.5 sm:py-1.5 text-xs text-[#0F172A] transition-colors touch-manipulation min-w-0 min-h-[36px]"
            title={activeDataset ? activeDataset.original_filename : 'Select Dataset'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
            <span className="font-medium max-w-[62px] min-[360px]:max-w-[78px] xs:max-w-[110px] sm:max-w-[140px] md:max-w-[180px] truncate text-left">
              {activeDataset ? activeDataset.original_filename : 'Dataset'}
            </span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#94A3B8] flex-shrink-0 transition-transform ${showDatasetMenu ? 'rotate-180' : ''}`} />
          </button>

          {showDatasetMenu && (
            <div className="absolute left-0 mt-1.5 w-64 sm:w-80 max-w-[calc(100vw-1rem)] bg-white border border-[#E2E8F0] rounded-md shadow-lg p-1.5 z-50">
              <div className="px-2.5 py-1.5 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
                <span className="font-semibold text-[#64748B]">Datasets</span>
                <Link
                  to="/datasets"
                  onClick={() => setShowDatasetMenu(false)}
                  className="text-[#2563EB] hover:underline font-medium flex items-center space-x-1 text-xs py-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload</span>
                </Link>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 space-y-0.5 scrollbar-thin">
                {datasets.length === 0 ? (
                  <div className="px-3 py-3 text-center text-xs text-[#64748B]">
                    No datasets in this project.<br />
                    <Link to="/datasets" onClick={() => setShowDatasetMenu(false)} className="text-[#2563EB] font-medium mt-1 inline-block py-1">
                      Upload Dataset
                    </Link>
                  </div>
                ) : (
                  datasets.map((d) => {
                    const isSelected = activeDataset?.id === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          selectDataset(d);
                          setShowDatasetMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-colors touch-manipulation ${
                          isSelected 
                            ? 'bg-[#EFF6FF] text-[#2563EB] font-medium' 
                            : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate mr-2">
                          <span className="truncate">{d.original_filename}</span>
                          <span className="text-[10px] sm:text-[11px] text-[#64748B] flex-shrink-0">
                            (v{d.current_version_num})
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Search (Desktop/Tablet) */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md mx-2 lg:mx-6 hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or ask Aether AI..."
            className="w-full bg-white border border-[#CBD5E1] rounded-md pl-8 pr-3 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-colors"
          />
        </div>
      </form>

      {/* Right: Mobile Search Button & User Menu */}
      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0" ref={userRef}>
        {/* Mobile Search Icon button */}
        <button
          onClick={() => setShowMobileSearch(true)}
          className="p-2 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] md:hidden touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-1.5 p-1 sm:p-1.5 rounded-md hover:bg-[#F8FAFC] text-xs font-medium text-[#0F172A] transition-colors touch-manipulation min-h-[36px]"
            aria-label="User profile menu"
          >
            <div className="w-7 h-7 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-xs font-semibold text-[#0F172A]">
              {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="hidden lg:inline text-xs text-[#475569]">{currentUser.full_name}</span>
            <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#94A3B8]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-48 sm:w-52 max-w-[calc(100vw-1rem)] bg-white border border-[#E2E8F0] rounded-md shadow-lg p-1.5 z-50 text-xs">
              <div className="px-2.5 py-1.5 border-b border-[#E2E8F0] mb-1">
                <p className="font-semibold text-[#0F172A]">{currentUser?.full_name || 'Analyst'}</p>
                <p className="text-[11px] text-[#64748B] truncate">{currentUser?.email || ''}</p>
              </div>
              <Link 
                to="/settings" 
                onClick={() => setShowUserMenu(false)}
                className="flex items-center space-x-2 px-2.5 py-2.5 rounded-md hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] transition-colors touch-manipulation"
              >
                <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Settings</span>
              </Link>
              <button 
                onClick={handleResetSession}
                className="w-full flex items-center space-x-2 px-2.5 py-2.5 rounded-md hover:bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] transition-colors text-left touch-manipulation"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Reset Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

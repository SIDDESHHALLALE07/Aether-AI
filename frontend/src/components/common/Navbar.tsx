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
  X,
  Sparkles,
  Command,
  Sun,
  Moon
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useThemeStore } from '../../stores/useThemeStore';
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
  const { resolvedTheme, toggleTheme } = useThemeStore();
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
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    <header className="h-14 glass-header border-b border-[#E2E8F0] sticky top-0 z-40 px-2.5 sm:px-4 md:px-6 flex items-center justify-between min-w-0 w-full transition-shadow duration-200 shadow-xs">
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
          className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0 group transition-all"
          title="Aether - Overview"
        >
          <div className="relative flex items-center justify-center">
            <img 
              src="/favicon.svg" 
              alt="Aether" 
              className="w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-105"
              width={24}
              height={24}
            />
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-bold text-[#0F172A] text-sm sm:text-base tracking-tight select-none hidden min-[400px]:inline">
              Aether
            </span>
            <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              Copilot AI
            </span>
          </div>
        </Link>

        <div className="h-4 w-px bg-[#E2E8F0] hidden sm:block flex-shrink-0" />

        {/* Project Selector */}
        <div className="relative flex-shrink min-w-0" ref={projectRef}>
          <button
            onClick={() => {
              setShowProjectMenu(!showProjectMenu);
              setShowDatasetMenu(false);
            }}
            className="flex items-center space-x-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs text-[#0F172A] transition-all hover:border-[#94A3B8] touch-manipulation min-w-0 min-h-[34px] shadow-2xs"
            title={activeProject ? activeProject.name : 'Select Project'}
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />
            <span className="font-medium max-w-[62px] min-[360px]:max-w-[78px] xs:max-w-[110px] sm:max-w-[140px] md:max-w-[160px] truncate text-left">
              {activeProject ? activeProject.name : 'Project'}
            </span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#94A3B8] flex-shrink-0 transition-transform duration-200 ${showProjectMenu ? 'rotate-180' : ''}`} />
          </button>

          {showProjectMenu && (
            <div className="absolute left-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-1rem)] bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-2.5 py-2 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
                <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Projects</span>
                <Link
                  to="/projects"
                  onClick={() => setShowProjectMenu(false)}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center space-x-1 text-xs py-0.5 px-1 rounded hover:bg-blue-50 transition-colors"
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
                            ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' 
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
            className="flex items-center space-x-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs text-[#0F172A] transition-all hover:border-[#94A3B8] touch-manipulation min-w-0 min-h-[34px] shadow-2xs"
            title={activeDataset ? activeDataset.original_filename : 'Select Dataset'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
            <span className="font-medium max-w-[62px] min-[360px]:max-w-[78px] xs:max-w-[110px] sm:max-w-[140px] md:max-w-[180px] truncate text-left">
              {activeDataset ? activeDataset.original_filename : 'Dataset'}
            </span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#94A3B8] flex-shrink-0 transition-transform duration-200 ${showDatasetMenu ? 'rotate-180' : ''}`} />
          </button>

          {showDatasetMenu && (
            <div className="absolute left-0 mt-1.5 w-64 sm:w-80 max-w-[calc(100vw-1rem)] bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-2.5 py-2 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
                <span className="font-semibold text-[#64748B] uppercase tracking-wider text-[10px]">Datasets</span>
                <Link
                  to="/datasets"
                  onClick={() => setShowDatasetMenu(false)}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center space-x-1 text-xs py-0.5 px-1 rounded hover:bg-blue-50 transition-colors"
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
                            ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold' 
                            : 'text-[#0F172A] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate mr-2">
                          <span className="truncate">{d.original_filename}</span>
                          <span className="text-[10px] text-[#64748B] flex-shrink-0 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                            v{d.current_version_num}
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
        <div className="relative group">
          <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[#2563EB] transition-colors" />
          <input 
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets, stats, or ask Aether Copilot..."
            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-lg pl-8 pr-12 py-1.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] transition-all shadow-2xs"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-[10px] font-mono text-[#94A3B8] bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
            <Command className="w-2.5 h-2.5 mr-0.5" />K
          </div>
        </div>
      </form>

      {/* Right: Actions, AI Copilot, User */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0" ref={userRef}>
        {/* Status Indicator */}
        <div className="hidden lg:flex items-center space-x-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-medium text-emerald-800">
          <span className="pulse-dot-green" />
          <span>Engine Online</span>
        </div>

        {/* Quick Copilot Launcher */}
        <Link
          to="/copilot"
          className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 text-xs font-semibold transition-all hover:shadow-2xs touch-manipulation min-h-[34px]"
          title="Open Aether AI Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
          <span>Ask Copilot</span>
        </Link>

        {/* Theme Mode Toggle Pill */}
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs touch-manipulation min-h-[34px] cursor-pointer bg-slate-100/90 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/90 dark:hover:bg-slate-700"
          title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {resolvedTheme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-xs font-semibold">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline text-xs font-semibold">Dark</span>
            </>
          )}
        </button>

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
            className="flex items-center space-x-2 p-1 sm:p-1.5 rounded-lg hover:bg-slate-100/80 text-xs font-medium text-[#0F172A] transition-colors touch-manipulation min-h-[34px]"
            aria-label="User profile menu"
          >
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                {currentUser?.full_name ? currentUser.full_name.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
            </div>
            <span className="hidden lg:inline text-xs font-medium text-[#334155]">{currentUser.full_name}</span>
            <ChevronDown className={`w-3 h-3 text-[#94A3B8] transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-1.5 w-52 max-w-[calc(100vw-1rem)] bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-[#E2E8F0] mb-1">
                <p className="font-semibold text-[#0F172A]">{currentUser?.full_name || 'Analyst'}</p>
                <p className="text-[11px] text-[#64748B] truncate">{currentUser?.email || ''}</p>
              </div>
              <Link 
                to="/settings" 
                onClick={() => setShowUserMenu(false)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#0F172A] transition-colors touch-manipulation"
              >
                <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Settings & Preferences</span>
              </Link>
              <button 
                onClick={() => {
                  toggleTheme();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-[#334155] hover:text-[#0F172A] transition-colors text-left touch-manipulation"
              >
                <div className="flex items-center space-x-2">
                  {resolvedTheme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-[#64748B]" />
                  )}
                  <span>Theme</span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                  {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
                </span>
              </button>
              <button 
                onClick={handleResetSession}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-red-50 text-[#475569] hover:text-red-700 transition-colors text-left touch-manipulation"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
                <span>Reset Workspace State</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

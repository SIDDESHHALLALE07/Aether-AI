import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  FolderKanban, 
  FileSpreadsheet, 
  User as UserIcon, 
  Sparkles,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { useThemeStore } from '../../stores/useThemeStore';

export const Navbar: React.FC = () => {
  const { activeProject, activeDataset, toggleSidebar } = useWorkspaceStore();
  const { theme, setTheme } = useThemeStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="h-16 border-b border-white/10 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-40 px-4 flex items-center justify-between transition-colors">
      {/* Left: Mobile Toggle & Selectors */}
      <div className="flex items-center space-x-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors md:hidden"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand/Logo for top header if needed */}
        <div className="flex items-center space-x-2 mr-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0B0F19] rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="font-bold bg-gradient-to-r from-white via-gray-200 to-indigo-300 bg-clip-text text-transparent hidden sm:inline text-lg tracking-tight">
            Aether Copilot
          </span>
        </div>

        <div className="h-5 w-px bg-white/10 hidden md:block" />

        {/* Project Selector Badge */}
        <div className="hidden md:flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 cursor-pointer transition-colors">
          <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium max-w-[140px] truncate">{activeProject ? activeProject.name : 'Select Project'}</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </div>

        {/* Dataset Selector Badge */}
        <div className="hidden lg:flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 cursor-pointer transition-colors">
          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium max-w-[160px] truncate">{activeDataset ? activeDataset.originalFilename : 'Select Dataset'}</span>
          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
            V{activeDataset?.currentVersionNum || 1}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </div>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Search datasets, patterns, insights or ask copilot..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-white/10 text-gray-400 px-1.5 py-0.5 rounded border border-white/10">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#111827] border border-white/10 rounded-xl shadow-2xl p-4 z-50 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-3">
                <span className="font-semibold text-gray-200">Notifications</span>
                <span className="text-[10px] text-cyan-400 cursor-pointer">Mark all read</span>
              </div>
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <p className="font-medium text-gray-300">Data Profiling Complete</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">customer_churn.csv processed. Quality score: 94/100.</p>
                  <span className="text-[9px] text-gray-500 mt-1 block">2 mins ago</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                  <p className="font-medium text-gray-300">Hidden Pattern Discovered</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Strong correlation (0.82) detected between MonthlyCharges & TotalCharges.</p>
                  <span className="text-[9px] text-gray-500 mt-1 block">15 mins ago</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-semibold text-indigo-300">
              S
            </div>
            <ChevronDown className="w-3 h-3 text-gray-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-white/10 rounded-xl shadow-2xl p-2 z-50 text-xs">
              <div className="px-3 py-2 border-b border-white/10 mb-1">
                <p className="font-semibold text-gray-200">Siddesh H.</p>
                <p className="text-[10px] text-gray-400">siddesh@aether.ai</p>
              </div>
              <a href="/settings" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300">
                <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Account Settings</span>
              </a>
              <a href="/login" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 mt-1">
                <span>Sign Out</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

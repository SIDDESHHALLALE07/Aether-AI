import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  FolderKanban,
  FileSpreadsheet,
  SlidersHorizontal,
  BarChart3,
  PieChart,
  Compass,
  Bot,
  Lightbulb,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface NavGroup {
  category: string;
  items: {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useWorkspaceStore();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const navGroups: NavGroup[] = [
    {
      category: 'WORKSPACE',
      items: [
        { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Workspace', path: '/workspace', icon: MapPin },
        { name: 'Projects', path: '/projects', icon: FolderKanban },
        { name: 'Datasets', path: '/datasets', icon: FileSpreadsheet },
      ],
    },
    {
      category: 'DATA & LAB',
      items: [
        { name: 'Cleaning', path: '/cleaning', icon: SlidersHorizontal },
        { name: 'Analytics', path: '/analytics', icon: BarChart3 },
        { name: 'Visualizations', path: '/visualizations', icon: PieChart },
        { name: 'Patterns', path: '/patterns', icon: Compass },
      ],
    },
    {
      category: 'INTELLIGENCE',
      items: [
        { name: 'Aether AI', path: '/copilot', icon: Bot, badge: 'AI' },
        { name: 'Insights', path: '/insights', icon: Lightbulb },
        { name: 'Reports', path: '/reports', icon: FileText },
      ],
    },
    {
      category: 'PREFERENCES',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (Slide-over on < 768px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-[#E2E8F0] shadow-2xl flex flex-col justify-between transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div className="flex flex-col h-full">
          {/* Mobile Drawer Header */}
          <div className="h-14 px-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <img src="/favicon.svg" alt="Aether Logo" className="w-6 h-6 flex-shrink-0" width={24} height={24} />
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-[#0F172A] text-base tracking-tight">Aether</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">AI</span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Nav Links */}
          <div className="flex-1 py-3 px-3 overflow-y-auto space-y-4 scrollbar-thin">
            {navGroups.map((group) => (
              <div key={group.category} className="space-y-1">
                <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.category}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all touch-manipulation min-h-[40px] ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs border border-blue-100'
                            : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Mobile Drawer Footer info */}
          <div className="p-3.5 border-t border-[#E2E8F0] bg-slate-50/50 text-xs text-[#64748B]">
            <p className="font-semibold text-[#0F172A]">Aether Copilot AI</p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">Statistical & Exploratory Analytics</p>
          </div>
        </div>
      </aside>

      {/* Desktop & Tablet Sidebar (>= 768px) */}
      <aside
        className={`hidden md:flex h-[calc(100vh-3.5rem)] sticky top-14 border-r border-[#E2E8F0] bg-white transition-all duration-200 flex-col justify-between z-30 select-none flex-shrink-0 shadow-2xs ${
          sidebarCollapsed ? 'w-14' : 'w-52 lg:w-56'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="py-3 px-2 overflow-y-auto space-y-4 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.category} className="space-y-0.5">
              {!sidebarCollapsed && (
                <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.category}
                </div>
              )}
              {sidebarCollapsed && (
                <div className="w-full h-px bg-slate-100 my-1" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 touch-manipulation min-h-[36px] group ${
                        isActive
                          ? 'bg-blue-50/90 text-blue-700 font-semibold shadow-2xs border border-blue-200/60'
                          : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-50 border border-transparent'
                      }`
                    }
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className="w-4 h-4 flex-shrink-0 group-hover:scale-105 transition-transform" />
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.name}</span>
                      )}
                    </div>
                    {!sidebarCollapsed && item.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Toggle */}
        <div className="p-2 border-t border-[#E2E8F0] bg-slate-50/30">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition-colors text-xs touch-manipulation min-h-[34px]"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center space-x-2">
                <ChevronLeft className="w-4 h-4" />
                <span className="font-medium text-[11px]">Collapse View</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

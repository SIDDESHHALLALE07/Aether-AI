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

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workspace', path: '/workspace', icon: MapPin },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Datasets', path: '/datasets', icon: FileSpreadsheet },
    { name: 'Cleaning', path: '/cleaning', icon: SlidersHorizontal },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Visualizations', path: '/visualizations', icon: PieChart },
    { name: 'Patterns', path: '/patterns', icon: Compass },
    { name: 'Aether AI', path: '/copilot', icon: Bot },
    { name: 'Insights', path: '/insights', icon: Lightbulb },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer (Slide-over on < 768px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-[#E2E8F0] shadow-xl flex flex-col justify-between transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div className="flex flex-col h-full">
          {/* Mobile Drawer Header */}
          <div className="h-14 px-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <img src="/favicon.svg" alt="Aether Logo" className="w-6 h-6 flex-shrink-0" width={24} height={24} />
              <span className="font-bold text-[#0F172A] text-base tracking-tight">Aether</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Nav Links */}
          <div className="flex-1 py-3 px-3 overflow-y-auto space-y-1 scrollbar-thin">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-3.5 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                      isActive
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold border-l-4 border-[#2563EB]'
                        : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0 mr-3" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Mobile Drawer Footer info */}
          <div className="p-3.5 border-t border-[#E2E8F0] text-xs text-[#64748B]">
            <p className="font-medium text-[#0F172A]">Aether Copilot</p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">Statistical & AI Analytics Platform</p>
          </div>
        </div>
      </aside>

      {/* Desktop & Tablet Sidebar (>= 768px) */}
      <aside
        className={`hidden md:flex h-[calc(100vh-3.5rem)] sticky top-14 border-r border-[#E2E8F0] bg-white transition-all duration-200 flex-col justify-between z-30 select-none flex-shrink-0 ${
          sidebarCollapsed ? 'w-14' : 'w-48 lg:w-56'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="py-3 px-2 overflow-y-auto space-y-0.5 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-md text-xs font-medium transition-colors touch-manipulation min-h-[38px] ${
                    isActive
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                      : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                  }`
                }
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="ml-2.5 truncate">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </div>

        <div className="p-2 border-t border-[#E2E8F0]">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-2 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-xs touch-manipulation min-h-[36px]"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="flex items-center space-x-2">
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

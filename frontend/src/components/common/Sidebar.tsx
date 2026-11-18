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
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';
import { motionTokens } from '../motion/motionTokens';

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
      {/* Mobile Drawer (AnimatePresence for smooth slide & backdrop) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionTokens.duration.quick, ease: motionTokens.ease.out }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: motionTokens.duration.sidebar, ease: motionTokens.ease.out }}
              className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-[#0D111D] border-r border-[#E2E8F0] dark:border-white/10 shadow-2xl flex flex-col justify-between md:hidden"
              aria-label="Mobile Navigation"
            >
              <div className="flex flex-col h-full">
                {/* Mobile Drawer Header */}
                <div className="h-16 px-5 border-b border-[#E2E8F0] dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src="/favicon.svg" alt="Aether Logo" className="w-7 h-7 flex-shrink-0" width={28} height={28} />
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[#0F172A] dark:text-[#F8FAFC] text-lg tracking-tight">Aether</span>
                      <span className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">AI</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Nav Links */}
                <div className="flex-1 py-4 px-3.5 overflow-y-auto space-y-5 scrollbar-thin">
                  {navGroups.map((group) => (
                    <div key={group.category} className="space-y-1.5">
                      <div className="px-3.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
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
                              `relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors touch-manipulation min-h-[46px] ${
                                isActive
                                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold shadow-2xs border border-blue-100 dark:border-blue-800/60'
                                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`
                            }
                          >
                            <div className="flex items-center space-x-3 truncate">
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span className="truncate">{item.name}</span>
                            </div>
                            {item.badge && (
                              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
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
                <div className="p-4 border-t border-[#E2E8F0] dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50 text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                  <p className="font-semibold text-[#0F172A] dark:text-slate-200">Aether Copilot AI</p>
                  <p className="text-xs text-[#94A3B8] dark:text-slate-500 mt-0.5">Statistical & Exploratory Analytics</p>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop & Tablet Sidebar (>= 768px) */}
      <aside
        className={`hidden md:flex h-[calc(100vh-4rem)] sticky top-16 border-r border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#0D111D] transition-all duration-200 flex-col justify-between z-30 select-none flex-shrink-0 shadow-2xs ${
          sidebarCollapsed ? 'w-16' : 'w-60 lg:w-64'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="py-4 px-2.5 overflow-y-auto space-y-5 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              {!sidebarCollapsed && (
                <div className="px-3.5 pt-1.5 pb-1 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {group.category}
                </div>
              )}
              {sidebarCollapsed && (
                <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-1.5" />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 touch-manipulation min-h-[44px] group ${
                        isActive
                          ? 'text-blue-700 dark:text-blue-300 font-semibold'
                          : 'text-[#475569] dark:text-slate-300 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`
                    }
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Aether Glide Active Navigation Indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-pill"
                            className="absolute inset-0 bg-blue-50/90 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-700/50 rounded-xl shadow-2xs z-0"
                            transition={motionTokens.spring.glide}
                          />
                        )}

                        <div className="relative z-10 flex items-center space-x-3 truncate">
                          <Icon className="w-5 h-5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform duration-150" />
                          {!sidebarCollapsed && (
                            <span className="truncate">{item.name}</span>
                          )}
                        </div>
                        {!sidebarCollapsed && item.badge && (
                          <span className="relative z-10 text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Toggle */}
        <div className="p-2.5 border-t border-[#E2E8F0] dark:border-white/10 bg-slate-50/30 dark:bg-slate-900/20">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center py-2 rounded-xl text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs sm:text-sm font-medium touch-manipulation min-h-[40px]"
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <div className="flex items-center space-x-2">
                <ChevronLeft className="w-5 h-5" />
                <span className="font-semibold text-xs sm:text-sm">Collapse View</span>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

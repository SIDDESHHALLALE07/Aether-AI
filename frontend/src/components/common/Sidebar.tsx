import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  FolderKanban,
  FileSpreadsheet,
  Sparkles,
  BarChart3,
  PieChart,
  Compass,
  Bot,
  Lightbulb,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useWorkspaceStore();

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workspace', path: '/workspace', icon: MapPin, highlight: true },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Datasets', path: '/datasets', icon: FileSpreadsheet },
    { name: 'Cleaning', path: '/cleaning', icon: Sparkles },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Visualizations', path: '/visualizations', icon: PieChart },
    { name: 'Patterns', path: '/patterns', icon: Compass },
    { name: 'AI Copilot', path: '/copilot', icon: Bot, badge: 'AI' },
    { name: 'Insights', path: '/insights', icon: Lightbulb },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside 
      className={`h-[calc(100vh-4rem)] sticky top-16 border-r border-white/10 bg-[#0D111D]/90 backdrop-blur-md transition-all duration-300 flex flex-col justify-between z-30 select-none ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="py-4 px-2 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/20 text-white border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${item.highlight ? 'text-cyan-400' : ''}`} />
              
              {!sidebarCollapsed && (
                <span className="ml-3 truncate">{item.name}</span>
              )}

              {!sidebarCollapsed && item.badge && (
                <span className="ml-auto px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold border border-cyan-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Collapse Toggle Button */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center space-x-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

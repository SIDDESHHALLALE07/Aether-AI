import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export const AppLayout: React.FC = () => {
  const { loadProjects } = useWorkspaceStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans overflow-x-hidden w-full">
      <Navbar />
      <div className="flex-1 flex min-w-0 w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 min-h-[calc(100vh-3.5rem)] max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

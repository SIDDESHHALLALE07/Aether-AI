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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col font-sans overflow-x-hidden w-full selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100 transition-colors duration-200">
      <Navbar />
      <div className="flex-1 flex min-w-0 w-full">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-5 md:p-6 min-h-[calc(100vh-3.5rem)] max-w-[1536px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { Loader2 } from 'lucide-react';

const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[55vh] gap-3">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
      Loading view...
    </span>
  </div>
);

// Lazy-loaded route views for optimal code-splitting and performance
const DashboardPage = lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const WorkspacePage = lazy(() => import('../pages/WorkspacePage').then(m => ({ default: m.WorkspacePage })));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const DatasetsPage = lazy(() => import('../pages/DatasetsPage').then(m => ({ default: m.DatasetsPage })));
const DatasetDetailPage = lazy(() => import('../pages/DatasetDetailPage').then(m => ({ default: m.DatasetDetailPage })));
const CleaningPage = lazy(() => import('../pages/CleaningPage').then(m => ({ default: m.CleaningPage })));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const VisualizationsPage = lazy(() => import('../pages/VisualizationsPage').then(m => ({ default: m.VisualizationsPage })));
const PatternsPage = lazy(() => import('../pages/PatternsPage').then(m => ({ default: m.PatternsPage })));
const CopilotPage = lazy(() => import('../pages/CopilotPage').then(m => ({ default: m.CopilotPage })));
const InsightsPage = lazy(() => import('../pages/InsightsPage').then(m => ({ default: m.InsightsPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Main Application Shell - Directly Accessible without Auth */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/overview" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/datasets/:id" element={<DatasetDetailPage />} />
          <Route path="/cleaning" element={<CleaningPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/visualizations" element={<VisualizationsPage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/ai-copilot" element={<CopilotPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Redirect any legacy auth endpoints to main application */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

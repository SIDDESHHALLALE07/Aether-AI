import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { WorkspacePage } from '../pages/WorkspacePage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { DatasetsPage } from '../pages/DatasetsPage';
import { DatasetDetailPage } from '../pages/DatasetDetailPage';
import { CleaningPage } from '../pages/CleaningPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { VisualizationsPage } from '../pages/VisualizationsPage';
import { PatternsPage } from '../pages/PatternsPage';
import { CopilotPage } from '../pages/CopilotPage';
import { InsightsPage } from '../pages/InsightsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Authenticated Application Shell */}
      <Route element={<AppLayout />}>
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
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

import { create } from 'zustand';
import type { Project, Dataset, ChartConfig } from '../types';
import { api } from '../services/api';

interface WorkspaceState {
  projects: Project[];
  datasets: Dataset[];
  activeProject: Project | null;
  activeDataset: Dataset | null;
  activeNodeId: string | null;
  activeChartConfig: ChartConfig | null;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  isLoadingProjects: boolean;
  isLoadingDatasets: boolean;
  error: string | null;

  // Actions
  toggleSidebar: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  setActiveNodeId: (nodeId: string | null) => void;
  setActiveChartConfig: (config: ChartConfig | null) => void;
  loadProjects: () => Promise<Project[]>;
  createProject: (name: string, description?: string) => Promise<Project>;
  selectProject: (project: Project | null) => Promise<void>;
  loadDatasets: (projectId: string) => Promise<Dataset[]>;
  selectDataset: (dataset: Dataset | null) => void;
  uploadDataset: (projectId: string, file: File) => Promise<Dataset>;
  refreshActiveDataset: () => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  deleteDataset: (datasetId: string) => Promise<void>;
  resetWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  datasets: [],
  activeProject: null,
  activeDataset: null,
  activeNodeId: 'node-dataset',
  activeChartConfig: null,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  isLoadingProjects: false,
  isLoadingDatasets: false,
  error: null,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileMenuOpen: (mobileMenuOpen: boolean) => set({ mobileMenuOpen }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  setActiveChartConfig: (activeChartConfig) => set({ activeChartConfig }),

  loadProjects: async () => {
    set({ isLoadingProjects: true, error: null });
    try {
      const projects = await api.getProjects();
      set({ projects, isLoadingProjects: false });

      // If active project is not set and projects exist, auto-select first or restore saved
      const currentActive = get().activeProject;
      if (!currentActive && projects.length > 0) {
        const savedProjectId = localStorage.getItem('aether_active_project_id');
        const found = projects.find(p => p.id === savedProjectId) || projects[0];
        await get().selectProject(found);
      } else if (currentActive) {
        // Refresh active project instance
        const refreshed = projects.find(p => p.id === currentActive.id) || null;
        if (refreshed) {
          set({ activeProject: refreshed });
        } else if (projects.length > 0) {
          await get().selectProject(projects[0]);
        } else {
          set({ activeProject: null, datasets: [], activeDataset: null });
        }
      }
      return projects;
    } catch (err: any) {
      set({ error: err.message || 'Failed to load projects', isLoadingProjects: false });
      return [];
    }
  },

  createProject: async (name: string, description?: string) => {
    set({ isLoadingProjects: true, error: null });
    try {
      const newProject = await api.createProject(name, description);
      const updatedProjects = [...get().projects, newProject];
      set({ projects: updatedProjects, isLoadingProjects: false });
      await get().selectProject(newProject);
      return newProject;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create project', isLoadingProjects: false });
      throw err;
    }
  },

  selectProject: async (project: Project | null) => {
    if (!project) {
      localStorage.removeItem('aether_active_project_id');
      localStorage.removeItem('aether_active_dataset_id');
      set({ activeProject: null, datasets: [], activeDataset: null });
      return;
    }

    localStorage.setItem('aether_active_project_id', project.id);
    set({ activeProject: project, isLoadingDatasets: true, error: null });
    
    try {
      const datasets = await api.getDatasets(project.id);
      set({ datasets, isLoadingDatasets: false });

      // Auto-select first dataset or restore saved for this project
      const savedDatasetId = localStorage.getItem('aether_active_dataset_id');
      const found = datasets.find(d => d.id === savedDatasetId) || datasets[0] || null;
      get().selectDataset(found);
    } catch (err: any) {
      set({ datasets: [], activeDataset: null, isLoadingDatasets: false, error: err.message });
    }
  },

  loadDatasets: async (projectId: string) => {
    set({ isLoadingDatasets: true, error: null });
    try {
      const datasets = await api.getDatasets(projectId);
      set({ datasets, isLoadingDatasets: false });
      return datasets;
    } catch (err: any) {
      set({ error: err.message || 'Failed to load datasets', isLoadingDatasets: false });
      return [];
    }
  },

  selectDataset: (dataset: Dataset | null) => {
    if (dataset) {
      localStorage.setItem('aether_active_dataset_id', dataset.id);
    } else {
      localStorage.removeItem('aether_active_dataset_id');
    }
    set({ activeDataset: dataset });
  },

  uploadDataset: async (projectId: string, file: File) => {
    set({ isLoadingDatasets: true, error: null });
    try {
      const newDataset = await api.uploadDataset(projectId, file);
      const updatedDatasets = [newDataset, ...get().datasets.filter(d => d.id !== newDataset.id)];
      set({ datasets: updatedDatasets, isLoadingDatasets: false });
      get().selectDataset(newDataset);
      return newDataset;
    } catch (err: any) {
      set({ error: err.message || 'Failed to upload dataset', isLoadingDatasets: false });
      throw err;
    }
  },

  refreshActiveDataset: async () => {
    const active = get().activeDataset;
    if (!active) return;
    try {
      const detail = await api.getDataset(active.id);
      if (detail && detail.dataset) {
        const updated = {
          ...detail.dataset,
          latest_version: detail.latest_version
        };
        set({
          activeDataset: updated,
          datasets: get().datasets.map(d => d.id === updated.id ? updated : d)
        });
      }
    } catch {
      // Ignored
    }
  },

  deleteProject: async (projectId: string) => {
    await api.deleteProject(projectId);
    const remaining = get().projects.filter(p => p.id !== projectId);
    set({ projects: remaining });
    if (get().activeProject?.id === projectId) {
      await get().selectProject(remaining[0] || null);
    }
  },

  deleteDataset: async (datasetId: string) => {
    await api.deleteDataset(datasetId);
    const remaining = get().datasets.filter(d => d.id !== datasetId);
    set({ datasets: remaining });
    if (get().activeDataset?.id === datasetId) {
      get().selectDataset(remaining[0] || null);
    }
  },

  resetWorkspace: () => {
    localStorage.removeItem('aether_active_project_id');
    localStorage.removeItem('aether_active_dataset_id');
    set({
      projects: [],
      datasets: [],
      activeProject: null,
      activeDataset: null,
      activeChartConfig: null,
      error: null
    });
  }
}));

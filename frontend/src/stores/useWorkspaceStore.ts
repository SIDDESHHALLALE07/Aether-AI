import { create } from 'zustand';
import type { Project, Dataset } from '../types';

interface WorkspaceState {
  activeProject: Project | null;
  activeDataset: Dataset | null;
  activeNodeId: string | null;
  sidebarCollapsed: boolean;
  projects: Project[];
  datasets: Dataset[];
  setActiveProject: (project: Project | null) => void;
  setActiveDataset: (dataset: Dataset | null) => void;
  setActiveNodeId: (nodeId: string | null) => void;
  toggleSidebar: () => void;
  setProjects: (projects: Project[]) => void;
  setDatasets: (datasets: Dataset[]) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProject: {
    id: 'proj-demo-1',
    userId: 'user-demo-1',
    name: 'Sample E-Commerce Analytics',
    description: 'Customer retention and revenue dataset analysis',
    isArchived: false,
    datasetCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  activeDataset: {
    id: 'ds-demo-1',
    projectId: 'proj-demo-1',
    userId: 'user-demo-1',
    originalFilename: 'customer_churn_analysis.csv',
    storagePath: 'storage/uploads/customer_churn.csv',
    fileType: 'csv',
    fileSizeBytes: 2458900,
    currentVersionNum: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  activeNodeId: 'node-dataset',
  sidebarCollapsed: false,
  projects: [],
  datasets: [],
  setActiveProject: (activeProject) => set({ activeProject }),
  setActiveDataset: (activeDataset) => set({ activeDataset }),
  setActiveNodeId: (activeNodeId) => set({ activeNodeId }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setProjects: (projects) => set({ projects }),
  setDatasets: (datasets) => set({ datasets }),
}));

import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  X, 
  Plus, 
  FolderKanban, 
  Trash2, 
  ArrowRight
} from 'lucide-react';
import { 
  PageTransition, 
  StaggerContainer, 
  StaggerItem, 
  AnimatedCard, 
  ModalTransition,
  NoProjectsIllustration,
  InteractiveButton
} from '../components/motion';

export const ProjectsPage: React.FC = () => {
  const { projects, activeProject, createProject, selectProject, deleteProject, isLoadingProjects } = useWorkspaceStore();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Project name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const newProj = await createProject(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      setIsModalOpen(false);
      await selectProject(newProj);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProject = async (p: any) => {
    await selectProject(p);
    navigate('/datasets');
  };

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this project and its datasets? This cannot be undone.')) {
      await deleteProject(projectId);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-full pb-12 min-w-0">
        {/* Header Banner */}
        <div className="card-base p-5 sm:p-7 bg-gradient-to-r from-white via-white to-blue-50/40 dark:from-[#111827] dark:via-[#111827] dark:to-blue-950/20 border border-[#E2E8F0] dark:border-white/10 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">Project Workspaces</h1>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-bold border border-blue-200 dark:border-blue-800">
                {projects.length} Workspaces
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1.5">
              Organize multi-version datasets, statistical models, and executive analyses
            </p>
          </div>

          <InteractiveButton 
            onClick={() => {
              setIsModalOpen(true);
              setFormError(null);
            }}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs hover:shadow cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </InteractiveButton>
        </div>

        {isLoadingProjects ? (
          <div className="flex flex-col items-center justify-center py-20 card-base">
            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            <span className="mt-3 text-xs sm:text-sm font-medium text-[#64748B] dark:text-slate-400">Loading workspace projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center card-base bg-gradient-to-b from-white to-slate-50 dark:from-[#111827] dark:to-[#0B0F19] rounded-2xl">
            <NoProjectsIllustration className="w-28 h-28 mx-auto mb-3" />
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">No Projects Found</h2>
            <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1.5 max-w-sm mx-auto mb-5">
              Create your first workspace to start uploading and analyzing datasets.
            </p>
            <InteractiveButton 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </InteractiveButton>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 min-w-0">
            {projects.map((p) => {
              const isSelected = activeProject?.id === p.id;
              return (
                <StaggerItem key={p.id}>
                  <AnimatedCard 
                    interactive 
                    lift 
                    onClick={() => handleOpenProject(p)}
                    className={`p-5 sm:p-6 rounded-2xl flex flex-col justify-between min-w-0 border transition-all group ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/15 bg-blue-50/15 dark:bg-blue-950/20' 
                        : 'border-[#E2E8F0] dark:border-white/10 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-2.5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className={`p-2.5 rounded-xl border ${
                            isSelected 
                              ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}>
                            <FolderKanban className="w-4.5 h-4.5" />
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate" title={p.name}>
                            {p.name}
                          </h3>
                        </div>

                        <div className="flex items-center space-x-1.5 flex-shrink-0">
                          {isSelected && (
                            <span className="text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                              Active
                            </span>
                          )}
                          <button 
                            onClick={(e) => handleDelete(e, p.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 min-h-[32px] cursor-pointer"
                            title="Delete project"
                            aria-label="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 line-clamp-2 min-h-[38px] break-words leading-relaxed">
                        {p.description || 'General analytics workspace collection.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/10 flex justify-between items-center text-xs sm:text-sm text-[#64748B] dark:text-slate-400">
                      <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform min-h-[36px]">
                        <span>Open Studio</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </AnimatedCard>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        {/* Create Project Modal */}
        <ModalTransition isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-[#111827] rounded-2xl border border-[#E2E8F0] dark:border-white/10 shadow-2xl p-6 sm:p-7 relative scrollbar-thin">
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center space-x-2.5">
                <FolderKanban className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F8FAFC]">Create New Project</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors touch-manipulation cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q3 Market Segmentation"
                  className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs min-h-[46px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] dark:text-slate-300 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of research goals or data lineage..."
                  className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 border border-[#CBD5E1] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-white/10">
                <InteractiveButton
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2.5 rounded-xl border border-[#CBD5E1] dark:border-white/10 text-[#475569] dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[44px]"
                >
                  Cancel
                </InteractiveButton>
                <InteractiveButton
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center space-x-2 cursor-pointer min-h-[44px]"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Create Workspace</span>
                </InteractiveButton>
              </div>
            </form>
          </div>
        </ModalTransition>
      </div>
    </PageTransition>
  );
};

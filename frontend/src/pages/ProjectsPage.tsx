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
    <div className="space-y-6 max-w-full pb-12 min-w-0">
      {/* Header Banner */}
      <div className="card-base p-4 sm:p-6 bg-gradient-to-r from-white via-white to-blue-50/40 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">Project Workspaces</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {projects.length} Workspaces
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Organize multi-version datasets, statistical models, and executive analyses
          </p>
        </div>

        <button 
          onClick={() => {
            setIsModalOpen(true);
            setFormError(null);
          }}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs hover:shadow touch-manipulation cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {isLoadingProjects ? (
        <div className="flex flex-col items-center justify-center py-20 card-base">
          <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
          <span className="mt-3 text-xs font-medium text-[#64748B]">Loading workspace projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center card-base bg-gradient-to-b from-white to-slate-50">
          <FolderKanban className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
          <h2 className="text-base font-bold text-[#0F172A]">No Projects Found</h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-sm mx-auto mb-5">
            Create your first workspace to start uploading and analyzing datasets.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-xs touch-manipulation"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Project</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {projects.map((p) => {
            const isSelected = activeProject?.id === p.id;
            return (
              <div 
                key={p.id} 
                onClick={() => handleOpenProject(p)}
                className={`p-5 rounded-2xl card-interactive cursor-pointer flex flex-col justify-between min-w-0 border ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-500/15 bg-blue-50/15' 
                    : 'border-[#E2E8F0] hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2.5 gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className={`p-2 rounded-xl border ${
                        isSelected ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-[#0F172A] truncate" title={p.name}>
                        {p.name}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {isSelected && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                          Active
                        </span>
                      )}
                      <button 
                        onClick={(e) => handleDelete(e, p.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748B] line-clamp-2 min-h-[34px] break-words leading-relaxed">
                    {p.description || 'General analytics workspace collection.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-[#64748B]">
                  <span className="font-mono text-[11px] text-slate-400">{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="font-semibold text-blue-600 flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl p-5 sm:p-6 relative scrollbar-thin">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FolderKanban className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#0F172A]">Create New Project</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors touch-manipulation"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#475569] mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q3 Market Segmentation"
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#475569] mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of research goals or data lineage..."
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-[#CBD5E1] rounded-lg px-3.5 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] shadow-2xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-[#475569] hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-5 py-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-xs flex items-center space-x-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
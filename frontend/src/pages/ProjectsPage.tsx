import React, { useState } from 'react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { useNavigate } from 'react-router-dom';
import { Loader2, X, Plus, FolderKanban } from 'lucide-react';

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
    if (window.confirm('Delete this project and its datasets?')) {
      await deleteProject(projectId);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Projects</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Manage workspaces and data analysis collections</p>
        </div>
        <button 
          onClick={() => {
            setIsModalOpen(true);
            setFormError(null);
          }}
          className="w-full sm:w-auto flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-3.5 py-2.5 sm:py-2 rounded-md transition-colors touch-manipulation"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Project</span>
        </button>
      </div>

      {isLoadingProjects ? (
        <div className="flex items-center justify-center py-16 sm:py-20 bg-white border border-[#E2E8F0] rounded-lg">
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-[#2563EB] animate-spin" />
          <span className="ml-2 text-xs text-[#64748B]">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <FolderKanban className="w-8 h-8 text-[#94A3B8] mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-[#64748B]">No projects found.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="mt-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors touch-manipulation"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {projects.map((p) => {
            const isSelected = activeProject?.id === p.id;
            return (
              <div 
                key={p.id} 
                onClick={() => handleOpenProject(p)}
                className={`p-4 rounded-xl bg-white border transition-colors cursor-pointer flex flex-col justify-between min-w-0 ${
                  isSelected ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-sm font-semibold text-[#0F172A] truncate" title={p.name}>
                      {p.name}
                    </h3>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {isSelected && (
                        <span className="text-[10px] sm:text-[11px] text-[#166534] bg-[#DCFCE7] px-1.5 py-0.5 rounded font-medium">
                          Active
                        </span>
                      )}
                      <button 
                        onClick={(e) => handleDelete(e, p.id)}
                        className="text-xs text-[#64748B] hover:text-[#DC2626] transition-colors p-1"
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#64748B] line-clamp-2 min-h-[32px] break-words">
                    {p.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex justify-between items-center text-xs text-[#64748B]">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  <span className="font-medium text-[#2563EB]">Open →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-[#E2E8F0] shadow-2xl p-4 sm:p-5 relative scrollbar-thin">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-[#0F172A]">Create Project</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors touch-manipulation min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 rounded bg-[#FEF2F2] border border-[#FEE2E2] text-[#991B1B] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#475569] mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q3 Customer Analysis"
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#475569] mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this analysis workspace..."
                  className="w-full bg-white border border-[#CBD5E1] rounded-md px-3 py-2.5 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-md border border-[#CBD5E1] text-xs font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors touch-manipulation min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white text-xs font-medium px-4 py-2.5 rounded-md transition-colors touch-manipulation min-h-[40px]"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

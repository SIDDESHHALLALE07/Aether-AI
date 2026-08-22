import React, { useState } from 'react';
import { FolderKanban, Plus, Trash2, Edit2, Calendar } from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const [projects] = useState([
    { id: '1', name: 'Sample E-Commerce Analytics', desc: 'Customer churn and sales dataset analysis', datasets: 3, updated: '2 hours ago' },
    { id: '2', name: 'Healthcare Clinical Trial 2026', desc: 'Patient recovery outcome metrics', datasets: 1, updated: '1 day ago' },
    { id: '3', name: 'Financial Portfolio Performance', desc: 'Stock yield and risk volatility', datasets: 5, updated: '3 days ago' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Management</h1>
          <p className="text-xs text-gray-400 mt-1">Organize datasets, pattern discoveries, and copilot sessions into isolated projects.</p>
        </div>
        <button className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {projects.map((p) => (
          <div key={p.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-indigo-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <div className="flex space-x-1">
                  <button className="p-1 rounded text-gray-400 hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button className="p-1 rounded text-gray-400 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-white">{p.name}</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">{p.desc}</p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-[11px] text-gray-400">
              <span>{p.datasets} Datasets</span>
              <span className="flex items-center space-x-1"><Calendar className="w-3 h-3" /><span>{p.updated}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

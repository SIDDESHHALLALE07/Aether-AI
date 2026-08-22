import React from 'react';
import { MapPin, ZoomIn, ZoomOut, Maximize2, Sparkles } from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

export const WorkspacePage: React.FC = () => {
  const { activeDataset } = useWorkspaceStore();

  const nodes = [
    { id: 'node-ds', label: 'DATASET', status: 'customer_churn.csv (V2)', color: 'border-indigo-500 bg-indigo-500/10' },
    { id: 'node-qual', label: 'DATA QUALITY', status: 'Score: 94/100', color: 'border-cyan-500 bg-cyan-500/10' },
    { id: 'node-clean', label: 'CLEANING', status: '2 Ops Applied', color: 'border-purple-500 bg-purple-500/10' },
    { id: 'node-analy', label: 'ANALYTICS', status: '12 Metrics Active', color: 'border-emerald-500 bg-emerald-500/10' },
    { id: 'node-vis', label: 'VISUALIZATIONS', status: '4 Charts Rendered', color: 'border-amber-500 bg-amber-500/10' },
    { id: 'node-patt', label: 'PATTERNS', status: '3 Correlations Found', color: 'border-rose-500 bg-rose-500/10' },
    { id: 'node-copilot', label: 'AI COPILOT', status: 'Ready for Q&A', color: 'border-indigo-400 bg-indigo-400/10' },
    { id: 'node-report', label: 'REPORTS', status: 'Executive PDF Ready', color: 'border-cyan-400 bg-cyan-400/10' },
  ];

  return (
    <div className="h-[calc(100vh-6rem)] relative flex flex-col rounded-2xl border border-white/10 bg-[#090D16] overflow-hidden">
      {/* Top Canvas Bar */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-[#111827]/80 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">Spatial Data Workspace</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
            {activeDataset?.originalFilename || 'customer_churn.csv'}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Spatial Canvas Body */}
      <div className="flex-1 relative overflow-auto p-8 bg-dot-grid">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 py-10">
          {nodes.map((node) => (
            <div 
              key={node.id} 
              className={`p-4 rounded-xl border ${node.color} backdrop-blur-md hover:scale-105 transition-all cursor-pointer shadow-xl`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-extrabold tracking-widest text-gray-300 uppercase">{node.label}</span>
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <p className="text-xs font-semibold text-white">{node.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

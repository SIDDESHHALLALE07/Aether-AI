import React from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight, Sparkles } from 'lucide-react';

interface NodeContextPanelProps {
  nodeId: string | null;
  nodeData: any;
  onClose: () => void;
}

export const NodeContextPanel: React.FC<NodeContextPanelProps> = ({ nodeId, nodeData, onClose }) => {
  if (!nodeId || !nodeData) return null;

  const getRouteLink = (category: string) => {
    switch (category) {
      case 'dataset': return '/datasets';
      case 'quality': return '/cleaning';
      case 'cleaning': return '/cleaning';
      case 'analytics': return '/analytics';
      case 'visualizations': return '/visualizations';
      case 'patterns': return '/patterns';
      case 'copilot': return '/copilot';
      case 'insights': return '/insights';
      case 'reports': return '/reports';
      default: return '/dashboard';
    }
  };

  return (
    <div className="absolute right-4 top-16 bottom-4 w-96 rounded-2xl bg-[#111827]/95 border border-white/10 backdrop-blur-xl shadow-2xl z-50 flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
      <div>
        {/* Panel Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">{nodeData.label} Node Details</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node Overview Card */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 mb-4">
          <span className="text-[10px] text-gray-400 font-semibold block uppercase">Active Status</span>
          <p className="text-sm font-bold text-white mt-0.5">{nodeData.status}</p>
          {nodeData.metrics && (
            <p className="text-xs text-cyan-300 font-mono mt-1">{nodeData.metrics}</p>
          )}
        </div>

        {/* Quick Context Details */}
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[11px] font-semibold text-gray-300 block mb-1">Canvas Node Position</span>
            <p className="text-xs text-gray-400">Node ID: <code className="text-indigo-300">{nodeId}</code></p>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/5">
            <span className="text-[11px] font-semibold text-gray-300 block mb-1">Associated Dataset</span>
            <p className="text-xs text-gray-400">customer_churn_analysis.csv (V2)</p>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-white/10">
        <Link
          to={getRouteLink(nodeData.category)}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-semibold text-xs py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
        >
          <span>Open Full {nodeData.label} View</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

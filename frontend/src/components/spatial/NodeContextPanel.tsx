import React from 'react';
import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/useWorkspaceStore';

interface NodeContextPanelProps {
  nodeId: string | null;
  nodeData: any;
  onClose: () => void;
}

export const NodeContextPanel: React.FC<NodeContextPanelProps> = ({ nodeId, nodeData, onClose }) => {
  const { activeDataset } = useWorkspaceStore();
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
    <div className="fixed inset-x-3 bottom-3 max-h-[75vh] sm:fixed sm:inset-auto sm:right-4 sm:top-20 sm:bottom-4 sm:w-80 md:w-84 rounded-xl bg-white border border-[#E2E8F0] shadow-xl z-50 flex flex-col justify-between p-4 text-xs overflow-hidden">
      <div className="space-y-3 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
          <span className="font-semibold text-xs text-[#0F172A] uppercase tracking-wider">{nodeData.label}</span>
          <button 
            onClick={onClose}
            className="p-1 rounded text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-colors touch-manipulation"
            aria-label="Close context panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Node Overview */}
        <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
          <span className="text-[10px] text-[#64748B] font-medium uppercase block">Status</span>
          <p className="font-semibold text-[#0F172A] break-words">{nodeData.status}</p>
          {nodeData.metrics && (
            <p className="text-[11px] text-[#64748B]">{nodeData.metrics}</p>
          )}
        </div>

        {/* Dataset */}
        <div className="p-3 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
          <span className="text-[10px] text-[#64748B] font-medium uppercase block">Dataset</span>
          <p className="text-[#0F172A] truncate" title={activeDataset ? `${activeDataset.original_filename} (v${activeDataset.current_version_num})` : 'None'}>
            {activeDataset ? `${activeDataset.original_filename} (v${activeDataset.current_version_num})` : 'None'}
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-[#F1F5F9] mt-3">
        <Link
          to={getRouteLink(nodeData.category)}
          className="w-full flex items-center justify-center space-x-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium text-xs py-2.5 rounded-md transition-colors touch-manipulation"
        >
          <span>Open {nodeData.label}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

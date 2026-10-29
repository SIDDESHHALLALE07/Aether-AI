import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NodeData {
  label: string;
  category: 'dataset' | 'quality' | 'cleaning' | 'analytics' | 'visualizations' | 'patterns' | 'copilot' | 'insights' | 'reports';
  status: string;
  metrics?: string;
  isSelected?: boolean;
}

export const SpatialAnalyticsNode = memo(({ data }: { data: NodeData }) => {
  return (
    <div className={`w-52 rounded-md bg-white border p-3 text-xs transition-colors ${
      data.isSelected 
        ? 'border-[#2563EB] ring-1 ring-[#2563EB]' 
        : 'border-[#CBD5E1] hover:border-[#94A3B8]'
    }`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-2 h-2 bg-[#2563EB] border border-white rounded-full !-top-1" 
      />

      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold tracking-wider uppercase text-[#64748B]">{data.label}</span>
      </div>

      <div>
        <p className="text-xs font-semibold text-[#0F172A] truncate">{data.status}</p>
        {data.metrics && (
          <p className="text-[11px] text-[#64748B] mt-0.5">{data.metrics}</p>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-2 h-2 bg-[#2563EB] border border-white rounded-full !-bottom-1" 
      />
    </div>
  );
});

SpatialAnalyticsNode.displayName = 'SpatialAnalyticsNode';

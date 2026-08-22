import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  Sparkles, 
  BarChart3, 
  PieChart, 
  Compass, 
  Bot, 
  Lightbulb, 
  FileText 
} from 'lucide-react';

interface NodeData {
  label: string;
  category: 'dataset' | 'quality' | 'cleaning' | 'analytics' | 'visualizations' | 'patterns' | 'copilot' | 'insights' | 'reports';
  status: string;
  metrics?: string;
  isSelected?: boolean;
}

const categoryIcons = {
  dataset: FileSpreadsheet,
  quality: ShieldCheck,
  cleaning: Sparkles,
  analytics: BarChart3,
  visualizations: PieChart,
  patterns: Compass,
  copilot: Bot,
  insights: Lightbulb,
  reports: FileText,
};

const categoryColors = {
  dataset: 'border-indigo-500/60 bg-indigo-950/40 text-indigo-400 shadow-indigo-500/20',
  quality: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-400 shadow-cyan-500/20',
  cleaning: 'border-purple-500/60 bg-purple-950/40 text-purple-400 shadow-purple-500/20',
  analytics: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-400 shadow-emerald-500/20',
  visualizations: 'border-amber-500/60 bg-amber-950/40 text-amber-400 shadow-amber-500/20',
  patterns: 'border-rose-500/60 bg-rose-950/40 text-rose-400 shadow-rose-500/20',
  copilot: 'border-indigo-400/60 bg-indigo-900/40 text-indigo-300 shadow-indigo-400/20',
  insights: 'border-amber-400/60 bg-amber-900/40 text-amber-300 shadow-amber-400/20',
  reports: 'border-cyan-400/60 bg-cyan-900/40 text-cyan-300 shadow-cyan-400/20',
};

export const SpatialAnalyticsNode = memo(({ data }: { data: NodeData }) => {
  const Icon = categoryIcons[data.category] || FileSpreadsheet;
  const colorStyle = categoryColors[data.category] || categoryColors.dataset;

  return (
    <div className={`w-56 rounded-2xl border backdrop-blur-xl p-4 shadow-xl transition-all duration-200 ${colorStyle} ${
      data.isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#090D16] scale-105' : 'hover:scale-102'
    }`}>
      {/* Target Connection Handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-indigo-500 border-2 border-[#090D16] rounded-full !-top-1.5" 
      />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-white/10">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-extrabold tracking-wider uppercase text-gray-300">{data.label}</span>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      <div className="mt-2">
        <p className="text-xs font-bold text-white truncate">{data.status}</p>
        {data.metrics && (
          <p className="text-[10px] text-gray-400 mt-1 font-mono">{data.metrics}</p>
        )}
      </div>

      {/* Source Connection Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-cyan-400 border-2 border-[#090D16] rounded-full !-bottom-1.5" 
      />
    </div>
  );
});

SpatialAnalyticsNode.displayName = 'SpatialAnalyticsNode';

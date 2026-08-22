import React, { useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  BackgroundVariant
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SpatialAnalyticsNode } from '../components/spatial/SpatialAnalyticsNode';
import { NodeContextPanel } from '../components/spatial/NodeContextPanel';
import { MapPin, RefreshCw } from 'lucide-react';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';

const nodeTypes = {
  spatialNode: SpatialAnalyticsNode,
};

const initialNodes: Node[] = [
  {
    id: 'node-dataset',
    type: 'spatialNode',
    position: { x: 50, y: 150 },
    data: { label: 'DATASET', category: 'dataset', status: 'customer_churn.csv', metrics: '10,500 rows • 12 cols (V2)' },
  },
  {
    id: 'node-quality',
    type: 'spatialNode',
    position: { x: 340, y: 50 },
    data: { label: 'DATA QUALITY', category: 'quality', status: 'Score: 94 / 100', metrics: 'Completeness: 96% • 0 Dups' },
  },
  {
    id: 'node-cleaning',
    type: 'spatialNode',
    position: { x: 340, y: 250 },
    data: { label: 'CLEANING', category: 'cleaning', status: '2 Ops Applied', metrics: 'Imputed TotalCharges • V1 -> V2' },
  },
  {
    id: 'node-analytics',
    type: 'spatialNode',
    position: { x: 630, y: 150 },
    data: { label: 'ANALYTICS', category: 'analytics', status: '12 Metrics Active', metrics: 'Mean Monthly: $64.76' },
  },
  {
    id: 'node-visualizations',
    type: 'spatialNode',
    position: { x: 920, y: 50 },
    data: { label: 'VISUALIZATIONS', category: 'visualizations', status: '4 Charts Rendered', metrics: 'Scatter • Pie • Histogram' },
  },
  {
    id: 'node-patterns',
    type: 'spatialNode',
    position: { x: 920, y: 250 },
    data: { label: 'PATTERNS', category: 'patterns', status: '3 Patterns Found', metrics: 'Pearson r=0.826 • 3 Anomalies' },
  },
  {
    id: 'node-copilot',
    type: 'spatialNode',
    position: { x: 1210, y: 150 },
    data: { label: 'AI COPILOT', category: 'copilot', status: 'Context Grounded', metrics: 'Gemini 1.5 Flash Active' },
  },
  {
    id: 'node-insights',
    type: 'spatialNode',
    position: { x: 1500, y: 50 },
    data: { label: 'INSIGHTS', category: 'insights', status: '2 Insights Cards', metrics: '92% Confidence Score' },
  },
  {
    id: 'node-reports',
    type: 'spatialNode',
    position: { x: 1500, y: 250 },
    data: { label: 'REPORTS', category: 'reports', status: 'PDF & CSV Ready', metrics: 'Sanitized Formula Protection' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-ds-qual', source: 'node-dataset', target: 'node-quality', animated: true, style: { stroke: '#6366F1' } },
  { id: 'e-ds-clean', source: 'node-dataset', target: 'node-cleaning', animated: true, style: { stroke: '#6366F1' } },
  { id: 'e-qual-analy', source: 'node-quality', target: 'node-analytics', animated: true, style: { stroke: '#06B6D4' } },
  { id: 'e-clean-analy', source: 'node-cleaning', target: 'node-analytics', animated: true, style: { stroke: '#A855F7' } },
  { id: 'e-analy-vis', source: 'node-analytics', target: 'node-visualizations', animated: true, style: { stroke: '#10B981' } },
  { id: 'e-analy-patt', source: 'node-analytics', target: 'node-patterns', animated: true, style: { stroke: '#10B981' } },
  { id: 'e-vis-copilot', source: 'node-visualizations', target: 'node-copilot', animated: true, style: { stroke: '#F59E0B' } },
  { id: 'e-patt-copilot', source: 'node-patterns', target: 'node-copilot', animated: true, style: { stroke: '#F43F5E' } },
  { id: 'e-copilot-ins', source: 'node-copilot', target: 'node-insights', animated: true, style: { stroke: '#818CF8' } },
  { id: 'e-copilot-rep', source: 'node-copilot', target: 'node-reports', animated: true, style: { stroke: '#818CF8' } },
];

export const WorkspacePage: React.FC = () => {
  const { activeDataset } = useWorkspaceStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#6366F1' } }, eds)),
    [setEdges]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedNodeData(node.data);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isSelected: n.id === node.id,
        },
      }))
    );
  };

  return (
    <div className="h-[calc(100vh-6rem)] relative flex flex-col rounded-2xl border border-white/10 bg-[#090D16] overflow-hidden">
      {/* Top Spatial Control Bar */}
      <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between bg-[#111827]/90 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Spatial Data Workspace</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
            {activeDataset?.originalFilename || 'customer_churn_analysis.csv'} (V2)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setNodes(initialNodes)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
            title="Reset Spatial Layout"
          >
            <RefreshCw className="w-3 h-3 text-cyan-400" />
            <span>Reset Layout</span>
          </button>
        </div>
      </div>

      {/* Spatial React Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-[#090D16]"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="rgba(255, 255, 255, 0.08)" />
          <Controls className="!bg-[#111827]/90 !border-white/10 !text-gray-300" />
          <MiniMap 
            nodeColor="#6366F1"
            maskColor="rgba(9, 13, 22, 0.8)"
            className="!bg-[#111827] !border-white/10 !rounded-xl overflow-hidden" 
          />
        </ReactFlow>
      </div>

      {/* Contextual Side Drawer */}
      <NodeContextPanel 
        nodeId={selectedNodeId}
        nodeData={selectedNodeData}
        onClose={() => {
          setSelectedNodeId(null);
          setSelectedNodeData(null);
          setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isSelected: false } })));
        }}
      />
    </div>
  );
};

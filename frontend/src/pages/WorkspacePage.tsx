import React, { useState, useCallback, useEffect } from 'react';
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
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const nodeTypes = {
  spatialNode: SpatialAnalyticsNode,
};

const createInitialNodes = (filename: string, version: number, qualityScore?: number | null, patternsCount = 0): Node[] => [
  {
    id: 'node-dataset',
    type: 'spatialNode',
    position: { x: 50, y: 150 },
    data: { label: 'DATASET', category: 'dataset', status: filename, metrics: `v${version}` },
  },
  {
    id: 'node-quality',
    type: 'spatialNode',
    position: { x: 340, y: 50 },
    data: { 
      label: 'QUALITY', 
      category: 'quality', 
      status: qualityScore !== null && qualityScore !== undefined ? `${qualityScore}/100 Score` : 'Quality Check', 
      metrics: qualityScore !== null && qualityScore !== undefined ? 'Verified' : 'Pending' 
    },
  },
  {
    id: 'node-cleaning',
    type: 'spatialNode',
    position: { x: 340, y: 250 },
    data: { label: 'CLEANING', category: 'cleaning', status: 'Pipeline', metrics: 'Non-Destructive' },
  },
  {
    id: 'node-analytics',
    type: 'spatialNode',
    position: { x: 630, y: 150 },
    data: { label: 'ANALYTICS', category: 'analytics', status: 'Descriptive Stats', metrics: 'Aggregations' },
  },
  {
    id: 'node-visualizations',
    type: 'spatialNode',
    position: { x: 920, y: 50 },
    data: { label: 'VISUALIZATIONS', category: 'visualizations', status: 'Plotly Studio', metrics: 'Multi-Chart' },
  },
  {
    id: 'node-patterns',
    type: 'spatialNode',
    position: { x: 920, y: 250 },
    data: { label: 'PATTERNS', category: 'patterns', status: `${patternsCount} Patterns`, metrics: 'Correlations' },
  },
  {
    id: 'node-copilot',
    type: 'spatialNode',
    position: { x: 1210, y: 150 },
    data: { label: 'AETHER AI', category: 'copilot', status: 'AI Assistant', metrics: 'Evidence Linked' },
  },
  {
    id: 'node-insights',
    type: 'spatialNode',
    position: { x: 1500, y: 50 },
    data: { label: 'INSIGHTS', category: 'insights', status: 'Executive Insights', metrics: 'Actionable' },
  },
  {
    id: 'node-reports',
    type: 'spatialNode',
    position: { x: 1500, y: 250 },
    data: { label: 'REPORTS', category: 'reports', status: 'PDF Report', metrics: 'Ready' },
  },
];

const initialEdges: Edge[] = [
  { id: 'e-ds-qual', source: 'node-dataset', target: 'node-quality', animated: true, style: { stroke: '#2563EB' } },
  { id: 'e-ds-clean', source: 'node-dataset', target: 'node-cleaning', animated: true, style: { stroke: '#2563EB' } },
  { id: 'e-qual-analy', source: 'node-quality', target: 'node-analytics', animated: true, style: { stroke: '#475569' } },
  { id: 'e-clean-analy', source: 'node-cleaning', target: 'node-analytics', animated: true, style: { stroke: '#2563EB' } },
  { id: 'e-analy-vis', source: 'node-analytics', target: 'node-visualizations', animated: true, style: { stroke: '#059669' } },
  { id: 'e-analy-patt', source: 'node-analytics', target: 'node-patterns', animated: true, style: { stroke: '#059669' } },
  { id: 'e-vis-copilot', source: 'node-visualizations', target: 'node-copilot', animated: true, style: { stroke: '#D97706' } },
  { id: 'e-patt-copilot', source: 'node-patterns', target: 'node-copilot', animated: true, style: { stroke: '#DC2626' } },
  { id: 'e-copilot-ins', source: 'node-copilot', target: 'node-insights', animated: true, style: { stroke: '#2563EB' } },
  { id: 'e-copilot-rep', source: 'node-copilot', target: 'node-reports', animated: true, style: { stroke: '#2563EB' } },
];

export const WorkspacePage: React.FC = () => {
  const { activeDataset, datasets } = useWorkspaceStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(
    activeDataset ? createInitialNodes(activeDataset.original_filename, activeDataset.current_version_num, null) : []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  useEffect(() => {
    if (activeDataset) {
      Promise.all([
        api.getDatasetQuality(activeDataset.id).catch(() => null),
        api.getPatterns(activeDataset.id).catch(() => [])
      ]).then(([q, p]) => {
        setNodes(createInitialNodes(
          activeDataset.original_filename, 
          activeDataset.current_version_num, 
          q?.overall_score ?? null,
          p?.length ?? 0
        ));
      });
    }
  }, [activeDataset, setNodes]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#2563EB' } }, eds)),
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

  if (!activeDataset) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-lg sm:text-xl font-semibold text-[#0F172A] tracking-tight">Workspace</h1>
        <div className="p-6 sm:p-8 text-center bg-white border border-[#E2E8F0] rounded-lg">
          <p className="text-xs sm:text-sm text-[#64748B]">
            {datasets.length === 0 ? 'Upload a dataset to view the pipeline workspace.' : 'Select a dataset to view the workspace.'}
          </p>
          <Link 
            to="/datasets"
            className="mt-3 inline-block bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-medium px-4 py-2 rounded-md transition-colors touch-manipulation"
          >
            {datasets.length === 0 ? 'Upload Dataset' : 'Select Dataset'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] sm:h-[calc(100vh-7.5rem)] relative flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden min-w-0">
      {/* Top Bar */}
      <div className="h-12 border-b border-[#E2E8F0] px-3 sm:px-4 flex items-center justify-between bg-white z-10 text-xs">
        <div className="flex items-center space-x-2 min-w-0 mr-2">
          <span className="font-semibold text-[#0F172A] whitespace-nowrap">Canvas:</span>
          <span className="text-[#64748B] truncate" title={activeDataset.original_filename}>
            {activeDataset.original_filename} (v{activeDataset.current_version_num})
          </span>
        </div>

        <button 
          onClick={() => setNodes(createInitialNodes(activeDataset.original_filename, activeDataset.current_version_num))}
          className="px-2.5 py-1 rounded border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap touch-manipulation"
        >
          Reset
        </button>
      </div>

      {/* React Flow Canvas */}
      <div className="flex-1 relative bg-[#F8FAFC]">
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
          className="bg-transparent"
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1} 
            color="#E2E8F0" 
          />
          <Controls className="!bg-white !border-[#E2E8F0] !text-[#0F172A] !rounded-md overflow-hidden hidden sm:flex" />
          <MiniMap 
            nodeColor="#2563EB"
            maskColor="rgba(248, 250, 252, 0.85)"
            className="!bg-white !border-[#E2E8F0] !rounded-md overflow-hidden hidden md:block" 
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

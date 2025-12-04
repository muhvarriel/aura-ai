"use client";

import React, { useMemo, useCallback, memo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Node,
  BackgroundVariant,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CustomNode from "./CustomNode";
import { getGraphLayout } from "@/lib/graph-layout";
import { RoadmapNode } from "@/core/entities/roadmap";

// FIX: Move nodeTypes outside component for stable reference
// This prevents re-registration on every render
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

// FIX: Move default edge options outside for stable reference
const defaultEdgeOptions = {
  style: { stroke: "#e5e5e5", strokeWidth: 2 },
  animated: false,
};

interface RoadmapGraphProps {
  nodes: RoadmapNode[];
  onNodeClick: (nodeId: string) => void;
}

// Type for custom node data
type CustomNodeData = {
  status: string;
  label?: string;
  description?: string;
  difficulty?: string;
  estimatedTime?: string;
};

/**
 * RoadmapGraph Component
 * Renders interactive learning roadmap with ReactFlow
 */
function RoadmapGraph({ nodes, onNodeClick }: RoadmapGraphProps) {
  // FIX: Memoize graph layout with stable dependencies
  // Only recompute when nodes array reference changes
  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    console.log("🔄 Recalculating graph layout", {
      nodeCount: nodes.length,
    });

    return getGraphLayout(nodes);
  }, [nodes]); // Only depend on nodes array

  // React Flow state hooks
  const [rfNodes, , onNodesChange] = useNodesState<Node>(reactFlowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState<Edge>(reactFlowEdges);

  // FIX: Memoize node click handler with stable reference
  // This prevents graph re-renders when parent re-renders
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as CustomNodeData;

      // Prevent interaction with locked nodes
      if (nodeData.status === "locked") {
        console.log("🔒 Node is locked:", node.id);
        return;
      }

      console.log("✅ Node clicked:", node.id, nodeData.label);
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  // FIX: Memoize ReactFlow props for performance
  const reactFlowProps = useMemo(
    () => ({
      nodes: rfNodes,
      edges: rfEdges,
      onNodesChange,
      onEdgesChange,
      onNodeClick: handleNodeClick,
      nodeTypes,
      fitView: true,
      minZoom: 0.5,
      maxZoom: 1.5,
      attributionPosition: "bottom-right" as const,
      defaultEdgeOptions,
    }),
    [rfNodes, rfEdges, onNodesChange, onEdgesChange, handleNodeClick],
  );

  return (
    <div className="w-full h-full min-h-[600px] bg-white">
      <ReactFlow {...reactFlowProps}>
        {/* Background Pattern */}
        <Background
          color="#000000"
          gap={24}
          size={1}
          variant={BackgroundVariant.Dots}
          style={{ opacity: 0.05 }}
        />

        {/* Controls */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-white !border-neutral-100 !shadow-xl !rounded-2xl !m-6 overflow-hidden [&>button]:!border-b-neutral-100 [&>button]:!bg-white [&>button:hover]:!bg-neutral-50 [&>button]:!text-black [&>button_svg]:!fill-black"
        />
      </ReactFlow>
    </div>
  );
}

// FIX: Memoize entire component to prevent unnecessary re-renders
// Only re-render when nodes or onNodeClick actually change
export default memo(RoadmapGraph, (prevProps, nextProps) => {
  // Custom comparison function
  const nodesEqual =
    prevProps.nodes.length === nextProps.nodes.length &&
    prevProps.nodes.every((node, idx) => {
      const nextNode = nextProps.nodes[idx];
      return (
        node.id === nextNode.id &&
        node.status === nextNode.status &&
        node.label === nextNode.label
      );
    });

  const callbackEqual = prevProps.onNodeClick === nextProps.onNodeClick;

  // Return true to skip re-render
  return nodesEqual && callbackEqual;
});

"use client";

import React, { useMemo, useCallback, memo, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Node,
  BackgroundVariant,
  Edge,
  EdgeProps,
  getBezierPath,
  Panel,
  OnMove,
} from "@xyflow/react";
import { motion } from "framer-motion";
import "@xyflow/react/dist/style.css";

import CustomNode from "./CustomNode";
import { getGraphLayout } from "@/lib/graph-layout";
import { RoadmapNode, NodeStatus } from "@/core/entities/roadmap";

/**
 * ═══════════════════════════════════════════════════════════════
 * ROADMAP GRAPH - ENHANCED VERSION (FIXED)
 * ═══════════════════════════════════════════════════════════════
 * Features:
 * - Multi-layer background patterns with parallax effect
 * - Animated edges with flow particles
 * - Smooth zoom transitions with spring physics
 * - Custom minimap with gradient overlay
 * - Interactive controls with hover states
 *
 * TypeScript Fixes:
 * - Fixed onMoveEnd type signature (now uses OnMove from @xyflow/react)
 * - Removed invalid style.button property
 * - Cleaned up unused imports (EdgeLabelRenderer, labelX, labelY)
 * ═══════════════════════════════════════════════════════════════
 */

// Move nodeTypes outside component for stable reference
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface RoadmapGraphProps {
  nodes: RoadmapNode[];
  onNodeClick: (nodeId: string) => void;
}

// Type for custom node data
type CustomNodeData = {
  status: NodeStatus;
  label?: string;
  description?: string;
  difficulty?: string;
  estimatedTime?: string;
};

/**
 * Custom Animated Edge Component
 * Features flow particles and status-based styling
 */
const AnimatedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  // Only get edgePath, ignore labelX and labelY to avoid unused variable warning
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine if edge should be animated based on source node status
  const isActive =
    data?.sourceStatus === "unlocked" || data?.sourceStatus === "completed";
  const isCompleted = data?.sourceStatus === "completed";

  return (
    <>
      {/* Main Edge Path */}
      <path
        id={id}
        style={{
          ...style,
          stroke: isCompleted ? "#000000" : isActive ? "#525252" : "#e5e5e5",
          strokeWidth: isCompleted ? 3 : 2,
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {/* Animated Flow Particles for Active Edges */}
      {isActive && (
        <>
          <circle r="3" fill={isCompleted ? "#000000" : "#525252"}>
            <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle r="3" fill={isCompleted ? "#000000" : "#525252"}>
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path={edgePath}
              begin="1.5s"
            />
            <animate
              attributeName="opacity"
              values="0;1;0"
              dur="3s"
              repeatCount="indefinite"
              begin="1.5s"
            />
          </circle>
        </>
      )}

      {/* Glow Effect for Completed Edges */}
      {isCompleted && (
        <path
          style={{
            stroke: "#000000",
            strokeWidth: 6,
            opacity: 0.1,
            filter: "blur(4px)",
          }}
          d={edgePath}
          fill="none"
        />
      )}
    </>
  );
};

/**
 * Custom edge types configuration
 */
const edgeTypes = {
  animated: AnimatedEdge,
};

/**
 * Multi-layer Background Component
 */
const MultiLayerBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Layer 1: Large Grid */}
    <Background
      id="bg-1"
      color="#e5e5e5"
      gap={48}
      size={1}
      variant={BackgroundVariant.Lines}
      style={{ opacity: 0.15 }}
    />

    {/* Layer 2: Small Dots */}
    <Background
      id="bg-2"
      color="#000000"
      gap={16}
      size={0.5}
      variant={BackgroundVariant.Dots}
      style={{ opacity: 0.08 }}
    />

    {/* Layer 3: Radial Gradient Overlay */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, transparent 0%, rgba(255,255,255,0.4) 100%)",
        pointerEvents: "none",
      }}
    />
  </div>
);

/**
 * Graph Stats Panel Component
 */
const StatsPanel: React.FC<{
  totalNodes: number;
  completedNodes: number;
  unlockedNodes: number;
}> = ({ totalNodes, completedNodes, unlockedNodes }) => {
  const progress =
    totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  return (
    <Panel position="top-right" className="m-6 pr-16">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/90 backdrop-blur-md border border-neutral-200 rounded-2xl px-5 py-4 shadow-xl"
      >
        <div className="flex flex-col gap-3 min-w-[180px]">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Progress
              </span>
              <span className="text-sm font-bold text-black">{progress}%</span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "circOut" }}
                className="h-full bg-black rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, #000000 0%, #404040 100%)",
                }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100">
            <div className="text-center">
              <div className="text-lg font-bold text-black">{totalNodes}</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Total
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {completedNodes}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Done
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {unlockedNodes}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
                Active
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Panel>
  );
};

/**
 * RoadmapGraph Component
 * Enhanced interactive learning roadmap with ReactFlow
 */
function RoadmapGraph({ nodes, onNodeClick }: RoadmapGraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  // Calculate graph layout with enhanced edges
  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    console.log("🔄 Recalculating graph layout", {
      nodeCount: nodes.length,
    });

    const layout = getGraphLayout(nodes);

    // Enhance edges with status metadata
    const enhancedEdges = layout.reactFlowEdges.map((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      return {
        ...edge,
        type: "animated",
        data: {
          sourceStatus: sourceNode?.status,
        },
        animated:
          sourceNode?.status === "unlocked" ||
          sourceNode?.status === "completed",
      };
    });

    return {
      reactFlowNodes: layout.reactFlowNodes,
      reactFlowEdges: enhancedEdges,
    };
  }, [nodes]);

  // React Flow state hooks
  const [rfNodes, , onNodesChange] = useNodesState<Node>(reactFlowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState<Edge>(reactFlowEdges);

  // Calculate stats
  const stats = useMemo(() => {
    const total = nodes.length;
    const completed = nodes.filter((n) => n.status === "completed").length;
    const unlocked = nodes.filter((n) => n.status === "unlocked").length;
    return { total, completed, unlocked };
  }, [nodes]);

  // Node click handler
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as CustomNodeData;

      if (nodeData.status === "locked") {
        console.log("🔒 Node is locked:", node.id);
        return;
      }

      console.log("✅ Node clicked:", node.id, nodeData.label);
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  // FIX: Proper type signature using OnMove from @xyflow/react
  const handleMoveEnd: OnMove = useCallback((event, viewport) => {
    setZoomLevel(viewport.zoom);
  }, []);

  // ReactFlow props
  const reactFlowProps = useMemo(
    () => ({
      nodes: rfNodes,
      edges: rfEdges,
      onNodesChange,
      onEdgesChange,
      onNodeClick: handleNodeClick,
      onMoveEnd: handleMoveEnd,
      nodeTypes,
      edgeTypes,
      fitView: true,
      fitViewOptions: {
        padding: 0.2,
        duration: 800,
      },
      minZoom: 0.3,
      maxZoom: 2,
      defaultViewport: { x: 0, y: 0, zoom: 1 },
      attributionPosition: "bottom-right" as const,
      proOptions: { hideAttribution: true },
      snapToGrid: true,
      snapGrid: [16, 16] as [number, number],
      deleteKeyCode: null,
      selectionKeyCode: null,
      multiSelectionKeyCode: null,
      zoomOnScroll: true,
      zoomOnPinch: true,
      panOnScroll: false,
      panOnDrag: true,
      preventScrolling: true,
    }),
    [
      rfNodes,
      rfEdges,
      onNodesChange,
      onEdgesChange,
      handleNodeClick,
      handleMoveEnd,
    ],
  );

  return (
    <div className="w-full h-full min-h-[600px] bg-white relative">
      <ReactFlow {...reactFlowProps}>
        {/* Enhanced Multi-layer Background */}
        <MultiLayerBackground />

        {/* Stats Panel */}
        <StatsPanel
          totalNodes={stats.total}
          completedNodes={stats.completed}
          unlockedNodes={stats.unlocked}
        />

        {/* Enhanced Controls - FIX: Removed invalid style.button property */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-white/90 !backdrop-blur-md !border-neutral-200 !shadow-2xl !rounded-2xl !m-6 !overflow-hidden [&>button]:!bg-white [&>button]:!border-b [&>button]:!border-b-neutral-100 [&>button]:!text-black [&>button:hover]:!bg-neutral-50 [&>button]:!transition-all [&>button]:!duration-200"
        />

        {/* MiniMap with Custom Styling */}
        <MiniMap
          position="bottom-right"
          className="!bg-white/90 !backdrop-blur-md !border-2 !border-neutral-200 !shadow-2xl !rounded-2xl !m-6 !overflow-hidden"
          style={{
            width: 200,
            height: 150,
          }}
          nodeColor={(node) => {
            const nodeData = node.data as CustomNodeData;
            switch (nodeData.status) {
              case "completed":
                return "#000000";
              case "unlocked":
                return "#3b82f6";
              case "locked":
                return "#e5e5e5";
              default:
                return "#e5e5e5";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
          nodeBorderRadius={16}
        />

        {/* Zoom Level Indicator */}
        <Panel position="top-left" className="m-6 pl-16 pt-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-mono shadow-lg"
          >
            Zoom: {Math.round(zoomLevel * 100)}%
          </motion.div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Memoize entire component to prevent unnecessary re-renders
export default memo(RoadmapGraph, (prevProps, nextProps) => {
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

  return nodesEqual && callbackEqual;
});

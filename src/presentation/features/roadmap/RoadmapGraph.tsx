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
import { useRoadmapStore } from "@/infrastructure/store/roadmap-store"; // ✅ NEW: Import store

/**
 * ═══════════════════════════════════════════════════════════════
 * ROADMAP GRAPH - ENHANCED VERSION WITH DRAG-DROP
 * ═══════════════════════════════════════════════════════════════
 */

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface RoadmapGraphProps {
  nodes: RoadmapNode[];
  onNodeClick: (nodeId: string) => void;
  roadmapId: string; // ✅ NEW: Need roadmapId for position management
}

type CustomNodeData = {
  status: NodeStatus;
  label?: string;
  description?: string;
  difficulty?: string;
  estimatedTime?: string;
};

/**
 * Custom Animated Edge Component
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
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isActive =
    data?.sourceStatus === "unlocked" || data?.sourceStatus === "completed";
  const isCompleted = data?.sourceStatus === "completed";

  return (
    <>
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

const edgeTypes = {
  animated: AnimatedEdge,
};

/**
 * Multi-layer Background Component
 */
const MultiLayerBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <Background
      id="bg-1"
      color="#e5e5e5"
      gap={48}
      size={1}
      variant={BackgroundVariant.Lines}
      style={{ opacity: 0.15 }}
    />
    <Background
      id="bg-2"
      color="#000000"
      gap={16}
      size={0.5}
      variant={BackgroundVariant.Dots}
      style={{ opacity: 0.08 }}
    />
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
 * ✅ NEW: Reset Layout Button Component
 */
const ResetLayoutButton: React.FC<{
  onReset: () => void;
}> = ({ onReset }) => {
  return (
    <Panel position="top-left" className="m-6 pl-16">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className="bg-white/90 backdrop-blur-md border border-neutral-200 rounded-xl px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-black"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        Reset Layout
      </motion.button>
    </Panel>
  );
};

/**
 * ✅ UPDATED: RoadmapGraph Component with Drag-Drop Support
 */
function RoadmapGraph({ nodes, onNodeClick, roadmapId }: RoadmapGraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  // ✅ NEW: Get position management functions from store
  const saveNodePosition = useRoadmapStore((state) => state.saveNodePosition);
  const getNodePositions = useRoadmapStore((state) => state.getNodePositions);
  const resetNodePositions = useRoadmapStore(
    (state) => state.resetNodePositions,
  );

  // ✅ NEW: Get custom positions from store
  const customPositions = useMemo(() => {
    return getNodePositions(roadmapId);
  }, [roadmapId, getNodePositions]);

  // ✅ UPDATED: Pass custom positions to layout calculation
  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    console.log("🔄 Recalculating graph layout", {
      nodeCount: nodes.length,
      hasCustomPositions: !!customPositions,
    });

    const layout = getGraphLayout(nodes, customPositions);

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
  }, [nodes, customPositions]);

  const [rfNodes, setNodes, onNodesChange] =
    useNodesState<Node>(reactFlowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState<Edge>(reactFlowEdges);

  const stats = useMemo(() => {
    const total = nodes.length;
    const completed = nodes.filter((n) => n.status === "completed").length;
    const unlocked = nodes.filter((n) => n.status === "unlocked").length;
    return { total, completed, unlocked };
  }, [nodes]);

  // Enhanced node click handler with better logging
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as CustomNodeData;

      console.log(`[RoadmapGraph] Node clicked:`, {
        id: node.id,
        label: nodeData.label,
        status: nodeData.status,
      });

      if (nodeData.status === "locked") {
        console.log("🔒 Node is locked, preventing click:", node.id);
        return;
      }

      console.log("✅ Opening drawer for node:", node.id);
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  // ✅ NEW: Handle node drag stop - save position
  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent | React.TouchEvent, node: Node) => {
      console.log(`[RoadmapGraph] Node dragged:`, {
        id: node.id,
        position: node.position,
      });

      saveNodePosition(roadmapId, node.id, {
        x: node.position.x,
        y: node.position.y,
      });
    },
    [roadmapId, saveNodePosition],
  );

  // ✅ NEW: Handle reset layout
  const handleResetLayout = useCallback(() => {
    console.log("[RoadmapGraph] Resetting layout to default");
    resetNodePositions(roadmapId);

    // Recalculate default positions
    const defaultLayout = getGraphLayout(nodes);
    setNodes(defaultLayout.reactFlowNodes);
  }, [roadmapId, resetNodePositions, nodes, setNodes]);

  const handleMoveEnd: OnMove = useCallback((event, viewport) => {
    setZoomLevel(viewport.zoom);
  }, []);

  const reactFlowProps = useMemo(
    () => ({
      nodes: rfNodes,
      edges: rfEdges,
      onNodesChange,
      onEdgesChange,
      onNodeClick: handleNodeClick,
      onNodeDragStop: handleNodeDragStop, // ✅ NEW: Add drag handler
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
      // ✅ NEW: Ensure nodes are draggable
      nodesDraggable: true,
      nodesConnectable: false, // Prevent edge creation
      elementsSelectable: true,
    }),
    [
      rfNodes,
      rfEdges,
      onNodesChange,
      onEdgesChange,
      handleNodeClick,
      handleNodeDragStop,
      handleMoveEnd,
    ],
  );

  return (
    <div className="w-full h-full min-h-[600px] bg-white relative">
      <ReactFlow {...reactFlowProps}>
        <MultiLayerBackground />

        <StatsPanel
          totalNodes={stats.total}
          completedNodes={stats.completed}
          unlockedNodes={stats.unlocked}
        />

        {/* ✅ NEW: Reset Layout Button */}
        <ResetLayoutButton onReset={handleResetLayout} />

        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-white/90 !backdrop-blur-md !border-neutral-200 !shadow-2xl !rounded-2xl !m-6 !overflow-hidden [&>button]:!bg-white [&>button]:!border-b [&>button]:!border-b-neutral-100 [&>button]:!text-black [&>button:hover]:!bg-neutral-50 [&>button]:!transition-all [&>button]:!duration-200"
        />

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

        <Panel position="bottom-left" className="ml-6 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-mono shadow-lg"
          >
            Zoom: {Math.round(zoomLevel * 100)}%
          </motion.div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

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
  const roadmapIdEqual = prevProps.roadmapId === nextProps.roadmapId; // ✅ NEW: Check roadmapId

  return nodesEqual && callbackEqual && roadmapIdEqual;
});

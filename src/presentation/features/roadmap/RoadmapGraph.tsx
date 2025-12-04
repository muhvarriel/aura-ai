"use client";

import React, { useMemo, useCallback, useState, useEffect } from "react";
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
import { RoadmapNode, RoadmapEdge, NodeStatus } from "@/core/entities/roadmap";
import {
  useRoadmapStore,
  selectStateVersion,
} from "@/infrastructure/store/roadmap-store";

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface RoadmapGraphProps {
  nodes: RoadmapNode[];
  edges?: RoadmapEdge[];
  onNodeClick: (nodeId: string) => void;
  roadmapId: string;
}

type CustomNodeData = {
  status: NodeStatus;
  label?: string;
  description?: string;
  difficulty?: string;
  estimatedTime?: string;
};

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
          stroke: isCompleted ? "#10b981" : isActive ? "#3b82f6" : "#d1d5db",
          strokeWidth: isCompleted ? 3 : isActive ? 3 : 2,
          transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />

      {isActive && (
        <>
          <circle
            r="4"
            fill={isCompleted ? "#10b981" : "#3b82f6"}
            opacity="0.8"
          >
            <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
            <animate
              attributeName="opacity"
              values="0;0.8;0"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            r="4"
            fill={isCompleted ? "#10b981" : "#3b82f6"}
            opacity="0.8"
          >
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              path={edgePath}
              begin="1.5s"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0"
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
            stroke: "#10b981",
            strokeWidth: 8,
            opacity: 0.15,
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

const MultiLayerBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <Background
      id="bg-dots"
      color="#d1d5db"
      gap={24}
      size={0.8}
      variant={BackgroundVariant.Dots}
      style={{ opacity: 0.25 }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, transparent 0%, rgba(255,255,255,0.5) 100%)",
        pointerEvents: "none",
      }}
    />
  </div>
);

const ResetLayoutButton: React.FC<{
  onReset: () => void;
}> = ({ onReset }) => {
  return (
    <Panel position="top-left" className="m-6 pl-20 pt-3">
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className="bg-white/95 backdrop-blur-xl border-2 border-neutral-200 rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-black hover:border-black"
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

function RoadmapGraph({
  nodes,
  edges = [],
  onNodeClick,
  roadmapId,
}: RoadmapGraphProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const stateVersion = useRoadmapStore(selectStateVersion);

  const saveNodePosition = useRoadmapStore((state) => state.saveNodePosition);
  const getNodePositions = useRoadmapStore((state) => state.getNodePositions);
  const resetNodePositions = useRoadmapStore(
    (state) => state.resetNodePositions,
  );

  useEffect(() => {
    console.log(`[RoadmapGraph] 🔄 State version changed: ${stateVersion}`);
  }, [stateVersion]);

  const customPositions = useMemo(() => {
    return getNodePositions(roadmapId);
  }, [roadmapId, getNodePositions]);

  const nodeStatusSignature = useMemo(() => {
    return nodes.map((n) => `${n.id}:${n.status}`).join("|");
  }, [nodes]);

  const { reactFlowNodes, reactFlowEdges } = useMemo(() => {
    console.log("🔄 [RoadmapGraph] Recalculating graph layout", {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      hasCustomPositions: !!customPositions,
      stateVersion,
      nodeStatusSignature: nodeStatusSignature.substring(0, 50) + "...",
    });

    const layout = getGraphLayout(nodes, edges, customPositions);

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
  }, [nodes, edges, customPositions, stateVersion, nodeStatusSignature]);

  const [rfNodes, setNodes, onNodesChange] =
    useNodesState<Node>(reactFlowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState<Edge>(reactFlowEdges);

  useEffect(() => {
    console.log("[RoadmapGraph] 🔄 Updating React Flow nodes", {
      count: reactFlowNodes.length,
      stateVersion,
    });
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes, stateVersion]);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const nodeData = node.data as CustomNodeData;

      console.log(`[RoadmapGraph] 🖱️ Node clicked:`, {
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

  const handleNodeDragStop = useCallback(
    (event: React.MouseEvent | React.TouchEvent, node: Node) => {
      console.log(`[RoadmapGraph] 📍 Node dragged:`, {
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

  const handleResetLayout = useCallback(() => {
    console.log("[RoadmapGraph] 🔄 Resetting layout to default");
    resetNodePositions(roadmapId);

    const defaultLayout = getGraphLayout(nodes, edges);
    setNodes(defaultLayout.reactFlowNodes);
  }, [roadmapId, resetNodePositions, nodes, edges, setNodes]);

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
      onNodeDragStop: handleNodeDragStop,
      onMoveEnd: handleMoveEnd,
      nodeTypes,
      edgeTypes,
      fitView: true,
      fitViewOptions: {
        padding: 0.25,
        duration: 800,
      },
      minZoom: 0.25,
      maxZoom: 1.8,
      defaultViewport: { x: 0, y: 0, zoom: 1 },
      attributionPosition: "bottom-right" as const,
      proOptions: { hideAttribution: true },
      snapToGrid: true,
      snapGrid: [20, 20] as [number, number],
      deleteKeyCode: null,
      selectionKeyCode: null,
      multiSelectionKeyCode: null,
      zoomOnScroll: true,
      zoomOnPinch: true,
      panOnScroll: false,
      panOnDrag: true,
      preventScrolling: true,
      nodesDraggable: true,
      nodesConnectable: false,
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
    <div className="w-full h-full min-h-[600px] bg-gradient-to-br from-neutral-50 to-white relative">
      <ReactFlow {...reactFlowProps}>
        <MultiLayerBackground />

        <ResetLayoutButton onReset={handleResetLayout} />

        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-white/95 !backdrop-blur-xl !border-2 !border-neutral-200 !shadow-2xl !rounded-2xl !m-6 !overflow-hidden [&>button]:!bg-white [&>button]:!border-b-2 [&>button]:!border-b-neutral-100 [&>button]:!text-black [&>button:hover]:!bg-neutral-50 [&>button]:!transition-all [&>button]:!duration-200 [&>button]:!font-semibold"
        />

        <MiniMap
          position="bottom-right"
          className="!bg-white/95 !backdrop-blur-xl !border-2 !border-neutral-200 !shadow-2xl !rounded-2xl !m-6 !overflow-hidden"
          style={{
            width: 220,
            height: 160,
          }}
          nodeColor={(node) => {
            const nodeData = node.data as CustomNodeData;
            switch (nodeData.status) {
              case "completed":
                return "#10b981";
              case "unlocked":
                return "#3b82f6";
              case "locked":
                return "#d1d5db";
              default:
                return "#d1d5db";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
          nodeBorderRadius={20}
        />

        <Panel position="bottom-left" className="ml-6 mb-28 pl-16 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-mono shadow-xl"
          >
            Zoom: {Math.round(zoomLevel * 100)}%
          </motion.div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default RoadmapGraph;

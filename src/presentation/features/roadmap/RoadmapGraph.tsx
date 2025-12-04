"use client";

import React, { useMemo, useCallback } from "react";
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

// Daftarkan tipe node custom kita
const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface RoadmapGraphProps {
  nodes: RoadmapNode[];
  onNodeClick: (nodeId: string) => void;
}

// Tipe data internal node (harus match dengan CustomNode.tsx)
type CustomNodeData = {
  status: string;
  [key: string]: unknown;
};

export default function RoadmapGraph({
  nodes,
  onNodeClick,
}: RoadmapGraphProps) {
  // Hitung layout awal
  const { reactFlowNodes, reactFlowEdges } = useMemo(
    () => getGraphLayout(nodes, onNodeClick),
    [nodes, onNodeClick],
  );

  // React Flow state hooks
  // Kita menggunakan generics <Node> dan <Edge> untuk memastikan tipe data valid
  const [rfNodes, , onNodesChange] = useNodesState<Node>(reactFlowNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState<Edge>(reactFlowEdges);

  // Handle klik pada node (Strict Typing)
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Casting data ke tipe spesifik kita untuk akses properti status
      const nodeData = node.data as CustomNodeData;

      // Jika status locked, jangan lakukan apa-apa
      if (nodeData.status === "locked") return;

      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  return (
    // Container: Full White, No Borders (Infinity Canvas Feel)
    <div className="w-full h-full min-h-[600px] bg-white">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
        attributionPosition="bottom-right"
        // Default styling untuk edge (kabel penghubung)
        defaultEdgeOptions={{
          style: { stroke: "#e5e5e5", strokeWidth: 2 }, // Abu-abu halus default
          animated: false,
        }}
      >
        {/* 
            Aura Background:
            Titik hitam (black) dengan opasitas 5% di atas latar putih.
            Memberikan tekstur kertas/editorial.
        */}
        <Background
          color="#000000"
          gap={24}
          size={1}
          variant={BackgroundVariant.Dots}
          style={{ opacity: 0.05 }}
        />

        {/* 
            Aura Controls:
            Tombol minimalis di pojok kiri bawah.
            Override class default ReactFlow agar sesuai tema.
        */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="!bg-white !border-neutral-100 !shadow-xl !rounded-2xl !m-6 overflow-hidden [&>button]:!border-b-neutral-100 [&>button]:!bg-white [&>button:hover]:!bg-neutral-50 [&>button]:!text-black [&>button_svg]:!fill-black"
        />
      </ReactFlow>
    </div>
  );
}

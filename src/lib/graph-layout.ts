import { Node, Edge } from "@xyflow/react";
import {
  RoadmapNode,
  RoadmapEdge,
  NodeStatus,
  getChildNodeIds,
} from "@/core/entities/roadmap";

const NODE_WIDTH = 220;
const X_GAP = 150;
const Y_GAP = 280;
const HORIZONTAL_STAGGER = 60;

interface NodeLevel {
  id: string;
  level: number;
}

interface LayoutResult {
  reactFlowNodes: Node[];
  reactFlowEdges: Edge[];
}

interface NodePosition {
  x: number;
  y: number;
}

export interface CustomNodePosition {
  x: number;
  y: number;
}

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  description?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime?: string;
}

function getEdgeStyle(status: NodeStatus): {
  stroke: string;
  strokeWidth: number;
  animated: boolean;
} {
  switch (status) {
    case "completed":
      return {
        stroke: "#10b981",
        strokeWidth: 3,
        animated: true,
      };
    case "unlocked":
      return {
        stroke: "#3b82f6",
        strokeWidth: 3,
        animated: false,
      };
    case "locked":
    default:
      return {
        stroke: "#d1d5db",
        strokeWidth: 2,
        animated: false,
      };
  }
}

function calculateNodeLevels(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[],
): {
  nodeLevels: Map<string, number>;
  levelCounts: Map<number, number>;
  maxLevel: number;
} {
  const nodeLevels = new Map<string, number>();
  const levelCounts = new Map<number, number>();
  let maxLevel = 0;

  if (nodes.length === 0) {
    return { nodeLevels, levelCounts, maxLevel };
  }

  const nodeMap = new Map<string, RoadmapNode>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  const rootNode = nodes.find((n) => !n.parentId) || nodes[0];

  const queue: NodeLevel[] = [{ id: rootNode.id, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const { id, level } = current;

    if (visited.has(id)) continue;
    visited.add(id);

    nodeLevels.set(id, level);
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    maxLevel = Math.max(maxLevel, level);

    let childIds: string[];

    if (edges.length > 0) {
      childIds = getChildNodeIds(id, edges);
    } else {
      const node = nodeMap.get(id);
      childIds = node?.childrenIds || [];
    }

    childIds.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  console.log(
    `[Graph Layout] 📐 Calculated levels for ${visited.size} nodes, max level: ${maxLevel}`,
  );

  return { nodeLevels, levelCounts, maxLevel };
}

function calculateNodePosition(
  level: number,
  indexInLevel: number,
  totalInLevel: number,
): NodePosition {
  const totalWidth = totalInLevel * (NODE_WIDTH + X_GAP);
  const startX = -(totalWidth / 2);

  const staggerOffset =
    indexInLevel % 2 === 0 ? HORIZONTAL_STAGGER : -HORIZONTAL_STAGGER / 2;

  const extraTopPadding = level === 0 ? 50 : 0;

  return {
    x:
      startX +
      indexInLevel * (NODE_WIDTH + X_GAP) +
      NODE_WIDTH / 2 +
      staggerOffset,
    y: level * Y_GAP + 120 + extraTopPadding,
  };
}

function createEdges(nodes: RoadmapNode[], edges: RoadmapEdge[]): Edge[] {
  const reactFlowEdges: Edge[] = [];

  if (edges.length > 0) {
    const nodeMap = new Map<string, RoadmapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) {
        console.warn(`[Graph Layout] ⚠️ Source node not found: ${edge.source}`);
        return;
      }

      const edgeStyle = getEdgeStyle(sourceNode.status);

      reactFlowEdges.push({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edgeStyle.animated,
        style: {
          stroke: edgeStyle.stroke,
          strokeWidth: edgeStyle.strokeWidth,
        },
        type: "smoothstep",
      });
    });
  } else {
    console.warn(
      "[Graph Layout] ⚠️ No edges found, using childrenIds (deprecated)",
    );

    nodes.forEach((node) => {
      const childIds = node.childrenIds || [];
      if (childIds.length === 0) return;

      const edgeStyle = getEdgeStyle(node.status);

      childIds.forEach((childId) => {
        reactFlowEdges.push({
          id: `e-${node.id}-${childId}`,
          source: node.id,
          target: childId,
          animated: edgeStyle.animated,
          style: {
            stroke: edgeStyle.stroke,
            strokeWidth: edgeStyle.strokeWidth,
          },
          type: "smoothstep",
        });
      });
    });
  }

  console.log(`[Graph Layout] 🔗 Created ${reactFlowEdges.length} edges`);
  return reactFlowEdges;
}

function createNodes(
  nodes: RoadmapNode[],
  nodeLevels: Map<string, number>,
  levelCounts: Map<number, number>,
  customPositions?: Record<string, CustomNodePosition>,
): Node<GraphNodeData>[] {
  const reactFlowNodes: Node<GraphNodeData>[] = [];
  const currentLevelCount = new Map<number, number>();

  nodes.forEach((node) => {
    const level = nodeLevels.get(node.id) ?? 0;
    const indexInLevel = currentLevelCount.get(level) ?? 0;
    currentLevelCount.set(level, indexInLevel + 1);

    const totalInThisLevel = levelCounts.get(level) ?? 1;
    const defaultPosition = calculateNodePosition(
      level,
      indexInLevel,
      totalInThisLevel,
    );

    const position = customPositions?.[node.id] ?? defaultPosition;

    reactFlowNodes.push({
      id: node.id,
      type: "custom",
      position,
      data: {
        label: node.label,
        status: node.status,
        description: node.description,
        difficulty: node.difficulty,
        estimatedTime: node.estimatedTime,
      },
      draggable: true,
    });
  });

  return reactFlowNodes;
}

export function getGraphLayout(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[] = [],
  customPositions?: Record<string, CustomNodePosition>,
): LayoutResult {
  if (nodes.length === 0) {
    return {
      reactFlowNodes: [],
      reactFlowEdges: [],
    };
  }

  console.log(
    `[Graph Layout] 🎨 Processing ${nodes.length} nodes with ${edges.length} edges`,
  );

  const { nodeLevels, levelCounts } = calculateNodeLevels(nodes, edges);

  const reactFlowNodes = createNodes(
    nodes,
    nodeLevels,
    levelCounts,
    customPositions,
  );

  const reactFlowEdges = createEdges(nodes, edges);

  return {
    reactFlowNodes,
    reactFlowEdges,
  };
}

export function getGraphStats(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[] = [],
): {
  totalNodes: number;
  totalEdges: number;
  maxDepth: number;
  completedNodes: number;
  unlockedNodes: number;
  lockedNodes: number;
} {
  const { maxLevel } = calculateNodeLevels(nodes, edges);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    maxDepth: maxLevel,
    completedNodes: nodes.filter((n) => n.status === "completed").length,
    unlockedNodes: nodes.filter((n) => n.status === "unlocked").length,
    lockedNodes: nodes.filter((n) => n.status === "locked").length,
  };
}

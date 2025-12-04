import { Node, Edge } from "@xyflow/react";
import {
  RoadmapNode,
  RoadmapEdge,
  NodeStatus,
  getChildNodeIds,
} from "@/core/entities/roadmap";

// --- LAYOUT CONSTANTS ---
const NODE_WIDTH = 250;
const X_GAP = 120;
const Y_GAP = 200;
const HORIZONTAL_STAGGER = 40;

// --- TYPE DEFINITIONS ---
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

// Custom position override type
export interface CustomNodePosition {
  x: number;
  y: number;
}

// Custom node data type
export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  status: NodeStatus;
  description?: string;
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime?: string;
}

/**
 * Get edge style based on source node status
 */
function getEdgeStyle(status: NodeStatus): {
  stroke: string;
  strokeWidth: number;
  animated: boolean;
} {
  switch (status) {
    case "completed":
      return {
        stroke: "#000000", // Black for completed
        strokeWidth: 2,
        animated: true,
      };
    case "unlocked":
      return {
        stroke: "#3b82f6", // Blue for unlocked
        strokeWidth: 2,
        animated: false,
      };
    case "locked":
    default:
      return {
        stroke: "#e5e7eb", // Light gray for locked
        strokeWidth: 2,
        animated: false,
      };
  }
}

/**
 * ✅ FIX: Calculate node levels using BFS traversal with edges
 * Supports backward compatibility with childrenIds
 */
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

  // Build node map for fast lookups
  const nodeMap = new Map<string, RoadmapNode>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  // Find root (node without parent or first node)
  const rootNode = nodes.find((n) => !n.parentId) || nodes[0];

  // BFS queue
  const queue: NodeLevel[] = [{ id: rootNode.id, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    const { id, level } = current;

    // Skip if already processed (prevents cycles)
    if (visited.has(id)) continue;
    visited.add(id);

    // Record level
    nodeLevels.set(id, level);
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    maxLevel = Math.max(maxLevel, level);

    // ✅ FIX: Get children using edges (with backward compatibility)
    let childIds: string[];

    if (edges.length > 0) {
      // Use edges (new approach)
      childIds = getChildNodeIds(id, edges);
    } else {
      // ✅ Backward compatibility: Use childrenIds if edges not available
      const node = nodeMap.get(id);
      childIds = node?.childrenIds || [];
    }

    // Add children to queue
    childIds.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  console.log(
    `[Graph Layout] Calculated levels for ${visited.size} nodes, max level: ${maxLevel}`,
  );

  return { nodeLevels, levelCounts, maxLevel };
}

/**
 * Calculate node position with natural stagger effect
 */
function calculateNodePosition(
  level: number,
  indexInLevel: number,
  totalInLevel: number,
): NodePosition {
  // Calculate total width needed for this level
  const totalWidth = totalInLevel * (NODE_WIDTH + X_GAP);
  const startX = -(totalWidth / 2);

  // Add subtle horizontal stagger for more organic look
  const staggerOffset =
    indexInLevel % 2 === 0 ? HORIZONTAL_STAGGER : -HORIZONTAL_STAGGER / 2;

  return {
    x:
      startX +
      indexInLevel * (NODE_WIDTH + X_GAP) +
      NODE_WIDTH / 2 +
      staggerOffset,
    y: level * Y_GAP + 100,
  };
}

/**
 * ✅ FIX: Create ReactFlow edges from edges array
 * Supports backward compatibility with childrenIds
 */
function createEdges(nodes: RoadmapNode[], edges: RoadmapEdge[]): Edge[] {
  const reactFlowEdges: Edge[] = [];

  if (edges.length > 0) {
    // ✅ Use edges array (new approach)
    const nodeMap = new Map<string, RoadmapNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source);
      if (!sourceNode) {
        console.warn(`[Graph Layout] Source node not found: ${edge.source}`);
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
    // ✅ Backward compatibility: Build edges from childrenIds
    console.warn(
      "[Graph Layout] No edges found, using childrenIds (deprecated)",
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

  console.log(`[Graph Layout] Created ${reactFlowEdges.length} edges`);
  return reactFlowEdges;
}

/**
 * Create ReactFlow nodes with calculated positions and custom overrides
 */
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

    // Use custom position if available, otherwise use calculated
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

/**
 * ✅ UPDATED: Main function with edges parameter
 *
 * Algorithm: Vertical Tree Layout with BFS + Custom Position Override
 * Time Complexity: O(n) where n = number of nodes
 * Space Complexity: O(n)
 *
 * @param nodes - Array of roadmap nodes
 * @param edges - Array of roadmap edges (optional for backward compatibility)
 * @param customPositions - Optional custom positions from user drag-drop
 */
export function getGraphLayout(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[] = [], // ✅ ADD edges parameter with default
  customPositions?: Record<string, CustomNodePosition>,
): LayoutResult {
  // Early return for empty input
  if (nodes.length === 0) {
    return {
      reactFlowNodes: [],
      reactFlowEdges: [],
    };
  }

  console.log(
    `[Graph Layout] Processing ${nodes.length} nodes with ${edges.length} edges`,
  );

  // Calculate levels using BFS with edges
  const { nodeLevels, levelCounts } = calculateNodeLevels(nodes, edges);

  // Create ReactFlow nodes with positions
  const reactFlowNodes = createNodes(
    nodes,
    nodeLevels,
    levelCounts,
    customPositions,
  );

  // Create ReactFlow edges
  const reactFlowEdges = createEdges(nodes, edges);

  return {
    reactFlowNodes,
    reactFlowEdges,
  };
}

/**
 * Utility: Get graph statistics for debugging/analytics
 */
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

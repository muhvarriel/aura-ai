import { Node, Edge } from "@xyflow/react";
import { RoadmapNode, NodeStatus } from "@/core/entities/roadmap";

// --- LAYOUT CONSTANTS ---
const NODE_WIDTH = 250;
const NODE_HEIGHT = 100;
const X_GAP = 50;
const Y_GAP = 150;

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
 * Calculate node levels using BFS traversal
 * Optimized: Single pass with early exit
 */
function calculateNodeLevels(nodes: RoadmapNode[]): {
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

  // Build adjacency map for fast lookups
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

    // Add children to queue
    const node = nodeMap.get(id);
    if (node && node.childrenIds.length > 0) {
      node.childrenIds.forEach((childId) => {
        if (!visited.has(childId)) {
          queue.push({ id: childId, level: level + 1 });
        }
      });
    }
  }

  return { nodeLevels, levelCounts, maxLevel };
}

/**
 * Calculate node position based on level and index
 * Optimized: Centered alignment for better visual balance
 */
function calculateNodePosition(
  level: number,
  indexInLevel: number,
  totalInLevel: number,
): NodePosition {
  // Calculate total width needed for this level
  const totalWidth = totalInLevel * (NODE_WIDTH + X_GAP);
  const startX = -(totalWidth / 2);

  return {
    x: startX + indexInLevel * (NODE_WIDTH + X_GAP) + NODE_WIDTH / 2,
    y: level * Y_GAP + 50,
  };
}

/**
 * Create ReactFlow edges from roadmap nodes
 * Optimized: Single pass with style pre-calculation
 */
function createEdges(
  nodes: RoadmapNode[],
  nodeMap: Map<string, RoadmapNode>,
): Edge[] {
  const edges: Edge[] = [];

  nodes.forEach((node) => {
    if (node.childrenIds.length === 0) return;

    const edgeStyle = getEdgeStyle(node.status);

    node.childrenIds.forEach((childId) => {
      edges.push({
        id: `e-${node.id}-${childId}`,
        source: node.id,
        target: childId,
        animated: edgeStyle.animated,
        style: {
          stroke: edgeStyle.stroke,
          strokeWidth: edgeStyle.strokeWidth,
        },
        // Add smooth bezier curve
        type: "smoothstep",
      });
    });
  });

  return edges;
}

/**
 * Create ReactFlow nodes with calculated positions
 * Optimized: Pre-calculated positions, single pass
 */
function createNodes(
  nodes: RoadmapNode[],
  nodeLevels: Map<string, number>,
  levelCounts: Map<number, number>,
): Node<GraphNodeData>[] {
  const reactFlowNodes: Node<GraphNodeData>[] = [];
  const currentLevelCount = new Map<number, number>();

  nodes.forEach((node) => {
    const level = nodeLevels.get(node.id) ?? 0;
    const indexInLevel = currentLevelCount.get(level) ?? 0;
    currentLevelCount.set(level, indexInLevel + 1);

    const totalInThisLevel = levelCounts.get(level) ?? 1;
    const position = calculateNodePosition(
      level,
      indexInLevel,
      totalInThisLevel,
    );

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
      // Prevent dragging for cleaner UX
      draggable: false,
    });
  });

  return reactFlowNodes;
}

/**
 * Main function: Convert RoadmapNode[] to ReactFlow graph layout
 *
 * Algorithm: Vertical Tree Layout with BFS
 * Time Complexity: O(n) where n = number of nodes
 * Space Complexity: O(n)
 *
 * Optimizations:
 * - Single-pass BFS for level calculation
 * - Pre-calculated positions
 * - Map-based lookups (O(1) access)
 * - No callback injection (stable reference)
 */
export function getGraphLayout(nodes: RoadmapNode[]): LayoutResult {
  // Early return for empty input
  if (nodes.length === 0) {
    return {
      reactFlowNodes: [],
      reactFlowEdges: [],
    };
  }

  // Build node map for O(1) lookups
  const nodeMap = new Map<string, RoadmapNode>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  // Calculate levels using BFS
  const { nodeLevels, levelCounts } = calculateNodeLevels(nodes);

  // Create ReactFlow nodes with positions
  const reactFlowNodes = createNodes(nodes, nodeLevels, levelCounts);

  // Create ReactFlow edges
  const reactFlowEdges = createEdges(nodes, nodeMap);

  return {
    reactFlowNodes,
    reactFlowEdges,
  };
}

/**
 * Utility: Get graph statistics for debugging/analytics
 */
export function getGraphStats(nodes: RoadmapNode[]): {
  totalNodes: number;
  maxDepth: number;
  completedNodes: number;
  unlockedNodes: number;
  lockedNodes: number;
} {
  const { maxLevel } = calculateNodeLevels(nodes);

  return {
    totalNodes: nodes.length,
    maxDepth: maxLevel,
    completedNodes: nodes.filter((n) => n.status === "completed").length,
    unlockedNodes: nodes.filter((n) => n.status === "unlocked").length,
    lockedNodes: nodes.filter((n) => n.status === "locked").length,
  };
}

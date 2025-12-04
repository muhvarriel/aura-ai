import { Node, Edge } from "@xyflow/react";
import { RoadmapNode, NodeStatus } from "@/core/entities/roadmap";

// --- LAYOUT CONSTANTS ---
const NODE_WIDTH = 250;
const X_GAP = 120; // ✅ CHANGED: Increased from 50 to 120 for more spacing
const Y_GAP = 200; // ✅ CHANGED: Increased from 150 to 200 for more vertical space
const HORIZONTAL_STAGGER = 40; // ✅ NEW: Add slight offset for visual variety

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

// ✅ NEW: Custom position override type
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
 * ✅ UPDATED: Calculate node position with natural stagger effect
 */
function calculateNodePosition(
  level: number,
  indexInLevel: number,
  totalInLevel: number,
): NodePosition {
  // Calculate total width needed for this level
  const totalWidth = totalInLevel * (NODE_WIDTH + X_GAP);
  const startX = -(totalWidth / 2);

  // ✅ NEW: Add subtle horizontal stagger for more organic look
  const staggerOffset =
    indexInLevel % 2 === 0 ? HORIZONTAL_STAGGER : -HORIZONTAL_STAGGER / 2;

  return {
    x:
      startX +
      indexInLevel * (NODE_WIDTH + X_GAP) +
      NODE_WIDTH / 2 +
      staggerOffset,
    y: level * Y_GAP + 100, // ✅ CHANGED: Increased top padding from 50 to 100
  };
}

/**
 * Create ReactFlow edges from roadmap nodes
 * Optimized: Single pass with style pre-calculation
 */
function createEdges(nodes: RoadmapNode[]): Edge[] {
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
 * ✅ UPDATED: Create ReactFlow nodes with calculated positions and custom overrides
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

    // ✅ NEW: Use custom position if available, otherwise use calculated
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
      // ✅ CHANGED: Enable dragging
      draggable: true,
    });
  });

  return reactFlowNodes;
}

/**
 * ✅ UPDATED: Main function with custom position support
 *
 * Algorithm: Vertical Tree Layout with BFS + Custom Position Override
 * Time Complexity: O(n) where n = number of nodes
 * Space Complexity: O(n)
 *
 * @param nodes - Array of roadmap nodes
 * @param customPositions - Optional custom positions from user drag-drop
 */
export function getGraphLayout(
  nodes: RoadmapNode[],
  customPositions?: Record<string, CustomNodePosition>,
): LayoutResult {
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

  // ✅ CHANGED: Pass customPositions to createNodes
  const reactFlowNodes = createNodes(
    nodes,
    nodeLevels,
    levelCounts,
    customPositions,
  );

  // Create ReactFlow edges
  const reactFlowEdges = createEdges(nodes);

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

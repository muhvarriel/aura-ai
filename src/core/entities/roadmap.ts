/**
 * Core Domain Entities for Roadmap
 * Strict null safety and readonly properties where applicable
 */

// Node status type - explicit union for type safety
export type NodeStatus = "locked" | "unlocked" | "completed";

// Difficulty levels - explicit union
export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

/**
 * Represents a connection between two nodes in the roadmap graph
 */
export interface RoadmapEdge {
  readonly id: string;
  readonly source: string; // Parent node ID
  readonly target: string; // Child node ID
}

/**
 * Represents a single learning module/topic in the roadmap
 */
export interface RoadmapNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  status: NodeStatus; // Mutable - changes during progress
  readonly parentId?: string; // DEPRECATED: Use edges instead
  readonly childrenIds?: string[]; // DEPRECATED: Use edges instead
  readonly estimatedTime?: string;
  readonly difficulty?: DifficultyLevel;
}

/**
 * Represents a complete learning roadmap
 */
export interface Roadmap {
  readonly id: string;
  readonly topic: string;
  nodes: RoadmapNode[]; // Mutable - status updates
  edges: RoadmapEdge[]; // ✅ NEW: Graph connections
  readonly createdAt: number;
  progress: number; // Mutable - calculated field
}

/**
 * Type guard: Check if value is valid NodeStatus
 */
export function isNodeStatus(value: unknown): value is NodeStatus {
  return (
    typeof value === "string" &&
    (value === "locked" || value === "unlocked" || value === "completed")
  );
}

/**
 * Type guard: Check if value is valid DifficultyLevel
 */
export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return (
    typeof value === "string" &&
    (value === "Beginner" || value === "Intermediate" || value === "Advanced")
  );
}

/**
 * Type guard: Check if value is valid RoadmapEdge
 */
export function isRoadmapEdge(value: unknown): value is RoadmapEdge {
  if (typeof value !== "object" || value === null) return false;
  const edge = value as Record<string, unknown>;
  return (
    typeof edge.id === "string" &&
    typeof edge.source === "string" &&
    typeof edge.target === "string"
  );
}

/**
 * Type guard: Check if value is valid Roadmap
 */
export function isRoadmap(value: unknown): value is Roadmap {
  if (typeof value !== "object" || value === null) return false;
  const roadmap = value as Record<string, unknown>;
  return (
    typeof roadmap.id === "string" &&
    typeof roadmap.topic === "string" &&
    Array.isArray(roadmap.nodes) &&
    Array.isArray(roadmap.edges) &&
    typeof roadmap.createdAt === "number" &&
    typeof roadmap.progress === "number"
  );
}

/**
 * Get all parent node IDs for a given node using edges
 */
export function getParentNodeIds(
  nodeId: string,
  edges: RoadmapEdge[],
): string[] {
  return edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);
}

/**
 * Get all child node IDs for a given node using edges
 */
export function getChildNodeIds(
  nodeId: string,
  edges: RoadmapEdge[],
): string[] {
  return edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
}

/**
 * Check if a node can be unlocked (all parents completed)
 */
export function canUnlockNode(
  nodeId: string,
  nodes: RoadmapNode[],
  edges: RoadmapEdge[],
): boolean {
  const parentIds = getParentNodeIds(nodeId, edges);

  // If no parents, node should be unlocked by default (root nodes)
  if (parentIds.length === 0) {
    return true;
  }

  // All parents must be completed
  return parentIds.every((parentId) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    return parentNode?.status === "completed";
  });
}

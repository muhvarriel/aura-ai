export type NodeStatus = "locked" | "unlocked" | "completed";

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export interface RoadmapEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
}

export interface RoadmapNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  status: NodeStatus;
  readonly parentId?: string;
  readonly childrenIds?: string[];
  readonly estimatedTime?: string;
  readonly difficulty?: DifficultyLevel;
}

export interface Roadmap {
  readonly id: string;
  readonly topic: string;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  readonly createdAt: number;
  progress: number;
}

export function isNodeStatus(value: unknown): value is NodeStatus {
  return (
    typeof value === "string" &&
    (value === "locked" || value === "unlocked" || value === "completed")
  );
}

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return (
    typeof value === "string" &&
    (value === "Beginner" || value === "Intermediate" || value === "Advanced")
  );
}

export function isRoadmapEdge(value: unknown): value is RoadmapEdge {
  if (typeof value !== "object" || value === null) return false;
  const edge = value as Record<string, unknown>;
  return (
    typeof edge.id === "string" &&
    typeof edge.source === "string" &&
    typeof edge.target === "string"
  );
}

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

export function getParentNodeIds(
  nodeId: string,
  edges: RoadmapEdge[],
): string[] {
  return edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => edge.source);
}

export function getChildNodeIds(
  nodeId: string,
  edges: RoadmapEdge[],
): string[] {
  return edges
    .filter((edge) => edge.source === nodeId)
    .map((edge) => edge.target);
}

export function canUnlockNode(
  nodeId: string,
  nodes: RoadmapNode[],
  edges: RoadmapEdge[],
): boolean {
  const parentIds = getParentNodeIds(nodeId, edges);

  if (parentIds.length === 0) {
    return true;
  }

  return parentIds.every((parentId) => {
    const parentNode = nodes.find((n) => n.id === parentId);
    return parentNode?.status === "completed";
  });
}

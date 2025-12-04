/**
 * Core Domain Entities for Roadmap
 * Strict null safety and readonly properties where applicable
 */

// Node status type - explicit union for type safety
export type NodeStatus = "locked" | "unlocked" | "completed";

// Difficulty levels - explicit union
export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

/**
 * Represents a single learning module/topic in the roadmap
 */
export interface RoadmapNode {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  status: NodeStatus; // Mutable - changes during progress
  readonly parentId?: string;
  childrenIds: string[];
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

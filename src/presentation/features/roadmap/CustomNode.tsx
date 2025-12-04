import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Check, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeStatus, DifficultyLevel } from "@/core/entities/roadmap";
import { GraphNodeData } from "@/lib/graph-layout";

/**
 * Custom node data interface with strict typing
 */
export interface CustomNodeData {
  readonly label: string;
  readonly status: NodeStatus;
  readonly description?: string;
  readonly difficulty?: DifficultyLevel;
  readonly estimatedTime?: string;
}

/**
 * Status-specific styling configuration
 */
const STATUS_STYLES: Record<NodeStatus, string> = {
  locked:
    "bg-white border-2 border-dashed border-neutral-200 text-neutral-300 cursor-not-allowed grayscale opacity-80",
  unlocked:
    "bg-white border-2 border-black text-black shadow-xl shadow-black/5 cursor-pointer hover:-translate-y-1 hover:shadow-2xl transition-all duration-300",
  completed:
    "bg-black border-2 border-black text-white shadow-md cursor-pointer",
} as const;

/**
 * Status icon component
 */
const StatusIcon: React.FC<{ status: NodeStatus }> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
          <Check className="w-3 h-3 text-black stroke-[4]" />
        </div>
      );
    case "locked":
      return <Lock className="w-4 h-4 text-neutral-300" />;
    case "unlocked":
      return (
        <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center">
          <ArrowRight className="w-3 h-3 text-white" />
        </div>
      );
  }
};

/**
 * Custom Node Component for Roadmap Graph
 * Memoized for performance
 */
const CustomNode: React.FC<NodeProps> = ({ data }) => {
  // Type assertion with safety check
  const nodeData = data as GraphNodeData;
  const { label, status, description } = nodeData;

  const handleClassName = cn(
    "!w-3 !h-3 !border-2",
    status === "locked"
      ? "!bg-neutral-100 !border-neutral-200"
      : "!bg-black !border-white",
  );

  return (
    <div
      className={cn(
        "px-6 py-5 rounded-[2rem] min-w-[220px] max-w-[280px] relative",
        STATUS_STYLES[status],
      )}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={handleClassName}
        isConnectable={false}
      />

      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h3
            className={cn(
              "font-serif text-lg leading-tight tracking-tight",
              status === "locked" ? "font-normal" : "font-medium",
            )}
          >
            {label}
          </h3>
          <div className="shrink-0 pt-1">
            <StatusIcon status={status} />
          </div>
        </div>

        {/* Description */}
        {description && (
          <p
            className={cn(
              "text-xs leading-relaxed font-sans line-clamp-2",
              status === "completed"
                ? "text-neutral-400"
                : status === "locked"
                  ? "text-neutral-300"
                  : "text-neutral-500",
            )}
          >
            {description}
          </p>
        )}
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={handleClassName}
        isConnectable={false}
      />
    </div>
  );
};

// Memoized export with display name
CustomNode.displayName = "CustomNode";

export default memo(CustomNode);

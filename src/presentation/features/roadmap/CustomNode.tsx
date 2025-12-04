import React, { memo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { Check, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeStatus } from "@/core/entities/roadmap";

// --- Type Definitions ---
type CustomNodeData = {
  label: string;
  status: NodeStatus;
  description?: string;
  onNodeClick?: () => void;
};

// Strict Typing untuk Node
type CustomNodeType = Node<CustomNodeData>;

const CustomNode = ({ data }: NodeProps<CustomNodeType>) => {
  const { label, status, description } = data;

  // --- Aura Design System Styles ---
  const statusStyles = {
    locked:
      "bg-white border-2 border-dashed border-neutral-200 text-neutral-300 cursor-not-allowed grayscale opacity-80",

    unlocked:
      "bg-white border-2 border-black text-black shadow-xl shadow-black/5 cursor-pointer hover:-translate-y-1 hover:shadow-2xl transition-all duration-300",

    completed:
      "bg-black border-2 border-black text-white shadow-md cursor-pointer",
  };

  const StatusIcon = () => {
    if (status === "completed") {
      return (
        <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
          <Check className="w-3 h-3 text-black stroke-[4]" />
        </div>
      );
    }
    if (status === "locked") {
      return <Lock className="w-4 h-4 text-neutral-300" />;
    }
    // Unlocked / Current
    return (
      <div className="h-6 w-6 rounded-full bg-black flex items-center justify-center">
        <ArrowRight className="w-3 h-3 text-white" />
      </div>
    );
  };

  return (
    <div
      className={cn(
        "px-6 py-5 rounded-[2rem] min-w-[220px] max-w-[280px] relative", // Bentuk lebih organic/bulat
        statusStyles[status] || statusStyles.locked,
      )}
    >
      {/* Handle Top (Input) - Styled to blend or pop based on state */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2",
          status === "locked"
            ? "!bg-neutral-100 !border-neutral-200"
            : "!bg-black !border-white", // Black dots for active path
        )}
      />

      <div className="flex flex-col gap-3">
        {/* Header: Icon & Label */}
        <div className="flex items-start justify-between gap-4">
          <h3
            className={cn(
              "font-serif text-lg leading-tight tracking-tight", // Font Serif untuk kesan Editorial
              status === "locked" ? "font-normal" : "font-medium",
            )}
          >
            {label}
          </h3>
          <div className="shrink-0 pt-1">
            <StatusIcon />
          </div>
        </div>

        {/* Description Body */}
        {description && (
          <p
            className={cn(
              "text-xs leading-relaxed font-sans",
              status === "completed" ? "text-neutral-400" : "text-neutral-500",
              status === "locked" && "text-neutral-300",
            )}
          >
            <span className="line-clamp-2">{description}</span>
          </p>
        )}
      </div>

      {/* Handle Bottom (Output) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2",
          status === "locked"
            ? "!bg-neutral-100 !border-neutral-200"
            : "!bg-black !border-white",
        )}
      />
    </div>
  );
};

export default memo(CustomNode);

"use client";

import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Check, Lock, Unlock, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NodeStatus, DifficultyLevel } from "@/core/entities/roadmap";
import { GraphNodeData } from "@/lib/graph-layout";

/**
 * ═══════════════════════════════════════════════════════════════
 * CUSTOM NODE - FIXED MEMO COMPARISON
 * ═══════════════════════════════════════════════════════════════
 */

export interface CustomNodeData {
  readonly label: string;
  readonly status: NodeStatus;
  readonly description?: string;
  readonly difficulty?: DifficultyLevel;
  readonly estimatedTime?: string;
}

interface ParticlePosition {
  id: number;
  x: number;
  y: number;
}

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  Beginner: "bg-emerald-100 text-emerald-700 border-emerald-300",
  Intermediate: "bg-amber-100 text-amber-700 border-amber-300",
  Advanced: "bg-rose-100 text-rose-700 border-rose-300",
} as const;

const STATUS_STYLES: Record<NodeStatus, string> = {
  locked:
    "bg-gradient-to-br from-neutral-100 to-neutral-50 border-2 border-dashed border-neutral-300 text-neutral-500 cursor-not-allowed opacity-60",
  unlocked:
    "bg-gradient-to-br from-white via-blue-50/30 to-white border-2 border-blue-500 text-black shadow-xl shadow-blue-500/20 cursor-pointer group hover:shadow-2xl hover:shadow-blue-500/30",
  completed:
    "bg-gradient-to-br from-emerald-600 to-emerald-700 border-2 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 cursor-pointer",
} as const;

const StatusIcon: React.FC<{ status: NodeStatus }> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-lg"
        >
          <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
        </motion.div>
      );
    case "locked":
      return (
        <motion.div
          animate={{
            rotate: [0, -3, 3, -3, 0],
            scale: [1, 0.95, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center"
        >
          <Lock className="w-4 h-4 text-neutral-400" />
        </motion.div>
      );
    case "unlocked":
      return (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:bg-blue-600 transition-all"
        >
          <Unlock className="w-4 h-4 text-white" />
        </motion.div>
      );
  }
};

const NodeTooltip: React.FC<{
  difficulty?: DifficultyLevel;
  estimatedTime?: string;
  status: NodeStatus;
}> = ({ difficulty, estimatedTime, status }) => {
  if (status === "locked") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="bg-neutral-900 text-white px-3.5 py-2 rounded-lg shadow-2xl border border-neutral-700 backdrop-blur-sm whitespace-nowrap">
        <div className="flex items-center gap-2.5 text-xs font-medium">
          {difficulty && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{difficulty}</span>
            </div>
          )}
          {estimatedTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{estimatedTime}</span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 border-r border-b border-neutral-700 rotate-45" />
      </div>
    </motion.div>
  );
};

const PulseGlow: React.FC = () => (
  <motion.div
    className="absolute inset-0 rounded-3xl bg-blue-400/10"
    animate={{
      scale: [1, 1.03, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration: 2.5,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const generateParticlePositions = (): ParticlePosition[] => {
  return [...Array(8)].map((_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 120,
    y: 50 + (Math.random() - 0.5) * 120,
  }));
};

const CELEBRATION_PARTICLES = generateParticlePositions();

const CelebrationParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {CELEBRATION_PARTICLES.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-2 h-2 bg-white rounded-full shadow-lg"
          initial={{
            x: "50%",
            y: "50%",
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${particle.x}%`,
            y: `${particle.y}%`,
            scale: [0, 1.2, 0],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1.8,
            delay: particle.id * 0.08,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

/**
 * Custom Node Component
 */
const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const nodeData = data as GraphNodeData;
  const { label, status, description, difficulty, estimatedTime } = nodeData;

  const handleClassName = cn(
    "!w-3 !h-3 !border-2 transition-all duration-300",
    status === "locked"
      ? "!bg-neutral-200 !border-neutral-400"
      : status === "completed"
        ? "!bg-emerald-500 !border-white hover:!scale-150"
        : "!bg-blue-500 !border-white hover:!scale-150 hover:!shadow-lg",
  );

  // Trigger celebration on mount if completed
  React.useEffect(() => {
    if (status === "completed") {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // ✅ Log status changes
  React.useEffect(() => {
    console.log(`[CustomNode] Status update: ${label} → ${status}`);
  }, [label, status]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
      style={{ willChange: "transform" }}
    >
      <motion.div
        whileHover={
          status === "unlocked"
            ? { y: -5, scale: 1.03 }
            : status === "completed"
              ? { scale: 1.02 }
              : {}
        }
        whileTap={status !== "locked" ? { scale: 0.97 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={cn(
          "px-5 py-4 rounded-3xl w-[220px] relative overflow-hidden backdrop-blur-sm",
          "transition-all duration-300",
          STATUS_STYLES[status],
          selected && "ring-4 ring-blue-500/30 ring-offset-2",
        )}
      >
        <Handle
          type="target"
          position={Position.Top}
          className={handleClassName}
          isConnectable={false}
        />

        {status === "unlocked" && <PulseGlow />}
        {status === "completed" && showParticles && <CelebrationParticles />}

        <div className="flex flex-col gap-2.5 relative z-10">
          <div className="flex items-start justify-between gap-3">
            <motion.h3
              layout
              className={cn(
                "font-serif text-base leading-tight tracking-tight flex-1 font-semibold",
                status === "locked" && "font-medium opacity-80",
              )}
            >
              {label}
            </motion.h3>
            <div className="shrink-0">
              <StatusIcon status={status} />
            </div>
          </div>

          {description && (
            <motion.p
              layout
              className={cn(
                "text-xs leading-relaxed font-sans line-clamp-2",
                status === "completed"
                  ? "text-emerald-50"
                  : status === "locked"
                    ? "text-neutral-500"
                    : "text-neutral-700",
              )}
            >
              {description}
            </motion.p>
          )}

          {status !== "locked" && (difficulty || estimatedTime) && (
            <motion.div className="flex items-center gap-1.5 flex-wrap pt-1">
              {difficulty && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide",
                    status === "completed"
                      ? "bg-white/20 text-white border-white/30"
                      : DIFFICULTY_COLORS[difficulty],
                  )}
                >
                  {difficulty}
                </span>
              )}
              {estimatedTime && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1",
                    status === "completed"
                      ? "bg-white/20 text-white"
                      : "bg-blue-100 text-blue-700",
                  )}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {estimatedTime}
                </span>
              )}
            </motion.div>
          )}
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className={handleClassName}
          isConnectable={false}
        />

        {status === "unlocked" && isHovered && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {isHovered && (
          <NodeTooltip
            difficulty={difficulty}
            estimatedTime={estimatedTime}
            status={status}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

CustomNode.displayName = "CustomNode";

// ✅ FIXED: Memo comparison - force re-render on status change
export default memo(CustomNode, (prevProps, nextProps) => {
  const prevData = prevProps.data as GraphNodeData;
  const nextData = nextProps.data as GraphNodeData;

  // ✅ CRITICAL: Return false when status changes to force re-render
  if (prevData.status !== nextData.status) {
    console.log(
      `[CustomNode Memo] Status changed for ${prevData.label}: ${prevData.status} → ${nextData.status}, forcing re-render`,
    );
    return false; // Force re-render
  }

  // Check other props
  const isSame =
    prevData.label === nextData.label &&
    prevData.description === nextData.description &&
    prevData.difficulty === nextData.difficulty &&
    prevData.estimatedTime === nextData.estimatedTime &&
    prevProps.selected === nextProps.selected;

  return isSame;
});

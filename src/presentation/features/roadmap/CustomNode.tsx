"use client";

import React, { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Check, Lock, ArrowRight, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { NodeStatus, DifficultyLevel } from "@/core/entities/roadmap";
import { GraphNodeData } from "@/lib/graph-layout";

/**
 * ═══════════════════════════════════════════════════════════════
 * CUSTOM NODE - ENHANCED VERSION
 * ═══════════════════════════════════════════════════════════════
 * Features:
 * - Micro-interactions with Framer Motion
 * - Hover tooltips with metadata
 * - Smooth status transitions
 * - Gradient backgrounds
 * - Pulse animations for unlocked nodes
 * - Celebration effects for completed nodes
 * ═══════════════════════════════════════════════════════════════
 */

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
 * Particle position interface
 */
interface ParticlePosition {
  id: number;
  x: number;
  y: number;
}

/**
 * Difficulty badge color mapping
 */
const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  Beginner: "bg-green-100 text-green-700 border-green-200",
  Intermediate: "bg-amber-100 text-amber-700 border-amber-200",
  Advanced: "bg-red-100 text-red-700 border-red-200",
} as const;

/**
 * Status-specific styling configuration
 */
const STATUS_STYLES: Record<NodeStatus, string> = {
  locked:
    "bg-gradient-to-br from-neutral-50 to-neutral-100 border-2 border-dashed border-neutral-200 text-neutral-400 cursor-not-allowed",
  unlocked:
    "bg-gradient-to-br from-white to-neutral-50 border-2 border-black text-black shadow-xl shadow-black/10 cursor-pointer group",
  completed:
    "bg-gradient-to-br from-black to-neutral-900 border-2 border-black text-white shadow-lg shadow-black/20 cursor-pointer",
} as const;

/**
 * Status icon component with animations
 */
const StatusIcon: React.FC<{ status: NodeStatus }> = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="h-7 w-7 rounded-full bg-white flex items-center justify-center shadow-md"
        >
          <Check className="w-4 h-4 text-black stroke-[3]" />
        </motion.div>
      );
    case "locked":
      return (
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Lock className="w-4 h-4 text-neutral-300" />
        </motion.div>
      );
    case "unlocked":
      return (
        <motion.div
          whileHover={{ scale: 1.1, rotate: 90 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="h-7 w-7 rounded-full bg-black flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow"
        >
          <ArrowRight className="w-4 h-4 text-white" />
        </motion.div>
      );
  }
};

/**
 * Tooltip component for node metadata
 */
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
      transition={{ duration: 0.2 }}
      className="absolute -top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="bg-black text-white px-4 py-2.5 rounded-xl shadow-2xl border border-neutral-700 backdrop-blur-sm whitespace-nowrap">
        <div className="flex items-center gap-3 text-xs">
          {difficulty && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="font-medium">{difficulty}</span>
            </div>
          )}
          {estimatedTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium">{estimatedTime}</span>
            </div>
          )}
        </div>
        {/* Tooltip arrow */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border-r border-b border-neutral-700 rotate-45" />
      </div>
    </motion.div>
  );
};

/**
 * Pulse glow effect for unlocked nodes
 */
const PulseGlow: React.FC = () => (
  <motion.div
    className="absolute inset-0 rounded-[2rem] bg-black/5"
    animate={{
      scale: [1, 1.05, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

/**
 * Generate particle positions once at module load time
 */
const generateParticlePositions = (): ParticlePosition[] => {
  return [...Array(6)].map((_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 100,
    y: 50 + (Math.random() - 0.5) * 100,
  }));
};

const CELEBRATION_PARTICLES = generateParticlePositions();

/**
 * Celebration particles for completed nodes
 */
const CelebrationParticles: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
      {CELEBRATION_PARTICLES.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-1.5 h-1.5 bg-white rounded-full"
          initial={{
            x: "50%",
            y: "50%",
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: `${particle.x}%`,
            y: `${particle.y}%`,
            scale: [0, 1, 0],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: particle.id * 0.1,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

/**
 * Custom Node Component for Roadmap Graph
 */
const CustomNode: React.FC<NodeProps> = ({ data, selected }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const nodeData = data as GraphNodeData;
  const { label, status, description, difficulty, estimatedTime } = nodeData;

  const handleClassName = cn(
    "!w-3 !h-3 !border-2 transition-all duration-300",
    status === "locked"
      ? "!bg-neutral-100 !border-neutral-300"
      : "!bg-black !border-white hover:!scale-150 hover:!shadow-lg",
  );

  // Trigger celebration on mount if completed
  React.useEffect(() => {
    if (status === "completed") {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative"
      style={{ willChange: "transform" }}
    >
      {/* Main Node Container */}
      <motion.div
        whileHover={
          status === "unlocked"
            ? { y: -4, scale: 1.02 }
            : status === "completed"
              ? { scale: 1.02 }
              : {}
        }
        whileTap={status !== "locked" ? { scale: 0.98 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "px-6 py-5 rounded-[2rem] min-w-[220px] max-w-[280px] relative overflow-hidden backdrop-blur-sm",
          "transition-all duration-300",
          STATUS_STYLES[status],
          selected && "ring-4 ring-black/20 ring-offset-2",
          status === "unlocked" && "hover:shadow-2xl hover:border-black/80",
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

        <div className="flex flex-col gap-3 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <motion.h3
              layout
              className={cn(
                "font-serif text-lg leading-tight tracking-tight flex-1",
                status === "locked" ? "font-normal" : "font-medium",
              )}
            >
              {label}
            </motion.h3>
            <div className="shrink-0 pt-0.5">
              <StatusIcon status={status} />
            </div>
          </div>

          {description && (
            <motion.p
              layout
              className={cn(
                "text-xs leading-relaxed font-sans",
                isHovered && status === "unlocked"
                  ? "line-clamp-3"
                  : "line-clamp-2",
                status === "completed"
                  ? "text-neutral-300"
                  : status === "locked"
                    ? "text-neutral-400"
                    : "text-neutral-600",
                "transition-all duration-300",
              )}
            >
              {description}
            </motion.p>
          )}

          {status !== "locked" && (difficulty || estimatedTime) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={
                isHovered
                  ? { opacity: 1, height: "auto" }
                  : { opacity: 0, height: 0 }
              }
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 flex-wrap overflow-hidden"
            >
              {difficulty && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-1 rounded-full border",
                    status === "completed"
                      ? "bg-white/10 text-white border-white/20"
                      : DIFFICULTY_COLORS[difficulty],
                  )}
                >
                  {difficulty}
                </span>
              )}
              {estimatedTime && (
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1",
                    status === "completed"
                      ? "bg-white/10 text-white"
                      : "bg-blue-50 text-blue-700",
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
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
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

export default memo(CustomNode, (prevProps, nextProps) => {
  const prevData = prevProps.data as GraphNodeData;
  const nextData = nextProps.data as GraphNodeData;

  return (
    prevData.label === nextData.label &&
    prevData.status === nextData.status &&
    prevData.description === nextData.description &&
    prevData.difficulty === nextData.difficulty &&
    prevData.estimatedTime === nextData.estimatedTime &&
    prevProps.selected === nextProps.selected
  );
});

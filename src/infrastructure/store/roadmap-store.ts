import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Roadmap, NodeStatus } from "@/core/entities/roadmap";
import { LearningContent } from "@/core/entities/quiz";
import { CustomNodePosition } from "@/lib/graph-layout"; // ✅ NEW: Import type

// ✅ NEW: Custom positions type for each roadmap
interface RoadmapCustomPositions {
  [roadmapId: string]: Record<string, CustomNodePosition>;
}

// Interface State (Data)
interface RoadmapState {
  roadmaps: Roadmap[];
  activeRoadmapId: string | null;
  contentCache: Record<string, LearningContent>;
  customPositions: RoadmapCustomPositions; // ✅ NEW: Store custom node positions
  _hasHydrated: boolean;
}

// Interface Actions (Function)
interface RoadmapActions {
  // Roadmap Management
  addRoadmap: (roadmap: Roadmap) => void;
  setActiveRoadmap: (id: string) => void;
  deleteRoadmap: (id: string) => void;
  getRoadmapById: (id: string) => Roadmap | undefined;

  // Node Progress
  updateNodeStatus: (
    roadmapId: string,
    nodeId: string,
    status: NodeStatus,
  ) => void;
  unlockNextNode: (roadmapId: string, currentNodeId: string) => void;
  completeNode: (roadmapId: string, nodeId: string) => void;

  // ✅ NEW: Node Position Management
  saveNodePosition: (
    roadmapId: string,
    nodeId: string,
    position: CustomNodePosition,
  ) => void;
  getNodePositions: (
    roadmapId: string,
  ) => Record<string, CustomNodePosition> | undefined;
  resetNodePositions: (roadmapId: string) => void;

  // Content Caching
  cacheContent: (nodeId: string, content: LearningContent) => void;
  getContent: (nodeId: string) => LearningContent | undefined;
  clearContentCache: () => void;

  // Hydration Control
  setHasHydrated: (state: boolean) => void;
}

// Gabungan State + Actions
type RoadmapStore = RoadmapState & RoadmapActions;

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      // Initial State
      roadmaps: [],
      activeRoadmapId: null,
      contentCache: {},
      customPositions: {}, // ✅ NEW: Initialize empty custom positions
      _hasHydrated: false,

      // Actions Implementation
      addRoadmap: (roadmap) =>
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          activeRoadmapId: roadmap.id,
        })),

      setActiveRoadmap: (id) => set({ activeRoadmapId: id }),

      deleteRoadmap: (id) =>
        set((state) => {
          // ✅ NEW: Also delete custom positions when deleting roadmap
          const newCustomPositions = { ...state.customPositions };
          delete newCustomPositions[id];

          return {
            roadmaps: state.roadmaps.filter((r) => r.id !== id),
            activeRoadmapId:
              state.activeRoadmapId === id ? null : state.activeRoadmapId,
            customPositions: newCustomPositions,
          };
        }),

      getRoadmapById: (id) => {
        return get().roadmaps.find((r) => r.id === id);
      },

      updateNodeStatus: (roadmapId, nodeId, status) =>
        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            // Update specific node status
            const updatedNodes = map.nodes.map((node) =>
              node.id === nodeId ? { ...node, status } : node,
            );

            // Calculate new progress
            const completedCount = updatedNodes.filter(
              (n) => n.status === "completed",
            ).length;
            const progress = Math.round(
              (completedCount / updatedNodes.length) * 100,
            );

            console.log(
              `[Store] Node ${nodeId} status updated to ${status}. Progress: ${progress}%`,
            );

            return { ...map, nodes: updatedNodes, progress };
          }),
        })),

      unlockNextNode: (roadmapId, currentNodeId) => {
        const roadmap = get().roadmaps.find((r) => r.id === roadmapId);
        if (!roadmap) {
          console.warn(`[Store] Roadmap ${roadmapId} not found`);
          return;
        }

        const currentNode = roadmap.nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) {
          console.warn(`[Store] Node ${currentNodeId} not found in roadmap`);
          return;
        }

        const childrenIds = currentNode.childrenIds;

        if (!childrenIds || childrenIds.length === 0) {
          console.log(
            `[Store] Node ${currentNodeId} has no children to unlock`,
          );
          return;
        }

        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) => {
              // Only unlock if currently locked
              if (childrenIds.includes(node.id) && node.status === "locked") {
                console.log(
                  `[Store] Unlocking child node: ${node.id} (${node.label})`,
                );
                return {
                  ...node,
                  status: "unlocked" as NodeStatus,
                };
              }
              return node;
            });

            return { ...map, nodes: updatedNodes };
          }),
        }));
      },

      completeNode: (roadmapId, nodeId) => {
        console.log(
          `[Store] Completing node ${nodeId} in roadmap ${roadmapId}`,
        );

        // Update status to completed
        get().updateNodeStatus(roadmapId, nodeId, "completed");

        // Unlock next nodes
        get().unlockNextNode(roadmapId, nodeId);
      },

      // ✅ NEW: Save node position after drag
      saveNodePosition: (roadmapId, nodeId, position) => {
        console.log(
          `[Store] Saving position for node ${nodeId} in roadmap ${roadmapId}:`,
          position,
        );

        set((state) => ({
          customPositions: {
            ...state.customPositions,
            [roadmapId]: {
              ...(state.customPositions[roadmapId] || {}),
              [nodeId]: position,
            },
          },
        }));
      },

      // ✅ NEW: Get all custom positions for a roadmap
      getNodePositions: (roadmapId) => {
        return get().customPositions[roadmapId];
      },

      // ✅ NEW: Reset positions to default layout
      resetNodePositions: (roadmapId) => {
        console.log(
          `[Store] Resetting node positions for roadmap ${roadmapId}`,
        );

        set((state) => {
          const newCustomPositions = { ...state.customPositions };
          delete newCustomPositions[roadmapId];

          return {
            customPositions: newCustomPositions,
          };
        });
      },

      cacheContent: (nodeId, content) => {
        console.log(`[Store] Caching content for node: ${nodeId}`);
        set((state) => ({
          contentCache: { ...state.contentCache, [nodeId]: content },
        }));
      },

      getContent: (nodeId) => {
        return get().contentCache[nodeId];
      },

      clearContentCache: () => {
        console.log("[Store] Clearing content cache");
        set({ contentCache: {} });
      },

      // Manual hydration setter
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
    }),
    {
      name: "aura-ai-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

// Optimized Selectors
export const selectRoadmapById = (id: string) => (state: RoadmapStore) =>
  state.roadmaps.find((r) => r.id === id);

export const selectHasHydrated = (state: RoadmapStore) => state._hasHydrated;

export const selectUnlockNext = (state: RoadmapStore) => state.unlockNextNode;

export const selectUpdateStatus = (state: RoadmapStore) =>
  state.updateNodeStatus;

export const selectCompleteNode = (state: RoadmapStore) => state.completeNode;

export const selectCacheContent = (state: RoadmapStore) => state.cacheContent;

export const selectGetContent = (state: RoadmapStore) => state.getContent;

export const selectClearCache = (state: RoadmapStore) =>
  state.clearContentCache;

// ✅ NEW: Selectors for position management
export const selectSaveNodePosition = (state: RoadmapStore) =>
  state.saveNodePosition;

export const selectGetNodePositions = (state: RoadmapStore) =>
  state.getNodePositions;

export const selectResetNodePositions = (state: RoadmapStore) =>
  state.resetNodePositions;

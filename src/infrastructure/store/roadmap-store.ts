import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Roadmap,
  NodeStatus,
  getChildNodeIds,
  canUnlockNode,
} from "@/core/entities/roadmap";
import { LearningContent } from "@/core/entities/quiz";
import { CustomNodePosition } from "@/lib/graph-layout";

// Custom positions type for each roadmap
interface RoadmapCustomPositions {
  [roadmapId: string]: Record<string, CustomNodePosition>;
}

// Interface State (Data)
interface RoadmapState {
  roadmaps: Roadmap[];
  activeRoadmapId: string | null;
  contentCache: Record<string, LearningContent>;
  customPositions: RoadmapCustomPositions;
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

  // Node Position Management
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
  cacheContent: (cacheKey: string, content: LearningContent) => void;
  getContent: (cacheKey: string) => LearningContent | undefined;
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
      customPositions: {},
      _hasHydrated: false,

      // Actions Implementation
      addRoadmap: (roadmap) => {
        console.log(
          `[Store] Adding roadmap: ${roadmap.id} - "${roadmap.topic}"`,
        );
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          activeRoadmapId: roadmap.id,
        }));
      },

      setActiveRoadmap: (id) => {
        console.log(`[Store] Setting active roadmap: ${id}`);
        set({ activeRoadmapId: id });
      },

      deleteRoadmap: (id) => {
        console.log(`[Store] Deleting roadmap: ${id}`);
        set((state) => {
          const newCustomPositions = { ...state.customPositions };
          delete newCustomPositions[id];

          return {
            roadmaps: state.roadmaps.filter((r) => r.id !== id),
            activeRoadmapId:
              state.activeRoadmapId === id ? null : state.activeRoadmapId,
            customPositions: newCustomPositions,
          };
        });
      },

      getRoadmapById: (id) => {
        return get().roadmaps.find((r) => r.id === id);
      },

      updateNodeStatus: (roadmapId, nodeId, status) => {
        console.log(
          `[Store] Updating node ${nodeId} in roadmap ${roadmapId} to status: ${status}`,
        );

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
              `[Store] Node ${nodeId} status updated to ${status}. Progress: ${progress}% (${completedCount}/${updatedNodes.length} completed)`,
            );

            return { ...map, nodes: updatedNodes, progress };
          }),
        }));
      },

      unlockNextNode: (roadmapId, currentNodeId) => {
        console.log(
          `[Store] ═══════════════════════════════════════════════════════`,
        );
        console.log(
          `[Store] UNLOCK PROCESS STARTED for node: ${currentNodeId}`,
        );

        const roadmap = get().roadmaps.find((r) => r.id === roadmapId);
        if (!roadmap) {
          console.error(`[Store] ❌ Roadmap ${roadmapId} not found`);
          return;
        }

        const currentNode = roadmap.nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) {
          console.error(
            `[Store] ❌ Node ${currentNodeId} not found in roadmap`,
          );
          return;
        }

        // ✅ FIX: Use edges to get children, not childrenIds
        const edges = roadmap.edges || [];
        if (edges.length === 0) {
          console.warn(
            `[Store] ⚠️ No edges found in roadmap ${roadmapId}. Cannot determine dependencies.`,
          );
          return;
        }

        const childrenIds = getChildNodeIds(currentNodeId, edges);

        if (childrenIds.length === 0) {
          console.log(
            `[Store] ℹ️ Node ${currentNodeId} has no children (leaf node)`,
          );
          console.log(
            `[Store] ═══════════════════════════════════════════════════════`,
          );
          return;
        }

        console.log(
          `[Store] 🔍 Found ${childrenIds.length} child nodes: [${childrenIds.join(", ")}]`,
        );

        // ✅ FIX: Validate each child before unlocking
        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) => {
              // Only process children of current node
              if (!childrenIds.includes(node.id)) return node;

              // ✅ Check if node can be unlocked (all parents completed)
              const canUnlock = canUnlockNode(node.id, map.nodes, edges);

              if (canUnlock && node.status === "locked") {
                console.log(
                  `[Store] ✅ UNLOCKING: ${node.id} (${node.label}) - All parents completed`,
                );
                return {
                  ...node,
                  status: "unlocked" as NodeStatus,
                };
              } else if (!canUnlock) {
                console.log(
                  `[Store] ⏸️ SKIPPING: ${node.id} (${node.label}) - Not all parents completed`,
                );
              } else {
                console.log(
                  `[Store] ℹ️ ALREADY: ${node.id} (${node.label}) - Status: ${node.status}`,
                );
              }

              return node;
            });

            console.log(
              `[Store] ═══════════════════════════════════════════════════════`,
            );
            return { ...map, nodes: updatedNodes };
          }),
        }));
      },

      completeNode: (roadmapId, nodeId) => {
        console.log(
          `[Store] 🎯 COMPLETING NODE: ${nodeId} in roadmap ${roadmapId}`,
        );

        // Update status to completed
        get().updateNodeStatus(roadmapId, nodeId, "completed");

        // Unlock next nodes
        get().unlockNextNode(roadmapId, nodeId);
      },

      saveNodePosition: (roadmapId, nodeId, position) => {
        console.log(
          `[Store] 📍 Saving position for node ${nodeId} in roadmap ${roadmapId}:`,
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

      getNodePositions: (roadmapId) => {
        return get().customPositions[roadmapId];
      },

      resetNodePositions: (roadmapId) => {
        console.log(
          `[Store] 🔄 Resetting node positions for roadmap ${roadmapId}`,
        );

        set((state) => {
          const newCustomPositions = { ...state.customPositions };
          delete newCustomPositions[roadmapId];

          return {
            customPositions: newCustomPositions,
          };
        });
      },

      cacheContent: (cacheKey, content) => {
        console.log(`[Store] 💾 Caching content for key: ${cacheKey}`);
        set((state) => ({
          contentCache: { ...state.contentCache, [cacheKey]: content },
        }));
      },

      getContent: (cacheKey) => {
        const cached = get().contentCache[cacheKey];
        if (cached) {
          console.log(`[Store] ✅ Cache HIT for key: ${cacheKey}`);
        } else {
          console.log(`[Store] ❌ Cache MISS for key: ${cacheKey}`);
        }
        return cached;
      },

      clearContentCache: () => {
        console.log("[Store] 🗑️ Clearing content cache");
        set({ contentCache: {} });
      },

      setHasHydrated: (state) => {
        console.log(`[Store] 💧 Hydration state set to: ${state}`);
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
        console.log("[Store] 🔄 Rehydrating from localStorage...");
        if (state) {
          state.setHasHydrated(true);
          console.log(
            `[Store] ✅ Rehydration complete. Loaded ${state.roadmaps.length} roadmaps`,
          );
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

export const selectSaveNodePosition = (state: RoadmapStore) =>
  state.saveNodePosition;

export const selectGetNodePositions = (state: RoadmapStore) =>
  state.getNodePositions;

export const selectResetNodePositions = (state: RoadmapStore) =>
  state.resetNodePositions;

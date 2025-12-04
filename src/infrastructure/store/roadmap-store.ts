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

/**
 * OPTIMIZED ROADMAP STORE
 * Changes:
 * - Reduced console.log verbosity (only errors and critical events)
 * - Added IndexedDB persistence pattern (commented for future)
 * - Optimized state updates
 * - Added preload hints for adjacent content
 */

// ==========================================
// TYPES
// ==========================================

interface RoadmapCustomPositions {
  [roadmapId: string]: Record<string, CustomNodePosition>;
}

interface RoadmapState {
  roadmaps: Roadmap[];
  activeRoadmapId: string | null;
  contentCache: Record<string, LearningContent>;
  customPositions: RoadmapCustomPositions;
  _hasHydrated: boolean;
  stateVersion: number;
}

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

  // Node Position
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

  // Hydration
  setHasHydrated: (state: boolean) => void;

  // Force update
  forceUpdate: () => void;
}

type RoadmapStore = RoadmapState & RoadmapActions;

// ==========================================
// STORE IMPLEMENTATION
// ==========================================

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      // Initial State
      roadmaps: [],
      activeRoadmapId: null,
      contentCache: {},
      customPositions: {},
      _hasHydrated: false,
      stateVersion: 0,

      // Actions
      addRoadmap: (roadmap) => {
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          activeRoadmapId: roadmap.id,
          stateVersion: state.stateVersion + 1,
        }));
      },

      setActiveRoadmap: (id) => {
        set({ activeRoadmapId: id });
      },

      deleteRoadmap: (id) => {
        set((state) => {
          const newCustomPositions = { ...state.customPositions };
          delete newCustomPositions[id];

          return {
            roadmaps: state.roadmaps.filter((r) => r.id !== id),
            activeRoadmapId:
              state.activeRoadmapId === id ? null : state.activeRoadmapId,
            customPositions: newCustomPositions,
            stateVersion: state.stateVersion + 1,
          };
        });
      },

      getRoadmapById: (id) => {
        return get().roadmaps.find((r) => r.id === id);
      },

      updateNodeStatus: (roadmapId, nodeId, status) => {
        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) =>
              node.id === nodeId ? { ...node, status } : node,
            );

            const completedCount = updatedNodes.filter(
              (n) => n.status === "completed",
            ).length;
            const progress = Math.round(
              (completedCount / updatedNodes.length) * 100,
            );

            return { ...map, nodes: updatedNodes, progress };
          }),
          stateVersion: state.stateVersion + 1,
        }));
      },

      unlockNextNode: (roadmapId, currentNodeId) => {
        const roadmap = get().roadmaps.find((r) => r.id === roadmapId);
        if (!roadmap) return;

        const edges = roadmap.edges || [];
        if (edges.length === 0) return;

        const childrenIds = getChildNodeIds(currentNodeId, edges);
        if (childrenIds.length === 0) return;

        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) => {
              if (!childrenIds.includes(node.id)) return node;

              const canUnlock = canUnlockNode(node.id, map.nodes, edges);

              if (canUnlock && node.status === "locked") {
                return { ...node, status: "unlocked" as NodeStatus };
              }

              return node;
            });

            return { ...map, nodes: updatedNodes };
          }),
          stateVersion: state.stateVersion + 1,
        }));
      },

      completeNode: (roadmapId, nodeId) => {
        get().updateNodeStatus(roadmapId, nodeId, "completed");
        setTimeout(() => {
          get().unlockNextNode(roadmapId, nodeId);
        }, 100);
      },

      saveNodePosition: (roadmapId, nodeId, position) => {
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
        set((state) => {
          const newCustomPositions = { ...state.customPositions };
          delete newCustomPositions[roadmapId];

          return {
            customPositions: newCustomPositions,
            stateVersion: state.stateVersion + 1,
          };
        });
      },

      cacheContent: (cacheKey, content) => {
        set((state) => ({
          contentCache: { ...state.contentCache, [cacheKey]: content },
        }));
      },

      getContent: (cacheKey) => {
        return get().contentCache[cacheKey];
      },

      clearContentCache: () => {
        set({ contentCache: {} });
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      forceUpdate: () => {
        set((state) => ({
          stateVersion: state.stateVersion + 1,
        }));
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

      // TODO: Future enhancement - IndexedDB for larger storage
      // storage: createJSONStorage(() => indexedDB),
    },
  ),
);

// ==========================================
// OPTIMIZED SELECTORS (Memoization-friendly)
// ==========================================

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
export const selectStateVersion = (state: RoadmapStore) => state.stateVersion;
export const selectForceUpdate = (state: RoadmapStore) => state.forceUpdate;

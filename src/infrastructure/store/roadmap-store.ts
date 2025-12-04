import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Roadmap, RoadmapNode, NodeStatus } from "@/core/entities/roadmap";
import { LearningContent } from "@/core/entities/quiz";

// Interface State (Data)
interface RoadmapState {
  roadmaps: Roadmap[];
  activeRoadmapId: string | null;
  contentCache: Record<string, LearningContent>;
  _hasHydrated: boolean; // NEW: Track hydration status
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

  // Content Caching
  cacheContent: (nodeId: string, content: LearningContent) => void;
  getContent: (nodeId: string) => LearningContent | undefined;

  // NEW: Hydration Control
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
      _hasHydrated: false, // NEW: Initial false

      // Actions Implementation
      addRoadmap: (roadmap) =>
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          activeRoadmapId: roadmap.id,
        })),

      setActiveRoadmap: (id) => set({ activeRoadmapId: id }),

      deleteRoadmap: (id) =>
        set((state) => ({
          roadmaps: state.roadmaps.filter((r) => r.id !== id),
          activeRoadmapId:
            state.activeRoadmapId === id ? null : state.activeRoadmapId,
        })),

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

            return { ...map, nodes: updatedNodes, progress };
          }),
        })),

      unlockNextNode: (roadmapId, currentNodeId) => {
        const roadmap = get().roadmaps.find((r) => r.id === roadmapId);
        if (!roadmap) return;

        const currentNode = roadmap.nodes.find((n) => n.id === currentNodeId);
        if (!currentNode) return;

        const childrenIds = currentNode.childrenIds;

        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) => {
              if (childrenIds.includes(node.id) && node.status === "locked") {
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

      cacheContent: (nodeId, content) =>
        set((state) => ({
          contentCache: { ...state.contentCache, [nodeId]: content },
        })),

      getContent: (nodeId) => {
        return get().contentCache[nodeId];
      },

      // NEW: Manual hydration setter
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
    }),
    {
      name: "aura-ai-storage",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // Keep true to prevent SSR issues

      // NEW: onRehydrateStorage callback
      onRehydrateStorage: () => (state) => {
        // This callback runs after store rehydrates from localStorage
        if (state) {
          state.setHasHydrated(true);
        }
      },
    },
  ),
);

// NEW: Optimized Selectors (Prevent unnecessary re-renders)
// Export these for use in components instead of inline selectors
export const selectRoadmapById = (id: string) => (state: RoadmapStore) =>
  state.roadmaps.find((r) => r.id === id);

export const selectHasHydrated = (state: RoadmapStore) => state._hasHydrated;

export const selectUnlockNext = (state: RoadmapStore) => state.unlockNextNode;

export const selectUpdateStatus = (state: RoadmapStore) =>
  state.updateNodeStatus;

export const selectCacheContent = (state: RoadmapStore) => state.cacheContent;

export const selectGetContent = (state: RoadmapStore) => state.getContent;

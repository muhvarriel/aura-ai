import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Roadmap, RoadmapNode, NodeStatus } from "@/core/entities/roadmap";
import { LearningContent } from "@/core/entities/quiz";

// Interface State (Data)
interface RoadmapState {
  roadmaps: Roadmap[];
  activeRoadmapId: string | null;
  contentCache: Record<string, LearningContent>; // Key: nodeId, Value: Content
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

      // Actions Implementation
      addRoadmap: (roadmap) =>
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          activeRoadmapId: roadmap.id, // Auto set active ke yang baru dibuat
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

        // Temukan anak-anak dari node ini
        const childrenIds = currentNode.childrenIds;

        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) => {
              // Jika node ini adalah anak dari node yang baru selesai, unlock!
              if (childrenIds.includes(node.id) && node.status === "locked") {
                return { ...node, status: "unlocked" as NodeStatus };
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
    }),
    {
      name: "skillforge-storage", // Nama key di LocalStorage
      storage: createJSONStorage(() => localStorage), // Explicit browser storage
      skipHydration: true, // Penting untuk Next.js SSR agar tidak hydration mismatch
    },
  ),
);

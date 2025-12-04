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
  stateVersion: number; // ✅ Force re-render trigger
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

  // Force update
  forceUpdate: () => void;
}

// Combined State + Actions
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
      stateVersion: 0,

      // Actions Implementation
      addRoadmap: (roadmap) => {
        console.log(
          `[Store] ➕ Adding roadmap: ${roadmap.id} - "${roadmap.topic}"`,
        );
        set((state) => ({
          roadmaps: [roadmap, ...state.roadmaps],
          activeRoadmapId: roadmap.id,
          stateVersion: state.stateVersion + 1,
        }));
      },

      setActiveRoadmap: (id) => {
        console.log(`[Store] 🎯 Setting active roadmap: ${id}`);
        set({ activeRoadmapId: id });
      },

      deleteRoadmap: (id) => {
        console.log(`[Store] 🗑️ Deleting roadmap: ${id}`);
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
        console.log(
          `[Store] 📝 Updating node ${nodeId} in roadmap ${roadmapId} to status: ${status}`,
        );

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

            console.log(
              `[Store] ✅ Node ${nodeId} → ${status} | Progress: ${progress}% (${completedCount}/${updatedNodes.length})`,
            );

            return { ...map, nodes: updatedNodes, progress };
          }),
          stateVersion: state.stateVersion + 1, // ✅ CRITICAL: Force re-render
        }));
      },

      unlockNextNode: (roadmapId, currentNodeId) => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║            🔓 UNLOCK PROCESS STARTED                       ║
╠════════════════════════════════════════════════════════════╣
║  Roadmap ID:    ${roadmapId.substring(0, 12)}...
║  Current Node:  ${currentNodeId}
╚════════════════════════════════════════════════════════════╝
        `);

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

        console.log(`[Store] 📊 Current Node Details:`, {
          id: currentNode.id,
          label: currentNode.label,
          status: currentNode.status,
        });

        const edges = roadmap.edges || [];
        if (edges.length === 0) {
          console.warn(
            `[Store] ⚠️ No edges found in roadmap ${roadmapId}. Cannot determine dependencies.`,
          );
          return;
        }

        console.log(`[Store] 🔗 Total edges in roadmap: ${edges.length}`);

        const childrenIds = getChildNodeIds(currentNodeId, edges);

        if (childrenIds.length === 0) {
          console.log(
            `[Store] ℹ️ Node ${currentNodeId} has no children (leaf node)`,
          );
          console.log(
            `╚════════════════════════════════════════════════════════════╝\n`,
          );
          return;
        }

        console.log(
          `[Store] 🔍 Found ${childrenIds.length} child node(s): [${childrenIds.join(", ")}]`,
        );

        let unlockedCount = 0;
        let skippedCount = 0;
        let alreadyUnlockedCount = 0;

        set((state) => ({
          roadmaps: state.roadmaps.map((map) => {
            if (map.id !== roadmapId) return map;

            const updatedNodes = map.nodes.map((node) => {
              if (!childrenIds.includes(node.id)) return node;

              console.log(
                `\n[Store] 🔎 Checking child: ${node.id} (${node.label})`,
              );
              console.log(`[Store]    Current status: ${node.status}`);

              const canUnlock = canUnlockNode(node.id, map.nodes, edges);

              if (canUnlock && node.status === "locked") {
                console.log(
                  `[Store] ✅ UNLOCKING: ${node.id} - All parents completed`,
                );
                unlockedCount++;
                return {
                  ...node,
                  status: "unlocked" as NodeStatus,
                };
              } else if (!canUnlock) {
                console.log(
                  `[Store] ⏸️ SKIPPING: ${node.id} - Not all parents completed`,
                );
                skippedCount++;
              } else {
                console.log(
                  `[Store] ℹ️ ALREADY: ${node.id} - Status: ${node.status}`,
                );
                alreadyUnlockedCount++;
              }

              return node;
            });

            console.log(`
╔════════════════════════════════════════════════════════════╗
║            📊 UNLOCK SUMMARY                               ║
╠════════════════════════════════════════════════════════════╣
║  ✅ Unlocked:           ${unlockedCount}
║  ⏸️  Skipped:            ${skippedCount}
║  ℹ️  Already Unlocked:   ${alreadyUnlockedCount}
╚════════════════════════════════════════════════════════════╝
            `);

            return { ...map, nodes: updatedNodes };
          }),
          stateVersion: state.stateVersion + 1, // ✅ CRITICAL: Force re-render
        }));
      },

      completeNode: (roadmapId, nodeId) => {
        console.log(
          `[Store] 🎯 COMPLETING NODE: ${nodeId} in roadmap ${roadmapId}`,
        );

        // Update status to completed
        get().updateNodeStatus(roadmapId, nodeId, "completed");

        // Small delay to ensure state is updated
        setTimeout(() => {
          get().unlockNextNode(roadmapId, nodeId);
        }, 100);
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
            stateVersion: state.stateVersion + 1,
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

      forceUpdate: () => {
        console.log("[Store] 🔄 Force updating state");
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

export const selectStateVersion = (state: RoadmapStore) => state.stateVersion;

export const selectForceUpdate = (state: RoadmapStore) => state.forceUpdate;

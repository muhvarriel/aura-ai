import { Node, Edge } from "@xyflow/react";
import { RoadmapNode } from "@/core/entities/roadmap";

const NODE_WIDTH = 250;
const NODE_HEIGHT = 100;
const X_GAP = 50;
const Y_GAP = 150;

/**
 * Mengubah data RoadmapNode[] dari Entity kita menjadi Node[] & Edge[] milik React Flow.
 * Algoritma layout sederhana: Vertical Tree.
 */
export function getGraphLayout(
  nodes: RoadmapNode[],
  onNodeClick: (id: string) => void,
) {
  const reactFlowNodes: Node[] = [];
  const reactFlowEdges: Edge[] = [];

  // Peta level untuk mengatur posisi Y (vertical)
  // Level 0 = Root, Level 1 = Children of Root, dst.
  const nodeLevels: Record<string, number> = {};
  const levelCounts: Record<number, number> = {};

  // 1. Tentukan Level setiap node (BFS traversal sederhana)
  // Asumsi node pertama adalah root
  if (nodes.length > 0) {
    const queue: { id: string; level: number }[] = [
      { id: nodes[0].id, level: 0 },
    ];

    const processed = new Set<string>();

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (processed.has(id)) continue;
      processed.add(id);

      nodeLevels[id] = level;
      levelCounts[level] = (levelCounts[level] || 0) + 1;

      const node = nodes.find((n) => n.id === id);
      if (node) {
        node.childrenIds.forEach((childId) => {
          queue.push({ id: childId, level: level + 1 });

          // Buat Edge (Garis)
          reactFlowEdges.push({
            id: `e-${id}-${childId}`,
            source: id,
            target: childId,
            animated: node.status === "completed", // Garis bergerak jika sudah selesai
            style: {
              stroke: node.status === "locked" ? "#e4e4e7" : "#3b82f6",
              strokeWidth: 2,
            },
          });
        });
      }
    }
  }

  // 2. Buat Node dengan posisi X, Y
  const currentLevelCount: Record<number, number> = {};

  nodes.forEach((node) => {
    const level = nodeLevels[node.id] || 0;
    const indexInLevel = currentLevelCount[level] || 0;
    currentLevelCount[level] = indexInLevel + 1;

    // Hitung posisi X agar centered
    const totalInThisLevel = levelCounts[level] || 1;
    const totalWidth = totalInThisLevel * (NODE_WIDTH + X_GAP);
    const startX = -(totalWidth / 2);

    const position = {
      x: startX + indexInLevel * (NODE_WIDTH + X_GAP) + NODE_WIDTH / 2,
      y: level * Y_GAP + 50,
    };

    reactFlowNodes.push({
      id: node.id,
      type: "custom", // Harus match dengan nodeTypes di komponen Graph
      position,
      data: {
        label: node.label,
        status: node.status,
        description: node.description,
        onNodeClick: () => onNodeClick(node.id),
      },
    });
  });

  return { reactFlowNodes, reactFlowEdges };
}

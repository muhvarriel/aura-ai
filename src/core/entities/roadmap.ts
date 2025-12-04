// Tipe status node untuk gamifikasi sederhana
export type NodeStatus = "locked" | "unlocked" | "completed";

// Struktur data untuk satu titik materi (Node)
export interface RoadmapNode {
  id: string;
  label: string; // Judul singkat yang muncul di bulatan graph
  description: string; // Deskripsi singkat 1-2 kalimat
  status: NodeStatus;
  parentId?: string; // Untuk mengetahui node ini cabang dari mana
  childrenIds: string[]; // Untuk rendering garis konektor (Edges)

  // Metadata tambahan untuk AI context
  estimatedTime?: string; // misal: "15 menit"
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
}

// Struktur data utama Roadmap
export interface Roadmap {
  id: string; // Unique ID (UUID)
  topic: string; // Input user, misal: "Belajar Docker"
  nodes: RoadmapNode[]; // Array flat dari semua node
  createdAt: number; // Timestamp
  progress: number; // Persentase 0-100
}

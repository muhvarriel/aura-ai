"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Sparkles } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { motion } from "framer-motion";

import { useRoadmapStore } from "@/infrastructure/store/roadmap-store";
import RoadmapGraph from "@/presentation/features/roadmap/RoadmapGraph";
import ContentDrawer from "@/presentation/features/learning/ContentDrawer";
import { useStore } from "@/presentation/hooks/useStore";
import {
  LearningContent,
  QuizOption,
  QuizQuestion,
} from "@/core/entities/quiz";

// --- Type Definitions untuk Menghindari "any" ---
interface RawQuizItem {
  question?: string;
  pertanyaan?: string;
  options?: string[];
  pilihan?: string[];
  answer?: string;
  jawaban?: string;
  explanation?: string;
}

interface ApiContentResponse {
  data: {
    markdownContent: string;
    quiz: RawQuizItem[];
  };
  error?: string;
}

// Wrapper Component agar ReactFlowProvider bekerja
const RoadmapPageContent = ({ paramsId }: { paramsId: string }) => {
  const router = useRouter();

  // Hydration-safe Store Access
  const roadmap = useStore(useRoadmapStore, (state) =>
    state.roadmaps.find((r) => r.id === paramsId),
  );
  const unlockNext = useRoadmapStore((state) => state.unlockNextNode);
  const updateStatus = useRoadmapStore((state) => state.updateNodeStatus);
  const cacheContent = useRoadmapStore((state) => state.cacheContent);
  const getCachedContent = useRoadmapStore((state) => state.getContent);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentNode =
    roadmap?.nodes.find((n) => n.id === selectedNodeId) || null;

  // Handle Node Click
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsDrawerOpen(true);
  };

  const fetchContent = async (
    topic: string,
    nodeTitle: string,
  ): Promise<LearningContent | null> => {
    if (!selectedNodeId) return null;

    // 1. Check Cache First
    const cached = getCachedContent(selectedNodeId);
    if (cached) return cached;

    // 2. Call API
    try {
      const res = await fetch("/api/roadmap/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, moduleTitle: nodeTitle }),
      });

      const json = (await res.json()) as ApiContentResponse;
      if (!res.ok) throw new Error(json.error || "Unknown error");

      // --- DATA TRANSFORMATION START ---
      const rawQuiz = json.data.quiz || [];

      // Map AI's simple format to our complex Entity format
      const mappedQuizzes: QuizQuestion[] = rawQuiz.map(
        (q: RawQuizItem, index: number) => {
          // Handle AI using Indonesian keys ("pertanyaan", "pilihan", "jawaban")
          const questionText =
            q.question || q.pertanyaan || "Pertanyaan tanpa teks";
          const rawOptions = q.options || q.pilihan || [];
          const correctAnswer = q.answer || q.jawaban || "";

          const options: QuizOption[] = Array.isArray(rawOptions)
            ? rawOptions.map((optText: string, optIndex: number) => ({
                id: `opt-${index}-${optIndex}`,
                text: optText,
                // Check if this option text matches the correct answer string
                isCorrect:
                  optText.toLowerCase().trim() ===
                  correctAnswer.toLowerCase().trim(),
              }))
            : [];

          return {
            id: `q-${index}`,
            question: questionText,
            explanation:
              q.explanation || "Jawaban yang benar adalah: " + correctAnswer,
            options: options,
          };
        },
      );
      // --- DATA TRANSFORMATION END ---

      const content: LearningContent = {
        nodeId: selectedNodeId,
        title: nodeTitle,
        markdownContent: json.data.markdownContent,
        quizzes: mappedQuizzes,
      };

      cacheContent(selectedNodeId, content);
      return content;
    } catch (e) {
      console.error("Fetch Error:", e);
      return null;
    }
  };

  // Function Inject: Quiz Complete
  const handleQuizComplete = (score: number) => {
    if (!selectedNodeId || !roadmap) return;

    // Mark as Completed
    updateStatus(roadmap.id, selectedNodeId, "completed");

    // Unlock Next Node Logic
    unlockNext(roadmap.id, selectedNodeId);
  };

  if (!roadmap) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white text-black font-serif text-xl">
        <span className="animate-pulse">_Loading Roadmap_</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white font-sans text-black overflow-hidden">
      {/* --- Aura Header Style --- */}
      <header className="absolute top-0 left-0 w-full px-6 py-6 flex items-start justify-between z-40 pointer-events-none">
        {/* Left: Back & Title Group */}
        <div className="flex flex-col items-start gap-4 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="h-10 w-10 flex items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-black hover:border-black hover:text-white transition-colors shadow-sm"
          >
            <ArrowLeft size={18} />
          </motion.button>

          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-100 shadow-sm max-w-md">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-neutral-400" />
              <span className="text-xs font-bold tracking-widest uppercase text-neutral-400">
                Current Path
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-medium leading-tight text-black mb-3">
              {roadmap.topic}
            </h1>

            {/* Editorial Progress Bar */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[2px] bg-neutral-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${roadmap.progress}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                  className="h-full bg-black"
                />
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {roadmap.progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Right: Menu Action */}
        <div className="pointer-events-auto">
          <motion.button
            whileHover={{ rotate: 90 }}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors shadow-lg"
          >
            <MoreHorizontal size={20} />
          </motion.button>
        </div>
      </header>

      {/* --- Graph Canvas --- */}
      {/* Container background is white to match Aura */}
      <div className="flex-1 w-full h-full relative bg-white">
        <RoadmapGraph nodes={roadmap.nodes} onNodeClick={handleNodeClick} />

        {/* Background decoration/pattern could be added inside RoadmapGraph or here */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] opacity-40 -z-10" />
      </div>

      {/* --- Learning Drawer --- */}
      {/* 
          Note: ContentDrawer should ideally be styled internally to match Aura 
          (white background, serif headings). Passing generic props here.
      */}
      <ContentDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        node={currentNode}
        topic={roadmap.topic}
        fetchContent={fetchContent}
        onQuizComplete={handleQuizComplete}
      />
    </div>
  );
};

export default function RoadmapPage() {
  const params = useParams();
  // Pastikan ID valid string
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) return null;

  return (
    <ReactFlowProvider>
      <RoadmapPageContent paramsId={id} />
    </ReactFlowProvider>
  );
}

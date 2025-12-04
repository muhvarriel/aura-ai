"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MoreHorizontal, Sparkles } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { motion } from "framer-motion";

import {
  useRoadmapStore,
  selectRoadmapById,
  selectHasHydrated,
  selectUnlockNext,
  selectUpdateStatus,
  selectCacheContent,
  selectGetContent,
} from "@/infrastructure/store/roadmap-store";
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
  const abortControllerRef = useRef<AbortController | null>(null);

  // FIX: Manual hydration tracking
  const hasHydrated = useRoadmapStore(selectHasHydrated);

  // FIX: Trigger manual rehydration di client
  useEffect(() => {
    const unsubHydrate = useRoadmapStore.persist.onFinishHydration(() => {
      useRoadmapStore.getState().setHasHydrated(true);
    });

    // Immediate trigger untuk rehydrate
    useRoadmapStore.persist.rehydrate();

    return () => {
      unsubHydrate();
    };
  }, []);

  // FIX: Optimized selectors - stable reference
  const roadmap = useStore(
    useRoadmapStore,
    useCallback(selectRoadmapById(paramsId), [paramsId])
  );

  // FIX: Stable action references (tidak re-create tiap render)
  const unlockNext = useRoadmapStore(selectUnlockNext);
  const updateStatus = useRoadmapStore(selectUpdateStatus);
  const cacheContent = useRoadmapStore(selectCacheContent);
  const getCachedContent = useRoadmapStore(selectGetContent);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentNode =
    roadmap?.nodes.find((n) => n.id === selectedNodeId) || null;

  // FIX: Stabilize callback dengan useCallback (dependencies kosong)
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsDrawerOpen(true);
  }, []); // Stable reference - tidak pernah berubah

  // FIX: Stable fetchContent dengan useCallback
  const fetchContent = useCallback(
    async (
      topic: string,
      nodeTitle: string
    ): Promise<LearningContent | null> => {
      if (!selectedNodeId) return null;

      // 1. Check Cache First
      const cached = getCachedContent(selectedNodeId);
      if (cached) return cached;

      // 2. Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 3. Create new AbortController
      abortControllerRef.current = new AbortController();

      // 4. Call API with abort signal
      try {
        const res = await fetch("/api/roadmap/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, moduleTitle: nodeTitle }),
          signal: abortControllerRef.current.signal, // FIX: Add abort support
        });

        const json = (await res.json()) as ApiContentResponse;
        if (!res.ok) throw new Error(json.error || "Unknown error");

        // --- DATA TRANSFORMATION START ---
        const rawQuiz = json.data.quiz || [];

        // Map AI's simple format to our complex Entity format
        const mappedQuizzes: QuizQuestion[] = rawQuiz.map(
          (q: RawQuizItem, index: number) => {
            const questionText =
              q.question || q.pertanyaan || "Pertanyaan tanpa teks";
            const rawOptions = q.options || q.pilihan || [];
            const correctAnswer = q.answer || q.jawaban || "";

            const options: QuizOption[] = Array.isArray(rawOptions)
              ? rawOptions.map((optText: string, optIndex: number) => ({
                id: `opt-${index}-${optIndex}`,
                text: optText,
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
          }
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
      } catch (error) {
        // FIX: Ignore AbortError (normal cancellation)
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request cancelled:", nodeTitle);
          return null;
        }
        console.error("Fetch Error:", error);
        return null;
      }
    },
    [selectedNodeId, getCachedContent, cacheContent]
  );

  // FIX: Stable quiz completion handler
  const handleQuizComplete = useCallback(
    (score: number) => {
      if (!selectedNodeId || !roadmap) return;

      // Mark as Completed
      updateStatus(roadmap.id, selectedNodeId, "completed");

      // Unlock Next Node Logic
      unlockNext(roadmap.id, selectedNodeId);
    },
    [selectedNodeId, roadmap, updateStatus, unlockNext]
  );

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // FIX: Show loading skeleton saat belum hydrated
  if (!hasHydrated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white text-black font-serif text-xl">
        <div className="text-center space-y-4">
          <div className="inline-block animate-pulse">
            <Sparkles size={32} className="text-neutral-400" />
          </div>
          <p className="text-neutral-600 italic">_Restoring your journey_</p>
        </div>
      </div>
    );
  }

  // Check roadmap setelah hydrated
  if (!roadmap) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white text-black font-serif text-xl">
        <div className="text-center space-y-4">
          <p className="text-neutral-800">Roadmap not found</p>
          <button
            onClick={() => router.push("/")}
            className="text-sm border-b border-black hover:opacity-60 transition-opacity"
          >
            Back to Home
          </button>
        </div>
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
      <div className="flex-1 w-full h-full relative bg-white">
        <RoadmapGraph nodes={roadmap.nodes} onNodeClick={handleNodeClick} />

        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] opacity-40 -z-10" />
      </div>

      {/* --- Learning Drawer --- */}
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
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  if (!id) return null;

  return (
    <ReactFlowProvider>
      <RoadmapPageContent paramsId={id} />
    </ReactFlowProvider>
  );
}

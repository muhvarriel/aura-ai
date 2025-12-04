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

// --- Type Definitions ---

/**
 * Raw quiz option from API (can be string or structured object)
 */
type RawQuizOption =
  | string
  | {
      id?: string;
      text?: string;
      isCorrect?: boolean;
    };

/**
 * Raw quiz item from API - handles both legacy and new format
 */
interface RawQuizItem {
  // Question field (multiple possible keys)
  question?: string;
  pertanyaan?: string;

  // Options field (multiple possible keys and formats)
  options?: RawQuizOption[];
  pilihan?: RawQuizOption[];

  // Answer field (for legacy format)
  answer?: string;
  jawaban?: string;

  // Explanation field
  explanation?: string;
  penjelasan?: string;
}

/**
 * API response structure
 */
interface ApiContentResponse {
  data: {
    markdownContent: string;
    quiz: RawQuizItem[];
  };
  error?: string;
}

/**
 * Type guard to check if value is a non-empty string
 */
function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard to check if value is a structured option object
 */
function isStructuredOption(
  value: unknown,
): value is { id?: string; text?: string; isCorrect?: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as { text?: unknown }).text === "string"
  );
}

/**
 * Transform raw quiz options to QuizOption[]
 * FIX: Handle both string[] and structured object[] formats
 */
function transformQuizOptions(
  rawOptions: RawQuizOption[] | undefined,
  correctAnswer: string,
  questionIndex: number,
): QuizOption[] {
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    return [];
  }

  const normalizedCorrectAnswer = correctAnswer.toLowerCase().trim();

  return rawOptions
    .map((opt, optIndex): QuizOption | null => {
      // Case 1: Structured option object { id, text, isCorrect }
      if (isStructuredOption(opt)) {
        return {
          id: opt.id || `opt-${questionIndex}-${optIndex}`,
          text: opt.text || "",
          isCorrect: opt.isCorrect ?? false,
        };
      }

      // Case 2: Simple string option
      if (isValidString(opt)) {
        const normalizedOption = opt.toLowerCase().trim();

        return {
          id: `opt-${questionIndex}-${optIndex}`,
          text: opt,
          isCorrect:
            normalizedOption === normalizedCorrectAnswer ||
            normalizedOption.includes(normalizedCorrectAnswer) ||
            normalizedCorrectAnswer.includes(normalizedOption),
        };
      }

      // Case 3: Invalid option - skip
      console.warn(
        `[Quiz Transform] Invalid option at index ${optIndex}:`,
        opt,
      );
      return null;
    })
    .filter((opt): opt is QuizOption => opt !== null);
}

/**
 * Transform raw quiz data to QuizQuestion[]
 * FIX: Robust transformation with multiple fallbacks
 */
function transformQuizData(rawQuiz: RawQuizItem[]): QuizQuestion[] {
  if (!Array.isArray(rawQuiz) || rawQuiz.length === 0) {
    console.warn("[Quiz Transform] No quiz data provided");
    return [];
  }

  return rawQuiz
    .map((q, index): QuizQuestion | null => {
      // Extract question text
      const questionText = q.question || q.pertanyaan;
      if (!isValidString(questionText)) {
        console.warn(`[Quiz Transform] Invalid question at index ${index}:`, q);
        return null;
      }

      // Extract options (try multiple keys)
      const rawOptions = q.options || q.pilihan;

      // Extract correct answer (for legacy format)
      const correctAnswer = q.answer || q.jawaban || "";

      // Transform options
      const options = transformQuizOptions(rawOptions, correctAnswer, index);

      if (options.length === 0) {
        console.warn(`[Quiz Transform] No valid options for question ${index}`);
        return null;
      }

      // Extract explanation
      const explanation =
        q.explanation ||
        q.penjelasan ||
        (correctAnswer
          ? `Jawaban yang benar adalah: ${correctAnswer}`
          : "Tidak ada penjelasan tersedia");

      return {
        id: `q-${index}`,
        question: questionText,
        explanation,
        options,
      };
    })
    .filter((q): q is QuizQuestion => q !== null);
}

// --- Main Component ---

const RoadmapPageContent = ({ paramsId }: { paramsId: string }) => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Hydration tracking
  const hasHydrated = useRoadmapStore(selectHasHydrated);

  // Trigger rehydration
  useEffect(() => {
    const unsubHydrate = useRoadmapStore.persist.onFinishHydration(() => {
      useRoadmapStore.getState().setHasHydrated(true);
    });

    useRoadmapStore.persist.rehydrate();

    return () => {
      unsubHydrate();
    };
  }, []);

  // Selectors
  const roadmap = useStore(
    useRoadmapStore,
    useCallback(selectRoadmapById(paramsId), [paramsId]),
  );

  const unlockNext = useRoadmapStore(selectUnlockNext);
  const updateStatus = useRoadmapStore(selectUpdateStatus);
  const cacheContent = useRoadmapStore(selectCacheContent);
  const getCachedContent = useRoadmapStore(selectGetContent);

  // Local state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const currentNode =
    roadmap?.nodes.find((n) => n.id === selectedNodeId) || null;

  // Node click handler
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsDrawerOpen(true);
  }, []);

  // Content fetcher with robust transformation
  const fetchContent = useCallback(
    async (
      topic: string,
      nodeTitle: string,
    ): Promise<LearningContent | null> => {
      if (!selectedNodeId) {
        console.warn("[Fetch Content] No node selected");
        return null;
      }

      // 1. Check cache first
      const cached = getCachedContent(selectedNodeId);
      if (cached) {
        console.log(`[Fetch Content] Using cached content for: ${nodeTitle}`);
        return cached;
      }

      // 2. Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 3. Create new AbortController
      abortControllerRef.current = new AbortController();

      // 4. Fetch from API
      try {
        console.log(`[Fetch Content] Fetching: ${nodeTitle}`);

        const res = await fetch("/api/roadmap/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, moduleTitle: nodeTitle }),
          signal: abortControllerRef.current.signal,
        });

        const json = (await res.json()) as ApiContentResponse;

        if (!res.ok) {
          throw new Error(json.error || "Failed to fetch content");
        }

        // 5. Validate response structure
        if (!json.data || typeof json.data.markdownContent !== "string") {
          throw new Error("Invalid API response structure");
        }

        // 6. Transform quiz data with new robust function
        const mappedQuizzes = transformQuizData(json.data.quiz || []);

        console.log(
          `[Fetch Content] Successfully transformed ${mappedQuizzes.length} quiz questions`,
        );

        // 7. Create content object
        const content: LearningContent = {
          nodeId: selectedNodeId,
          title: nodeTitle,
          markdownContent: json.data.markdownContent,
          quizzes: mappedQuizzes,
        };

        // 8. Cache and return
        cacheContent(selectedNodeId, content);
        return content;
      } catch (error) {
        // Handle abort (normal cancellation)
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`[Fetch Content] Request cancelled: ${nodeTitle}`);
          return null;
        }

        // Log other errors
        console.error("[Fetch Content] Error:", error);

        // Re-throw for ContentDrawer to handle
        throw error;
      }
    },
    [selectedNodeId, getCachedContent, cacheContent],
  );

  // Quiz completion handler
  const handleQuizComplete = useCallback(
    (score: number) => {
      if (!selectedNodeId || !roadmap) {
        console.warn("[Quiz Complete] Missing required data");
        return;
      }

      console.log(`[Quiz Complete] Node: ${selectedNodeId}, Score: ${score}`);

      // Mark as completed
      updateStatus(roadmap.id, selectedNodeId, "completed");

      // Unlock next node
      unlockNext(roadmap.id, selectedNodeId);
    },
    [selectedNodeId, roadmap, updateStatus, unlockNext],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Loading state (before hydration)
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

  // Roadmap not found
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

  // Main UI
  return (
    <div className="h-screen w-screen flex flex-col bg-white font-sans text-black overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 w-full px-6 py-6 flex items-start justify-between z-40 pointer-events-none">
        {/* Left: Back & Title */}
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

            {/* Progress bar */}
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

        {/* Right: Menu */}
        <div className="pointer-events-auto">
          <motion.button
            whileHover={{ rotate: 90 }}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-colors shadow-lg"
          >
            <MoreHorizontal size={20} />
          </motion.button>
        </div>
      </header>

      {/* Graph Canvas */}
      <div className="flex-1 w-full h-full relative bg-white">
        <RoadmapGraph nodes={roadmap.nodes} onNodeClick={handleNodeClick} />

        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px] opacity-40 -z-10" />
      </div>

      {/* Learning Drawer */}
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

// Root component with ReactFlowProvider
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

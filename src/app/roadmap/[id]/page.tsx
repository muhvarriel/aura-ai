"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MoreHorizontal,
  Sparkles,
  Home,
  Share2,
  Download,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";

import {
  useRoadmapStore,
  selectRoadmapById,
  selectHasHydrated,
  selectCompleteNode,
  selectCacheContent,
  selectGetContent,
  selectStateVersion,
} from "@/infrastructure/store/roadmap-store";
import RoadmapGraph from "@/presentation/features/roadmap/RoadmapGraph";
import ContentDrawer from "@/presentation/features/learning/ContentDrawer";
import { useStore } from "@/presentation/hooks/useStore";
import {
  LearningContent,
  QuizOption,
  QuizQuestion,
} from "@/core/entities/quiz";

/**
 * ═══════════════════════════════════════════════════════════════
 * ROADMAP PAGE - FIXED STATE MANAGEMENT
 * ═══════════════════════════════════════════════════════════════
 */

// --- Type Definitions ---

type RawQuizOption =
  | string
  | {
      id?: string;
      text?: string;
      isCorrect?: boolean;
    };

interface RawQuizItem {
  question?: string;
  pertanyaan?: string;
  options?: RawQuizOption[];
  pilihan?: RawQuizOption[];
  answer?: string;
  jawaban?: string;
  explanation?: string;
  penjelasan?: string;
}

interface ApiContentResponse {
  data: {
    markdownContent: string;
    quiz: RawQuizItem[];
  };
  error?: string;
}

function isValidString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

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
      if (isStructuredOption(opt)) {
        return {
          id: opt.id || `opt-${questionIndex}-${optIndex}`,
          text: opt.text || "",
          isCorrect: opt.isCorrect ?? false,
        };
      }

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

      console.warn(
        `[Quiz Transform] Invalid option at index ${optIndex}:`,
        opt,
      );
      return null;
    })
    .filter((opt): opt is QuizOption => opt !== null);
}

function transformQuizData(rawQuiz: RawQuizItem[]): QuizQuestion[] {
  if (!Array.isArray(rawQuiz) || rawQuiz.length === 0) {
    console.warn("[Quiz Transform] No quiz data provided");
    return [];
  }

  return rawQuiz
    .map((q, index): QuizQuestion | null => {
      const questionText = q.question || q.pertanyaan;
      if (!isValidString(questionText)) {
        console.warn(`[Quiz Transform] Invalid question at index ${index}:`, q);
        return null;
      }

      const rawOptions = q.options || q.pilihan;
      const correctAnswer = q.answer || q.jawaban || "";
      const options = transformQuizOptions(rawOptions, correctAnswer, index);

      if (options.length === 0) {
        console.warn(`[Quiz Transform] No valid options for question ${index}`);
        return null;
      }

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

function generateCacheKey(nodeId: string): string {
  return `content::${nodeId}`;
}

/**
 * Loading Component
 */
const LoadingState: React.FC = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-white to-neutral-50 text-black">
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-6"
    >
      <motion.div
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-black to-neutral-700 text-white shadow-2xl"
      >
        <Sparkles size={36} />
      </motion.div>

      <div className="space-y-2">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-serif text-2xl text-neutral-800 font-medium"
        >
          Restoring your journey
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2"
        >
          <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
          <span className="text-sm text-neutral-500 italic">
            Loading roadmap...
          </span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-64 h-2 bg-neutral-200 rounded-full overflow-hidden"
      >
        <motion.div
          className="h-full bg-gradient-to-r from-black via-neutral-600 to-black"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: "50%" }}
        />
      </motion.div>
    </motion.div>
  </div>
);

/**
 * Not Found Component
 */
const NotFoundState: React.FC<{ onBackClick: () => void }> = ({
  onBackClick,
}) => (
  <div className="h-screen w-screen flex items-center justify-center bg-white text-black">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6 max-w-md px-6"
    >
      <div className="text-8xl font-serif text-neutral-200">404</div>
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-neutral-800 font-medium">
          Roadmap not found
        </h1>
        <p className="text-neutral-500 leading-relaxed">
          The learning path you&apos;re looking for doesn&apos;t exist or has
          been removed.
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBackClick}
        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-neutral-800 transition-colors shadow-lg"
      >
        <Home size={18} />
        Back to Home
      </motion.button>
    </motion.div>
  </div>
);

/**
 * Quiz completion success toast
 */
const QuizSuccessToast: React.FC<{
  show: boolean;
  nodeName: string;
}> = ({ show, nodeName }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed top-24 right-6 z-[60] bg-gradient-to-br from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-emerald-400"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", damping: 15 }}
        >
          <CheckCircle2 size={28} />
        </motion.div>
        <div>
          <p className="font-bold text-lg">Quiz Completed!</p>
          <p className="text-sm opacity-95">
            {nodeName} - Next nodes unlocked 🎉
          </p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

/**
 * Menu Dropdown
 */
const MenuDropdown: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-14 right-6 z-50 bg-white/95 backdrop-blur-xl border-2 border-neutral-200 rounded-2xl shadow-2xl overflow-hidden min-w-[220px]"
        >
          <div className="py-2">
            <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-neutral-50 transition-colors text-sm font-medium text-neutral-700 hover:text-black">
              <Share2 size={16} />
              <span>Share Progress</span>
            </button>
            <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-neutral-50 transition-colors text-sm font-medium text-neutral-700 hover:text-black">
              <Download size={16} />
              <span>Export PDF</span>
            </button>
            <div className="my-1 border-t border-neutral-100" />
            <button className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-neutral-50 transition-colors text-sm font-medium text-neutral-700 hover:text-black">
              <Home size={16} />
              <span>Dashboard</span>
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// --- Main Component ---

const RoadmapPageContent = ({ paramsId }: { paramsId: string }) => {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Hydration tracking
  const hasHydrated = useRoadmapStore(selectHasHydrated);

  // ✅ Subscribe to state version
  const stateVersion = useRoadmapStore(selectStateVersion);

  const params = useParams();
  const roadmapId = params.id as string;

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
    useCallback((state) => selectRoadmapById(paramsId)(state), [paramsId]),
  );

  const completeNode = useRoadmapStore(selectCompleteNode);
  const cacheContent = useRoadmapStore(selectCacheContent);
  const getCachedContent = useRoadmapStore(selectGetContent);

  const currentNode =
    roadmap?.nodes.find((n) => n.id === selectedNodeId) || null;

  // ✅ Log state version changes
  useEffect(() => {
    console.log(`[RoadmapPage] 🔄 State version updated: ${stateVersion}`);
  }, [stateVersion]);

  // ✅ NEW: Log node status changes
  useEffect(() => {
    if (roadmap) {
      const statusMap = roadmap.nodes.map((n) => `${n.id}:${n.status}`);
      console.log("[RoadmapPage] 📊 Node status map:", statusMap);
    }
  }, [roadmap?.nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Node click handler
  const handleNodeClick = useCallback((nodeId: string) => {
    console.log(`[RoadmapPage] 🖱️ Node clicked: ${nodeId}`);
    setSelectedNodeId(nodeId);
    setIsDrawerOpen(true);
  }, []);

  // Content fetcher
  const fetchContent = useCallback(
    async (
      topic: string,
      nodeTitle: string,
    ): Promise<LearningContent | null> => {
      if (!selectedNodeId) {
        console.warn("[Fetch Content] ⚠️ No node selected");
        return null;
      }

      const cacheKey = generateCacheKey(selectedNodeId);
      const cached = getCachedContent(cacheKey);
      if (cached) {
        console.log(
          `[Fetch Content] ✅ Using cached content for: ${nodeTitle} (node: ${selectedNodeId})`,
        );
        return cached;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      try {
        console.log(`[Fetch Content] 🔄 Fetching new content:`, {
          topic,
          nodeTitle,
          nodeId: selectedNodeId,
          cacheKey,
        });

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

        if (!json.data || typeof json.data.markdownContent !== "string") {
          throw new Error("Invalid API response structure");
        }

        const mappedQuizzes = transformQuizData(json.data.quiz || []);

        console.log(
          `[Fetch Content] ✅ Successfully transformed ${mappedQuizzes.length} quiz questions`,
        );

        const content: LearningContent = {
          nodeId: selectedNodeId,
          title: nodeTitle,
          markdownContent: json.data.markdownContent,
          quizzes: mappedQuizzes,
        };

        cacheContent(cacheKey, content);
        return content;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log(`[Fetch Content] ⏸️ Request cancelled: ${nodeTitle}`);
          return null;
        }

        console.error("[Fetch Content] ❌ Error:", error);
        throw error;
      }
    },
    [selectedNodeId, getCachedContent, cacheContent],
  );

  // ✅ Quiz completion handler with logging
  const handleQuizComplete = useCallback(
    (score: number) => {
      if (!selectedNodeId || !roadmap) {
        console.warn("[Quiz Complete] ⚠️ Missing required data");
        return;
      }

      const currentNodeLabel =
        roadmap.nodes.find((n) => n.id === selectedNodeId)?.label ||
        "Unknown Node";

      console.log(`
╔════════════════════════════════════════════════════════════╗
║            🎯 QUIZ COMPLETED [PAGE HANDLER]                ║
╠════════════════════════════════════════════════════════════╣
║  Node:    ${selectedNodeId}
║  Label:   ${currentNodeLabel}
║  Score:   ${score}%
║  State:   v${stateVersion}
╚════════════════════════════════════════════════════════════╝
      `);

      // Complete node (this will trigger unlock in store)
      console.log("[Quiz Complete] 🎯 Calling completeNode...");
      completeNode(roadmap.id, selectedNodeId);

      // Show success toast
      setTimeout(() => {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }, 300);

      console.log(
        `[Quiz Complete] ✅ Node marked as completed, unlock process triggered`,
      );
    },
    [selectedNodeId, roadmap, completeNode, stateVersion],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Loading state
  if (!hasHydrated) {
    return <LoadingState />;
  }

  // Not found state
  if (!roadmap) {
    return <NotFoundState onBackClick={() => router.push("/")} />;
  }

  // Main UI
  return (
    <div className="h-screen w-screen flex flex-col bg-white font-sans text-black overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-neutral-50 to-white -z-10" />

      {/* Success Toast */}
      <QuizSuccessToast
        show={showSuccessToast}
        nodeName={currentNode?.label || "Node"}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 w-full px-6 py-6 flex items-start justify-between z-40 pointer-events-none">
        {/* Left: Back & Title */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: "spring", damping: 20 }}
          className="flex flex-col items-start gap-4 pointer-events-auto"
        >
          <motion.button
            whileHover={{ scale: 1.05, rotate: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/")}
            className="h-12 w-12 flex items-center justify-center rounded-full border-2 border-neutral-200 bg-white/95 backdrop-blur-sm hover:bg-black hover:border-black hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <ArrowLeft size={20} />
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", damping: 20 }}
            className="glass p-5 rounded-3xl border-2 border-neutral-100 shadow-2xl max-w-md backdrop-blur-xl bg-white/95"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 mb-2"
            >
              <Sparkles size={14} className="text-neutral-500" />
              <span className="text-xs font-bold tracking-widest uppercase text-neutral-500">
                Current Path
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-serif text-2xl md:text-3xl font-semibold leading-tight text-black mb-4"
            >
              {roadmap.topic}
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="flex-1 h-3 bg-neutral-100 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  key={`progress-${roadmap.progress}-${stateVersion}`} // ✅ Add stateVersion to key
                  initial={{ width: 0 }}
                  animate={{ width: `${roadmap.progress}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full rounded-full relative"
                  style={{
                    background:
                      "linear-gradient(90deg, #10b981 0%, #059669 100%)",
                  }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </motion.div>
              </div>
              <motion.span
                key={`progress-text-${roadmap.progress}-${stateVersion}`} // ✅ Add stateVersion to key
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm font-mono font-bold text-neutral-700 min-w-[50px] text-right"
              >
                {roadmap.progress}%
              </motion.span>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Right: Menu */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, type: "spring", damping: 20 }}
          className="pointer-events-auto relative"
        >
          <motion.button
            whileHover={{ rotate: 90, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-all duration-300 shadow-2xl hover:shadow-xl"
          >
            <MoreHorizontal size={22} />
          </motion.button>

          <MenuDropdown
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
          />
        </motion.div>
      </header>

      {/* ✅ Graph Canvas - NO key prop, rely on stateVersion in RoadmapGraph */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="flex-1 w-full h-full relative"
      >
        <RoadmapGraph
          nodes={roadmap.nodes}
          edges={roadmap.edges}
          onNodeClick={handleNodeClick}
          roadmapId={roadmapId}
        />
      </motion.div>

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

// Root component
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

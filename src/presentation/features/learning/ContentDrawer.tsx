import React, { useEffect, useState, useCallback, useRef } from "react";
import { X, Loader2, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownView } from "@/presentation/components/ui/MarkdownView";
import { QuizCard } from "./QuizCard";
import { LearningContent } from "@/core/entities/quiz";
import { RoadmapNode } from "@/core/entities/roadmap";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

interface ContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: RoadmapNode | null;
  topic: string;
  fetchContent: (
    topic: string,
    nodeTitle: string,
  ) => Promise<LearningContent | null>;
  onQuizComplete: (score: number) => void;
}

/**
 * Error state with type and message
 */
interface ErrorState {
  message: string;
  type: "network" | "generation" | "validation" | "unknown";
  retryable: boolean;
}

/**
 * Loading state types
 */
type LoadingState = "idle" | "loading" | "retrying" | "success" | "error";

// ==========================================
// COMPONENTS
// ==========================================

/**
 * Loading skeleton component
 */
const LoadingSkeleton = () => (
  <div className="p-8 md:p-10 space-y-6 animate-pulse">
    {/* Title skeleton */}
    <div className="h-8 bg-neutral-100 rounded-lg w-3/4"></div>

    {/* Paragraph skeletons */}
    <div className="space-y-3">
      <div className="h-4 bg-neutral-100 rounded w-full"></div>
      <div className="h-4 bg-neutral-100 rounded w-5/6"></div>
      <div className="h-4 bg-neutral-100 rounded w-4/5"></div>
    </div>

    <div className="space-y-3">
      <div className="h-4 bg-neutral-100 rounded w-full"></div>
      <div className="h-4 bg-neutral-100 rounded w-11/12"></div>
    </div>

    {/* Code block skeleton */}
    <div className="h-32 bg-neutral-100 rounded-lg"></div>

    <div className="space-y-3">
      <div className="h-4 bg-neutral-100 rounded w-full"></div>
      <div className="h-4 bg-neutral-100 rounded w-3/4"></div>
    </div>
  </div>
);

/**
 * Error display component with retry button
 */
const ErrorDisplay = ({
  error,
  retryCount,
  onRetry,
  onClose,
}: {
  error: ErrorState;
  retryCount: number;
  onRetry: () => void;
  onClose: () => void;
}) => {
  const maxRetries = 3;
  const canRetry = error.retryable && retryCount < maxRetries;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-6">
      <div className="p-4 rounded-full bg-red-50">
        <AlertCircle className="text-red-500" size={28} />
      </div>

      <div className="space-y-3 max-w-md">
        <h3 className="font-serif text-xl text-neutral-900">
          Failed to Load Content
        </h3>
        <p className="text-sm text-neutral-600">{error.message}</p>

        {retryCount > 0 && canRetry && (
          <p className="text-xs text-neutral-400">
            Retry attempt {retryCount}/{maxRetries}
          </p>
        )}

        {/* Helpful tips based on error type */}
        {error.type === "network" && (
          <p className="text-xs text-neutral-500 mt-2">
            💡 Check your internet connection and try again.
          </p>
        )}

        {error.type === "generation" && (
          <p className="text-xs text-neutral-500 mt-2">
            💡 The AI is having trouble generating content. Try a different
            module or retry in a moment.
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {canRetry && (
          <button
            onClick={onRetry}
            className="group flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-black text-black hover:bg-black hover:text-white transition-all"
          >
            <RefreshCw
              size={16}
              className="group-hover:rotate-180 transition-transform duration-500"
            />
            <span className="text-sm font-medium">Try Again</span>
          </button>
        )}

        {!canRetry && error.retryable && (
          <div className="text-center space-y-2">
            <p className="text-xs text-red-600 font-medium">
              Maximum retry attempts reached
            </p>
            <button
              onClick={onClose}
              className="text-xs text-neutral-500 hover:text-black transition-colors underline"
            >
              Close and try another module
            </button>
          </div>
        )}

        {!error.retryable && (
          <button
            onClick={onClose}
            className="text-sm text-neutral-500 hover:text-black transition-colors underline"
          >
            Close drawer
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function ContentDrawer({
  isOpen,
  onClose,
  node,
  topic,
  fetchContent,
  onQuizComplete,
}: ContentDrawerProps) {
  // State
  const [content, setContent] = useState<LearningContent | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<ErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchAttemptRef = useRef<number>(0);
  const lastFetchKeyRef = useRef<string>("");

  /**
   * Categorize error based on message
   */
  const categorizeError = useCallback((err: unknown): ErrorState => {
    if (!(err instanceof Error)) {
      return {
        message: "An unexpected error occurred. Please try again.",
        type: "unknown",
        retryable: true,
      };
    }

    const errorMsg = err.message.toLowerCase();

    // Network errors
    if (
      errorMsg.includes("network") ||
      errorMsg.includes("fetch failed") ||
      errorMsg.includes("connection")
    ) {
      return {
        message: "Network error. Please check your connection and try again.",
        type: "network",
        retryable: true,
      };
    }

    // Generation errors (from AI)
    if (
      errorMsg.includes("generation failed") ||
      errorMsg.includes("ai returned") ||
      errorMsg.includes("invalid json") ||
      errorMsg.includes("timeout")
    ) {
      return {
        message:
          "Failed to generate content. The AI is having trouble right now. Please retry.",
        type: "generation",
        retryable: true,
      };
    }

    // Validation errors
    if (errorMsg.includes("invalid") || errorMsg.includes("validation")) {
      return {
        message:
          "The content format is invalid. Please try again or choose another module.",
        type: "validation",
        retryable: true,
      };
    }

    // Generic error
    return {
      message: err.message || "Failed to load content. Please try again.",
      type: "unknown",
      retryable: true,
    };
  }, []);

  /**
   * Cleanup on unmount or close
   */
  useEffect(() => {
    if (!isOpen) {
      // Cancel any pending request when drawer closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // FIX: Reset ALL state when drawer closes to prevent stale content
      setContent(null);
      setLoadingState("idle");
      setError(null);
      setRetryCount(0);
      lastFetchKeyRef.current = "";
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  /**
   * Load data when node OR topic changes or drawer opens
   * FIX: Added topic to dependencies to refetch when syllabus changes
   */
  useEffect(() => {
    if (isOpen && node && topic) {
      // Create unique key for this fetch
      const fetchKey = `${topic}::${node.id}::${node.label}`;

      // FIX: Only refetch if key changed (prevents unnecessary refetch but allows topic change)
      if (fetchKey !== lastFetchKeyRef.current) {
        lastFetchKeyRef.current = fetchKey;

        // Reset states for new node/topic combination
        setContent(null);
        setError(null);
        setRetryCount(0);
        setLoadingState("idle");

        console.log("[ContentDrawer] Loading new content for:", {
          topic,
          nodeId: node.id,
          nodeLabel: node.label,
        });
        loadData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, node?.label, topic, isOpen]);

  /**
   * Load content with abort controller support
   */
  const loadData = useCallback(async () => {
    if (!node || !topic) {
      console.warn("[ContentDrawer] No node or topic provided");
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAttempt = ++fetchAttemptRef.current;

    setLoadingState(retryCount > 0 ? "retrying" : "loading");
    setError(null);

    console.log(
      `[ContentDrawer] Loading content for: ${node.label} with topic: ${topic} (attempt ${currentAttempt})`,
    );

    try {
      const result = await fetchContent(topic, node.label);

      // Check if this request is still relevant (not superseded)
      if (currentAttempt !== fetchAttemptRef.current) {
        console.log("[ContentDrawer] Request superseded, ignoring result");
        return;
      }

      if (result) {
        setContent(result);
        setLoadingState("success");
        setRetryCount(0); // Reset retry count on success
        console.log("[ContentDrawer] Content loaded successfully");
      } else {
        throw new Error("Content not found. Please try again.");
      }
    } catch (err) {
      // Ignore abort errors (expected when canceling)
      if (err instanceof Error && err.name === "AbortError") {
        console.log("[ContentDrawer] Request cancelled");
        return;
      }

      // Only set error if this request is still current
      if (currentAttempt === fetchAttemptRef.current) {
        const categorizedError = categorizeError(err);
        setError(categorizedError);
        setLoadingState("error");
        console.error("[ContentDrawer] Load failed:", err);
      }
    }
  }, [node, topic, fetchContent, retryCount, categorizeError]);

  /**
   * Retry with exponential backoff
   */
  const handleRetry = useCallback(() => {
    const nextRetryCount = retryCount + 1;
    setRetryCount(nextRetryCount);

    console.log(`[ContentDrawer] Retry ${nextRetryCount}/3`);

    // Exponential backoff: 0ms, 1000ms, 2000ms, 4000ms
    const delay =
      nextRetryCount > 1
        ? Math.min(1000 * Math.pow(2, nextRetryCount - 2), 5000)
        : 0;

    if (delay > 0) {
      console.log(`[ContentDrawer] Retrying in ${delay}ms`);
      setLoadingState("retrying");
      setTimeout(() => {
        loadData();
      }, delay);
    } else {
      loadData();
    }
  }, [retryCount, loadData]);

  /**
   * Render loading state
   */
  const renderLoading = () => {
    // First load
    if (loadingState === "loading" && !content && retryCount === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin w-6 h-6 text-black" />
          <p className="text-sm font-serif italic text-neutral-500">
            _Crafting your learning guide..._
          </p>
        </div>
      );
    }

    // Retry loading
    if (
      loadingState === "retrying" ||
      (loadingState === "loading" && retryCount > 0)
    ) {
      return (
        <div className="space-y-4">
          <div className="h-32 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin w-6 h-6 text-black" />
            <p className="text-sm text-neutral-500">
              Retrying... (attempt {retryCount}/3)
            </p>
          </div>
          <LoadingSkeleton />
        </div>
      );
    }

    return <LoadingSkeleton />;
  };

  return (
    <AnimatePresence>
      {isOpen && node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[650px] bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-start bg-white shrink-0">
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-neutral-400">
                  <BookOpen size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                    Learning Module
                  </span>
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-medium text-black leading-tight max-w-md">
                  {node.label}
                </h2>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  {node.estimatedTime && <span>⏱ {node.estimatedTime}</span>}
                  {node.difficulty && (
                    <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                      {node.difficulty}
                    </span>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 transition-all hover:border-black hover:bg-black"
                aria-label="Close drawer"
              >
                <X
                  size={18}
                  className="text-neutral-400 transition-colors group-hover:text-white"
                />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto bg-white">
              {/* Loading State */}
              {(loadingState === "loading" || loadingState === "retrying") &&
                renderLoading()}

              {/* Error State */}
              {loadingState === "error" && error && (
                <ErrorDisplay
                  error={error}
                  retryCount={retryCount}
                  onRetry={handleRetry}
                  onClose={onClose}
                />
              )}

              {/* Success State */}
              {loadingState === "success" && content && (
                <div className="flex flex-col">
                  {/* Content */}
                  <div className="p-8 md:p-10 pb-0">
                    <MarkdownView content={content.markdownContent} />
                  </div>

                  {/* Quiz Section */}
                  {content.quizzes && content.quizzes.length > 0 && (
                    <div className="py-12 px-10">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-px bg-neutral-100 flex-1"></div>
                        <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em]">
                          Knowledge Check
                        </span>
                        <div className="h-px bg-neutral-100 flex-1"></div>
                      </div>

                      {/* Quiz */}
                      <QuizCard
                        key={content.nodeId}
                        questions={content.quizzes || []}
                        onComplete={onQuizComplete}
                      />
                    </div>
                  )}

                  <div className="h-20"></div>
                </div>
              )}

              {/* Idle/Empty State */}
              {loadingState === "idle" && !content && !error && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-neutral-400 font-serif italic">
                    _No content available_
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

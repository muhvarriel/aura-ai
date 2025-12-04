import React, { useEffect, useState, useCallback, useRef } from "react";
import { X, Loader2, BookOpen, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownView } from "@/presentation/components/ui/MarkdownView";
import { QuizCard } from "./QuizCard";
import { LearningContent } from "@/core/entities/quiz";
import { RoadmapNode } from "@/core/entities/roadmap";

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

export default function ContentDrawer({
  isOpen,
  onClose,
  node,
  topic,
  fetchContent,
  onQuizComplete,
}: ContentDrawerProps) {
  const [content, setContent] = useState<LearningContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchAttemptRef = useRef<number>(0);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      // Cancel any pending request when drawer closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen]);

  // Load data when node changes or drawer opens
  useEffect(() => {
    if (isOpen && node) {
      // Reset states for new node
      setContent(null);
      setError(null);
      setRetryCount(0);
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, isOpen]);

  /**
   * Load content with abort controller support
   */
  const loadData = useCallback(async () => {
    if (!node) return;

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAttempt = ++fetchAttemptRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchContent(topic, node.label);

      // Check if this request is still relevant (not superseded)
      if (currentAttempt !== fetchAttemptRef.current) {
        console.log("Request superseded, ignoring result");
        return;
      }

      if (result) {
        setContent(result);
        setRetryCount(0); // Reset retry count on success
      } else {
        setError("Gagal memuat materi. Konten tidak ditemukan.");
      }
    } catch (err) {
      // Ignore abort errors (expected when canceling)
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request cancelled");
        return;
      }

      // Only set error if this request is still current
      if (currentAttempt === fetchAttemptRef.current) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan saat memuat konten.";
        setError(errorMessage);
        console.error("Content fetch error:", err);
      }
    } finally {
      if (currentAttempt === fetchAttemptRef.current) {
        setLoading(false);
      }
    }
  }, [node, topic, fetchContent]);

  /**
   * Retry with exponential backoff
   */
  const handleRetry = useCallback(() => {
    const nextRetryCount = retryCount + 1;
    setRetryCount(nextRetryCount);

    // Exponential backoff: 0ms, 500ms, 1000ms, 2000ms
    const delay = nextRetryCount > 1 ? Math.min(1000 * Math.pow(2, nextRetryCount - 2), 5000) : 0;

    if (delay > 0) {
      setLoading(true);
      setTimeout(() => {
        loadData();
      }, delay);
    } else {
      loadData();
    }
  }, [retryCount, loadData]);

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
                  {node.estimatedTime && (
                    <span>⏱ {node.estimatedTime}</span>
                  )}
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
              {loading ? (
                <div className="flex flex-col">
                  {/* Centered spinner for first load */}
                  {!content && retryCount === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center gap-4">
                      <Loader2 className="animate-spin w-6 h-6 text-black" />
                      <p className="text-sm font-serif italic text-neutral-500">
                        _Crafting your guide..._
                      </p>
                    </div>
                  )}

                  {/* Skeleton for retries */}
                  {retryCount > 0 && <LoadingSkeleton />}
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-6">
                  <div className="p-4 rounded-full bg-red-50">
                    <AlertCircle className="text-red-500" size={28} />
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-serif text-xl text-neutral-900">
                      Failed to Load Content
                    </h3>
                    <p className="text-sm text-neutral-600 max-w-sm">
                      {error}
                    </p>

                    {retryCount > 0 && (
                      <p className="text-xs text-neutral-400">
                        Retry attempt {retryCount}/3
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleRetry}
                    disabled={retryCount >= 3}
                    className="group flex items-center gap-2 px-6 py-3 rounded-full border-2 border-black text-black hover:bg-black hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-black"
                  >
                    <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-sm font-medium">
                      {retryCount >= 3 ? "Max Retries Reached" : "Try Again"}
                    </span>
                  </button>

                  {retryCount >= 3 && (
                    <button
                      onClick={onClose}
                      className="text-xs text-neutral-500 hover:text-black transition-colors underline"
                    >
                      Close and try another module
                    </button>
                  )}
                </div>
              ) : content ? (
                <div className="flex flex-col">
                  {/* Content */}
                  <div className="p-8 md:p-10 pb-0">
                    <MarkdownView content={content.markdownContent} />
                  </div>

                  {/* Quiz Divider */}
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
                      questions={content.quizzes ?? []}
                      onComplete={onQuizComplete}
                    />
                  </div>

                  <div className="h-20"></div>
                </div>
              ) : (
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

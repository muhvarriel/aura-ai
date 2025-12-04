import React, { useEffect, useState } from "react";
import { X, Loader2, BookOpen, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownView } from "@/presentation/components/ui/MarkdownView";
import { QuizCard } from "./QuizCard"; // Asumsi component ini akan direfactor selanjutnya
import { LearningContent } from "@/core/entities/quiz";
import { RoadmapNode } from "@/core/entities/roadmap";

interface ContentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: RoadmapNode | null;
  topic: string;
  // Props function injection
  fetchContent: (
    topic: string,
    nodeTitle: string,
  ) => Promise<LearningContent | null>;
  onQuizComplete: (score: number) => void;
}

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

  // Reset state saat node berubah
  useEffect(() => {
    if (isOpen && node) {
      setContent(null);
      setError(null);
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, isOpen]);

  const loadData = async () => {
    if (!node) return;
    setLoading(true);
    try {
      const result = await fetchContent(topic, node.label);
      if (result) {
        setContent(result);
      } else {
        setError("Gagal memuat materi. Silakan coba lagi.");
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && node && (
        <>
          {/* Backdrop: Lighter, sophisticated blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/20 backdrop-blur-sm z-40"
          />

          {/* Drawer Panel: Full White "Paper" feel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[650px] bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Header: Editorial Style */}
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
              </div>

              {/* Close Button: Minimalist Circle */}
              <button
                onClick={onClose}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 transition-all hover:border-black hover:bg-black"
              >
                <X
                  size={18}
                  className="text-neutral-400 transition-colors group-hover:text-white"
                />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto bg-white scrollbar-hide">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin w-6 h-6 text-black" />
                  <p className="text-sm font-serif italic text-neutral-500">
                    _Crafting your guide..._
                  </p>
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4">
                  <div className="p-3 rounded-full bg-neutral-50">
                    <Sparkles className="text-neutral-400" size={24} />
                  </div>
                  <div>
                    <p className="text-neutral-800 font-medium mb-2">{error}</p>
                    <button
                      onClick={loadData}
                      className="text-xs font-bold uppercase tracking-widest border-b border-black pb-0.5 hover:opacity-60 transition-opacity"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              ) : content ? (
                <div className="flex flex-col">
                  {/* Materi Markdown: Direct content flow (no card wrapper) */}
                  <div className="p-8 md:p-10 pb-0">
                    <MarkdownView content={content.markdownContent} />
                  </div>

                  {/* Divider: Subtle separation */}
                  <div className="py-12 px-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="h-px bg-neutral-100 flex-1"></div>
                      <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em]">
                        Knowledge Check
                      </span>
                      <div className="h-px bg-neutral-100 flex-1"></div>
                    </div>

                    {/* Quiz Section */}
                    <QuizCard
                      questions={content.quizzes ?? []}
                      onComplete={onQuizComplete}
                    />
                  </div>

                  <div className="h-20"></div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

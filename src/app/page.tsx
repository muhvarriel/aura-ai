"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { useRoadmapStore } from "@/infrastructure/store/roadmap-store";
import { Roadmap, RoadmapNode } from "@/core/entities/roadmap";
import { SyllabusResponse } from "@/infrastructure/ai/schemas";

// --- UI CONSTANTS ---
const SUGGESTIONS = [
  "React JS",
  "Digital Marketing",
  "Investasi Saham",
  "Bahasa Jepang",
];

// --- TOAST NOTIFICATION TYPES ---
type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

/**
 * Toast Notification Component
 */
const ToastNotification = ({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) => {
  const icons = {
    success: <CheckCircle2 size={20} className="text-green-600" />,
    error: <AlertCircle size={20} className="text-red-600" />,
    info: <Sparkles size={20} className="text-blue-600" />,
  };

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`${bgColors[toast.type]} border rounded-2xl p-4 shadow-lg max-w-md w-full`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-neutral-900">
            {toast.message}
          </p>
          {toast.description && (
            <p className="text-xs text-neutral-600 mt-1">{toast.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
        >
          <X size={16} className="text-neutral-500" />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Toast Container
 */
const ToastContainer = ({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onClose={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Main Landing Page Component
 */
export default function LandingPage() {
  const router = useRouter();
  const addRoadmap = useRoadmapStore((state) => state.addRoadmap);

  const [topic, setTopic] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Add toast notification
   */
  const addToast = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = uuidv4();
      const newToast: Toast = { id, type, message, description };

      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  /**
   * Remove toast manually
   */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Handle form submission
   */
  const handleGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedTopic = topic.trim();
      if (!trimmedTopic) {
        addToast("error", "Please enter a topic", "Topic cannot be empty");
        return;
      }

      if (trimmedTopic.length < 3) {
        addToast(
          "error",
          "Topic too short",
          "Please enter at least 3 characters",
        );
        return;
      }

      setLoading(true);

      try {
        // Call API
        const res = await fetch("/api/roadmap/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmedTopic }),
        });

        const json = await res.json();

        // Handle API errors
        if (!res.ok) {
          const errorType = json.type || "UNKNOWN_ERROR";
          let errorMessage = json.error || "Failed to generate roadmap";
          let description = "";

          switch (errorType) {
            case "AI_CONFIG_ERROR":
              errorMessage = "Service Configuration Error";
              description =
                "AI service is temporarily unavailable. Please try again later.";
              break;
            case "AI_TIMEOUT":
              errorMessage = "Generation Timeout";
              description =
                "The request took too long. Try a simpler topic or retry.";
              break;
            case "AI_INVALID_RESPONSE":
              errorMessage = "Invalid AI Response";
              description = "AI returned unexpected data. Please retry.";
              break;
          }

          addToast("error", errorMessage, description);
          throw new Error(errorMessage);
        }

        // Validate response structure
        const aiResponse = json.data as SyllabusResponse;

        if (
          !aiResponse ||
          !Array.isArray(aiResponse.modules) ||
          aiResponse.modules.length === 0
        ) {
          console.error("Invalid AI Response Structure:", aiResponse);
          addToast(
            "error",
            "Invalid Response Format",
            "AI returned incomplete data. Please try again.",
          );
          throw new Error("Invalid AI response structure");
        }

        // Convert to Roadmap entity
        const roadmapId = uuidv4();
        const rootId = "root";
        const nodes: RoadmapNode[] = [];

        // Create root node
        nodes.push({
          id: rootId,
          label: aiResponse.courseTitle || trimmedTopic,
          description:
            aiResponse.overview || `Complete guide to learn ${trimmedTopic}`,
          status: "unlocked",
          childrenIds: [],
          difficulty: "Beginner",
        });

        // Create module nodes
        aiResponse.modules.forEach((mod, index) => {
          const modId = `mod-${index}`;
          const parentId = index === 0 ? rootId : `mod-${index - 1}`;

          // Link to parent
          const parentNode = nodes.find((n) => n.id === parentId);
          if (parentNode) {
            parentNode.childrenIds = [...parentNode.childrenIds, modId];
          }

          // Validate difficulty enum
          const validDifficulties: Array<
            "Beginner" | "Intermediate" | "Advanced"
          > = ["Beginner", "Intermediate", "Advanced"];
          const difficulty = validDifficulties.includes(
            mod.difficulty as (typeof validDifficulties)[number],
          )
            ? (mod.difficulty as "Beginner" | "Intermediate" | "Advanced")
            : "Beginner";

          nodes.push({
            id: modId,
            label: mod.title,
            description: mod.description,
            status: "locked",
            childrenIds: [],
            parentId,
            estimatedTime: mod.estimatedTime,
            difficulty,
          });
        });

        // Create roadmap
        const newRoadmap: Roadmap = {
          id: roadmapId,
          topic: aiResponse.courseTitle || trimmedTopic,
          nodes,
          createdAt: Date.now(),
          progress: 0,
        };

        // Save and navigate
        addRoadmap(newRoadmap);

        addToast(
          "success",
          "Roadmap Created!",
          `${aiResponse.modules.length} modules generated for "${aiResponse.courseTitle}"`,
        );

        // Navigate after short delay to show toast
        setTimeout(() => {
          router.push(`/roadmap/${roadmapId}`);
        }, 500);
      } catch (error) {
        console.error("Generation Error:", error);

        // Error already handled above via toast
        // This catch is for unexpected errors
        if (error instanceof Error && !error.message.includes("AI")) {
          addToast(
            "error",
            "Unexpected Error",
            "Something went wrong. Please try again.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [topic, addRoadmap, router, addToast],
  );

  /**
   * Handle suggestion click
   */
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setTopic(suggestion);
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="font-bold text-xl tracking-tight">AURA AI</div>
        <button className="px-4 py-2 rounded-full border border-neutral-200 text-sm hover:bg-neutral-100 transition-colors">
          Menu
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-screen p-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl w-full text-center space-y-12"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-neutral-200 shadow-sm text-neutral-600 text-sm font-medium">
              <Sparkles size={14} className="text-black" />
              <span>Personalized Learning Path</span>
            </span>
          </motion.div>

          {/* Heading */}
          <div className="space-y-6">
            <h1 className="font-serif text-6xl md:text-8xl font-medium leading-[0.9] tracking-tight text-black">
              MASTER <br /> ANY SKILL.
            </h1>
            <p className="text-lg md:text-xl text-neutral-500 max-w-lg mx-auto font-light leading-relaxed">
              Simply enter a topic. Our AI crafts a bespoke syllabus, tailored
              specifically to your pace and needs.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleGenerate}
            className="relative max-w-xl mx-auto w-full group"
          >
            <div className="relative flex items-center">
              <div className="absolute left-6 text-neutral-400 group-focus-within:text-black transition-colors">
                <Search size={20} />
              </div>

              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want to learn today?"
                disabled={loading}
                className="w-full pl-16 pr-20 py-6 bg-neutral-50 hover:bg-neutral-100 focus:bg-white border-2 border-transparent focus:border-black rounded-full text-lg outline-none transition-all duration-300 placeholder:text-neutral-400 text-black disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={loading || !topic.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 bg-black hover:bg-neutral-800 text-white rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:bg-neutral-200 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <ArrowRight size={20} />
                )}
              </button>
            </div>
          </form>

          {/* Suggestions */}
          <div className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
              Trending Topics
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  type="button"
                  disabled={loading}
                  className="px-6 py-3 rounded-full border border-neutral-200 text-sm text-neutral-600 hover:border-black hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="fixed bottom-6 text-neutral-400 text-xs tracking-wider">
          _Crafting Knowledge_
        </div>
      </main>
    </div>
  );
}

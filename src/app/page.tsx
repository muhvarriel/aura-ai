"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  TrendingUp,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

import { useRoadmapStore } from "@/infrastructure/store/roadmap-store";
import { Roadmap, RoadmapNode, RoadmapEdge } from "@/core/entities/roadmap";
import { SyllabusResponse } from "@/infrastructure/ai/schemas";

const SUGGESTIONS = [
  { label: "Artificial Intelligence" },
  { label: "Web3 Development" },
  { label: "Data Science" },
  { label: "Cybersecurity" },
] as const;

const PARTICLES_COUNT = 20;
const TOAST_DURATION = 5000;

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
}

interface DifficultyLevel {
  Beginner: "Beginner";
  Intermediate: "Intermediate";
  Advanced: "Advanced";
}

const VALID_DIFFICULTIES: DifficultyLevel = {
  Beginner: "Beginner",
  Intermediate: "Intermediate",
  Advanced: "Advanced",
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);

    updateMatch();
    media.addEventListener("change", updateMatch);

    return () => media.removeEventListener("change", updateMatch);
  }, [query]);

  return matches;
}

const FloatingParticle = React.memo<{ index: number }>(({ index }) => {
  const randomX = useMemo(() => seededRandom(index * 100) * 100, [index]);
  const randomDelay = useMemo(() => seededRandom(index * 200) * 2, [index]);
  const randomDuration = useMemo(
    () => 15 + seededRandom(index * 300) * 10,
    [index],
  );

  return (
    <motion.div
      className="absolute w-1 h-1 bg-neutral-300 rounded-full"
      style={{
        left: `${randomX}%`,
        bottom: "-10px",
      }}
      animate={{
        y: [0, -1000],
        opacity: [0, 0.5, 0],
        scale: [1, 1.5, 1],
      }}
      transition={{
        duration: randomDuration,
        repeat: Infinity,
        delay: randomDelay,
        ease: "linear",
      }}
    />
  );
});

FloatingParticle.displayName = "FloatingParticle";

const AnimatedBackground = React.memo(() => {
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setIsMounted(true);
    });

    return () => cancelAnimationFrame(timer);
  }, []);

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-neutral-100 to-transparent rounded-full blur-3xl opacity-50"
        animate={
          isMobile
            ? {}
            : {
                scale: [1, 1.2, 1],
                x: [0, 50, 0],
                y: [0, -30, 0],
              }
        }
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-tl from-neutral-100 to-transparent rounded-full blur-3xl opacity-50"
        animate={
          isMobile
            ? {}
            : {
                scale: [1, 1.3, 1],
                x: [0, -50, 0],
                y: [0, 30, 0],
              }
        }
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {isMounted &&
        !isMobile &&
        Array.from({ length: PARTICLES_COUNT }).map((_, i) => (
          <FloatingParticle key={i} index={i} />
        ))}
    </div>
  );
});

AnimatedBackground.displayName = "AnimatedBackground";

const ToastNotification = React.memo<{
  toast: Toast;
  onClose: () => void;
}>(({ toast, onClose }) => {
  const icons = useMemo<Record<ToastType, React.ReactNode>>(
    () => ({
      success: <CheckCircle2 size={20} className="text-green-600" />,
      error: <AlertCircle size={20} className="text-red-600" />,
      info: <Sparkles size={20} className="text-blue-600" />,
    }),
    [],
  );

  const bgColors = useMemo<Record<ToastType, string>>(
    () => ({
      success: "bg-green-50 border-green-200",
      error: "bg-red-50 border-red-200",
      info: "bg-blue-50 border-blue-200",
    }),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95, x: 100 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: 100 }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 300,
      }}
      className={`${bgColors[toast.type]} border rounded-2xl p-4 shadow-lg max-w-md w-full backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="shrink-0 mt-0.5"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            delay: 0.1,
            damping: 15,
          }}
        >
          {icons[toast.type]}
        </motion.div>
        <div className="flex-1 min-w-0">
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="font-medium text-sm text-neutral-900"
          >
            {toast.message}
          </motion.p>
          {toast.description && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs text-neutral-600 mt-1"
            >
              {toast.description}
            </motion.p>
          )}
        </div>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="shrink-0 p-1 hover:bg-black/5 rounded-full transition-colors"
        >
          <X size={16} className="text-neutral-500" />
        </motion.button>
      </div>
    </motion.div>
  );
});

ToastNotification.displayName = "ToastNotification";

const ToastContainer = React.memo<{
  toasts: Toast[];
  onRemove: (id: string) => void;
}>(({ toasts, onRemove }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-[calc(100vw-3rem)] md:max-w-md">
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
});

ToastContainer.displayName = "ToastContainer";

function buildEdgesFromNodes(nodes: RoadmapNode[]): RoadmapEdge[] {
  const edges: RoadmapEdge[] = [];

  nodes.forEach((node) => {
    if (node.parentId) {
      edges.push({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
      });
    }
  });

  return edges;
}

const MagneticButton = React.memo<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}>(
  ({
    children,
    onClick,
    disabled = false,
    className = "",
    type = "button",
  }) => {
    const ref = useRef<HTMLButtonElement>(null);
    const isMobile = useMediaQuery("(max-width: 768px)");
    const prefersReducedMotion = useReducedMotion();

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = useMemo(() => ({ damping: 20, stiffness: 300 }), []);
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current || disabled || isMobile || prefersReducedMotion)
          return;

        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        x.set(distanceX * 0.3);
        y.set(distanceY * 0.3);
      },
      [disabled, isMobile, prefersReducedMotion, x, y],
    );

    const handleMouseLeave = useCallback(() => {
      x.set(0);
      y.set(0);
    }, [x, y]);

    return (
      <motion.button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={disabled}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={
          isMobile || prefersReducedMotion ? {} : { x: springX, y: springY }
        }
        whileTap={{ scale: 0.95 }}
        className={className}
      >
        {children}
      </motion.button>
    );
  },
);

MagneticButton.displayName = "MagneticButton";

export default function LandingPage() {
  const router = useRouter();
  const addRoadmap = useRoadmapStore((state) => state.addRoadmap);

  const [topic, setTopic] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const prefersReducedMotion = useReducedMotion();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    if (isMobile || prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;

      mouseX.set((clientX - centerX) / 50);
      mouseY.set((clientY - centerY) / 50);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, isMobile, prefersReducedMotion]);

  const parallaxX = useTransform(mouseX, [-20, 20], [-10, 10]);
  const parallaxY = useTransform(mouseY, [-20, 20], [-10, 10]);

  const addToast = useCallback(
    (type: ToastType, message: string, description?: string) => {
      const id = uuidv4();
      const newToast: Toast = { id, type, message, description };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, TOAST_DURATION);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleGenerate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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
        const res = await fetch("/api/roadmap/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: trimmedTopic }),
        });

        const json = await res.json();

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

        const aiResponse = json.data as SyllabusResponse;

        if (
          !aiResponse ||
          !Array.isArray(aiResponse.modules) ||
          aiResponse.modules.length === 0
        ) {
          addToast(
            "error",
            "Invalid Response Format",
            "AI returned incomplete data. Please try again.",
          );
          throw new Error("Invalid AI response structure");
        }

        const roadmapId = uuidv4();
        const rootId = "root";
        const nodes: RoadmapNode[] = [];

        nodes.push({
          id: rootId,
          label: aiResponse.courseTitle || trimmedTopic,
          description:
            aiResponse.overview || `Complete guide to learn ${trimmedTopic}`,
          status: "unlocked",
          difficulty: "Beginner",
        });

        aiResponse.modules.forEach((mod, index) => {
          const modId = `mod-${index}`;
          const parentId = index === 0 ? rootId : `mod-${index - 1}`;

          const difficulty = Object.keys(VALID_DIFFICULTIES).includes(
            mod.difficulty,
          )
            ? (mod.difficulty as keyof DifficultyLevel)
            : "Beginner";

          nodes.push({
            id: modId,
            label: mod.title,
            description: mod.description,
            status: "locked",
            parentId,
            estimatedTime: mod.estimatedTime,
            difficulty,
          });
        });

        const edges = buildEdgesFromNodes(nodes);

        const unlockedCount = nodes.filter(
          (n) => n.status === "unlocked",
        ).length;
        const initialProgress = Math.round(
          (unlockedCount / nodes.length) * 100,
        );

        const newRoadmap: Roadmap = {
          id: roadmapId,
          topic: aiResponse.courseTitle || trimmedTopic,
          nodes,
          edges,
          createdAt: Date.now(),
          progress: initialProgress,
        };

        addRoadmap(newRoadmap);

        addToast(
          "success",
          "Roadmap Created!",
          `${aiResponse.modules.length} modules generated for "${aiResponse.courseTitle}"`,
        );

        setTimeout(() => {
          router.push(`/roadmap/${roadmapId}`);
        }, 500);
      } catch (error) {
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

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setTopic(suggestion);
  }, []);

  const titleChars = useMemo(
    () => ({
      master: "MASTER".split(""),
      skill: "ANY SKILL.".split(""),
    }),
    [],
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white relative overflow-hidden">
      <AnimatedBackground />

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 backdrop-blur-sm"
      >
        <motion.div
          className="font-bold text-lg md:text-xl tracking-tight relative"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.span
            className="inline-block"
            animate={
              prefersReducedMotion
                ? {}
                : {
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                  }
            }
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              background: "linear-gradient(90deg, #000, #666, #000)",
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AURA AI
          </motion.span>
        </motion.div>
        <MagneticButton className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-neutral-200 text-xs md:text-sm hover:bg-neutral-100 transition-colors backdrop-blur-sm">
          Menu
        </MagneticButton>
      </motion.header>

      <main className="flex flex-col items-center justify-center min-h-screen p-4 md:p-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={
            isMobile || prefersReducedMotion
              ? {}
              : { x: parallaxX, y: parallaxY }
          }
          className="max-w-4xl w-full text-center space-y-8 md:space-y-12 relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center"
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white border border-neutral-200 shadow-sm text-neutral-600 text-xs md:text-sm font-medium relative overflow-hidden group cursor-pointer"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-100 to-transparent"
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        x: ["-200%", "200%"],
                      }
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <motion.div
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        rotate: [0, 360],
                      }
                }
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <Sparkles size={14} className="text-black relative z-10" />
              </motion.div>
              <span className="relative z-10">Personalized Learning Path</span>
            </motion.span>
          </motion.div>

          <div className="space-y-4 md:space-y-6">
            <motion.h1
              className="font-serif text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-medium leading-[0.9] tracking-tight text-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              {titleChars.master.map((char, index) => (
                <motion.span
                  key={`master-${index}`}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.3 + index * 0.05,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="inline-block hover:text-neutral-600 transition-colors cursor-default"
                >
                  {char}
                </motion.span>
              ))}{" "}
              <br />
              {titleChars.skill.map((char, index) => (
                <motion.span
                  key={`skill-${index}`}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.6 + index * 0.05,
                    type: "spring",
                    stiffness: 200,
                  }}
                  className="inline-block hover:text-neutral-600 transition-colors cursor-default"
                >
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-base md:text-lg lg:text-xl text-neutral-500 max-w-lg mx-auto font-light leading-relaxed px-4"
            >
              Simply enter a topic. Our AI crafts a bespoke syllabus, tailored
              specifically to your pace and needs.
            </motion.p>
          </div>

          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            onSubmit={handleGenerate}
            className="relative max-w-xl mx-auto w-full group px-4"
          >
            <motion.div
              animate={{
                boxShadow: isInputFocused
                  ? "0 0 0 4px rgba(0, 0, 0, 0.1)"
                  : "0 0 0 0px rgba(0, 0, 0, 0)",
              }}
              transition={{ duration: 0.3 }}
              className="relative flex items-center rounded-full"
            >
              <motion.div
                animate={{
                  x: isInputFocused ? 2 : 0,
                  color: isInputFocused ? "#000" : "#a3a3a3",
                }}
                className="absolute left-4 md:left-6 z-10"
              >
                <Search size={isMobile ? 18 : 20} />
              </motion.div>

              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                placeholder="What do you want to learn today?"
                disabled={loading}
                className="w-full pl-12 md:pl-16 pr-16 md:pr-20 py-4 md:py-6 bg-neutral-50 hover:bg-neutral-100 focus:bg-white border-2 border-transparent focus:border-black rounded-full text-base md:text-lg outline-none transition-all duration-300 placeholder:text-neutral-400 text-black disabled:opacity-60 relative z-0"
              />

              <motion.button
                type="submit"
                disabled={loading || !topic.trim()}
                whileHover={{ scale: loading ? 1 : 1.05 }}
                whileTap={{ scale: loading ? 1 : 0.95 }}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-10 w-10 md:h-12 md:w-12 bg-black hover:bg-neutral-800 text-white rounded-full flex items-center justify-center transition-all disabled:bg-neutral-200 disabled:cursor-not-allowed z-10 overflow-hidden group"
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loader"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        rotate: {
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        },
                      }}
                    >
                      <Loader2 size={isMobile ? 18 : 20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="arrow"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      whileHover={{ x: 3 }}
                    >
                      <ArrowRight size={isMobile ? 18 : 20} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {!prefersReducedMotion && (
                  <motion.div
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ scale: 0, opacity: 0.5 }}
                    whileTap={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </motion.button>
            </motion.div>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="pt-2 md:pt-4 px-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3 md:mb-4 flex items-center justify-center gap-2"
            >
              <motion.div
                animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp size={12} />
              </motion.div>
              Trending Topics
            </motion.div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {SUGGESTIONS.map((suggestion, index) => (
                <motion.div
                  key={suggestion.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 1.6 + index * 0.1,
                    type: "spring",
                    stiffness: 200,
                  }}
                >
                  <MagneticButton
                    onClick={() => handleSuggestionClick(suggestion.label)}
                    disabled={loading}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-full border border-neutral-200 text-xs md:text-sm text-neutral-600 hover:border-black hover:bg-black hover:text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center">
                      {suggestion.label}
                    </span>
                    {!prefersReducedMotion && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-neutral-900 to-black"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </MagneticButton>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {!isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="fixed bottom-6 text-neutral-400 text-xs tracking-wider font-mono hidden md:block"
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={prefersReducedMotion ? {} : { opacity: [0, 1, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              _
            </motion.span>
            Crafting Knowledge
            <motion.span
              animate={prefersReducedMotion ? {} : { opacity: [0, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              _
            </motion.span>
          </motion.div>
        )}
      </main>
    </div>
  );
}

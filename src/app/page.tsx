"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Loader2, Search } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

// Imports dari Clean Architecture Layers
import { useRoadmapStore } from "@/infrastructure/store/roadmap-store";
import { Roadmap, RoadmapNode } from "@/core/entities/roadmap";
import { SyllabusResponse } from "@/infrastructure/ai/schemas";

// --- UI CONSTANTS (Aura Design System) ---
const SUGGESTIONS = [
  "React JS",
  "Digital Marketing",
  "Investasi Saham",
  "Bahasa Jepang",
];

export default function LandingPage() {
  const router = useRouter();
  const addRoadmap = useRoadmapStore((state) => state.addRoadmap);

  const [topic, setTopic] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      // 1. Call API
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal membuat roadmap");
      }

      // 2. Validasi Struktur Data (Defensive Programming)
      const aiResponse = json.data as SyllabusResponse;

      console.log(
        "🔍 AI Response Parsed:",
        JSON.stringify(aiResponse, null, 2),
      );

      if (!aiResponse || !Array.isArray(aiResponse.modules)) {
        console.error(
          "Invalid AI Response Structure. Modules missing:",
          aiResponse,
        );
        throw new Error(
          "Struktur data dari AI tidak valid (Missing 'modules'). Silakan coba lagi.",
        );
      }

      // 3. Convert AI Response to Roadmap Entity
      const roadmapId = uuidv4();
      const rootId = "root";
      const nodes: RoadmapNode[] = [];

      // A. Buat Root Node
      nodes.push({
        id: rootId,
        label: aiResponse.courseTitle || topic,
        description: aiResponse.overview || `Panduan lengkap belajar ${topic}`,
        status: "unlocked",
        childrenIds: [],
        difficulty: "Beginner",
      });

      // B. Generate Child Nodes
      aiResponse.modules.forEach((mod, index) => {
        const modId = `mod-${index}`;
        const parentId = index === 0 ? rootId : `mod-${index - 1}`;

        // Link Parent
        const parentNode = nodes.find((n) => n.id === parentId);
        if (parentNode) {
          parentNode.childrenIds.push(modId);
        }

        // Safe Enum Mapping
        const rawDiff = (mod.difficulty || "Beginner") as string;
        let validDifficulty: "Beginner" | "Intermediate" | "Advanced" =
          "Beginner";
        if (["Beginner", "Intermediate", "Advanced"].includes(rawDiff)) {
          validDifficulty = rawDiff as "Beginner" | "Intermediate" | "Advanced";
        }

        nodes.push({
          id: modId,
          label: mod.title,
          description: mod.description,
          status: "locked",
          childrenIds: [],
          parentId: parentId,
          estimatedTime: mod.estimatedTime,
          difficulty: validDifficulty,
        });
      });

      const newRoadmap: Roadmap = {
        id: roadmapId,
        topic: aiResponse.courseTitle || topic,
        nodes: nodes,
        createdAt: Date.now(),
        progress: 0,
      };

      addRoadmap(newRoadmap);
      router.push(`/roadmap/${roadmapId}`);
    } catch (error) {
      let errorMessage = "Terjadi kesalahan tidak terduga.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Generate Error:", error);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white">
      {/* --- Header / Navigation Placeholder (Aura Style) --- */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50">
        <div className="font-bold text-xl tracking-tight">AURA AI</div>
        <button className="px-4 py-2 rounded-full border border-neutral-200 text-sm hover:bg-neutral-100 transition-colors">
          Menu
        </button>
      </header>

      <main className="flex flex-col items-center justify-center min-h-screen p-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Editorial ease
          className="max-w-4xl w-full text-center space-y-12"
        >
          {/* 1. Social Proof / Tag (Floating Badge Style) */}
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

          {/* 2. Typography: High Contrast Serif (Editorial Look) */}
          <div className="space-y-6">
            <h1 className="font-serif text-6xl md:text-8xl font-medium leading-[0.9] tracking-tight text-black">
              MASTER <br /> ANY SKILL.
            </h1>
            <p className="text-lg md:text-xl text-neutral-500 max-w-lg mx-auto font-light leading-relaxed">
              Simply enter a topic. Our AI crafts a bespoke syllabus, tailored
              specifically to your pace and needs.
            </p>
          </div>

          {/* 3. Form: Pill Shape & Monochrome Interactions */}
          <form
            onSubmit={handleGenerate}
            className="relative max-w-xl mx-auto w-full group"
          >
            <div className="relative flex items-center">
              {/* Search Icon Positioned Absolute Left */}
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

              {/* Action Button: Circular Black Button inside the Pill */}
              <button
                type="submit"
                disabled={loading || !topic}
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

          {/* 4. Suggestions: Outline Pills with Black Hover */}
          <div className="pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-4">
              Trending Topics
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  type="button"
                  className="px-6 py-3 rounded-full border border-neutral-200 text-sm text-neutral-600 hover:border-black hover:bg-black hover:text-white transition-all duration-300"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Footer Decoration (Optional Aura Element) */}
        <div className="fixed bottom-6 text-neutral-400 text-xs tracking-wider">
          _Crafting Knowledge_
        </div>
      </main>
    </div>
  );
}

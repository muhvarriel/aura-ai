import React, { useState } from "react";
import { Check, X, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { QuizQuestion } from "@/core/entities/quiz";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface QuizCardProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  questions = [],
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="py-12 text-center border-2 border-dashed border-neutral-200 rounded-3xl">
        <AlertCircle className="w-6 h-6 mx-auto mb-3 text-neutral-300" />
        <p className="font-serif text-neutral-400 italic">
          No quiz available for this section.
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  if (!currentQuestion || !currentQuestion.options) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 text-red-600 rounded-xl text-sm font-mono">
        [System Error]: Invalid Question Format.
      </div>
    );
  }

  const handleOptionClick = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optionId);
    setIsAnswered(true);

    const isCorrect = currentQuestion.options.find(
      (o) => o.id === optionId,
    )?.isCorrect;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswered(false);
    } else {
      const finalScore =
        score +
        (currentQuestion.options.find((o) => o.id === selectedOptionId)
          ?.isCorrect
          ? 1
          : 0);

      setShowResult(true);

      if (!hasCalledComplete) {
        setHasCalledComplete(true);
        onComplete(finalScore);
      }
    }
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="py-10 px-6 bg-neutral-50 rounded-[2rem] text-center border border-neutral-100"
      >
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-black text-white shadow-xl">
          <Sparkles size={32} />
        </div>

        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">
          Assessment Complete
        </h3>

        <div className="font-serif text-6xl font-medium text-black mb-4">
          {score}
          <span className="text-neutral-300 text-4xl">/</span>
          {questions.length}
        </div>

        <p className="font-serif italic text-neutral-500 mb-8 text-lg">
          {percentage === 100
            ? "Flawless victory."
            : "Keep refining your craft."}
        </p>

        <div className="text-xs font-mono text-neutral-400">
          Review the module to improve your score.
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full bg-white">
      <div className="flex items-center justify-between mb-8 border-b border-neutral-100 pb-4">
        <span className="font-mono text-xs text-neutral-400">
          {String(currentIndex + 1).padStart(2, "0")} /{" "}
          {String(questions.length).padStart(2, "0")}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-black text-white px-2 py-1 rounded-full">
          Quiz
        </span>
      </div>

      <motion.h3
        key={currentQuestion.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-serif text-2xl md:text-3xl font-medium text-black mb-8 leading-tight"
      >
        {currentQuestion.question}
      </motion.h3>

      <div className="space-y-3">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.isCorrect;

          let containerClass =
            "border-neutral-200 hover:border-black hover:bg-neutral-50 cursor-pointer";
          let textClass = "text-neutral-600";
          let icon = null;

          if (isAnswered) {
            if (isSelected && isCorrect) {
              containerClass = "bg-black border-black shadow-lg scale-[1.02]";
              textClass = "text-white font-medium";
              icon = <Check className="w-5 h-5 text-white" />;
            } else if (isSelected && !isCorrect) {
              containerClass = "bg-white border-red-500";
              textClass = "text-red-600";
              icon = <X className="w-5 h-5 text-red-500" />;
            } else if (!isSelected && isCorrect) {
              containerClass = "bg-white border-black border-dashed opacity-60";
              textClass = "text-black font-medium";
              icon = <Check className="w-5 h-5 text-black" />;
            } else {
              containerClass =
                "border-transparent bg-neutral-50 opacity-40 cursor-not-allowed";
            }
          } else if (isSelected) {
            containerClass = "border-black ring-1 ring-black";
          }

          return (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              disabled={isAnswered}
              className={cn(
                "w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between group relative overflow-hidden",
                containerClass,
              )}
            >
              <span
                className={cn(
                  "relative z-10 text-sm md:text-base transition-colors",
                  textClass,
                )}
              >
                {option.text}
              </span>
              {icon && <div className="relative z-10">{icon}</div>}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-8 overflow-hidden"
          >
            <div className="pl-5 border-l-2 border-black py-2 mb-6">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">
                Insight
              </span>
              <p className="font-serif italic text-neutral-600 text-sm leading-relaxed">
                {currentQuestion.explanation ||
                  "No detailed explanation available."}
              </p>
            </div>

            <button
              onClick={handleNext}
              className="group w-full py-4 bg-black text-white rounded-full font-medium transition-all hover:bg-neutral-800 flex items-center justify-center gap-2"
            >
              <span>
                {currentIndex < questions.length - 1
                  ? "Next Question"
                  : "View Results"}
              </span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

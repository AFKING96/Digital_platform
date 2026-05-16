"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

interface MCQRendererProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  correctAnswer?: string;
  type?: "MCQ" | "TF";
}

export const MCQRenderer = ({
  options,
  value,
  onChange,
  disabled,
  isSubmitted,
  correctAnswer,
  type = "MCQ"
}: MCQRendererProps) => {
  return (
    <div className={cn(
      "grid gap-4",
      type === "TF" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
    )}>
      {options.map((option, idx) => {
        const isSelected = value === option;
        const isCorrect = isSubmitted && option === correctAnswer;
        const isWrong = isSubmitted && isSelected && option !== correctAnswer;
        
        return (
          <button
            key={idx}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all duration-300 text-left flex items-center gap-4 group relative overflow-hidden",
              isSelected && !isSubmitted && "bg-primary/10 border-primary shadow-[0_0_20px_rgba(var(--primary),0.15)] scale-[1.02]",
              isCorrect && "bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)]",
              isWrong && "bg-red-500/20 border-red-500 text-white",
              !isSelected && !isCorrect && "bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/20",
              disabled && !isSelected && !isCorrect && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Background Glow for Selected/Correct */}
            {(isSelected || isCorrect) && (
              <div className={cn(
                "absolute inset-0 opacity-10",
                isCorrect ? "bg-emerald-500" : "bg-primary"
              )} />
            )}

            {/* Letter Indicator */}
            {type === "MCQ" && (
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 transition-all duration-300",
                isSelected && !isSubmitted && "bg-primary text-white shadow-lg shadow-primary/30 scale-110",
                isCorrect && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110",
                isWrong && "bg-red-500 text-white",
                !isSelected && !isCorrect && "bg-white/10 text-muted-foreground group-hover:bg-white/20 group-hover:text-white"
              )}>
                {String.fromCharCode(65 + idx)}
              </div>
            )}

            <span className={cn(
              "text-lg flex-1 font-medium transition-colors relative z-10 whitespace-pre-wrap",
              type === "TF" && "text-center text-xl py-2",
              isSelected || isCorrect ? "text-white" : "text-white/80 group-hover:text-white"
            )}>
              {option}
            </span>

            {/* Icons */}
            <div className="relative z-10">
              {isCorrect && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Check className="w-6 h-6 text-emerald-400" />
                </motion.div>
              )}
              {isWrong && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <X className="w-6 h-6 text-red-400" />
                </motion.div>
              )}
              {isSelected && !isSubmitted && type === "MCQ" && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-3 h-3 rounded-full bg-primary" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

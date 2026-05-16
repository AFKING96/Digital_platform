"use client";

import React from "react";
import { MCQRenderer } from "./MCQRenderer";
import { EssayRenderer } from "./EssayRenderer";
import { FormRenderer } from "./FormRenderer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Question {
  id: string | number;
  type: string;
  content?: string;
  question?: string; // Support both naming conventions
  options?: string[];
  answer?: string;
  expectedAnswer?: string;
  correctAnswer?: string; // Support both naming conventions
  explanation?: string;
  imageUrl?: string;
  link?: string;
}

interface QuestionRendererProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  showExplanation?: boolean;
}

export const QuestionRenderer = ({
  question,
  value,
  onChange,
  disabled,
  isSubmitted,
  showExplanation
}: QuestionRendererProps) => {
  const type = question.type?.toLowerCase();
  const qContent = question.content || question.question;
  const qAnswer = question.answer || question.correctAnswer;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Question Header */}
      <div className="space-y-4">
        {question.imageUrl && (
          <div className="relative group overflow-hidden rounded-[32px] border border-white/10 bg-black/40">
            <img 
              src={question.imageUrl} 
              alt="Question Visual" 
              className="w-full h-auto max-h-[400px] object-contain transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}
        <h2 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight text-white/95 whitespace-pre-wrap">
          {qContent}
        </h2>
      </div>

      {/* Specific Renderer Switch - STRICTOR ISOLATION */}
      <div className="pt-2">
        {(() => {
          switch (type) {
            case "mcq":
              return (
                <MCQRenderer 
                  options={question.options || []}
                  value={value}
                  onChange={onChange}
                  disabled={disabled}
                  isSubmitted={isSubmitted}
                  correctAnswer={qAnswer}
                  type="MCQ"
                />
              );
            case "tf":
            case "true_false":
              return (
                <MCQRenderer 
                  options={["True", "False"]}
                  value={value}
                  onChange={onChange}
                  disabled={disabled}
                  isSubmitted={isSubmitted}
                  correctAnswer={qAnswer}
                  type="TF"
                />
              );
            case "essay":
              return (
                <EssayRenderer 
                  value={value}
                  onChange={onChange}
                  disabled={disabled}
                  isSubmitted={isSubmitted}
                  expectedAnswer={question.expectedAnswer}
                />
              );
            case "form":
              return question.link ? <FormRenderer link={question.link} /> : null;
            default:
              return (
                <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                  Unsupported question type: {question.type}
                </div>
              );
          }
        })()}
      </div>

      {/* Explanation Area */}
      {isSubmitted && showExplanation && question.explanation && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-3"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Explanation
          </div>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {question.explanation}
          </p>
        </motion.div>
      )}
    </div>
  );
};

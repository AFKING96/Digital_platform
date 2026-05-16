"use client";

import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";


interface EssayRendererProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isSubmitted?: boolean;
  expectedAnswer?: string;
  placeholder?: string;
}

export const EssayRenderer = ({
  value,
  onChange,
  disabled,
  isSubmitted,
  expectedAnswer,
  placeholder = "Write your detailed answer here... Your response will be reviewed by the instructor."
}: EssayRendererProps) => {
  const charCount = value?.length || 0;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
            Essay Mode
          </span>
        </div>
        <div className="text-[10px] font-medium text-muted-foreground tabular-nums">
          {charCount} characters
        </div>
      </div>

      <div className="relative group">
        <div className={cn(
          "absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-[32px] blur opacity-0 transition duration-500 group-focus-within:opacity-100",
          disabled && "hidden"
        )} />
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "relative min-h-[300px] bg-black/40 border-white/10 rounded-[32px] p-8 text-lg leading-relaxed shadow-inner resize-none transition-all duration-300",
            "focus:border-primary/50 focus:ring-0 placeholder:text-white/20",
            disabled && "opacity-80 bg-white/[0.02]"
          )}
        />
      </div>

      <AnimatePresence>
        {isSubmitted ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-4"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Your Response</span>
                </div>
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 text-white/80 text-sm leading-relaxed min-h-[200px] whitespace-pre-wrap">
                  {value || <span className="italic opacity-40">No response provided.</span>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Expected Answer</span>
                </div>
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-50/90 text-sm leading-relaxed min-h-[200px] whitespace-pre-wrap shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                  {expectedAnswer || <span className="italic opacity-40">No model answer provided by instructor.</span>}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
              <p className="text-[11px] text-emerald-400/90 leading-relaxed italic">
                Compare your response with the model answer above. Your submission has been saved for instructor review.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
              Your answer will be saved and reviewed. Ensure you provide sufficient detail to support your response.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HighlightCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
}

export function HighlightCard({ 
  children, 
  className, 
  onClick,
  glowColor = "from-primary/10 to-transparent"
}: HighlightCardProps) {
  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden cursor-pointer group rounded-xl",
        "bg-white/5 backdrop-blur-xl border border-white/10",
        "transition-all duration-300 shadow-lg hover:shadow-primary/20",
        className
      )}
    >
      {/* Glow Effect */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          glowColor
        )} 
      />
      
      {/* Content */}
      <div className="relative z-10 p-5 flex flex-col md:flex-row justify-between md:items-center gap-4 h-full">
        {children}
      </div>
    </motion.div>
  );
}

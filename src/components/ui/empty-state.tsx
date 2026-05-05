import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center glass-card border-dashed border-2 border-white/10 rounded-2xl"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
        <Icon className="h-10 w-10 text-primary animate-pulse" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/40 max-w-xs mb-8 text-sm leading-relaxed">
        {description}
      </p>
      {action && action}
    </motion.div>
  );
}

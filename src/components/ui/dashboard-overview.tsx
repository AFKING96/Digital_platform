"use client";

import { motion } from "framer-motion";
import { Users, UserCheck, FileText, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DashboardOverviewProps {
  stats: {
    totalStudents: number;
    activeStudents: number;
    totalSubmissions: number;
    pendingReviews: number;
  };
}

export function DashboardOverview({ stats }: DashboardOverviewProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300 } }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
    >
      <motion.div variants={item}>
        <Card className="glass-card flex flex-col justify-between h-36 p-6 hover:scale-[1.05] transition-transform shadow-lg shadow-blue-500/5 group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Students</h3>
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Users className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white relative z-10">{stats.totalStudents}</div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card flex flex-col justify-between h-36 p-6 hover:scale-[1.05] transition-transform shadow-lg shadow-emerald-500/5 group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Active Students</h3>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <UserCheck className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-4xl font-bold text-emerald-400 relative z-10">{stats.activeStudents}</div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card flex flex-col justify-between h-36 p-6 hover:scale-[1.05] transition-transform shadow-lg shadow-yellow-500/5 border-yellow-500/20 group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Pending Reviews</h3>
            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <FileText className="h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-4xl font-bold text-yellow-400 relative z-10">{stats.pendingReviews}</div>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="glass-card flex flex-col justify-between h-36 p-6 hover:scale-[1.05] transition-transform shadow-lg shadow-purple-500/5 group relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors" />
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-sm font-medium text-muted-foreground tracking-wider uppercase">Total Submissions</h3>
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="text-4xl font-bold text-white relative z-10">{stats.totalSubmissions}</div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

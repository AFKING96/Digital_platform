"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { DashboardOverview } from "@/components/ui/dashboard-overview";
import { TrendingDown, Users, BarChart, Target } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalSubmissions: 0,
    pendingReviews: 0
  });

  const [insights, setInsights] = useState({
    avgAccuracy: 0,
    lowestLesson: { id: 0, accuracy: 100 },
    mostSubmissionsLesson: { id: 0, count: 0 }
  });

  useEffect(() => {
    // Realtime listeners for Students
    const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      let active = 0;
      let totalAcc = 0;
      let accCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.currentLesson > 1 || data.solvedQuestions > 0) active++;
        if (data.accuracy) {
          totalAcc += data.accuracy;
          accCount++;
        }
      });
      
      setStats(prev => ({
        ...prev,
        totalStudents: snapshot.size,
        activeStudents: active
      }));

      setInsights(prev => ({
        ...prev,
        avgAccuracy: accCount > 0 ? Math.round(totalAcc / accCount) : 0
      }));
    });

    // Realtime listeners for Submissions
    const submissionsQuery = collection(db, "submissions");
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      let pending = 0;
      const lessonStats: Record<number, { totalScore: number, count: number }> = {};

      snapshot.docs.forEach(doc => {
         const data = doc.data();
         if (data.status === "pending") pending++;
         
         if (data.score !== null) {
            if (!lessonStats[data.lessonId]) lessonStats[data.lessonId] = { totalScore: 0, count: 0 };
            lessonStats[data.lessonId].totalScore += data.score;
            lessonStats[data.lessonId].count++;
         }
      });

      // Calculate lowest accuracy lesson
      let lowest = { id: 0, accuracy: 100 };
      let mostSub = { id: 0, count: 0 };

      Object.entries(lessonStats).forEach(([id, stat]) => {
        const avg = Math.round(stat.totalScore / stat.count);
        if (avg < lowest.accuracy) {
          lowest = { id: Number(id), accuracy: avg };
        }
        if (stat.count > mostSub.count) {
          mostSub = { id: Number(id), count: stat.count };
        }
      });

      setStats(prev => ({
        ...prev,
        totalSubmissions: snapshot.size,
        pendingReviews: pending
      }));

      setInsights(prev => ({
        ...prev,
        lowestLesson: lowest,
        mostSubmissionsLesson: mostSub
      }));
    });

    return () => {
      unsubscribeStudents();
      unsubscribeSubmissions();
    };
  }, []);

  return (
    <div className="space-y-8 max-w-6xl pb-10">
      
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card relative overflow-hidden bg-gradient-to-br from-blue-900/40 via-indigo-900/40 to-[#040810] border-primary/20 p-8 md:p-12">
          <div className="relative z-10 flex flex-col space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              Admin Control Panel
            </h1>
            <p className="text-xl text-white/70 max-w-2xl">
              Overview of students and activity. Monitor progress, grade submissions, and manage lessons efficiently.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <DashboardOverview stats={stats} />

      {/* Analytics Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card p-6 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Average Accuracy</p>
                <h3 className="text-2xl font-bold text-white">{insights.avgAccuracy}%</h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Overall performance across all students.</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card p-6 border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Toughest Module</p>
                <h3 className="text-2xl font-bold text-white">
                  {insights.lowestLesson.id > 0 ? `Module ${insights.lowestLesson.id}` : "N/A"}
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {insights.lowestLesson.id > 0 
                ? `Lowest avg score: ${insights.lowestLesson.accuracy}%` 
                : "No graded submissions yet."}
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <BarChart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Most Active</p>
                <h3 className="text-2xl font-bold text-white">
                  {insights.mostSubmissionsLesson.id > 0 ? `Module ${insights.mostSubmissionsLesson.id}` : "N/A"}
                </h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {insights.mostSubmissionsLesson.id > 0 
                ? `${insights.mostSubmissionsLesson.count} submissions received.` 
                : "No activity tracked yet."}
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

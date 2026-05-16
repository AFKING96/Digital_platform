"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { DashboardOverview } from "@/components/ui/dashboard-overview";
import { TrendingDown, Users, BarChart as BarChartIcon, Target, CheckCircle2 } from "lucide-react";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalSubmissions: 0,
    pendingReviews: 0
  });

  const [insights, setInsights] = useState({
    avgAccuracy: 0,
    completionRate: 0,
    lowestLesson: { id: 0, accuracy: 100 },
    mostSubmissionsLesson: { id: 0, count: 0 },
    topLesson: { id: 0, accuracy: 0 }
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Realtime listeners for Students
    const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      let active = 0;
      let totalAcc = 0;
      let accCount = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if ((data.unlockedLessons?.length || 0) > 0 || data.solvedQuestions > 0) active++;
        
        const accuracy = Number(data.accuracy);
        if (Number.isFinite(accuracy)) {
          totalAcc += accuracy;
          accCount++;
        }
      });
      
      setStats(prev => ({
        ...prev,
        totalStudents: Number.isFinite(snapshot.size) ? snapshot.size : 0,
        activeStudents: Number.isFinite(active) ? active : 0
      }));

      setInsights(prev => ({
        ...prev,
        avgAccuracy: accCount > 0 ? Math.round(totalAcc / accCount) : 0,
        completionRate: snapshot.size > 0 ? Math.round((active / snapshot.size) * 100) : 0
      }));


    });

    const submissionsQuery = collection(db, "submissions");
    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      let pending = 0;
      const lessonStats: Record<number, { totalScore: number, count: number }> = {};

      snapshot.docs.forEach(doc => {
         const data = doc.data();
         if (data.status === "pending") pending++;
         
         const lessonId = Number(data.lessonId);
         const score = Number(data.score);

         if (!isNaN(lessonId) && !isNaN(score) && data.score !== null) {
            if (!lessonStats[lessonId]) lessonStats[lessonId] = { totalScore: 0, count: 0 };
            lessonStats[lessonId].totalScore += score;
            lessonStats[lessonId].count++;
         }
      });

      // Calculate stats with safety checks
      let lowest = { id: 0, accuracy: 100 };
      let mostSub = { id: 0, count: 0 };
      let top = { id: 0, accuracy: 0 };
      const cData: any[] = [];

      Object.entries(lessonStats).forEach(([idStr, stat]) => {
        const id = Number(idStr);
        if (isNaN(id)) return;

        const avg = stat.count > 0 ? Math.round(stat.totalScore / stat.count) : 0;
        
        if (avg < lowest.accuracy) {
          lowest = { id, accuracy: avg };
        }
        if (avg > top.accuracy) {
          top = { id, accuracy: avg };
        }
        if (stat.count > mostSub.count) {
          mostSub = { id, count: stat.count };
        }
        
        cData.push({
          name: `Mod ${id}`,
          accuracy: avg,
          submissions: stat.count
        });
      });

      setChartData(cData.sort((a, b) => a.name.localeCompare(b.name)));

      setStats(prev => ({
        ...prev,
        totalSubmissions: Number.isFinite(snapshot.size) ? snapshot.size : 0,
        pendingReviews: Number.isFinite(pending) ? pending : 0
      }));


      setInsights(prev => ({
        ...prev,
        lowestLesson: { 
          id: Number.isFinite(lowest.id) ? lowest.id : 0, 
          accuracy: Number.isFinite(lowest.accuracy) ? lowest.accuracy : 0 
        },
        mostSubmissionsLesson: { 
          id: Number.isFinite(mostSub.id) ? mostSub.id : 0, 
          count: Number.isFinite(mostSub.count) ? mostSub.count : 0 
        },
        topLesson: { 
          id: Number.isFinite(top.id) ? top.id : 0, 
          accuracy: Number.isFinite(top.accuracy) ? top.accuracy : 0 
        }
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
          <Card className="glass-card p-6 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Completion Rate</p>
                <h3 className="text-2xl font-bold text-white">{insights.completionRate}%</h3>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">Active vs Total students ratio.</p>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-emerald-400">
                 <Target className="w-5 h-5" />
                 <h3 className="font-bold uppercase tracking-widest text-xs">Top Performing Module</h3>
               </div>
               <span className="text-2xl font-black text-white">{insights.topLesson.accuracy}%</span>
             </div>
             <div className="p-4 bg-black/40 rounded-xl border border-white/5">
               <p className="text-sm text-white/80 font-medium">
                 {insights.topLesson.id > 0 ? `Module ${insights.topLesson.id} has the highest student accuracy.` : "No data available."}
               </p>
             </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="glass-card p-6 border-red-500/20 bg-red-500/5">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-red-400">
                 <TrendingDown className="w-5 h-5" />
                 <h3 className="font-bold uppercase tracking-widest text-xs">Priority Module</h3>
               </div>
               <span className="text-2xl font-black text-white">{insights.lowestLesson.accuracy}%</span>
             </div>
             <div className="p-4 bg-black/40 rounded-xl border border-white/5">
               <p className="text-sm text-white/80 font-medium">
                 {insights.lowestLesson.id > 0 ? `Module ${insights.lowestLesson.id} needs instructor review.` : "No data available."}
               </p>
             </div>
          </Card>
        </motion.div>
      </div>

      {/* Chart Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="glass-card p-8 border-white/5 bg-white/[0.02]">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Performance Overview</h2>
              <p className="text-muted-foreground">Average accuracy and submission counts per module.</p>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff40" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "#0c1220", 
                      borderColor: "#ffffff10",
                      borderRadius: "12px",
                      color: "#fff"
                    }}
                    itemStyle={{ color: "#3b82f6" }}
                  />
                  <Bar 
                    dataKey="accuracy" 
                    fill="#3b82f6" 
                    radius={[6, 6, 0, 0]} 
                    barSize={40}
                    className="drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Target, CheckCircle2, FileText, ArrowRight, Lock, BookOpen, Flame, Star } from "lucide-react";
import Link from "next/link";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

interface UserData {
  name: string;
  currentLesson: number;
  solvedQuestions: number;
  accuracy: number;
  points?: number;
  streak?: number;
}

interface Lesson {
  id: number;
  title: string;
  summary: string[];
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!auth.currentUser) {
          setLoading(false);
          return;
        }
        // Fetch User
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let uData: UserData | null = null;
        if (userDocSnap.exists()) {
          uData = userDocSnap.data() as UserData;
          setUserData(uData);
        }

        // Fetch All Lessons
        const lQuery = query(collection(db, "lessons"), orderBy("id", "asc"));
        const lSnap = await getDocs(lQuery);
        const lData: Lesson[] = [];
        lSnap.forEach(doc => lData.push(doc.data() as Lesson));
        setLessons(lData);

        // Fetch Submissions count
        const subsQuery = query(collection(db, "submissions"), where("userId", "==", auth.currentUser.uid));
        const subsSnap = await getDocs(subsQuery);
        setSubmissionsCount(subsSnap.size);

      } catch (error) {
        console.error("Error fetching dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Guard: currentLesson may be missing from Firestore — default to 1
  const currentLesson = userData?.currentLesson ?? 1;
  const currentLessonData = lessons.find(l => l.id === currentLesson);
  const currentLessonTitle = currentLessonData?.title ?? `Module ${currentLesson}`;

  return (
    <div className="space-y-12 pb-10">
      <ContainerScroll
        titleComponent={
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="text-5xl font-bold tracking-tight">
              Welcome back, <br/>
              <span className="text-primary">{userData?.name || "Student"}</span>
            </h1>
            <p className="text-muted-foreground text-xl">Here&apos;s your progress overview.</p>
          </div>
        }
      >
        <div className="h-full w-full flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#0B1220] to-[#040810] p-6 md:p-10 text-center space-y-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-12 opacity-5 pointer-events-none">
            <PlayCircle className="w-[30rem] h-[30rem] text-primary" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Current Session
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white">{currentLessonTitle}</h2>
            <p className="text-lg text-white/70 max-w-lg">
              Continue your learning journey. You&apos;re making great progress in this module.
            </p>
            
            <Link href={`/lesson/${currentLesson}`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground btn-glow px-8 py-6 text-lg rounded-xl flex items-center gap-2 mt-4 transition-all hover:scale-105">
                Continue Practice
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </ContainerScroll>

      <div className="grid gap-6 md:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <Card className="glass-card flex flex-col justify-between h-full hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Solved</h3>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-3xl font-bold">{userData?.solvedQuestions || 0}</div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card className="glass-card flex flex-col justify-between h-full hover:border-green-500/30 transition-colors">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Accuracy</h3>
              <Target className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">{userData?.accuracy || 0}%</div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card className="glass-card flex flex-col justify-between h-full hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Points</h3>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-500">{userData?.points || 0}</div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
          <Card className="glass-card flex flex-col justify-between h-full hover:border-orange-500/30 transition-colors">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Streak</h3>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-500">{userData?.streak || 0}d</div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <Card className="glass-card flex flex-col justify-between h-full hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Submissions</h3>
              <FileText className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <div className="text-3xl font-bold">{submissionsCount}</div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-6 pt-10">
        <div>
          <h2 className="text-2xl font-bold">Curriculum Outline</h2>
          <p className="text-muted-foreground">Select an unlocked module to practice.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, idx) => {
            const isUnlocked = lesson.id <= currentLesson;
            
            return (
              <motion.div key={lesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * idx }}>
                {isUnlocked ? (
                  <Link href={`/lesson/${lesson.id}`}>
                    <Card className="glass-card p-6 h-full flex flex-col gap-4 hover:scale-[1.02] hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start relative z-10">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">Unlocked</span>
                      </div>
                      <div className="relative z-10">
                        <h3 className="font-bold text-xl mb-1 text-white group-hover:text-primary transition-colors">Module {lesson.id}: {lesson.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {lesson.summary?.[0] || "Explore this module's topics and take the quiz."}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ) : (
                  <Card className="glass-card p-6 h-full flex flex-col gap-4 opacity-50 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-white/5 rounded-xl text-muted-foreground">
                        <Lock className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-1 rounded">Locked</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-1 text-muted-foreground">Module {lesson.id}: {lesson.title}</h3>
                      <p className="text-sm text-muted-foreground/50 line-clamp-2">Complete previous modules to unlock.</p>
                    </div>
                  </Card>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

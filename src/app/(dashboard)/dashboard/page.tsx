"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlayCircle, Target, CheckCircle2, FileText, ArrowRight, Lock, BookOpen, Flame, Star, ClipboardList } from "lucide-react";
import Link from "next/link";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Blocks } from "lucide-react";

interface UserData {
  name: string;
  currentLesson: number;
  solvedQuestions: number;
  accuracy: number;
  points?: number;
  streak?: number;
  completedLessons?: number[];
  enrolledSubjects?: string[];
}

interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface Lesson {
  id: number;
  order: number;
  title: string;
  summary: string[];
  isUnlocked?: boolean;
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    // 1. Real-time User Data
    const userUnsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
    });

    // 3. Real-time Submissions count
    const subsQuery = query(collection(db, "submissions"), where("userId", "==", auth.currentUser.uid));
    const subsUnsubscribe = onSnapshot(subsQuery, (snapshot) => {
      setSubmissionsCount(snapshot.size);
    });

    return () => {
      userUnsubscribe();
      subsUnsubscribe();
    };
  }, []);

  // Fetch subjects when userData.enrolledSubjects changes
  useEffect(() => {
    const enrolledIds = userData?.enrolledSubjects || [];
    if (enrolledIds.length > 0) {
      const fetchSubjects = async () => {
        const subjectDocs = await Promise.all(
          enrolledIds.map((id: string) => getDoc(doc(db, "subjects", id)))
        );
        const sData = subjectDocs
          .filter(snap => snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() } as Subject));

        setSubjects(sData);
        // Automatically select if only 1 subject
        setLoading(false); // Can hide skeleton once subjects are loaded
      };
      fetchSubjects();
    } else if (userData) {
      // If userData is loaded but no enrolled subjects, stop loading
      setLoading(false);
    }
  }, [userData?.enrolledSubjects]);

  // Set selectedSubjectId automatically
  useEffect(() => {
    if (subjects.length === 1 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Subscribe to lessons based on selectedSubjectId
  useEffect(() => {
    let lessonsQuery;
    if (selectedSubjectId) {
      lessonsQuery = query(collection(db, "lessons"), where("subjectId", "==", selectedSubjectId));
    } else {
      lessonsQuery = query(collection(db, "lessons"), orderBy("order", "asc"));
    }

    const lessonsUnsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
      const lData: Lesson[] = [];
      snapshot.forEach(doc => {
        const l = doc.data() as Lesson;
        // If no subject selected, only show legacy lessons (no subjectId)
        if (!selectedSubjectId && (l as any).subjectId) return;
        lData.push(l);
      });

      // Client-side sort if subject selected
      if (selectedSubjectId) {
        lData.sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      setLessons(lData);
      setLoading(false);
    });

    return () => lessonsUnsubscribe();
  }, [selectedSubjectId]);

  if (loading) {
    return (
      <div className="space-y-12 pb-10">
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3 bg-white/5" />
          <Skeleton className="h-6 w-1/4 bg-white/5" />
        </div>

        <Skeleton className="h-[450px] w-full rounded-[40px] bg-white/5" />
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-white/5" />
          ))}
        </div>
        
        <div className="space-y-6 pt-10">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-white/5" />
            <Skeleton className="h-4 w-64 bg-white/5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-[32px] bg-white/5" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Guard: currentLesson may be missing from Firestore — default to 1
  const currentLesson = userData?.currentLesson ?? 1;
  const currentLessonIdx = lessons.findIndex(l => l.id === currentLesson);
  const currentLessonDisplayNumber = currentLessonIdx !== -1 ? currentLessonIdx + 1 : (lessons.length > 0 ? 1 : currentLesson);
  
  const currentLessonData = lessons.find(l => l.id === currentLesson);
  const currentLessonTitle = currentLessonData?.title 
    ? `Module ${currentLessonDisplayNumber}: ${currentLessonData.title}` 
    : `Module ${currentLessonDisplayNumber}`;
  
  const completedCount = userData?.completedLessons?.length || 0;
  const progressPercentage = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  if (subjects.length > 0 && !selectedSubjectId) {
    return (
      <div className="space-y-12 pb-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome back, <br/>
            <span className="text-primary">{userData?.name || "Student"}</span>
          </h1>
          <p className="text-muted-foreground text-xl">Select a subject to continue your journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map((subject, idx) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer"
              onClick={() => setSelectedSubjectId(subject.id)}
            >
              <Card className={cn(
                "p-8 h-full bg-white/5 border-white/10 hover:border-primary/50 transition-all relative overflow-hidden group",
                `hover:bg-${subject.color}-500/5`
              )}>
                <div className={cn(
                  "absolute top-0 left-0 w-1.5 h-full transition-all",
                  `bg-${subject.color}-500`
                )} />
                
                <div className="flex flex-col h-full gap-6">
                  <div className={cn(
                    "p-4 rounded-2xl w-fit transition-all",
                    `bg-${subject.color}-500/10 text-${subject.color}-500 group-hover:scale-110`
                  )}>
                    <Blocks className="w-8 h-8" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">{subject.name}</h3>
                    <p className="text-muted-foreground line-clamp-2">{subject.description}</p>
                  </div>

                  <div className="mt-auto pt-6 flex items-center gap-2 text-primary font-bold">
                    <span>Enter Course</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-10">
      {subjects.length > 1 && (
        <Button 
          variant="ghost" 
          onClick={() => setSelectedSubjectId(null)}
          className="text-muted-foreground hover:text-white -mb-8"
        >
          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
          Switch Subject
        </Button>
      )}
      <ContainerScroll
        titleComponent={
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-5xl font-bold tracking-tight">
                Welcome back, <br/>
                <span className="text-primary">{userData?.name || "Student"}</span>
              </h1>
              <p className="text-muted-foreground text-xl">Here&apos;s your progress overview.</p>
            </div>
            
            <div className="max-w-md w-full space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground font-medium">Overall Progress</span>
                <span className="text-primary font-bold">{progressPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                />
              </div>
            </div>
          </div>
        }
      >
        <div className="h-full w-full flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#0B1220] to-[#040810] p-6 md:p-10 text-center space-y-6">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-12 opacity-5 pointer-events-none">
            <PlayCircle className="w-[30rem] h-[30rem] text-primary" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${currentLessonData?.isUnlocked === false ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-primary/30 bg-primary/10 text-primary"}`}>
              {currentLessonData?.isUnlocked === false ? <Lock className="w-3 h-3 mr-2" /> : null}
              Current Lesson
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white">{currentLessonTitle}</h2>
            <p className="text-lg text-white/70 max-w-lg">
              Follow your lesson workflow to master the material.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <Link href={`/materials`} className={currentLessonData?.isUnlocked === false ? "pointer-events-none opacity-50" : ""}>
                <Button variant="outline" className="border-white/10 hover:bg-white/5 h-14 px-6 rounded-2xl flex items-center gap-2 group" disabled={currentLessonData?.isUnlocked === false}>
                  <BookOpen className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  Materials
                </Button>
              </Link>
              <Link href={`/practice/${currentLesson}`} className={currentLessonData?.isUnlocked === false ? "pointer-events-none" : ""}>
                <Button 
                  className={`${currentLessonData?.isUnlocked === false ? "bg-white/10 text-white/40 cursor-not-allowed" : "bg-primary hover:bg-primary/90 text-white shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-105"} h-14 px-8 rounded-2xl flex items-center gap-2 transition-all`}
                  disabled={currentLessonData?.isUnlocked === false}
                >
                  {currentLessonData?.isUnlocked === false ? <Lock className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                  {currentLessonData?.isUnlocked === false ? "Locked" : "Start Practice"}
                </Button>
              </Link>
              <Link href={`/homework/${currentLesson}`} className={currentLessonData?.isUnlocked === false ? "pointer-events-none opacity-50" : ""}>
                <Button variant="outline" className="border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 h-14 px-6 rounded-2xl flex items-center gap-2 group" disabled={currentLessonData?.isUnlocked === false}>
                  <ClipboardList className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  Homework
                </Button>
              </Link>
            </div>
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
          <Card className="glass-card flex flex-col justify-between h-full border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-sm font-medium text-primary uppercase tracking-tighter">Current Goal</h3>
              <Target className="h-4 w-4 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold">Achieve 90% Accuracy</div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${Math.min((userData?.accuracy || 0) / 90 * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">Current: {userData?.accuracy || 0}%</p>
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
            const isUnlocked = lesson.isUnlocked ?? false;
            
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
                        <h3 className="font-bold text-xl mb-1 text-white group-hover:text-primary transition-colors">Module {lesson.order}: {lesson.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {lesson.summary?.[0] || "Explore this module's topics and take the quiz."}
                        </p>
                      </div>
                    </Card>
                  </Link>
                ) : (
                  <Card className="glass-card p-6 h-full flex flex-col gap-4 opacity-40 relative overflow-hidden grayscale blur-[0.5px] cursor-not-allowed group">
                    <div className="absolute inset-0 bg-black/10 z-20 flex flex-col items-center justify-center backdrop-blur-[1px]">
                      <Lock className="w-8 h-8 text-white/40 mb-2" />
                      <span className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em]">Available Soon</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="p-3 bg-white/5 rounded-xl text-muted-foreground">
                        <Lock className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-white/5 px-2 py-1 rounded">Locked</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-1 text-muted-foreground">Module {lesson.order}: {lesson.title}</h3>
                      <p className="text-sm text-muted-foreground/50 line-clamp-2">This module is currently unavailable.</p>
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

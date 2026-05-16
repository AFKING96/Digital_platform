"use client";

import { useEffect, useState, useMemo } from "react";
import { doc, getDoc, collection, getDocs, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/auth-provider";
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
  unlockedLessons?: number[];
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
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Real-time User Data
    const userUnsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
    });

    // 3. Real-time Submissions count
    const subsQuery = query(collection(db, "submissions"), where("userId", "==", user.uid));
    const subsUnsubscribe = onSnapshot(subsQuery, (snapshot) => {
      setSubmissionsCount(snapshot.size);
    });

    return () => {
      userUnsubscribe();
      subsUnsubscribe();
    };
  }, [user]);

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
  // Refined: Find the latest unlocked lesson that belongs to the current subject
  const currentLessonId = useMemo(() => {
    if (!userData?.unlockedLessons || userData.unlockedLessons.length === 0 || lessons.length === 0) return null;
    
    // Filter unlocked lessons to only those in the current subject's lessons list
    const unlockedInSubject = userData.unlockedLessons.filter(id => lessons.some(l => l.id === id));
    
    if (unlockedInSubject.length > 0) {
      return unlockedInSubject[unlockedInSubject.length - 1];
    }
    
    return null;
  }, [userData?.unlockedLessons, lessons]);

  const currentLessonData = lessons.find(l => l.id === currentLessonId);
  const currentLessonIdx = currentLessonId ? lessons.findIndex(l => l.id === currentLessonId) : -1;
  const currentLessonDisplayNumber = currentLessonIdx !== -1 ? currentLessonIdx + 1 : 0;
  
  const isHeroUnlocked = (currentLessonData && currentLessonId !== null)
    ? (userData?.unlockedLessons ? userData.unlockedLessons.includes(currentLessonId) : false) 
    : false;

  const currentLessonTitle = currentLessonData?.title 
    ? `Module ${currentLessonDisplayNumber}: ${currentLessonData.title}` 
    : `Module ${currentLessonDisplayNumber}`;
  
  const completedCount = userData?.completedLessons?.length || 0;
  const unlockedCount = userData?.unlockedLessons?.length || 0;
  const progressPercentage = unlockedCount > 0 ? Math.round((completedCount / unlockedCount) * 100) : 0;

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-8">
            <div className="flex flex-col gap-2">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Welcome back, <br/>
                <span className="text-primary bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">{userData?.name || "Student"}</span>
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl">You&apos;re doing great! Here&apos;s your progress overview.</p>
            </div>
            
            <div className="max-w-xs w-full space-y-3 bg-white/5 p-6 rounded-[32px] border border-white/10 backdrop-blur-xl">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Course Progress</span>
                <span className="text-primary font-black">{progressPercentage}%</span>
              </div>
              <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                />
              </div>
            </div>
          </div>
        }
      >
        <div className="h-full w-full flex flex-col justify-center items-center relative overflow-hidden bg-gradient-to-br from-[#0B1220] to-[#040810] p-8 md:p-16 text-center space-y-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center gap-8">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`inline-flex items-center rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] shadow-lg ${!isHeroUnlocked ? "border-amber-500/30 bg-amber-500/10 text-amber-500" : "border-primary/30 bg-primary/10 text-primary"}`}
            >
              {!isHeroUnlocked ? <Lock className="w-3.5 h-3.5 mr-2" /> : <Star className="w-3.5 h-3.5 mr-2 fill-primary" />}
              {!isHeroUnlocked ? "Locked Content" : "Active Module"}
            </motion.div>
            
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black text-white leading-tight tracking-tight">
                {currentLessonId ? (currentLessonData?.title || `Module ${currentLessonDisplayNumber}`) : "No Active Module"}
              </h2>
              <p className="text-xl text-white/60 max-w-2xl mx-auto font-medium">
                {currentLessonId ? (currentLessonData?.summary?.[0] || "Dive into today's module and expand your knowledge with interactive content.") : "Your instructor hasn't unlocked any modules for you yet. Check back soon!"}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-6 mt-6">
              <Link href={`/lesson/${currentLessonId}`} className={!isHeroUnlocked ? "pointer-events-none opacity-50" : ""}>
                <Button className={`${!isHeroUnlocked ? "bg-white/10" : "bg-primary hover:bg-primary/90 text-white shadow-[0_0_40px_rgba(var(--primary),0.4)]"} h-20 px-12 rounded-[28px] text-lg font-black flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group`} disabled={!isHeroUnlocked}>
                  <PlayCircle className="w-7 h-7 transition-transform group-hover:scale-110" />
                  Watch Video
                </Button>
              </Link>
              <Link href={`/solve/${currentLessonId}`} className={!isHeroUnlocked ? "pointer-events-none" : ""}>
                <Button 
                  variant="outline"
                  className={`h-20 px-10 rounded-[28px] border-white/10 bg-white/5 hover:bg-white/10 text-white text-lg font-bold flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group`}
                  disabled={!isHeroUnlocked}
                >
                  <Target className="w-7 h-7 text-primary group-hover:rotate-12 transition-transform" />
                  Solve Assessment
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-8 border-t border-white/5 opacity-60">
               <Link href="/materials" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">
                 <BookOpen className="w-4 h-4" /> Resources
               </Link>
               <Link href={`/homework/${currentLessonId}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-emerald-400 transition-colors">
                 <ClipboardList className="w-4 h-4" /> Homework
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
            const isUnlocked = userData?.unlockedLessons 
              ? userData.unlockedLessons.includes(lesson.id) 
              : false;
            
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

"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, PlayCircle, RotateCcw, BookOpen } from "lucide-react";
import Link from "next/link";
import { TiltCard } from "@/components/ui/tilt-card";
import { Skeleton } from "@/components/ui/skeleton";

interface Lesson {
  id: number;
  order: number;
  title: string;
  summary: string[];
}

export default function PracticePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPracticeData = async () => {
      if (!auth.currentUser) return;

      try {
        // Get user's current lesson
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          setCurrentLesson(userDocSnap.data().currentLesson);
        }

        // Get all lessons
        const lessonsQuery = query(collection(db, "lessons"), orderBy("order", "asc"));
        const lessonsSnap = await getDocs(lessonsQuery);
        
        const lessonsData = lessonsSnap.docs.map(doc => ({
          ...doc.data()
        })) as Lesson[];
        
        setLessons(lessonsData);
      } catch (error) {
        console.error("Error fetching practice data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-4 w-64 bg-white/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const currentIdx = lessons.findIndex(l => l.id === currentLesson);
  const currentDisplayNum = currentIdx !== -1 ? currentIdx + 1 : (lessons.length > 0 ? 1 : currentLesson);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Practice Modules</h1>
        <p className="text-muted-foreground">Select a module to begin or review your learning.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson, index) => {
          const isCompleted = lesson.order < currentDisplayNum;
          const isAvailable = lesson.order === currentDisplayNum;
          const isLocked = lesson.order > currentDisplayNum;

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <TiltCard>
                <Card className={`glass-card h-full flex flex-col relative overflow-hidden transition-all duration-300 ${
                  isLocked ? 'opacity-60 grayscale hover:grayscale-0' : 'hover:border-primary/50'
                }`}>
                  {/* Status Badge */}
                  <div className="mb-4">
                    {isCompleted && (
                      <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                        Completed
                      </span>
                    )}
                    {isAvailable && (
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        Available Now
                      </span>
                    )}
                    {isLocked && (
                      <span className="inline-flex items-center rounded-full border border-muted-foreground/30 bg-muted-foreground/10 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                        Locked
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold mb-2 text-white">{lesson.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                    Module {lesson.order}
                  </p>

                  <div className="mt-6 pt-4 border-t border-white/5">
                    {isLocked ? (
                      <Button disabled variant="outline" className="w-full bg-black/20 border-white/10 text-muted-foreground flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        Locked
                      </Button>
                    ) : isAvailable ? (
                      <Link href={`/lesson/${lesson.id}`} className="block">
                        <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground btn-glow flex items-center justify-center gap-2">
                          <PlayCircle className="w-4 h-4" />
                          Start Module
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/lesson/${lesson.id}`} className="block">
                        <Button variant="outline" className="w-full bg-secondary/10 hover:bg-secondary/20 border-secondary/20 text-secondary-foreground flex items-center justify-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Review
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

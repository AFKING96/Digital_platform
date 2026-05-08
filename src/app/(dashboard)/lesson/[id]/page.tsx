"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, BookOpen, StickyNote, Lock } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Lesson {
  id: number;
  title: string;
  summary: string[];
  isUnlocked?: boolean;
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!params.id) return;

    // 1. Real-time Lesson data
    const docRef = doc(db, "lessons", params.id as string);
    const unsubscribeLesson = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setLesson(snap.data() as Lesson);
      } else {
        setLesson(null);
      }
      setLoading(false);
    });

    // 2. Fetch lesson order (usually doesn't change during session, but good to have)
    const fetchOrder = async () => {
      const q = query(collection(db, "lessons"), where("id", "==", Number(params.id)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setDisplayNumber(snap.docs[0].data().order);
      }
    };
    fetchOrder();

    const savedNotes = localStorage.getItem(`lesson_notes_${params.id}`);
    if (savedNotes) setNotes(savedNotes);

    return () => unsubscribeLesson();
  }, [params.id]);

  const saveNotes = (val: string) => {
    setNotes(val);
    localStorage.setItem(`lesson_notes_${params.id}`, val);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <Skeleton className="h-8 w-32 bg-white/5" />
        <Skeleton className="h-[500px] w-full rounded-[32px] bg-white/5" />
        <Skeleton className="h-64 w-full rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (!lesson || lesson.isUnlocked === false) {
    return (
      <div className="text-center py-20 px-6 max-w-lg mx-auto flex flex-col items-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-3xl font-bold mb-4">This lesson is not available yet</h2>
        <p className="text-muted-foreground mb-8">Your instructor hasn't unlocked this module for you. Please check back later or contact your instructor.</p>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full h-12 rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <Button 
        variant="ghost" 
        onClick={() => router.push('/dashboard')}
        className="text-muted-foreground hover:text-white mb-4 -ml-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-card relative overflow-hidden border-primary/20 p-8 md:p-12">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <BookOpen className="w-64 h-64 text-primary" />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              Module {displayNumber || lesson.id}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {lesson.title}
            </h1>
            
            <div className="mt-10 space-y-6 bg-black/20 p-6 md:p-8 rounded-[24px] border border-white/5">
              <h2 className="text-2xl font-semibold text-white/90">Key Takeaways</h2>
              <ul className="space-y-4">
                {lesson.summary?.map((point, index) => (
                  <motion.li 
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
                    className="flex gap-4 items-start"
                  >
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="text-lg text-white/80 leading-relaxed">{point}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="pt-8 flex justify-end">
              <Link href={`/solve/${lesson.id}`}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground btn-glow px-8 py-6 text-lg rounded-xl flex items-center gap-2">
                  <PlayCircle className="w-5 h-5" />
                  Start Practice Quiz
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Student Notes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-white/60">
          <StickyNote className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">My Lesson Notes</h2>
        </div>
        <Card className="glass-card bg-black/40 border-white/5 p-6">
          <textarea
            value={notes}
            onChange={(e) => saveNotes(e.target.value)}
            placeholder="Type your notes here... (Automatically saved)"
            className="w-full h-48 bg-transparent text-white/80 placeholder:text-white/10 resize-none outline-none text-lg leading-relaxed"
          />
          <div className="mt-2 text-right text-[10px] uppercase tracking-widest text-white/20">
            Saved to local storage
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

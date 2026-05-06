"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, BookOpen, StickyNote } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface Lesson {
  id: number;
  title: string;
  summary: string[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch current lesson
        const docRef = doc(db, "lessons", params.id as string);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setLesson(snap.data() as Lesson);
        }

        // 2. Fetch lesson to get order
        const lessonsRef = collection(db, "lessons");
        const q = query(lessonsRef, where("id", "==", Number(params.id)));
        const lessonsSnap = await getDocs(q);
        if (!lessonsSnap.empty) {
          setDisplayNumber(lessonsSnap.docs[0].data().order);
        }

      } catch (error) {
        console.warn("Error fetching lesson data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) { 
      fetchData(); 
      const savedNotes = localStorage.getItem(`lesson_notes_${params.id}`);
      if (savedNotes) setNotes(savedNotes);
    }
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

  if (!lesson) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">Lesson not found</h2>
        <Button onClick={() => router.push('/dashboard')} variant="outline">
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

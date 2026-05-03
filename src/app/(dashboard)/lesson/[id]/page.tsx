"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PlayCircle, BookOpen } from "lucide-react";
import Link from "next/link";

interface Lesson {
  id: number;
  title: string;
  summary: string[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLesson = async () => {
      // Lessons are stored with their numeric ID as the Firestore doc ID (e.g. "1", "2")
      const docRef = doc(db, "lessons", params.id as string);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setLesson(snap.data() as Lesson);
        }
        // If not found, lesson stays null → the "not found" UI renders (no console.error)
      } catch (error) {
        // Only log genuine network/permission errors, not "not found"
        console.warn("Error fetching lesson:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchLesson();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
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
              Module {lesson.id}
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
    </div>
  );
}

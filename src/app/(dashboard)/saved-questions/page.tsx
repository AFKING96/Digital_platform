"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Info, Loader2, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SavedQuestion {
  id: string;
  type: string;
  content: string;
  answer: string;
  explanation?: string;
  category: "practice" | "homework";
  lessonId: number;
}

export default function SavedQuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<SavedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSaved() {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return setLoading(false);
        
        const savedIds = userDoc.data().savedQuestions || [];
        if (savedIds.length === 0) {
          setQuestions([]);
          return setLoading(false);
        }

        // Fetch from practice_questions
        const pSnap = await getDocs(collection(db, "practice_questions"));
        const pData = pSnap.docs
          .filter(d => savedIds.includes(d.id))
          .map(d => ({ id: d.id, ...d.data(), category: "practice" } as SavedQuestion));

        // Fetch from homework_questions
        const hSnap = await getDocs(collection(db, "homework_questions"));
        const hData = hSnap.docs
          .filter(d => savedIds.includes(d.id))
          .map(d => ({ id: d.id, ...d.data(), category: "homework" } as SavedQuestion));

        setQuestions([...pData, ...hData]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchSaved();
  }, [user]);

  const handleRemove = async (qId: string) => {
    if (!user) return;
    setIsRemoving(qId);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        savedQuestions: arrayRemove(qId)
      });
      setQuestions(prev => prev.filter(q => q.id !== qId));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRemoving(null);
    }
  };

  if (loading) return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-12 w-48 bg-white/5" />
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-4xl font-black bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
          Saved Questions
        </h1>
        <p className="text-muted-foreground text-lg">Review important questions you've flagged during your study sessions.</p>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-6 bg-white/5 border-white/10 hover:border-white/20 transition-all group relative overflow-hidden">
                <div className={cn(
                  "absolute top-0 left-0 w-1 h-full",
                  q.category === "practice" ? "bg-primary" : "bg-emerald-500"
                )} />

                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                        q.category === "practice" 
                          ? "bg-primary/10 text-primary border-primary/20" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        {q.category}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        Lesson {q.lessonId}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold leading-tight">{q.content}</h3>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm text-emerald-400 font-bold">
                        <CheckCircle2 className="w-4 h-4" /> Correct: {q.answer}
                      </div>
                      {q.explanation && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                          <Info className="w-4 h-4" /> Has explanation
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-400 hover:bg-red-500/10"
                      disabled={isRemoving === q.id}
                      onClick={() => handleRemove(q.id)}
                    >
                      {isRemoving === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {q.explanation && (
                  <div className="mt-6 p-4 bg-black/20 rounded-xl border border-white/5">
                    <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {questions.length === 0 && (
          <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
            <Star className="w-20 h-20 text-white/5 mx-auto mb-6" />
            <h2 className="text-2xl font-bold">No Saved Questions</h2>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Questions you mark with a star during practice or homework will appear here for easy review.</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, updateDoc, getDoc, getDocs, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Submission {
  id: string;
  userId: string;
  lessonId: string;
  answers: Record<number, string>;
  score: number | null;
  status: "pending" | "reviewed";
  feedback: string;
  userName?: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("pending");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: "" });
  const [lessonMap, setLessonMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch lesson mapping first
    const fetchLessons = async () => {
      const q = query(collection(db, "lessons"), orderBy("order", "asc"));
      const snap = await getDocs(q);
      const mapping: Record<number, number> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        mapping[data.id] = data.order;
      });
      setLessonMap(mapping);
    };
    fetchLessons();

    // 2. Real-time submissions
    const q = query(collection(db, "submissions"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const subs: Submission[] = [];
      
      for (const document of snapshot.docs) {
        const data = document.data() as Submission;
        // Fetch user name
        let userName = "Unknown Student";
        try {
          const userSnap = await getDoc(doc(db, "users", data.userId));
          if (userSnap.exists()) userName = userSnap.data().name;
        } catch {}
        
        subs.push({ ...data, id: document.id, userName });
      }
      // Sort by status pending first
      subs.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        return 0;
      });
      setSubmissions(subs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-10 w-64 bg-white/5" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const handleGrade = (sub: Submission) => {
    setGradingId(sub.id);
    setGradeForm({
      score: sub.score || 0,
      feedback: sub.feedback || ""
    });
  };

  const handleSaveGrade = async (sub: Submission) => {
    try {
      const numericScore = Number(gradeForm.score);
      
      await updateDoc(doc(db, "submissions", sub.id), {
        score: numericScore,
        feedback: gradeForm.feedback,
        status: "reviewed"
      });

      // Update user accuracy based on the new grade
      if (sub.userId) {
        const userRef = doc(db, "users", sub.userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const ud = userSnap.data();
          const oldAccuracy = ud.accuracy || 0;
          const oldSolved = ud.solvedQuestions || 0;
          
          const newAccuracy = oldAccuracy === 0 ? numericScore : Math.round((oldAccuracy + numericScore) / 2);
          
          await updateDoc(userRef, {
            accuracy: newAccuracy,
            // Assume 1 submission = 1 overall quiz completion, you can add to solved questions too
            solvedQuestions: oldSolved + 1
          });
        }
      }

      setGradingId(null);
    } catch (error) {
      console.error("Error updating submission:", error);
    }
  };

  const filtered = submissions.filter(s => filter === "all" ? true : s.status === filter);

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submissions & Grading</h1>
          <p className="text-muted-foreground">Review student answers and provide feedback.</p>
        </div>
        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
          <button onClick={() => setFilter("pending")} className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === "pending" ? "bg-primary text-white" : "text-muted-foreground"}`}>Pending</button>
          <button onClick={() => setFilter("reviewed")} className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === "reviewed" ? "bg-primary text-white" : "text-muted-foreground"}`}>Reviewed</button>
          <button onClick={() => setFilter("all")} className={`px-4 py-2 text-sm rounded-lg transition-colors ${filter === "all" ? "bg-primary text-white" : "text-muted-foreground"}`}>All</button>
        </div>
      </div>

      <div className="grid gap-6">
        {filtered.map((sub) => (
          <motion.div key={sub.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className={`glass-card p-6 border-l-4 ${sub.status === "pending" ? "border-l-yellow-500" : "border-l-green-500"}`}>
              <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-bold text-xl text-white">{sub.userName}</h3>
                  <p className="text-sm text-muted-foreground">Module {lessonMap[Number(sub.lessonId)] || sub.lessonId}</p>
                </div>
                {sub.status === "pending" ? (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Reviewed ({sub.score}%)</Badge>
                )}
              </div>

              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Student Answers:</h4>
                <div className="bg-black/30 p-4 rounded-xl space-y-3">
                  {Object.entries(sub.answers).map(([qId, ans]) => (
                    <div key={qId} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <span className="text-xs text-muted-foreground">Q{Number(qId)+1}:</span> <span className="text-sm text-white ml-2">{ans as string}</span>
                    </div>
                  ))}
                </div>
              </div>

              {gradingId === sub.id ? (
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">Final Score (%):</span>
                    <Input type="number" value={gradeForm.score} onChange={e => setGradeForm({...gradeForm, score: Number(e.target.value)})} className="w-24 bg-black/50" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Instructor Feedback:</span>
                    <Textarea 
                      value={gradeForm.feedback} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGradeForm({...gradeForm, feedback: e.target.value})} 
                      className="bg-black/50 resize-none" 
                      rows={3} 
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setGradingId(null)}>Cancel</Button>
                    <Button onClick={() => handleSaveGrade(sub)} className="bg-primary hover:bg-primary/90">
                      <Save className="w-4 h-4 mr-2"/> Save Review
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {sub.status === "pending" ? (
                    <Button onClick={() => handleGrade(sub)} className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white">
                      Review & Grade
                    </Button>
                  ) : (
                    <div className="bg-white/5 p-4 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Feedback provided:</span>
                        <Button size="sm" variant="ghost" onClick={() => handleGrade(sub)} className="h-8">Edit Grade</Button>
                      </div>
                      <p className="text-sm text-white">{sub.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No submissions found.</div>
        )}
      </div>
    </div>
  );
}

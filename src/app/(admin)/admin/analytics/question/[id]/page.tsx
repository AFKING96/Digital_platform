"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  ChevronLeft, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PieChart, 
  TrendingUp,
  User,
  ArrowRight,
  Filter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Submission {
  id: string;
  userId: string;
  userName: string;
  answer: string;
  isCorrect: boolean;
  isLate?: boolean;
  timestamp: any;
}

interface Question {
  id: string;
  content: string;
  type: string;
  answer: string;
  options?: string[];
  lessonId: number;
}

export default function QuestionAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!params.id) return;
      
      // Fetch Question Metadata (Try both collections)
      let qDoc = await getDoc(doc(db, "practice_questions", params.id as string));
      if (!qDoc.exists()) {
        qDoc = await getDoc(doc(db, "homework_questions", params.id as string));
      }
      
      if (qDoc.exists()) {
        setQuestion({ id: qDoc.id, ...qDoc.data() } as Question);
      }

      // Fetch Submissions for this question
      const unsub = onSnapshot(
        query(collection(db, "submissions"), where("questionId", "==", params.id), orderBy("timestamp", "desc")),
        (snap) => {
          setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
          setLoading(false);
        }
      );

      return () => unsub();
    }
    fetchData();
  }, [params.id]);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-64 w-full bg-white/5" /></div>;

  if (!question) return (
    <div className="p-8 text-center py-32">
      <h2 className="text-2xl font-bold">Question not found.</h2>
      <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
    </div>
  );

  const total = submissions.length;
  const correct = submissions.filter(s => s.isCorrect).length;
  const incorrect = total - correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const late = submissions.filter(s => s.isLate).length;

  // Group by answer for MCQ
  const answerDist: Record<string, number> = {};
  submissions.forEach(s => {
    answerDist[s.answer] = (answerDist[s.answer] || 0) + 1;
  });

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground">
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Management
        </Button>
        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest">Question Analytics</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Question Overview & Stats */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 bg-white/5 border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded">
                  {question.type}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Lesson {question.lessonId}
                </span>
              </div>
              <h1 className="text-2xl font-bold leading-tight">{question.content}</h1>
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                 <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Correct Answer</p>
                 <p className="text-lg font-bold text-white">{question.answer}</p>
              </div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 bg-white/5 border-white/10 text-center space-y-1">
              <div className="text-3xl font-black">{total}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Responses</div>
            </Card>
            <Card className="p-6 bg-white/5 border-white/10 text-center space-y-1">
              <div className="text-3xl font-black text-emerald-400">{accuracy}%</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Accuracy Rate</div>
            </Card>
            <Card className="p-6 bg-white/5 border-white/10 text-center space-y-1">
              <div className="text-3xl font-black text-red-400">{incorrect}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Failures</div>
            </Card>
            <Card className="p-6 bg-white/5 border-white/10 text-center space-y-1">
              <div className="text-3xl font-black text-orange-400">{late}</div>
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Late Subs</div>
            </Card>
          </div>

          {/* Answer Distribution (if MCQ) */}
          {question.options && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <PieChart className="w-4 h-4" /> Answer Distribution
              </h2>
              <Card className="p-8 bg-white/5 border-white/10 space-y-6">
                {question.options.map((opt, i) => {
                  const count = answerDist[opt] || 0;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  const isCorrect = opt === question.answer;

                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                            isCorrect ? "bg-emerald-500 text-white" : "bg-white/10 text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <span className={cn("text-sm font-medium", isCorrect && "text-emerald-400 font-bold")}>{opt}</span>
                        </div>
                        <div className="text-xs font-bold">{count} ({Math.round(percent)}%)</div>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          className={cn("h-full", isCorrect ? "bg-emerald-500" : "bg-primary/50")}
                        />
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          )}
        </div>

        {/* Right: Individual Responses Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
            <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Recent Responses</span>
            <span className="text-[10px] opacity-60">Real-time</span>
          </h2>
          <div className="space-y-3">
            {submissions.map(sub => (
              <Card key={sub.id} className="p-4 bg-white/5 border-white/10 flex items-center justify-between group hover:border-white/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">{sub.userName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {sub.timestamp?.toDate?.() ? sub.timestamp.toDate().toLocaleTimeString() : "Just now"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sub.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  {sub.isLate && <Clock className="w-3 h-3 text-orange-400" />}
                </div>
              </Card>
            ))}
            {submissions.length === 0 && (
              <div className="text-center py-20 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                <Users className="w-8 h-8 text-white/5 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No responses yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

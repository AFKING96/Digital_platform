"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, orderBy, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ClipboardList, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Star, 
  Trophy,
  ArrowRight,
  AlertCircle,
  Info,
  Lock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Homework {
  id: string;
  type: "MCQ" | "TF" | "Essay" | "Image" | "Form";
  content: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  imageUrl?: string;
  link?: string;
  deadline?: any;
}

export default function HomeworkSolverPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Homework[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!params.id) return;
      
      // Check if lesson is unlocked and subject is enrolled
      const lessonDoc = await getDoc(doc(db, "lessons", params.id as string));
      if (lessonDoc.exists()) {
        const lessonData = lessonDoc.data();
        
        // 1. Check Unlock Status
        if (lessonData.isUnlocked === false) {
          setIsLocked(true);
          setLoading(false);
          return;
        }

        // 2. Check Subject Enrollment
        if (lessonData.subjectId && user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const enrolled = userDoc.data()?.enrolledSubjects || [];
          if (!enrolled.includes(lessonData.subjectId)) {
            setIsLocked(true);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch Homework Questions
      const hSnap = await getDocs(query(
        collection(db, "homework_questions"), 
        where("lessonId", "==", Number(params.id))
      ));
      const hData = hSnap.docs.map(d => ({ id: d.id, ...d.data() } as Homework));
      // Client-side sort to avoid index requirements
      hData.sort((a, b) => ((a as any).order || 0) - ((b as any).order || 0));
      setQuestions(hData);

      // Fetch Saved Questions
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setSavedIds(userDoc.data().savedQuestions || []);
        }

        // Fetch existing submissions to see what's already done
        const subSnap = await getDocs(query(
          collection(db, "submissions"),
          where("userId", "==", user.uid),
          where("lessonId", "==", Number(params.id)),
          where("type", "==", "homework")
        ));
        const existingSubs: Record<string, boolean> = {};
        const existingAnswers: Record<string, any> = {};
        subSnap.docs.forEach(d => {
          existingSubs[d.data().questionId] = true;
          existingAnswers[d.data().questionId] = d.data().answer;
        });
        setSubmitted(existingSubs);
        setAnswers(existingAnswers);
      }
      
      setLoading(false);
    }
    fetchData();
  }, [params.id, user]);

  const handleSelectOption = (opt: string) => {
    if (submitted[questions[currentIndex].id]) return;
    setAnswers({ ...answers, [questions[currentIndex].id]: opt });
  };

  const handleCheck = async () => {
    const q = questions[currentIndex];
    const deadline = q.deadline?.toDate ? q.deadline.toDate() : q.deadline;
    const isLate = deadline && new Date() > new Date(deadline);

    setSubmitted({ ...submitted, [q.id]: true });

    if (user) {
      const isCorrect = answers[q.id] === q.answer;
      await setDoc(doc(db, "submissions", `${user.uid}_${q.id}`), {
        userId: user.uid,
        userName: user.displayName || "Student",
        questionId: q.id,
        lessonId: Number(params.id),
        answer: answers[q.id] || "",
        isCorrect,
        type: "homework",
        isLate,
        timestamp: serverTimestamp()
      });
    }
  };

  const toggleSave = async (qId: string) => {
    if (!user) return;
    const isSaved = savedIds.includes(qId);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        savedQuestions: isSaved ? arrayRemove(qId) : arrayUnion(qId)
      });
      setSavedIds(prev => isSaved ? prev.filter(id => id !== qId) : [...prev, qId]);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="p-8 max-w-4xl mx-auto"><Skeleton className="h-[500px] w-full bg-white/5 rounded-[40px]" /></div>;

  if (isLocked) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Homework Locked</h2>
        <p className="text-muted-foreground mb-8">This assignment is part of a module that hasn&apos;t been unlocked by your instructor yet.</p>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full h-12 rounded-xl">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8">
        <ClipboardList className="w-20 h-20 text-white/5 mb-6" />
        <h2 className="text-2xl font-bold">No Homework Tasks</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">No homework has been assigned for this lesson yet.</p>
        <Button onClick={() => router.push("/homework")} variant="link" className="mt-4 text-emerald-400">Go back</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion.id];
  const isSubmitted = submitted[currentQuestion.id];
  const isCorrect = currentAnswer === currentQuestion.answer;
  const deadline = currentQuestion.deadline?.toDate ? currentQuestion.deadline.toDate() : currentQuestion.deadline;
  const isOverdue = deadline && new Date() > new Date(deadline) && !isSubmitted;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/homework")} className="text-muted-foreground hover:text-white">
          <ChevronLeft className="w-4 h-4 mr-2" /> Exit Homework
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-muted-foreground">
            Task <span className="text-white">{currentIndex + 1}</span> of {questions.length}
          </div>
          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500" 
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="p-8 md:p-12 bg-white/5 border-white/10 backdrop-blur-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="absolute top-0 right-0 p-8">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => toggleSave(currentQuestion.id)}
                className={cn("hover:bg-emerald-500/10 transition-colors", savedIds.includes(currentQuestion.id) ? "text-yellow-400" : "text-muted-foreground")}
               >
                 <Star className={cn("w-5 h-5", savedIds.includes(currentQuestion.id) && "fill-current")} />
               </Button>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    {currentQuestion.type}
                  </span>
                  {deadline && (
                    <span className={cn(
                      "text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5",
                      isOverdue ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white/5 border-white/10 text-muted-foreground"
                    )}>
                      <Clock className="w-3 h-3" /> Due {new Date(deadline).toLocaleString()}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">{currentQuestion.content}</h2>
                {currentQuestion.imageUrl && (
                  <img src={currentQuestion.imageUrl} alt="Context" className="rounded-2xl border border-white/10 max-h-64 object-contain bg-black/20" />
                )}
              </div>

              <div className="grid gap-3">
                {currentQuestion.type === "MCQ" && currentQuestion.options?.map((opt, i) => {
                  const isSelected = currentAnswer === opt;
                  const isCorrectOpt = opt === currentQuestion.answer;
                  
                  return (
                    <button
                      key={i}
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(opt)}
                      className={cn(
                        "p-5 rounded-2xl border transition-all text-left flex items-center gap-4 group",
                        isSelected && !isSubmitted && "bg-emerald-500/10 border-emerald-500 text-white",
                        isSubmitted && isCorrectOpt && "bg-emerald-500/20 border-emerald-500 text-white",
                        isSubmitted && isSelected && !isCorrectOpt && "bg-red-500/20 border-red-500 text-white",
                        !isSelected && !isSubmitted && "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                        isSelected && !isSubmitted && "bg-emerald-500 text-white",
                        isSubmitted && isCorrectOpt && "bg-emerald-500 text-white",
                        isSubmitted && isSelected && !isCorrectOpt && "bg-red-500 text-white",
                        !isSelected && !isSubmitted && "bg-white/10 group-hover:bg-white/20"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="font-medium">{opt}</span>
                    </button>
                  );
                })}

                {currentQuestion.type === "TF" && ["True", "False"].map(opt => (
                  <button
                    key={opt}
                    disabled={isSubmitted}
                    onClick={() => handleSelectOption(opt)}
                    className={cn(
                      "p-5 rounded-2xl border transition-all flex items-center justify-center font-bold gap-3",
                      currentAnswer === opt && !isSubmitted && "bg-emerald-500/10 border-emerald-500 text-white",
                      isSubmitted && opt === currentQuestion.answer && "bg-emerald-500/20 border-emerald-500 text-white",
                      isSubmitted && currentAnswer === opt && opt !== currentQuestion.answer && "bg-red-500/20 border-red-500 text-white",
                      currentAnswer !== opt && !isSubmitted && "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {isSubmitted && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-6 border-t border-white/5 space-y-4">
                    <div className={cn("p-4 rounded-xl border flex items-start gap-3", isCorrect ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400")}>
                      {isCorrect ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <XCircle className="w-5 h-5 mt-0.5" />}
                      <div>
                        <p className="font-bold text-sm">{isCorrect ? "Response Received" : "Incorrect Answer"}</p>
                        <p className="text-xs opacity-80 mt-1">
                          {isCorrect ? "Great job! Your assignment has been recorded." : `The correct answer was ${currentQuestion.answer}.`}
                        </p>
                      </div>
                    </div>
                    {currentQuestion.explanation && (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                          <Info className="w-3 h-3 text-emerald-500" /> Instructor Hint
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed italic">{currentQuestion.explanation}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between items-center px-4">
        <Button 
          variant="ghost" 
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
          className="text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>

        {!isSubmitted ? (
          <Button 
            disabled={!currentAnswer} 
            onClick={handleCheck}
            className="bg-emerald-500 hover:bg-emerald-600 px-12 h-12 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            Submit Answer
          </Button>
        ) : (
          <Button 
            onClick={() => isLast ? setIsFinishing(true) : setCurrentIndex(currentIndex + 1)}
            className="bg-white text-black hover:bg-white/90 px-12 h-12 rounded-2xl"
          >
            {isLast ? "Finish Assignment" : "Next Task"} <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      <Dialog open={isFinishing} onOpenChange={setIsFinishing}>
        <DialogContent className="sm:max-w-md bg-[#040810]/95 border-white/10 backdrop-blur-3xl">
          <div className="text-center p-6 space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <Trophy className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Homework Submitted!</h2>
              <p className="text-muted-foreground">You've successfully completed the assignments for Lesson {params.id}.</p>
            </div>
            <Button onClick={() => router.push("/homework")} className="w-full bg-emerald-500 h-12 rounded-2xl">
              Back to Assignments <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

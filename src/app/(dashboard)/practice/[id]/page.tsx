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
  Target, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Star, 
  Save, 
  Loader2, 
  Trophy,
  ArrowRight,
  Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  type: "MCQ" | "TF" | "Essay" | "Image" | "Form";
  content: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  imageUrl?: string;
  link?: string;
}

export default function PracticeSolverPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!params.id) return;
      
      // Fetch Questions
      const qSnap = await getDocs(query(
        collection(db, "practice_questions"), 
        where("lessonId", "==", Number(params.id)),
        orderBy("order", "asc")
      ));
      const qData = qSnap.docs.map(d => ({ id: d.id, ...d.data() } as Question));
      setQuestions(qData);

      // Fetch Saved Questions
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setSavedIds(userDoc.data().savedQuestions || []);
        }
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
    setSubmitted({ ...submitted, [q.id]: true });

    // Save individual response for analytics
    if (user) {
      const isCorrect = answers[q.id] === q.answer;
      await setDoc(doc(db, "submissions", `${user.uid}_${q.id}`), {
        userId: user.uid,
        userName: user.displayName || "Student",
        questionId: q.id,
        lessonId: Number(params.id),
        answer: answers[q.id] || "",
        isCorrect,
        type: "practice",
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

  if (loading) return <div className="p-8"><Skeleton className="h-96 w-full bg-white/5" /></div>;

  if (questions.length === 0) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8">
        <Target className="w-20 h-20 text-white/5 mb-6" />
        <h2 className="text-2xl font-bold">Empty Practice Set</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">There are no practice questions available for this lesson yet.</p>
        <Button onClick={() => router.push("/practice")} variant="link" className="mt-4 text-primary">Go back</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const currentAnswer = answers[currentQuestion.id];
  const isSubmitted = submitted[currentQuestion.id];
  const isCorrect = currentAnswer === currentQuestion.answer;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header / Progress */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/practice")} className="text-muted-foreground hover:text-white">
          <ChevronLeft className="w-4 h-4 mr-2" /> Exit Practice
        </Button>
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-muted-foreground">
            Question <span className="text-white">{currentIndex + 1}</span> of {questions.length}
          </div>
          <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary" 
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
            <div className="absolute top-0 right-0 p-8">
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => toggleSave(currentQuestion.id)}
                className={cn("hover:bg-primary/10 transition-colors", savedIds.includes(currentQuestion.id) ? "text-yellow-400" : "text-muted-foreground")}
               >
                 <Star className={cn("w-5 h-5", savedIds.includes(currentQuestion.id) && "fill-current")} />
               </Button>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
                  {currentQuestion.type}
                </span>
                <h2 className="text-2xl md:text-3xl font-bold leading-tight">{currentQuestion.content}</h2>
                {currentQuestion.imageUrl && (
                  <img src={currentQuestion.imageUrl} alt="Question Context" className="rounded-2xl border border-white/10 max-h-64 object-contain bg-black/20" />
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
                        isSelected && !isSubmitted && "bg-primary/10 border-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.1)]",
                        isSubmitted && isCorrectOpt && "bg-emerald-500/20 border-emerald-500 text-white",
                        isSubmitted && isSelected && !isCorrectOpt && "bg-red-500/20 border-red-500 text-white",
                        !isSelected && !isSubmitted && "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                        isSelected && !isSubmitted && "bg-primary text-white",
                        isSubmitted && isCorrectOpt && "bg-emerald-500 text-white",
                        isSubmitted && isSelected && !isCorrectOpt && "bg-red-500 text-white",
                        !isSelected && !isSubmitted && "bg-white/10 group-hover:bg-white/20"
                      )}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="font-medium">{opt}</span>
                      {isSubmitted && isCorrectOpt && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-400" />}
                      {isSubmitted && isSelected && !isCorrectOpt && <XCircle className="w-5 h-5 ml-auto text-red-400" />}
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
                      currentAnswer === opt && !isSubmitted && "bg-primary/10 border-primary text-white",
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
                        <p className="font-bold text-sm">{isCorrect ? "Correct!" : "Incorrect Answer"}</p>
                        <p className="text-xs opacity-80 mt-1">
                          {isCorrect ? "Excellent work! You've mastered this concept." : `The correct answer was ${currentQuestion.answer}.`}
                        </p>
                      </div>
                    </div>
                    {currentQuestion.explanation && (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                          <Info className="w-3 h-3 text-primary" /> Explanation
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
            className="bg-primary hover:bg-primary/90 px-12 h-12 rounded-2xl shadow-[0_0_30px_rgba(var(--primary),0.2)]"
          >
            Check Answer
          </Button>
        ) : (
          <Button 
            onClick={() => isLast ? setIsFinishing(true) : setCurrentIndex(currentIndex + 1)}
            className="bg-white text-black hover:bg-white/90 px-12 h-12 rounded-2xl"
          >
            {isLast ? "Complete Session" : "Next Question"} <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      <Dialog open={isFinishing} onOpenChange={setIsFinishing}>
        <DialogContent className="sm:max-w-md bg-[#040810]/95 border-white/10 backdrop-blur-3xl">
          <div className="text-center p-6 space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-primary/20">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Session Complete!</h2>
              <p className="text-muted-foreground">You've finished the practice set for Lesson {params.id}.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-primary">{Object.values(submitted).length}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Solved</div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-2xl font-black text-emerald-400">
                  {Object.entries(submitted).filter(([qid]) => answers[qid] === questions.find(q => q.id === qid)?.answer).length}
                </div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Correct</div>
              </div>
            </div>
            <Button onClick={() => router.push("/practice")} className="w-full bg-primary h-12 rounded-2xl">
              Back to Curriculum <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Dialog, DialogContent } from "@/components/ui/dialog";

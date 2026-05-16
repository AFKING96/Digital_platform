"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, addDoc, collection, updateDoc, serverTimestamp, getDocs, orderBy, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/components/providers/auth-provider";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLessonMap } from "@/hooks/use-lesson-map";

interface Question {
  id: string | number;
  question: string;
  type: "mcq" | "true_false" | "essay";
  options?: string[];
  correctAnswer?: string;
}

interface Quiz {
  lessonId: number;
  questions: Question[];
  formLink?: string;
}

interface PerformanceEntry {
  lessonId: number;
  type: string;
  correct: number;
  wrong: number;
}

export default function SolvePage() {
  const params = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const { user } = useAuth();
  const { getLessonOrder, getLessonTitle } = useLessonMap();

  useEffect(() => {
    if (!params.id) return;

    // 1. Real-time Quiz data
    const quizRef = doc(db, "quizzes", params.id as string);
    const unsubscribeQuiz = onSnapshot(quizRef, (snap) => {
      if (snap.exists()) {
        setQuiz(snap.data() as Quiz);
      } else {
        setQuiz(null);
      }
      setLoading(false);
    }, (error) => {
      console.warn("Error fetching quiz data:", error);
      setLoading(false);
    });

    return () => unsubscribeQuiz();
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    
    let unsubUser = () => {};
    if (user) {
      unsubUser = onSnapshot(doc(db, "users", user.uid), async (userDoc) => {
        const userData = userDoc.data();
        let currentUnlocked = false;
        
        const q = query(collection(db, "lessons"), where("id", "==", Number(params.id)));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const lData = snap.docs[0].data() as any;
          if (userData?.unlockedLessons) {
             currentUnlocked = userData.unlockedLessons.includes(lData.id);
          }
          
          const enrolled = userData?.enrolledSubjects || [];
          if (lData.subjectId && !enrolled.includes(lData.subjectId)) {
            currentUnlocked = false;
          }
        }
        
        setIsLocked(!currentUnlocked);
      });
    } else {
      setIsLocked(true);
    }
    
    return () => unsubUser();
  }, [user, params.id]);

  const handleNext = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex]: answer
    }));
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;
    
    setSubmitting(true);
    try {
      // Auto-grading logic
      let score = 0;
      let totalGradable = 0;
      let hasEssay = false;

      quiz.questions.forEach((q, idx) => {
        if (q.type === "mcq" || q.type === "true_false") {
          totalGradable++;
          if (answers[idx] === q.correctAnswer) {
            score++;
          }
        } else if (q.type === "essay") {
          hasEssay = true;
        }
      });

      const accuracy = totalGradable > 0 ? Math.round((score / totalGradable) * 100) : 0;
      const finalStatus = hasEssay ? "pending" : "reviewed";

      // 1. Create submission document
      await addDoc(collection(db, "submissions"), {
        userId: user.uid,
        lessonId: quiz.lessonId,
        answers: answers,
        score: hasEssay ? null : accuracy,
        status: finalStatus,
        feedback: "",
        submittedAt: serverTimestamp(),
        correct: score,
        wrong: totalGradable - score,
        totalQuestions: totalGradable
      });

      // 2. SMART TRACKING & GAMIFICATION
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const ud = userSnap.data();
        
        // 1. Gamification: +10 base, +2 per correct
        const gainedPoints = 10 + (score * 2);
        const newPoints = (ud.points || 0) + gainedPoints;
        
        // 2. Streak Logic
        let currentStreak = ud.streak || 0;
        const lastActive = ud.lastActiveDate ? new Date(ud.lastActiveDate) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!lastActive) {
          currentStreak = 1;
        } else {
          const lastDate = new Date(lastActive);
          lastDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak += 1;
          } else if (diffDays > 1) {
            currentStreak = 1;
          }
          // if diffDays === 0, streak remains same (already active today)
        }

        // 3. Progress Tracking
        const completedLessons = ud.completedLessons || [];
        if (!completedLessons.includes(quiz.lessonId)) {
          completedLessons.push(quiz.lessonId);
        }

        // 4. Smart Tracking: Update performance array
        const performance: PerformanceEntry[] = ud.performance || [];
        const existingPerfIdx = performance.findIndex((p: PerformanceEntry) => p.lessonId === quiz.lessonId);
        
        const newPerfEntry = {
          lessonId: quiz.lessonId,
          type: quiz.questions[0]?.type || "mcq",
          correct: score,
          wrong: totalGradable - score,
          accuracy: accuracy,
          timestamp: serverTimestamp()
        };

        if (existingPerfIdx > -1) {
          performance[existingPerfIdx] = newPerfEntry;
        } else {
          performance.push(newPerfEntry);
        }

        // 5. Update Overall Stats
        const oldAccuracy = ud.accuracy || 0;
        const oldSolved = ud.solvedQuestions || 0;
        const newSolvedCount = oldSolved + totalGradable;
        const newAccuracyValue = oldSolved === 0 ? accuracy : Math.round(((oldAccuracy * oldSolved) + (accuracy * totalGradable)) / newSolvedCount);
        
        // Update User Doc
        await updateDoc(userRef, {
          solvedQuestions: newSolvedCount,
          accuracy: newAccuracyValue,
          points: newPoints,
          streak: currentStreak,
          lastActiveDate: serverTimestamp(),
          completedLessons: completedLessons,
          performance: performance
        });

        // 6. Notification: Result
        await addDoc(collection(db, "notifications"), {
          userId: user.uid,
          title: "Quiz Completed",
          message: `You completed Module ${getLessonOrder(quiz.lessonId, quiz.lessonId)} with ${accuracy}% accuracy! +${gainedPoints} points earned.`,
          type: "result",
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      router.push(`/results?score=${accuracy}&status=${finalStatus}`);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-10">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-24 bg-white/5" />
          <Skeleton className="h-6 w-32 bg-white/5" />
        </div>
        <Skeleton className="h-4 w-full bg-white/5" />
        <Card className="glass-card p-8 space-y-6">
          <Skeleton className="h-8 w-3/4 bg-white/5" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl bg-white/5" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
          <Lock className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Quiz Locked</h2>
        <p className="text-muted-foreground mb-8">This assessment is part of a module that hasn&apos;t been unlocked by your instructor yet.</p>
        <Button onClick={() => router.push('/dashboard')} variant="outline" className="w-full h-12 rounded-xl">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No quiz found for this module</h2>
        <Button onClick={() => router.push(`/lesson/${params.id}`)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lesson
        </Button>
      </div>
    );
  }

  if (quiz.formLink) {
    return (
      <div className="text-center py-32 space-y-6 max-w-xl mx-auto">
        <h2 className="text-3xl font-bold">External Assessment</h2>
        <p className="text-muted-foreground text-lg">Your instructor has provided an external form for this module&apos;s assessment.</p>
        <a href={quiz.formLink} target="_blank" rel="noreferrer" className="inline-block mt-4">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl btn-glow flex items-center">
            Open Google Form
            <ExternalLink className="w-5 h-5 ml-2" />
          </Button>
        </a>
      </div>
    );
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4">No questions available.</h2>
        <Button onClick={() => router.push(`/lesson/${params.id}`)} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Lesson
        </Button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      {/* Header & Progress */}
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push(`/lesson/${params.id}`)}
          className="text-muted-foreground hover:text-white -ml-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Exit
        </Button>
        <div className="text-right">
          <div className="text-sm font-bold text-white uppercase tracking-wider">{getLessonTitle(quiz.lessonId, `Module ${params.id}`)}</div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">
            Question {currentQuestionIndex + 1} of {quiz.questions.length}
          </div>
        </div>
      </div>

      <div className="w-full bg-white/5 rounded-full h-2.5 mb-10 overflow-hidden shadow-inner border border-white/5">
        <motion.div 
          className="bg-gradient-to-r from-primary to-blue-400 h-full rounded-full relative shadow-[0_0_15px_rgba(var(--primary),0.5)]" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-[4px] transform translate-x-1/2" />
        </motion.div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-card p-8 md:p-10 min-h-[500px] flex flex-col">
            <QuestionRenderer 
              question={{ ...currentQuestion, id: currentQuestion.id || currentQuestionIndex }}
              value={answers[currentQuestionIndex] || ""}
              onChange={handleAnswerSelect}
              isSubmitted={false}
            />
          </Card>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-12 pt-6 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="text-white/70 hover:text-white"
              >
                Previous
              </Button>
              
              {!isLastQuestion ? (
                <Button 
                  onClick={handleNext} 
                  disabled={!answers[currentQuestionIndex]}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 btn-glow transition-transform hover:scale-105"
                >
                  Next Question
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  disabled={!answers[currentQuestionIndex] || submitting}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-8 btn-glow transition-transform hover:scale-105"
                >
                  {submitting ? "Submitting..." : "Submit Quiz"}
                  {!submitting && <Check className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

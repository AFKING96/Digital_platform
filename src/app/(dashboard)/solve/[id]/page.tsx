"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, addDoc, collection, updateDoc, serverTimestamp, getDocs, orderBy, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface Question {
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
  const [displayNumber, setDisplayNumber] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch current quiz
        const quizRef = doc(db, "quizzes", params.id as string);
        const snap = await getDoc(quizRef);
        if (snap.exists()) {
          setQuiz(snap.data() as Quiz);
        }

        // 2. Fetch lesson to get order
        const lessonsRef = collection(db, "lessons");
        const q = query(lessonsRef, where("id", "==", Number(params.id)));
        const lessonsSnap = await getDocs(q);
        if (!lessonsSnap.empty) {
          setDisplayNumber((lessonsSnap.docs[0].data() as any).order);
        }

      } catch (error) {
        console.warn("Error fetching quiz data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) { fetchData(); }
  }, [params.id]);

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
    if (!auth.currentUser || !quiz) return;
    
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
        userId: auth.currentUser.uid,
        lessonId: quiz.lessonId,
        answers: answers,
        score: hasEssay ? null : accuracy,
        status: finalStatus,
        feedback: "",
        submittedAt: new Date().toISOString(),
        correct: score,
        wrong: totalGradable - score
      });

      // 2. SMART TRACKING & GAMIFICATION
      const userRef = doc(db, "users", auth.currentUser.uid);
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
          timestamp: new Date().toISOString()
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
          lastActiveDate: new Date().toISOString(),
          completedLessons: completedLessons,
          performance: performance,
          currentLesson: Math.max(ud.currentLesson || 1, quiz.lessonId + 1)
        });

        // 6. Notification: Result
        await addDoc(collection(db, "notifications"), {
          userId: auth.currentUser.uid,
          title: "Quiz Completed",
          message: `You completed Module ${displayNumber || quiz.lessonId} with ${accuracy}% accuracy! +${gainedPoints} points earned.`,
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
        <div className="text-sm font-medium text-muted-foreground">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </div>
      </div>

      <div className="w-full bg-white/5 rounded-full h-1.5 mb-8 overflow-hidden">
        <motion.div 
          className="bg-primary h-1.5 rounded-full" 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
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
          <Card className="glass-card p-8 md:p-10 min-h-[400px] flex flex-col">
            <div className="mb-4">
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-wider">
                {currentQuestion.type === "mcq" ? "Multiple Choice" : currentQuestion.type === "true_false" ? "True or False" : "Essay"}
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-medium text-white mb-8 leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="flex-1 mt-4">
              {(currentQuestion.type === "mcq" || currentQuestion.type === "true_false") && currentQuestion.options && (
                <div className="space-y-4">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = answers[currentQuestionIndex] === option;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(option)}
                        className={`w-full text-left p-5 rounded-xl border transition-all duration-200 flex items-center justify-between ${
                          isSelected 
                            ? "bg-primary/20 border-primary text-white" 
                            : "bg-black/20 border-white/10 text-white/80 hover:bg-black/40 hover:border-white/20"
                        }`}
                      >
                        <span className="text-lg">{option}</span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === "essay" && (
                <div className="space-y-4">
                  <Label className="text-muted-foreground ml-1">Your Detailed Answer</Label>
                  <Textarea
                    autoFocus
                    value={answers[currentQuestionIndex] || ""}
                    onChange={(e) => handleAnswerSelect(e.target.value)}
                    placeholder="Type your essay answer here... Include as much detail as possible."
                    className="min-h-[150px] text-lg p-4 bg-black/30 border-white/10 focus:border-primary/50 resize-y"
                  />
                </div>
              )}
            </div>

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
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

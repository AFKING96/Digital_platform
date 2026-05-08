"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, getDocs, deleteDoc, writeBatch, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, CheckSquare, Link as LinkIcon, Type, List, CheckCircle2, Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Question {
  id: number;
  type: "mcq" | "true_false" | "essay";
  question: string;
  options?: string[];
  correctAnswer?: string;
}

interface Quiz {
  lessonId: string;
  questions: Question[];
  formLink?: string;
}

export default function QuizzesPage() {
  const [lessons, setLessons] = useState<{id: number, title: string}[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [formLink, setFormLink] = useState("");
  const [smartText, setSmartText] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingQuiz, setIsDeletingQuiz] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  const handleSmartParse = () => {
    if (!smartText.trim()) return;
    
    const lines = smartText.split('\n').filter(l => l.trim().length > 0);
    const newQs: Question[] = [];
    
    for (const line of lines) {
      const splitA = line.split(/ A\)| a\)| A\.| a\./);
      if (splitA.length > 1) {
        const questionText = splitA[0].trim();
        const restA = splitA[1];
        
        const splitB = restA.split(/ B\)| b\)| B\.| b\./);
        const optA = splitB[0].trim();
        const restB = splitB[1] || "";
        
        const splitC = restB.split(/ C\)| c\)| C\.| c\./);
        const optB = splitC[0]?.trim() || "";
        const restC = splitC[1] || "";
        
        const splitD = restC.split(/ D\)| d\)| D\.| d\./);
        const optC = splitD[0]?.trim() || "";
        const optD = splitD[1]?.trim() || "";
        
        newQs.push({
          id: questions.length + newQs.length + 1,
          type: "mcq",
          question: questionText,
          options: [optA, optB, optC, optD].filter(Boolean), // remove empty options
          correctAnswer: optA
        });
      }
    }
    
    if (newQs.length > 0) {
      setQuestions([...questions, ...newQs]);
      setSmartText("");
      alert(`Parsed ${newQs.length} questions successfully!`);
    } else {
      alert("Could not parse. Ensure format is like 'Question text? A) opt1 B) opt2 C) opt3 D) opt4'");
    }
  };

  useEffect(() => {
    const loadLessons = async () => {
      const q = query(collection(db, "lessons"), orderBy("id", "asc"));
      const snapshot = await getDocs(q);
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.data().id, title: doc.data().title }));
      setLessons(data);
    };
    loadLessons();
  }, []);

  useEffect(() => {
    if (!selectedLesson) return;
    const q = query(collection(db, "quizzes"), where("lessonId", "==", selectedLesson));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const quiz = snapshot.docs[0].data();
        setQuestions(quiz.questions || []);
        setFormLink(quiz.formLink || "");
      } else {
        setQuestions([]);
        setFormLink("");
      }
    });
    return () => unsubscribe();
  }, [selectedLesson]);

  const addQuestion = (type: "mcq" | "true_false" | "essay") => {
    let newQ: Question = {
      id: questions.length + 1,
      type,
      question: "",
    };
    
    if (type === "mcq") {
      newQ.options = ["", "", "", ""];
      newQ.correctAnswer = "";
    } else if (type === "true_false") {
      newQ.options = ["True", "False"];
      newQ.correctAnswer = "True";
    }

    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options![optIndex] = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleSave = async () => {
    if (!selectedLesson) return alert("Select a lesson first.");
    try {
      await setDoc(doc(db, "quizzes", selectedLesson), {
        lessonId: selectedLesson,
        questions,
        formLink
      });
      alert("Quiz saved successfully!");
    } catch (error) {
      console.error("Error saving quiz:", error);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeletingQuiz(true);
    try {
      await deleteDoc(doc(db, "quizzes", quizToDelete));
      setQuestions([]);
      setFormLink("");
      setQuizToDelete(null);
    } catch (error) {
      console.error("Error deleting quiz:", error);
      alert("Failed to delete quiz.");
    } finally {
      setIsDeletingQuiz(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Builder</h1>
          <p className="text-muted-foreground">Create dynamic assessments or link external forms.</p>
        </div>
        <div className="flex gap-2">
          {selectedLesson && (questions.length > 0 || formLink) && (
            <Button variant="ghost" onClick={() => setQuizToDelete(selectedLesson)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4 mr-2" /> Delete Quiz
            </Button>
          )}
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 btn-glow transition-all hover:scale-105" disabled={!selectedLesson}>
            <Save className="w-4 h-4 mr-2" /> Save Quiz
          </Button>
        </div>
      </div>

      <Card className="glass-card p-6 border-primary/20 bg-[#040810]/80">
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Select Module</label>
        <Select value={selectedLesson} onValueChange={(val: any) => setSelectedLesson(val)}>
          <SelectTrigger className="w-full md:w-[400px] bg-black/40 border-white/10 focus:ring-primary/50">
            <SelectValue placeholder="Choose a lesson to attach the quiz..." />
          </SelectTrigger>
          <SelectContent className="bg-[#0B1220] border-white/10 text-white">
            {lessons.map(l => (
              <SelectItem key={l.id} value={l.id.toString()}>Module {l.id}: {l.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {selectedLesson && (
        <div className="space-y-8">
          
          <Card className="glass-card p-6 border-white/10">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Optional External Form
            </h3>
            <Input 
              placeholder="https://docs.google.com/forms/d/e/..." 
              value={formLink} 
              onChange={e => setFormLink(e.target.value)} 
              className="bg-black/30 border-white/10 focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-2">If provided, this link will override native questions.</p>
          </Card>

          <div className="flex justify-between items-center pt-4">
            <h2 className="text-xl font-bold">Native Questions ({questions.length})</h2>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => addQuestion("mcq")} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <List className="w-4 h-4 mr-2 text-blue-400" /> Add MCQ
              </Button>
              <Button variant="outline" onClick={() => addQuestion("true_false")} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" /> Add True/False
              </Button>
              <Button variant="outline" onClick={() => addQuestion("essay")} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <Type className="w-4 h-4 mr-2 text-purple-400" /> Add Essay
              </Button>
            </div>
          </div>

          <Card className="glass-card p-6 border-primary/20 bg-primary/5">
            <h3 className="text-sm font-medium text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> Smart Text Parser
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Paste questions formatted like: <code className="text-primary/70">What is 2+2? A) 2 B) 3 C) 4 D) 5</code>
            </p>
            <div className="flex flex-col gap-3">
              <Textarea 
                placeholder="Paste your questions here..." 
                value={smartText} 
                onChange={(e) => setSmartText(e.target.value)}
                className="bg-black/30 border-primary/20 min-h-[100px] resize-y focus:border-primary/50"
              />
              <Button onClick={handleSmartParse} className="self-end bg-primary hover:bg-primary/90 btn-glow">
                <Wand2 className="w-4 h-4 mr-2" /> Auto-Generate
              </Button>
            </div>
          </Card>

          <div className="space-y-6">
            <AnimatePresence>
              {questions.map((q, index) => (
                <motion.div 
                  key={index} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="glass-card p-6 flex flex-col gap-5 border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                          {index + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {q.type === 'mcq' ? 'Multiple Choice' : q.type === 'true_false' ? 'True / False' : 'Essay Question'}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(index)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Textarea 
                      placeholder="Enter question prompt..." 
                      value={q.question} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateQuestion(index, "question", e.target.value)} 
                      className="bg-black/40 border-white/10 focus:border-primary/30 font-medium resize-none min-h-[80px]"
                    />

                    {q.type === "mcq" && q.options && (
                      <div className="grid md:grid-cols-2 gap-3 pl-11">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-muted-foreground">
                              {String.fromCharCode(65 + oIndex)}
                            </div>
                            <Input 
                              placeholder={`Option ${oIndex + 1}`} 
                              value={opt} 
                              onChange={e => updateOption(index, oIndex, e.target.value)} 
                              className="bg-black/20 border-white/5 text-sm pl-10"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type !== "essay" && (
                      <div className="pl-11 flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20">
                          <CheckSquare className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">Correct Answer</span>
                        </div>
                        {q.type === "true_false" ? (
                          <select
                            className="bg-black/40 border border-green-500/30 rounded-lg px-3 py-2 text-sm font-bold text-green-400 focus:outline-none focus:border-green-500 w-[150px]"
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestion(index, "correctAnswer", e.target.value)}
                          >
                            <option value="True" className="bg-[#0B1220] text-white">True</option>
                            <option value="False" className="bg-[#0B1220] text-white">False</option>
                          </select>
                        ) : (
                          <Input 
                            placeholder="Exact correct option text..." 
                            value={q.correctAnswer} 
                            onChange={e => updateQuestion(index, "correctAnswer", e.target.value)} 
                            className="bg-black/30 border-green-500/30 focus:border-green-500 flex-1 placeholder:text-muted-foreground/50"
                          />
                        )}
                      </div>
                    )}
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {questions.length === 0 && !formLink && (
              <div className="text-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-xl bg-black/20 flex flex-col items-center">
                <List className="w-12 h-12 text-white/20 mb-4" />
                <p>No questions added to this module yet.</p>
                <p className="text-sm mt-1">Use the buttons above to start building your quiz.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <DeleteDialog 
        isOpen={!!quizToDelete} 
        onOpenChange={(open) => !open && setQuizToDelete(null)} 
        onConfirm={handleDeleteQuiz}
        loading={isDeletingQuiz}
        title="Delete Entire Quiz"
        description="This will permanently remove the quiz and all its questions from this module. This action cannot be undone."
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, orderBy, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Target, Search, X, Check, Layout, BarChart3, Save, Image as ImageIcon, Link as LinkIcon, HelpCircle } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { QuestionRenderer } from "@/components/questions/QuestionRenderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLessonMap } from "@/hooks/use-lesson-map";

interface Question {
  id: string;
  lessonId: number;
  type: "MCQ" | "TF" | "Essay" | "Image" | "Form";
  content: string;
  options?: string[];
  answer?: string;
  expectedAnswer?: string;
  explanation?: string;
  imageUrl?: string;
  link?: string;
  order: number;
  createdAt: any;
}

export default function PracticeAdminPage() {
  const { lessons, loading: lessonsLoading } = useLessonMap();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<Question>>({
    type: "MCQ",
    content: "",
    options: ["", "", "", ""],
    answer: "",
    expectedAnswer: "",
    explanation: "",
    imageUrl: "",
    link: "",
    order: 1
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (lessons.length > 0 && !selectedLessonId) {
      setSelectedLessonId(lessons[0].id);
    }
  }, [lessons, selectedLessonId]);

  useEffect(() => {
    // Fetch All Practice Questions
    const unsubQuestions = onSnapshot(query(collection(db, "practice_questions"), orderBy("order", "asc")), (snap) => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
    });

    return () => {
      unsubQuestions();
    };
  }, []);

  const handleSaveQuestion = async (id?: string) => {
    if (!selectedLessonId) return;
    
    const qId = id || Date.now().toString();
    const qData = {
      ...form,
      lessonId: selectedLessonId,
      updatedAt: serverTimestamp(),
      createdAt: form.createdAt || serverTimestamp(),
      order: form.order || (questions.filter(q => q.lessonId === selectedLessonId).length + 1)
    };

    try {
      await setDoc(doc(db, "practice_questions", qId), qData);
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Error saving question.");
    }
  };

  const addOption = () => {
    const newOpts = [...(form.options || [])];
    newOpts.push("");
    setForm({...form, options: newOpts});
  };

  const removeOption = (idx: number) => {
    const newOpts = [...(form.options || [])];
    if (newOpts.length > 2) {
      newOpts.splice(idx, 1);
      setForm({...form, options: newOpts});
    }
  };

  const resetForm = () => {
    setForm({
      type: "MCQ",
      content: "",
      options: ["", "", "", ""],
      answer: "",
      expectedAnswer: "",
      explanation: "",
      imageUrl: "",
      link: "",
      order: 1
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "practice_questions", deleteId));
      setDeleteId(null);
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); }
  };

  if (lessonsLoading) return <div className="p-8"><Skeleton className="h-64 w-full bg-white/5" /></div>;

  const currentLessonQuestions = questions.filter(q => q.lessonId === selectedLessonId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Practice Management
          </h1>
          <p className="text-muted-foreground mt-1">Design in-class solving sessions linked to your curriculum.</p>
        </div>
        <div className="flex gap-4">
          <Select 
            value={selectedLessonId?.toString() || ""}
            onValueChange={val => setSelectedLessonId(Number(val))}
          >
            <SelectTrigger className="w-[200px] bg-white/5 border-white/10 rounded-xl h-10">
              <SelectValue placeholder="Select Lesson" />
            </SelectTrigger>
            <SelectContent>
              {lessons.map(l => (
                <SelectItem key={l.id} value={l.id.toString()}>
                  {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Editor Overlay / Form */}
        <AnimatePresence>
          {(isAdding || editingId) && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]" />
                
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    {editingId ? "Edit Question" : "New Practice Question"}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Question Type</label>
                      <div className="flex flex-wrap gap-2">
                        {["MCQ", "TF", "Essay", "Image", "Form"].map(t => (
                          <button
                            key={t}
                            onClick={() => setForm({...form, type: t as any})}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              form.type === t 
                                ? "bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.3)]" 
                                : "bg-white/5 text-muted-foreground hover:bg-white/10"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Question Content</label>
                      <Textarea 
                        placeholder="Type your question here..." 
                        value={form.content}
                        onChange={e => setForm({...form, content: e.target.value})}
                        className="min-h-[120px] bg-black/50"
                      />
                    </div>

                    {form.type === "MCQ" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-emerald-400">Answer Options</label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={addOption}
                            className="h-6 text-[10px] font-black uppercase tracking-wider text-primary hover:bg-primary/10"
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Option
                          </Button>
                        </div>
                        {form.options?.map((opt, i) => (
                          <div key={i} className="flex gap-2 group/opt">
                            <div className={`w-8 h-10 flex items-center justify-center rounded-lg font-bold border transition-all ${
                              form.answer === opt && opt !== "" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-white/10 text-muted-foreground"
                            }`}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            <div className="flex-1 relative">
                              <Input 
                                placeholder={`Option ${i + 1}`} 
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...(form.options || [])];
                                  newOpts[i] = e.target.value;
                                  setForm({...form, options: newOpts});
                                }}
                                className="bg-black/30 pr-10"
                              />
                              {form.options!.length > 2 && (
                                <button 
                                  onClick={() => removeOption(i)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-400 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setForm({...form, answer: opt})}
                              className={form.answer === opt && opt !== "" ? "text-emerald-400" : "text-muted-foreground"}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {form.type === "TF" && (
                      <div className="flex gap-4">
                        <Button 
                          variant="outline" 
                          className={`flex-1 ${form.answer === "True" ? "bg-emerald-500/20 border-emerald-500/50" : ""}`}
                          onClick={() => setForm({...form, answer: "True"})}
                        >True</Button>
                        <Button 
                          variant="outline"
                          className={`flex-1 ${form.answer === "False" ? "bg-red-500/20 border-red-500/50" : ""}`}
                          onClick={() => setForm({...form, answer: "False"})}
                        >False</Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Explanation (Optional)</label>
                      <Textarea 
                        placeholder="Explain the correct answer..." 
                        value={form.explanation}
                        onChange={e => setForm({...form, explanation: e.target.value})}
                        className="bg-black/30 h-24"
                      />
                    </div>
                    
                    {form.type === "Essay" && (
                      <div className="space-y-2 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                        <label className="text-xs font-bold text-primary uppercase tracking-widest px-1">Expected Answer / Model Solution</label>
                        <Textarea 
                          placeholder="Write the ideal answer or solving method here... This will be shown to students AFTER they submit their response." 
                          value={form.expectedAnswer}
                          onChange={e => setForm({...form, expectedAnswer: e.target.value})}
                          className="bg-black/30 min-h-[150px]"
                        />
                        <p className="text-[10px] text-muted-foreground italic px-1">
                          This is used for student self-comparison and review.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Image URL</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Optional image..." 
                            value={form.imageUrl}
                            onChange={e => setForm({...form, imageUrl: e.target.value})}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">External Link</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            placeholder="Optional link..." 
                            value={form.link}
                            onChange={e => setForm({...form, link: e.target.value})}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
                      <Button onClick={() => handleSaveQuestion(editingId as string)} className="bg-primary hover:bg-primary/90 px-8">
                        <Save className="w-4 h-4 mr-2" /> Save Question
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Questions List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-bold flex items-center gap-2">
              <Layout className="w-4 h-4 text-primary" />
              {lessons.find(l => l.id === selectedLessonId)?.title || "Lesson"} Content
            </h2>
            <span className="text-xs text-muted-foreground font-medium">{currentLessonQuestions.length} Questions total</span>
          </div>

          <div className="grid gap-4">
            {currentLessonQuestions.map((q, idx) => (
              <motion.div key={q.id} layout>
                <Card className="p-6 bg-white/5 border-white/10 hover:border-white/20 transition-all flex gap-6 group">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="w-0.5 h-full bg-gradient-to-b from-white/10 to-transparent" />
                  </div>

                  <div className="flex-1 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {q.type}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={() => {
                          setForm(q);
                          setEditingId(q.id);
                        }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 text-red-400" onClick={() => setDeleteId(q.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="pointer-events-none opacity-80 scale-[0.95] origin-top-left -mb-6">
                      <QuestionRenderer 
                        question={q}
                        value={q.answer || ""}
                        onChange={() => {}}
                        isSubmitted={true}
                        showExplanation={true}
                        disabled={true}
                      />
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                       <Link 
                         href={`/admin/analytics/question/${q.id}`}
                         className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                       >
                         <BarChart3 className="w-3 h-3 text-primary" /> Real-time Analytics
                       </Link>
                       {q.explanation && (
                         <div className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">
                           Explanation Added
                         </div>
                       )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {currentLessonQuestions.length === 0 && !isAdding && (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[40px] bg-black/20">
                <Target className="w-16 h-16 text-white/5 mx-auto mb-4" />
                <h3 className="text-xl font-bold">No Practice Questions</h3>
                <p className="text-muted-foreground mt-2">Start adding questions to this lesson for interactive in-class solving.</p>
                <Button onClick={() => setIsAdding(true)} variant="link" className="text-primary mt-4">Add your first question</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteDialog 
        isOpen={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Practice Question"
        description="This will permanently remove this question from the lesson. Student submissions for this specific question will be lost."
      />
    </div>
  );
}

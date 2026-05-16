"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, ClipboardList, Clock, Save, Image as ImageIcon, Link as LinkIcon, HelpCircle, X, Check, Calendar, BarChart3 } from "lucide-react";
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

interface Homework {
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
  deadline?: any;
  order: number;
  createdAt: any;
}

export default function HomeworkAdminPage() {
  const { lessons, loading: lessonsLoading } = useLessonMap();
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Partial<Homework>>({
    type: "MCQ",
    content: "",
    options: ["", "", "", ""],
    answer: "",
    expectedAnswer: "",
    explanation: "",
    imageUrl: "",
    link: "",
    deadline: "",
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
    // Fetch All Homework
    const unsubHomework = onSnapshot(query(collection(db, "homework_questions"), orderBy("order", "asc")), (snap) => {
      setHomeworks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Homework)));
    });

    return () => {
      unsubHomework();
    };
  }, []);

  const handleSaveHomework = async (id?: string) => {
    if (!selectedLessonId) return;
    
    const hId = id || Date.now().toString();
    const hData = {
      ...form,
      lessonId: selectedLessonId,
      updatedAt: serverTimestamp(),
      createdAt: form.createdAt || serverTimestamp(),
      deadline: form.deadline ? new Date(form.deadline) : null,
      order: form.order || (homeworks.filter(h => h.lessonId === selectedLessonId).length + 1)
    };

    try {
      await setDoc(doc(db, "homework_questions", hId), hData);
      setIsAdding(false);
      setEditingId(null);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Error saving homework.");
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
      deadline: "",
      order: 1
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "homework_questions", deleteId));
      setDeleteId(null);
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); }
  };

  if (lessonsLoading) return <div className="p-8"><Skeleton className="h-64 w-full bg-white/5" /></div>;

  const currentLessonHomework = homeworks.filter(h => h.lessonId === selectedLessonId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Homework Management
          </h1>
          <p className="text-muted-foreground mt-1">Create after-class assignments with deadlines and tracking.</p>
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
          <Button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <Plus className="w-4 h-4 mr-2" /> New Homework
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {(isAdding || editingId) && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <Card className="p-8 bg-white/5 border-white/10 backdrop-blur-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-emerald-400" />
                    {editingId ? "Edit Homework" : "New Homework Assignment"}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Assignment Type</label>
                      <div className="flex flex-wrap gap-2">
                        {["MCQ", "TF", "Essay", "Image", "Form"].map(t => (
                          <button
                            key={t}
                            onClick={() => setForm({...form, type: t as any})}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              form.type === t 
                                ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                                : "bg-white/5 text-muted-foreground hover:bg-white/10"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Assignment Content</label>
                      <Textarea 
                        placeholder="Describe the homework assignment..." 
                        value={form.content}
                        onChange={e => setForm({...form, content: e.target.value})}
                        className="min-h-[120px] bg-black/50"
                      />
                    </div>

                    {form.type === "MCQ" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 text-emerald-400">Answer Options</label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={addOption}
                            className="h-6 text-[10px] font-black uppercase tracking-wider text-emerald-500 hover:bg-emerald-500/10"
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
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Submission Deadline
                      </label>
                      <Input 
                        type="datetime-local" 
                        value={form.deadline ? new Date(form.deadline).toISOString().slice(0, 16) : ""}
                        onChange={e => setForm({...form, deadline: e.target.value})}
                        className="bg-black/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Explanation / Hint</label>
                      <Textarea 
                        placeholder="Add a hint or explanation..." 
                        value={form.explanation}
                        onChange={e => setForm({...form, explanation: e.target.value})}
                        className="bg-black/30 h-24"
                      />
                    </div>

                    {form.type === "Essay" && (
                      <div className="space-y-2 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <label className="text-xs font-bold text-emerald-400 uppercase tracking-widest px-1">Expected Answer / Model Solution</label>
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
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Attachment (Image URL)</label>
                        <Input 
                          placeholder="Optional image..." 
                          value={form.imageUrl}
                          onChange={e => setForm({...form, imageUrl: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">External Link</label>
                        <Input 
                          placeholder="Optional link..." 
                          value={form.link}
                          onChange={e => setForm({...form, link: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
                      <Button onClick={() => handleSaveHomework(editingId as string)} className="bg-emerald-500 hover:bg-emerald-600 px-8">
                        <Save className="w-4 h-4 mr-2" /> Save Assignment
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-bold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              {lessons.find(l => l.id === selectedLessonId)?.title || "Lesson"} Homework
            </h2>
            <span className="text-xs text-muted-foreground font-medium">{currentLessonHomework.length} Assignments</span>
          </div>

          <div className="grid gap-4">
            {currentLessonHomework.map((h, idx) => (
              <motion.div key={h.id} layout>
                <Card className="p-6 bg-white/5 border-white/10 hover:border-white/20 transition-all flex gap-6 group">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </div>
                    <div className="w-0.5 h-full bg-gradient-to-b from-white/10 to-transparent" />
                  </div>

                  <div className="flex-1 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {h.type}
                        </span>
                        {h.deadline && (
                          <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> 
                            {new Date(h.deadline?.toDate ? h.deadline.toDate() : h.deadline).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" onClick={() => {
                          setForm({...h, deadline: h.deadline?.toDate ? h.deadline.toDate() : h.deadline});
                          setEditingId(h.id);
                        }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 text-red-400" onClick={() => setDeleteId(h.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="pointer-events-none opacity-80 scale-[0.95] origin-top-left -mb-6">
                      <QuestionRenderer 
                        question={h}
                        value={h.answer || ""}
                        onChange={() => {}}
                        isSubmitted={true}
                        showExplanation={true}
                        disabled={true}
                      />
                    </div>

                    <div className="flex items-center gap-6 pt-2">
                       <Link 
                         href={`/admin/analytics/question/${h.id}`}
                         className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-emerald-500 transition-colors"
                       >
                         <BarChart3 className="w-3 h-3 text-emerald-500" /> View Analytics
                       </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {currentLessonHomework.length === 0 && !isAdding && (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[40px] bg-black/20">
                <ClipboardList className="w-16 h-16 text-white/5 mx-auto mb-4" />
                <h3 className="text-xl font-bold">No Homework Assigned</h3>
                <p className="text-muted-foreground mt-2">Assign after-class homework for this lesson to track student progress.</p>
                <Button onClick={() => setIsAdding(true)} variant="link" className="text-emerald-400 mt-4">Add first assignment</Button>
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
        title="Delete Homework"
        description="This will permanently remove this assignment. All student submissions and analytics for this homework will be deleted."
      />
    </div>
  );
}

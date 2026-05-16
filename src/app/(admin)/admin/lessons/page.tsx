"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch, where } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { FileCard } from "@/components/ui/file-card-collections";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Save, Trash2, X, FileUp, File as FileIcon, Search, GraduationCap, AlertTriangle, Lock, Unlock, CheckCircle2, Loader2 } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { type FormatFileProps } from "@/components/ui/file-card-collections";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface Lesson {
  id: number;
  order: number;
  title: string;
  summary: string[];
  subjectId?: string;
  file?: string;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState({ id: 1, title: "", summary: "", file: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "subjects"), orderBy("name", "asc")), (snap) => {
      const sData = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setSubjects(sData);
      if (sData.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(sData[0].id);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    setLoading(true);
    let q;
    if (selectedSubjectId) {
      // Remove orderBy to avoid index requirement
      q = query(collection(db, "lessons"), where("subjectId", "==", selectedSubjectId));
    } else {
      q = query(collection(db, "lessons"), orderBy("order", "asc"));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Lesson[] = [];
      snapshot.forEach((doc) => {
        const l = doc.data() as Lesson;
        if (!selectedSubjectId && l.subjectId) return;
        data.push(l);
      });

      // Client-side sort if subject selected
      if (selectedSubjectId) {
        data.sort((a, b) => a.order - b.order);
      }

      setLessons(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedSubjectId]);

  const filteredLessons = useMemo(() => {
    return lessons.filter(l => 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.summary.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [lessons, searchQuery]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-10 w-32 bg-white/5" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const reorderLessons = async (currentLessons: Lesson[]) => {
    const sorted = [...currentLessons].sort((a, b) => a.order - b.order);
    const batch = writeBatch(db);
    let hasChanges = false;

    sorted.forEach((lesson, idx) => {
      const newOrder = idx + 1;
      if (lesson.order !== newOrder) {
        batch.set(doc(db, "lessons", lesson.id.toString()), {
          ...lesson,
          order: newOrder
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      await batch.commit();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploading) {
      toast.error("Please wait for the file upload to complete.");
      return;
    }
    try {
      const summaryArray = form.summary.split('\n').filter(s => s.trim() !== "");
      
      const lessonId = editingId || Date.now();
      let finalOrder = 0;
      
      if (editingId) {
        finalOrder = lessons.find(l => l.id === editingId)?.order || 1;
      } else {
        const maxOrder = lessons.length > 0 ? Math.max(...lessons.map(l => l.order || 0)) : 0;
        finalOrder = maxOrder + 1;
      }

      const newLesson = {
        id: Number(lessonId),
        order: finalOrder,
        title: form.title,
        summary: summaryArray,
        file: form.file || "",
        subjectId: selectedSubjectId
      };

      await setDoc(doc(db, "lessons", lessonId.toString()), newLesson);
      
      // Force a full reorder to ensure no gaps
      const updatedList = editingId 
        ? lessons.map(l => l.id === editingId ? newLesson : l)
        : [...lessons, newLesson];
      await reorderLessons(updatedList);

      setIsAdding(false);
      setEditingId(null);
      setForm({ id: Date.now(), title: "", summary: "", file: "" });
    } catch (error) {
      console.error("Error saving lesson:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const lesson = lessons.find(l => l.id === deleteId);
      
      // 1. Delete associated data (quizzes, materials, homework)
      const batch = writeBatch(db);
      
      // Quiz (ID is lessonId)
      batch.delete(doc(db, "quizzes", deleteId.toString()));
      
      // Practice Questions
      const practiceSnap = await getDocs(query(collection(db, "practice_questions"), where("lessonId", "==", deleteId)));
      practiceSnap.forEach(d => batch.delete(d.ref));
      
      // Homework Questions
      const homeworkSnap = await getDocs(query(collection(db, "homework_questions"), where("lessonId", "==", deleteId)));
      homeworkSnap.forEach(d => batch.delete(d.ref));
      
      // 2. Delete the lesson itself
      batch.delete(doc(db, "lessons", deleteId.toString()));
      
      // 3. Delete Submissions
      const subSnap = await getDocs(query(collection(db, "submissions"), where("lessonId", "==", deleteId)));
      subSnap.forEach(d => batch.delete(d.ref));
      
      // 4. Delete File from Storage
      if (lesson?.file?.includes('firebasestorage.googleapis.com')) {
        try {
          const storageRef = ref(storage, lesson.file);
          await deleteObject(storageRef);
        } catch (err) { console.error("Error deleting file from storage:", err); }
      }

      await batch.commit();

      // 5. Reorder remaining lessons
      await reorderLessons(lessons.filter(l => l.id !== deleteId));
      
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting/reordering lessons:", error);
      alert("Failed to delete lesson and associated data.");
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (lesson: Lesson) => {
    setForm({
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary.join('\n'),
      file: lesson.file || ""
    });
    setEditingId(lesson.id);
    setIsAdding(true);
  };



  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Lessons Management</h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Manage modules for</p>
            <select 
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-sm font-bold text-primary focus:outline-none focus:border-primary/50"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="">Legacy / All</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search lessons..." 
              className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => {
            setIsAdding(!isAdding);
            setEditingId(null);
            setForm({ id: Date.now(), title: "", summary: "", file: "" });
          }} className="bg-primary hover:bg-primary/90 btn-glow shrink-0">
            {isAdding && !editingId ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {isAdding && !editingId ? "Cancel" : "Add Lesson"}
          </Button>
        </div>
      </div>

      {isAdding && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card className="glass-card p-6 border-primary/20">
            <h2 className="text-xl font-bold mb-4">{editingId ? "Edit Lesson" : "Create New Lesson"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <Input placeholder="Lesson Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="bg-black/30" />
              </div>
              <div>
                <Textarea placeholder="Summary points (one per line)" rows={5} value={form.summary} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm({...form, summary: e.target.value})} required className="bg-black/30 resize-none" />
              </div>
              
              <div className="flex items-center gap-4 p-4 border border-dashed border-white/10 rounded-xl bg-black/20">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold mb-1 flex items-center gap-2 text-white">
                    <FileUp className="w-4 h-4 text-primary" /> 
                    Attach Resource
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">Upload a PDF or Image for this module.</p>
                  
                  <div className="flex items-center gap-4">
                    <Input type="file" id="lesson-file-upload" accept=".pdf,image/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      setUploadProgress(0);
                      
                      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                      const storageRef = ref(storage, `lessons/${Date.now()}-${sanitizedName}`);
                      const uploadTask = uploadBytesResumable(storageRef, file);

                      const unsub = uploadTask.on('state_changed', 
                        (snapshot) => {
                          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                          setUploadProgress(progress);
                        },
                        (error) => { 
                          console.error("Upload failed", error);
                          setUploading(false);
                          unsub();
                          toast.error("Upload failed: " + error.message);
                        },
                        async () => {
                          try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            setForm(prev => ({...prev, file: downloadURL}));
                            toast.success("File uploaded successfully!");
                          } catch (err: any) {
                            toast.error("Failed to get file URL: " + err.message);
                          } finally {
                            setUploading(false);
                            setUploadProgress(0);
                            unsub();
                          }
                        }
                      );
                    }} />
                    
                    {!uploading && (
                      <label 
                        htmlFor="lesson-file-upload" 
                        className="inline-flex items-center px-6 py-2.5 bg-primary/10 border border-primary/20 rounded-xl cursor-pointer hover:bg-primary/20 transition-all text-sm font-bold gap-2 text-primary group"
                      >
                        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                        {form.file ? "Change Resource" : "Choose File"}
                      </label>
                    )}

                    {uploading && (
                      <div className="flex-1 flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-white/5">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                              initial={{ width: 0 }} 
                              animate={{ width: `${uploadProgress}%` }} 
                            />
                          </div>
                        </div>
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                    )}
                    {form.file && !uploading && (
                      <div className="flex items-center gap-3 bg-black/40 p-2 pr-4 rounded-xl border border-white/10 relative group/preview">
                        <div className="scale-75 origin-center">
                          <FileCard formatFile={(form.file.split('.').pop()?.toLowerCase() as FormatFileProps) || 'pdf'} />
                        </div>
                        <div className="flex flex-col min-w-0 max-w-[120px]">
                          <span className="text-[10px] text-white font-bold truncate">{form.file.split('/').pop()?.split('-').pop()}</span>
                          <span className="text-[8px] text-muted-foreground uppercase tracking-tighter">Ready</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 rounded-full hover:bg-destructive/20 text-destructive" 
                          onClick={() => setForm({...form, file: ""})}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" disabled={uploading} className="bg-primary hover:bg-primary/90 min-w-[120px]">
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> 
                      {editingId ? "Update Lesson" : "Save Lesson"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4">
        {filteredLessons.map((lesson, idx) => (
          <HighlightCard key={lesson.id} glowColor="from-blue-500/10 to-transparent">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-black tracking-widest uppercase text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                  Module {lesson.order}
                </div>
                <h3 className="font-bold text-2xl text-white truncate">{lesson.title}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {lesson.summary.map((point, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 hover:bg-white/5 hover:border-white/10 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-white/70 leading-snug line-clamp-2" title={point}>{point}</span>
                  </div>
                ))}
              </div>

              {lesson.file && (
                <div 
                  className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20 cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all group w-fit" 
                  onClick={() => window.open(lesson.file, '_blank')}
                >
                  <div className="scale-[0.8] origin-left -my-2 -ml-2">
                    <FileCard formatFile={(lesson.file.split('.').pop()?.toLowerCase() as FormatFileProps) || 'pdf'} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-primary transition-colors line-clamp-1 max-w-[200px]">{lesson.file.split('/').pop()}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Attached Resource</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 shrink-0 border-l border-white/10 pl-6 my-2">
              <Button size="sm" variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5 h-10 px-4 rounded-xl font-bold" onClick={() => startEdit(lesson)}>
                <Edit2 className="w-4 h-4 mr-2 text-primary" /> Edit Module
              </Button>
              <Button size="sm" variant="outline" className="w-full justify-start border-destructive/20 text-destructive hover:bg-destructive/10 h-10 px-4 rounded-xl font-bold" onClick={() => setDeleteId(lesson.id)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </HighlightCard>
        ))}
        
        {filteredLessons.length === 0 && !isAdding && (
          <EmptyState 
            icon={GraduationCap} 
            title="No Lessons Found" 
            description={searchQuery ? `No matches for "${searchQuery}". Try a different term.` : "Your curriculum is empty. Start by adding your first learning module."}
            action={!searchQuery && (
              <Button onClick={() => setIsAdding(true)} className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Add First Lesson
              </Button>
            )}
          />
        )}
      </div>

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Module"
        description="This will permanently delete this module along with all its attached quizzes, materials, and homework assignments. This action cannot be undone."
      />
    </div>
  );
}

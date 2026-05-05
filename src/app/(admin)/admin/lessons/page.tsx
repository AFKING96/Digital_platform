"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { FileCard } from "@/components/ui/file-card-collections";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Save, Trash2, X, FileUp, File as FileIcon, Search, GraduationCap } from "lucide-react";
import { type FormatFileProps } from "@/components/ui/file-card-collections";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface Lesson {
  id: number;
  order: number;
  title: string;
  summary: string[];
  file?: string;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [form, setForm] = useState({ id: 1, title: "", summary: "", file: "" });
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "lessons"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Lesson[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as Lesson);
      });
      setLessons(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
        file: form.file || ""
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

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this lesson?")) {
      try {
        await deleteDoc(doc(db, "lessons", id.toString()));
        // Reorder remaining lessons
        await reorderLessons(lessons.filter(l => l.id !== id));
      } catch (error) {
        console.error("Error deleting/reordering lessons:", error);
      }
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lessons Management</h1>
          <p className="text-muted-foreground">Add, edit, or remove learning modules.</p>
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
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-1 flex items-center gap-2"><FileUp className="w-4 h-4 text-primary" /> Attach File</h4>
                  <p className="text-xs text-muted-foreground mb-2">Upload a PDF or Image for this module.</p>
                  <Input type="file" accept=".pdf,image/*" className="bg-black/40 border-white/10" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch("/api/upload", { method: "POST", body: formData });
                      if (res.ok) {
                        const { path: filePath } = await res.json();
                        setForm(prev => ({...prev, file: filePath}));
                      }
                    } catch (error) {
                      console.error("Upload failed", error);
                    } finally {
                      setUploading(false);
                    }
                  }} />
                </div>
                {form.file && (
                  <div className="w-24 h-24 rounded-lg bg-black/40 border border-white/10 flex flex-col items-center justify-center p-2 text-center break-all relative overflow-hidden">
                    <div className="scale-75 mb-1">
                      <FileCard formatFile={(form.file.split('.').pop()?.toLowerCase() as FormatFileProps) || 'pdf'} />
                    </div>
                    <span className="text-[10px] text-muted-foreground line-clamp-2" title={form.file}>{form.file.split('/').pop()}</span>
                    <Button variant="ghost" size="icon" className="absolute top-0 right-0 w-6 h-6 hover:bg-destructive/20 text-destructive" onClick={() => setForm({...form, file: ""})}><X className="w-3 h-3" /></Button>
                  </div>
                )}
                {uploading && <div className="text-sm text-primary animate-pulse">Uploading...</div>}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  <Save className="w-4 h-4 mr-2" /> {editingId ? "Update Lesson" : "Save Lesson"}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4">
        {filteredLessons.map((lesson, idx) => (
          <HighlightCard key={lesson.id} glowColor="from-blue-500/10 to-transparent">
            <div className="flex-1">
              <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
                Module {lesson.order}
              </div>
              <h3 className="font-bold text-xl text-white mb-2">{lesson.title}</h3>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-3">
                {lesson.summary.map((point, i) => (
                  <li key={i} className="line-clamp-1">{point}</li>
                ))}
              </ul>
              {lesson.file && (
                <div className="inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors" onClick={() => window.open(lesson.file, '_blank')}>
                  <div className="scale-75 origin-left">
                    <FileCard formatFile={(lesson.file.split('.').pop()?.toLowerCase() as FormatFileProps) || 'pdf'} />
                  </div>
                  <span className="text-xs font-medium text-primary line-clamp-1">{lesson.file.split('/').pop()}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5" onClick={() => startEdit(lesson)}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button size="sm" variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(lesson.id)}>
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
    </div>
  );
}

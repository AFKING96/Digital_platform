"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDocs, writeBatch, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, Save, Trash2, X, Search, BookOpen, Palette, Info, LayoutGrid } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  createdAt: any;
}

const COLORS = [
  { name: "Blue", value: "blue" },
  { name: "Emerald", value: "emerald" },
  { name: "Violet", value: "violet" },
  { name: "Amber", value: "amber" },
  { name: "Rose", value: "rose" },
  { name: "Cyan", value: "cyan" },
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ name: "", description: "", icon: "BookOpen", color: "blue" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "subjects"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Subject[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Subject);
      });
      setSubjects(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const subjectId = editingId || doc(collection(db, "subjects")).id;
      await setDoc(doc(db, "subjects", subjectId), {
        ...form,
        updatedAt: serverTimestamp(),
        ...(editingId ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });

      setIsAdding(false);
      setEditingId(null);
      setForm({ name: "", description: "", icon: "BookOpen", color: "blue" });
    } catch (e) {
      console.error("Error saving subject:", e);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Find all related lessons
      const lessonsSnap = await getDocs(query(collection(db, "lessons"), where("subjectId", "==", deleteId)));
      for (const lessonDoc of lessonsSnap.docs) {
        const lessonId = lessonDoc.id;
        
        // Delete related materials
        const materialsSnap = await getDocs(query(collection(db, "materials"), where("lessonId", "==", Number(lessonId))));
        materialsSnap.forEach(d => batch.delete(d.ref));
        
        // Delete related practice
        const practiceSnap = await getDocs(query(collection(db, "practice_questions"), where("lessonId", "==", Number(lessonId))));
        practiceSnap.forEach(d => batch.delete(d.ref));
        
        // Delete related homework
        const homeworkSnap = await getDocs(query(collection(db, "homework_questions"), where("lessonId", "==", Number(lessonId))));
        homeworkSnap.forEach(d => batch.delete(d.ref));
        
        // Delete the lesson itself
        batch.delete(lessonDoc.ref);
      }

      // 2. Find materials that belong to subject but no specific lesson
      const subjectMaterialsSnap = await getDocs(query(collection(db, "materials"), where("subjectId", "==", deleteId)));
      subjectMaterialsSnap.forEach(d => batch.delete(d.ref));

      // 3. Delete from subject_enrollments (optional if we use array in user doc)
      // Actually we need to remove this subject ID from all users' enrolledSubjects array
      const usersSnap = await getDocs(query(collection(db, "users"), where("enrolledSubjects", "array-contains", deleteId)));
      usersSnap.forEach(uDoc => {
        const enrolled = uDoc.data().enrolledSubjects || [];
        batch.update(uDoc.ref, {
          enrolledSubjects: enrolled.filter((id: string) => id !== deleteId)
        });
      });

      // 4. Finally delete the subject
      batch.delete(doc(db, "subjects", deleteId));

      await batch.commit();
      setDeleteId(null);
    } catch (e) {
      console.error("Error deleting subject:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-48 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects Management</h1>
          <p className="text-muted-foreground">Define the organizational structure of your platform.</p>
        </div>
        <Button 
          onClick={() => { setIsAdding(true); setEditingId(null); setForm({ name: "", description: "", icon: "BookOpen", color: "blue" }); }}
          className="bg-primary hover:bg-primary/90 btn-glow"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Subject
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search subjects..." 
          className="pl-9 bg-black/20 border-white/10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {(isAdding || editingId) && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="lg:col-span-1">
              <Card className="p-6 bg-white/5 border-primary/20 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">{editingId ? "Edit Subject" : "New Subject"}</h3>
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setIsAdding(false); setEditingId(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Subject Name</label>
                    <Input 
                      placeholder="e.g. Accounting, Statistics..." 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})}
                      required
                      className="bg-black/40 border-white/10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                    <Textarea 
                      placeholder="What is this subject about?" 
                      value={form.description} 
                      onChange={e => setForm({...form, description: e.target.value})}
                      className="bg-black/40 border-white/10 min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Theme Color</label>
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white"
                        value={form.color}
                        onChange={e => setForm({...form, color: e.target.value})}
                      >
                        {COLORS.map(c => (
                          <option key={c.value} value={c.value}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Icon</label>
                      <select 
                        className="w-full bg-black/40 border border-white/10 rounded-md p-2 text-sm text-white"
                        value={form.icon}
                        onChange={e => setForm({...form, icon: e.target.value})}
                      >
                        <option value="BookOpen">Book</option>
                        <option value="LayoutGrid">Grid</option>
                        <option value="Palette">Palette</option>
                        <option value="Info">Info</option>
                      </select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-2">
                    <Save className="w-4 h-4 mr-2" /> {editingId ? "Update Subject" : "Create Subject"}
                  </Button>
                </form>
              </Card>
            </motion.div>
          )}

          {filteredSubjects.map((subject) => (
            <motion.div key={subject.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 bg-white/5 border-white/10 hover:border-primary/30 transition-all group relative overflow-hidden h-full flex flex-col justify-between">
                <div className={`absolute top-0 left-0 w-1 h-full bg-${subject.color}-500`} />
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 bg-${subject.color}-500/10 rounded-xl text-${subject.color}-500`}>
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingId(subject.id); setForm({ name: subject.name, description: subject.description, icon: subject.icon, color: subject.color }); setIsAdding(false); }}>
                        <Edit2 className="w-4 h-4 text-muted-foreground hover:text-white" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(subject.id)}>
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{subject.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {subject.createdAt?.toDate()?.toLocaleDateString() || "Recently"}</span>
                  <div className={`px-2 py-1 rounded bg-${subject.color}-500/10 text-${subject.color}-500 font-bold uppercase`}>
                    {subject.color}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Subject"
        description="This will permanently delete the subject and ALL associated lessons, materials, practice sets, and homework. Students will no longer be able to access this content. This action is irreversible."
      />
    </div>
  );
}

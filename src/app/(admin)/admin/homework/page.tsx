"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy, deleteDoc, doc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Clock, Trash2, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Homework {
  id: string;
  lessonId: number;
  title: string;
  deadline: any;
}

export default function AdminHomeworkPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ lessonId: "", title: "", deadline: "" });

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const fetchHomeworks = async () => {
    try {
      const q = query(collection(db, "homework"), orderBy("deadline", "asc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Homework));
      setHomeworks(data);
    } catch (error) {
      console.error("Error fetching homework:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hwData = {
        lessonId: Number(form.lessonId),
        title: form.title,
        deadline: new Date(form.deadline),
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, "homework"), hwData);

      // Create notifications for all students
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      for (const userDoc of usersSnap.docs) {
        await addDoc(collection(db, "notifications"), {
          userId: userDoc.id,
          message: `New Homework Assigned: ${form.title} (Module ${form.lessonId})`,
          type: "homework",
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setIsAddOpen(false);
      setForm({ lessonId: "", title: "", deadline: "" });
      fetchHomeworks();
    } catch (error) {
      console.error("Error adding homework:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "homework", id));
      fetchHomeworks();
    } catch (error) {
      console.error("Error deleting homework:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Homework Management</h1>
          <p className="text-muted-foreground">Assign and manage module homework for students.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 btn-glow">
                <Plus className="w-4 h-4 mr-2" /> Assign Homework
              </Button>
            }
          />
          <DialogContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Assign New Homework</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Module ID</label>
                <Input 
                  type="number" 
                  required 
                  value={form.lessonId} 
                  onChange={e => setForm({...form, lessonId: e.target.value})} 
                  placeholder="e.g. 1" 
                  className="bg-black/30 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Homework Title</label>
                <Input 
                  required 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  placeholder="e.g. Calculus Practice Set 1" 
                  className="bg-black/30 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Deadline Date</label>
                <Input 
                  type="datetime-local" 
                  required 
                  value={form.deadline} 
                  onChange={e => setForm({...form, deadline: e.target.value})} 
                  className="bg-black/30 border-white/10"
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Publish Homework</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {homeworks.map((hw) => (
          <Card key={hw.id} className="glass-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{hw.title}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Module {hw.lessonId}
                  </span>
                  <span className="text-xs text-red-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due: {hw.deadline?.toDate().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(hw.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
        {homeworks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">No homework assigned yet.</div>
        )}
      </div>
    </div>
  );
}


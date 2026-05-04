"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDocs, orderBy } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Save, User as UserIcon, BookOpen, Target, CheckCircle2, DollarSign, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Student {
  id: string;
  name: string;
  email: string;
  currentLesson: number;
  solvedQuestions: number;
  accuracy: number;
  paid: number;
  remaining: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<{id: number, title: string}[]>([]);
  
  // Forms
  const [addForm, setAddForm] = useState({ name: "", universityId: "", password: "", paid: 0, currentLesson: 1 });
  const [editForm, setEditForm] = useState({ currentLesson: 1, paid: 0, remaining: 0 });
  const [lessonMap, setLessonMap] = useState<Record<number, number>>({});

  useEffect(() => {
    // 1. Fetch lesson mapping
    const fetchLessonMap = async () => {
      const q = query(collection(db, "lessons"), orderBy("order", "asc"));
      const snap = await getDocs(q);
      const mapping: Record<number, number> = {};
      const lList: {id: number, title: string, order: number}[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        mapping[data.id] = data.order;
        lList.push({ id: data.id, title: data.title, order: data.order });
      });
      setLessonMap(mapping);
      setLessons(lList);
    };
    fetchLessonMap();

    // 2. Real-time students
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studs: Student[] = [];
      snapshot.forEach((doc) => {
        studs.push({ id: doc.id, ...doc.data() } as Student);
      });
      setStudents(studs);
    });
    return () => unsubscribe();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const email = `${addForm.universityId}@app.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, addForm.password);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: addForm.name,
        email,
        role: "student",
        currentLesson: Number(addForm.currentLesson),
        solvedQuestions: 0,
        accuracy: 0,
        paid: Number(addForm.paid),
        remaining: 0
      });
      
      setIsAddOpen(false);
      setAddForm({ name: "", universityId: "", password: "", paid: 0, currentLesson: 1 });
    } catch (error) {
      console.error("Error creating student:", error);
      alert("Error creating student. See console.");
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      
      let count = 0;
      for (const line of lines.slice(1)) { // skip header
        const [name, universityId, password, currentLesson, paid] = line.split(',');
        if (name && universityId && password) {
          try {
            const email = `${universityId.trim()}@app.com`;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password.trim());
            
            await setDoc(doc(db, "users", userCredential.user.uid), {
              name: name.trim(),
              email,
              role: "student",
              currentLesson: Number(currentLesson || 1),
              solvedQuestions: 0,
              accuracy: 0,
              paid: Number(paid || 0),
              remaining: 0
            });
            count++;
          } catch (error) {
            console.error("Error creating student from CSV:", name, error);
          }
        }
      }
      alert(`Bulk upload completed! Added ${count} students.`);
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleEditOpen = (student: Student) => {
    setSelectedStudent(student);
    setEditForm({
      currentLesson: student.currentLesson,
      paid: student.paid || 0,
      remaining: student.remaining || 0
    });
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    try {
      await updateDoc(doc(db, "users", selectedStudent.id), {
        currentLesson: Number(editForm.currentLesson),
        paid: Number(editForm.paid),
        remaining: Number(editForm.remaining)
      });
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error updating student:", error);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students Management</h1>
          <p className="text-muted-foreground">Manage enrolled students, progress, and tuition.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 relative overflow-hidden" onClick={() => document.getElementById('csv-upload')?.click()}>
            <Upload className="w-4 h-4 mr-2 text-primary" /> Bulk CSV
            <input 
              id="csv-upload" 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleBulkUpload} 
            />
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger render={
              <Button className="bg-primary hover:bg-primary/90 btn-glow transition-all hover:scale-105">
                <Plus className="w-4 h-4 mr-2" /> Add Student
              </Button>
            } />
            <DialogContent className="bg-black/90 border-white/10 text-white p-6 max-w-md backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Register New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-4 pt-4">
              <Input placeholder="Full Name" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} required className="bg-black/30 border-white/10" />
              <Input placeholder="University ID (e.g. 2023001)" value={addForm.universityId} onChange={e => setAddForm({...addForm, universityId: e.target.value})} required className="bg-black/30 border-white/10" />
              <Input placeholder="Password" type="password" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} required className="bg-black/30 border-white/10" />
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-muted-foreground uppercase">Initial Module</label>
                  <select 
                    value={addForm.currentLesson} 
                    onChange={e => setAddForm({...addForm, currentLesson: Number(e.target.value)})}
                    className="w-full bg-black/30 border border-white/10 rounded-md p-2 text-sm text-white"
                  >
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>Module {l.order}: {l.title}</option>
                    ))}
                    {lessons.length === 0 && <option value={1}>No lessons found</option>}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-muted-foreground uppercase">Paid Amount ($)</label>
                  <Input placeholder="Paid Amount" type="number" value={addForm.paid} onChange={e => setAddForm({...addForm, paid: Number(e.target.value)})} className="bg-black/30 border-white/10" />
                </div>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90">Create Account</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name or email..." 
          className="pl-9 bg-black/20 border-white/10 transition-all focus:border-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filteredStudents.map((student) => (
            <motion.div 
              key={student.id} 
              layout 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleEditOpen(student)}
            >
              <Card className="glass-card p-5 flex flex-col gap-4 cursor-pointer hover:scale-[1.02] hover:border-primary/30 transition-all group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">{student.name}</h3>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-sm relative z-10">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>Mod {lessonMap[student.currentLesson] || student.currentLesson}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <span>{student.accuracy}% Acc</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>{student.solvedQuestions} Solved</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                    <span>${student.paid || 0} Paid</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Sheet open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <SheetContent className="bg-[#040810]/95 backdrop-blur-xl border-l-white/10 text-white min-w-[400px]">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl text-white">Student Details</SheetTitle>
            <SheetDescription>
              View performance and update administrative records for {selectedStudent?.name}.
            </SheetDescription>
          </SheetHeader>

          {selectedStudent && (
            <div className="space-y-8">
              {/* Performance Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Performance Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white">{selectedStudent.accuracy}%</div>
                    <div className="text-xs text-muted-foreground mt-1">Accuracy</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="text-2xl font-bold text-white">{selectedStudent.solvedQuestions}</div>
                    <div className="text-xs text-muted-foreground mt-1">Questions Solved</div>
                  </div>
                </div>
              </div>

              {/* Administrative Updates */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Update Records</h3>
                
                <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">Module Progression</label>
                    <select 
                      className="bg-black/40 border border-white/10 rounded-md p-2 text-white" 
                      value={editForm.currentLesson} 
                      onChange={e => setEditForm({...editForm, currentLesson: Number(e.target.value)})}
                    >
                      {lessons.map((l) => (
                        <option key={l.id} value={l.id}>Module {l.order}: {l.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">Total Paid Amount ($)</label>
                    <Input type="number" className="bg-black/40 border-white/10 text-green-400" value={editForm.paid} onChange={e => setEditForm({...editForm, paid: Number(e.target.value)})} />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-muted-foreground">Remaining Balance ($)</label>
                    <Input type="number" className="bg-black/40 border-white/10 text-red-400" value={editForm.remaining} onChange={e => setEditForm({...editForm, remaining: Number(e.target.value)})} />
                  </div>

                  <Button className="w-full mt-4 bg-primary hover:bg-primary/90" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

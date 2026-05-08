"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, getDocs, orderBy, writeBatch, arrayRemove, deleteField, arrayUnion } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { db, auth, firebaseConfig } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Save, User as UserIcon, Users, BookOpen, Target, CheckCircle2, DollarSign, Upload, Trash2, Layout, CreditCard, Activity, ChevronRight, Mail, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  email: string;
  currentLesson: number;
  solvedQuestions: number;
  accuracy: number;
  paid: number;
  remaining: number;
  enrolledSubjects?: string[];
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [lessons, setLessons] = useState<{id: number, title: string, order: number}[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Forms
  const [addForm, setAddForm] = useState({ name: "", universityId: "", password: "", paid: 0, currentLesson: 1, initialSubject: "" });
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [editForm, setEditForm] = useState({ currentLesson: 1, paid: 0, remaining: 0 });
  const [lessonMap, setLessonMap] = useState<Record<number, number>>({});
  const [allSubjects, setAllSubjects] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "subjects"), (snap) => {
      setAllSubjects(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });
    return () => unsub();
  }, []);

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
      // Use a secondary app to create the user without logging out the admin
      const appName = `Secondary-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, addForm.password);
      
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: addForm.name,
        email,
        role: "student",
        currentLesson: Number(addForm.currentLesson),
        solvedQuestions: 0,
        accuracy: 0,
        paid: Number(addForm.paid),
        remaining: 0,
        enrolledSubjects: addForm.initialSubject ? [addForm.initialSubject] : []
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      
      setIsAddOpen(false);
      setAddForm({ name: "", universityId: "", password: "", paid: 0, currentLesson: 1, initialSubject: "" });
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
      
      setIsBulkUploading(true);
      setBulkProgress(0);
      let count = 0;
      const total = lines.length - 1;

      // Initialize secondary app ONCE for the entire bulk process
      const appName = `Bulk-${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        for (const [index, line] of lines.slice(1).entries()) { // skip header
          const [name, universityId, password, currentLesson, paid] = line.split(',');
          if (name && universityId && password) {
            try {
              const email = `${universityId.trim()}@app.com`;
              
              const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password.trim());
              
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
              
              await signOut(secondaryAuth);
              count++;
            } catch (error) {
              console.error("Error creating student from CSV:", name, error);
            }
          }
          setBulkProgress(Math.round(((index + 1) / total) * 100));
        }
        alert(`Bulk upload completed! Added ${count} students.`);
      } finally {
        await deleteApp(secondaryApp);
        setIsBulkUploading(false);
        setBulkProgress(0);
        if (e.target) e.target.value = '';
      }
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

  const toggleSubject = async (studentId: string, subjectId: string, isEnrolled: boolean) => {
    try {
      await updateDoc(doc(db, "users", studentId), {
        enrolledSubjects: isEnrolled ? arrayRemove(subjectId) : arrayUnion(subjectId)
      });
    } catch (error) {
      console.error("Error toggling subject:", error);
    }
  };
  
  const handleDeleteStudent = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete submissions
      const subSnap = await getDocs(query(collection(db, "submissions"), where("userId", "==", deleteId)));
      subSnap.forEach(d => batch.delete(d.ref));
      
      // 2. Delete notifications
      const notifSnap = await getDocs(query(collection(db, "notifications"), where("userId", "==", deleteId)));
      notifSnap.forEach(d => batch.delete(d.ref));
      
      // 3. Delete payment logs
      const paySnap = await getDocs(query(collection(db, "payment_logs"), where("studentId", "==", deleteId)));
      paySnap.forEach(d => batch.delete(d.ref));
      
      // 4. Remove from groups
      const groupsSnap = await getDocs(query(collection(db, "groups"), where("studentIds", "array-contains", deleteId)));
      groupsSnap.forEach(d => {
        batch.update(d.ref, {
          studentIds: arrayRemove(deleteId)
        });
      });
      
      // 5. Remove from sessions
      const sessionsSnap = await getDocs(query(collection(db, "sessions"), where("studentIds", "array-contains", deleteId)));
      sessionsSnap.forEach(d => {
        batch.update(d.ref, {
          studentIds: arrayRemove(deleteId),
          [`payments.${deleteId}`]: deleteField()
        });
      });
      
      // 6. Delete user doc
      batch.delete(doc(db, "users", deleteId));
      
      await batch.commit();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Failed to delete student and associated data.");
    } finally {
      setIsDeleting(false);
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
        
        <div className="flex flex-wrap gap-3">
          {isBulkUploading && (
            <div className="flex flex-col gap-2 min-w-[200px] bg-primary/5 border border-primary/20 p-3 rounded-xl">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                <span>Uploading Students...</span>
                <span>{bulkProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${bulkProgress}%` }}
                />
              </div>
            </div>
          )}
          <div className="relative group">
            <Input 
              type="file" 
              accept=".csv" 
              onChange={handleBulkUpload} 
              className="hidden" 
              id="bulk-upload"
              disabled={isBulkUploading}
            />
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 hover:bg-white/10 h-11 px-5 rounded-xl group"
              onClick={() => document.getElementById('bulk-upload')?.click()}
              disabled={isBulkUploading}
            >
              <Users className="w-4 h-4 mr-2 text-primary" />
              {isBulkUploading ? "Processing..." : "Bulk Upload (CSV)"}
            </Button>
          </div>
          <Button 
            onClick={() => setIsAddOpen(true)} 
            className="bg-primary hover:bg-primary/90 btn-glow h-11 px-6 rounded-xl"
            disabled={isBulkUploading}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
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
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase">Initial Subject Enrollment</label>
                <Select 
                  value={addForm.initialSubject} 
                  onValueChange={(val: string | null) => setAddForm({...addForm, initialSubject: val || ""})}
                >
                  <SelectTrigger className="w-full bg-black/30 border-white/10 text-white">
                    <SelectValue placeholder="Select a subject (Optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0B1220] border-white/10 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {allSubjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(student.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>

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
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layout className="w-4 h-4 text-violet-400" />
                    <span>{student.enrolledSubjects?.length || 0} Subjects</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Sheet open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <SheetContent className="bg-[#040810]/95 backdrop-blur-2xl border-l-white/10 text-white min-w-[450px] p-0 overflow-hidden flex flex-col">
          {(() => {
            const currentStudent = students.find(s => s.id === selectedStudent?.id);
            if (!currentStudent) return null;
            
            return (
              <>
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-blue-500/10 p-6 flex items-end">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Badge variant="outline" className="bg-black/50 border-white/10 backdrop-blur-md">
                      Student ID: {currentStudent.id.slice(0, 8)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 relative z-10 translate-y-8">
                    <div className="w-20 h-20 rounded-[24px] bg-[#0B1220] border-4 border-[#040810] shadow-2xl flex items-center justify-center text-primary text-3xl font-black">
                      {currentStudent.name.charAt(0)}
                    </div>
                    <div className="pb-2">
                      <h2 className="text-2xl font-black tracking-tight text-white">{currentStudent.name}</h2>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {currentStudent.email}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-12 space-y-8 custom-scrollbar">
                  {/* Performance Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Target className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Accuracy</span>
                      </div>
                      <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
                        {currentStudent.accuracy}%
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${currentStudent.accuracy}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Questions</span>
                      </div>
                      <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform origin-left">
                        {currentStudent.solvedQuestions}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">Total solved tasks</p>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 space-y-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <CreditCard className="w-16 h-16 text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-widest">Financial Status</span>
                      </div>
                      <Badge variant={currentStudent.remaining > 0 ? "destructive" : "secondary"} className={cn(
                        "rounded-lg",
                        currentStudent.remaining > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                      )}>
                        {currentStudent.remaining > 0 ? "Outstanding Balance" : "Account Clear"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 relative z-10 pt-2">
                      <div>
                        <div className="text-3xl font-black text-emerald-400">${currentStudent.paid}</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total Paid</div>
                      </div>
                      <div>
                        <div className={cn("text-3xl font-black", currentStudent.remaining > 0 ? "text-red-400" : "text-white/20")}>
                          ${currentStudent.remaining}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Remaining</div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-white/5" />

                  {/* Enrollment Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Course Enrollment</h3>
                      <span className="text-[10px] font-bold text-primary">{currentStudent.enrolledSubjects?.length || 0} Active</span>
                    </div>

                    {/* Quick Enroll Dropdown */}
                    <div className="flex gap-2">
                      <Select onValueChange={(val: string | null) => val && toggleSubject(currentStudent.id, val, false)}>
                        <SelectTrigger className="flex-1 bg-white/5 border-white/10 rounded-xl h-10 text-xs">
                          <SelectValue placeholder="Quick Enroll in Subject..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0B1220] border-white/10 text-white backdrop-blur-xl">
                          {allSubjects
                            .filter(s => !currentStudent.enrolledSubjects?.includes(s.id))
                            .map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))
                          }
                          {allSubjects.filter(s => !currentStudent.enrolledSubjects?.includes(s.id)).length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground text-center">All subjects enrolled</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {allSubjects
                        .filter(s => currentStudent.enrolledSubjects?.includes(s.id))
                        .map((subject) => (
                          <div 
                            key={subject.id} 
                            className="group flex items-center justify-between p-3 rounded-xl border bg-primary/5 border-primary/20 transition-all duration-300"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/20 text-primary transition-all">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-white">{subject.name}</div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Access Active</div>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-400/10 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubject(currentStudent.id, subject.id, true);
                              }}
                            >
                              Revoke
                            </Button>
                          </div>
                        ))}
                      {(!currentStudent.enrolledSubjects || currentStudent.enrolledSubjects.length === 0) && (
                        <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/10 rounded-2xl bg-white/2">
                          <BookOpen className="w-8 h-8 text-white/10 mb-2" />
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">No Active Enrollments</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="space-y-4 pt-4">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Administrative Updates</h3>
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
                      
                      <div className="space-y-2 relative z-10">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1">
                          <Activity className="w-3 h-3 text-primary" /> Module Progression
                        </label>
                        <Select 
                          value={editForm.currentLesson.toString()} 
                          onValueChange={(val: string | null) => val && setEditForm({...editForm, currentLesson: Number(val)})}
                        >
                          <SelectTrigger className="w-full bg-[#0B1220] border-white/10 rounded-xl h-11 text-sm focus:ring-primary/50">
                            <SelectValue placeholder="Select current module" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0B1220] border-white/10 text-white backdrop-blur-xl">
                            {lessons.map((l) => (
                              <SelectItem key={l.id} value={l.id.toString()} className="focus:bg-primary/20 focus:text-primary">
                                Module {l.order}: {l.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1">
                            <DollarSign className="w-3 h-3 text-emerald-400" /> Paid Amount
                          </label>
                          <Input 
                            type="number" 
                            className="bg-[#0B1220] border-white/10 text-emerald-400 h-11 rounded-xl focus:border-emerald-500/50 transition-all" 
                            value={editForm.paid} 
                            onChange={e => setEditForm({...editForm, paid: Number(e.target.value)})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 px-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" /> Remaining
                          </label>
                          <Input 
                            type="number" 
                            className="bg-[#0B1220] border-white/10 text-red-400 h-11 rounded-xl focus:border-red-500/50 transition-all" 
                            value={editForm.remaining} 
                            onChange={e => setEditForm({...editForm, remaining: Number(e.target.value)})} 
                          />
                        </div>
                      </div>

                      <Button className="w-full h-12 bg-primary hover:bg-primary/90 rounded-xl font-bold shadow-[0_10px_20px_-10px_rgba(59,130,246,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Commit Changes
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDeleteStudent}
        loading={isDeleting}
        title="Delete Student Account"
        description="This will permanently delete this student along with all their submissions, payment history, and group memberships. This action cannot be undone."
      />
    </div>
  );
}

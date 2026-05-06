"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, deleteDoc, where, orderBy, updateDoc, addDoc, getDoc, serverTimestamp, increment, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Users, User, Plus, Trash2, CheckCircle2, XCircle, DollarSign, ChevronRight, AlertCircle, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DeleteDialog } from "@/components/ui/delete-dialog";

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  studentIds: string[];
}

interface Session {
  id: string;
  title: string;
  date: any;
  time: string;
  type: "group" | "individual";
  targetId: string;
  studentIds: string[];
  payments: Record<string, boolean>;
}

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    type: "group" as "group" | "individual",
    targetId: ""
  });

  useEffect(() => {
    // Fetch Sessions
    const qSessions = query(collection(db, "sessions"), orderBy("date", "asc"));
    const unsubSessions = onSnapshot(qSessions, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Session)));
      setLoading(false);
    });

    // Fetch Groups
    const qGroups = query(collection(db, "groups"), orderBy("name", "asc"));
    const unsubGroups = onSnapshot(qGroups, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
    });

    // Fetch Students
    const qStudents = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, name: d.data().name, email: d.data().email } as Student)));
    });

    return () => {
      unsubSessions();
      unsubGroups();
      unsubStudents();
    };
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetId) return;

    let sessionStudentIds: string[] = [];
    if (form.type === "group") {
      const group = groups.find(g => g.id === form.targetId);
      sessionStudentIds = group?.studentIds || [];
    } else {
      sessionStudentIds = [form.targetId];
    }

    const initialPayments: Record<string, boolean> = {};
    sessionStudentIds.forEach(id => {
      initialPayments[id] = false;
    });

    try {
      await addDoc(collection(db, "sessions"), {
        title: form.title,
        date: new Date(form.date),
        time: form.time,
        type: form.type,
        targetId: form.targetId,
        studentIds: sessionStudentIds,
        payments: initialPayments,
        createdAt: serverTimestamp()
      });

      setIsAddOpen(false);
      setForm({ title: "", date: "", time: "", type: "group", targetId: "" });
    } catch (error) {
      console.error("Error creating session:", error);
    }
  };

  const handleMarkPaid = async (studentId: string, sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    try {
      // 1. Update session payment record
      const newPayments = { ...session.payments, [studentId]: true };
      await updateDoc(doc(db, "sessions", sessionId), {
        payments: newPayments
      });

      // 2. Update student financial record (Assume a fixed session price for now, or just increment)
      // Since the prompt says "update student financial data: paid amount, remaining balance"
      // We'll increment 'paid' and decrement 'remaining' if it's > 0.
      const studentDoc = await getDoc(doc(db, "users", studentId));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        const sessionPrice = 50; // Mock price per session, or you could add this to the session form
        
        await updateDoc(doc(db, "users", studentId), {
          paid: increment(sessionPrice),
          remaining: Math.max(0, (data.remaining || 0) - sessionPrice)
        });

        // 3. Create payment record in Firestore
        await addDoc(collection(db, "payment_logs"), {
          studentId,
          studentName: data.name,
          sessionId,
          sessionTitle: session.title,
          amount: sessionPrice,
          date: serverTimestamp()
        });
      }

      // Update local state for the modal if open
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(prev => prev ? { ...prev, payments: newPayments } : null);
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);

      // 1. Find all payment logs for this session
      const q = query(collection(db, "payment_logs"), where("sessionId", "==", deleteId));
      const logsSnap = await getDocs(q);

      // 2. Revert student balances and delete logs
      logsSnap.forEach((logDoc) => {
        const logData = logDoc.data();
        const userRef = doc(db, "users", logData.studentId);
        batch.update(userRef, {
          paid: increment(-logData.amount),
          remaining: increment(logData.amount)
        });
        batch.delete(logDoc.ref);
      });

      // 3. Delete the session itself
      batch.delete(doc(db, "sessions", deleteId));

      await batch.commit();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Failed to delete session and associated payments.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-10 w-32 bg-white/5" />
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Session Calendar</h1>
          <p className="text-muted-foreground">Schedule and manage learning sessions and payments.</p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 btn-glow">
              <Plus className="w-4 h-4 mr-2" /> Schedule Session
            </Button>
          } />
          <DialogContent className="bg-[#0A0C14] border-white/10 text-white max-w-md backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">New Session</DialogTitle>
              <DialogDescription className="text-muted-foreground">Create a new learning session for a group or student.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Session Title</label>
                <Input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Weekly Review - Batch A" className="bg-white/5 border-white/10" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Date</label>
                  <Input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Time</label>
                  <Input type="time" required value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="bg-white/5 border-white/10" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Target Type</label>
                <div className="flex gap-2">
                  <Button type="button" variant={form.type === "group" ? "default" : "outline"} className="flex-1 h-9 text-xs" onClick={() => setForm({...form, type: "group", targetId: ""})}>
                    <Users className="w-3.5 h-3.5 mr-2" /> Group
                  </Button>
                  <Button type="button" variant={form.type === "individual" ? "default" : "outline"} className="flex-1 h-9 text-xs" onClick={() => setForm({...form, type: "individual", targetId: ""})}>
                    <User className="w-3.5 h-3.5 mr-2" /> Individual
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {form.type === "group" ? "Select Group" : "Select Student"}
                </label>
                <select 
                  required 
                  className="w-full bg-white/5 border border-white/10 rounded-md p-2.5 text-sm text-white focus:border-primary outline-none transition-all"
                  value={form.targetId}
                  onChange={e => setForm({...form, targetId: e.target.value})}
                >
                  <option value="" className="bg-black">Choose...</option>
                  {form.type === "group" 
                    ? groups.map(g => <option key={g.id} value={g.id} className="bg-black">{g.name} ({g.studentIds.length} members)</option>)
                    : students.map(s => <option key={s.id} value={s.id} className="bg-black">{s.name}</option>)
                  }
                </select>
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4 h-11 font-bold">Schedule Session</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="glass-card hover:border-primary/20 transition-all group overflow-hidden border-white/5">
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                        {session.date?.toDate ? session.date.toDate().toLocaleString('default', { month: 'short' }) : '---'}
                      </span>
                      <span className="text-xl font-black text-white -mt-1">
                        {session.date?.toDate ? session.date.toDate().getDate() : '--'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors">{session.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-400" /> {session.time}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {session.type === "group" ? <Users className="w-3.5 h-3.5 text-emerald-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
                          {session.type === "group" 
                            ? groups.find(g => g.id === session.targetId)?.name || "Group" 
                            : students.find(s => s.id === session.targetId)?.name || "Individual"
                          }
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5 bg-white/5 border-white/10 text-muted-foreground">
                          {session.studentIds.length} Students
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button variant="outline" size="sm" className="h-9 px-4 border-white/10 hover:bg-primary hover:text-white transition-all" onClick={() => setSelectedSession(session)}>
                      <DollarSign className="w-4 h-4 mr-2" /> Track Payments
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeleteId(session.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <CalendarIcon className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No sessions scheduled</p>
            <p className="text-sm text-muted-foreground/60">Create your first session to start tracking attendance and payments.</p>
          </div>
        )}
      </div>

      {/* Payment Tracking Modal */}
      <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <DialogContent className="bg-[#0A0C14] border-white/10 text-white max-w-2xl backdrop-blur-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <DollarSign className="w-6 h-6 text-primary" />
              Payment Tracking
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage payments for "{selectedSession?.title}" session.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-6 space-y-4 pr-2 custom-scrollbar">
            <div className="grid gap-3">
              {selectedSession?.studentIds.map(sid => {
                const student = students.find(s => s.id === sid);
                const isPaid = selectedSession.payments[sid];
                return (
                  <div key={sid} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border",
                        isPaid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-muted-foreground"
                      )}>
                        {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{student?.name || "Unknown Student"}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{isPaid ? "Payment Completed" : "Payment Pending"}</p>
                      </div>
                    </div>

                    {isPaid ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
                        PAID
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleMarkPaid(sid, selectedSession.id)} className="bg-primary hover:bg-primary/90 text-[11px] h-8 px-3 font-bold">
                        MARK AS PAID
                      </Button>
                    )}
                  </div>
                );
              })}
              {selectedSession?.studentIds.length === 0 && (
                <div className="text-center py-10">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No students in this session.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center text-xs text-muted-foreground">
             <div className="flex gap-4">
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Paid</span>
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-white/20" /> Pending</span>
             </div>
             <Button variant="ghost" size="sm" onClick={() => setSelectedSession(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDeleteSession}
        loading={isDeleting}
        title="Delete Session"
        description="This will permanently delete this session and all associated payment logs. Students' balances will be automatically reverted. This action cannot be undone."
      />
    </div>
  );
}

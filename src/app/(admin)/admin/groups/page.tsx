"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { writeBatch, getDocs, collection, query, where, doc, deleteDoc, onSnapshot, orderBy, updateDoc, addDoc } from "firebase/firestore";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Users, Trash2, Search, CheckCircle2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  
  const [form, setForm] = useState({ name: "", studentIds: [] as string[] });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Fetch Groups
    const qGroups = query(collection(db, "groups"), orderBy("name", "asc"));
    const unsubGroups = onSnapshot(qGroups, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      setLoading(false);
    });

    // Fetch Students
    const qStudents = query(collection(db, "users"), where("role", "==", "student"));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, name: d.data().name, email: d.data().email } as Student)));
    });

    return () => {
      unsubGroups();
      unsubStudents();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      if (editingId) {
        await updateDoc(doc(db, "groups", editingId), {
          name: form.name,
          studentIds: form.studentIds
        });
      } else {
        await addDoc(collection(db, "groups"), {
          name: form.name,
          studentIds: form.studentIds
        });
      }
      setIsAddOpen(false);
      setEditingId(null);
      setForm({ name: "", studentIds: [] });
    } catch (error) {
      console.error("Error saving group:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Remove references from sessions
      const sessionsSnap = await getDocs(query(collection(db, "sessions"), where("targetId", "==", deleteId)));
      sessionsSnap.forEach(d => {
        // If it's a group session, we might want to delete it or just clear the target
        // Based on "remove group references", I'll delete the session to prevent orphans
        batch.delete(d.ref);
      });
      
      // 2. Delete the group itself
      batch.delete(doc(db, "groups", deleteId));
      
      await batch.commit();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStudent = (id: string) => {
    setForm(prev => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter(sid => sid !== id)
        : [...prev.studentIds, id]
    }));
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-10 w-32 bg-white/5" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Group Management</h1>
          <p className="text-muted-foreground">Organize students into groups for sessions.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) { setEditingId(null); setForm({ name: "", studentIds: [] }); }
        }}>
          <DialogTrigger render={
            <Button className="bg-primary hover:bg-primary/90 btn-glow">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          } />
          <DialogContent className="bg-[#0A0C14] border-white/10 text-white max-w-2xl backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingId ? "Edit Group" : "Create New Group"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Group Name</label>
                <Input 
                  required 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="e.g. Morning Batch A" 
                  className="bg-white/5 border-white/10 h-12"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Select Members ({form.studentIds.length})</label>
                  <div className="relative w-48">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input 
                      placeholder="Search students..." 
                      className="h-8 pl-7 text-xs bg-white/5 border-white/5"
                      value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto p-2 bg-black/40 rounded-xl border border-white/5 custom-scrollbar">
                  {filteredStudents.map(student => {
                    const isSelected = form.studentIds.includes(student.id);
                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => toggleStudent(student.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all text-left group/btn",
                          isSelected 
                            ? "bg-primary/20 border-primary/50 text-white" 
                            : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-white/20 group-hover/btn:border-white/40"
                        )}>
                          {isSelected && <Plus className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.name}</p>
                          <p className="text-[10px] opacity-50 truncate">{student.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-white">Cancel</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 px-8 py-2 h-auto font-semibold">
                  {editingId ? "Save Changes" : "Create Group"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Filter groups by name..." 
          className="pl-10 h-11 bg-white/5 border-white/10 focus:border-primary/50 transition-all"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
           <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
           <p className="text-lg font-medium text-muted-foreground">No groups found</p>
           <p className="text-sm text-muted-foreground/60">{searchQuery ? "Try a different search term" : "Create your first group to get started"}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <AnimatePresence>
            {filteredGroups.map((group) => (
              <motion.div
                key={group.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card p-6 flex flex-col gap-5 group/card relative overflow-hidden border-white/5 hover:border-primary/30 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-white group-hover/card:text-primary transition-colors">{group.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-semibold text-emerald-400/90">{group.studentIds.length}</span> Members Enrolled
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full" onClick={() => {
                        setEditingId(group.id);
                        setForm({ name: group.name, studentIds: group.studentIds });
                        setIsAddOpen(true);
                      }}>
                        <Info className="w-4.5 h-4.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-full" onClick={() => setDeleteId(group.id)}>
                        <Trash2 className="w-4.5 h-4.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">Member Directory</p>
                      <div className="h-px flex-1 mx-4 bg-white/5" />
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                      {group.studentIds.map(sid => {
                        const student = students.find(s => s.id === sid);
                        return (
                          <span key={sid} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 hover:border-white/20 transition-all cursor-default">
                            {student?.name || "Unknown Student"}
                          </span>
                        );
                      })}
                      {group.studentIds.length === 0 && (
                        <p className="text-xs text-muted-foreground/50 italic py-2">No students assigned to this group yet.</p>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Group"
        description="This will permanently delete this group and any associated session schedules. Student accounts will not be deleted. This action cannot be undone."
      />
    </div>
  );
}

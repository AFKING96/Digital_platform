"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Trash2, Edit2, X, Check, Search, UserPlus, UserMinus, ChevronRight, Info, Calendar, DollarSign, BookOpen } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Group {
  id: string;
  name: string;
  studentIds: string[];
  createdAt: any;
  subjectId?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  enrolledSubjects?: string[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

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
    // 1. Fetch Groups (Real-time)
    const groupsUnsubscribe = onSnapshot(collection(db, "groups"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(data);
    });

    // 2. Fetch Students (Real-time)
    const studentsUnsubscribe = onSnapshot(query(collection(db, "users"), where("role", "==", "student")), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data);
      setLoading(false);
    });

    return () => {
      groupsUnsubscribe();
      studentsUnsubscribe();
    };
  }, []); // Only on mount to establish listeners

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const id = Date.now().toString();
      await setDoc(doc(db, "groups", id), {
        name: newGroupName,
        studentIds: [],
        createdAt: serverTimestamp(),
        subjectId: selectedSubjectId
      });
      setNewGroupName("");
      setIsAdding(false);
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, "groups", id), { name: editName });
      setEditingId(null);
    } catch (error) {
      console.error("Error renaming group:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "groups", deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting group:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleStudentInGroup = async (groupId: string, studentId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    let newStudentIds = [...group.studentIds];
    if (newStudentIds.includes(studentId)) {
      newStudentIds = newStudentIds.filter(id => id !== studentId);
    } else {
      newStudentIds.push(studentId);
    }

    try {
      await updateDoc(doc(db, "groups", groupId), { studentIds: newStudentIds });
    } catch (error) {
      console.error("Error updating group members:", error);
    }
  };

  // Client-side filtering for responsiveness and index-free reliability
  const currentGroups = groups.filter(g => 
    selectedSubjectId ? g.subjectId === selectedSubjectId : !g.subjectId
  );

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectId 
      ? s.enrolledSubjects?.includes(selectedSubjectId)
      : true;
    return matchesSearch && matchesSubject;
  });

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  
  // Membership Logic
  const members = filteredStudents.filter(s => selectedGroup?.studentIds.includes(s.id));
  const available = filteredStudents.filter(s => !selectedGroup?.studentIds.includes(s.id));

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <Skeleton className="h-10 w-48 bg-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Student Groups
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Manage groups for</p>
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
        <Button onClick={() => setIsAdding(true)} className="bg-primary hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
          <Plus className="w-4 h-4 mr-2" /> New Group
        </Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
              <form onSubmit={handleCreateGroup} className="flex gap-4">
                <Input
                  placeholder="Group Name (e.g., Sunday 4 PM)"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="bg-black/50 border-white/10"
                />
                <Button type="submit">Create</Button>
                <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left Side: Active Groups */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-white/90">
              <Users className="w-5 h-5 text-primary" /> Active Groups
            </h2>
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 py-1 bg-white/5 rounded-md border border-white/10">
              {currentGroups.length} Groups
            </div>
          </div>

          <div className="grid gap-4">
            {currentGroups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              return (
                <motion.div key={group.id} layout>
                  <Card 
                    className={`group relative overflow-hidden transition-all duration-300 cursor-pointer border ${
                      isSelected 
                        ? "bg-primary/10 border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.1)]" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    {/* Visual Decor */}
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 transition-colors duration-500 ${
                      isSelected ? "bg-primary/20" : "bg-primary/5"
                    }`} />

                    <div className="p-5 flex items-center justify-between relative z-10">
                      <div className="flex-1 space-y-3">
                        {editingId === group.id ? (
                          <div className="flex gap-2">
                            <Input 
                              value={editName} 
                              onChange={e => setEditName(e.target.value)}
                              className="bg-black/50 h-9 border-primary/30"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button size="sm" className="bg-primary h-9" onClick={(e) => {
                              e.stopPropagation();
                              handleRename(group.id);
                            }}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-9" onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(null);
                            }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h3 className={`font-black text-lg transition-colors ${isSelected ? "text-primary" : "text-white"}`}>
                              {group.name}
                            </h3>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(group.id);
                                setEditName(group.name);
                              }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-bold text-muted-foreground">{group.studentIds.length} Students</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60">
                              {subjects.find(s => s.id === group.subjectId)?.name || "Legacy"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(group.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isSelected ? "text-primary translate-x-1" : "text-white/20"}`} />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            
            {currentGroups.length === 0 && (
              <div className="text-center py-20 bg-white/2 border border-dashed border-white/10 rounded-3xl">
                <Users className="w-12 h-12 text-white/5 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground font-medium">No groups found for this subject.</p>
                <Button variant="link" className="text-primary mt-2" onClick={() => setIsAdding(true)}>
                  Create your first group
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Membership Management */}
        <div className="col-span-12 lg:col-span-7">
          <AnimatePresence mode="wait">
            {selectedGroup ? (
              <motion.div
                key={selectedGroup.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Group Details Header */}
                <div className="bg-[#0B1220] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Membership Management</div>
                      <h2 className="text-3xl font-black text-white">{selectedGroup.name}</h2>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> {subjects.find(s => s.id === selectedGroup.subjectId)?.name} • {selectedGroup.studentIds.length} Members
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="px-4 py-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Capacity</div>
                        <div className="text-xl font-black text-white">{selectedGroup.studentIds.length}/30</div>
                      </div>
                      <div className="px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-center">
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Status</div>
                        <div className="text-xl font-black text-emerald-400">Active</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/5 relative z-10">
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase">Next Session</div>
                        <div className="text-xs font-bold text-white">Not Scheduled</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase">Revenue</div>
                        <div className="text-xs font-bold text-white">Tracking Active</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-2">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Info className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase">Attendance</div>
                        <div className="text-xs font-bold text-white">0% Avg</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Membership Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Available Students */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-400" /> Available Students
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-400/60 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10">
                        {available.length}
                      </span>
                    </div>
                    <Card className="bg-[#0B1220]/50 border-white/10 overflow-hidden backdrop-blur-sm">
                      <div className="p-3 border-b border-white/5">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="Find student..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-black/40 text-xs border-white/5"
                          />
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {available.length > 0 ? (
                          <div className="divide-y divide-white/5">
                            {available.map(student => (
                              <div key={student.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-white truncate">{student.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{student.email}</div>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="h-8 px-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 transition-all rounded-lg text-[10px] font-black uppercase"
                                  onClick={() => toggleStudentInGroup(selectedGroup.id, student.id)}
                                >
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center">
                            <p className="text-xs text-muted-foreground">All students enrolled.</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Group Members */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> Group Members
                      </h3>
                      <span className="text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                        {members.length}
                      </span>
                    </div>
                    <Card className="bg-[#0B1220]/50 border-white/10 overflow-hidden backdrop-blur-sm">
                      <div className="max-h-[455px] overflow-y-auto custom-scrollbar">
                        {members.length > 0 ? (
                          <div className="divide-y divide-white/5">
                            {members.map(student => (
                              <div key={student.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <div className="min-w-0">
                                  <div className="font-bold text-sm text-white truncate">{student.name}</div>
                                  <div className="text-[10px] text-muted-foreground truncate">{student.email}</div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-8 px-3 text-red-400 hover:bg-red-500/10 transition-all rounded-lg text-[10px] font-black uppercase"
                                  onClick={() => toggleStudentInGroup(selectedGroup.id, student.id)}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-20 text-center">
                            <Users className="w-10 h-10 text-white/5 mx-auto mb-3" />
                            <p className="text-xs text-muted-foreground">No members yet.</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/2 border border-dashed border-white/10 rounded-[32px]"
              >
                <div className="w-20 h-20 rounded-[28px] bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 shadow-2xl">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Select a Group</h3>
                <p className="text-muted-foreground max-w-sm text-sm">
                  Choose a group from the left panel to manage its students, track attendance, and view performance metrics.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DeleteDialog
        isOpen={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Group"
        description="This will permanently delete the group. Students will remain in the system but will no longer be part of this group."
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Users, Trash2, Edit2, X, Check, Search, UserPlus } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Group {
  id: string;
  name: string;
  studentIds: string[];
  createdAt: any;
}

interface Student {
  id: string;
  name: string;
  email: string;
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

  useEffect(() => {
    // Fetch Groups
    const groupsUnsubscribe = onSnapshot(collection(db, "groups"), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(data);
    });

    // Fetch Students
    const studentsQuery = query(collection(db, "users"), where("role", "==", "student"));
    const studentsUnsubscribe = onSnapshot(studentsQuery, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data);
      setLoading(false);
    });

    return () => {
      groupsUnsubscribe();
      studentsUnsubscribe();
    };
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const id = Date.now().toString();
      await setDoc(doc(db, "groups", id), {
        name: newGroupName,
        studentIds: [],
        createdAt: serverTimestamp()
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

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Student Groups
          </h1>
          <p className="text-muted-foreground mt-1">Organize students into batches for easier management</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Groups List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Active Groups
          </h2>
          <div className="grid gap-4">
            {groups.map((group) => (
              <motion.div key={group.id} layout>
                <Card className="p-5 bg-white/5 border-white/10 hover:border-primary/30 transition-all group overflow-hidden relative">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex-1">
                      {editingId === group.id ? (
                        <div className="flex gap-2">
                          <Input 
                            value={editName} 
                            onChange={e => setEditName(e.target.value)}
                            className="bg-black/50 h-8"
                          />
                          <Button size="sm" onClick={() => handleRename(group.id)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-lg">{group.name}</h3>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                            setEditingId(group.id);
                            setEditName(group.name);
                          }}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        {group.studentIds.length} Students assigned
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => setDeleteId(group.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.studentIds.slice(0, 5).map(sid => {
                      const s = students.find(st => st.id === sid);
                      return s ? (
                        <span key={sid} className="px-2 py-1 bg-primary/10 text-primary text-[10px] rounded-full border border-primary/20">
                          {s.name}
                        </span>
                      ) : null;
                    })}
                    {group.studentIds.length > 5 && (
                      <span className="px-2 py-1 bg-white/5 text-muted-foreground text-[10px] rounded-full border border-white/10">
                        +{group.studentIds.length - 5} more
                      </span>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
            {groups.length === 0 && (
              <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-3xl">
                <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <p className="text-muted-foreground">No groups created yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Membership Management */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" /> Manage Membership
            </h2>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search students..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-8 bg-white/5 text-xs"
              />
            </div>
          </div>

          <Card className="bg-white/5 border-white/10 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Student</th>
                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground uppercase">Groups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {groups.map(group => {
                            const isMember = group.studentIds.includes(student.id);
                            return (
                              <button
                                key={group.id}
                                onClick={() => toggleStudentInGroup(group.id, student.id)}
                                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                                  isMember 
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                    : "bg-white/5 text-muted-foreground border border-white/10 hover:border-white/20"
                                }`}
                              >
                                {group.name}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
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

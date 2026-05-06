"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Trash2, Send, Users, User, CheckCircle2, Search } from "lucide-react";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: any;
  userName?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [targetType, setTargetType] = useState<"all" | "individual">("all");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [message, setMessage] = useState("");
  const [students, setStudents] = useState<{id: string, name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setLoading(true); // Temporarily true to fetch names
      fetchUserNames(data);
    });

    const fetchStudents = async () => {
      const qS = query(collection(db, "users"), where("role", "==", "student"));
      const snap = await getDocs(qS);
      setStudents(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    };

    fetchStudents();
    return () => unsubscribe();
  }, []);

  const fetchUserNames = async (notifs: Notification[]) => {
    const userIds = Array.from(new Set(notifs.map(n => n.userId)));
    const names: Record<string, string> = {};
    
    for (const uid of userIds) {
      if (!uid) continue;
      const uDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
      if (!uDoc.empty) {
        names[uid] = uDoc.docs[0].data().name;
      }
    }

    setNotifications(prev => prev.map(n => ({ ...n, userName: names[n.userId] || "Unknown Student" })));
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (targetType === "individual" && !selectedStudent) return alert("Please select a student.");

    setIsSending(true);
    try {
      if (targetType === "all") {
        const studentSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
        for (const sDoc of studentSnap.docs) {
          await addDoc(collection(db, "notifications"), {
            userId: sDoc.id,
            message,
            type: "admin",
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, "notifications"), {
          userId: selectedStudent,
          message,
          type: "admin",
          read: false,
          createdAt: serverTimestamp()
        });
      }
      setMessage("");
      alert("Notification sent successfully!");
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "notifications", deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting notification:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredNotifs = notifications.filter(n => 
    n.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.userName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10 max-w-6xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Center</h1>
          <p className="text-muted-foreground">Send system alerts and manage student communications.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Send Notification Section */}
        <div className="lg:col-span-1">
          <Card className="glass-card p-6 border-primary/20 sticky top-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> New Alert
            </h2>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Recipient Type</label>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant={targetType === "all" ? "default" : "outline"}
                    className="flex-1 text-xs"
                    onClick={() => setTargetType("all")}
                  >
                    <Users className="w-3 h-3 mr-1" /> All Students
                  </Button>
                  <Button 
                    type="button"
                    variant={targetType === "individual" ? "default" : "outline"}
                    className="flex-1 text-xs"
                    onClick={() => setTargetType("individual")}
                  >
                    <User className="w-3 h-3 mr-1" /> Individual
                  </Button>
                </div>
              </div>

              {targetType === "individual" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                  <label className="text-sm font-medium text-muted-foreground">Select Student</label>
                  <Select value={selectedStudent} onValueChange={(val) => setSelectedStudent(val || "")}>
                    <SelectTrigger className="bg-black/30 border-white/10">
                      <SelectValue placeholder="Choose student..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {students.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Message Content</label>
                <Textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="bg-black/30 border-white/10 min-h-[120px] focus:border-primary/50"
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 btn-glow" disabled={isSending}>
                {isSending ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Notification</>}
              </Button>
            </form>
          </Card>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
            <Search className="w-4 h-4 text-muted-foreground ml-2" />
            <input 
              type="text" 
              placeholder="Search notifications or students..." 
              className="bg-transparent border-none outline-none text-sm w-full text-white"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredNotifs.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="glass-card p-4 border-white/5 hover:bg-white/5 transition-colors flex justify-between items-start gap-4">
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${n.read ? 'bg-white/5 text-muted-foreground' : 'bg-primary/20 text-primary animate-pulse'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">{n.type}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : "Recently"}</span>
                        </div>
                        <p className="text-sm text-white font-medium">{n.message}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                          <span className="text-[10px] text-muted-foreground">To: <span className="text-white">{n.userName || "Loading..."}</span></span>
                          {n.read && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 ml-2">
                              <CheckCircle2 className="w-3 h-3" /> Seen
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      onClick={() => setDeleteId(n.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredNotifs.length === 0 && (
              <div className="text-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-2xl">
                <Bell className="w-10 h-10 mx-auto mb-4 opacity-20" />
                <p>No notifications found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Remove Notification"
        description="This will delete the notification from the student's dashboard. This action cannot be undone."
      />
    </div>
  );
}

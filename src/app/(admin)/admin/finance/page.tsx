"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Save, Edit2, TrendingUp, AlertCircle, Trash2, Clock, Calendar } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { deleteDoc, orderBy as fireOrderBy, serverTimestamp, getDocs } from "firebase/firestore";

interface StudentFinance {
  id: string;
  name: string;
  paid: number;
  remaining: number;
}

export default function FinancePage() {
  const [students, setStudents] = useState<StudentFinance[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ paid: 0, remaining: 0 });
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: StudentFinance[] = [];
      snapshot.forEach((doc) => {
        data.push({ 
          id: doc.id, 
          name: doc.data().name,
          paid: doc.data().paid || 0,
          remaining: doc.data().remaining || 0
        });
      });
      setStudents(data);
    });

    const qLogs = query(collection(db, "payment_logs"), fireOrderBy("date", "desc"));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPaymentLogs(logs);
      setLoadingLogs(false);
    });

    return () => {
      unsubscribe();
      unsubscribeLogs();
    };
  }, []);

  const handleDeleteLog = async () => {
    if (!deleteLogId) return;
    setIsDeletingLog(true);
    try {
      await deleteDoc(doc(db, "payment_logs", deleteLogId));
      setDeleteLogId(null);
    } catch (error) {
      console.error("Error deleting log:", error);
    } finally {
      setIsDeletingLog(false);
    }
  };

  const handleEdit = (student: StudentFinance) => {
    setEditingId(student.id);
    setEditForm({ paid: student.paid, remaining: student.remaining });
  };

  const handleSave = async (id: string) => {
    try {
      await updateDoc(doc(db, "users", id), {
        paid: Number(editForm.paid),
        remaining: Number(editForm.remaining)
      });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating finance:", error);
    }
  };

  const totalPaid = students.reduce((acc, curr) => acc + (curr.paid || 0), 0);
  const totalRemaining = students.reduce((acc, curr) => acc + (curr.remaining || 0), 0);
  
  // Chart Data
  const chartData = [
    { name: "Collected Revenue", value: totalPaid, color: "#10b981" },
    { name: "Outstanding Balances", value: totalRemaining, color: "#ef4444" },
  ];

  const getStatusBadge = (paid: number, remaining: number) => {
    if (remaining === 0 && paid > 0) return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Fully Paid</Badge>;
    if (paid > 0 && remaining > 0) return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Partial Payment</Badge>;
    if (paid === 0) return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Unpaid</Badge>;
    return <Badge variant="outline">Unknown</Badge>;
  };

  return (
    <div className="space-y-6 max-w-6xl pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Dashboard</h1>
        <p className="text-muted-foreground">Real-time revenue tracking and student balances.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="glass-card p-6 flex flex-col justify-between h-40 border-emerald-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</h3>
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-emerald-400 relative z-10">${totalPaid.toLocaleString()}</div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass-card p-6 flex flex-col justify-between h-40 border-red-500/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-xl group-hover:bg-red-500/20 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Outstanding</h3>
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
            </div>
            <div className="text-4xl font-bold text-red-400 relative z-10">${totalRemaining.toLocaleString()}</div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="glass-card p-4 h-40 flex items-center justify-center relative overflow-hidden group hover:scale-[1.02] transition-transform">
             {totalPaid > 0 || totalRemaining > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#040810", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
               <div className="text-muted-foreground text-sm">No financial data yet.</div>
             )}
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="glass-card overflow-hidden border-white/5">
          <div className="bg-white/5 px-6 py-4 border-b border-white/5">
            <h2 className="text-lg font-bold">Student Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-muted-foreground uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Student Name</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Paid Amount</th>
                  <th className="px-6 py-4 font-medium">Remaining Balance</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {students.map(student => (
                  <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      {student.name}
                    </td>
                    
                    <td className="px-6 py-4">
                      {getStatusBadge(student.paid, student.remaining)}
                    </td>

                    <td className="px-6 py-4">
                      {editingId === student.id ? (
                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">$</span>
                          <Input type="number" value={editForm.paid} onChange={e => setEditForm({...editForm, paid: Number(e.target.value)})} className="w-24 bg-black/50 h-8 border-emerald-500/30 focus:border-emerald-500" />
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-semibold">${student.paid}</span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      {editingId === student.id ? (
                        <div className="flex items-center">
                          <span className="text-muted-foreground mr-2">$</span>
                          <Input type="number" value={editForm.remaining} onChange={e => setEditForm({...editForm, remaining: Number(e.target.value)})} className="w-24 bg-black/50 h-8 border-red-500/30 focus:border-red-500" />
                        </div>
                      ) : (
                        <span className={student.remaining > 0 ? "text-red-400 font-semibold" : "text-muted-foreground"}>
                          ${student.remaining}
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      {editingId === student.id ? (
                        <Button size="sm" onClick={() => handleSave(student.id)} className="bg-primary hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                          <Save className="w-4 h-4 mr-2" /> Save
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(student)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit2 className="w-4 h-4 mr-2" /> Update
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">No student records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card overflow-hidden border-white/5">
          <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-lg font-bold">Recent Payment History</h2>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/20 text-muted-foreground uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Student</th>
                  <th className="px-6 py-4 font-medium">Session</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paymentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white">{log.studentName}</td>
                    <td className="px-6 py-4 text-muted-foreground">{log.sessionTitle || "Manual Entry"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {log.date?.toDate ? log.date.toDate().toLocaleDateString() : "---"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-400 font-bold">+${log.amount}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setDeleteLogId(log.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {paymentLogs.length === 0 && !loadingLogs && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">No payment logs recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <DeleteDialog 
        isOpen={!!deleteLogId} 
        onOpenChange={(open) => !open && setDeleteLogId(null)} 
        onConfirm={handleDeleteLog}
        loading={isDeletingLog}
        title="Delete Payment Log"
        description="This will permanently delete this payment record from history. It will NOT update the student's total balance automatically. This action cannot be undone."
      />
    </div>
  );
}

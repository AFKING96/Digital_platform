"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Clock, Target, User, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AtRiskStudent {
  id: string;
  name: string;
  email: string;
  accuracy: number;
  lastActiveDate: import("firebase/firestore").Timestamp;
  reasons: string[];
}

export default function AtRiskPage() {
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAtRisk = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "student"));
        const snap = await getDocs(q);
        
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const atRisk: AtRiskStudent[] = [];

        snap.docs.forEach(doc => {
          const data = doc.data();
          const reasons = [];
          
          if (data.accuracy < 50) {
            reasons.push("Low accuracy (< 50%)");
          }
          
          const lastActive = data.lastActiveDate?.toDate() || new Date(0);
          if (lastActive < threeDaysAgo) {
            reasons.push("Inactive for over 3 days");
          }

          if (reasons.length > 0) {
            atRisk.push({
              id: doc.id,
              name: data.name,
              email: data.email,
              accuracy: data.accuracy || 0,
              lastActiveDate: data.lastActiveDate,
              reasons
            } as AtRiskStudent);
          }
        });

        setStudents(atRisk);
      } catch (error) {
        console.error("Error fetching at-risk students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAtRisk();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="w-6 h-6" />
          <h1 className="text-3xl font-bold tracking-tight text-white">Weak Student Detection</h1>
        </div>
        <p className="text-muted-foreground">Identifying students who need extra support or intervention.</p>
      </div>

      {students.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Great! No students are currently flagged as &quot;at risk&quot;.</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <AnimatePresence>
            {students.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass-card p-6 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white">{student.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {student.email}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <MessageSquare className="w-4 h-4 mr-2" /> Contact
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Target className="w-3 h-3" /> Accuracy
                      </div>
                      <div className={`text-xl font-bold ${student.accuracy < 50 ? 'text-red-400' : 'text-yellow-400'}`}>
                        {student.accuracy}%
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3" /> Last Active
                      </div>
                      <div className="text-sm font-medium text-white">
                        {student.lastActiveDate?.toDate().toLocaleDateString() || "Never"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase text-red-400/70 tracking-widest mb-2">Flagged Reasons:</p>
                    <div className="flex flex-wrap gap-2">
                      {student.reasons.map((reason, i) => (
                        <span key={i} className="bg-red-500/20 text-red-400 text-[10px] px-2.5 py-1 rounded-full border border-red-500/30">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

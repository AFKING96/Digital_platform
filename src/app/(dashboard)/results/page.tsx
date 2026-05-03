"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Trophy, AlertCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Submission {
  id: string;
  lessonId: number;
  score: number | null;
  status: string;
  feedback: string;
  submittedAt: string;
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!auth.currentUser) return;
      
      try {
        const subsQuery = query(
          collection(db, "submissions"), 
          where("userId", "==", auth.currentUser.uid)
        );
        const subsSnap = await getDocs(subsQuery);
        
        const subsData = subsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Submission[];
        
        // Sort by submittedAt descending manually since we didn't index it
        subsData.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        
        setSubmissions(subsData);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 max-w-5xl mx-auto">
      {statusParam === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-green-400 mb-8"
        >
          <div className="bg-green-500/20 p-3 rounded-full">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Submitted Successfully!</h3>
            <p className="text-green-400/80 mt-1">Your answers have been recorded and are waiting for review by your instructor.</p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Your Results</h1>
        <p className="text-muted-foreground">Track your performance and review instructor feedback.</p>
      </div>

      {submissions.length === 0 ? (
        <Card className="glass-card text-center p-12">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-white mb-2">No Submissions Yet</h3>
          <p className="text-muted-foreground mb-6">Complete a practice module to see your results here.</p>
          <Link href="/dashboard">
            <Button className="bg-primary hover:bg-primary/90 text-white btn-glow">
              Go to Dashboard
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {submissions.map((sub, index) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="glass-card p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      Module {sub.lessonId}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {sub.status === 'pending' || sub.status === 'waiting' ? (
                    <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 px-4 py-3 rounded-xl border border-yellow-400/20 w-fit">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Waiting for review</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-1">Score</p>
                        <p className="text-3xl font-bold text-white">{sub.score}<span className="text-lg text-white/50">%</span></p>
                      </div>
                      
                      {sub.feedback && (
                        <div className="flex-1 bg-white/5 p-4 rounded-xl border border-white/10 flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm text-white/80">{sub.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {sub.status !== 'pending' && sub.status !== 'waiting' && (
                  <Button variant="outline" className="shrink-0 bg-white/5 border-white/10 hover:bg-white/10">
                    View Details
                  </Button>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

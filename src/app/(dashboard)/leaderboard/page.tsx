"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Crown, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardUser {
  id: string;
  name: string;
  points: number;
  streak: number;
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const q = query(
          collection(db, "users"),
          orderBy("points", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as LeaderboardUser[];
        setUsers(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <div className="space-y-4">
          <Skeleton className="h-10 w-48 bg-white/5" />
          <Skeleton className="h-4 w-64 bg-white/5" />
        </div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-muted-foreground">Compete with your peers and climb the ranks!</p>
      </div>

      <div className="grid gap-6">
        {users.map((user, index) => {
          const isTopThree = index < 3;
          const Icon = index === 0 ? Crown : index === 1 ? Medal : index === 2 ? Medal : Star;
          const iconColor = index === 0 ? "text-yellow-400" : index === 1 ? "text-gray-300" : index === 2 ? "text-amber-600" : "text-primary/40";

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`glass-card p-4 flex items-center justify-between border-white/5 hover:border-primary/30 transition-all ${isTopThree ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-6">
                  <div className={`w-8 text-xl font-bold ${isTopThree ? 'text-primary' : 'text-muted-foreground'}`}>
                    #{index + 1}
                  </div>
                  
                  <Avatar className="h-12 w-12 border-2 border-white/10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{user.name}</span>
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-yellow-500/60" />
                        {user.points || 0} pts
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-orange-500/60" />
                        {user.streak || 0} day streak
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="h-2 w-32 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (user.points / (users[0]?.points || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

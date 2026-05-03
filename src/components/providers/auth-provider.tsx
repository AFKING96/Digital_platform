"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface PerformanceEntry {
  lessonId: number;
  type: "mcq" | "true_false" | "essay";
  correct: number;
  wrong: number;
}

interface UserData {
  name: string;
  email: string;
  role: string;
  currentLesson: number;
  solvedQuestions: number;
  accuracy: number;
  performance?: PerformanceEntry[];
  points?: number;
  streak?: number;
  lastActiveDate?: import("firebase/firestore").Timestamp;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const data = userDocSnap.data() as UserData;
            setUserData(data);

            // 🎮 GAMIFICATION: Streak & LastActive Logic
            const now = new Date();
            const lastActive = data.lastActiveDate?.toDate?.() || new Date(0);
            const isNewDay = now.toDateString() !== lastActive.toDateString();
            
            if (isNewDay) {
               const newStreak = (data.streak || 0) + 1;
               await updateDoc(userDocRef, {
                 streak: newStreak,
                 lastActiveDate: serverTimestamp()
               });
            } else {
               await updateDoc(userDocRef, {
                 lastActiveDate: serverTimestamp()
               });
            }
          }
        } catch (error) {
          console.error("Error fetching/updating user data:", error);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = userData?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

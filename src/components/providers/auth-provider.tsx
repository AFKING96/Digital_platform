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
  universityId?: string;
  currentLesson: number;
  solvedQuestions: number;
  accuracy: number;
  performance?: PerformanceEntry[];
  points?: number;
  streak?: number;
  lastActiveDate?: any;
  unlockedLessons?: number[];
  enrolledSubjects?: string[];
  savedQuestions?: string[];
  completedLessons?: number[];
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
            setLoading(false); // Render the app immediately

            // 🎮 GAMIFICATION: Streak & LastActive Logic (Run in background)
            const updateGamification = async () => {
              try {
                const now = new Date();
                let lastActive: Date;
                if (data.lastActiveDate && typeof (data.lastActiveDate as any).toDate === 'function') {
                  lastActive = (data.lastActiveDate as any).toDate();
                } else if (typeof data.lastActiveDate === 'string') {
                  lastActive = new Date(data.lastActiveDate);
                } else {
                  lastActive = new Date(0);
                }
                
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
              } catch (e) {
                console.error("Background gamification update failed:", e);
              }
            };
            
            updateGamification();
          } else {
            setLoading(false);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
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

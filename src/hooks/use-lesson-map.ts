import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface LessonInfo {
  id: number;
  title: string;
  order: number;
  subjectId?: string;
}

export function useLessonMap() {
  const [lessonMap, setLessonMap] = useState<Record<number, LessonInfo>>({});
  const [lessons, setLessons] = useState<LessonInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "lessons"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => doc.data() as LessonInfo);
      
      const mapping: Record<number, LessonInfo> = {};
      data.forEach(l => {
        mapping[l.id] = l;
      });
      
      setLessons(data);
      setLessonMap(mapping);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching lesson map:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getLessonTitle = (id: number | null | undefined, fallback = "Unknown Lesson") => {
    if (id == null) return fallback;
    return lessonMap[id]?.title || fallback;
  };

  const getLessonOrder = (id: number | null | undefined, fallback = 0) => {
    if (id == null) return fallback;
    return lessonMap[id]?.order || fallback;
  };

  const isLessonUnlocked = (
    id: number | null | undefined, 
    unlockedList: number[] = [], 
    enrolledSubjects: string[] = [],
    isAdmin = false
  ) => {
    if (isAdmin) return true;
    if (id == null) return false;
    
    const lesson = lessonMap[id];
    if (!lesson) return false;

    const isUnlocked = unlockedList.includes(id);
    const isEnrolled = !lesson.subjectId || enrolledSubjects.includes(lesson.subjectId);

    return isUnlocked && isEnrolled;
  };

  return { lessonMap, lessons, loading, getLessonTitle, getLessonOrder, isLessonUnlocked };
}

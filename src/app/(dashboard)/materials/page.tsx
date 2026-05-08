"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, File, ExternalLink, BookOpen, Search, ChevronRight, Layout, Download, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FileCard, type FormatFileProps } from "@/components/ui/file-card-collections";

interface MaterialCollection {
  id: string;
  name: string;
}

interface Material {
  id: string;
  title: string;
  path: string;
  collectionId: string;
  fileType?: string;
  lessonId?: number | null;
}

interface Lesson {
  id: number;
  isUnlocked?: boolean;
}

const getFormat = (type: string | undefined | null): FormatFileProps => {
  if (!type) return "pdf";
  const t = type.toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("doc")) return "doc";
  if (t.includes("xls") || t.includes("excel")) return "xls";
  if (t.includes("ppt") || t.includes("powerpoint")) return "ppt";
  if (t.includes("image") || t.includes("png") || t.includes("jpg")) return "img";
  if (t.includes("video") || t.includes("mp4")) return "video";
  if (t.includes("zip") || t.includes("rar")) return "zip";
  if (t.includes("code") || t.includes("js") || t.includes("tsx")) return "code";
  if (t.includes("txt")) return "txt";
  return "pdf"; // Default to pdf look as it's most common for materials
};

export default function MaterialsStudentPage() {
  const [collections, setCollections] = useState<MaterialCollection[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCol, setSelectedCol] = useState<string | "all">("all");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { auth } = await import("@/lib/firebase");
      if (auth.currentUser) {
        const userDoc = await getDocs(query(collection(db, "users"), where("__name__", "==", auth.currentUser.uid)));
        if (!userDoc.empty) {
          setEnrolledSubjects(userDoc.docs[0].data().enrolledSubjects || []);
        }
      }
    };
    fetchUser();
    // Fetch Collections
    const unsubCol = onSnapshot(query(collection(db, "material_collections"), orderBy("createdAt", "desc")), (snap) => {
      setCollections(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaterialCollection)));
    });

    // Fetch Materials
    const unsubMat = onSnapshot(collection(db, "materials"), (snap) => {
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Material)));
      setLoading(false);
    });

    // Fetch Lessons
    const unsubLessons = onSnapshot(collection(db, "lessons"), (snap) => {
      setLessons(snap.docs.map(d => d.data() as Lesson));
    });

    return () => {
      unsubCol();
      unsubMat();
      unsubLessons();
    };
  }, []);

  const filteredMaterials = materials.filter(m => {
    // Check if lesson is locked
    if (m.lessonId) {
      const lesson = lessons.find(l => l.id === m.lessonId);
      if (lesson && lesson.isUnlocked === false) return false;
      
      // Check subject enrollment if lesson has subjectId
      if (lesson && (lesson as any).subjectId) {
        if (!enrolledSubjects.includes((lesson as any).subjectId)) return false;
      }
    } else if ((m as any).subjectId) {
      // Direct subject material
      if (!enrolledSubjects.includes((m as any).subjectId)) return false;
    }
    
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCol = selectedCol === "all" || m.collectionId === selectedCol;
    return matchesSearch && matchesCol;
  });

  if (loading) return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <Skeleton className="h-12 w-64 bg-white/5" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 bg-white/5 rounded-xl" />)}
        </div>
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
            Study Resources
          </h1>
          <p className="text-muted-foreground">Access all materials, lecture notes, and supporting documents.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search materials..." 
            className="pl-10 bg-white/5 border-white/10 h-12 rounded-2xl"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Categories Sidebar */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">Collections</h2>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setSelectedCol("all")}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold border",
                  selectedCol === "all" ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground hover:bg-white/5 border-transparent"
                )}
              >
                <Layout className="w-4 h-4" /> All Materials
              </button>
              {collections.map(col => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCol(col.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm font-bold border",
                    selectedCol === col.id ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground hover:bg-white/5 border-transparent"
                  )}
                >
                  <Folder className={cn("w-4 h-4", selectedCol === col.id ? "text-primary" : "text-muted-foreground")} />
                  {col.name}
                  <span className="ml-auto text-[10px] opacity-40">{materials.filter(m => m.collectionId === col.id).length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Materials Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredMaterials.map((mat, idx) => (
                <motion.div
                  key={mat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <a href={mat.path} target="_blank" rel="noopener noreferrer" className="block h-full">
                    <Card className="p-5 bg-white/5 border-white/10 hover:border-primary/50 transition-all group h-full relative overflow-hidden flex items-center gap-4">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <File className="w-20 h-20" />
                      </div>
                      
                      <div className="shrink-0 scale-110">
                        <FileCard 
                          formatFile={getFormat(mat.fileType)} 
                          className="shadow-[0_0_20px_rgba(255,255,255,0.05)] group-hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] transition-all"
                        />
                      </div>

                      <div className="flex-1 min-w-0 relative z-10 ml-2">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">{mat.title}</h3>
                          {mat.lessonId && (
                            <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              L{mat.lessonId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{mat.fileType}</span>
                          <span className="text-[10px] text-muted-foreground/30">•</span>
                          <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-widest">
                             Open Resource <ExternalLink className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                        <ChevronRight className="w-5 h-5 text-primary" />
                      </div>
                    </Card>
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredMaterials.length === 0 && (
            <div className="text-center py-32 border-2 border-dashed border-white/5 rounded-[40px] bg-white/[0.02]">
              <BookOpen className="w-16 h-16 text-white/5 mx-auto mb-4" />
              <h3 className="text-xl font-bold">No Materials Found</h3>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">Try adjusting your search or selecting a different collection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

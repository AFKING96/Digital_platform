"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { HighlightCard } from "@/components/ui/highlight-card";
import { FileCard } from "@/components/ui/file-card-collections";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, File, ExternalLink, UploadCloud, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { type FormatFileProps } from "@/components/ui/file-card-collections";

interface Material {
  id: string;
  title: string;
  path: string;
  lessonId: number;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ title: "", lessonId: 1 });
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "materials"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Material[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Material);
      });
      setMaterials(data);
    });
    return () => unsubscribe();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFileToUpload(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    maxFiles: 1,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload) return alert("Please select a file to upload.");
    
    setUploading(true);
    try {
      // 1. Upload to local API
      const formData = new FormData();
      formData.append("file", fileToUpload);
      
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) {
        throw new Error(uploadData.error);
      }

      // 2. Save metadata to Firestore
      const newId = Date.now().toString();
      await setDoc(doc(db, "materials", newId), {
        title: form.title,
        path: uploadData.path,
        lessonId: Number(form.lessonId)
      });
      
      setIsAdding(false);
      setForm({ title: "", lessonId: 1 });
      setFileToUpload(null);
    } catch (error) {
      console.error("Error saving material:", error);
      alert("Error uploading file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "materials", deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">Upload resources directly to the server.</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="bg-primary hover:bg-primary/90 btn-glow transition-all hover:scale-105">
          <Plus className="w-4 h-4 mr-2" /> Upload Material
        </Button>
      </div>

      {isAdding && (
        <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: "auto", y: 0 }}>
          <Card className="glass-card p-6 border-primary/20 bg-[#040810]/80">
            <h2 className="text-xl font-bold mb-4">Add New Resource</h2>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Document Title</label>
                  <Input placeholder="e.g. Chapter 1 Slides" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="bg-black/30 border-white/10 focus:border-primary/50 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Assigned Module ID</label>
                  <Input type="number" placeholder="Module 1" value={form.lessonId} onChange={e => setForm({...form, lessonId: Number(e.target.value)})} required className="bg-black/30 border-white/10 focus:border-primary/50 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">File Upload</label>
                <div 
                  {...getRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                    ${isDragActive ? "border-primary bg-primary/10" : "border-white/10 bg-black/20 hover:border-white/30 hover:bg-black/40"}
                  `}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
                  {fileToUpload ? (
                    <p className="text-primary font-medium">{fileToUpload.name}</p>
                  ) : isDragActive ? (
                    <p className="text-primary">Drop the file here ...</p>
                  ) : (
                    <p className="text-muted-foreground">Drag &apos;n&apos; drop a file here, or click to select a file</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setFileToUpload(null); }}>Cancel</Button>
                <Button type="submit" disabled={uploading || !fileToUpload} className="bg-primary hover:bg-primary/90">
                  {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</> : "Save Resource"}
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {materials.map((mat) => (
          <HighlightCard key={mat.id} glowColor="from-blue-500/10 to-transparent">
            <div className="flex items-center gap-4 relative z-10">
              <div className="scale-75 origin-left">
                <FileCard formatFile={(mat.path.split('.').pop()?.toLowerCase() as FormatFileProps) || 'pdf'} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white leading-none">{mat.title}</h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">Mod {mat.lessonId}</span>
                </div>
                <a href={mat.path} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  Preview Document <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="relative z-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => setDeleteId(mat.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </HighlightCard>
        ))}
        {materials.length === 0 && !isAdding && (
          <div className="col-span-2 text-center py-16 text-muted-foreground border border-dashed border-white/10 rounded-xl bg-black/20">
            <UploadCloud className="w-12 h-12 mx-auto text-white/20 mb-4" />
            <p>No materials uploaded yet.</p>
          </div>
        )}
      </div>

      <DeleteDialog 
        isOpen={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)} 
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Material"
        description="This will permanently remove this resource from the module. Note: This only removes the database entry, the actual file will remain on the server."
      />
    </div>
  );
}

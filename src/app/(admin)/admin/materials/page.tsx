"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, orderBy, where, writeBatch, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Folder, File, ExternalLink, UploadCloud, Loader2, ChevronRight, Layout, Search, X, Check } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCard, type FormatFileProps } from "@/components/ui/file-card-collections";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  return "pdf";
};

interface MaterialCollection {
  id: string;
  name: string;
  createdAt: any;
}

interface Material {
  id: string;
  title: string;
  path: string;
  collectionId: string;
  lessonId?: number | null;
  fileType?: string;
  createdAt: any;
  subjectId?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Lesson {
  id: number;
  title: string;
}

export default function MaterialsPage() {
  const [collections, setCollections] = useState<MaterialCollection[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
  const [editCollectionName, setEditCollectionName] = useState("");
  
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: "", lessonId: "" as any, link: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'collection' | 'material' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "subjects"), orderBy("name", "asc")), (snap) => {
      const sData = snap.docs.map(d => ({ id: d.id, name: d.data().name }));
      setSubjects(sData);
      if (sData.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(sData[0].id);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Fetch Collections
    let qCol;
    if (selectedSubjectId) {
      // Query with subjectId filter (remove orderBy to avoid index requirement)
      qCol = query(collection(db, "material_collections"), where("subjectId", "==", selectedSubjectId));
    } else {
      qCol = query(collection(db, "material_collections"), orderBy("createdAt", "desc"));
    }

    const unsubCollections = onSnapshot(qCol, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MaterialCollection));
      
      // Client-side sort if filtered by subject (since we removed orderBy)
      if (selectedSubjectId) {
        data.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
      }
      
      // If legacy view, only show those without subjectId
      setCollections(selectedSubjectId ? data : data.filter(c => !(c as any).subjectId));
    });

    // Fetch Materials
    const unsubMaterials = onSnapshot(collection(db, "materials"), (snap) => {
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Material)));
    });

    // Fetch Lessons
    let qLessons;
    if (selectedSubjectId) {
      // Remove orderBy to avoid index
      qLessons = query(collection(db, "lessons"), where("subjectId", "==", selectedSubjectId));
    } else {
      qLessons = query(collection(db, "lessons"), orderBy("order", "asc"));
    }

    const unsubLessons = onSnapshot(qLessons, (snap) => {
      let data = snap.docs.map(d => ({ 
        id: d.data().id, 
        title: d.data().title, 
        subjectId: d.data().subjectId,
        order: d.data().order || 0 
      }));
      
      // Client-side sort
      if (selectedSubjectId) {
        data.sort((a, b) => a.order - b.order);
      }

      setLessons(selectedSubjectId ? data : data.filter(l => !l.subjectId));
      setLoading(false);
    });

    return () => {
      unsubCollections();
      unsubMaterials();
      unsubLessons();
    };
  }, [selectedSubjectId]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, "material_collections", id), {
        name: newCollectionName,
        createdAt: serverTimestamp(),
        subjectId: selectedSubjectId
      });
      setNewCollectionName("");
      setIsAddingCollection(false);
    } catch (e) { console.error(e); }
  };

  const handleRenameCollection = async (id: string) => {
    if (!editCollectionName.trim()) return;
    try {
      await updateDoc(doc(db, "material_collections", id), { name: editCollectionName });
      setEditingCollectionId(null);
    } catch (e) { console.error(e); }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFileToUpload(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles: 1 });

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollectionId || uploading) return;
    
    // Validate inputs early
    if (!materialForm.title.trim()) {
      toast.error("Please provide a title for the material.");
      return;
    }

    if (!fileToUpload && !materialForm.link.trim()) {
      toast.error("Please either upload a file or provide an external link.");
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      let finalPath = "";
      let fileExt = "link";

      // Case 1: File Upload (Prioritized)
      if (fileToUpload) {
        fileExt = fileToUpload.name.split('.').pop()?.toLowerCase() || 'file';
        const sanitizedName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `materials/${Date.now()}-${sanitizedName}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

        finalPath = await new Promise((resolve, reject) => {
          const unsub = uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => {
              console.error("Firebase Storage Error:", error);
              unsub();
              reject(new Error(`Storage error: ${error.message}`));
            }, 
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                unsub();
                resolve(downloadURL);
              } catch (err: any) {
                reject(new Error(`Failed to get download URL: ${err.message}`));
              }
            }
          );
        });
      } else {
        // Case 2: External Link
        finalPath = materialForm.link.trim();
        fileExt = "link";
      }

      // Final check
      if (!finalPath) throw new Error("Could not determine file path.");

      // Prepare metadata
      const materialData = {
        title: materialForm.title.trim(),
        path: finalPath,
        collectionId: selectedCollectionId,
        lessonId: materialForm.lessonId ? Number(materialForm.lessonId) : null,
        fileType: fileExt,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        subjectId: selectedSubjectId || null,
        uploadedBy: "admin" // For audit trail
      };

      // Write to Firestore - use addDoc for reliability
      const matRef = collection(db, "materials");
      await addDoc(matRef, materialData);

      // Success sequence
      toast.success("Material added successfully!");
      setIsAddingMaterial(false);
      setMaterialForm({ title: "", lessonId: "", link: "" });
      setFileToUpload(null);
      setUploadProgress(0);
      
    } catch (error: any) {
      console.error("Material Upload Critical Failure:", error);
      toast.error(error.message || "A network error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'collection') {
        const batch = writeBatch(db);
        const matsToDelete = materials.filter(m => m.collectionId === deleteTarget.id);
        for (const m of matsToDelete) {
          batch.delete(doc(db, "materials", m.id));
          // Delete from storage if it's a firebase storage URL
          if (m.path.includes('firebasestorage.googleapis.com')) {
            try {
              const storageRef = ref(storage, m.path);
              await deleteObject(storageRef);
            } catch (err) { console.error("Error deleting file from storage:", err); }
          }
        }
        batch.delete(doc(db, "material_collections", deleteTarget.id));
        await batch.commit();
        if (selectedCollectionId === deleteTarget.id) setSelectedCollectionId(null);
      } else {
        const mat = materials.find(m => m.id === deleteTarget.id);
        if (mat?.path.includes('firebasestorage.googleapis.com')) {
          try {
            const storageRef = ref(storage, mat.path);
            await deleteObject(storageRef);
          } catch (err) { console.error("Error deleting file from storage:", err); }
        }
        await deleteDoc(doc(db, "materials", deleteTarget.id));
      }
      setDeleteTarget(null);
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); }
  };

  if (loading) return <div className="p-8"><Skeleton className="h-64 w-full bg-white/5" /></div>;

  const currentCollection = collections.find(c => c.id === selectedCollectionId);
  const collectionMaterials = materials.filter(m => m.collectionId === selectedCollectionId);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Educational Materials
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">Organize resources for</p>
            <select 
              className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-sm font-bold text-primary focus:outline-none focus:border-primary/50"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="">Legacy / All</option>
            </select>
          </div>
        </div>
        <Button onClick={() => setIsAddingCollection(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> New Collection
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Collections Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-2">Collections</h2>
          <div className="space-y-1">
            {collections.map(col => (
              <div key={col.id} className="group relative">
                <button
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                    selectedCollectionId === col.id 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                      : "text-muted-foreground hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <Folder className={`w-4 h-4 ${selectedCollectionId === col.id ? "text-primary" : "text-muted-foreground"}`} />
                  {editingCollectionId === col.id ? (
                    <div className="flex-1 flex gap-1">
                      <Input 
                        value={editCollectionName} 
                        onChange={e => setEditCollectionName(e.target.value)}
                        className="h-6 text-xs bg-black/50"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleRenameCollection(col.id)}
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-medium truncate">{col.name}</span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-auto">
                    <Edit2 className="w-3 h-3 hover:text-white" onClick={(e) => {
                      e.stopPropagation();
                      setEditingCollectionId(col.id);
                      setEditCollectionName(col.name);
                    }} />
                    <Trash2 className="w-3 h-3 hover:text-red-400" onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: col.id, type: 'collection' });
                    }} />
                  </div>
                </button>
              </div>
            ))}
          </div>

          <AnimatePresence>
            {isAddingCollection && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="p-2 bg-white/5 rounded-xl border border-white/10">
                <form onSubmit={handleCreateCollection} className="flex gap-2">
                  <Input 
                    placeholder="Name..." 
                    value={newCollectionName} 
                    onChange={e => setNewCollectionName(e.target.value)}
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <Button size="sm" type="submit" className="h-8"><Check className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setIsAddingCollection(false)}><X className="w-4 h-4" /></Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Materials Area */}
        <div className="lg:col-span-3 space-y-6">
          {selectedCollectionId ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Folder className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{currentCollection?.name}</h2>
                </div>
                <Button onClick={() => setIsAddingMaterial(true)} variant="outline" className="border-white/10 hover:bg-white/5">
                  <Plus className="w-4 h-4 mr-2" /> Add Material
                </Button>
              </div>

              <AnimatePresence>
                {isAddingMaterial && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl">
                    <form onSubmit={handleSaveMaterial} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase px-1">Material Title</label>
                          <Input 
                            placeholder="e.g. Statistics Chapter 1" 
                            value={materialForm.title} 
                            onChange={e => setMaterialForm({...materialForm, title: e.target.value})}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase px-1">Linked Lesson (Optional)</label>
                          <Select 
                            value={materialForm.lessonId?.toString() || "none"}
                            onValueChange={val => setMaterialForm({...materialForm, lessonId: val === "none" ? null : val})}
                          >
                            <SelectTrigger className="w-full bg-black/50 border border-white/10 rounded-md h-10 px-3 text-sm">
                              <SelectValue placeholder="No linked lesson" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No linked lesson</SelectItem>
                              {lessons.map(l => (
                                <SelectItem key={l.id} value={l.id.toString()}>
                                  Lesson {l.id}: {l.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase px-1">Upload File</label>
                          <div 
                            {...getRootProps()} 
                            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                              isDragActive ? "border-primary bg-primary/10" : "border-white/10 bg-black/20 hover:border-white/30"
                            }`}
                          >
                            <input {...getInputProps()} />
                            <UploadCloud className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            {fileToUpload ? (
                              <p className="text-primary text-sm font-medium">{fileToUpload.name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">PDF, Images, DOCX, etc.</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase px-1">Or External Link</label>
                          <div className="flex gap-2">
                            <Input 
                              placeholder="https://..." 
                              value={materialForm.link}
                              onChange={e => setMaterialForm({...materialForm, link: e.target.value})}
                              className="h-[104px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setIsAddingMaterial(false)}>Cancel</Button>
                        <Button 
                          type="submit" 
                          disabled={uploading || (!fileToUpload && !materialForm.link)} 
                          className="relative overflow-hidden min-w-[160px] bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                        >
                          {uploading ? (
                            <div className="flex flex-col items-center py-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">
                                  {uploadProgress < 100 ? "Uploading..." : "Processing..."}
                                </span>
                              </div>
                              <div className="w-24 h-1 bg-white/20 rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-white shadow-[0_0_8px_white]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              <span>Publish Material</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {collectionMaterials.map(mat => (
                  <Card key={mat.id} className="p-4 bg-white/5 border-white/10 hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-6">
                      <div className="shrink-0 scale-90 -ml-1">
                        <FileCard 
                          formatFile={getFormat(mat.fileType)} 
                          className="shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate text-sm">{mat.title}</h3>
                          {mat.lessonId && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              L{mat.lessonId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">{mat.fileType}</span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <a href={mat.path} target="_blank" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                            Open <ExternalLink className="w-2 h-2" />
                          </a>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-400 opacity-0 group-hover:opacity-100" onClick={() => setDeleteTarget({ id: mat.id, type: 'material' })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {collectionMaterials.length === 0 && !isAddingMaterial && (
                  <div className="md:col-span-2 text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                    <Layout className="w-12 h-12 text-white/5 mx-auto mb-4" />
                    <p className="text-muted-foreground">This collection is empty.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-3xl">
              <Folder className="w-16 h-16 text-white/5 mb-4" />
              <h3 className="text-xl font-bold">Select a Collection</h3>
              <p className="text-muted-foreground max-w-xs mt-2">Pick a collection from the sidebar to view and manage its materials.</p>
            </div>
          )}
        </div>
      </div>

      <DeleteDialog 
        isOpen={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title={deleteTarget?.type === 'collection' ? "Delete Collection" : "Delete Material"}
        description={deleteTarget?.type === 'collection' 
          ? "This will delete the collection and ALL materials inside it. This action cannot be undone." 
          : "This will permanently remove this material from the system."}
      />
    </div>
  );
}

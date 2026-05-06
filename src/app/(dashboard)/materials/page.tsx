"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { FileCard, FormatFileProps } from "@/components/ui/file-card-collections";

import { useState, useMemo, useEffect } from "react";
import { Search, FileText, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

interface Material {
  id: string;
  title: string;
  url: string;
  type: string;
  createdAt: any;
  size?: string;
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "materials"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Material));
      setMaterials(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => 
      m.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, materials]);

  const getFileExtension = (url: string): FormatFileProps => {
    if (!url) return "txt";
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop()?.toLowerCase();
    const validExtensions: FormatFileProps[] = [
      "doc", "pdf", "md", "mdx", "csv", "xls", "xlsx", "txt", "ppt", "pptx", 
      "zip", "rar", "tar", "gz", "code", "html", "js", "jsx", "tsx", "css", 
      "json", "img", "png", "jpg", "jpeg", "video"
    ];
    return validExtensions.includes(ext as FormatFileProps) ? (ext as FormatFileProps) : "txt";
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
          <p className="text-muted-foreground">Access your course PDFs and documentation.</p>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search materials..." 
            className="pl-10 bg-white/5 border-white/10 focus:border-primary/50 transition-all rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <EmptyState 
          icon={FileText} 
          title="No Materials Found" 
          description={searchQuery ? `No results found for "${searchQuery}". Try a different search term.` : "No study materials have been uploaded yet. Check back soon!"}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((material, index) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
            <Card className="glass-card flex flex-col h-full hover:border-primary/50 transition-all duration-300 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 mr-2">
                  <FileCard formatFile={getFileExtension(material.url)} />
                </div>
                <div className="flex flex-col pt-1">
                  <h3 className="font-semibold text-white leading-tight mb-1">{material.title}</h3>
                  <p className="text-sm text-muted-foreground">{material.size || "Unknown Size"} • {getFileExtension(material.url).toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-2"
                  onClick={() => window.open(material.url, '_blank')}
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button 
                  className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 flex items-center justify-center gap-2"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = material.url;
                    link.download = material.title;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);
}

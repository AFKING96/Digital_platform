"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye } from "lucide-react";
import { FileCard, FormatFileProps } from "@/components/ui/file-card-collections";

// In a real app, this might come from Firestore or an API
// For now, based on requirements, we list static files from /public/materials
const materials = [
  { id: 1, title: "Accounting 101 - Lecture 17", filename: "ACC101-L17.pdf", size: "0.7 MB" },
  { id: 2, title: "Principles of Accounting 2", filename: "Accounting2.pdf.pdf", size: "3.7 MB" },
];

export default function MaterialsPage() {
  const getFileExtension = (filename: string): FormatFileProps => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const validExtensions: FormatFileProps[] = [
      "doc", "pdf", "md", "mdx", "csv", "xls", "xlsx", "txt", "ppt", "pptx", 
      "zip", "rar", "tar", "gz", "code", "html", "js", "jsx", "tsx", "css", 
      "json", "img", "png", "jpg", "jpeg", "video"
    ];
    return validExtensions.includes(ext as FormatFileProps) ? (ext as FormatFileProps) : "txt";
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Study Materials</h1>
        <p className="text-muted-foreground">Access your course PDFs and documentation.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {materials.map((material, index) => (
          <motion.div
            key={material.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="glass-card flex flex-col h-full hover:border-primary/50 transition-all duration-300 p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 mr-2">
                  <FileCard formatFile={getFileExtension(material.filename)} />
                </div>
                <div className="flex flex-col pt-1">
                  <h3 className="font-semibold text-white leading-tight mb-1">{material.title}</h3>
                  <p className="text-sm text-muted-foreground">{material.size} • {getFileExtension(material.filename).toUpperCase()}</p>
                </div>
              </div>

              <div className="mt-auto flex gap-3 pt-4 border-t border-white/5">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-2"
                  onClick={() => window.open(`/materials/${material.filename}`, '_blank')}
                >
                  <Eye className="w-4 h-4" />
                  View
                </Button>
                <Button 
                  className="flex-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 flex items-center justify-center gap-2"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = `/materials/${material.filename}`;
                    link.download = material.filename;
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
    </div>
  );
}

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link as LinkIcon } from "lucide-react";

interface FormRendererProps {
  link: string;
}

export const FormRenderer = ({ link }: FormRendererProps) => {
  return (
    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/10 flex flex-col items-center text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center">
        <LinkIcon className="w-10 h-10 text-blue-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">External Assessment</h3>
        <p className="text-muted-foreground max-w-xs mx-auto">
          This question uses an external form. Please complete it using the link below.
        </p>
      </div>
      <Button 
        className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-500 text-lg font-bold gap-2"
        onClick={() => window.open(link, "_blank")}
      >
        Open Google Form <ExternalLink className="w-5 h-5" />
      </Button>
    </div>
  );
};

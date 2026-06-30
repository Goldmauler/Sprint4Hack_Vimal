"use client";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentType, ClassificationResult } from "@/lib/types";

interface DocumentTypeBadgeProps {
  classification: ClassificationResult;
  onTypeChange: (type: DocumentType) => void;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  medical: "Medical",
  legal: "Legal",
  hybrid: "Hybrid",
  general: "General",
};

const TYPE_COLORS: Record<DocumentType, string> = {
  medical: "bg-[#e3dfff] text-[#2a14b4] border-[#c3c0ff]",
  legal: "bg-[#dce9ff] text-[#0b1c30] border-[#c7c4d7]",
  hybrid: "bg-[#ffddb8] text-[#553300] border-[#ffb95f]",
  general: "bg-[#e5eeff] text-[#464554] border-[#c7c4d7]",
};

export function DocumentTypeBadge({ classification, onTypeChange }: DocumentTypeBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger>
          <Badge
            variant="outline"
            className={`px-2.5 py-0.5 text-xs font-semibold border cursor-default ${TYPE_COLORS[classification.type]}`}
          >
            {TYPE_LABELS[classification.type]}
            {classification.method === "keyword" && (
              <span className="ml-1 opacity-60">
                ({Math.round(classification.confidence * 100)}%)
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs">
          <p className="font-semibold mb-1">Detection: {classification.method}</p>
          {classification.keywordScores && (
            <p className="text-muted-foreground">
              Legal: {classification.keywordScores.legal} hits · Medical:{" "}
              {classification.keywordScores.medical} hits
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      <Select
        value={classification.type}
        onValueChange={(val) => onTypeChange(val as DocumentType)}
      >
        <SelectTrigger className="h-7 w-[120px] text-xs border-dashed bg-transparent">
          <SelectValue placeholder="Override..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="legal">Legal</SelectItem>
          <SelectItem value="medical">Medical</SelectItem>
          <SelectItem value="hybrid">Hybrid</SelectItem>
          <SelectItem value="general">General</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

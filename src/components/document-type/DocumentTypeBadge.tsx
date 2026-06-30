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
import { getThemeScopeDescription } from "@/lib/detection/llm-prompt";

interface DocumentTypeBadgeProps {
  classification: ClassificationResult;
  onTypeChange: (type: DocumentType) => void;
  isReprocessing?: boolean;
}

const TYPE_LABELS: Record<DocumentType, string> = {
  medical: "Medical",
  legal: "Legal",
  hybrid: "Hybrid",
  general: "General",
  finance: "Finance",
};

const TYPE_COLORS: Record<DocumentType, string> = {
  medical: "bg-[#e3dfff] text-[#2a14b4] border-[#c3c0ff]",
  legal: "bg-[#dce9ff] text-[#0b1c30] border-[#c7c4d7]",
  hybrid: "bg-[#ffddb8] text-[#553300] border-[#ffb95f]",
  general: "bg-[#e5eeff] text-[#464554] border-[#c7c4d7]",
  finance: "bg-[#d4f5e9] text-[#006c49] border-[#6cf8bb]",
};

export function DocumentTypeBadge({
  classification,
  onTypeChange,
  isReprocessing = false,
}: DocumentTypeBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger render={<span className="inline-flex" />}>
          <Badge
            variant="outline"
            className={`px-2.5 py-0.5 text-xs font-semibold border cursor-default ${TYPE_COLORS[classification.type]}`}
          >
            {TYPE_LABELS[classification.type]}
            {(classification.method === "keyword" || classification.method === "llm") && (
              <span className="ml-1 opacity-60">
                ({Math.round(classification.confidence * 100)}%)
              </span>
            )}
            {classification.method === "llm" && (
              <span className="ml-1 text-[10px] font-normal opacity-80">AI</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px] text-xs">
          <p className="font-semibold mb-1">
            Detection: {classification.method === "llm" ? "AI (Gemini)" : classification.method}
          </p>
          <p className="text-muted-foreground mb-1">
            <span className="font-medium">Scope:</span> {getThemeScopeDescription(classification.type)}
          </p>
          {classification.reasoning && (
            <p className="text-muted-foreground mb-1">{classification.reasoning}</p>
          )}
          {classification.keywordScores && (
            <p className="text-muted-foreground">
              Legal: {classification.keywordScores.legal} · Medical:{" "}
              {classification.keywordScores.medical}
              {classification.keywordScores.finance != null &&
                ` · Finance: ${classification.keywordScores.finance}`}
            </p>
          )}
        </TooltipContent>
      </Tooltip>

      <Select
        value={classification.type}
        onValueChange={(val) => onTypeChange(val as DocumentType)}
        disabled={isReprocessing}
      >
        <SelectTrigger className="h-7 w-[130px] text-xs border-dashed bg-transparent">
          <SelectValue placeholder={isReprocessing ? "Scanning..." : "Change theme..."} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="general">General (all PII)</SelectItem>
          <SelectItem value="medical">Medical (PHI only)</SelectItem>
          <SelectItem value="legal">Legal (case IDs)</SelectItem>
          <SelectItem value="hybrid">Hybrid (med + legal)</SelectItem>
          <SelectItem value="finance">Finance (accounts)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
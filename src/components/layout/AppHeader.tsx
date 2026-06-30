"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentTypeBadge } from "@/components/document-type/DocumentTypeBadge";
import { ClassificationResult, DocumentType } from "@/lib/types";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Workspaces", href: "/" },
  { label: "Archives", href: "/archives" },
  { label: "Settings", href: "/settings" },
];

interface AppHeaderProps {
  reviewedCount: number;
  totalReviewable: number;
  canApprove: boolean;
  canUndo?: boolean;
  classification: ClassificationResult;
  onTypeChange: (type: DocumentType) => void;
  onApprove: () => void;
  onUndo?: () => void;
  onReset: () => void;
  isApproved: boolean;
  isReprocessing?: boolean;
}

export function AppHeader({
  reviewedCount,
  totalReviewable,
  canApprove,
  canUndo = false,
  classification,
  onTypeChange,
  onApprove,
  onUndo,
  onReset,
  isApproved,
  isReprocessing = false,
}: AppHeaderProps) {
  const pathname = usePathname();
  const progressPercent = totalReviewable > 0
    ? Math.round((reviewedCount / totalReviewable) * 100)
    : 0;

  return (
    <header className="h-16 border-b border-[#c7c4d7] bg-[#f8f9ff] fixed top-0 w-full z-50 flex items-center justify-between px-6 lg:px-8">
      {/* Left section */}
      <div className="flex items-center gap-6">
        <Link href="/" prefetch={false} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4338ca] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">shield</span>
          </div>
          <span className="font-bold text-xl text-[#2a14b4] tracking-tight font-['Inter']">
            LexRedact
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-[#2a14b4] font-semibold bg-[#e3dfff]"
                    : "text-[#464554] hover:bg-[#e5eeff]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Center section — Progress */}
      <div className="hidden lg:flex items-center gap-4">
        <DocumentTypeBadge
          classification={classification}
          onTypeChange={onTypeChange}
          isReprocessing={isReprocessing}
        />

        <div className="flex items-center gap-2 text-sm">
          <div className="w-32 h-1.5 bg-[#e5eeff] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4338ca] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[#464554] font-mono text-xs whitespace-nowrap">
            {reviewedCount} of {totalReviewable} reviewed
          </span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-3">
        {canUndo && onUndo && !isApproved && (
          <Button
            type="button"
            onClick={onUndo}
            variant="outline"
            className="text-sm border-[#c7c4d7] text-[#464554] hover:bg-[#e5eeff] hidden sm:inline-flex"
            title="Undo last correction (Ctrl+Z)"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">undo</span>
            Undo
          </Button>
        )}
        {isApproved ? (
          <Button
            type="button"
            onClick={onReset}
            variant="outline"
            className="text-sm border-[#c7c4d7] text-[#464554] hover:bg-[#e5eeff]"
          >
            <span className="material-symbols-outlined text-[16px] mr-1">refresh</span>
            Start New Review
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={<span className="inline-flex" />}
            >
              <Button
                type="button"
                onClick={onApprove}
                disabled={!canApprove}
                className={`text-sm font-semibold transition-all duration-200 ${
                  canApprove
                    ? "bg-[#2a14b4] hover:bg-[#372abf] text-white shadow-md hover:shadow-lg"
                    : "bg-[#c7c4d7] text-[#777586] cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] mr-1">
                  {canApprove ? "check_circle" : "lock"}
                </span>
                Approve & Generate
              </Button>
            </TooltipTrigger>
            {!canApprove && (
              <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                <p>
                  <strong>Review required.</strong> You must review all {totalReviewable - reviewedCount} remaining
                  flagged items before approval.
                </p>
              </TooltipContent>
            )}
          </Tooltip>
        )}

        <button className="p-2 hover:bg-[#dce9ff] rounded-full transition-colors text-[#464554]">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-[#4338ca] flex items-center justify-center text-white text-xs font-bold">
          SM
        </div>
      </div>
    </header>
  );
}

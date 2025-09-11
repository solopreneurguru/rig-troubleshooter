"use client";
import { Citation } from "@/lib/citations";

type CitationBadgeProps = {
  citation: Citation;
  onClick: () => void;
};

export default function CitationBadge({ citation, onClick }: CitationBadgeProps) {
  const getDisplayText = () => {
    switch (citation.type) {
      case "doc":
        return `Doc${citation.page ? ` p.${citation.page}` : ""}`;
      case "plc":
        return `PLC ${citation.tag}`;
      case "tp":
        return `TP ${citation.label}`;
      default:
        return "Citation";
    }
  };

  const getBadgeColor = () => {
    switch (citation.type) {
      case "doc":
        return "bg-blue-900/30 text-blue-200 border-blue-700/50";
      case "plc":
        return "bg-green-900/30 text-green-200 border-green-700/50";
      case "tp":
        return "bg-yellow-900/30 text-yellow-200 border-yellow-700/50";
      default:
        return "bg-gray-900/30 text-gray-200 border-gray-700/50";
    }
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors hover:opacity-80 ${getBadgeColor()}`}
    >
      {getDisplayText()}
    </button>
  );
}

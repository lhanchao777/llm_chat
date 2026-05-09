"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
}

export function ReasoningBlock({ content, isStreaming = false }: ReasoningBlockProps) {
  const [expanded, setExpanded] = useState(true);

  if (!content) return null;

  return (
    <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Brain className="w-4 h-4 shrink-0" />
        <span className="font-medium">思考过程</span>
        {isStreaming && (
          <span className="ml-1 text-xs text-gray-400 animate-pulse">思考中...</span>
        )}
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap break-words">
            {content}
            {isStreaming && <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse" />}
          </div>
        </div>
      )}
    </div>
  );
}

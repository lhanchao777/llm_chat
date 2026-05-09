"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface SystemPromptDisplayProps {
  systemPrompt?: string;
  defaultSystemPrompt: string;
}

export function SystemPromptDisplay({
  systemPrompt,
  defaultSystemPrompt,
}: SystemPromptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const displayPrompt = systemPrompt || defaultSystemPrompt;
  const isCustom = systemPrompt !== undefined && systemPrompt !== defaultSystemPrompt;

  if (!displayPrompt) return null;

  const TRUNCATE_LENGTH = 100;
  const truncatedPrompt = displayPrompt.length > TRUNCATE_LENGTH
    ? displayPrompt.substring(0, TRUNCATE_LENGTH) + "..."
    : displayPrompt;

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">System Prompt:</span>
          {isCustom && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              自定义
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (isExpanded) setShowFull(false);
          }}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? "收起" : "展开"}
        </button>
      </div>
      {isExpanded && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">
              {showFull ? "完整内容" : "预览"}
            </span>
            <button
              onClick={() => setShowFull(!showFull)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showFull ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showFull ? "收起" : "查看全部"}
            </button>
          </div>
          <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-auto max-h-32">
            {showFull ? displayPrompt : truncatedPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}

"use client";

import { Message, ToolCall, ToolResult } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { ReasoningBlock } from "./reasoning-block";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { Globe, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
  message: Message;
  isStreamingReasoning?: boolean;
  isStreamingContent?: boolean;
}

function ToolCallDisplay({
  toolCalls,
  toolResults,
}: {
  toolCalls: ToolCall[];
  toolResults?: ToolResult[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-2 border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-100 transition-colors"
      >
        <Globe className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="text-xs font-medium text-blue-700">
          {toolCalls.length === 1
            ? `调用工具: ${toolCalls[0].name}`
            : `调用 ${toolCalls.length} 个工具`}
        </span>
        {toolResults && toolResults.length > 0 && (
          <span className="text-xs text-green-600 ml-auto mr-1">
            已完成
          </span>
        )}
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-2 space-y-2">
          {toolCalls.map((tc, idx) => {
            const result = toolResults?.find((r) => r.toolCallId === tc.id);
            return (
              <div
                key={tc.id || idx}
                className="text-xs border-t border-blue-100 pt-2"
              >
                <div className="font-medium text-blue-800 mb-1">
                  {tc.name}
                </div>
                <pre className="bg-white rounded p-2 text-gray-600 overflow-x-auto border border-gray-100 max-h-24 overflow-y-auto">
                  {JSON.stringify(tc.arguments, null, 2)}
                </pre>
                {result && (
                  <div className="mt-1.5">
                    <div className="font-medium text-green-700 mb-0.5">
                      返回结果:
                    </div>
                    <pre className="bg-white rounded p-2 text-gray-600 overflow-x-auto border border-gray-100 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                      {result.result}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MessageBubble({
  message,
  isStreamingReasoning = false,
  isStreamingContent = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm"
        )}
      >
        {/* reasoning block */}
        {!isUser && message.reasoning && (
          <ReasoningBlock
            content={message.reasoning}
            isStreaming={isStreamingReasoning}
          />
        )}

        {/* tool calls */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDisplay
            toolCalls={message.toolCalls}
            toolResults={message.toolResults}
          />
        )}

        {/* content */}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none">
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {message.content}
              </ReactMarkdown>
            ) : isStreamingContent ? (
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
            ) : message.toolCalls && message.toolCalls.length > 0 && !message.toolResults ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>正在执行工具...</span>
              </div>
            ) : null}
            {isStreamingContent && message.content && (
              <span className="inline-block w-2 h-4 bg-gray-400 ml-0.5 animate-pulse" />
            )}
          </div>
        )}

        {/* timestamp */}
        <div
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-blue-200 text-right" : "text-gray-400"
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

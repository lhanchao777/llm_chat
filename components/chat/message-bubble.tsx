"use client";

import { Message } from "@/lib/types";
import { formatTime } from "@/lib/utils";
import { ReasoningBlock } from "./reasoning-block";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

interface MessageBubbleProps {
  message: Message;
  isStreamingReasoning?: boolean;
  isStreamingContent?: boolean;
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

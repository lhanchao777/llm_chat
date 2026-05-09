"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: Message[];
  streamingReasoningId?: string | null;
  streamingContentId?: string | null;
}

export function MessageList({
  messages,
  streamingReasoningId,
  streamingContentId,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingReasoningId, streamingContentId]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-1">开始新对话</p>
          <p className="text-sm">输入消息开始和 AI 聊天</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreamingReasoning={streamingReasoningId === msg.id}
            isStreamingContent={streamingContentId === msg.id}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

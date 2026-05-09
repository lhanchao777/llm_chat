"use client";

import { cn } from "@/lib/utils";
import { Plus, MessageSquare, Trash2 } from "lucide-react";

interface ConvSummary {
  id: string;
  title: string;
}

interface SidebarProps {
  conversations: ConvSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: SidebarProps) {
  return (
    <div className="w-60 bg-gray-950 text-gray-300 flex flex-col h-full shrink-0">
      {/* header */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg border border-gray-700 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新对话
        </button>
      </div>

      {/* conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            暂无对话
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors",
                conv.id === activeId
                  ? "bg-gray-800 text-white"
                  : "hover:bg-gray-800/50"
              )}
              onClick={() => onSelect(conv.id)}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate flex-1">
                {conv.title || "新对话"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-700 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

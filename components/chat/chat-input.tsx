"use client";

import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown } from "lucide-react";
import { ModelName, AVAILABLE_MODELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  selectedModel: ModelName;
  onModelChange: (model: ModelName) => void;
}

export function ChatInput({
  onSend,
  isLoading,
  selectedModel,
  onModelChange,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2">
          {/* model selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors whitespace-nowrap"
            >
              {selectedModel}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showModelDropdown && (
              <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      onModelChange(model);
                      setShowModelDropdown(false);
                    }}
                    className={cn(
                      "block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors whitespace-nowrap",
                      model === selectedModel && "bg-blue-50 text-blue-600"
                    )}
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
            style={{ maxHeight: "200px" }}
            disabled={isLoading}
          />

          {/* send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={cn(
              "p-2.5 rounded-xl transition-colors",
              input.trim() && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

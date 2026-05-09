"use client";

import { useState, useEffect } from "react";
import { AppSettings, Conversation } from "@/lib/types";
import { X, Settings } from "lucide-react";

export interface SettingsSavePayload {
  settings: AppSettings;
  /** 仅在选中会话且保存会话提示词时传入 */
  sessionPromptPatch?: { conversationId: string; text: string };
}

interface SettingsDialogProps {
  settings: AppSettings;
  activeConversation: Conversation | null;
  onSave: (payload: SettingsSavePayload) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({
  settings,
  activeConversation,
  onSave,
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [storagePath, setStoragePath] = useState(settings.storagePath);
  const [sessionSystemPrompt, setSessionSystemPrompt] = useState("");

  useEffect(() => {
    setApiKey(settings.apiKey);
    setApiBaseUrl(settings.apiBaseUrl);
    setStoragePath(settings.storagePath);
  }, [settings, open]);

  useEffect(() => {
    if (!open) return;
    const fallback = settings.defaultSystemPrompt;
    setSessionSystemPrompt(
      activeConversation?.systemPrompt ?? fallback
    );
  }, [open, activeConversation?.id, activeConversation?.systemPrompt, settings.defaultSystemPrompt]);

  if (!open) return null;

  const promptEditable =
    activeConversation != null && activeConversation.messages.length === 0;

  const handleSave = () => {
    const nextSettings: AppSettings = {
      apiKey,
      apiBaseUrl,
      storagePath,
      defaultSystemPrompt: settings.defaultSystemPrompt,
    };
    const sessionPromptPatch = promptEditable
      ? { conversationId: activeConversation!.id, text: sessionSystemPrompt }
      : undefined;
    onSave({ settings: nextSettings, sessionPromptPatch });
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">设置</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入 API Key"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Base URL
            </label>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              聊天记录存储路径
            </label>
            <input
              type="text"
              value={storagePath}
              onChange={(e) => setStoragePath(e.target.value)}
              placeholder="留空使用默认路径 (data/conversations/)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-400">
              当前: {storagePath || "项目目录下 data/conversations/"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              当前会话系统提示词
            </label>
            <textarea
              value={sessionSystemPrompt}
              onChange={(e) => setSessionSystemPrompt(e.target.value)}
              disabled={!promptEditable}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              {!activeConversation
                ? "请先选择或创建一个会话后再编辑。"
                : promptEditable
                  ? "仅在尚未发送消息时可编辑；保存后立即作用于当前会话。新建会话使用全局默认初始文案。"
                  : "对话已开始，系统提示词不可再更改。"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

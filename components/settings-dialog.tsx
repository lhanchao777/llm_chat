"use client";

import { useState, useEffect } from "react";
import { AppSettings, Conversation, AssistantPersona, UserProfile } from "@/lib/types";
import { X, Settings, Globe, User, Sparkles, MapPin } from "lucide-react";

export interface SettingsSavePayload {
  settings: AppSettings;
  /** 仅在选中会话且保存会话提示词时传入 */
  sessionPromptPatch?: { conversationId: string; text: string };
  /** 仅在选中会话且保存助手人设时传入 */
  assistantPersonaPatch?: { conversationId: string; persona: AssistantPersona };
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
  // API settings
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [storagePath, setStoragePath] = useState(settings.storagePath);
  const [enableSearch, setEnableSearch] = useState(settings.enableSearch);
  const [mcpServerUrl, setMcpServerUrl] = useState(settings.mcpServerUrl);
  const [exaApiKey, setExaApiKey] = useState(settings.exaApiKey);

  // System prompt (session)
  const [sessionSystemPrompt, setSessionSystemPrompt] = useState("");

  // User profile (global, always editable)
  const [userName, setUserName] = useState(settings.userProfile?.name ?? "");
  const [userAge, setUserAge] = useState(settings.userProfile?.age ?? "");
  const [userOccupation, setUserOccupation] = useState(settings.userProfile?.occupation ?? "");
  const [userLanguage, setUserLanguage] = useState(settings.userProfile?.language ?? "");
  const [userExtra, setUserExtra] = useState(settings.userProfile?.extra ?? "");
  const [userLocation, setUserLocation] = useState(settings.userLocation ?? "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Assistant persona (session-specific)
  const [personaName, setPersonaName] = useState("");
  const [personaIdentity, setPersonaIdentity] = useState("");
  const [personaPersonality, setPersonaPersonality] = useState("");
  const [personaExtra, setPersonaExtra] = useState("");

  useEffect(() => {
    if (!open) return;
    setApiKey(settings.apiKey);
    setApiBaseUrl(settings.apiBaseUrl);
    setStoragePath(settings.storagePath);
    setEnableSearch(settings.enableSearch);
    setMcpServerUrl(settings.mcpServerUrl);
    setExaApiKey(settings.exaApiKey);
    setUserName(settings.userProfile?.name ?? "");
    setUserAge(settings.userProfile?.age ?? "");
    setUserOccupation(settings.userProfile?.occupation ?? "");
    setUserLanguage(settings.userProfile?.language ?? "");
    setUserExtra(settings.userProfile?.extra ?? "");
    setUserLocation(settings.userLocation ?? "");
    setLocationError("");
  }, [settings, open]);

  useEffect(() => {
    if (!open) return;
    setSessionSystemPrompt(
      activeConversation?.systemPrompt ?? settings.defaultSystemPrompt
    );
    // Load assistant persona from active conversation
    const persona = activeConversation?.assistantPersona;
    setPersonaName(persona?.name ?? "");
    setPersonaIdentity(persona?.identity ?? "");
    setPersonaPersonality(persona?.personality ?? "");
    setPersonaExtra(persona?.extra ?? "");
  }, [open, activeConversation?.id, activeConversation?.systemPrompt, activeConversation?.assistantPersona, settings.defaultSystemPrompt]);

  if (!open) return null;

  const hasMessages = activeConversation != null && activeConversation.messages.length > 0;
  const promptEditable = activeConversation != null && !hasMessages;

  const handleAutoLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("浏览器不支持地理定位");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (!res.ok) throw new Error("反向地理编码失败");
          const data = await res.json();
          const addr = data.address;
          if (addr) {
            const parts = [
              addr.country,
              addr.state || addr.region,
              addr.city || addr.town || addr.village,
              addr.suburb || addr.neighbourhood,
            ].filter(Boolean);
            setUserLocation(parts.join(", "));
          } else if (data.display_name) {
            setUserLocation(data.display_name);
          }
        } catch (err) {
          setLocationError(err instanceof Error ? err.message : "获取位置失败");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocationError(err.message || "定位失败");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = () => {
    const userProfile: UserProfile = {
      name: userName || undefined,
      age: userAge || undefined,
      occupation: userOccupation || undefined,
      language: userLanguage || undefined,
      extra: userExtra || undefined,
    };

    const nextSettings: AppSettings = {
      apiKey,
      apiBaseUrl,
      storagePath,
      defaultSystemPrompt: settings.defaultSystemPrompt,
      mcpServerUrl,
      enableSearch,
      exaApiKey,
      userProfile,
      userLocation: userLocation || "",
    };

    const sessionPromptPatch = promptEditable
      ? { conversationId: activeConversation!.id, text: sessionSystemPrompt }
      : undefined;

    const persona: AssistantPersona = {
      name: personaName || undefined,
      identity: personaIdentity || undefined,
      personality: personaPersonality || undefined,
      extra: personaExtra || undefined,
    };
    const hasPersona = persona.name || persona.identity || persona.personality || persona.extra;
    const assistantPersonaPatch = promptEditable && hasPersona
      ? { conversationId: activeConversation!.id, persona }
      : undefined;

    onSave({ settings: nextSettings, sessionPromptPatch, assistantPersonaPatch });
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
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
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

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">

          {/* ===== 用户个人信息（全局共享 · 蓝色卡片）===== */}
          <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">用户个人信息</span>
              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">全局共享</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              以下信息会注入到 System Prompt 的隐藏部分，所有对话共享，对 LLM 不可见。
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">姓名</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="可选"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">年龄</label>
                  <input
                    type="text"
                    value={userAge}
                    onChange={(e) => setUserAge(e.target.value)}
                    placeholder="可选"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">职业</label>
                  <input
                    type="text"
                    value={userOccupation}
                    onChange={(e) => setUserOccupation(e.target.value)}
                    placeholder="可选"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">语言偏好</label>
                  <input
                    type="text"
                    value={userLanguage}
                    onChange={(e) => setUserLanguage(e.target.value)}
                    placeholder="可选，如 中文"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">补充信息</label>
                <input
                  type="text"
                  value={userExtra}
                  onChange={(e) => setUserExtra(e.target.value)}
                  placeholder="可选，如兴趣爱好、关注领域等"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
              {/* 位置 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  所在位置
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="手动输入或自动获取"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                  <button
                    onClick={handleAutoLocation}
                    disabled={locating}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {locating ? "定位中..." : "自动获取"}
                  </button>
                </div>
                {locationError && (
                  <p className="mt-1 text-xs text-red-500">{locationError}</p>
                )}
                <p className="mt-1 text-[10px] text-gray-400">
                  使用浏览器地理定位 + OpenStreetMap 反向地理编码获取。
                </p>
              </div>
            </div>
          </div>

          {/* ===== 助手人设（Session 专属 · 绿色卡片）===== */}
          <div className={`border rounded-lg p-4 ${
            hasMessages
              ? "border-gray-200 bg-gray-50 opacity-70"
              : "border-green-200 bg-green-50/40"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className={`w-4 h-4 ${hasMessages ? "text-gray-400" : "text-green-600"}`} />
              <span className={`text-sm font-semibold ${hasMessages ? "text-gray-500" : "text-green-800"}`}>
                助手人设
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                hasMessages
                  ? "bg-gray-100 text-gray-400"
                  : "bg-green-100 text-green-600"
              }`}>
                当前会话专属
              </span>
              {hasMessages && (
                <span className="text-[10px] text-gray-400 ml-auto">对话已开始，不可修改</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              每个会话可以有独立的助手人设。新对话可复用上次配置。
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">助手名称</label>
                  <input
                    type="text"
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    disabled={hasMessages}
                    placeholder="可选，如 小助手"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">身份设定</label>
                  <input
                    type="text"
                    value={personaIdentity}
                    onChange={(e) => setPersonaIdentity(e.target.value)}
                    disabled={hasMessages}
                    placeholder="可选，如 资深工程师"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">性格特征</label>
                <input
                  type="text"
                  value={personaPersonality}
                  onChange={(e) => setPersonaPersonality(e.target.value)}
                  disabled={hasMessages}
                  placeholder="可选，如 幽默风趣、严谨专业"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">补充设定</label>
                <input
                  type="text"
                  value={personaExtra}
                  onChange={(e) => setPersonaExtra(e.target.value)}
                  disabled={hasMessages}
                  placeholder="可选，其他需要助手了解的设定"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 bg-white"
                />
              </div>
            </div>
          </div>

          {/* ===== 搜索功能 ===== */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-700">搜索功能 (Exa MCP)</span>
              </div>
              <button
                onClick={() => setEnableSearch(!enableSearch)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  enableSearch ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                    enableSearch ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              开启后 LLM 可自动决定是否调用 Exa 搜索工具获取实时信息。
            </p>
            {enableSearch && (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    MCP 服务器地址
                  </label>
                  <input
                    type="text"
                    value={mcpServerUrl}
                    onChange={(e) => setMcpServerUrl(e.target.value)}
                    placeholder="https://mcp.exa.ai/mcp"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    默认使用 Exa 远程 MCP 服务器，支持 Streamable HTTP / SSE 协议。
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Exa API Key
                  </label>
                  <input
                    type="password"
                    value={exaApiKey}
                    onChange={(e) => setExaApiKey(e.target.value)}
                    placeholder="留空使用免费额度（有限速）"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    在 <a href="https://dashboard.exa.ai/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">dashboard.exa.ai</a> 获取 API Key。
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ===== API 配置 ===== */}
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

          {/* ===== 系统提示词 ===== */}
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
                  ? "仅在尚未发送消息时可编辑；保存后立即作用于当前会话。"
                  : "对话已开始，系统提示词不可再更改。"}
            </p>
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
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

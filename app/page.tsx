"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, Globe } from "lucide-react";
import {
  Conversation,
  Message,
  ModelName,
  AppSettings,
  DEFAULT_SETTINGS,
  ToolCall,
  ToolResult,
} from "@/lib/types";
import { generateId, truncateText } from "@/lib/utils";
import {
  fetchConversationList,
  fetchConversation,
  createConversation,
  updateConversation,
  deleteConversation as deleteConvApi,
  fetchSettings,
  saveServerSettings,
} from "@/lib/storage";
import { Sidebar } from "@/components/chat/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import {
  SettingsDialog,
  type SettingsSavePayload,
} from "@/components/settings-dialog";
import { SystemPromptDisplay } from "@/components/system-prompt-display";
import { SearchResultsPanel } from "@/components/search-results-panel";

interface ConvSummary {
  id: string;
  title: string;
  model: ModelName;
  createdAt: number;
  updatedAt: number;
}

export default function Home() {
  const [conversationList, setConversationList] = useState<ConvSummary[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelName>("mimo-v2.5-pro");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingReasoningId, setStreamingReasoningId] = useState<string | null>(null);
  const [streamingContentId, setStreamingContentId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ name: string; result: string; query?: Record<string, unknown> }>>([]);
  const abortRef = useRef<AbortController | null>(null);

  // load from server on mount
  useEffect(() => {
    async function init() {
      const [list, s] = await Promise.all([
        fetchConversationList(),
        fetchSettings(),
      ]);
      setConversationList(list);
      setSettings(s);
      setMounted(true);
    }
    init();
  }, []);

  // load full conversation when activeId changes
  const skipLoadRef = useRef(false);
  useEffect(() => {
    if (skipLoadRef.current) {
      skipLoadRef.current = false;
      return;
    }

    if (!activeId) {
      setActiveConv(null);
      return;
    }
    fetchConversation(activeId).then((conv) => {
      if (conv) {
        setActiveConv(conv);
        setSelectedModel(conv.model);
      }
    });
  }, [activeId]);

  const activeConversation = activeConv;

  const refreshList = useCallback(async () => {
    const list = await fetchConversationList();
    setConversationList(list);
  }, []);

  const handleNewConversation = useCallback(async (systemPrompt: string) => {
    const newConv: Conversation = {
      id: generateId(),
      title: "新对话",
      model: selectedModel,
      systemPrompt,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createConversation(newConv);
    await refreshList();
    setActiveId(newConv.id);
    setActiveConv(newConv);
  }, [selectedModel, refreshList]);

  const handleNewConversationClick = useCallback(() => {
    void handleNewConversation(settings.defaultSystemPrompt);
  }, [handleNewConversation, settings.defaultSystemPrompt]);

  const handleSelectConversation = useCallback(
    async (id: string) => {
      // delete empty active conversation on switch
      if (activeId && activeId !== id) {
        const current = await fetchConversation(activeId);
        if (current && current.messages.length === 0) {
          await deleteConvApi(activeId);
          await refreshList();
        }
      }
      setActiveId(id);
    },
    [activeId, refreshList]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConvApi(id);
      await refreshList();
      if (activeId === id) {
        const list = await fetchConversationList();
        if (list.length > 0) {
          setActiveId(list[0].id);
        } else {
          setActiveId(null);
          setActiveConv(null);
        }
      }
    },
    [activeId, refreshList]
  );

  const handleSaveSettings = useCallback(async (payload: SettingsSavePayload) => {
    setSettings(payload.settings);
    await saveServerSettings(payload.settings);
    const patch = payload.sessionPromptPatch;
    const personaPatch = payload.assistantPersonaPatch;
    if (!patch && !personaPatch) return;
    if (!activeId || !activeConv) return;

    let updated: Conversation | null = null;

    if (patch && activeId === patch.conversationId && activeConv.messages.length === 0) {
      updated = {
        ...activeConv,
        systemPrompt: patch.text,
        updatedAt: Date.now(),
      };
    }

    if (personaPatch && activeId === personaPatch.conversationId && activeConv.messages.length === 0) {
      updated = {
        ...(updated || activeConv),
        assistantPersona: personaPatch.persona,
        updatedAt: Date.now(),
      };
    }

    if (updated) {
      await updateConversation(updated);
      setActiveConv(updated);
    }
  }, [activeId, activeConv]);

  const handleSend = useCallback(
    async (userContent: string) => {
      if (isLoading) return;

      let currentId = activeId;
      let currentConv = activeConv;

      // create conversation if none exists
      if (!currentId || !currentConv) {
        const newId = generateId();
        const newConv: Conversation = {
          id: newId,
          title: truncateText(userContent),
          model: selectedModel,
          systemPrompt: settings.defaultSystemPrompt,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await createConversation(newConv);
        skipLoadRef.current = true;
        setActiveId(newId);
        setActiveConv(newConv);
        currentId = newId;
        currentConv = newConv;
      }

      const isFirstMessage = currentConv.messages.length === 0;

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: userContent,
        timestamp: Date.now(),
      };

      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        reasoning: "",
        timestamp: Date.now(),
      };

      const updatedConv: Conversation = {
        ...currentConv,
        title: isFirstMessage ? truncateText(userContent) : currentConv.title,
        messages: [...currentConv.messages, userMsg, assistantMsg],
        updatedAt: Date.now(),
      };

      setActiveConv(updatedConv);
      setIsLoading(true);
      setStreamingReasoningId(assistantMsg.id);

      try {
        const allMessages = [
          ...currentConv.messages.map((m) => ({
            role: m.role,
            content: m.content,
            ...(m.toolCalls ? { tool_calls: m.toolCalls.map((tc, i) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
            }))} : {}),
            ...(m.toolResults ? { tool_call_id: m.toolResults[0]?.toolCallId } : {}),
          })),
          { role: "user" as const, content: userContent },
        ];

        abortRef.current = new AbortController();

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            model: selectedModel,
            systemPrompt: currentConv.systemPrompt || settings.defaultSystemPrompt,
            enableSearch: settings.enableSearch,
            mcpServerUrl: settings.mcpServerUrl,
            exaApiKey: settings.exaApiKey,
            userProfile: settings.userProfile,
            userLocation: settings.userLocation,
            assistantPersona: currentConv.assistantPersona,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let reasoning = "";
        let content = "";
        let currentEvent = "";
        const currentToolCalls: ToolCall[] = [];
        const currentToolResults: ToolResult[] = [];

        const updateLocalConv = () => {
          setActiveConv((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      reasoning,
                      content,
                      toolCalls: currentToolCalls.length > 0 ? [...currentToolCalls] : undefined,
                      toolResults: currentToolResults.length > 0 ? [...currentToolResults] : undefined,
                    }
                  : m
              ),
            };
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith("event: ")) {
              currentEvent = trimmed.slice(7);
              if (currentEvent === "reasoning_done") {
                setStreamingReasoningId(null);
                setStreamingContentId(assistantMsg.id);
              }
              continue;
            }

            if (trimmed.startsWith("data: ")) {
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);

                if (currentEvent === "tool_call") {
                  currentToolCalls.push({
                    id: parsed.id,
                    name: parsed.name,
                    arguments: parsed.arguments,
                  });
                  updateLocalConv();
                  continue;
                }

                if (currentEvent === "tool_result") {
                  currentToolResults.push({
                    toolCallId: parsed.toolCallId,
                    result: parsed.result,
                  });
                  // Also add to search results panel
                  setSearchResults((prev) => [
                    ...prev,
                    { name: parsed.name, result: parsed.result, query: currentToolCalls.find((tc) => tc.id === parsed.toolCallId)?.arguments },
                  ]);
                  setSearchPanelOpen(true);
                  updateLocalConv();
                  continue;
                }

                if (parsed.delta !== undefined && parsed.delta !== "") {
                  if (currentEvent === "reasoning") {
                    reasoning += parsed.delta;
                    updateLocalConv();
                  } else if (currentEvent === "content") {
                    content += parsed.delta;
                    updateLocalConv();
                  }
                }
              } catch {
                // skip malformed
              }
            }
          }
        }

        // save final conversation to server
        const finalConv: Conversation = {
          ...updatedConv,
          title: isFirstMessage ? truncateText(userContent) : currentConv.title,
          messages: currentConv.messages.concat([
            userMsg,
            {
              ...assistantMsg,
              reasoning,
              content,
              toolCalls: currentToolCalls.length > 0 ? currentToolCalls : undefined,
              toolResults: currentToolResults.length > 0 ? currentToolResults : undefined,
            },
          ]),
          updatedAt: Date.now(),
        };
        await updateConversation(finalConv);
        setActiveConv(finalConv);
        await refreshList();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Chat error:", err);
        setActiveConv((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: "请求出错，请检查网络或设置后重试。" }
                : m
            ),
          };
        });
        // save error state to server
        const errorConv: Conversation = {
          ...updatedConv,
          messages: currentConv.messages.concat([
            userMsg,
            { ...assistantMsg, content: "请求出错，请检查网络或设置后重试。" },
          ]),
          updatedAt: Date.now(),
        };
        await updateConversation(errorConv);
        await refreshList();
      } finally {
        setIsLoading(false);
        setStreamingReasoningId(null);
        setStreamingContentId(null);
        abortRef.current = null;
      }
    },
    [
      activeConv,
      activeId,
      isLoading,
      selectedModel,
      refreshList,
      settings.defaultSystemPrompt,
      settings.enableSearch,
      settings.mcpServerUrl,
      settings.exaApiKey,
      settings.userProfile,
      settings.userLocation,
    ]
  );

  const handleModelChange = useCallback(
    (model: ModelName) => {
      setSelectedModel(model);
      if (activeConv) {
        setActiveConv({ ...activeConv, model });
      }
    },
    [activeConv]
  );

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* sidebar */}
      <Sidebar
        conversations={conversationList}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversationClick}
        onDelete={handleDeleteConversation}
      />

      {/* main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
          <h1 className="text-base font-semibold text-gray-800">LLM Chat</h1>
          <div className="flex items-center gap-1">
            {settings.enableSearch && (
              <button
                onClick={() => setSearchPanelOpen(!searchPanelOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  searchPanelOpen
                    ? "bg-blue-100 text-blue-600"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
                title="搜索结果面板"
              >
                <Globe className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* system prompt display */}
        <SystemPromptDisplay
          systemPrompt={activeConversation?.systemPrompt}
          defaultSystemPrompt={settings.defaultSystemPrompt}
          assistantPersona={activeConversation?.assistantPersona}
          isConversationStarted={activeConversation != null && activeConversation.messages.length > 0}
        />

        {/* messages */}
        <MessageList
          messages={activeConversation?.messages || []}
          streamingReasoningId={streamingReasoningId}
          streamingContentId={streamingContentId}
        />

        {/* input */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
        />
      </div>

      {/* search results panel */}
      {settings.enableSearch && (
        <SearchResultsPanel
          results={searchResults}
          open={searchPanelOpen}
          onClose={() => setSearchPanelOpen(false)}
        />
      )}

      {/* settings dialog */}
      <SettingsDialog
        settings={settings}
        activeConversation={activeConversation}
        onSave={handleSaveSettings}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}

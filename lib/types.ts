export type ModelName = "mimo-v2.5-pro" | "mimo-v2.5";

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  tokenVersion: number;
  createdAt: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

// 全局共享的用户个人信息
export interface UserProfile {
  name?: string;
  age?: string;
  occupation?: string;
  language?: string;
  extra?: string;
}

// 每个 session 独立的助手人设
export interface AssistantPersona {
  name?: string;
  identity?: string;
  personality?: string;
  extra?: string;
}

export interface Conversation {
  id: string;
  title: string;
  model: ModelName;
  systemPrompt?: string;
  assistantPersona?: AssistantPersona;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  storagePath: string;
  defaultSystemPrompt: string;
  mcpServerUrl: string;
  enableSearch: boolean;
  exaApiKey: string;
  userProfile: UserProfile;
  userLocation: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  apiBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  storagePath: "",
  defaultSystemPrompt: "You are a helpful assistant",
  mcpServerUrl: "https://mcp.exa.ai/mcp",
  enableSearch: false,
  exaApiKey: "",
  userProfile: {},
  userLocation: "",
};

export const AVAILABLE_MODELS: ModelName[] = ["mimo-v2.5-pro", "mimo-v2.5"];

export type ModelName = "mimo-v2.5-pro" | "mimo-v2.5";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: ModelName;
  systemPrompt?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  storagePath: string;
  defaultSystemPrompt: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "tp-ctay04hxdarto1y8nfehk858q89wsej01y4apnnwwuuiqd1i",
  apiBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  storagePath: "",
  defaultSystemPrompt: "You are a helpful assistant",
};

export const AVAILABLE_MODELS: ModelName[] = ["mimo-v2.5-pro", "mimo-v2.5"];

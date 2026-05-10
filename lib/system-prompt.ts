import { UserProfile, AssistantPersona } from "./types";

interface SystemPromptParts {
  userPrompt: string;
  userProfile?: UserProfile;
  userLocation?: string;
  assistantPersona?: AssistantPersona;
}

export function buildFullSystemPrompt(parts: SystemPromptParts): string {
  const sections: string[] = [];

  // 1. User-editable visible text
  if (parts.userPrompt && parts.userPrompt.trim()) {
    sections.push(parts.userPrompt.trim());
  }

  // 2. Hidden context block
  const contextLines: string[] = [];

  // Current time
  const now = new Date();
  const timeStr = now.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "long",
  });
  contextLines.push(`Current time: ${timeStr}`);

  // User profile
  const profileLines = formatUserProfile(parts.userProfile, parts.userLocation);
  if (profileLines) {
    contextLines.push("");
    contextLines.push(profileLines);
  }

  // Assistant persona
  const personaLines = formatAssistantPersona(parts.assistantPersona);
  if (personaLines) {
    contextLines.push("");
    contextLines.push(personaLines);
  }

  sections.push(`<context>\n${contextLines.join("\n")}\n</context>`);

  return sections.join("\n\n");
}

function formatUserProfile(profile?: UserProfile, location?: string): string {
  if (!profile && !location) return "";

  const fields: string[] = [];
  if (profile?.name) fields.push(`Name: ${profile.name}`);
  if (profile?.age) fields.push(`Age: ${profile.age}`);
  if (profile?.occupation) fields.push(`Occupation: ${profile.occupation}`);
  if (profile?.language) fields.push(`Language preference: ${profile.language}`);
  if (location) fields.push(`Location: ${location}`);
  if (profile?.extra) fields.push(`Additional info: ${profile.extra}`);

  if (fields.length === 0) return "";
  return `User profile:\n${fields.map((f) => `- ${f}`).join("\n")}`;
}

function formatAssistantPersona(persona?: AssistantPersona): string {
  if (!persona) return "";

  const fields: string[] = [];
  if (persona.name) fields.push(`Name: ${persona.name}`);
  if (persona.identity) fields.push(`Identity: ${persona.identity}`);
  if (persona.personality) fields.push(`Personality: ${persona.personality}`);
  if (persona.extra) fields.push(`Additional info: ${persona.extra}`);

  if (fields.length === 0) return "";
  return `Assistant persona:\n${fields.map((f) => `- ${f}`).join("\n")}`;
}

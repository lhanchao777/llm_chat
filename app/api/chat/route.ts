import { NextRequest } from "next/server";
import {
  getMCPTools,
  callMCPTool,
  convertToolsToOpenAIFormat,
} from "@/lib/mcp-client";
import { buildFullSystemPrompt } from "@/lib/system-prompt";
import { getAuthUser, AuthError } from "@/lib/auth";
import type { UserProfile, AssistantPersona } from "@/lib/types";

export const runtime = "nodejs";

interface ToolCallDelta {
  index: number;
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
}

async function callLLM(
  apiBaseUrl: string,
  apiKey: string,
  body: Record<string, unknown>
) {
  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  return response;
}

export async function POST(req: NextRequest) {
  // Auth check
  try {
    await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(err.message, { status: err.status });
    }
    return new Response("Internal error", { status: 500 });
  }

  const {
    messages, model, systemPrompt,
    enableSearch, mcpServerUrl, exaApiKey,
    userProfile, userLocation, assistantPersona,
  } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response("messages must be an array", { status: 400 });
  }
  if (!model) {
    return new Response("model is required", { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  const apiBaseUrl =
    process.env.MIMO_API_BASE_URL || "https://token-plan-cn.xiaomimimo.com/v1";

  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }

  // Build the full system prompt (visible text + hidden context)
  const fullSystemPrompt = buildFullSystemPrompt({
    userPrompt: systemPrompt || "",
    userProfile: userProfile as UserProfile | undefined,
    userLocation: userLocation || undefined,
    assistantPersona: assistantPersona as AssistantPersona | undefined,
  });

  let processedMessages: Array<{ role: string; content: string; tool_call_id?: string; tool_calls?: unknown[] }> = messages;
  if (fullSystemPrompt) {
    processedMessages = [
      { role: "system", content: fullSystemPrompt },
      ...messages,
    ];
  }

  // If search is not enabled, use the original simple flow
  if (!enableSearch || !mcpServerUrl) {
    return streamSimpleResponse(apiBaseUrl, apiKey, model, processedMessages);
  }

  // With search enabled, use tool-calling flow
  return streamWithTools(
    apiBaseUrl,
    apiKey,
    model,
    processedMessages,
    mcpServerUrl,
    exaApiKey
  );
}

function streamSimpleResponse(
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await callLLM(apiBaseUrl, apiKey, {
          model,
          messages,
          stream: true,
        });

        const reader = response.body?.getReader();
        if (!reader) {
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        let buffer = "";
        let isReasoning = false;
        let isContent = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              controller.enqueue(
                encoder.encode("event: done\ndata: [DONE]\n\n")
              );
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              if (delta.reasoning_content) {
                if (!isReasoning) {
                  isReasoning = true;
                  isContent = false;
                }
                controller.enqueue(
                  encoder.encode(
                    `event: reasoning\ndata: ${JSON.stringify({ delta: delta.reasoning_content })}\n\n`
                  )
                );
              }

              if (delta.content) {
                if (!isContent) {
                  isContent = true;
                  if (isReasoning) {
                    controller.enqueue(
                      encoder.encode("event: reasoning_done\ndata: {}\n\n")
                    );
                  }
                  isReasoning = false;
                }
                controller.enqueue(
                  encoder.encode(
                    `event: content\ndata: ${JSON.stringify({ delta: delta.content })}\n\n`
                  )
                );
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

const MAX_AGENT_LOOPS = 10;

type MsgEntry = { role: string; content: string | null; tool_call_id?: string; tool_calls?: unknown[] };

async function streamWithTools(
  apiBaseUrl: string,
  apiKey: string,
  model: string,
  messages: MsgEntry[],
  mcpServerUrl: string,
  exaApiKey?: string
) {
  const encoder = new TextEncoder();

  let openAITools: ReturnType<typeof convertToolsToOpenAIFormat>;
  try {
    const mcpTools = await getMCPTools(mcpServerUrl, exaApiKey);
    openAITools = convertToolsToOpenAIFormat(mcpTools);
  } catch (err) {
    console.error("Failed to get MCP tools:", err);
    return streamSimpleResponse(apiBaseUrl, apiKey, model, messages.map(m => ({ ...m, content: m.content ?? "" })));
  }

  if (openAITools.length === 0) {
    return streamSimpleResponse(apiBaseUrl, apiKey, model, messages.map(m => ({ ...m, content: m.content ?? "" })));
  }

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();

      let closed = false;
      const safeClose = () => {
        if (!closed) {
          closed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      };

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // agent loop: conversation history grows across iterations
        const conversationHistory: MsgEntry[] = [...messages];

        for (let loop = 0; loop < MAX_AGENT_LOOPS; loop++) {
          // Call LLM with tools
          const llmResponse = await callLLM(apiBaseUrl, apiKey, {
            model,
            messages: conversationHistory,
            tools: openAITools,
            stream: true,
          });

          const reader = llmResponse.body?.getReader();
          if (!reader) break;

          // Stream response while accumulating for tool call detection
          let reasoning = "";
          let content = "";
          let hasToolCalls = false;
          const toolCalls: AccumulatedToolCall[] = [];
          let isReasoning = false;
          let isContent = false;
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (!delta) continue;

                if (delta.reasoning_content) {
                  if (!isReasoning) {
                    isReasoning = true;
                    isContent = false;
                  }
                  reasoning += delta.reasoning_content;
                  // Real-time stream to frontend
                  send("reasoning", { delta: delta.reasoning_content });
                }

                if (delta.content) {
                  if (!isContent) {
                    isContent = true;
                    if (isReasoning) {
                      send("reasoning_done", {});
                      isReasoning = false;
                    }
                  }
                  content += delta.content;
                  // Real-time stream to frontend
                  send("content", { delta: delta.content });
                }

                if (delta.tool_calls) {
                  // If we were still in reasoning when tool_calls arrive, close it
                  if (isReasoning) {
                    send("reasoning_done", {});
                    isReasoning = false;
                  }
                  hasToolCalls = true;
                  for (const tc of delta.tool_calls as ToolCallDelta[]) {
                    const idx = tc.index;
                    while (toolCalls.length <= idx) {
                      toolCalls.push({ id: "", name: "", arguments: "" });
                    }
                    if (tc.id) toolCalls[idx].id = tc.id;
                    if (tc.function?.name) toolCalls[idx].name = tc.function.name;
                    if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
                  }
                }
              } catch {
                // skip malformed JSON
              }
            }
          }

          // Close reasoning if it was still open after stream ends
          if (isReasoning) {
            send("reasoning_done", {});
            isReasoning = false;
          }

          // No tool calls — this is the final answer, already streamed above
          if (!hasToolCalls || toolCalls.length === 0) {
            send("done", { finish: true });
            safeClose();
            return;
          }

          const assistantToolCalls = toolCalls.map((tc, i) => ({
            id: tc.id || `call_${i}`,
            type: "function",
            function: { name: tc.name, arguments: tc.arguments },
          }));

          // Emit tool_call events
          for (const tc of toolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try { parsedArgs = JSON.parse(tc.arguments); } catch { /* ignore */ }
            send("tool_call", { id: tc.id, name: tc.name, arguments: parsedArgs });
          }

          // Execute tool calls via MCP
          const toolResults: MsgEntry[] = [];

          for (const tc of toolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try { parsedArgs = JSON.parse(tc.arguments); } catch { /* ignore */ }

            try {
              const result = await callMCPTool(mcpServerUrl, tc.name, parsedArgs, exaApiKey);
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: result });
              send("tool_result", { toolCallId: tc.id, name: tc.name, result });
            } catch (err) {
              const errorMsg = `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`;
              toolResults.push({ tool_call_id: tc.id, role: "tool", content: errorMsg });
              send("tool_result", { toolCallId: tc.id, name: tc.name, result: errorMsg });
            }
          }

          // Append assistant message + tool results to conversation history
          conversationHistory.push({
            role: "assistant",
            content: content || null,
            tool_calls: assistantToolCalls,
          });
          conversationHistory.push(...toolResults);
          // continue loop — next iteration will call LLM again
        }

        // Exhausted max loops without a final answer
        send("error", { message: `Agent loop exceeded ${MAX_AGENT_LOOPS} iterations` });
      } catch (err) {
        console.error("Agent loop error:", err);
        if (!closed) {
          send("error", {
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

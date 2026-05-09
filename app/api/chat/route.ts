import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages, model, systemPrompt } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response("messages must be an array", { status: 400 });
  }
  if (!model) {
    return new Response("model is required", { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  const apiBaseUrl = process.env.MIMO_API_BASE_URL || "https://token-plan-cn.xiaomimimo.com/v1";

  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }

  // Build messages array, prepend system prompt if provided
  let processedMessages = messages;
  if (systemPrompt && systemPrompt.trim() !== "") {
    processedMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
  }

  const response = await fetch(`${apiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: processedMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(errorText, { status: response.status });
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return new Response("No response body", { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      let isReasoning = false;
      let isContent = false;

      try {
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
              controller.enqueue(encoder.encode("event: done\ndata: [DONE]\n\n"));
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;

              // reasoning_content from the model
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

              // regular content
              if (delta.content) {
                if (!isContent) {
                  isContent = true;
                  if (isReasoning) {
                    // reasoning phase ended
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
        controller.close();
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

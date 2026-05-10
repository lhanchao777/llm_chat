import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, object>;
    required?: string[];
  };
}

interface MCPClientInstance {
  client: Client;
  tools: MCPTool[];
  connectedAt: number;
}

const clientCache = new Map<string, MCPClientInstance>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function cacheKey(url: string, apiKey?: string): string {
  return apiKey ? `${url}__${apiKey}` : url;
}

async function createClient(url: string, apiKey?: string): Promise<MCPClientInstance> {
  const key = cacheKey(url, apiKey);
  const cached = clientCache.get(key);
  if (cached && Date.now() - cached.connectedAt < CACHE_TTL) {
    try {
      await cached.client.ping();
      return cached;
    } catch {
      clientCache.delete(key);
      try { await cached.client.close(); } catch { /* ignore */ }
    }
  }

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  const client = new Client({ name: "llm-chat", version: "1.0.0" });
  const baseUrl = new URL(url);

  try {
    const transport = new StreamableHTTPClientTransport(baseUrl, {
      requestInit: { headers },
    });
    await client.connect(transport);
  } catch {
    // Fall back to legacy SSE transport
    const client2 = new Client({ name: "llm-chat", version: "1.0.0" });
    const transport = new SSEClientTransport(baseUrl, {
      requestInit: { headers },
      eventSourceInit: { fetch: (input: string | URL | Request, init?: RequestInit) => fetch(input, { ...init, headers: { ...init?.headers, ...headers } }) },
    });
    await client2.connect(transport);
    const tools = await fetchTools(client2);
    const instance: MCPClientInstance = { client: client2, tools, connectedAt: Date.now() };
    clientCache.set(key, instance);
    return instance;
  }

  const tools = await fetchTools(client);
  const instance: MCPClientInstance = { client, tools, connectedAt: Date.now() };
  clientCache.set(key, instance);
  return instance;
}

async function fetchTools(client: Client): Promise<MCPTool[]> {
  const allTools: MCPTool[] = [];
  let cursor: string | undefined;

  do {
    const { tools, nextCursor } = await client.listTools({ cursor });
    for (const t of tools) {
      allTools.push({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as MCPTool["inputSchema"],
      });
    }
    cursor = nextCursor;
  } while (cursor);

  return allTools;
}

export async function getMCPTools(url: string, apiKey?: string): Promise<MCPTool[]> {
  const instance = await createClient(url, apiKey);
  return instance.tools;
}

export async function callMCPTool(
  url: string,
  name: string,
  args: Record<string, unknown>,
  apiKey?: string
): Promise<string> {
  const instance = await createClient(url, apiKey);
  const result = await instance.client.callTool({ name, arguments: args });

  if (Array.isArray(result.content)) {
    return result.content
      .filter((c: { type: string }) => c.type === "text")
      .map((c: { type: string; text: string }) => c.text)
      .join("\n");
  }

  return String(result);
}

export function convertToolsToOpenAIFormat(
  tools: MCPTool[]
): OpenAITool[] {
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description || "",
      parameters: t.inputSchema,
    },
  }));
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type { MCPTool, OpenAITool };

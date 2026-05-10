# System Prompt 配置功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为LLM Chat应用添加用户可配置的system prompt功能，支持全局默认设置和每个对话的独立覆盖。

**Architecture:** 扩展现有数据结构添加system prompt字段，修改chat API支持system prompt注入，在聊天界面中添加配置UI，保持向后兼容性。

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS

---

## 文件结构

### 需要修改的文件
- `lib/types.ts` - 添加system prompt字段到AppSettings和Conversation接口
- `lib/storage.ts` - 更新存储函数处理新字段
- `lib/server-storage.ts` - 更新服务器存储函数处理新字段
- `app/api/chat/route.ts` - 修改chat API支持system prompt参数
- `app/api/settings/route.ts` - 处理设置中的新字段
- `app/api/conversations/[id]/route.ts` - 处理对话中的新字段
- `components/settings-dialog.tsx` - 添加默认system prompt配置字段
- `app/page.tsx` - 添加UI逻辑和system prompt处理

### 需要创建的文件
- `components/system-prompt-modal.tsx` - 新建对话时的system prompt选择模态框
- `components/system-prompt-display.tsx` - 聊天界面中显示system prompt的组件

---

## 任务分解

### Task 1: 更新数据结构

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: 添加defaultSystemPrompt到AppSettings接口**

```typescript
export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  storagePath: string;
  defaultSystemPrompt: string; // 新增：全局默认system prompt
}
```

- [ ] **Step 2: 添加systemPrompt到Conversation接口**

```typescript
export interface Conversation {
  id: string;
  title: string;
  model: ModelName;
  systemPrompt?: string; // 新增：对话级system prompt（可选）
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
```

- [ ] **Step 3: 更新DEFAULT_SETTINGS添加默认值**

```typescript
export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  apiBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  storagePath: "",
  defaultSystemPrompt: "你是一个有用的AI助手。", // 新增默认值
};
```

- [ ] **Step 4: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 5: 提交更改**

```bash
git add lib/types.ts
git commit -m "feat: add system prompt fields to data structures"
```

### Task 2: 更新服务器存储逻辑

**Files:**
- Modify: `lib/server-storage.ts`

- [ ] **Step 1: 更新loadServerSettings函数处理新字段**

```typescript
export async function loadServerSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
```

- [ ] **Step 2: 更新saveServerSettings函数处理新字段**

```typescript
export async function saveServerSettings(settings: AppSettings): Promise<void> {
  const dir = path.dirname(getSettingsPath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
}
```

- [ ] **Step 3: 更新saveConversation函数处理新字段**

```typescript
export async function saveConversation(conv: Conversation, storagePath?: string): Promise<void> {
  const dir = await getStorageDir(storagePath);
  const filePath = path.join(dir, `${conv.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conv, null, 2), "utf-8");
}
```

- [ ] **Step 4: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 5: 提交更改**

```bash
git add lib/server-storage.ts
git commit -m "feat: update server storage for system prompt support"
```

### Task 3: 更新客户端存储逻辑

**Files:**
- Modify: `lib/storage.ts`

- [ ] **Step 1: 更新fetchSettings函数**

```typescript
export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) return DEFAULT_SETTINGS;
  const parsed = await res.json();
  return { ...DEFAULT_SETTINGS, ...parsed };
}
```

- [ ] **Step 2: 更新saveServerSettings函数**

```typescript
export async function saveServerSettings(settings: AppSettings): Promise<void> {
  await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
```

- [ ] **Step 3: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 4: 提交更改**

```bash
git add lib/storage.ts
git commit -m "feat: update client storage for system prompt support"
```

### Task 4: 修改chat API支持system prompt

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: 修改POST函数接收systemPrompt参数**

```typescript
export async function POST(req: NextRequest) {
  const { messages, model, systemPrompt } = await req.json();

  const apiKey = process.env.MIMO_API_KEY;
  const apiBaseUrl = process.env.MIMO_API_BASE_URL || "https://token-plan-cn.xiaomimimo.com/v1";

  if (!apiKey) {
    return new Response("API key not configured", { status: 500 });
  }

  // 构建消息数组，如果有system prompt则添加到开头
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

  // ... 其余代码保持不变
```

- [ ] **Step 2: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交更改**

```bash
git add app/api/chat/route.ts
git commit -m "feat: add system prompt support to chat API"
```

### Task 5: 创建system prompt显示组件

**Files:**
- Create: `components/system-prompt-display.tsx`

- [ ] **Step 1: 创建SystemPromptDisplay组件**

```typescript
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface SystemPromptDisplayProps {
  systemPrompt?: string;
  defaultSystemPrompt: string;
}

export function SystemPromptDisplay({
  systemPrompt,
  defaultSystemPrompt,
}: SystemPromptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const displayPrompt = systemPrompt || defaultSystemPrompt;
  const isCustom = systemPrompt !== undefined && systemPrompt !== defaultSystemPrompt;

  if (!displayPrompt) return null;

  const truncatedPrompt = displayPrompt.length > 100
    ? displayPrompt.substring(0, 100) + "..."
    : displayPrompt;

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">System Prompt:</span>
          {isCustom && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              自定义
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? "收起" : "展开"}
        </button>
      </div>
      {isExpanded && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">
              {showFull ? "完整内容" : "预览"}
            </span>
            <button
              onClick={() => setShowFull(!showFull)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showFull ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showFull ? "收起" : "查看全部"}
            </button>
          </div>
          <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-auto max-h-32">
            {showFull ? displayPrompt : truncatedPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交更改**

```bash
git add components/system-prompt-display.tsx
git commit -m "feat: add system prompt display component"
```

### Task 6: 创建system prompt选择模态框

**Files:**
- Create: `components/system-prompt-modal.tsx`

- [ ] **Step 1: 创建SystemPromptModal组件**

```typescript
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface SystemPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (systemPrompt?: string) => void;
  defaultSystemPrompt: string;
}

export function SystemPromptModal({
  open,
  onOpenChange,
  onConfirm,
  defaultSystemPrompt,
}: SystemPromptModalProps) {
  const [useCustom, setUseCustom] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  useEffect(() => {
    if (open) {
      setUseCustom(false);
      setCustomPrompt("");
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    if (useCustom) {
      onConfirm(customPrompt);
    } else {
      onConfirm(undefined); // 使用默认值
    }
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
          <h2 className="text-lg font-semibold text-gray-900">新建对话</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt 设置
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="systemPrompt"
                  checked={!useCustom}
                  onChange={() => setUseCustom(false)}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">使用默认 System Prompt</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {defaultSystemPrompt || "未设置默认 System Prompt"}
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="systemPrompt"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="mt-1"
                />
                <div className="w-full">
                  <div className="text-sm font-medium text-gray-900">自定义 System Prompt</div>
                  {useCustom && (
                    <textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="输入自定义的 System Prompt..."
                      className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                    />
                  )}
                </div>
              </label>
            </div>
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
            onClick={handleConfirm}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建对话
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 3: 提交更改**

```bash
git add components/system-prompt-modal.tsx
git commit -m "feat: add system prompt selection modal"
```

### Task 7: 更新设置对话框添加默认system prompt配置

**Files:**
- Modify: `components/settings-dialog.tsx`

- [ ] **Step 1: 添加defaultSystemPrompt状态**

```typescript
export function SettingsDialog({
  settings,
  onSave,
  open,
  onOpenChange,
}: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [storagePath, setStoragePath] = useState(settings.storagePath);
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState(settings.defaultSystemPrompt);

  useEffect(() => {
    setApiKey(settings.apiKey);
    setApiBaseUrl(settings.apiBaseUrl);
    setStoragePath(settings.storagePath);
    setDefaultSystemPrompt(settings.defaultSystemPrompt);
  }, [settings, open]);
```

- [ ] **Step 2: 更新handleSave函数**

```typescript
  const handleSave = () => {
    onSave({ apiKey, apiBaseUrl, storagePath, defaultSystemPrompt });
    onOpenChange(false);
  };
```

- [ ] **Step 3: 添加默认System Prompt输入字段**

在现有的表单字段后添加：

```typescript
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              默认 System Prompt
            </label>
            <textarea
              value={defaultSystemPrompt}
              onChange={(e) => setDefaultSystemPrompt(e.target.value)}
              placeholder="输入默认的 System Prompt，将用于所有新对话"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            <p className="mt-1 text-xs text-gray-400">
              此设置将作为所有新对话的默认 System Prompt
            </p>
          </div>
```

- [ ] **Step 4: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 5: 提交更改**

```bash
git add components/settings-dialog.tsx
git commit -m "feat: add default system prompt to settings dialog"
```

### Task 8: 更新主页面添加system prompt逻辑

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 导入新组件**

```typescript
import { SystemPromptDisplay } from "@/components/system-prompt-display";
import { SystemPromptModal } from "@/components/system-prompt-modal";
```

- [ ] **Step 2: 添加system prompt模态框状态**

```typescript
  const [systemPromptModalOpen, setSystemPromptModalOpen] = useState(false);
  const [pendingSystemPrompt, setPendingSystemPrompt] = useState<string | undefined>(undefined);
```

- [ ] **Step 3: 修改handleNewConversation函数**

```typescript
  const handleNewConversation = useCallback(async (systemPrompt?: string) => {
    const newConv: Conversation = {
      id: generateId(),
      title: "新对话",
      model: selectedModel,
      systemPrompt: systemPrompt,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await createConversation(newConv);
    await refreshList();
    setActiveId(newConv.id);
    setActiveConv(newConv);
  }, [selectedModel, refreshList]);
```

- [ ] **Step 4: 添加打开模态框的函数**

```typescript
  const handleNewConversationClick = useCallback(() => {
    setSystemPromptModalOpen(true);
  }, []);
```

- [ ] **Step 5: 修改handleSend函数传递system prompt**

在handleSend函数中，修改API调用：

```typescript
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: allMessages,
            model: selectedModel,
            systemPrompt: activeConv?.systemPrompt || settings.defaultSystemPrompt,
          }),
          signal: abortRef.current.signal,
        });
```

- [ ] **Step 6: 更新侧边栏的onNew属性**

```typescript
        <Sidebar
          conversations={conversationList}
          activeId={activeId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversationClick}
          onDelete={handleDeleteConversation}
        />
```

- [ ] **Step 7: 添加System Prompt显示组件**

在消息列表上方添加：

```typescript
        {/* system prompt display */}
        <SystemPromptDisplay
          systemPrompt={activeConversation?.systemPrompt}
          defaultSystemPrompt={settings.defaultSystemPrompt}
        />
```

- [ ] **Step 8: 添加System Prompt模态框**

```typescript
      {/* system prompt modal */}
      <SystemPromptModal
        open={systemPromptModalOpen}
        onOpenChange={setSystemPromptModalOpen}
        onConfirm={handleNewConversation}
        defaultSystemPrompt={settings.defaultSystemPrompt}
      />
```

- [ ] **Step 9: 验证TypeScript编译**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 10: 提交更改**

```bash
git add app/page.tsx
git commit -m "feat: integrate system prompt into main page"
```

### Task 9: 测试完整功能

- [ ] **Step 1: 启动开发服务器**

Run: `pnpm run dev`
Expected: 服务器启动成功

- [ ] **Step 2: 测试设置对话框**

1. 打开设置对话框
2. 验证默认System Prompt字段存在
3. 修改默认System Prompt并保存
4. 重新打开设置验证保存成功

- [ ] **Step 3: 测试新建对话**

1. 点击新建对话按钮
2. 验证System Prompt选择模态框出现
3. 选择使用默认System Prompt创建对话
4. 验证对话创建成功

- [ ] **Step 4: 测试自定义System Prompt**

1. 点击新建对话按钮
2. 选择自定义System Prompt
3. 输入自定义内容并创建对话
4. 验证对话使用自定义System Prompt

- [ ] **Step 5: 测试System Prompt显示**

1. 打开一个对话
2. 验证System Prompt显示组件出现
3. 点击展开验证完整内容显示

- [ ] **Step 6: 测试聊天功能**

1. 在对话中发送消息
2. 验证System Prompt被正确注入到API请求
3. 验证AI响应正常

- [ ] **Step 7: 运行类型检查**

Run: `pnpm run typecheck`
Expected: 编译成功，无错误

- [ ] **Step 8: 运行代码检查**

Run: `pnpm run lint`
Expected: 无错误

- [ ] **Step 9: 最终提交**

```bash
git add .
git commit -m "feat: complete system prompt configuration feature"
```

---

## 验证清单

- [ ] 数据结构正确扩展，向后兼容
- [ ] 设置对话框能正确保存和加载默认System Prompt
- [ ] 新建对话时能选择System Prompt
- [ ] 对话能正确保存System Prompt
- [ ] 聊天界面能正确显示System Prompt
- [ ] System Prompt能正确注入到API请求
- [ ] 存量对话正常工作，不受影响
- [ ] TypeScript编译无错误
- [ ] ESLint检查无错误
- [ ] 功能符合设计文档要求
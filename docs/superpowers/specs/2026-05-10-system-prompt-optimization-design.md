# System Prompt 构成优化设计

## 目标

优化 system prompt 的构成方式，将原本单一的用户文本拆分为：

1. **用户可见部分**（即当前的 system prompt 文本，保持不变）
2. **隐藏上下文**（自动附加，对用户不可见）：
  - 当前时间（服务端每次请求生成）
  - 用户个人信息（全局共享）
  - 用户位置（全局共享）
  - 助手人设（每个 session 独立）

## 核心设计原则

- **用户可见的 system prompt** 行为完全不变（编辑、展示、锁定逻辑都不变）
- **隐藏上下文** 拼接发生在后端 `/api/chat`，前端 UI 只展示用户编辑的部分
- **用户个人信息** 全局共享，所有 session 使用同一份
- **助手人设** 每个 session 独立，各自维护
- **锁定规则**：对话开始后（首条消息发送后），system prompt + 助手人设均不可编辑

## 数据模型

### 新增类型 `lib/types.ts`

```typescript
// 全局共享的用户个人信息
export interface UserProfile {
  name?: string;        // 姓名
  age?: string;         // 年龄
  occupation?: string;  // 职业
  language?: string;    // 语言偏好，如 "中文" / "English"
  extra?: string;       // 其他补充信息
}

// 每个 session 独立的助手人设
export interface AssistantPersona {
  name?: string;        // 助手名字，如 "小助手"
  identity?: string;    // 身份描述，如 "专业的编程助手"
  personality?: string; // 性格特点，如 "耐心、简洁"
  extra?: string;       // 其他补充信息
}
```

### 修改 `AppSettings`（全局设置）

```typescript
export interface AppSettings {
  // ... 现有字段不变 ...
  userProfile?: UserProfile;   // 用户个人信息
  userLocation?: string;       // 用户位置，如 "北京市海淀区"
}
```

### 修改 `Conversation`（会话数据）

```typescript
export interface Conversation {
  // ... 现有字段不变 ...
  assistantPersona?: AssistantPersona;  // 助手人设，每个 session 独立
}
```

## System Prompt 拼接逻辑

### 拼接时机

后端 `/api/chat/route.ts`，在构建 `processedMessages` 时。

### 拼接内容

接收前端传来的参数：`systemPrompt`（用户可见文本）、`userProfile`、`userLocation`、`assistantPersona`。

后端拼接规则：

```
[用户编辑的 system prompt 文本]

Current time: 2026-05-10 16:50 (Asia/Shanghai, Sunday)

User profile:
- Name: 张三
- Age: 28
- Occupation: 软件工程师
- Language preference: 中文
- Location: 北京市海淀区

Assistant persona:
- Name: 小助
- Identity: 专业的编程助手
- Personality: 耐心、简洁、喜欢用例子解释
```

### 拼接规则

1. 只拼接非空字段
2. `User profile` 段落：如果 `userProfile` 的所有字段和 `userLocation` 都为空，整个段落省略
3. `Assistant persona` 段落：如果 `assistantPersona` 的所有字段为空，整个段落省略
4. `Current time` 始终附加（由服务端生成，不在前端传递）
5. 如果用户可见的 system prompt 为空但有隐藏上下文，仍然发送包含上下文的 system message

### 拼接函数

在 `lib/server-storage.ts` 或新建 `lib/system-prompt.ts` 中实现 `buildFullSystemPrompt()` 函数：

```typescript
interface SystemPromptParts {
  userPrompt: string;              // 用户编辑的可见文本
  userProfile?: UserProfile;
  userLocation?: string;
  assistantPersona?: AssistantPersona;
}

export function buildFullSystemPrompt(parts: SystemPromptParts): string
```

## 前端 API 请求变更

`app/page.tsx` 中 `handleSend` 发送到 `/api/chat` 的请求体新增：

```typescript
{
  // ... 现有字段 ...
  userProfile: settings.userProfile,
  userLocation: settings.userLocation,
  assistantPersona: activeConv?.assistantPersona,
}
```

后端在接收到这些参数后，使用 `buildFullSystemPrompt()` 拼接完整的 system prompt。

## UI 设计

### 设置对话框

设置对话框中新增两个区域，用不同的颜色边框区分作用域：

#### 区域 1：个人信息（全局共享）

- 样式：蓝色左边框卡片
- 标题旁显示说明文字："以下信息在所有对话中共享"
- 字段：姓名、年龄、职业、语言偏好、补充信息（均为可选）
- 位置信息 + "自动获取"按钮
- 位置可手动编辑，也可以点击按钮自动获取

#### 区域 2：助手人设（当前会话）

- 样式：绿色左边框卡片
- 标题旁显示说明文字："以下信息仅作用于当前对话"
- 字段：助手名字、身份描述、性格特点、补充信息（均为可选）
- **锁定行为**：
  - 无活跃会话时：灰显，提示"请先选择或创建一个会话"
  - 活跃会话无消息时：可编辑
  - 活跃会话有消息后：灰显 + 锁定图标，提示"对话已开始，助手人设不可再更改"
- 锁定后字段内容仍可见但不可修改

#### 区域 3：当前会话系统提示词（已有）

- 保持现有行为不变
- 锁定逻辑与助手人设一致

### 聊天界面

#### SystemPromptDisplay 区域

在现有的 system prompt 展示条下方，新增一个助手人设摘要展示条：

- 折叠状态下显示一行摘要，如："助手：小助 | 身份：专业的编程助手"
- 点击展开可查看完整信息
- 如果助手人设为空则不显示此条
- 点击后跳转到设置对话框中的助手人设区域（可选，也可以只是纯展示）

### 设置对话框中两个作用域的视觉区分

```
┌─────────────────────────────────────────────┐
│ 设置                                        │
├─────────────────────────────────────────────┤
│                                             │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ 🔵 个人信息（全局共享）                ┃  │
│ ┃ 以下信息在所有对话中共享               ┃  │
│ ┃                                       ┃  │
│ ┃ 姓名: [____] 年龄: [____]             ┃  │
│ ┃ 职业: [____] 语言偏好: [____]         ┃  │
│ ┃ 补充信息: [________]                  ┃  │
│ ┃ 位置: [____] [自动获取]               ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                             │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│ ┃ 🟢 助手人设（当前会话）                ┃  │
│ ┃ 以下信息仅作用于当前对话               ┃  │
│ ┃                                       ┃  │
│ ┃ 助手名字: [____]                      ┃  │
│ ┃ 身份描述: [________]                  ┃  │
│ ┃ 性格特点: [________]                  ┃  │
│ ┃ 补充信息: [________]                  ┃  │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 当前会话系统提示词                      │ │
│ │ [textarea]                              │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ API Key / API Base URL / 存储路径 等...     │
│                                             │
│           [取消]  [保存]                    │
└─────────────────────────────────────────────┘
```

## 位置获取流程

1. 用户点击"自动获取"按钮
2. 调用 `navigator.geolocation.getCurrentPosition()`
3. 如果用户拒绝授权，显示提示信息，可手动输入
4. 获取到经纬度后，调用 Nominatim 反向地理编码：
  `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=zh`
5. 从返回结果中提取 `address.city` / `address.town` / `address.state` / `address.village`，拼成 "城市名" 或 "城市名, 区域名"
6. 填入位置输入框，用户可进一步手动修改
7. 保存后存入全局 `settings.userLocation`

## 需要改动的文件


| 文件                                     | 改动说明                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                         | 新增 `UserProfile`、`AssistantPersona` 类型；`AppSettings` 增加 `userProfile`、`userLocation`；`Conversation` 增加 `assistantPersona` |
| `lib/system-prompt.ts`                 | **新建**，实现 `buildFullSystemPrompt()` 拼接函数                                                                                  |
| `app/api/chat/route.ts`                | 接收新参数，调用 `buildFullSystemPrompt()`                                                                                        |
| `app/page.tsx`                         | `handleSend` 传递新字段；`handleSaveSettings` 处理新增字段                                                                            |
| `components/settings-dialog.tsx`       | 新增用户个人信息区域（蓝色卡片）；新增助手人设区域（绿色卡片）；位置自动获取按钮                                                                                  |
| `components/system-prompt-display.tsx` | 新增助手人设摘要展示条                                                                                                               |
| `components/chat/sidebar.tsx`          | 会话列表中可选地显示助手人设标识（如 emoji 或标签）                                                                                             |


## 锁定规则汇总


| 内容                  | 对话未开始 | 对话已开始    |
| ------------------- | ----- | -------- |
| System Prompt（可见文本） | 可编辑   | 锁定，不可编辑  |
| 助手人设（session 独立）    | 可编辑   | 锁定，不可编辑  |
| 用户个人信息（全局共享）        | 可编辑   | 可编辑（不锁定） |
| 用户位置（全局共享）          | 可编辑   | 可编辑（不锁定） |


全局信息不受对话状态影响，任何时候都可修改。

## 错误处理

- Geolocation 授权被拒绝：提示用户可手动输入位置
- Nominatim 请求失败：提示用户手动输入，不阻断流程
- 所有隐藏字段为空：仍附加当前时间，其余段落省略


# System Prompt 锁定规则与新建对话流程 — 设计文档

## 背景与问题

当前行为存在两类问题：（1）对话已开始后，设置里仍可编辑会话 system prompt，易造成「改了却不生效」的误解；（2）新建对话仍弹出 prompt 选择框，与期望不符——期望新建直接使用默认 prompt，且在首条用户消息发出前可修改并立即作用于当前会话。

## 需求（验收口径）

### R1：已开始对话后不可改 prompt

- **锁定条件**：当前会话 `messages.length > 0`（存在任意一条已持久化的用户或助手消息）时，该会话的 `systemPrompt` **视为锁定**。
- **设置 UI**：锁定状态下，「当前会话系统提示词」为**只读或禁用编辑**（推荐禁用 textarea + 简短说明），避免用户误以为可修改。
- **保存行为**：保存设置（API Key 等）时，**不得**再附带对该会话 `systemPrompt` 的更新（不传 `sessionPromptPatch`，或等价逻辑）。解除「能改但不生效」的体验。

### R2：新建对话不再弹窗选择 prompt

- 侧栏「新建对话」：**不再打开** `SystemPromptModal`；直接创建一条新会话。
- 新建会话的初始 `systemPrompt`：**采用当时的全局默认** `AppSettings.defaultSystemPrompt`（见下文「默认文案」）。

### R3：首条消息发出前可改且立即生效

- 当 **未锁定**（`messages.length === 0`）时，用户可在设置中编辑当前会话的 system prompt。
- **立即生效**：保存路径须在单次确认内完成 `updateConversation` 并同步前端 `activeConv`（见「交互」）；用户在下一次发送请求时应使用更新后的 `systemPrompt`。不要求关闭设置面板才算生效。

### 默认文案（新建会话）

- **采用方案 B**：新建会话的初始内容与 **`defaultSystemPrompt` 字段**一致；仓库内 **`DEFAULT_SETTINGS.defaultSystemPrompt`**（及迁移后的 `data/settings.json` 若缺省合并逻辑）更新为英文：**`You are a helpful assistant.`**
- 用户仍可通过直接编辑 `settings.json` 修改此后新建的默认（无需在本期增加单独 UI）。

若产品后续要求与 `settings.json` 完全脱钩、代码写死英文常量，可改为方案 A 另起迭代。

## 技术设计

### 锁定判断

- 前端：`const promptLocked = activeConversation != null && activeConversation.messages.length > 0`。
- 本期不要求服务端拒绝 PUT；可选后续在 `PUT /api/conversations/[id]` 校验「已有消息则禁止改 systemPrompt」。

### `SettingsDialog`

- 接收父组件计算的 **`promptLocked`**（或传入 `activeConversation` 自行计算）。
- `promptLocked === true`：`textarea` `disabled`，辅助文案说明对话已开始不可修改；`handleSave` **不**附带 `sessionPromptPatch`。
- `promptLocked === false` 且无选中会话：保持现有「无会话则禁用」逻辑。
- **立即生效**：在未锁定且有会话时，保留底部「保存」对整块设置的提交；确保会话提示词随本次保存一并 `PUT` 会话（现有 `sessionPromptPatch` 路径）。若产品希望「只改 prompt 不改其它设置」，可增加次要按钮「应用会话提示词」调用同一 patch 逻辑——**本期以单次「保存」写入会话为准**，若用户反馈强烈再加独立按钮。

### `page.tsx`

- **`handleNewConversationClick`**：改为直接调用 `handleNewConversation(settings.defaultSystemPrompt)`（或封装 `createEmptyConversation()`），不再 `setSystemPromptModalOpen(true)`。
- **`SystemPromptModal`**：不再挂载或删除导入与状态（组件文件可保留-unused 由后续清理或删除）。
- **`handleSaveSettings`**：当 `sessionPromptPatch` 缺失（锁定或未选会话）时仅保存 settings；当存在 patch 时逻辑不变。
- **`DEFAULT_SETTINGS`**：`defaultSystemPrompt` 改为 `You are a helpful assistant.`。

### 数据与兼容

- 已有会话：行为不变；锁定后无法在设置中误写 prompt。
- 旧 spec「会话级设置页编辑」仍然成立，仅增加锁定闸门。

## 错误与边界

- 新建后零消息切换会话导致空会话被删：沿用现有侧栏删除空会话逻辑，无需为 prompt 单独分支。
- 竞态（保存设置过程中切换会话）：沿用现有 `conversationId` 与 `activeId` 一致性校验。

## 测试建议（手工）

1. 新建对话：无弹窗，新会话 `systemPrompt` 为默认英文（或与当前 `settings.json` 一致）。
2. 在未发送消息前修改设置中的会话 prompt → 保存 → 发第一条消息 → 请求携带新 prompt。
3. 发送至少一条消息后打开设置 → prompt 区禁用，保存 API Key 不会改变该会话 `systemPrompt`。
4. 切换会话 A（已锁定）与 B（新建未锁定）→ 编辑权限随会话变化。

## 非范围

- 后端强制锁定校验（可选后续）。
- 聊天顶栏独立编辑 prompt（除非后续 UX 要求）。

# System Prompt 配置功能设计文档

## 概述

为LLM Chat应用添加用户可配置的system prompt功能，支持全局默认设置和每个对话的独立覆盖。

## 需求分析

### 核心需求
1. **全局默认system prompt**：在设置中配置，作为所有新对话的默认值
2. **对话级system prompt**：每个对话可以有自己的system prompt，覆盖全局默认值
3. **UI位置**：在聊天界面中提供配置入口（如按钮或链接），点击后打开配置界面
4. **配置时机**：新建对话时配置，对话创建后不可更改（但可随时查看当前使用的system prompt）

### 用户场景
- 用户希望为不同类型的对话设置不同的AI行为
- 用户希望快速切换不同场景（如代码助手、翻译助手、通用助手）
- 用户希望保持一致性，使用默认system prompt

## 技术设计

### 1. 数据结构

#### AppSettings扩展
```typescript
export interface AppSettings {
  apiKey: string;
  apiBaseUrl: string;
  storagePath: string;
  defaultSystemPrompt: string; // 新增：全局默认system prompt
}
```

#### Conversation扩展
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

#### 默认值更新
```typescript
export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "tp-ctay04hxdarto1y8nfehk858q89wsej01y4apnnwwuuiqd1i",
  apiBaseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  storagePath: "",
  defaultSystemPrompt: "你是一个有用的AI助手。", // 新增默认值
};
```

### 2. UI组件设计

#### 2.1 聊天界面中的System Prompt显示和配置入口
位置：聊天界面顶部（标题栏下方）

功能：
- 显示当前对话使用的system prompt摘要（如果有）
- 提供"查看"按钮，点击后打开模态框显示完整的system prompt
- 提供"新建对话"按钮旁边的"配置system prompt"入口，用于新建对话时配置
- 对于已创建的对话，只提供查看功能，不提供编辑功能

#### 2.2 新建对话时的System Prompt选择
触发：点击"新建对话"按钮时

界面：
- 模态框或抽屉形式
- 显示"使用默认system prompt"选项（默认选中）
- 提供"自定义"选项，展开文本输入区域
- 用户可以选择使用全局默认值或输入自定义system prompt
- 确认后创建对话

#### 2.3 设置对话框中的默认System Prompt
位置：现有的设置对话框中

功能：
- 添加"默认System Prompt"文本区域字段
- 保存后所有新对话默认使用此prompt
- 提供重置为系统默认值的选项

### 3. API集成

#### 3.1 修改chat API端点
文件：`app/api/chat/route.ts`

修改：
- 从请求体中提取`systemPrompt`参数
- 如果提供了system prompt，在消息数组开头添加system角色的消息
- 将修改后的消息数组发送给上游API

请求体格式：
```typescript
{
  messages: Message[],
  model: ModelName,
  systemPrompt?: string // 新增可选参数
}
```

#### 3.2 修改前端发送逻辑
文件：`app/page.tsx`的`handleSend`函数

修改：
- 从当前对话中获取system prompt（如果存在）
- 在发送请求时，将system prompt作为参数传递给API
- 如果对话没有自定义system prompt，使用全局默认值

#### 3.3 设置保存逻辑
文件：`lib/storage.ts`和`lib/server-storage.ts`

修改：
- 确保`defaultSystemPrompt`字段被正确保存和加载
- 确保对话的`systemPrompt`字段被正确保存和加载

## 实现步骤

### 阶段1：数据结构更新
1. 修改`lib/types.ts`，添加新字段
2. 更新默认值
3. 确保向后兼容性（可选字段）

### 阶段2：后端API修改
1. 修改`app/api/chat/route.ts`，支持system prompt参数
2. 修改`app/api/settings/route.ts`，处理新字段
3. 修改`app/api/conversations`相关端点，处理新字段

### 阶段3：前端UI实现
1. 修改设置对话框，添加默认system prompt配置
2. 实现新建对话时的system prompt选择界面
3. 实现聊天界面中的system prompt显示和编辑功能

### 阶段4：测试和验证
1. 测试全局默认system prompt功能
2. 测试对话级system prompt功能
3. 测试UI交互和用户体验

## 边界情况处理

### 1. 向后兼容性
- `systemPrompt`字段为可选，确保存量对话不受影响
- 加载旧对话时，如果没有system prompt字段，使用全局默认值

### 2. 空值处理
- 如果用户将system prompt设置为空字符串，视为不使用system prompt
- 如果全局默认system prompt为空，新对话默认不使用system prompt

### 3. 长文本处理
- system prompt文本区域应支持多行输入
- 考虑添加字符计数或限制（可选）

## 测试策略

### 单元测试
1. 测试数据结构序列化/反序列化
2. 测试API端点处理逻辑
3. 测试UI组件渲染和交互

### 集成测试
1. 测试完整的对话创建流程
2. 测试system prompt注入到API请求
3. 测试设置保存和加载

### 用户验收测试
1. 验证UI直观性和易用性
2. 验证功能符合用户期望
3. 验证性能和响应性

## 风险和缓解措施

### 风险1：性能影响
- **风险**：长system prompt可能影响API响应时间
- **缓解**：添加字符限制或警告，建议用户保持prompt简洁

### 风险2：用户体验复杂化
- **风险**：过多配置选项可能使界面复杂
- **缓解**：保持默认选项简单，高级选项可折叠

### 风险3：数据迁移
- **风险**：现有对话可能没有system prompt字段
- **缓解**：使用可选字段，确保向后兼容

## 成功标准

1. 用户能够配置全局默认system prompt
2. 用户能够在新建对话时选择或自定义system prompt
3. system prompt正确注入到API请求中
4. UI直观易用，不影响现有功能
5. 存量对话正常工作，不受影响
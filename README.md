# Flow MVP Sidecar

一个面向 CodeBuddy 验证interactive mcp apps的mvp。

目标不是把 interactive app 硬塞进 CodeBuddy 聊天窗口，而是用一个本地 sidecar 进程先验证这条降级链路是否成立：

- CodeBuddy 负责触发 MCP prompt / tool
- 本地 sidecar 同时提供 MCP Server + Local Web Server + Session Store
- 浏览器负责真正的交互编辑
- 用户保存后回到 CodeBuddy 继续消费结构化结果

这套方案用来验证三件事：

1. 交互场景是否成立
2. session 模型是否成立
3. CodeBuddy 能否稳定充当发起器和恢复器

## 为什么存在

当前前提是：

- 不能修改 CodeBuddy 客户端
- 不假设 CodeBuddy 已原生支持 MCP Apps 的 `ui://` 渲染
- 也不尝试做 iframe 内嵌 host

因此，这个仓库走的是更现实的降级路径：

- 让 CodeBuddy 继续做它已经擅长的事：prompt、tool 调用、后续生成
- 把复杂 UI 移到我们自己的 localhost 网页
- 用 sessionId 把“聊天上下文”和“浏览器交互结果”串起来

这比“硬做内嵌 UI”现实的原因很直接：

- 不依赖 CodeBuddy 前端改造
- 不需要等待宿主支持 `ui://` / sandboxed iframe / host bridge
- 先验证业务闭环，而不是先造平台
- 技术风险集中在本地 sidecar，可控、可调试、可快速迭代

和真正 MCP Apps 的关系是：

- 这不是原生 MCP Apps host
- 这是一个本地 sidecar 版验证路径
- 它复用了未来 MCP Apps 里同样关键的概念：session、结构化状态、导出结果、宿主恢复执行

## 架构图

```text
┌───────────────────────────────────────────────────────────┐
│                      CodeBuddy Client                     │
│  - slash command /flow-mvp:start                         │
│  - 调用 MCP tools / prompts                              │
│  - 读取 session 结果后继续生成 Markdown / Mermaid / JSON │
└───────────────┬───────────────────────────────────────────┘
                │ stdio MCP
                ▼
┌───────────────────────────────────────────────────────────┐
│                  Local Sidecar (Node.js)                 │
│                                                           │
│  1. MCP Server                                            │
│     - prompts: start, resume                              │
│     - tools: start_session / get_session_state / ...      │
│                                                           │
│  2. Local Web Server                                      │
│     - GET /app/:sessionId                                 │
│     - GET/PUT/POST /api/sessions/:sessionId               │
│                                                           │
│  3. Session Store                                         │
│     - data/sessions/*.json                                │
└───────────────┬───────────────────────────────────────────┘
                │ localhost
                ▼
┌───────────────────────────────────────────────────────────┐
│                     Browser Web App                       │
│  - 编辑节点                                               │
│  - 拖动排序                                               │
│  - 设置 parent / edges                                    │
│  - 保存并完成                                             │
└───────────────────────────────────────────────────────────┘
```

## 目录结构

```text
.
├── apps
│   ├── server
│   │   ├── dist
│   │   └── src
│   │       ├── config.ts
│   │       ├── http
│   │       │   └── app.ts
│   │       ├── index.ts
│   │       ├── mcp
│   │       │   ├── prompts.ts
│   │       │   ├── server.ts
│   │       │   └── tools.ts
│   │       └── session
│   │           ├── service.ts
│   │           └── store.ts
│   └── web
│       ├── dist
│       ├── index.html
│       ├── src
│       │   ├── App.tsx
│       │   ├── components
│       │   │   ├── ExportPreview.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── StructureEditor.tsx
│       │   ├── lib
│       │   │   ├── api.ts
│       │   │   └── session.ts
│       │   ├── main.tsx
│       │   └── styles.css
│       └── vite.config.ts
├── data
│   └── sessions
├── packages
│   └── shared
│       └── src
│           ├── exports.ts
│           ├── index.ts
│           ├── schemas.ts
│           └── types.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 模块说明

### `apps/server/src/index.ts`

sidecar 启动入口：

- 启动 `127.0.0.1` 本地 HTTP 服务
- 启动 stdio MCP server
- 连接 session store

### `apps/server/src/mcp/*`

MCP 层：

- `tools.ts`: 注册 4 个工具
- `prompts.ts`: 注册 `start` 和 `resume`
- `server.ts`: 统一创建 `McpServer`

### `apps/server/src/session/*`

状态层：

- `store.ts`: JSON 文件持久化
- `service.ts`: session 创建、读取、保存、完成、导出

### `apps/server/src/http/app.ts`

本地网页与 API：

- `GET /health`
- `GET /api/sessions/:sessionId`
- `PUT /api/sessions/:sessionId`
- `POST /api/sessions/:sessionId/complete`
- `GET /app/:sessionId`

### `apps/web/src/components/*`

单页 UI：

- `Sidebar`: 标题、brief、节点索引
- `StructureEditor`: 节点编辑、拖动排序、parent / edge 配置
- `ExportPreview`: Markdown / Mermaid / JSON 预览与保存按钮

### `packages/shared/src/*`

前后端共享：

- 类型定义
- Zod schema
- Markdown / Mermaid / JSON 导出生成

## Session 数据模型

```ts
export type SessionStatus = "draft" | "in_progress" | "completed";

export type FlowNodeType = "start" | "step" | "decision" | "end";

export type FlowEdgeType = "sequence" | "parent_child";

export type FlowNode = {
  id: string;
  title: string;
  description: string;
  type: FlowNodeType;
  order: number;
  parentId?: string | null;
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: FlowEdgeType;
};

export type SessionExports = {
  markdown: string;
  mermaid: string;
  json: string;
};

export type Session = {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  title: string;
  brief: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  exports: SessionExports;
};
```

## MCP 设计

### Tools

#### `start_session`

输入：

```ts
{
  title: string;
  brief: string;
  initialNodes?: Array<{
    title: string;
    description?: string;
    type?: "start" | "step" | "decision" | "end";
  }>;
}
```

输出：

```ts
{
  sessionId: string;
  localUrl: string;
  status: "draft" | "in_progress" | "completed";
  summary: string;
  initialData: {
    title: string;
    brief: string;
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
}
```

#### `get_session_state`

输入：

```ts
{
  sessionId: string;
}
```

输出：

```ts
{
  sessionId: string;
  status: "draft" | "in_progress" | "completed";
  updatedAt: string;
  completed: boolean;
  title: string;
  brief: string;
  nodeCount: number;
  edgeCount: number;
  localUrl: string;
}
```

#### `get_session_result`

输入：

```ts
{
  sessionId: string;
}
```

输出：

```ts
{
  sessionId: string;
  status: "draft" | "in_progress" | "completed";
  updatedAt: string;
  title: string;
  brief: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  markdown: string;
  mermaid: string;
  json: string;
}
```

#### `apply_session_result`

输入：

```ts
{
  sessionId: string;
  format: "markdown" | "mermaid" | "json";
}
```

输出：

```ts
{
  sessionId: string;
  format: "markdown" | "mermaid" | "json";
  content: string;
}
```

### Prompts

服务端实际 prompt id 是：

- `start`
- `resume`

如果你在 CodeBuddy 里把 MCP server 名配置成 `flow-mvp`，则 slash command 形式就是：

- `/flow-mvp:start`
- `/flow-mvp:resume`

`start` prompt 收集：

- `title`
- `brief`

`resume` prompt 收集：

- `sessionId?`

如果不传 `sessionId`，服务端会尝试恢复最近一次本地 session。

## 本地运行

### 1. 安装依赖

```bash
npm install
```

### 2. 构建

```bash
npm run build
```

### 3. 启动 sidecar

```bash
npm run start
```

默认监听：

- MCP stdio: 当前进程 stdin/stdout
- HTTP: `http://127.0.0.1:4318`

### 4. 前端开发模式

如果你要单独调 Web UI：

```bash
FLOW_MVP_WEB_ORIGIN=http://127.0.0.1:5173 npm run dev:server
```

另开一个终端：

```bash
npm run dev:web
```

说明：

- `dev:web` 跑 Vite HMR
- `dev:server` 继续承担读写 session 和 MCP stdio
- `FLOW_MVP_WEB_ORIGIN` 告诉 sidecar 把 `localUrl` 指向 Vite dev server

## CodeBuddy 配置

在下面所有配置示例里，不要直接照抄路径。

你需要先确定自己机器上的仓库绝对路径，例如：

- macOS / Linux: `/absolute/path/to/flow-mvp`
- Windows: `C:\\absolute\\path\\to\\flow-mvp`

为了描述方便，下文统一用：

- `<FLOW_MVP_REPO>` 表示仓库根目录绝对路径

例如：

- `apps/server/dist/index.js` 的完整路径应替换为 `<FLOW_MVP_REPO>/apps/server/dist/index.js`
- `data/sessions` 的完整路径应替换为 `<FLOW_MVP_REPO>/data/sessions`

### 推荐：CodeBuddy IDE 配置

如果你用的是 CodeBuddy IDE，而不是 CLI，按下面步骤启用：

1. 打开 `CodeBuddy Settings`
2. 进入 `MCP`
3. 点击 `Add MCP`
4. 填入下面的 JSON
5. 保存后点击 `Refresh`
6. 确认 `flow-mvp` 变成可用状态
7. 在 `Craft` 模式下使用 `/flow-mvp:start`

```json
{
  "mcpServers": {
    "flow-mvp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "<FLOW_MVP_REPO>/apps/server/dist/index.js"
      ],
      "env": {
        "FLOW_MVP_PORT": "4318",
        "FLOW_MVP_DATA_DIR": "<FLOW_MVP_REPO>/data/sessions"
      },
      "description": "Local sidecar flow editor MVP"
    }
  }
}
```

注意：

- `flow-mvp` 是 MCP server 名，不要改成别的，否则 slash command 名也会变化
- 路径必须改成你自己机器上的绝对路径
- `node` 必须能在 CodeBuddy IDE 环境里执行
- 如果 `4318` 被占用，可以改成别的端口，但配置和服务端环境变量要一致
- JSON 里的 `<FLOW_MVP_REPO>` 不会自动展开，必须手工替换成真实路径

### 方式 1：`codebuddy mcp add`

推荐先构建，再用绝对路径接入：

```bash
codebuddy mcp add --scope user flow-mvp -- \
  node "<FLOW_MVP_REPO>/apps/server/dist/index.js"
```

如果要指定端口或数据目录：

```bash
FLOW_MVP_PORT=4318 \
FLOW_MVP_DATA_DIR="<FLOW_MVP_REPO>/data/sessions" \
codebuddy mcp add --scope user flow-mvp -- \
  node "<FLOW_MVP_REPO>/apps/server/dist/index.js"
```

### 方式 2：`codebuddy mcp add-json`

```bash
codebuddy mcp add-json --scope user flow-mvp '{
  "type": "stdio",
  "command": "node",
  "args": [
    "<FLOW_MVP_REPO>/apps/server/dist/index.js"
  ],
  "env": {
    "FLOW_MVP_PORT": "4318",
    "FLOW_MVP_DATA_DIR": "<FLOW_MVP_REPO>/data/sessions"
  }
}'
```

### 方式 3：直接写 `.mcp.json`

```json
{
  "mcpServers": {
    "flow-mvp": {
      "type": "stdio",
      "command": "node",
      "args": [
        "<FLOW_MVP_REPO>/apps/server/dist/index.js"
      ],
      "env": {
        "FLOW_MVP_PORT": "4318",
        "FLOW_MVP_DATA_DIR": "<FLOW_MVP_REPO>/data/sessions"
      },
      "description": "Local sidecar flow editor MVP"
    }
  }
}
```

## 使用示例

## 5 分钟验证流程

如果你只是想快速确认这套方案能跑通，按这个顺序做：

1. 本地执行 `npm install && npm run build`
2. 在 CodeBuddy IDE 的 `Settings -> MCP` 中配置 `flow-mvp`
3. 切到 `Craft` 模式
4. 输入 `/flow-mvp:start`
5. 填 `title` 和 `brief`
6. 拿到 `localUrl` 后在浏览器打开
7. 编辑几个节点，然后点击 `Complete & Save`
8. 回到 CodeBuddy 输入 `/flow-mvp:resume`
9. 确认返回 Markdown / Mermaid / JSON

验收通过的最小信号：

- CodeBuddy 能调用 MCP prompt / tool
- sidecar 返回 `localhost` 页面地址
- 浏览器能保存 session
- CodeBuddy 能恢复并消费导出结果

### 启动一个新 session

在 CodeBuddy 中输入：

```text
/flow-mvp:start
```

填入：

- `title`: 支付失败兜底流程
- `brief`: 我需要把支付失败后的用户提示、重试、人工介入拆成一个可继续生成文档和流程图的结构

随后模型会调用 `start_session`，返回：

- `sessionId`
- `localUrl`
- 初始节点结构

### 在浏览器中编辑

打开 `localUrl` 后：

- 新增节点
- 修改标题与描述
- 拖动排序
- 配 parent
- 加 sequence / parent_child edge
- 点击 `Complete & Save`

### 回到 CodeBuddy 恢复

输入：

```text
/flow-mvp:resume
```

或：

```text
/flow-mvp:resume sessionId=session_xxx
```

随后模型会按 prompt 指引：

1. 调 `get_session_state`
2. 如果已完成，调 `get_session_result`
3. 再调 `apply_session_result`
4. 输出 Markdown / Mermaid / JSON 继续让 LLM 消费

## 已知限制

- 不是原生 MCP Apps host
- 不会嵌进 CodeBuddy 聊天框
- 浏览器与聊天之间需要人工切换
- 只有单机场景，没有多用户隔离
- session store 目前是 JSON 文件，不适合并发写入很重的场景
- 没有 OAuth、没有公网暴露、没有复杂权限系统
- 没有做真实画布，只做了结构编辑器和导出预览

## MVP 验收标准

1. CodeBuddy 能识别并触发 `start` / `resume` prompts
2. `start_session` 能返回 `sessionId` 和 `localUrl`
3. 浏览器页面能打开并完成基础编辑
4. Session 能保存到 `data/sessions/*.json`
5. `get_session_result` / `apply_session_result` 能回传 Markdown / Mermaid / JSON

## 实现优先级

### P0

1 到 2 天内必须跑通的链路：

- stdio MCP server
- `start_session` / `get_session_state` / `get_session_result` / `apply_session_result`
- `start` / `resume` prompts
- JSON 文件 session store
- localhost 单页编辑器
- 保存并完成
- Markdown / Mermaid / JSON 导出

### P1

- Mermaid 图形渲染，而不只是代码预览
- 更好的 edge 可视化
- 自动生成初始节点建议
- 允许从现有 session 克隆新版本

### P2

- sqlite 持久化
- 细粒度 session 历史
- 更强的流程图布局
- 兼容未来原生 MCP Apps 的消息桥接口

## 未来如何平滑升级到原生 MCP Apps

当 CodeBuddy 未来原生支持 MCP Apps 后，这个方案可以按下面的路径升级，而不是推倒重来：

### 第一步：保留 session 和业务层

继续保留：

- `SessionStore`
- `FlowSessionService`
- `Export generator`
- 现有 tools 的业务语义

这些本来就不依赖 iframe。

### 第二步：把 localhost Web UI 抽成可挂载的 app bundle

现在的 React SPA 已经是独立前端，只需要：

- 增加 host bridge 适配层
- 把数据获取从 REST API 切换成 host message / tool proxy
- 把保存动作从 HTTP 改成 host 代理的 MCP 调用

### 第三步：把 sidecar 的“网页地址返回”改成“UI 资源声明”

现在 `start_session` 返回的是 `localUrl`。

升级后可以改成：

- tools / resources 暴露 `ui://flow-mvp/session/:id`
- tool metadata 里声明 `_meta.ui.resourceUri`
- 宿主负责 iframe 拉取和渲染

### 第四步：把浏览器 REST API 收口为 host bridge

当前网页依赖：

- `GET /api/sessions/:id`
- `PUT /api/sessions/:id`
- `POST /api/sessions/:id/complete`

升级后应替换为：

- host -> app 的初始化消息
- app -> host 的保存请求
- host -> MCP server 的工具代理

### 第五步：让 prompt / tool 不变，换掉 UI 承载方式

理想状态下对上层 LLM 编排保持兼容：

- `start_session`
- `get_session_state`
- `get_session_result`
- `apply_session_result`

这些接口可以继续存在。

变化的只是：

- 以前是 `localUrl`
- 以后是 `ui resource + host bridge`

这样迁移成本最低，业务语义也最稳定。

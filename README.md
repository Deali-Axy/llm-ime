# llm-ime

基于本地 GGUF 大语言模型的中文拼音输入法引擎，提供 Web Dashboard 用于打字练习、输入统计和引擎管理。

## 项目结构

pnpm monorepo，包含三个工作区：

```
llm-ime/
├── apps/
│   ├── server/   LLM 引擎 + Hono HTTP API + 静态文件托管（Node.js + tsx）
│   └── web/      Dashboard 前端（React + Vite + TanStack Router）
└── packages/
    └── ui/       共享 shadcn/ui 组件库
```

## 技术栈

| 层 | 技术 |
|---|---|
| 运行时 | Node.js ≥ 20，tsx（TypeScript 直接执行） |
| HTTP 框架 | Hono + @hono/node-server |
| LLM 推理 | node-llama-cpp（本地 GGUF 模型） |
| 前端框架 | React 19 + Vite |
| 路由 | TanStack Router |
| UI | Tailwind CSS v4 + shadcn/ui |
| 主题 | next-themes（dark / light 切换） |
| API 调用 | Hono RPC（`hc<AppType>()`，端到端类型推导） |

## 架构设计

### 单进程服务

LLM 推理引擎与 HTTP 服务在同一个 Node.js 进程中运行，无需分离守护进程或 IPC 通信。

### Hono RPC 类型共享

`apps/server/api-type.ts` 定义了虚拟路由（仅用于类型推导，从不执行），导出 `AppType`。前端通过 pnpm workspace 引用 `@workspace/server/api-type`，用 `hc<AppType>("/")` 创建类型化客户端，请求/响应类型由服务端路由自动推导，无需手写类型定义。

### 异步候选词（防卡顿）

按键时立即更新输入显示（同步），候选词请求经 150ms 防抖后异步发出。快速连击时只触发最后一次请求，旧响应被丢弃，打字过程完全不阻塞。

### 模糊拼音

内置声母/韵母模糊匹配（z↔zh、c↔ch、s↔sh、an↔ang、en↔eng 等），提高容错性。

## 前端页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 写字板 | 打字练习，实时候选词，选词提交 |
| `/statistics` | 统计 | 输入速度、按键间隔等输入统计数据 |
| `/context` | 上下文 | 当前模型上下文 Token 和用户词列表 |
| `/admin` | 管理 | 引擎状态（就绪时间、词条数、上下文量等） |

## API 端点

服务监听 `http://127.0.0.1:5000`（可通过 `PORT` 或 `LIME_PORT` 环境变量修改）。

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/status` | 引擎状态（就绪时间、词条数等） |
| `POST` | `/api/candidates` | 获取拼音候选词（`{ keys: string }`） |
| `POST` | `/api/commit` | 提交选词（`{ text, new?, update? }`） |
| `GET` | `/api/userdata` | 用户词与当前上下文 Token |
| `GET` | `/api/inputlog` | 输入统计快照 |
| `POST` | `/api/learntext` | 从文本中学习新词（`{ text: string }`） |

## 快速开始

### 前置条件

- Node.js ≥ 20
- pnpm ≥ 9
- 一个 GGUF 格式的语言模型文件（默认使用 Qwen3-0.6B-IQ4_XS）

### 安装依赖

在 `llm-ime/` 根目录运行：

```bash
pnpm install
```

### 下载模型

建议将模型仓库放在与本项目同级的目录下：

```
<父目录>/
├── llm-ime/               ← 本仓库
└── Qwen3-0.6B-GGUF/
    └── Qwen3-0.6B-IQ4_XS.gguf
```

可通过 git clone 下载完整模型仓库（注意：完整仓库约 20+ GB）：

```bash
git clone https://www.modelscope.cn/unsloth/Qwen3-0.6B-GGUF.git
```

本项目只需要其中的 `Qwen3-0.6B-IQ4_XS.gguf` 文件（约 350 MB），也可以只单独下载该文件，然后通过环境变量指定路径（见下方）。

### 配置模型路径

默认从与本仓库同级的 `Qwen3-0.6B-GGUF/` 目录中加载模型，如需使用其他路径，设置环境变量：

```bash
# Windows
$env:LIME_MODEL_PATH="D:\\Qwen3-0.6B-GGUF\\Qwen3-0.6B-IQ4_XS.gguf"

# macOS / Linux
export LIME_MODEL_PATH=/path/to/Qwen3-0.6B-IQ4_XS.gguf
```

## 开发模式

在两个终端中分别运行：

```bash
# 终端 1：后端（tsx --watch 自动重载）
pnpm run server:dev

# 终端 2：前端（Vite dev server）
pnpm run web:dev
```

| 地址 | 说明 |
|------|------|
| `http://127.0.0.1:5173` | Vite 开发前端（`/api` 自动代理到 `:5000`） |
| `http://127.0.0.1:5000` | 后端 API |

## 生产部署

```bash
# 1. 构建前端
pnpm run web:build

# 2. 启动服务（同时托管前端静态文件）
pnpm run server
```

服务启动后，`http://127.0.0.1:5000` 同时提供 API 和前端页面。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LIME_MODEL_PATH` | 见上方默认路径 | GGUF 模型文件的绝对路径 |
| `PORT` / `LIME_PORT` | `5000` | 服务监听端口 |

## 开发说明

### TypeScript 检查

```bash
# 检查后端
cd apps/server && ./node_modules/.bin/tsc --noEmit

# 构建前端（含类型检查）
pnpm run web:build
```

### 添加新的 API 端点

1. 在 `apps/server/runtime/types.ts` 中添加响应类型
2. 在 `apps/server/api-type.ts` 中添加虚拟路由（用于 RPC 类型推导）
3. 在 `apps/server/main.ts` 中添加真实路由实现
4. 前端 `apps/web/src/lib/api.ts` 中类型自动同步，只需添加调用方法


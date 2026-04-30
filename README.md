# llm-ime

基于 **React + Vite + TanStack Router + Tailwind + shadcn/ui** 的新一代 LIME 前端，以及合并后的 **Node.js 单进程服务**。

## 架构

- `apps/web/`：写字板、上下文、统计、管理页面（Vite + React）
- `apps/server/`：LLM 引擎 + Hono HTTP API + 静态托管（Node.js + tsx）
- `packages/ui/`：共享的 shadcn/ui 组件

### 技术特点

- **Hono RPC**：前端通过 `hc<AppType>()` 调用后端，类型从服务端路由自动推导
- **异步候选词**：按键立即显示，候选词异步获取（150ms 防抖），打字不卡顿
- **单进程服务**：引擎与 HTTP Dashboard 同进程，无需分离守护进程

## 已移除

- Rime / Lua 集成
- Bearer key 验证
- engine daemon / dashboard 分离架构
- Deno 运行时（改为 Node.js + tsx）

## 开发

在 `llm-ime/` 根目录运行：

```bash
pnpm install
```

分别启动后端和前端（在两个终端中运行）：

```bash
pnpm run server:dev   # 后端，带 --watch 热重载
pnpm run web:dev      # 前端 Vite dev server
```

默认地址：

- 前端开发页：`http://127.0.0.1:5173`（Vite 代理 `/api` 到 `:5000`）
- 统一服务：`http://127.0.0.1:5000`

## 生产部署

```bash
pnpm run web:build   # 构建前端到 apps/web/dist
pnpm run server      # 启动服务，静态托管前端
```

服务会静态托管 `apps/web/dist`，并提供：

| 端点 | 说明 |
|------|------|
| `GET /api/status` | 引擎状态 |
| `POST /api/candidates` | 获取拼音候选词 |
| `POST /api/commit` | 提交选词 |
| `GET /api/userdata` | 用户词/上下文 |
| `GET /api/inputlog` | 输入统计 |
| `POST /api/learntext` | 学习文本 |

## 模型路径

默认读取：

```text
..\..\..\Qwen3-0.6B-GGUF\Qwen3-0.6B-IQ4_XS.gguf
```

也可以通过环境变量覆盖：

```bash
set LIME_MODEL_PATH=D:\path\to\model.gguf
pnpm run server
```


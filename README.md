# llm-ime

基于 **React + Vite + TanStack Router + Tailwind + shadcn/ui** 的新一代 LIME 前端，以及合并后的 **Deno 单进程服务**。

## 架构

- `apps/web/`：写字板、上下文、统计、管理页面
- `apps/server/`：LLM 引擎 + Hono HTTP API + 静态托管
- `packages/ui/`：共享的 shadcn/ui 组件

## 已移除

- Rime / Lua 集成
- Bearer key 验证
- engine daemon / dashboard 分离架构
- 旧版 `dkh-ui` 页面

## 开发命令

在 `llm-ime/` 根目录运行：

```bash
pnpm install
pnpm run server:cache
```

然后分别启动后端和前端：

```bash
pnpm run server
pnpm run web:dev
```

默认地址：

- 前端开发页：`http://127.0.0.1:5173`
- 统一服务：`http://127.0.0.1:5000`

## 构建

```bash
pnpm run web:build
pnpm run server:check
```

构建完成后，直接启动：

```bash
pnpm run server
```

服务会静态托管 `apps/web/dist`，并提供：

- `GET /api/status`
- `POST /api/candidates`
- `POST /api/commit`
- `GET /api/userdata`
- `GET /api/inputlog`
- `POST /api/learntext`

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

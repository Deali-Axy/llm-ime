import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
	EngineServiceError,
} from "./runtime/engine_service.ts";
import { ImeSessionManager } from "./runtime/ime_session_manager.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(__dirname, "../web/dist");
const port = Number(process.env.PORT || process.env.LLM_IME_PORT || process.env.LIME_PORT || "5000");
const host = process.env.HOST || process.env.LLM_IME_HOST || process.env.LIME_HOST || "127.0.0.1";
const sharedSecret = (process.env.LLM_IME_SHARED_SECRET || process.env.LIME_SHARED_SECRET)?.trim() || "";

function normalizeStatus(status: number) {
  switch (status) {
    case 400:
    case 401:
    case 403:
    case 404:
    case 409:
    case 422:
    case 500:
    case 503:
    case 504:
      return status;
    default:
      return 500;
  }
}

function toHttpError(error: unknown) {
	if (error instanceof HTTPException) {
		return error;
	}
	if (error instanceof EngineServiceError) {
		return new HTTPException(normalizeStatus(error.status), {
			message: error.message,
		});
	}
	return new HTTPException(500, {
		message: error instanceof Error ? error.message : String(error),
	});
}

const imeManager = await ImeSessionManager.create();
const app = new Hono();
const commitSchema = z.object({
	text: z.string(),
	new: z.boolean().optional(),
	update: z.boolean().optional(),
});
const imeSessionSchema = z.object({
	sessionId: z.string().min(1).optional(),
});
const imeCandidatesSchema = z.object({
	sessionId: z.string().min(1),
	keys: z.string(),
});
const imeCommitSchema = commitSchema.extend({
	sessionId: z.string().min(1),
});
const imeResetSchema = z.object({
	sessionId: z.string().min(1),
});

app.onError((error, c) => {
	const httpError = toHttpError(error);
	return c.json({ error: httpError.message }, httpError.status);
});

app.use("*", cors({ origin: "*" }));
app.use("/api/*", logger());
app.use("/api/ime/*", async (c, next) => {
	if (!sharedSecret) {
		return next();
	}

	const authorization = c.req.header("Authorization");
	if (authorization !== `Bearer ${sharedSecret}`) {
		throw new HTTPException(401, {
			message: "IME 接口未授权",
		});
	}

	return next();
});

app.get("/api/status", async (c) => {
	return c.json(await imeManager.status());
});

app.post(
	"/api/candidates",
	zValidator("json", z.object({ keys: z.string() })),
	async (c) => {
		const { keys } = c.req.valid("json");
		return c.json(
			await imeManager.candidates(ImeSessionManager.defaultSessionId, keys),
		);
	},
);

app.post(
	"/api/commit",
	zValidator("json", commitSchema),
	async (c) => {
		const body = c.req.valid("json");
		return c.json(await imeManager.commit(ImeSessionManager.defaultSessionId, {
			text: body.text,
			new: body.new,
			update: body.update,
		}));
	},
);

app.get("/api/userdata", async (c) => {
	return c.json(await imeManager.userData());
});

app.get("/api/inputlog", async (c) => {
	return c.json(await imeManager.inputLogSnapshot());
});

app.post(
	"/api/learntext",
	zValidator("json", z.object({ text: z.string() })),
	async (c) => {
		const { text } = c.req.valid("json");
		return c.json(await imeManager.learnText(text));
	},
);

app.post(
	"/api/ime/session",
	zValidator("json", imeSessionSchema),
	async (c) => {
		const { sessionId } = c.req.valid("json");
		return c.json(await imeManager.createSession(sessionId));
	},
);

app.post(
	"/api/ime/candidates",
	zValidator("json", imeCandidatesSchema),
	async (c) => {
		const { sessionId, keys } = c.req.valid("json");
		return c.json(await imeManager.candidates(sessionId, keys));
	},
);

app.post(
	"/api/ime/commit",
	zValidator("json", imeCommitSchema),
	async (c) => {
		const body = c.req.valid("json");
		return c.json(await imeManager.commit(body.sessionId, {
			text: body.text,
			new: body.new,
			update: body.update,
		}));
	},
);

app.post(
	"/api/ime/reset",
	zValidator("json", imeResetSchema),
	async (c) => {
		const { sessionId } = c.req.valid("json");
		return c.json(await imeManager.reset(sessionId));
	},
);

app.get("/api/ime/health", async (c) => {
	return c.json(await imeManager.health());
});

const webDistRel = path.relative(process.cwd(), webDistPath);
app.use("/assets/*", serveStatic({ root: webDistRel }));

app.get("*", async (c) => {
	try {
		const html = await readFile(path.join(webDistPath, "index.html"), "utf-8");
		return c.html(html);
	} catch {
		return c.text(
			"Web UI not built. Run `pnpm --filter web build` in llm-ime first.",
			503,
		);
	}
});

console.log(`llm-ime server listening on http://${host}:${port}`);

serve({ fetch: app.fetch, hostname: host, port });

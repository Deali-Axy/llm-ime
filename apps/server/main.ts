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
	EngineService,
	EngineServiceError,
} from "./runtime/engine_service.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(__dirname, "../web/dist");
const port = Number(process.env.PORT || process.env.LIME_PORT || "5000");

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

const service = await EngineService.create();
const app = new Hono();

app.onError((error, c) => {
	const httpError = toHttpError(error);
	return c.json({ error: httpError.message }, httpError.status);
});

app.use("*", cors({ origin: "*" }));
app.use("/api/*", logger());

app.get("/api/status", async (c) => {
	return c.json(await service.status());
});

app.post(
	"/api/candidates",
	zValidator("json", z.object({ keys: z.string() })),
	async (c) => {
		const { keys } = c.req.valid("json");
		return c.json(await service.candidates(keys));
	},
);

app.post(
	"/api/commit",
	zValidator("json", z.object({
		text: z.string(),
		new: z.boolean().optional(),
		update: z.boolean().optional(),
	})),
	async (c) => {
		const body = c.req.valid("json");
		return c.json(await service.commit({
			text: body.text,
			new: body.new,
			update: body.update,
		}));
	},
);

app.get("/api/userdata", async (c) => {
	return c.json(await service.userData());
});

app.get("/api/inputlog", async (c) => {
	return c.json(await service.inputLogSnapshot());
});

app.post(
	"/api/learntext",
	zValidator("json", z.object({ text: z.string() })),
	async (c) => {
		const { text } = c.req.valid("json");
		return c.json(await service.learnText(text));
	},
);

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

console.log(`LIME unified server listening on http://127.0.0.1:${port}`);

serve({ fetch: app.fetch, port });

import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import {
	EngineService,
	EngineServiceError,
} from "./runtime/engine_service.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDistPath = path.resolve(__dirname, "../web/dist");
const port = Number(Deno.env.get("PORT") || Deno.env.get("LIME_PORT") || "5000");

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

app.post("/api/candidates", async (c) => {
	const body = await c.req.json<{ keys?: string }>();
	return c.json(await service.candidates(body.keys || ""));
});

app.post("/api/commit", async (c) => {
	const body = await c.req.json<{
		text?: string;
		new?: boolean;
		update?: boolean;
	}>();
	return c.json(
		await service.commit({
			text: body.text || "",
			new: body.new,
			update: body.update,
		}),
	);
});

app.get("/api/userdata", async (c) => {
	return c.json(await service.userData());
});

app.get("/api/inputlog", async (c) => {
	return c.json(await service.inputLogSnapshot());
});

app.post("/api/learntext", async (c) => {
	return c.json(await service.learnText(await c.req.text()));
});

app.use("/assets/*", serveStatic({ root: webDistPath }));

app.get("*", async (c) => {
	try {
		return c.html(await Deno.readTextFile(path.join(webDistPath, "index.html")));
	} catch {
		return c.text(
			"Web UI not built. Run `pnpm --filter web build` in llm-ime first.",
			503,
		);
	}
});

console.log(`LIME unified server listening on http://127.0.0.1:${port}`);

Deno.serve({ port }, app.fetch);

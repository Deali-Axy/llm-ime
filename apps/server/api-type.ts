/**
 * Hono RPC type-only definitions.
 * This file is NEVER executed — it exists solely for `hc<AppType>()` inference.
 * Only imports hono, zod, and pure-type modules — never heavy deps like node-llama-cpp.
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import type {
	CandidatesResult,
	CommitResponse,
	EngineStatus,
	ImeHealth,
	ImeSessionResponse,
	InputLog,
	LearnTextResponse,
	UserData,
} from "./runtime/types.ts";

export type {
	Candidate,
	CandidatesResult,
	CommitResponse,
	EngineStatus,
	ImeHealth,
	ImeSessionResponse,
	InputLog,
	LearnTextResponse,
	UserData,
} from "./runtime/types.ts";

const candidatesSchema = z.object({ keys: z.string() });
const imeCandidatesSchema = z.object({
	sessionId: z.string().min(1),
	keys: z.string(),
});
const commitSchema = z.object({
	text: z.string(),
	new: z.boolean().optional(),
	update: z.boolean().optional(),
});
const imeCommitSchema = commitSchema.extend({
	sessionId: z.string().min(1),
});
const imeSessionSchema = z.object({
	sessionId: z.string().min(1).optional(),
});
const imeResetSchema = z.object({
	sessionId: z.string().min(1),
});
const learnTextSchema = z.object({ text: z.string() });

const api = new Hono()
	.get("/api/status", (c) => c.json({} as EngineStatus))
	.post(
		"/api/candidates",
		zValidator("json", candidatesSchema),
		(c) => c.json({} as CandidatesResult),
	)
	.post(
		"/api/commit",
		zValidator("json", commitSchema),
		(c) => c.json({} as CommitResponse),
	)
	.get("/api/userdata", (c) => c.json({} as UserData))
	.get("/api/inputlog", (c) => c.json({} as InputLog))
	.post(
		"/api/learntext",
		zValidator("json", learnTextSchema),
		(c) => c.json({} as LearnTextResponse),
	)
	.post(
		"/api/ime/session",
		zValidator("json", imeSessionSchema),
		(c) => c.json({} as ImeSessionResponse),
	)
	.post(
		"/api/ime/candidates",
		zValidator("json", imeCandidatesSchema),
		(c) => c.json({} as CandidatesResult),
	)
	.post(
		"/api/ime/commit",
		zValidator("json", imeCommitSchema),
		(c) => c.json({} as CommitResponse),
	)
	.post(
		"/api/ime/reset",
		zValidator("json", imeResetSchema),
		(c) => c.json({} as LearnTextResponse),
	)
	.get("/api/ime/health", (c) => c.json({} as ImeHealth));

export type AppType = typeof api;

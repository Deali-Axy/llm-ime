import { randomUUID } from "node:crypto";

import type { Result, UserData } from "../engine.ts";
import {
	EngineService,
	EngineServiceError,
	type CommitRequest,
} from "./engine_service.ts";
import type {
	CommitResponse,
	EngineStatus,
	ImeHealth,
	ImeSessionResponse,
	InputLog,
	LearnTextResponse,
} from "./types.ts";

type SessionRecord = {
	id: string;
	history: CommitRequest[];
	updatedAt: number;
	persistent: boolean;
};

class ExclusiveRunner {
	private chain = Promise.resolve();

	run<T>(task: () => Promise<T>) {
		const result = this.chain.then(task, task);
		this.chain = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}
}

export class ImeSessionManager {
	static readonly defaultSessionId = "web-default";

	private readonly service: EngineService;
	private readonly sessionTtlMs: number;
	private readonly queue = new ExclusiveRunner();
	private readonly sessions = new Map<string, SessionRecord>();
	private activeSessionId: string | null = null;

	private constructor(service: EngineService, sessionTtlMs: number) {
		this.service = service;
		this.sessionTtlMs = sessionTtlMs;
		this.ensureSession(ImeSessionManager.defaultSessionId, true);
	}

	static async create() {
		const ttlRaw = Number(process.env.LIME_SESSION_TTL_MS ?? 15 * 60 * 1000);
		const sessionTtlMs = Number.isFinite(ttlRaw) && ttlRaw > 0
			? ttlRaw
			: 15 * 60 * 1000;
		return new ImeSessionManager(await EngineService.create(), sessionTtlMs);
	}

	private createSessionRecord(id: string, persistent = false): SessionRecord {
		const now = Date.now();
		return {
			id,
			history: [],
			updatedAt: now,
			persistent,
		};
	}

	private normalizeSessionId(sessionId?: string) {
		return sessionId?.trim() || randomUUID();
	}

	private pruneExpiredSessions() {
		const now = Date.now();
		for (const [sessionId, session] of this.sessions.entries()) {
			if (session.persistent) continue;
			if (now - session.updatedAt <= this.sessionTtlMs) continue;
			this.sessions.delete(sessionId);
			if (this.activeSessionId === sessionId) {
				this.activeSessionId = null;
			}
		}
	}

	private ensureSession(sessionId?: string, persistent = false) {
		this.pruneExpiredSessions();
		const normalizedId = this.normalizeSessionId(sessionId);
		const existing = this.sessions.get(normalizedId);
		if (existing) {
			if (persistent) existing.persistent = true;
			existing.updatedAt = Date.now();
			return { session: existing, created: false };
		}

		const session = this.createSessionRecord(normalizedId, persistent);
		this.sessions.set(normalizedId, session);
		return { session, created: true };
	}

	private expiresAt(session: SessionRecord) {
		return session.persistent ? null : session.updatedAt + this.sessionTtlMs;
	}

	private async activateSession(sessionId: string) {
		const ensured = this.ensureSession(sessionId);
		const { session } = ensured;
		if (this.activeSessionId === session.id) {
			session.updatedAt = Date.now();
			return session;
		}

		await this.service.restoreHistory(session.history);
		session.updatedAt = Date.now();
		this.activeSessionId = session.id;
		return session;
	}

	private normalizeCommit(request: CommitRequest): CommitRequest {
		return {
			text: request.text,
			new: request.new ?? true,
			update: request.update ?? false,
		};
	}

	private async withSession<T>(sessionId: string, task: () => Promise<T>) {
		return this.queue.run(async () => {
			const normalizedId = this.normalizeSessionId(sessionId);
			await this.activateSession(normalizedId);
			return task();
		});
	}

	createSession(sessionId?: string): Promise<ImeSessionResponse> {
		return this.queue.run(async () => {
			const { session, created } = this.ensureSession(sessionId);
			return {
				sessionId: session.id,
				created,
				expiresAt: this.expiresAt(session),
			};
		});
	}

	async candidates(sessionId: string, keys: string): Promise<Result> {
		return this.withSession(sessionId, async () => this.service.candidates(keys));
	}

	async commit(
		sessionId: string,
		request: CommitRequest,
	): Promise<CommitResponse> {
		const normalizedId = this.normalizeSessionId(sessionId);
		return this.withSession(normalizedId, async () => {
			const response = await this.service.commit(request);
			const session = this.sessions.get(normalizedId);
			if (!session) {
				throw new EngineServiceError("输入会话不存在", 404);
			}
			if (response.committedText !== null) {
				session.history.push(this.normalizeCommit(request));
				session.updatedAt = Date.now();
			}
			return response;
		});
	}

	async reset(sessionId: string) {
		return this.queue.run(async () => {
			const { session } = this.ensureSession(sessionId);
			session.history = [];
			session.updatedAt = Date.now();
			if (this.activeSessionId === session.id) {
				await this.service.resetContext();
			}
			return {
				message: "输入会话已重置",
			};
		});
	}

	async status(): Promise<EngineStatus> {
		return this.withSession(
			ImeSessionManager.defaultSessionId,
			async () => this.service.status(),
		);
	}

	async userData(): Promise<UserData> {
		return this.withSession(
			ImeSessionManager.defaultSessionId,
			async () => this.service.userData(),
		);
	}

	async inputLogSnapshot(): Promise<InputLog> {
		return this.withSession(
			ImeSessionManager.defaultSessionId,
			async () => this.service.inputLogSnapshot(),
		);
	}

	async learnText(text: string): Promise<LearnTextResponse> {
		return this.withSession(
			ImeSessionManager.defaultSessionId,
			async () => this.service.learnText(text),
		);
	}

	async health(): Promise<ImeHealth> {
		return this.queue.run(async () => {
			this.pruneExpiredSessions();
			return {
				status: "ok",
				activeSessionId: this.activeSessionId,
				sessionCount: this.sessions.size,
				sessionTtlMs: this.sessionTtlMs,
			};
		});
	}
}

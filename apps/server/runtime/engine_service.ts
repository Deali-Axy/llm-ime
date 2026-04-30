import { readFileSync } from "node:fs";
import type { Result, UserData } from "../engine.ts";
import { loadRuntimeConfig } from "./load_config.ts";
import type { Config } from "../utils/config.d.ts";

export type InputLog = {
	keyDeltaTimes: Array<number>;
	lastKeyTime: number | null;
	ziDeltaTimes: Array<number>;
	lastZiTime: number | null;
	ziCount: number;
	lastCandidates: {
		time: number;
		candidates: string[];
	};
	offsetTimes: Record<number, Array<number>>;
};

export type CommitRequest = {
	text: string;
	new?: boolean;
	update?: boolean;
};

export type CommitResponse = {
	message: string;
	committedText: string | null;
};

export type EngineStatus = {
	readyAt: number;
	userWordCount: number;
	contextTokenCount: number;
	lastCandidateCount: number;
	ziCount: number;
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

export class EngineServiceError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.status = status;
	}
}

function arrayLimitPush<T>(arr: T[], item: T, maxLen: number) {
	arr.push(item);
	if (arr.length <= maxLen) return;
	for (let i = 0; i < arr.length - maxLen; i++) {
		arr.shift();
	}
}

const inputLogMaxLen = 10 ** 5;

function createInputLog(): InputLog {
	return {
		keyDeltaTimes: [],
		lastKeyTime: null,
		ziDeltaTimes: [],
		lastZiTime: null,
		ziCount: 0,
		lastCandidates: {
			time: 0,
			candidates: [],
		},
		offsetTimes: {},
	};
}

export class EngineService {
	private config: Config;
	private queue = new ExclusiveRunner();
	private inputLog: InputLog = createInputLog();
	private readonly readyAt = Date.now();
	private latestCandidateRequestId = 0;

	private constructor(config: Config) {
		this.config = config;
	}

	static async create() {
		const config = await loadRuntimeConfig();
		const service = new EngineService(config);
		await service.loadUserWords();
		return service;
	}

	private async loadUserWords() {
		try {
			const words = readFileSync(this.config.userWordsPath, "utf-8")
				.split("\n")
				.filter((w) => w.trim());
			for (const [i, w] of words.entries()) {
				this.config.runner.addUserWord(w);
				process.stdout.write(
					`加载用户词 ${(((i + 1) / words.length) * 100).toFixed(2)}%\r`,
				);
			}
			console.log(`\n加载用户词完成，数量 ${words.length}`);
		} catch {
			// ignore missing preload file
		}
	}

	async candidates(keys: string): Promise<Result> {
		const requestId = ++this.latestCandidateRequestId;
		return this.queue.run(async () => {
			if (requestId !== this.latestCandidateRequestId) {
				return { candidates: [] };
			}

			const normalizedKeys = keys || "";

			const time = Date.now();
			if (this.inputLog.lastKeyTime === null || normalizedKeys.length === 1) {
				this.inputLog.lastKeyTime = time;
				this.inputLog.lastZiTime = time;
			} else {
				arrayLimitPush(
					this.inputLog.keyDeltaTimes,
					time - this.inputLog.lastKeyTime,
					inputLogMaxLen,
				);
				this.inputLog.lastKeyTime = time;
			}

			const pinyinInput = this.config.key2ZiInd(normalizedKeys);
			const result = await this.config.runner.single_ci(pinyinInput);

			if (requestId !== this.latestCandidateRequestId) {
				return { candidates: [] };
			}

			if (result.candidates.length <= 1) {
				this.inputLog.lastZiTime = null;
			} else {
				this.inputLog.lastCandidates = {
					time,
					candidates: result.candidates.map(
						(candidate: { word: string }) => candidate.word,
					),
				};
			}

			return result;
		});
	}

	async commit(request: CommitRequest): Promise<CommitResponse> {
		this.latestCandidateRequestId++;
		return this.queue.run(async () => {
			const text = request.text || "";
			const isNew = request.new ?? true;
			const shouldUpdate = request.update ?? false;

			if (!text) {
				throw new EngineServiceError("未提供文本内容", 400);
			}

			const committedText = (await this.config.runner.commit(
				text,
				shouldUpdate,
				isNew,
			)) ?? null;

			if (isNew) {
				if (this.inputLog.lastZiTime !== null) {
					arrayLimitPush(
						this.inputLog.ziDeltaTimes,
						(Date.now() - this.inputLog.lastZiTime) / text.length,
						inputLogMaxLen,
					);
				}
				this.inputLog.lastZiTime = null;
				this.inputLog.lastKeyTime = null;
				this.inputLog.ziCount += text.length;
			}

			const offset = this.inputLog.lastCandidates.candidates.indexOf(
				committedText ?? "",
			);
			if (offset !== -1 && this.inputLog.lastCandidates.time !== 0) {
				const time = Date.now();
				const offsets = this.inputLog.offsetTimes[offset] || [];
				arrayLimitPush(
					offsets,
					time - this.inputLog.lastCandidates.time,
					inputLogMaxLen,
				);
				this.inputLog.offsetTimes[offset] = offsets;
			}
			this.inputLog.lastCandidates = {
				time: 0,
				candidates: [],
			};

			return {
				message: "文本提交成功",
				committedText,
			};
		});
	}

	async learnText(text: string) {
		return this.queue.run(async () => {
			await this.config.runner.commit(text, true, true);
			return {
				message: "文本提交成功",
			};
		});
	}

	async userData(): Promise<UserData> {
		return this.queue.run(async () => {
			return this.config.runner.getUserData();
		});
	}

	async inputLogSnapshot(): Promise<InputLog> {
		return this.queue.run(async () => {
			return structuredClone(this.inputLog);
		});
	}

	async status(): Promise<EngineStatus> {
		return this.queue.run(async () => {
			const userData = this.config.runner.getUserData();
			return {
				readyAt: this.readyAt,
				userWordCount: Object.keys(userData.words).length,
				contextTokenCount: userData.context.length,
				lastCandidateCount: this.inputLog.lastCandidates.candidates.length,
				ziCount: this.inputLog.ziCount,
			};
		});
	}
}

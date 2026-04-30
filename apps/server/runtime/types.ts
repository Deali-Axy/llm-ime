export type Candidate = {
	word: string;
	score: number;
	pinyin: string[];
	remainkeys: string[];
	preedit: string;
	consumedkeys: number;
};

export type CandidatesResult = {
	candidates: Candidate[];
};

export type UserData = {
	words: Record<number, Array<number>>;
	context: Array<{ t: string; token: number }>;
};

export type InputLog = {
	keyDeltaTimes: number[];
	lastKeyTime: number | null;
	ziDeltaTimes: number[];
	lastZiTime: number | null;
	ziCount: number;
	lastCandidates: {
		time: number;
		candidates: string[];
	};
	offsetTimes: Record<number, number[]>;
};

export type EngineStatus = {
	readyAt: number;
	userWordCount: number;
	contextTokenCount: number;
	lastCandidateCount: number;
	ziCount: number;
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

export type LearnTextResponse = {
	message: string;
};

export type ImeSessionResponse = {
	sessionId: string;
	created: boolean;
	expiresAt: number | null;
};

export type ImeHealth = {
	status: "ok";
	activeSessionId: string | null;
	sessionCount: number;
	sessionTtlMs: number;
};

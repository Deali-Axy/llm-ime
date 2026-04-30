import type { ZiIndL } from "../key_map/zi_ind.ts";
import type { ImeEngine } from "../engine.ts";

export type Config = {
	runner: ImeEngine;
	key2ZiInd: (key: string) => ZiIndL;
	userWordsPath: string;
};

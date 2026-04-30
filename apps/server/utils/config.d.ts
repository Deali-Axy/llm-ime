import type { ZiIndL } from "../key_map/zi_ind.ts";
import type { LIME } from "../engine.ts";

export type Config = {
	runner: LIME;
	key2ZiInd: (key: string) => ZiIndL;
	userWordsPath: string;
};

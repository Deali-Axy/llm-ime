import path from "node:path";
import { fileURLToPath } from "node:url";
import { load_pinyin } from "./key_map/pinyin/gen_zi_pinyin.ts";
import { keys_to_pinyin } from "./key_map/pinyin/keys_to_pinyin.ts";
import { initLIME } from "./engine.ts";
import type { Config } from "./utils/config.d.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultModelPath = path.join(
	__dirname,
	"../../../../Qwen3-0.6B-GGUF/Qwen3-0.6B-IQ4_XS.gguf",
);

const config: Config = {
	runner: await initLIME({
		modelPath: Deno.env.get("LIME_MODEL_PATH") || defaultModelPath,
		ziInd: load_pinyin(),
		omitContext: true,
	}),
	key2ZiInd: (key: string) =>
		keys_to_pinyin(key, {
			shuangpin: false,
			fuzzy: {
				initial: {
					c: "ch",
					z: "zh",
					s: "sh",
					ch: "c",
					zh: "z",
					sh: "s",
				},
				final: {
					an: "ang",
					ang: "an",
					en: "eng",
					eng: "en",
					in: "ing",
					ing: "in",
					uan: "uang",
					uang: "uan",
				},
			},
		}),
	userWordsPath: path.join(__dirname, "userword/preload_word.txt"),
};

export default config;

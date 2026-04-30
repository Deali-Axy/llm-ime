import type { Config } from "../utils/config.d.ts";

export async function loadRuntimeConfig(): Promise<Config> {
	let userConfig: Config | undefined;

	try {
		// user_config.ts is an optional override file not tracked in git
		// @ts-expect-error: file may not exist
		userConfig = (await import("../user_config.ts")).default;
	} catch {
		console.log("使用默认配置");
	}

	return userConfig || (await import("../config.ts")).default;
}

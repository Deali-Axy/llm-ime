/**
 * 防抖工具类：在 delay 毫秒内多次调用 reset() 时只执行一次 fn，每次 reset 都会重置计时器。
 * 调用 cancel() 后不再触发 fn。
 */
export class Debounce {
	private timeout: ReturnType<typeof setTimeout> | null = null;
	private readonly delay: number;
	private readonly fn: () => void;
	private cancelled = false;

	constructor(delay: number, fn: () => void) {
		this.delay = delay;
		this.fn = fn;
	}

	reset() {
		if (this.timeout) clearTimeout(this.timeout);
		if (this.cancelled) return;
		this.timeout = setTimeout(() => {
			this.fn();
		}, this.delay);
	}

	cancel() {
		if (this.timeout) clearTimeout(this.timeout);
		this.cancelled = true;
	}
}

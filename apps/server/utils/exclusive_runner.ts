/**
 * 串行任务队列：保证同一时间只有一个异步任务在执行，后续任务在前一个完成后才开始。
 */
export class ExclusiveRunner {
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

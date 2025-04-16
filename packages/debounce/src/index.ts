export const debounce = (fn: (...args: any[]) => void, delay: number) => {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: any[]) => {
		timeout && clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
};

export const throttle = (fn: (...args: any[]) => void, delay: number) => {
	let last = 0;
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: any[]) => {
		const now = Date.now();
		if (now - last < delay) {
			if (timeout) {
				clearTimeout(timeout);
			}
			timeout = setTimeout(() => fn(...args), last + delay - now);
			return;
		}
		last = now;
		fn(...args);
	};
};

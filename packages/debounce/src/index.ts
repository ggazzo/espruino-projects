export const debounce = (fn: (...args: any[]) => void, delay: number) => {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: any[]) => {
		timeout && clearTimeout(timeout);
		timeout = setTimeout(() => fn(...args), delay);
	};
};

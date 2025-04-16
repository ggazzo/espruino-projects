export const watch = (...args: Parameters<typeof setWatch>) => {
	const id = setWatch(...args);
	return () => clearWatch(id);
};

export const map = (
	x: number,
	in_min: number,
	in_max: number,
	out_min: number,
	out_max: number,
) => {
	const run = in_max - in_min;
	if (run == 0) {
		return -1; // AVR returns -1, SAM returns 0
	}
	const rise = out_max - out_min;
	const delta = x - in_min;
	return (delta * rise) / run + out_min;
};

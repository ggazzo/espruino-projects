import type { Graphics, Pin } from '@tspruino/types';

declare global {
	const Graphics: {
		createArrayBuffer(
			width: number,
			height: number,
			bpp: number,
			options: { vertical_byte: boolean; msb: boolean; buffer: Uint8Array },
		): Graphics;
	};

	interface Graphics {
		update(): void;
		flip(): void;
	}
}

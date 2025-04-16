import type { Graphics, Pin, Averager } from '@tspruino/types';

declare global {
	const Pin: Pin;
	const Graphics: {
		createArrayBuffer(
			width: number,
			height: number,
			bpp: number,
			options: { vertical_byte: boolean; msb: boolean; buffer: Uint8Array },
		): Graphics;
	};

	interface Graphics {
		flip(): void;
		update(): void;
		setFont(font: string, scale?: number): void;
		setColor(hex: number): void;
		setFontAlign(x: number, y: number, rotation?: number): void;
		stringMetrics(str: string): { width: number; height: number };
	}
}

declare module 'Averager' {
	export class Averager {
		constructor(params: { scale: number });
		add(value: number): void;
		getAverage(): number;
	}
}

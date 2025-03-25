import type { Graphics, Pin } from '@tspruino/types';

declare function pinMode(pin: Pin, mode: any, automatic?: boolean): void;

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
		drawLine(x1: number, y1: number, x2: number, y2: number): void;
		drawRect(x: number, y: number, width: number, height: number): void;
		fillRect(x: number, y: number, width: number, height: number): void;
		drawCircle(x: number, y: number, radius: number): void;
		fillCircle(x: number, y: number, radius: number): void;
		drawString(text: string, x: number, y: number): void;
		setFont(font: string): void;

		setColor(r: number, g: number, b: number): void;
		setColor(hex: number): void;
		setFontAlign(x: number, y: number, rotation?: number): void;
		drawImage(image: any, x: number, y: number, { scale: number }): void;
		clear(): void;
	}
}
